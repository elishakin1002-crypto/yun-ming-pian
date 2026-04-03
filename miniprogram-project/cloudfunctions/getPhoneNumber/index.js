const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  try {
    const res = await cloud.openapi.phonenumber.getPhoneNumber({
      code: event.code
    })
    return {
      phoneNumber: res.phoneInfo.phoneNumber,
      purePhoneNumber: res.phoneInfo.purePhoneNumber,
      countryCode: res.phoneInfo.countryCode
    }
  } catch (e) {
    console.error('获取手机号失败:', e)
    return { error: e.message }
  }
}
