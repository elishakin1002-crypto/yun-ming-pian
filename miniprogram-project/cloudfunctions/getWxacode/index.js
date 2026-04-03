/**
 * getWxacode — 生成小程序码并上传到云存储
 * 使用 wxacode.getUnlimited 生成不限次数的小程序码。
 * 返回云存储 fileID，客户端直接使用。
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const { path } = event

  if (!path || typeof path !== 'string') {
    return { fileID: '' }
  }

  // 从 path 中提取 scene 参数（wxacode.getUnlimited 需要用 scene + page 分开传）
  // path 格式: "pages/card/card?id=xxx"
  const parts = path.split('?')
  const page = parts[0] || 'pages/card/card'
  const scene = parts[1] || ''

  try {
    const result = await cloud.openapi.wxacode.getUnlimited({
      scene: scene.substring(0, 32),  // scene 最长 32 字符
      page: page,
      width: 280,
      autoColor: false,
      lineColor: { r: 79, g: 70, b: 229 },  // 品牌紫色
      isHyaline: false
    })

    if (!result || !result.buffer) {
      return { fileID: '' }
    }

    // 上传到云存储
    const uploadRes = await cloud.uploadFile({
      cloudPath: `wxacode/${Date.now()}-${Math.floor(Math.random() * 1000)}.png`,
      fileContent: result.buffer
    })

    return { fileID: uploadRes.fileID }
  } catch (e) {
    console.error('getWxacode_error', e && e.message)
    return { fileID: '', error: e.message }
  }
}
