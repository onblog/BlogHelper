const {dialog, app, clipboard} = require('electron')
const PublishDataStore = require('./publish-store')
const dataStore = new PublishDataStore()
const icon = require('../../app-icon')
const appToast = require('../../app-toast')
const appDialog = require('../../app-localFile')
const appPublish = require('../../app-publish')
const logger = require('logger2x').createLogger(`${require('os').homedir()}/BlogHelper/publish.log`)


// 上传文章
function publishArticleTo(tray, isPublish, sleep) {
    if (dataStore.getAllLoginPlatform() === null) {
        appToast.toast({title: '至少登录一个平台'})
        return
    }

    // 1.选择本地文件
    const result = appDialog.openManyLocalFileSync()
    if (result.canceled) {
        return
    }
    // 2.开启进度条图标
    tray.setImage(icon.proIconFile)
    // 3.上传文章
    const files = result.files


    let number = 0
    // 定时任务
    let i = 0

    function publish(title, content, dirname, site) {
        appPublish.publishArticleTo(title, content, dirname, site, isPublish)
        .then(url => {
            logger.log('发布文章到', site, '成功：', title)
            number++
            appToast.openPublishUrl(url, title)
            // 调用自身
            setTimeout(handler, sleep ? sleep : 1000)
        }).catch(reason => {
            logger.log('发布文章到', site, '失败：', title, reason.toString())
            // 是否重试
            const n = dialog.showMessageBoxSync({
                message: `《${title}》\n${reason.toString()}`,
                buttons: ['取消', '跳过', '重试']
            })
            if (n === 1) {
                setTimeout(handler, sleep ? sleep : 1000)
            } else if (n === 2) {
                i--;
                setTimeout(handler, sleep ? sleep : 1000)
            } else {
                // 4.关闭进度条图标
                tray.setImage(icon.iconFile)
                appToast.toast({title: `预处理${files.length}个,实际处理${number}个`})
            }
        })
    }

    let handler = function () {
        if (i < files.length) {
            const title = files[i].title
            const content = files[i].content
            const dirname = files[i].dirname
            i++;
            // 全部发布
            if (dataStore.getAllLoginPlatform() !== null) {
                for (let i = 0; i < dataStore.getAllLoginPlatform().length; i++) {
                    const s = dataStore.getAllLoginPlatform()[i];
                    appToast.toast({title: s})
                    publish(title, content, dirname, s);
                }
            } else {
                appToast.toast({title: '至少登录一个平台'})
            }
        } else {
            // 4.关闭进度条图标
            tray.setImage(icon.iconFile)
            appToast.toast({title: `预处理${files.length}个,实际处理${number}个`})
        }
    }
    handler()
}

exports.publishArticleTo = publishArticleTo