const {Notification, shell, dialog} = require('electron');
const logger = require('logger2x').createLogger(`${require('os').homedir()}/BlogHelper/toast.log`);

// 异步弹出提示消息
exports.toast = function toast(config) {
    logger.log(JSON.stringify(config));
    if (Notification.isSupported()) {
        new Notification(config).show()
    } else {
        const title = config.title || '';
        const body = config.body || '';
        dialog.showMessageBox({message: title + '\n' + body}).then()
    }
};

/**
 * 文章发布提示消息
 */
exports.openPublishUrl = (url, title) => {
    if (Notification.isSupported()) {
        const notification = new Notification({title: '发布成功！', subtitle: title, body: '点击可在浏览器打开'});
        notification.addListener('click', event => {
            shell.openExternal(url).then()
        });
        notification.show()
    } else {
        const number = dialog.showMessageBoxSync(
            {message: `发布成功！是否在浏览器打开：${title}`, buttons: ['取消', '打开']});
        if (number === 1) {
            shell.openExternal(url).then()
        }
    }
};