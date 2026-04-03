const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { walletId, note } = event

  if (!walletId) return { error: 'INVALID_PARAM', message: '记录ID不能为空' }

  try {
    await db.collection('cardWallet').doc(walletId).update({
      data: {
        note: (note || '').trim().substring(0, 500)
      }
    })
    return { success: true }
  } catch (e) {
    console.error('updateWalletNote error', e)
    return { error: 'INTERNAL_ERROR', message: '更新失败' }
  }
}
