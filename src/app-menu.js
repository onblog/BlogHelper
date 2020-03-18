const {Menu, app, clipboard, shell} = require('electron')
const appLogin = require('./app-login')
const string = require('./app-string')
const appMenuPublish = require('./app-menu-publish')
const appUtil = require('./app-util')
const DataStore = require('./app-store')
const dataStore = new DataStore()
const toast = require('./app-toast')
const appUpdate = require('./app-update')

// 图床
const PIC = dataStore.PIC

exports.buildContextMenu = function buildContextMenu(tray, win) {
    // 开机自动检查一次版本更新
    appUpdate.autoUpdateApp(false)
    // 菜单栏引用
    let menu
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
                            id: PIC[0],
                            type: 'checkbox',
                            checked: dataStore.isWeiBoFigureBedSwitch(),
                            click: function (menuItem, browserWindow, event) {
                                menuItem.checked = true
                                dataStore.setWeiBoFigureBedSwitch()
                                toast.toast({title: '启用成功', body: '正在使用新浪图床'})
                                closeMenuChecked(menuItem.id, menu)
                            }
                        }
                    ]
                }
                , {
                    label: '图壳',
                    submenu: [
                        {
                            label: '启用',
                            id: PIC[2],
                            type: 'checkbox',
                            checked: dataStore.isIMGKRFigureBedSwitch(),
                            click: function (menuItem, browserWindow, even) {
                                menuItem.checked = true
                                dataStore.setIMGKRFigureBedSwitch()
                                toast.toast({title: '启用成功', body: '正在使用图壳图床'})
                                closeMenuChecked(menuItem.id, menu)
                            }
                        }
                    ]
                }
                , {
                    label: 'SM.MS',
                    submenu: [
                        {
                            label: '启用',
                            id: PIC[1],
                            type: 'checkbox',
                            checked: dataStore.isSmMSFigureBedSwitch(),
                            click: function (menuItem, browserWindow, even) {
                                menuItem.checked = true
                                dataStore.setSmMSFigureBedSwitch()
                                toast.toast({title: '启用成功', body: '正在使用SM图床'})
                                closeMenuChecked(menuItem.id, menu)
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
                    label: '本地图片上传',
                    click: function () {
                        appMenuPublish.uploadAllPictureToWeiBo(tray).then()
                    }
                }
                , {
                    label: '网络图片下载',
                    click: function () {
                        appMenuPublish.downloadMdNetPicture(tray).then()
                    }
                }
                , {
                    label: '本地图片整理',
                    click: function () {
                        appMenuPublish.movePictureToFolder(tray)
                    }
                }
                , {
                    label: '整理至新目录',
                    click: function () {
                        appMenuPublish.movePictureAndMdToFolder(tray)
                    }
                }
                , {
                    label: 'MD转IMG标签',
                    click: function () {
                        appMenuPublish.pictureMdToImg(tray)
                    }
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
                            toast.toast({title: '剪贴板未检索到图片', body: ''})
                        } else {
                            appMenuPublish.uploadPictureToWeiBo(tray, nativeImage).then()
                        }
                    }
                }
                , {
                    label: '代码对齐',
                    click: function () {
                        const oldT = clipboard.readText()
                        const text = appUtil.formatCode(oldT)
                        clipboard.writeText(text)
                        while (clipboard.readText() !== text) {
                            clipboard.writeText(text)
                        }
                        if (oldT !== clipboard.readText()) {
                            toast.toast({title: '剪贴板已更新'})
                        }
                    }
                }
                , {
                    label: 'HTML转MD',
                    click: function () {
                        const oldT = clipboard.readText()
                        clipboard.writeText(require('html-to-md')(oldT))
                        const newT = clipboard.readText()
                        if (oldT !== newT) {
                            toast.toast({title: '剪贴板已更新'})
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
                        shell.openExternal(require('./app-constant').article).then()
                    }
                }
                , {
                    label: '图片素材',
                    click: function () {
                        shell.openExternal(require('./app-constant').pic).then()
                    }
                }
                , {
                    label: 'JSON美化',
                    click: function () {
                        shell.openExternal(require('./app-constant').json).then()
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
                        shell.openExternal(require('./app-constant').link).catch()
                    }
                }
                , {
                    label: '我要反馈',
                    click: function () {
                        shell.openExternal(require('./app-constant').issues)
                            .catch()
                    }
                }
                , {
                    label: '给我写信',
                    click: function () {
                        shell.openExternal(require('./app-constant').mail).catch()
                    }
                }
                , {
                    label: '版本查询',
                    click: function () {
                        toast.toast({title: '当前版本 ' + app.getVersion(), body: ''})
                    }
                }, {
                    label: '检查更新',
                    click: function () {
                        appUpdate.autoUpdateApp(true)
                    }
                }
            ]
        }
        , {
            label: '退出程序',
            click: () => {
                tray.destroy()
                win.destroy()
                app.quit()
            }
        }
    ]
    menu = Menu.buildFromTemplate(template)
    return menu
}

// 关闭除ID外的其他checked
function closeMenuChecked(id, menu) {
    for (let pic of PIC) {
        if (id !== pic) {
            appUtil.myGetMenuItemById(pic, menu).checked = false
        }
    }
}