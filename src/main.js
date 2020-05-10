const {Menu, Tray, app} = require('electron')
const icon = require('./app-icon')
const appMenu = require('./app-menu')
const appShortcut = require('./app-shortcut')

app.on('ready', () => {
    // 隐藏系统任务栏
    process.platform === 'win32' ? Menu.setApplicationMenu(null) : app.dock.hide()
    // 检查更新
    appMenu.checkUpdateApp(false)
    // 创建托盘
    const tray = createTray()
    // 注册快捷键
    appShortcut.initGlobalShortcut(tray)
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

app.on('window-all-closed', (event) => {
    // 监听即可禁止窗口关闭时被退出
})