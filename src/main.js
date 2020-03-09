const {BrowserWindow, Menu, Tray, app} = require('electron')
const icon = require('./icon')
const appMenu = require('./app-menu')

app.on('ready', () => {
    // 隐藏mac、win上的任务栏
    process.platform === 'win32' ? Menu.setApplicationMenu(null) : app.dock.hide()
    // 创建菜单栏
    createTray()
});

// 创建唯一的窗口
function createWindow() {
    let win = new BrowserWindow({
                                    width: 700,
                                    height: 550,
                                    show: false,
                                    titleBarStyle: "hidden",
                                    webPreferences: {nodeIntegration: true}
                                })
    win.on('close', (e) => {
        e.preventDefault()
        win.hide()
    })
    return win
}

function createTray() {
    // 新建系统托盘并添加图标
    const tray = new Tray(icon.iconFile)
    // 悬停通知
    tray.setToolTip('你今天真好看')
    // 添加菜单到系统托盘区
    tray.setContextMenu(appMenu.buildContextMenu(tray, createWindow()))
}

