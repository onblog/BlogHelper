const {dialog, app, clipboard} = require('electron');
const appPublish = require('./app-publish');
const appUtil = require('./app-util');
const path = require('path');
const fs = require('fs');
const icon = require('./app-icon');
const appDialog = require('./app-localFile');
const appCheck = require('./app-check');
const appDownload = require('./app-download');
const appSave = require('./app-save');
const appToast = require('./app-toast');
const appUpload = require('./app-upload');
const logger = require('logger2x').createLogger(`${require('os').homedir()}/BlogHelper/publish.log`);

// 上传文章
function publishArticleTo(tray, site, isPublish, sleep) {
    if (!appCheck.loginCheck(site)) {
        return
    }
    // 1.选择本地文件
    const result = appDialog.openManyLocalFileSync();
    if (result.canceled) {
        return
    }
    // 2.开启进度条图标
    tray.setImage(icon.proIconFile);
    // 3.上传文章
    const files = result.files;
    let number = 0;
    // 定时任务
    let i = 0;
    let handler = function () {
        if (i < files.length) {
            const title = files[i].title;
            const content = files[i].content;
            const dirname = files[i].dirname;
            i++;
            appPublish.publishArticleTo(title, content, dirname, site, isPublish)
                .then(url => {
                    logger.log('发布文章到', site, '成功：', title);
                    number++;
                    appToast.openPublishUrl(url, title);
                    // 调用自身
                    setTimeout(handler, sleep ? sleep : 1000)
                }).catch(reason => {
                logger.log('发布文章到', site, '失败：', title, reason.toString());
                // 是否重试
                const n = dialog.showMessageBoxSync({
                                                        message: `《${title}》\n${reason.toString()}`,
                                                        buttons: ['取消', '跳过', '重试']
                                                    });
                if (n === 1) {
                    setTimeout(handler, sleep ? sleep : 1000)
                } else if (n === 2) {
                    i--;
                    setTimeout(handler, sleep ? sleep : 1000)
                } else {
                    // 4.关闭进度条图标
                    tray.setImage(icon.iconFile);
                    appToast.toast({title: `预处理${files.length}个,实际处理${number}个`})
                }
            })
        } else {
            // 4.关闭进度条图标
            tray.setImage(icon.iconFile);
            appToast.toast({title: `预处理${files.length}个,实际处理${number}个`})
        }
    };
    handler()
}

exports.publishArticleTo = publishArticleTo;

// 本地图片上传
exports.uploadAllPicture = async (tray) => {
    // 1.选择本地文件
    const result = appDialog.openManyLocalFileSync();
    if (result.canceled) {
        return
    }
    // 2.开启进度条图标
    tray.setImage(icon.proIconFile);
    let number = 0;
    for (let i = 0; i < result.files.length; i++) {
        const file = result.files[i];
        // 3.读取图片的真实路径
        const map = new Map();
        appUtil.readImgLink(file.content, (src) => {
            const fullPath = appUtil.relativePath(file.dirname, src);
            map.set(src, fullPath)
        });
        // 4.本地图片上传
        let value = file.content;
        let mark = {next: true};
        for (let [src, fullPath] of map.entries()) {
            if (mark.next && path.isAbsolute(fullPath) && fs.existsSync(fullPath)
                && appUtil.isLocalPicture(
                    fullPath)) {
                await appUpload.uploadPicture(fullPath)
                    .then(href => {
                        value = value.replace(src, href)
                    })
                    .catch(message => {
                        mark.next = false;
                        dialog.showMessageBoxSync(
                            {message: file.filepath + '\n' + message, type: 'error'})
                    })
            }
        }
        // 5.上传失败全部停止
        if (!mark.next) {
            break
        }
        // 6.保存
        appSave.saveNewFileOrClipboard(file, value, i);
        // 7.提示
        appToast.toast({title: '完成', body: file.title});
        // 统计
        number = i + 1
    }
    appToast.toast({title: `预处理${result.files.length}个,实际处理${number}个`});
    // 8.关闭进度条图标
    tray.setImage(icon.iconFile)
};

