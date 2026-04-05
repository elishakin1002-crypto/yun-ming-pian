const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const {
    contactName = '',
    phone = '',
    companyName = '',
    title = '',
    wechat = '',
    email = '',
    note = ''
  } = event || {}

  if (!contactName && !phone && !companyName) {
    return { success: false, message: '缺少可保存的客户信息' }
  }

  try {
    await db.collection('cardwallet').add({
      data: {
        _openid: OPENID,
        cardId: '',
        sourceType: 'scan',
        cardSnapshot: {
          companyName: String(companyName).trim(),
          contactName: String(contactName).trim(),
          title: String(title).trim(),
          phone: String(phone).trim(),
          wechat: String(wechat).trim(),
          email: String(email).trim(),
          logoUrl: '',
          industry: '',
          cardStyle: 'classic'
        },
        note: String(note).trim(),
        tags: [],
        savedAt: db.serverDate()
      }
    })

    return { success: true }
  } catch (error) {
    console.error('saveScannedContact error', {
      message: error && error.message,
      event,
      openid: OPENID
    })
    return {
      success: false,
      code: 'INTERNAL_ERROR',
      message: (error && error.message) || '保存失败'
    }
  }
}
