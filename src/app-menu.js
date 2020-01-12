const {Menu, app, dialog, clipboard, shell} = require('electron')
const appLogin = require('./app-login')
const string = require('./app-string')
const appMenuPublish = require('./app-menu-publish')
const appUtil = require('./app-util')

exports.buildContextMenu = (tray) => {
    // 开机自动检查一次更新
    appMenuPublish.autoUpdateApp(false)
    const template = [
        {
            label: '博客',
            // enabled: false
            submenu: [
                {
                    label: '博客园',
                    submenu: [{
                        label: '绑定',
                        click: function (menuItem, browserWindow, event) {
                            appLogin.loginCnBlog(menuItem, browserWindow, event)
                        }
                    }, {
                        label: '发布',
                        click: function (menuItem, browserWindow, event) {
                            appMenuPublish.publishArticleTo(tray, string.cnblogs)
                        }
                    }]
                }
                , {
                    label: 'CSDN',
                    submenu: [{
                        label: '绑定',
                        click: function (menuItem, browserWindow, event) {
                            appLogin.loginCSDN(menuItem, browserWindow, event)
                        }
                    }, {
                        label: '发布',
                        click: function (menuItem, browserWindow, event) {
                            appMenuPublish.publishArticleTo(tray, string.csdn)
                        }
                    }]
                }
                , {
                    label: '掘金',
                    submenu: [{
                        label: '绑定',
                        click: function (menuItem, browserWindow, event) {
                            appLogin.loginJueJin(menuItem, browserWindow, event)
                        }
                    }, {
                        label: '发布',
                        click: function (menuItem, browserWindow, event) {
                            appMenuPublish.publishArticleTo(tray, string.juejin)
                        }
                    }]
                }
                , {
                    label: '开源中国',
                    submenu: [{
                        label: '绑定',
                        click: function (menuItem, browserWindow, event) {
                            appLogin.loginOsChina(menuItem, browserWindow, event)
                        }
                    }, {
                        label: '发布',
                        click: function (menuItem, browserWindow, event) {
                            appMenuPublish.publishArticleTo(tray, string.oschina)
                        }
                    }]
                }
                , {
                    label: '思否',
                    submenu: [{
                        label: '绑定',
                        click: function (menuItem, browserWindow, event) {
                            appLogin.loginSegmentFault(menuItem, browserWindow, event)
                        }
                    }, {
                        label: '发布',
                        click: function (menuItem, browserWindow, event) {
                            appMenuPublish.publishArticleTo(tray, string.segmentfault)
                        }
                    }]
                }
            ]
        }
        , {
            label: '图床',
            submenu: [
                {
                    label: '新浪',
                    submenu: [
                        {
                            label: '绑定',
                            click: function (menuItem, browserWindow, event) {
                                appLogin.loginWebBoPicture(menuItem, browserWindow, event)
                            }
                        }
                        , {
                            label: '启用',
                            type: 'checkbox',
                            checked: true,
                            click: function (menuItem, browserWindow, event) {
                                dialog.showMessageBox({message: '暂时只支持新浪图床'}).then()
                                menuItem.checked = true
                            }
                        }
                    ]
                }
            ]
        }
        , {
            label: '文章',
            submenu: [
                {
                    label: '网络图片下载'
                }
                , {
                    label: '本地图片上传',
                    click: function () {
                        appMenuPublish.uploadAllPictureToWeiBo(tray).then()
                    }
                }
                , {
                    label: '本地图片整理'
                }
            ]
        }
        , {
            label: '剪贴板',
            submenu: [
                {
                    label: '图片上传',
                    click: function (menuItem, browserWindow, event) {
                        const nativeImage = clipboard.readImage()
                        if (nativeImage.isEmpty()) {
                            dialog.showMessageBox({message: '剪贴板未检索到图片'}).then()
                        } else {
                            appMenuPublish.uploadPictureToWeiBo(tray, nativeImage).then()
                        }
                    }
                }
                , {
                    label: '代码格式化',
                    click: function (menuItem, browserWindow, event) {
                        const oldT = clipboard.readText()
                        clipboard.writeText(appUtil.formatCode(oldT))
                        const newT = clipboard.readText()
                        if (oldT !== newT) {
                            dialog.showMessageBox({message: '剪贴板已更新'}).then()
                        }
                    }
                }
            ]
        }
        , {
            label: '工具集',
            submenu: [
                {
                    label: '文章排版',
                    click: function () {
                        shell.openExternal('http://md.onblogs.cn').then()
                    }
                }
                , {
                    label: '图片素材',
                    click: function () {
                        shell.openExternal('http://pic.onblogs.cn').then()
                    }
                }
            ]
        }
        , {
            type: "separator"
        }
        , {
            label: '关于应用',
            submenu: [
                {
                    label: '官方网站',
                    click: function () {
                        shell.openExternal('https://github.com/yueshutong/BlogHelper').catch()
                    }
                }
                , {
                    label: '我要反馈',
                    click: function () {
                        shell.openExternal('https://github.com/yueshutong/BlogHelper/issues')
                            .catch()
                    }
                }
                , {
                    label: '给我写信',
                    click: function () {
                        shell.openExternal('mailto:yster@foxmail.com').catch()
                    }
                }
                , {
                    label: '加入群聊',
                    click: function () {
                        shell.openExternal(
                            'https://shang.qq.com/wpa/qunwpa?idkey=d0756ea301050e3f093124a97ba19f7b5e40d5e03b6a849e7ca1748421eb193b')
                            .catch()
                    }
                }
                , {
                    label: '版本查询',
                    click: function () {
                        dialog.showMessageBox({message: app.getVersion()}).catch()
                    }
                }, {
                    label: '检查更新',
                    click: function () {
                        appMenuPublish.autoUpdateApp(true)
                    }
                }
            ]
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