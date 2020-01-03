const {Menu, app} = require('electron')
const appLogin = require('./app-login')
const string = require('./app-string')
const appMenuPublish = require('./app-menu-publish')

exports.buildContextMenu = (tray) => {
    const template = [
        {
            type: 'separator'
        }
        , {
            label: '上传文章',
            enabled: false
        }
        , {
            label: '博客园',
            submenu: [{
                label: '登录',
                click: function (menuItem, browserWindow, event) {
                    appLogin.loginCnBlog(menuItem, browserWindow, event)
                }
            }, {
                label: '上传',
                click: function (menuItem, browserWindow, event) {
                    appMenuPublish.publishArticleTo(tray, string.cnblogs)
                }
            }]
        }
        , {
            label: 'CSDN',
            submenu: [{
                label: '登录',
                click: function (menuItem, browserWindow, event) {
                    appLogin.loginCSDN(menuItem, browserWindow, event)
                }
            }, {
                label: '上传',
                click: function (menuItem, browserWindow, event) {
                    appMenuPublish.publishArticleTo(tray, string.csdn)
                }
            }]
        }
        , {
            label: '掘金',
            submenu: [{
                label: '登录',
                click: function (menuItem, browserWindow, event) {
                    appLogin.loginJueJin(menuItem, browserWindow, event)
                }
            }, {
                label: '上传',
                click: function (menuItem, browserWindow, event) {
                    appMenuPublish.publishArticleTo(tray, string.juejin)
                }
            }]
        }
        , {
            label: '开源中国',
            submenu: [{
                label: '登录',
                click: function (menuItem, browserWindow, event) {
                    appLogin.loginOsChina(menuItem, browserWindow, event)
                }
            }, {
                label: '上传',
                click: function (menuItem, browserWindow, event) {
                    appMenuPublish.publishArticleTo(tray, string.oschina)
                }
            }]
        }
        , {
            label: '思否',
            submenu: [{
                label: '登录',
                click: function (menuItem, browserWindow, event) {
                    appLogin.loginSegmentFault(menuItem, browserWindow, event)
                }
            }, {
                label: '上传',
                click: function (menuItem, browserWindow, event) {
                    appMenuPublish.publishArticleTo(tray, string.segmentfault)
                }
            }]
        }
        , {
            type: 'separator'
        }
        , {
            label: '上传图片',
            enabled: false
        }
        , {
            label: '新浪',
            submenu: [
                {
                    label: '登录',
                    click: function (menuItem, browserWindow, event) {
                        appLogin.loginWebBoPicture(menuItem, browserWindow, event)
                    }
                }
                , {
                    label: '上传',
                    click: function (menuItem, browserWindow, event) {
                        appMenuPublish.uploadAllPictureToWeiBo(tray)
                    }
                }
            ]
        }
        , {
            type: 'separator'
        }
        , {
            label: '上传图片',
            enabled: false
        }
        , {
            type: "separator"
        }
        , {
            label: '退出程序',
            click: () => {
                tray.destroy()
                app.quit()
            }
        }
    ]
    return Menu.buildFromTemplate(template)
}