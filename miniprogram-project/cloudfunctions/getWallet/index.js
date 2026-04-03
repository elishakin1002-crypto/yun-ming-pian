const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    const res = await db.collection('cardWallet')
      .where({ _openid: openid })
      .orderBy('savedAt', 'desc')
      .limit(100)
      .get()

    return { cards: res.data || [] }
  } catch (e) {
    console.error('getWallet error', e)
    return { cards: [] }
  }
}
