const {shell, dialog} = require('electron')
const util = require('./app-util')
const string = require('./app-string')
const marked = require('marked')
const fs = require('fs')
const appUpload = require('./app-upload')

const cnblogs = require('./blog/cnblogs')
const csdn = require('./blog/csdn')
const juejin = require('./blog/juejin')
const oschina = require('./blog/oschina')
const segmentfault = require('./blog/segmentfault')
const zhihu = require('./blog/zhihu')
const jianshu = require('./blog/jianshu')

// 发布文章到平台
const publishArticleTo = async (title, content, dirname, site, isPublish) => {
    // 1.参数校验
    if (title == null || title.length < 1) {
        dialog.showMessageBoxSync({message: '文章标题为空'})
        return
    }
    if (content == null || content.length < 1) {
        dialog.showMessageBoxSync({message: '文章内容为空'})
        return
    }
    if (dirname == null || dirname.length < 1 || !fs.existsSync(dirname)) {
        dialog.showMessageBoxSync({message: '文章所在目录不存在'})
        return
    }
    if (site == null || site.length < 1) {
        dialog.showMessageBoxSync({message: '博客站点为空'})
        return
    }
    // 2.上传图片
    let list = []
    util.readImgLink(content, (src) => {
        list.push(src)
    })
    let value = content
    let next = true
    for (let src of list) {
        // 可能是网络地址、本地绝对、相对地址、是否图片
        if (util.isLocalPicture(src) && next) {
            //图片的真实路径
            const all_src = util.relativePath(dirname, src)
            // 非本地图片不上传
            if (!fs.existsSync(all_src)) {
                continue
            }
            switch (site) {
                case string.cnblogs:
                    await cnblogs.uploadPictureToCnBlogs(all_src)
                        .then(v => {
                            value = value.replace(src, v.toString())
                        })
                        .catch(value => {
                            dialog.showMessageBox({message: value.toString()}).then()
                            next = false
                        })
                    break
                case string.csdn:
                    await csdn.uploadPictureToCSDN(all_src)
                        .then(v => {
                            value = value.replace(src, v.toString())
                        })
                        .catch(value => {
                            dialog.showMessageBox({message: value.toString()}).then()
                            next = false
                        })
                    break
                case string.juejin:
                    await juejin.uploadPictureToJueJin(all_src)
                        .then(v => {
                            value = value.replace(src, v.toString())
                        })
                        .catch(value => {
                            dialog.showMessageBox({message: value.toString()}).then()
                            next = false
                        })
                    break
                case string.oschina:
                    await oschina.uploadPictureToOsChina(all_src)
                        .then(v => {
                            value = value.replace(src, v.toString())
                        })
                        .catch(value => {
                            dialog.showMessageBox({message: value.toString()}).then()
                            next = false
                        })
                    break
                case string.segmentfault:
                    await segmentfault.uploadPictureToSegmentFault(all_src)
                        .then(v => {
                            value = value.replace(src, v.toString())
                        })
                        .catch(value => {
                            dialog.showMessageBox({message: value.toString()}).then()
                            next = false
                        })
                    break
                case string.zhihu:
                    await appUpload.uploadPicture(all_src)
                        .then(async v => {
                            await zhihu.uploadPictureToZhiHu(v.toString()).then(value1 => {
                                value = value.replace(src, value1.toString())
                            }).catch(reason => {
                                dialog.showMessageBox({message: reason.toString()}).then()
                                next = false
                            })
                        }).catch(value => {
                            dialog.showMessageBox({message: value.toString()+"\n因知乎的特殊性，请尝试切换其它图床"}).then()
                            next = false
                        })
                    break
                case string.jianshu:
                    await jianshu.uploadPictureToJianShu(all_src)
                        .then(v => {
                            value = value.replace(src, v.toString())
                        })
                        .catch(value => {
                            dialog.showMessageBox({message: value.toString()}).then()
                            next = false
                        })
                    break
            }
        }
    }
    if (!next) {
        return
    }
    // 3.发布文章
    switch (site) {
        case string.cnblogs:
            await cnblogs.publishArticleToCnBlogs(title, value, isPublish)
                .then(openPublishUrl)
                .catch(openCatchInfo)
            break
        case string.csdn:
            await csdn.publishArticleToCSDN(title, value, marked(value),isPublish)
                .then(openPublishUrl)
                .catch(openCatchInfo)
            break
        case string.juejin:
            await juejin.publishArticleToJueJin(title, value, marked(value), isPublish)
                .then(openPublishUrl)
                .catch(openCatchInfo)
            break
        case string.oschina:
            await oschina.publishArticleToOsChina(title, value, isPublish)
                .then(openPublishUrl)
                .catch(openCatchInfo)
            break
        case string.segmentfault:
            await segmentfault.publishArticleToSegmentFault(title, value, isPublish)
                .then(openPublishUrl)
                .catch(openCatchInfo)
            break
        case string.zhihu:
            await zhihu.publishArticleToZhiHu(title, value, isPublish)
                .then(openPublishUrl)
                .catch(openCatchInfo)
            break
        case string.jianshu:
            await jianshu.publishArticleToJianshu(title, value, isPublish)
                .then(openPublishUrl)
                .catch(openCatchInfo)
            break
    }
}
exports.publishArticleTo = publishArticleTo

const openPublishUrl = url => {
    const number = dialog.showMessageBoxSync({message: '发布成功！是否在浏览器打开？', buttons: ['取消', '打开']})
    if (number === 1) {
        shell.openExternal(url).then()
    }
}
const openCatchInfo = reason => {
    dialog.showMessageBoxSync({message: reason.toString()})
}