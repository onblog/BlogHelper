const {Menu, Tray, app, dialog} = require('electron')
const icon = require('./icon')
const appMenu = require('./app-menu')

app.on('ready', () => {
    // 隐藏mac、win上的任务栏
    process.platform === 'win32' ? Menu.setApplicationMenu(null) : app.dock.hide()
    createTray()
    remindDrinking()
});

function createTray() {
    // 新建系统托盘并添加图标
    const tray = new Tray(icon.iconFile)
    // 悬停通知
    tray.setToolTip('你今天真好看')
    // 添加菜单到系统托盘区
    tray.setContextMenu(appMenu.buildContextMenu(tray))
}

app.on('window-all-closed', () => {
    // app.quit()
})

// 提醒喝水小助手
function remindDrinking() {
    const interval = setInterval(() => {
        dialog.showMessageBox({message: '⏰您已连续工作1小时，小助手提醒您及时补充水分！', buttons: ['好的,我知道了', '关闭提醒']})
            .then(value => {
                if (value.response===1){
                    clearInterval(interval)
                }
            })
    }, 1000 * 60 * 60)
}