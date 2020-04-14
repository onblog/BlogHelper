const {Notification, dialog} = require('electron')

// 异步弹出提示消息
exports.toast = function toast(config) {
    if (Notification.isSupported()){
        new Notification(config).show()
    }else {
        const title = config.title || ''
        const body = config.body || ''
        dialog.showMessageBox({message: title + '\n' + body}).then()
    }
}
