const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { enterpriseId, action } = event
  
  try {
    await db.collection('interactions').add({
      data: {
        enterpriseId,
        visitorOpenid: wxContext.OPENID,
        action,
        createTime: db.serverDate()
      }
    })
    
    await db.collection('enterprises').doc(enterpriseId).update({
      data: {
        [action]: _.inc(1)
      }
    })
    return { success: true }
  } catch (e) {
    return { success: false, error: e }
  }
}