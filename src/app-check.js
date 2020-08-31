const string = require('./app-string');
const DataStore = require('./app-store');
const dataStore = new DataStore();
const appToast = require('./app-toast');

// cookie登录校验
exports.loginCheck = (site) => {
    switch (site) {
        case string.cnblogs:
            if (!dataStore.getCnBlogCookies()) {
                appToast.toast({title: '请先登录博客园'});
                return false
            }
            break;
        case string.csdn:
            if (!dataStore.getCSDNCookies()) {
                appToast.toast({title: '请先登录CSDN'});
                return false
            }
            break;
        case string.juejin:
            if (!dataStore.getJueJinCookies()) {
                appToast.toast({title: '请先登录掘金',body:''});
                return false
            }
            break;
        case string.oschina:
            if (!dataStore.getOsChinaCookies()) {
                appToast.toast({title: '请先登录开源中国',body:''});
                return false
            }
            break;
        case string.segmentfault:
            if (!dataStore.getSegmentFaultCookie()) {
                appToast.toast({title: '请先登录思否',body:''});
                return false
            }
            break;
        case string.zhihu:
            if (!dataStore.getZhiHuCookies()) {
                appToast.toast({title: '请先登录知乎',body:''});
                return false
            }
            break;
        case string.jianshu:
            if (!dataStore.getJianShuCookies()) {
                appToast.toast({title: '请先登录简书',body:''});
                return false
            }
            break;
        default:
            appToast.toast({title: '未注册检查类型'});
            return false
    }
    return true
};