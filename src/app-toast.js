const {Notification, dialog} = require('electron')

// 异步弹出提示消息
exports.toast = function toast(config) {
    if (Notification.isSupported()){
        new Notification(config).show()
    }else {
        dialog.showMessageBox({message:config.title+'\n'+config.body}).then()
    }
}
