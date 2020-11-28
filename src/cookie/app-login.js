const {BrowserWindow, session} = require('electron');
const https = require('https');
const jsDom = require("jsdom");
const icon = require('../common/app-icon');
const DataStore = require('../app-store');
const dataStore = new DataStore();

//登录某网站获取Cookie通用方法
function getSiteCookie(url, callback) {
    let win = new BrowserWindow(
        {width: 700, height: 600, icon: icon.iconFile, title: '【登陆成功后关闭窗口即可完成设置】'});
    win.loadURL(url).then();
    win.on('close', () => {
        // 查询所有与设置的 URL 相关的所有 cookies.
        session.defaultSession.cookies.get({url: url})
            .then((cookies) => {
                let cookieString = '';
                for (let cookie of cookies) {
                    cookieString += cookie.name + '=' + cookie.value + '; '
                }
                callback(cookieString.trim())
            }).catch((error) => {
            console.log(error)
        });
        win = null
    });
    win.on('page-title-updated', (e) => {
        //阻止窗口标题更改
        e.preventDefault()
    })
}

// 登录新浪图床
const loginWebBoPicture = function (item, focusedWindow, event) {
    getSiteCookie('https://www.weibo.com/', (cookie) => {
        dataStore.setWeiBoCookies(cookie)
    })
};
exports.loginWebBoPicture = loginWebBoPicture;

// 登录博客园
const loginCnBlog = function (item, focusedWindow, event) {
    getSiteCookie('https://www.cnblogs.com/', (cookie) => {
        dataStore.setCnBlogCookie(cookie)
    })
};
exports.loginCnBlog = loginCnBlog;

// 登录CSDN
const loginCSDN = function (item, focusedWindow, event) {
    getSiteCookie('https://blog.csdn.net/', (cookie) => {
        dataStore.setCSDNCookie(cookie)
    })
};
exports.loginCSDN = loginCSDN;

// 登录掘金
const loginJueJin = function (item, focusedWindow, event) {
    getSiteCookie('https://juejin.cn/', (cookie) => {
        dataStore.setJueJinCookie(cookie)
    })
};
exports.loginJueJin = loginJueJin;

// 登录开源中国
const loginOsChina = function (item, focusedWindow, event) {
    getSiteCookie('https://my.oschina.net/', (cookie) => {
        dataStore.setOsChinaCookie(cookie);
        getOsChinaUserInfo()
    })
};
exports.loginOsChina = loginOsChina;

// 获取开源中国的g_user_code，获取g_user_id
function getOsChinaUserInfo() {
    https.get('https://www.oschina.net/', {
        headers: {
            'Cookie': dataStore.getOsChinaCookies()
        }
    }, res => {
        let str = '';
        res.on('data', function (buffer) {
            str += buffer;//用字符串拼接
        });
        res.on('end', () => {
            const dom = new jsDom.JSDOM(str);
            const g_user_code = dom.window.document.body.querySelector(
                'body > val[data-name=g_user_code]').dataset.value;
            const g_user_id = dom.window.document.body.querySelector(
                'body > val[data-name=g_user_id]').dataset.value;
            if (g_user_code && g_user_id) {
                dataStore.setOsChinaUserCode(g_user_code);
                dataStore.setOsChinaUserId(g_user_id)
            }
        });
    })
}

// 登录思否
const loginSegmentFault = function (item, focusedWindow, event) {
    getSiteCookie('https://segmentfault.com', (cookie) => {
        dataStore.setSegmentFaultCookie(cookie)
    })
};

exports.loginSegmentFault = loginSegmentFault;

// 登录知乎
const loginZhiHu = function (item, focusedWindow, event) {
    getSiteCookie('https://www.zhihu.com', (cookie) => {
        dataStore.setZhiHuCookies(cookie)
    })
};

exports.loginZhiHu = loginZhiHu;

// 登录简书
const loginJianShu = function (item, focusedWindow, event) {
    getSiteCookie('https://www.jianshu.com/sign_in', (cookie) => {
        dataStore.setJianShuCookies(cookie)
    })
};

exports.loginJianShu = loginJianShu;