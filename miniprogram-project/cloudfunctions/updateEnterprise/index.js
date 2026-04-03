/**
 * updateEnterprise —— 更新已有名片
 * 仅允许名片持有者修改自己的名片，且只能更新白名单字段。
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 允许更新的字段白名单
const ALLOWED_FIELDS = [
  'companyName', 'contactName', 'title', 'phone', 'wechat',
  'industry', 'logoUrl', 'cardStyle', 'cardRole',
  'bio', 'services', 'slogan', 'cardName'
]

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { enterpriseId, data } = event

  if (!enterpriseId || !data) {
    return { success: false, error: '参数缺失' }
  }

  try {
    // 验证名片归属
    const doc = await db.collection('enterprises').doc(enterpriseId).get()
    if (doc.data._openid !== OPENID) {
      return { success: false, error: '无权修改此名片' }
    }

    // 过滤：只保留白名单字段
    const updateData = {}
    for (const key of ALLOWED_FIELDS) {
      if (data[key] !== undefined) {
        updateData[key] = data[key]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return { success: false, error: '没有可更新的字段' }
    }

    updateData.updatedAt = db.serverDate()

    await db.collection('enterprises').doc(enterpriseId).update({
      data: updateData
    })

    return { success: true }
  } catch (e) {
    console.error('updateEnterprise error:', e)
    return { success: false, error: e.message || '更新失败' }
  }
}
