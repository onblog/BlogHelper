const {MenuItem} = require('electron')
const appMenuPublish = require('./publish')
const appToast = require('../../app-toast')
const PublishDataStore = require('./publish-store')
const dataStore = new PublishDataStore()

exports.status = function (menu, tray) {
    menu.append(new MenuItem({
        label: '发布所有', submenu: [
            new MenuItem({
                label: '查看已登录',
                click() {
                    appToast.toast({title: '已登录：' + dataStore.getAllLoginPlatform().toString()})
                }
            }),
            new MenuItem({
                label: '存稿所有',
                click() {
                    appMenuPublish.publishArticleTo(tray, false, 5000)
                }
            }),
            new MenuItem({
                label: '发布所有',
                click() {
                    appMenuPublish.publishArticleTo(tray, true, 5000)
                }
            })
        ]
    }));

}