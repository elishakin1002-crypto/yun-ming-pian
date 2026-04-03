const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const PHONE_REGEX = /^1[3-9]\d{9}$/
const VALID_INDUSTRIES = ['互联网/IT', '金融/投资', '教育/培训', '医疗/健康', '制造/工业', '房地产/建筑', '零售/批发', '服务业', '其他']
const VALID_ROLES = ['brand', 'growth']
const VALID_STYLES = ['classic', 'modern', 'dark']

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { companyName, industry, contactName, phone, wechat, logoUrl, cardRole, cardStyle, title, bio, services, slogan, cardName } = event

  // ---- 通用必填校验 ----
  if (!contactName || typeof contactName !== 'string' || contactName.trim().length === 0) {
    return { error: 'INVALID_PARAM', message: '联系人姓名不能为空' }
  }
  if (!phone || !PHONE_REGEX.test(phone)) {
    return { error: 'INVALID_PARAM', message: '手机号格式不正确' }
  }
  // wechat 和 logoUrl 现在为选填
  if (!VALID_INDUSTRIES.includes(industry)) {
    return { error: 'INVALID_PARAM', message: '行业类别无效' }
  }

  // ---- 角色校验 ----
  const role = VALID_ROLES.includes(cardRole) ? cardRole : 'brand'
  const style = VALID_STYLES.includes(cardStyle) ? cardStyle : 'classic'

  try {
    // 组装数据（通用 + 角色扩展）
    const data = {
      _openid: wxContext.OPENID,
      companyName: (companyName || '').trim(),
      industry,
      contactName: contactName.trim(),
      phone,
      wechat: (wechat || '').trim(),
      logoUrl: logoUrl || '',
      cardRole: role,
      cardStyle: style,
      title: (title || '').trim(),
      cardName: (cardName || '我的名片').trim(),
      views: 0,
      saves: 0,
      forwards: 0,
      createTime: db.serverDate()
    }

    // 销售角色扩展字段
    if (role === 'growth') {
      data.bio = (bio || '').trim().substring(0, 200)
      data.slogan = (slogan || '').trim().substring(0, 50)
      data.services = Array.isArray(services)
        ? services.map(s => String(s || '').trim()).filter(Boolean).slice(0, 3)
        : []
    }

    const res = await db.collection('enterprises').add({ data })
    return { _id: res._id }
  } catch (e) {
    console.error(e)
    return { error: 'INTERNAL_ERROR', message: '服务异常' }
  }
}
