const {dialog, app, clipboard} = require('electron')
const appPublish = require('./app-publish')
const util = require('./app-util')
const path = require('path')
const fs = require('fs')
const icon = require('./app-icon')
const appDialog = require('./app-localFile')
const appCheck = require('./app-check')
const appDownload = require('./app-download')
const appSave = require('./app-save')
const appToast = require('./app-toast')
const appUpload = require('./app-upload')

// 上传文章
exports.publishArticleTo = (tray, site) => {
    if (!appCheck.loginCheck(site)) {
        return
    }
    appDialog.openManyLocalFile((title, content, dirname) => {
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
    // 1.选择本地文件
    const result = appDialog.openManyLocalFileSync()
    if (result.canceled) {
        return
    }
    // 2.开启进度条图标
    tray.setImage(icon.proIconFile)
    let number = 0
    for (let i = 0; i < result.files.length; i++) {
        const file = result.files[i]
        // 3.读取图片的真实路径
        const map = new Map();
        util.readImgLink(file.content, (src) => {
            const fullPath = util.relativePath(file.dirname, src)
            map.set(src, fullPath)
        })
        // 4.本地图片上传
        let value = file.content
        let mark = {next: true}
        for (let [src, fullPath] of map.entries()) {
            if (path.isAbsolute(fullPath) && fs.existsSync(fullPath) && util.isLocalPicture(
                fullPath)) {
                await appUpload.uploadPicture(fullPath)
                    .then(href => {
                        value = value.replace(src, href)
                    })
                    .catch(message => {
                        if (mark.next) {
                            dialog.showMessageBoxSync(
                                {message: file.filepath + '\n' + message, type: 'error'})
                            mark.next = false
                        }
                    })
            }
        }
        // 5.上传失败全部停止
        if (!mark.next) {
            break
        }
        // 6.保存
        appSave.saveNewFileOrClipboard(file, value, i)
        // 7.提示
        appToast.toast({title: '完成', body: file.title})
        // 统计
        number = i + 1
    }
    appToast.toast({title: `预处理${result.files.length}个,实际处理${number}个`})
    // 8.关闭进度条图标
    tray.setImage(icon.iconFile)
}

// 网络图片下载
exports.downloadMdNetPicture = async function (tray) {
    // 1.选择本地文件
    const result = appDialog.openManyLocalFileSync()
    if (result.canceled) {
        return
    }
    // 2.开启进度条图标
    tray.setImage(icon.proIconFile)
    let number = 0
    for (let i = 0; i < result.files.length; i++) {
        const file = result.files[i]
        // 3.读取网图链接
        const map = new Map()
        // 保存在新的目录
        const dirname = file.dirname
        // 存放图片的文件夹名
        const name = util.stringDeal(file.title)
        util.readImgLink(file.content, (src) => {
            if (util.isWebPicture(src)) {
                // 图片文件名
                let filepath = path.join(dirname, name,
                                         Math.floor(Math.random() * 100000000) + '.png')
                map.set(src, filepath)
            }
        })
        // 4.替换
        let newValue = file.content
        let mark = {next: true}
        for (let [src, filepath] of map.entries()) {
            await appDownload.downloadPicture(src, filepath)
                .then(value => {
                    // 相对路径
                    const relativePath = './' + path.join(name, path.basename(filepath))
                    newValue = newValue.replace(src, relativePath)
                })
                .catch(reason => {
                    if (mark.next) {
                        dialog.showMessageBoxSync(
                            {message: file.filepath + '\n' + reason, type: 'error'})
                        mark.next = false
                    }
                })
        }
        // 5.上传失败全部停止
        if (!mark.next) {
            break
        }
        // 6.保存
        appSave.saveNewFileOrClipboard(file, newValue, i)
        // 7.提示
        appToast.toast({title: '完成', body: file.title})
        // 统计
        number = i + 1
    }
    appToast.toast({title: `预处理${result.files.length}个,实际处理${number}个`})
    // 8.关闭进度条图标
    tray.setImage(icon.iconFile)
}

// 文章本地图片整理
exports.movePictureToFolder = function (tray) {
    // 1.选择本地文件
    const result = appDialog.openManyLocalFileSync()
    if (result.canceled) {
        return
    }
    // 2.开启进度条图标
    tray.setImage(icon.proIconFile)
    let number = 0
    for (let i = 0; i < result.files.length; i++) {
        const file = result.files[i]
        // 3.读取图片的真实路径
        const map = new Map();
        util.readImgLink(file.content, (src) => {
            if (util.isLocalPicture(src)) {
                const fullPath = util.relativePath(file.dirname, src)
                // 当前图片在本地存在
                if (fs.existsSync(fullPath)) {
                    map.set(src, fullPath)
                }
            }
        })
        // 4.复制整理
        let value = file.content
        for (let [src, fullPath] of map.entries()) {
            // 存放图片的文件夹名
            const dirName = util.stringDeal(file.title)
            // 图片文件名
            const picName = path.basename(src)
            // 新的保存位置
            const picPath = path.join(file.dirname, dirName, picName)
            // 新的相对路径
            const relativePath = './' + path.join(dirName, picName)
            // 检查文件夹
            if (!fs.existsSync(path.dirname(picPath))) {
                fs.mkdirSync(path.dirname(picPath), {recursive: true})
            }
            if (picPath !== fullPath) {
                fs.copyFileSync(fullPath, picPath)
                value = value.replace(src, relativePath)
            } else {
                if (src !== relativePath) {
                    value = value.replace(src, relativePath)
                }
            }
        }
        // 5.保存
        appSave.saveNewFileOrClipboard(file, value, i)
        // 6.提示
        appToast.toast({title: '完成', body: file.title})
        // 统计
        number = i + 1
    }
    appToast.toast({body: `预处理${result.files.length}个,实际处理${number}个`})
    // 7.关闭进度条图标
    tray.setImage(icon.iconFile)
}

// 整理至新目录
exports.movePictureAndMdToFolder = function (tray) {
    // 1.选择本地文件
    const result = appDialog.openManyLocalFileSync()
    if (result.canceled) {
        return
    }
    // 2.开启进度条图标
    tray.setImage(icon.proIconFile)
    let number = 0
    for (let i = 0; i < result.files.length; i++) {
        const file = result.files[i]
        // 3.读取图片的真实路径
        const map = new Map();
        util.readImgLink(file.content, (src) => {
            if (util.isLocalPicture(src)) {
                const fullPath = util.relativePath(file.dirname, src)
                // 当前图片在本地存在
                if (fs.existsSync(fullPath)) {
                    map.set(src, fullPath)
                }
            }
        })
        // 4.复制整理
        let value = file.content
        // 移动至新目录
        const output = path.join(file.dirname, 'OUTPUT')
        if (!fs.existsSync(output)) {
            fs.mkdirSync(output, {recursive: true})
        }
        for (let [src, fullPath] of map.entries()) {
            // 存放图片的文件夹名
            const dirName = util.stringDeal(file.title)
            // 图片文件名
            const picName = path.basename(src)
            // 新的保存位置
            const picPath = path.join(output, dirName, picName)
            // 新的相对路径
            const relativePath = './' + path.join(dirName, picName)
            // 检查文件夹
            if (!fs.existsSync(path.dirname(picPath))) {
                fs.mkdirSync(path.dirname(picPath), {recursive: true})
            }
            if (picPath !== fullPath) {
                fs.copyFileSync(fullPath, picPath)
                value = value.replace(src, relativePath)
            } else {
                if (src !== relativePath) {
                    value = value.replace(src, relativePath)
                }
            }
        }
        // 5.保存
        file.filepath = path.join(output, path.basename(file.filepath))
        appSave.saveNewFileOrClipboard(file, value, i)
        // 6.提示
        appToast.toast({title: '完成', body: file.title})
        // 统计
        number = i + 1
    }
    appToast.toast({body: `预处理${result.files.length}个,实际处理${number}个`})
    // 7.关闭进度条图标
    tray.setImage(icon.iconFile)
}

// Md图片转Img
exports.pictureMdToImg = function (tray) {
    // 1.选择本地文件
    const result = appDialog.openManyLocalFileSync()
    if (result.canceled) {
        return
    }
    // 2.开启进度条图标
    tray.setImage(icon.proIconFile)
    let number = 0
    for (let i = 0; i < result.files.length; i++) {
        const file = result.files[i]
        // 3.Md转Img
        let arrayList = file.content.split('\n')
        let newValue = ''
        arrayList.forEach(line => {
            const split = line.indexOf('!') !== -1 ? line.split('!') : []
            for (let i = 0; i < split.length; i++) {
                if (split[i].length > 4 && split[i].indexOf('[') !== -1 && split[i].indexOf(']')
                    !== -1
                    && split[i].indexOf('(') !== -1 && split[i].indexOf(')') !== -1) {
                    const start = split[i].lastIndexOf('(')
                    const end = split[i].lastIndexOf(')')
                    let src = split[i].substring(start + 1, end) //图片的真实地址
                    line =
                        line.replace("!" + split[i],
                                     `<img src="${src}" referrerPolicy="no-referrer"/>`)
                }
            }
            newValue += line + '\n'
        })
        // 4.保存
        appSave.saveNewFileOrClipboard(file, newValue.trim(), i)
        // 5.提示
        appToast.toast({title: '完成', body: file.title})
        // 统计
        number = i + 1
    }
    appToast.toast({title: `预处理${result.files.length}个,实际处理${number}个`})
    // 6.关闭进度条图标
    tray.setImage(icon.iconFile)
}

// 上传一张图片（用于剪贴板）
exports.uploadPictureToWeiBo = async (tray, image) => {
    // 2.开启进度条图标
    tray.setImage(icon.proIconFile)
    // 3.存储到临时文件夹
    const buffer = image.toPNG();
    const filePath = path.join(app.getPath("temp"), Math.floor(Math.random() * 10000000) + '.png')
    fs.writeFileSync(filePath, buffer)
    // 4.上传本地图片
    await appUpload.uploadPicture(filePath)
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
            dialog.showMessageBoxSync({message: message, type: 'error'})
        })
    // 5.关闭进度条图标
    tray.setImage(icon.iconFile)
}