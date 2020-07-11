const {Menu, Tray, app, nativeTheme} = require('electron')
const icon = require('./app-icon')
const appMenu = require('./app-menu')
const autoUpdate = require('./app-update')
const picGo = require('./picture/picgo/picgo')

app.on('ready', () => {
    // 隐藏系统任务栏
    hiddenTaskbar()
    // 检查更新
    autoUpdate.autoUpdateApp(false)
    // 创建托盘
    createTray()
    // 初始化picGo配置文件
    picGo.initConfigFile()
});

function createTray() {
    // 新建系统托盘并添加图标
    const tray = new Tray(icon.iconFile)
    // 悬停通知
    tray.setToolTip('你今天真好看')
    // 添加菜单到系统托盘区
    const menu = appMenu.buildContextMenu(tray);
    tray.setContextMenu(menu)
    // 添加主题监听
    listenThemeChange(tray)
    return {tray, menu}
}

function hiddenTaskbar() {
    switch (process.platform) {
        case "win32":
            Menu.setApplicationMenu(null)
            break
        case "darwin":
            app.dock.hide()
            break
    }
}

function listenThemeChange(tray) {
    //判断是否为OSX
    if (process.platform === "darwin") {
        //当桌面主题更新时，自动刷新托盘图标
        nativeTheme.on('updated', () => {
            tray.setImage(icon.icon().iconFile)
        })
    }
}

app.on('window-all-closed', () => {
    // 监听即可禁止窗口关闭时被退出
})
