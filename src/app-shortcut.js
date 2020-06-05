const {globalShortcut} = require('electron')
const appMenuPublish = require('./app-menu-publish')
const DataStore = require('./app-store')
const dataStore = new DataStore()

// 快捷键
const ACCELERATORS = ['CmdOrCtrl+Shift+P', 'CmdOrCtrl+Alt+T','CmdOrCtrl+Q']
exports.ACCELERATORS = ACCELERATORS

/**
 * 恢复注册快捷键
 */
exports.initGlobalShortcut = function initGlobalShortcut(tray) {
    uploadClipboardPicSwitch(tray, dataStore.isUploadClipboardPicSwitch())
    coverToTextSwitch(tray, dataStore.isCoverToTextSwitch())
    TTSSwitch(tray, dataStore.isTTSSwitch())
}

/**
 * 剪贴板图片上传快捷键
 */
function uploadClipboardPicSwitch(tray, check) {
    if (check) {
        globalShortcut.register(ACCELERATORS[0], () => {
            appMenuPublish.uploadClipboardPic(tray)
        })
    } else if (globalShortcut.isRegistered(ACCELERATORS[0])) {
        globalShortcut.unregister(ACCELERATORS[0])
    }
}
exports.uploadClipboardPicSwitch = uploadClipboardPicSwitch

    /**
 * 剪贴板富文本转纯文字
 */
function coverToTextSwitch(tray, check) {
    if (check) {
        globalShortcut.register(ACCELERATORS[1], () => {
            appMenuPublish.coverToText()
        })
    } else if (globalShortcut.isRegistered(ACCELERATORS[1])) {
        globalShortcut.unregister(ACCELERATORS[1])
    }
}
exports.coverToTextSwitch = coverToTextSwitch

/**
 * Ctrl+Q朗读剪切板内容(👉帮你阅读博客呦)
 * time:2020_6_5
 * auther: https://github.com/dahuoyzs
 */
function TTSSwitch(tray, check) {
    if (check) {
        globalShortcut.register(ACCELERATORS[2], () => {
            appMenuPublish.TTS()
        })
    } else if (globalShortcut.isRegistered(ACCELERATORS[2])) {
        globalShortcut.unregister(ACCELERATORS[2])
    }
}
exports.TTSSwitch = TTSSwitch
