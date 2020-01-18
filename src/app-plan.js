const appToast = require('./app-toast')
const {ipcMain} = require('electron')
let window

exports.planDoThing = function planDoThing(win) {
    window = win
    if (global.sharedObject.planing) {
        appToast.toast({title: '您有计划正在进行中哦'})
    } else {
        win.setBounds({ width: 600, height: 400 })
        win.loadURL(`file://${__dirname}/plan/index.html`).then(value => {
            win.show()
        })
    }
}

ipcMain.on('close-window', event => {
    window.hide()
    appToast.toast({title: '计划添加成功',body:'鼠标悬停托盘查看倒计时'})
})