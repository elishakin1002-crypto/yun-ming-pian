const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { cardId } = event

  if (!cardId) return { error: 'INVALID_PARAM', message: '名片ID不能为空' }

  try {
    // Check card exists
    const cardRes = await db.collection('enterprises').doc(cardId).get()
    if (!cardRes.data) return { error: 'NOT_FOUND', message: '名片不存在' }

    // Don't save own card
    if (cardRes.data._openid === openid) return { error: 'SELF_SAVE', message: '不能收藏自己的名片' }

    // Check if already saved (dedup)
    const existing = await db.collection('cardWallet')
      .where({ _openid: openid, cardId: cardId })
      .count()
    if (existing.total > 0) return { success: true, message: '已在名片夹中' }

    // Save to wallet
    await db.collection('cardWallet').add({
      data: {
        _openid: openid,
        cardId: cardId,
        cardSnapshot: {
          companyName: cardRes.data.companyName,
          contactName: cardRes.data.contactName,
          title: cardRes.data.title,
          phone: cardRes.data.phone,
          wechat: cardRes.data.wechat,
          logoUrl: cardRes.data.logoUrl,
          industry: cardRes.data.industry,
          cardStyle: cardRes.data.cardStyle || 'classic'
        },
        note: '',
        tags: [],
        savedAt: db.serverDate()
      }
    })

    // Increment saves count on the card
    await db.collection('enterprises').doc(cardId).update({
      data: { saves: db.command.inc(1) }
    })

    return { success: true }
  } catch (e) {
    console.error('saveToWallet error', e)
    return { error: 'INTERNAL_ERROR', message: '服务异常' }
  }
}
