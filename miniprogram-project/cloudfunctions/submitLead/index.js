/**
 * submitLead — 访客留资
 * 访客浏览名片后主动留下联系方式，数据写入 leads 集合，供名片持有人跟进。
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const PHONE_REGEX = /^1[3-9]\d{9}$/

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const visitorOpenid = wxContext.OPENID
  const { enterpriseId, name, phone, wechat, company, message } = event

  // 参数校验
  if (!enterpriseId || typeof enterpriseId !== 'string') {
    return { success: false, message: '名片参数无效' }
  }
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return { success: false, message: '请填写姓名' }
  }
  if (!PHONE_REGEX.test(phone)) {
    return { success: false, message: '手机号格式不正确' }
  }

  try {
    // 查询名片是否存在，并获取持有人 openid
    const enterpriseRes = await db.collection('enterprises').doc(enterpriseId).get().catch(() => null)
    if (!enterpriseRes || !enterpriseRes.data) {
      return { success: false, message: '名片不存在' }
    }
    const ownerOpenid = enterpriseRes.data._openid

    // 不允许名片持有人给自己留资
    if (ownerOpenid === visitorOpenid) {
      return { success: false, message: '不能给自己的名片留资' }
    }

    // 防重复：同一访客对同一名片 24 小时内只能留资一次
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const dupCheck = await db.collection('leads')
      .where({
        enterpriseId,
        visitorOpenid,
        createTime: db.command.gte(oneDayAgo)
      })
      .count()
    if (dupCheck.total > 0) {
      return { success: false, message: '您今天已经留过资了，请明天再试' }
    }

    // 写入线索
    await db.collection('leads').add({
      data: {
        enterpriseId,
        ownerOpenid,
        visitorOpenid,
        name: name.trim(),
        phone,
        wechat: (wechat || '').trim(),
        company: (company || '').trim(),
        message: (message || '').trim(),
        isRead: false,
        createTime: db.serverDate()
      }
    })

    // 异步发送订阅消息通知名片持有人（不阻塞主流程）
    // TODO: 替换为你在小程序后台申请的「新线索通知」模板 ID
    const TEMPLATE_ID = '请替换为订阅消息模板ID'
    sendSubscribeMessage(ownerOpenid, TEMPLATE_ID, {
      thing1: { value: name.trim() },           // 客户姓名
      phone_number2: { value: phone },           // 手机号
      thing3: { value: (company || '').trim() || '未填写' }, // 公司
      thing5: { value: (message || '').trim().substring(0, 20) || '无留言' } // 留言摘要
    }, `pages/leads/leads`).catch(err => {
      console.warn('订阅消息发送失败（可能未订阅）', err)
    })

    return { success: true }
  } catch (e) {
    console.error('submitLead_error', e && e.message)
    return { success: false, message: '服务异常，请重试' }
  }
}

/**
 * 发送订阅消息
 * @param {string} toUser 接收者 openid
 * @param {string} templateId 模板 ID
 * @param {object} data 模板数据
 * @param {string} page 跳转页面
 */
async function sendSubscribeMessage(toUser, templateId, data, page) {
  try {
    await cloud.openapi.subscribeMessage.send({
      touser: toUser,
      templateId,
      data,
      page,
      miniprogramState: 'formal'
    })
  } catch (err) {
    // 用户未订阅或模板 ID 无效时会抛异常，这里只打印不阻塞
    console.warn('sendSubscribeMessage failed:', err)
  }
}
