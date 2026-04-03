/**
 * exportLeads 云函数
 * 导出当前用户的线索数据为 CSV 格式字符串（前端下载）
 * 微信小程序环境无法直接生成 xlsx，故返回 CSV 由前端写入临时文件并分享/保存。
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()

  try {
    // 1. 校验用户是否有名片
    const entRes = await db.collection('enterprises')
      .where({ _openid: OPENID })
      .limit(1)
      .get()
    if (!entRes.data || entRes.data.length === 0) {
      return { success: false, message: '您还没有注册名片' }
    }

    // 2. 查询全部线索（分批拉取，突破 100 条限制）
    const ownerOpenid = OPENID
    const MAX_LIMIT = 100
    const countRes = await db.collection('leads')
      .where({ ownerOpenid })
      .count()
    const total = countRes.total

    if (total === 0) {
      return { success: false, message: '暂无线索数据' }
    }

    const batchTimes = Math.ceil(total / MAX_LIMIT)
    const tasks = []
    for (let i = 0; i < batchTimes; i++) {
      tasks.push(
        db.collection('leads')
          .where({ ownerOpenid })
          .orderBy('createTime', 'desc')
          .skip(i * MAX_LIMIT)
          .limit(MAX_LIMIT)
          .get()
      )
    }
    const results = await Promise.all(tasks)
    let allLeads = []
    results.forEach(r => {
      allLeads = allLeads.concat(r.data)
    })

    // 3. 生成 CSV（含 BOM 以兼容 Excel 中文编码）
    const BOM = '\uFEFF'
    const header = '姓名,手机号,微信号,公司,留言,是否已读,提交时间'
    const rows = allLeads.map(lead => {
      const time = lead.createTime
        ? new Date(lead.createTime).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
        : ''
      return [
        csvEscape(lead.name || ''),
        csvEscape(lead.phone || ''),
        csvEscape(lead.wechat || ''),
        csvEscape(lead.company || ''),
        csvEscape(lead.message || ''),
        lead.isRead ? '已读' : '未读',
        csvEscape(time)
      ].join(',')
    })
    const csv = BOM + header + '\n' + rows.join('\n')

    return { success: true, csv, total }
  } catch (err) {
    console.error('exportLeads error', err)
    return { success: false, message: '导出失败，请重试' }
  }
}

function csvEscape(str) {
  if (!str) return ''
  // 如果包含逗号、换行或引号，用双引号包裹并转义内部引号
  if (/[,"\n\r]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}