// 网络图片下载
exports.downloadMdNetPicture = async function (tray) {
    // 1.选择本地文件
    const result = appDialog.openManyLocalFileSync();
    if (result.canceled) {
        return
    }
    // 2.开启进度条图标
    tray.setImage(icon.proIconFile);
    let number = 0;
    for (let i = 0; i < result.files.length; i++) {
        const file = result.files[i];
        // 3.读取网图链接
        const map = new Map();
        // 保存在新的目录
        const dirname = file.dirname;
        // 存放图片的文件夹名
        const name = appUtil.stringDeal(file.title);
        appUtil.readImgLink(file.content, (src) => {
            if (appUtil.isWebPicture(src)) {
                // 图片文件名
                let filepath = path.join(dirname, name,
                                         Math.floor(Math.random() * 100000000) + '.png');
                map.set(src, filepath)
            }
        });
        // 4.替换
        let newValue = file.content;
        let mark = {next: true};
        for (let [src, filepath] of map.entries()) {
            if (!mark.next) {
                break
            }
            await appDownload.downloadPicture(src, filepath)
                .then(value => {
                    // 相对路径
                    const relativePath = './' + path.join(name, path.basename(filepath));
                    newValue = newValue.replace(src, relativePath)
                })
                .catch(reason => {
                    mark.next = false;
                    dialog.showMessageBoxSync(
                        {message: file.filepath + '\n' + reason, type: 'error'})
                })
        }
        // 5.上传失败全部停止
        if (!mark.next) {
            break
        }
        // 6.保存
        appSave.saveNewFileOrClipboard(file, newValue, i);
        // 7.提示
        appToast.toast({title: '完成', body: file.title});
        // 统计
        number = i + 1
    }
    appToast.toast({title: `预处理${result.files.length}个,实际处理${number}个`});
    // 8.关闭进度条图标
    tray.setImage(icon.iconFile)
};

// 文章本地图片整理
exports.movePictureToFolder = function (tray) {
    // 1.选择本地文件
    const result = appDialog.openManyLocalFileSync();
    if (result.canceled) {
        return
    }
    // 2.开启进度条图标
    tray.setImage(icon.proIconFile);
    let number = 0;
    for (let i = 0; i < result.files.length; i++) {
        const file = result.files[i];
        // 3.读取图片的真实路径
        const map = new Map();
        appUtil.readImgLink(file.content, (src) => {
            if (appUtil.isLocalPicture(src)) {
                const fullPath = appUtil.relativePath(file.dirname, src);
                // 当前图片在本地存在
                if (fs.existsSync(fullPath)) {
                    map.set(src, fullPath)
                }
            }
        });
        // 4.复制整理
        let value = file.content;
        for (let [src, fullPath] of map.entries()) {
            // 存放图片的文件夹名
            const dirName = appUtil.stringDeal(file.title);
            // 图片文件名
            const picName = path.basename(src);
            // 新的保存位置
            const picPath = path.join(file.dirname, dirName, picName);
            // 新的相对路径
            const relativePath = './' + path.join(dirName, picName);
            // 检查文件夹
            if (!fs.existsSync(path.dirname(picPath))) {
                fs.mkdirSync(path.dirname(picPath), {recursive: true})
            }
            if (picPath !== fullPath) {
                fs.copyFileSync(fullPath, picPath);
                value = value.replace(src, relativePath)
            } else {
                if (src !== relativePath) {
                    value = value.replace(src, relativePath)
                }
            }
        }
        // 5.保存
        appSave.saveNewFileOrClipboard(file, value, i);
        // 6.提示
        appToast.toast({title: '完成', body: file.title});
        // 统计
        number = i + 1
    }
    appToast.toast({title: `预处理${result.files.length}个,实际处理${number}个`});
    // 7.关闭进度条图标
    tray.setImage(icon.iconFile)
};

// 整理至新目录
exports.movePictureAndMdToFolder = function (tray) {
    // 1.选择本地文件
    const result = appDialog.openManyLocalFileSync();
    if (result.canceled) {
        return
    }
    // 2.开启进度条图标
    tray.setImage(icon.proIconFile);
    let number = 0;
    for (let i = 0; i < result.files.length; i++) {
        const file = result.files[i];
        // 3.读取图片的真实路径
        const map = new Map();
        appUtil.readImgLink(file.content, (src) => {
            if (appUtil.isLocalPicture(src)) {
                const fullPath = appUtil.relativePath(file.dirname, src);
                // 当前图片在本地存在
                if (fs.existsSync(fullPath)) {
                    map.set(src, fullPath)
                }
            }
        });
        // 4.复制整理
        let value = file.content;
        // 移动至新目录
        const OUTPUT = 'OUTPUT';
        const output = path.join(file.dirname, OUTPUT);
        if (!fs.existsSync(output)) {
            fs.mkdirSync(output, {recursive: true})
        }
        for (let [src, fullPath] of map.entries()) {
            // 存放图片的文件夹名
            const dirName = appUtil.stringDeal(file.title);
            // 图片文件名
            const picName = path.basename(src);
            // 新的保存位置
            const picPath = path.join(output, dirName, picName);
            // 新的相对路径
            const relativePath = './' + path.join(dirName, picName);
            // 检查文件夹
            if (!fs.existsSync(path.dirname(picPath))) {
                fs.mkdirSync(path.dirname(picPath), {recursive: true})
            }
            if (picPath !== fullPath) {
                fs.copyFileSync(fullPath, picPath);
                value = value.replace(src, relativePath)
            } else {
                if (src !== relativePath) {
                    value = value.replace(src, relativePath)
                }
            }
        }
        // 5.保存到新文件
        file.filepath = path.join(output, path.basename(file.filepath));
        fs.writeFileSync(file.filepath, value);
        // 6.提示
        appToast.toast({title: `保存到${OUTPUT}文件夹`, body: file.title});
        // 统计
        number = i + 1
    }
    appToast.toast({title: `预处理${result.files.length}个,实际处理${number}个`});
    // 7.关闭进度条图标
    tray.setImage(icon.iconFile)
};

