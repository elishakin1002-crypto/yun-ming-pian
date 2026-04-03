const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const ACTION_FIELD_MAP = {
  views: 'views',
  saves: 'saves',
  forwards: 'forwards'
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const visitorOpenid = wxContext.OPENID
  const { enterpriseId, action } = event

  try {
    if (!enterpriseId || typeof enterpriseId !== 'string') {
      return { success: false, code: 'INVALID_PARAM', message: 'enterpriseId无效' }
    }
    if (!ACTION_FIELD_MAP[action]) {
      return { success: false, code: 'INVALID_PARAM', message: 'action无效' }
    }

    // Bug fix：过滤名片所有者对自己名片的操作，避免刷量
    const enterpriseDoc = await db.collection('enterprises').doc(enterpriseId).get().catch(() => null)
    if (!enterpriseDoc || !enterpriseDoc.data) {
      return { success: false, code: 'NOT_FOUND', message: '名片不存在' }
    }
    if (enterpriseDoc.data._openid === visitorOpenid) {
      // 所有者本人的操作不计入统计，静默返回成功避免影响 UX
      return { success: true, code: 'SELF_IGNORED' }
    }

    await db.collection('interactions').add({
      data: {
        enterpriseId,
        visitorOpenid,
        action,
        createTime: db.serverDate()
      }
    })

    const updateResult = await db.collection('enterprises').doc(enterpriseId).update({
      data: {
        [ACTION_FIELD_MAP[action]]: _.inc(1)
      }
    })

    if (action === 'views') {
      // Log individual view event
      await db.collection('viewLogs').add({
        data: {
          enterpriseId,
          viewerOpenid: visitorOpenid,
          viewTime: db.serverDate(),
          source: event.source || 'direct'
        }
      }).catch(() => {}) // non-blocking
    }
    if (!updateResult.stats || updateResult.stats.updated === 0) {
      return { success: false, code: 'NOT_FOUND', message: '名片不存在' }
    }
    return { success: true, code: 'OK' }
  } catch (e) {
    console.error('recordInteraction_error', {
      message: e && e.message,
      action,
      hasEnterpriseId: Boolean(enterpriseId)
    })
    return { success: false, code: 'INTERNAL_ERROR', message: '服务异常' }
  }
}
