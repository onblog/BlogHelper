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
const appDownload = require('./app-download')
const appSave = require('./app-save')

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

// 本地图片上传
exports.uploadAllPictureToWeiBo = async (tray) => {
    // 1.验证是否登录
    if (!dataStore.getWeiBoCookies()) {
        dialog.showMessageBoxSync({message: '请先登录新浪微博'})
        return
    }
    // 2.选择本地文件
    const result = appDialog.openLocalFileSync()
    if (result.canceled) {
        return
    }
    // 3.开启进度条图标
    tray.setImage(icon.proIconFile)
    // 4.读取图片的真实路径
    const map = new Map();
    util.readImgLink(result.content, (src) => {
        const fullPath = util.relativePath(result.dirname, src)
        map.set(src, fullPath)
    })
    // 5.本地图片上传
    let value = result.content
    let mark = {next: true, number: 0}
    for (let [src, fullPath] of map.entries()) {
        if (path.isAbsolute(fullPath) && fs.existsSync(fullPath)) {
            await weiBo.uploadPictureToWeiBo(fullPath)
                .then(href => {
                    value = value.replace(src, href)
                    mark.number++
                })
                .catch(message => {
                    if (mark.next) {
                        dialog.showMessageBoxSync({message: message, type: 'error'})
                        mark.next = false
                    }
                })
        }
    }
    // 6.关闭进度条图标
    tray.setImage(icon.iconFile)
    // 上传失败
    if (!mark.next) {
        return
    }
    // 上传图片数量为0
    if (mark.number === 0) {
        dialog.showMessageBoxSync({message: '该文档无本地图片引用'})
        return
    }
    // 7.保存
    appSave.saveNewFileOrClipboard(result, value, '-PIC-' + mark.number)
}

// 上传一张图片
exports.uploadPictureToWeiBo = async (tray, image) => {
    // 1.验证是否登录
    if (!dataStore.getWeiBoCookies()) {
        dialog.showMessageBoxSync({message: '请先登录新浪微博'})
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
            let number = dialog.showMessageBoxSync(
                {message: '图片链接已获取，拷贝格式为', buttons: ['Markdown', 'HTML', 'URL']})
            if (number === 0) {
                while (!clipboard.readImage().isEmpty()) {
                    clipboard.writeText('![](' + href + ')')
                }
            } else if (number === 1) {
                while (!clipboard.readImage().isEmpty()) {
                    clipboard.writeText(`<img src="${href}" referrerpolicy="no-referrer"/>`)
                }
            } else if (number === 2) {
                while (!clipboard.readImage().isEmpty()) {
                    clipboard.writeText(href)
                }
            }
        })
        .catch(message => {
            dialog.showMessageBoxSync({message: message})
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

// Md图片转Img
exports.pictureMdToImg = function (tray) {
    // 1.开启进度条图标
    tray.setImage(icon.proIconFile)
    // 2.选择本地文件
    const result = appDialog.openLocalFileSync()
    if (result.canceled) {
        return
    }
    // 3.Md转Img
    let arrayList = result.content.split('\n')
    let newValue = ''
    arrayList.forEach(line => {
        const split = line.indexOf('!') !== -1 ? line.split('!') : []
        for (let i = 0; i < split.length; i++) {
            if (split[i].length > 4 && split[i].indexOf('[') !== -1 && split[i].indexOf(']') !== -1
                && split[i].indexOf('(') !== -1 && split[i].indexOf(')') !== -1) {
                const start = split[i].lastIndexOf('(')
                const end = split[i].lastIndexOf(')')
                let src = split[i].substring(start + 1, end) //图片的真实地址
                line =
                    line.replace("!" + split[i], `<img src="${src}" referrerPolicy="no-referrer"/>`)
            }
        }
        newValue += line + '\n'
    })
    // 4.保存
    appSave.saveNewFileOrClipboard(result, newValue, '-IMG')
    // 5.关闭进度条图标
    tray.setImage(icon.iconFile)
}

// 网络图片下载
exports.downloadMdNetPicture = async function (tray) {
    // 1.开启进度条图标
    tray.setImage(icon.proIconFile)
    // 2.选择本地文件
    const result = appDialog.openLocalFileSync()
    if (result.canceled) {
        return
    }
    // 3.读取网图链接
    const map = new Map()
    util.readImgLink(result.content, (src) => {
        if (util.isWebPicture(src)) {
            // 存放图片的文件夹
            const dirName = util.stringDeal(result.title)
            let filepath = path.join(result.dirname, dirName, path.basename(src))
            map.set(src, filepath)
        }
    })
    // 4.替换
    let newValue = result.content
    let mark = {next: true, number: 0}
    for (let [src, filepath] of map.entries()) {
        await appDownload.downloadPicture(src, filepath)
            .then(value => {
                newValue = newValue.replace(src, filepath)
                mark.number++;
            })
            .catch(reason => {
                if (mark.next) {
                    dialog.showMessageBoxSync({message: reason, type: 'error'})
                    mark.next = false
                }
            })
    }
    // 5.关闭进度条图标
    tray.setImage(icon.iconFile)
    // 上传失败
    if (!mark.next) {
        return
    }
    if (mark.number === 0) {
        dialog.showMessageBoxSync({message: '该文档无网络图片引用'})
        return
    }
    // 6.保存
    appSave.saveNewFileOrClipboard(result, newValue, '-Local-' + mark.number)
}

// 一键图片整理到picture文件夹
exports.movePictureToFolder = function (tray) {
    // 1.开启进度条图标
    tray.setImage(icon.proIconFile)
    // 2.选择本地文件
    const result = appDialog.openLocalFileSync()
    if (result.canceled) {
        return
    }
    // 3.读取图片的真实路径
    const map = new Map();
    util.readImgLink(result.content, (src) => {
        if (util.isLocalPicture(src)) {
            const fullPath = util.relativePath(result.dirname, src)
            // 当前图片在本地存在
            if (fs.existsSync(fullPath)) {
                map.set(src, fullPath)
            }
        }
    })
    // 4.复制整理
    let value = result.content
    for (let [src, fullPath] of map.entries()) {
        // 存放图片的文件夹
        const dirName = util.stringDeal(result.title)
        // 图片文件名
        const picName = path.basename(src)
        // 新的保存位置
        const picPath = path.join(result.dirname, dirName, picName)
        // 新的相对路径
        const relativePath = './'+path.join(dirName, picName)
        if (picPath !== fullPath) {
            fs.copyFileSync(fullPath, picPath)
            value = value.replace(src, relativePath)
        } else {
            if (src !== relativePath){
                value = value.replace(src, relativePath)
            }
        }
    }
    // 5.保存
    appSave.saveNewFileOrClipboard(result,value,'-NORM')
    // 6.关闭进度条图标
    tray.setImage(icon.iconFile)
}