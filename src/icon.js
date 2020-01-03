const path = require('path')

// 系统托盘图标目录 __dirname:主进程文件所在目录
const iconDir = path.join(__dirname, '../build');
// 按平台选择，mac是18px的倍数，win是16px的倍数
const iconName = process.platform === 'win32' ? 'star-win.png' : 'star-mac.png'
const proIconName = process.platform === 'win32' ? 'process-win.png' : 'process-mac.png'

exports.iconDir = iconDir
exports.iconName = iconName
exports.iconFile = path.join(iconDir, iconName)

exports.proIconFile = path.join(iconDir, proIconName)