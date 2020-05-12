const {Menu, Tray, app} = require('electron')
const icon = require('./app-icon')
const appMenu = require('./app-menu')
const appShortcut = require('./app-shortcut')
const autoUpdate = require('./app-update')
const picGo = require('./picture/picgo/picgo')

app.on('ready', () => {
    // 隐藏系统任务栏
    process.platform === 'win32' ? Menu.setApplicationMenu(null) : app.dock.hide()
    // 检查更新
    autoUpdate.autoUpdateApp(false)
    // 创建托盘
    const tray = createTray()
    // 注册快捷键
    appShortcut.initGlobalShortcut(tray)
    // 初始化picGo配置文件
    picGo.initConfigFile()
});

function createTray() {
    // 新建系统托盘并添加图标
    const tray = new Tray(icon.iconFile)
    // 悬停通知
    tray.setToolTip('你今天真好看')
    // 添加菜单到系统托盘区
    tray.setContextMenu(appMenu.buildContextMenu(tray))
    return tray
}

app.on('window-all-closed', () => {
    // 监听即可禁止窗口关闭时被退出
})