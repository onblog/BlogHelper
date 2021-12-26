const {nativeTheme} = require('electron');
const path = require('path');

// 系统托盘图标目录 __dirname:主进程文件所在目录
const iconDir = path.normalize(path.join(__dirname , '..' ,'resource'));

function icon() {
    // 按平台选择图标的文件名，mac是18px的倍数，win是16px的倍数
    const iconName = process.platform === 'win32' ? 'star-win.png' : nativeTheme.shouldUseDarkColors
                                                                     ? 'star-mac.png'
                                                                     : 'star-mac-dark.png';
    const proIconName = process.platform === 'win32' ? 'process-win.png'
                                                     : nativeTheme.shouldUseDarkColors
                                                       ? 'process-mac.png' : 'process-mac-dark.png';
    // 图标的绝对路径
    const iconFile = path.normalize(path.join(iconDir, iconName));
    const proIconFile = path.normalize(path.join(iconDir, proIconName));
    return {iconFile, proIconFile}
}

exports.iconFile = icon().iconFile;
exports.proIconFile = icon().proIconFile;
exports.icon = icon;