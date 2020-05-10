const {globalShortcut} = require('electron')
const appMenuPublish = require('./app-menu-publish')

// 快捷键
const ACCELERATORS = ['CmdOrCtrl+Alt+N', 'CmdOrCtrl+Alt+T']
exports.ACCELERATORS = ACCELERATORS

/**
 * 恢复注册快捷键
 */
exports.initGlobalShortcut = function initGlobalShortcut(tray) {

}

/**
 * 剪贴板图片上传快捷键
 */
exports.uploadClipboardPicSwitch = (tray,check) => {
    if (check){
        globalShortcut.register(ACCELERATORS[0], () => {
            appMenuPublish.uploadClipboardPic(tray)
        })
    }else {
        globalShortcut.unregister(ACCELERATORS[0])
    }
}

/**
 * 剪贴板富文本转纯文字
 */
exports.coverToTextSwitch = (tray,check) => {
    if (check){
        globalShortcut.register(ACCELERATORS[1], () => {
            appMenuPublish.coverToText()
        })
    }else {
        globalShortcut.unregister(ACCELERATORS[1])
    }
}


