const {nativeTheme, systemPreferences} = require("electron");

const path = require('path')
const appToast = require('./app-toast')

// 系统托盘图标目录 __dirname:主进程文件所在目录
const iconDir = path.normalize(path.join(__dirname, 'resource'));
// 按平台选择图标的文件名，mac是18px的倍数，win是16px的倍数
var iconName = process.platform === 'win32' ? 'star-win.png' : nativeTheme.shouldUseDarkColors ? 'star-mac.png' : 'black-star-mac.png'
const proIconName = process.platform === 'win32' ? 'process-win.png' : 'process-mac.png'
const timeIconName = process.platform === 'win32' ? 'time-win.png' : 'time-mac.png'
// 图标的绝对路径
const iconFile = path.normalize(path.join(iconDir, iconName));
const proIconFile = path.normalize(path.join(iconDir, proIconName));
const timeIconFile = path.normalize(path.join(iconDir, timeIconName));

exports.iconFile = iconFile
exports.proIconFile = proIconFile
exports.timeIconFile = timeIconFile