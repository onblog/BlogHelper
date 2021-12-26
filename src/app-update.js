const {shell, dialog, app} = require('electron');
const util = require('./common/app-util');
const https = require('https');
const jsdom = require('jsdom');
const appToast = require('./common/app-toast');

const url = require('./common/app-link').url;

// 自动检查更新（bool：是否主动操作）
function autoUpdateApp(isTip) {
    const req = https.request(url, {}, function (req) {
        let result = '';
        req.on('data', function (data) {
            result += data;
        });
        req.on('end', function () {
            parseHtml(result, isTip);
        });
    });
    req.on('error', (e) => {
        console.error(e);
        dialog.showMessageBoxSync({message: '网络连接异常'})
    });
    req.end();
}

exports.autoUpdateApp = autoUpdateApp;

//解析html获取内容
function parseHtml(result, isTip) {
    const dom = new jsdom.JSDOM(result);
    const element = dom.window.document.body.querySelector('div.release-header > ul> li > a[title]');
    if (!(element && element.getAttribute('title'))) {
        if (isTip) {
            appToast.toast({title: '检查更新失败, 请前去官网查看', body: ''});
            shell.openExternal(url).then()
        }
        return
    }
    const version = element.getAttribute('title');
    const compareVersion = util.compareVersion(version, app.getVersion());
    if (compareVersion > 0) {
        //需要更新
        dialog.showMessageBox({
                                  buttons: ['取消', '查看', '下载'],
                                  message: `当前版本：${app.getVersion()}\n发现新版本：${version}`
                              }
        ).then(function (res) {
            if (res.response === 1) {
                shell.openExternal(url).then()
            } else if (res.response === 2) {
                // 下载压缩包
                shell.openExternal(require('./common/app-link').download).then()
            }
            // 自动检查更新
            setTimeout(function () {
                autoUpdateApp(false)
            }, 1000*60*60)
        })
    } else {
        // 不需要更新
        if (isTip) {
            appToast.toast({title: '已经是最新版本', body: '最新发布版本 ' + version})
        }
        // 自动检查更新
        setTimeout(function () {
            autoUpdateApp(false)
        }, 1000*60*60)
    }
}