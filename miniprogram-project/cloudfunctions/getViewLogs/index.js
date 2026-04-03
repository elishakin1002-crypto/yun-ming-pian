const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    // Get user's card
    const cardRes = await db.collection('enterprises')
      .where({ _openid: openid })
      .limit(1)
      .get()

    if (!cardRes.data || cardRes.data.length === 0) {
      return { logs: [], total: 0 }
    }

    const cardId = cardRes.data[0]._id

    // Get view logs (recent 50)
    const logRes = await db.collection('viewLogs')
      .where({ enterpriseId: cardId })
      .orderBy('viewTime', 'desc')
      .limit(50)
      .get()

    // Get today's count
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayCount = await db.collection('viewLogs')
      .where({
        enterpriseId: cardId,
        viewTime: db.command.gte(today)
      })
      .count()

    return {
      logs: logRes.data || [],
      total: logRes.data ? logRes.data.length : 0,
      todayViews: todayCount.total || 0
    }
  } catch (e) {
    console.error('getViewLogs error', e)
    return { logs: [], total: 0, todayViews: 0 }
  }
}
