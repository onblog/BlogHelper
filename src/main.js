const {Menu, Tray, app} = require('electron')
const icon = require('./icon')
const appMenu = require('./app-menu')

app.on('ready', () => {
    // 隐藏mac、win上的任务栏
    process.platform === 'win32' ? Menu.setApplicationMenu(null) : app.dock.hide()
    createTray()
});

function createTray() {
    // 新建系统托盘并添加图标
    const tray = new Tray(icon.iconFile)
    // 悬停通知
    tray.setToolTip('Hello world')
    // 添加菜单到系统托盘区
    tray.setContextMenu(appMenu.buildContextMenu(tray))
}

app.on('window-all-closed', () => {
    // app.quit()
})