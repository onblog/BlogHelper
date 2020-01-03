const {dialog} = require('electron')
const string = require('./app-string')
const DataStore = require('./app-store')
const dataStore = new DataStore()

// cookie登录校验
exports.loginCheck = (site) => {
    switch (site) {
        case string.cnblogs:
            if (!dataStore.getCnBlogCookies()) {
                dialog.showMessageBox({message: '请先登录博客园'}).then()
                return false
            }
            break
        case string.csdn:
            if (!dataStore.getCSDNCookies()) {
                dialog.showMessageBox({message: '请先登录CSDN'}).then()
                return false
            }
            break
        case string.juejin:
            if (!dataStore.getJueJinCookies()) {
                dialog.showMessageBox({message: '请先登录掘金'}).then()
                return false
            }
            break
        case string.oschina:
            if (!dataStore.getOsChinaCookies()) {
                dialog.showMessageBox({message: '请先登录开源中国'}).then()
                return false
            }
            break
        case string.segmentfault:
            if (!dataStore.getSegmentFaultCookie()) {
                dialog.showMessageBox({message: '请先登录思否'}).then()
                return false
            }
            break
        default:
            return false
    }
    return true
}