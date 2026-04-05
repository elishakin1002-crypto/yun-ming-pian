/**
 * getMyCard — 获取当前用户的名片
 * 同时返回未读线索数量，用于首页红点提示。
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const query = { _openid: openid }

  try {
    console.log('getMyCard request', {
      openid,
      query
    })

    // 查询当前用户的所有名片（支持多名片）
    const cardRes = await db.collection('enterprises')
      .where(query)
      .orderBy('createTime', 'desc')
      .get()

    if (!cardRes.data || cardRes.data.length === 0) {
      console.log('getMyCard result', {
        openid,
        count: 0,
        cardIds: []
      })
      return { card: null, cards: [], newLeadCount: 0 }
    }
    const cards = cardRes.data
    const card = cards[0] // 主名片（最新）

    // 查询未读线索数（leads 集合可能尚未创建，单独容错）
    let newLeadCount = 0
    try {
      const unreadRes = await db.collection('leads')
        .where({ enterpriseId: card._id, ownerOpenid: openid, isRead: false })
        .count()
      newLeadCount = unreadRes.total || 0
    } catch (e) {
      // leads 集合不存在或查询失败时不影响主流程
      console.warn('leads count error (ignored):', e && e.message)
    }

    console.log('getMyCard result', {
      openid,
      count: cards.length,
      cardIds: cards.map(item => item._id)
    })

    return {
      card,
      cards,
      newLeadCount
    }
  } catch (e) {
    console.error('getMyCard_error', {
      openid,
      query,
      message: e && e.message
    })
    return { card: null, cards: [], newLeadCount: 0 }
  }
}
