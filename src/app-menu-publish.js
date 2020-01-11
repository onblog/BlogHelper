const {shell, dialog, app, clipboard} = require('electron')
const appPublish = require('./app-publish')
const util = require('./app-util')
const path = require('path')
const fs = require('fs')
const icon = require('./icon')
const appDialog = require('./app-dialog')
const weiBo = require('./picture/wei-bo')
const DataStore = require('./app-store')
const dataStore = new DataStore()
const appCheck = require('./app-check')
const https = require('https')
const jsdom = require('jsdom')

// 上传文章
exports.publishArticleTo = (tray, site) => {
    if (!appCheck.loginCheck(site)) {
        return
    }
    appDialog.openLocalFile((title, content, dirname) => {
        // 开启进度条图标
        tray.setImage(icon.proIconFile)
        // 上传文章
        appPublish.publishArticleTo(title, content, dirname, site)
            .then(() => {
                // 关闭进度条图标
                tray.setImage(icon.iconFile)
            })
    })
}

// 上传文章图片
exports.uploadAllPictureToWeiBo = async (tray) => {
    // 1.验证是否登录
    if (!dataStore.getWeiBoCookies()) {
        dialog.showMessageBox({message: '请先登录新浪微博'}).then()
        return
    }
    // 3.选择本地文件
    const result = appDialog.openLocalFileSync()
    if (result.canceled) {
        return
    }
    // 2.开启进度条图标
    tray.setImage(icon.proIconFile)
    const title = result.title
    const content = result.content
    const dirname = result.dirname;
    let value = content
    let success = 0;
    const map = new Map();
    // 4.读取图片的真实路径
    util.readImgLink(content, (src) => {
        const all_src = util.relativePath(dirname, src)
        map.set(src, all_src)
    })
    let tip = {is: true}
    for (let [src, all_src] of map.entries()) {
        if (path.isAbsolute(all_src) && fs.existsSync(all_src)) {
            // 5.上传本地图片
            await weiBo.uploadPictureToWeiBo(all_src)
                .then(href => {
                    value = value.replace(src, href)
                    success++
                })
                .catch(message => {
                    if (tip.is) {
                        dialog.showMessageBoxSync({message: message})
                        tip.is = false
                    }
                })
        }
    }
    // 6.关闭进度条图标
    tray.setImage(icon.iconFile)
    // 上传失败
    if (!tip.is) {
        return
    }
    // 上传图片数量为0
    if (success === 0) {
        dialog.showMessageBox({message: '该文档无md本地图片引用'}).then()
        return
    }
    // 新文件名
    const paths = path.join(dirname, title + '-PIC.md')
    // 7.写入新文档
    fs.writeFile(paths, value, function (err) {
        if (err) {
            return console.error(err)
        }
        let number = dialog.showMessageBoxSync({
                                                   message: '上传图片' + success + '张, 是否打开新文档？',
                                                   buttons: ['不了,谢谢', '打开']
                                               })
        if (number === 1) {
            // shell.showItemInFolder(paths)
            shell.openItem(paths)
        }
    });
}

// 上传一张图片
exports.uploadPictureToWeiBo = async (tray, image) => {
    // 1.验证是否登录
    if (!dataStore.getWeiBoCookies()) {
        dialog.showMessageBox({message: '请先登录新浪微博'}).then()
        return
    }
    // 2.开启进度条图标
    tray.setImage(icon.proIconFile)
    // 3.存储到临时文件夹
    const buffer = image.toPNG();
    const filePath = path.join(app.getPath("temp"), Math.floor(Math.random() * 10000000) + '.png')
    fs.writeFileSync(filePath, buffer)
    // 4.上传本地图片
    await weiBo.uploadPictureToWeiBo(filePath)
        .then(href => {
            while (!clipboard.readImage().isEmpty()) {
                clipboard.writeText(href)
            }
            dialog.showMessageBox({message: '图片链接已拷贝至剪贴板'}).then()
        })
        .catch(message => {
            dialog.showMessageBox({message: message}).then()
        })
    // 5.关闭进度条图标
    tray.setImage(icon.iconFile)
}

// 自动检查更新
// bool：是否提醒
exports.autoUpdateApp = (bool) => {
    const releases = 'https://github.com/yueshutong/BlogHelper/releases'
    const req = https.request(releases, {}, function (req) {
        let result = '';
        req.on('data', function (data) {
            result += data;
        });
        req.on('end', function () {
            parseHtml(result);
        });

        //解析html获取内容
        function parseHtml(result) {
            const dom = new jsdom.JSDOM(result);
            const element = dom.window.document.body.querySelector(
                'div.release-header > ul> li > a[title]')
            if (!(element && element.getAttribute('title'))) {
                if (bool) {
                    dialog.showMessageBox({message: '已经是最新版本！'}).then()
                }
                return
            }
            const version = element.getAttribute('title')
            if (util.compareVersion(version, app.getVersion()) > 0) {
                //发现更新
                dialog.showMessageBox({
                                          buttons: ['取消', '更新'],
                                          message: `当前版本：${app.getVersion()}\n发现新版本：${version}`
                                      }
                ).then(function (res) {
                    if (res.response === 1) {
                        shell.openExternal(releases).then()
                    }
                })
            } else if (bool) {
                dialog.showMessageBox({message: '已经是最新版本！'}).then()
            }
        }

    })
    req.on('error', (e) => {
        console.error(e);
    });
    req.end();
}
