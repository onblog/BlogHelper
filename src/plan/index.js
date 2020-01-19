const {remote, ipcRenderer} = require('electron')
const icon = require('../icon')

document.getElementById('submit').addEventListener('click', event => {
    const something = document.getElementById('something').value
    let hour = document.getElementById('hour').value
    let minute = document.getElementById('minute').value
    // 检查something
    if (!something || something.length === 0) {
        toast({title: '您未输入计划内容'})
        return
    }
    // 检查hour
    if (hour && hour.length > 0) {
        // 有内容
        const regExp = /^[0-9]+.?[0-9]*/;
        if (regExp.test(hour)) {
            hour = parseInt(hour)
            // 是数字
            if (hour > 24) {
                toast({title: '输入的时间超过24小时'})
                return
            }
        } else {
            // 不是数字
            toast({title: '输入的时间不是数字'})
            return
        }
    } else {
        // 无内容
        hour = 0;
    }
    // 检查minute
    if (minute && minute.length > 0) {
        // 有内容
        const regExp = /^[0-9]+.?[0-9]*/;
        if (regExp.test(minute)) {
            minute = parseInt(minute)
            // 是数字
            if (minute > 60) {
                toast({title: '输入的时间超过60分钟'})
                return
            }
        } else {
            // 不是数字
            toast({title: '输入的时间不是数字'})
            return
        }
    } else {
        // 无内容
        minute = 0
        return
    }
    if (minute === 0 && hour === 0) {
        toast({title: '不支持计划时间为0'})
        return
    }

    // 新建系统托盘并添加图标
    const tray = new remote.Tray(icon.timeIconFile)
    // 悬停通知
    tray.setToolTip(`倒计时${hour}时${minute}分`)
    // 倒计时
    const interval = setInterval(() => {
        if (minute > 0) {
            minute--
            // 悬停通知
            tray.setToolTip(`倒计时${hour}时${minute}分`)
        } else if (hour > 0) {
            minute = 59
            hour--;
            // 悬停通知
            tray.setToolTip(`倒计时${hour}时${minute}分`)
        }
        if (hour === 0 && minute === 0) {
            toast({title: '工作计划已结束'})
            remote.dialog.showMessageBox(
                {message: `您设定的工作计划【${something}】时间已到！`, buttons: ['好的,谢谢']}).then(() => {
                closePlan(interval, tray)
            })
        }
    }, 1000 * 60)

    tray.addListener('click', (event, bounds, position) => {
        remote.dialog.showMessageBox({
                                         message: `★★计划内容★★\n\n${something}\n\n剩余时间➤${hour}时${minute}分`,
                                         buttons: ['继续', '取消计划']
                                     }).then(value => {
            if (value.response === 1) {
                closePlan(interval, tray)
            }
        })
    })

    ipcRenderer.send('close-window')

    // 共享变量（保持一个计划在运行）
    remote.getGlobal('sharedObject').planing = true
})

function closePlan(interval, tray) {
    // 取消定时任务
    clearInterval(interval)
    // 共享变量（保持一个计划在运行）
    remote.getGlobal('sharedObject').planing = false
    // 取消菜单栏
    tray.destroy()
}

function toast(config) {
    if (remote.Notification.isSupported()) {
        new remote.Notification(config).show()
    } else {
        remote.dialog.showMessageBox({message: config.title + '\n' + config.body}).then()
    }
}