// Md图片转Img
exports.pictureMdToImg = function (tray) {
    // 1.选择本地文件
    const result = appDialog.openManyLocalFileSync();
    if (result.canceled) {
        return
    }
    // 2.开启进度条图标
    tray.setImage(icon.proIconFile);
    let number = 0;
    for (let i = 0; i < result.files.length; i++) {
        const file = result.files[i];
        // 3.Md转Img
        let arrayList = file.content.split('\n');
        let newValue = '';
        arrayList.forEach(line => {
            const split = line.indexOf('!') !== -1 ? line.split('!') : [];
            for (let i = 0; i < split.length; i++) {
                if (split[i].length > 4 && split[i].indexOf('[') !== -1 && split[i].indexOf(']')
                    !== -1
                    && split[i].indexOf('(') !== -1 && split[i].indexOf(')') !== -1) {
                    const start = split[i].lastIndexOf('(');
                    const end = split[i].lastIndexOf(')');
                    let src = split[i].substring(start + 1, end); //图片的真实地址
                    line =
                        line.replace("!" + split[i],
                                     `<img src="${src}" referrerPolicy="no-referrer"/>`)
                }
            }
            newValue += line + '\n'
        });
        // 4.保存
        appSave.saveNewFileOrClipboard(file, newValue.trim(), i);
        // 5.提示
        appToast.toast({title: '完成', body: file.title});
        // 统计
        number = i + 1
    }
    appToast.toast({title: `预处理${result.files.length}个,实际处理${number}个`});
    // 6.关闭进度条图标
    tray.setImage(icon.iconFile)
};

/**
 * 剪贴板图片上传
 */
exports.uploadClipboardPic = function uploadClipboardPic(tray) {
    const nativeImage = clipboard.readImage();
    if (nativeImage.isEmpty()) {
        appToast.toast({title: '剪贴板未检索到图片', body: ''})
    } else {
        uploadOnePicture(tray, nativeImage).then()
    }
};

/**
 * 上传一张图片（用于剪贴板）
 */
async function uploadOnePicture(tray, image) {
    // 2.开启进度条图标
    tray.setImage(icon.proIconFile);
    // 3.存储到临时文件夹
    const buffer = image.toPNG();
    const filePath = path.join(app.getPath("temp"), Math.floor(Math.random() * 10000000) + '.png');
    fs.writeFileSync(filePath, buffer);
    // 4.上传本地图片
    await appUpload.uploadPicture(filePath)
        .then(href => {
            let number = dialog.showMessageBoxSync(
                {message: '图片链接已获取，拷贝格式为', buttons: ['Markdown', 'HTML', 'URL']});
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
            dialog.showMessageBoxSync({message: "" + message, type: 'error'})
        });
    // 5.关闭进度条图标
    tray.setImage(icon.iconFile)
}

/**
 * 剪贴板转纯文字
 */
exports.coverToText = function coverToText() {
    const newT = clipboard.readText();
    appUtil.updateClipboard(newT)
};

// HTML转Md
exports.HTMLToMd = function (tray) {
    // 1.选择本地文件
    const result = appDialog.openManyLocalFileSync([
                                                       {name: 'html', extensions: ['html']}
                                                   ]);
    if (result.canceled) {
        return
    }
    // 2.开启进度条图标
    tray.setImage(icon.proIconFile);
    let number = 0;
    for (let i = 0; i < result.files.length; i++) {
        const file = result.files[i];
        // 3.HTML转Md
        const newValue = require('html-to-md')(file.content);
        // 4.保存
        file.filepath = file.filepath.replace(path.extname(file.filepath), '.md');
        appSave.saveNewFileOrClipboard(file, newValue, i);
        // 5.提示
        appToast.toast({title: '完成', body: file.title});
        // 统计
        number = i + 1
    }
    appToast.toast({title: `预处理${result.files.length}个,实际处理${number}个`});
    // 6.关闭进度条图标
    tray.setImage(icon.iconFile)
};