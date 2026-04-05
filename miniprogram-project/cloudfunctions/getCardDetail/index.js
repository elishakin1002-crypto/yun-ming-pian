const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const enterpriseId = event && typeof event.enterpriseId === 'string'
    ? event.enterpriseId.trim()
    : ''

  if (!enterpriseId) {
    return { success: false, message: '名片参数缺失' }
  }

  try {
    const res = await db.collection('enterprises').doc(enterpriseId).get()
    if (!res.data) {
      return { success: false, message: '未找到该名片' }
    }
    return {
      success: true,
      card: res.data
    }
  } catch (error) {
    console.error('getCardDetail error', {
      enterpriseId,
      message: error && error.message
    })
    return { success: false, message: '获取名片失败' }
  }
}
