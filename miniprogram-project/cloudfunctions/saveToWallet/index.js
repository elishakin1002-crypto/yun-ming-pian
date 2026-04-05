const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { cardId } = event || {}

  console.log('[saveToWallet] request:', {
    event,
    openid,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID || '',
    sourceCardId: cardId
  })

  if (!cardId) {
    console.error('[saveToWallet] invalid param: missing cardId', { event, openid })
    return { code: 'INVALID_PARAM', error: 'INVALID_PARAM', message: '名片ID不能为空' }
  }

  try {
    const cardRes = await db.collection('enterprises').doc(cardId).get()
    console.log('[saveToWallet] enterprise fetched:', {
      cardId,
      exists: !!cardRes.data,
      ownerOpenid: cardRes.data && cardRes.data._openid,
      enterpriseDocId: cardRes.data && cardRes.data._id
    })
    if (!cardRes.data) {
      return { code: 'NOT_FOUND', error: 'NOT_FOUND', message: '名片不存在' }
    }

    if (cardRes.data._openid === openid) {
      console.warn('[saveToWallet] self save blocked:', { cardId, openid })
      return { code: 'SELF_SAVE', error: 'SELF_SAVE', message: '不能收藏自己的名片' }
    }

    const existing = await db.collection('cardwallet')
      .where({ _openid: openid, cardId: cardId })
      .count()

    console.log('[saveToWallet] existing wallet count:', {
      openid,
      cardId,
      total: existing.total
    })

    if (existing.total > 0) {
      return { success: true, code: 'ALREADY_SAVED', message: '已在名片夹中' }
    }

    const addRes = await db.collection('cardwallet').add({
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

    console.log('[saveToWallet] wallet insert result:', {
      openid,
      cardId,
      walletId: addRes && addRes._id
    })

    const updateRes = await db.collection('enterprises').doc(cardId).update({
      data: { saves: db.command.inc(1) }
    })

    console.log('[saveToWallet] enterprise saves increment result:', {
      cardId,
      stats: updateRes && updateRes.stats
    })

    return {
      success: true,
      code: 'OK',
      message: '保存成功',
      walletId: addRes && addRes._id,
      savedCardId: cardId
    }
  } catch (e) {
    console.error('[saveToWallet] error:', {
      openid,
      cardId,
      message: e && e.message,
      stack: e && e.stack,
      errCode: e && e.errCode,
      errMsg: e && e.errMsg
    })
    return {
      code: 'INTERNAL_ERROR',
      error: 'INTERNAL_ERROR',
      message: e && (e.errMsg || e.message) ? (e.errMsg || e.message) : '服务异常'
    }
  }
}
