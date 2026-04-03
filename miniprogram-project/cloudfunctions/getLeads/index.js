/**
 * getLeads — 获取当前用户名片下的所有线索
 * 读取后将未读线索批量标记为已读。
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 将毫秒时间戳格式化为 "X天前 / 今天 HH:MM" 的可读标签
function timeLabel(ms) {
  const now = Date.now()
  const diff = now - ms
  const oneDay = 86400000
  if (diff < oneDay) {
    const d = new Date(ms)
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return `今天 ${hh}:${mm}`
  }
  const days = Math.floor(diff / oneDay)
  if (days < 30) return `${days}天前`
  return new Date(ms).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    // 先确认该用户有名片
    const cardRes = await db.collection('enterprises')
      .where({ _openid: openid })
      .limit(1)
      .get()

    if (!cardRes.data || cardRes.data.length === 0) {
      return { hasCard: false, leads: [] }
    }
    const enterpriseId = cardRes.data[0]._id

    // 获取线索列表（最新 50 条）
    const leadsRes = await db.collection('leads')
      .where({ enterpriseId, ownerOpenid: openid })
      .orderBy('createTime', 'desc')
      .limit(50)
      .get()

    const leads = leadsRes.data.map(item => ({
      ...item,
      timeLabel: timeLabel(item.createTime instanceof Date ? item.createTime.getTime() : item.createTime)
    }))

    // 批量标记为已读（异步，不阻塞返回）
    const unreadIds = leadsRes.data.filter(l => !l.isRead).map(l => l._id)
    if (unreadIds.length > 0) {
      db.collection('leads')
        .where({ _id: _.in(unreadIds) })
        .update({ data: { isRead: true } })
        .catch(() => {})
    }

    return { hasCard: true, leads }
  } catch (e) {
    console.error('getLeads_error', e && e.message)
    return { hasCard: false, leads: [], error: '服务异常' }
  }
}
