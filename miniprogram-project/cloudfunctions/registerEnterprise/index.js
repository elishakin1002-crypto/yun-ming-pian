const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { companyName, industry, contactName, phone, wechat, logoUrl } = event
  
  try {
    const res = await db.collection('enterprises').add({
      data: {
        _openid: wxContext.OPENID,
        companyName,
        industry,
        contactName,
        phone,
        wechat,
        logoUrl,
        views: 0,
        saves: 0,
        forwards: 0,
        createTime: db.serverDate()
      }
    })
    return { _id: res._id }
  } catch (e) {
    console.error(e)
    return { error: e }
  }
}