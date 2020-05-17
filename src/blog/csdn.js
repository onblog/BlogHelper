const https = require('https');
const DataStore = require('../app-store')
const dataStore = new DataStore()
const FormData = require('form-data')
const fs = require('fs')

//上传图片到CSDN
function uploadPictureToCSDN(filePath) {
    return new Promise((resolve, reject) => {
        let formData = new FormData();
        formData.append('file', fs.createReadStream(filePath))

        let headers = formData.getHeaders()
        headers.Cookie = dataStore.getCSDNCookies() //获取Cookie
        headers["user-agent"] = "Mozilla/5.0"
        //自己的headers属性在这里追加
        let request = https.request({
                                        host: 'blog-console-api.csdn.net',
                                        method: 'POST',
                                        path: '/v1/upload/img?shuiyin=2',
                                        headers: headers
                                    }, function (res) {
            let str = '';
            res.on('data', function (buffer) {
                       str += buffer;
                   }
            );
            res.on('end', () => {
                if (res.statusCode === 200) {
                    const result = JSON.parse(str);
                    if (result.code === 200) {
                        const url = result.data.url
                        resolve(url)
                    } else {
                        reject('上传图片失败,' +result.msg)
                    }
                }else {
                    console.log(filePath)
                    try {
                        const result = JSON.parse(str);
                        reject(decodeURI(result.msg))
                    } catch (e) {
                    }
                    reject('上传图片失败:' + res.statusCode)
                }
            });
        });
        formData.pipe(request)

        request.on('error', function (e) {
            console.log('problem with request: ' + e.message);
            reject('网络连接异常')
        });
    })
}

//上传文章到CSDN
function publishArticleToCSDN(title, markdowncontent, content) {
    return new Promise((resolve, reject) => {
        const json = JSON.stringify({
                           title: title,
                           markdowncontent: markdowncontent,
                           content: content,
                           readType: "public",
                           status: 2,
                           not_auto_saved: "1",
                           source: "pc_mdeditor"
                       })
        let request = https.request({
                                        host: 'blog-console-api.csdn.net',
                                        method: 'POST',
                                        path: '/v1/mdeditor/saveArticle',
                                        headers: {
                                            "content-type":"application/json",
                                            "cookie":dataStore.getCSDNCookies(),
                                            "user-agent":"Mozilla/5.0"
                                        }
                                    }, function (res) {
            let str = '';
            res.on('data', function (buffer) {
                       str += buffer;
                   }
            );
            res.on('end', () => {
                if (res.statusCode === 200) {
                    // console.log(str)
                    const result = JSON.parse(str);
                    // console.log(result)
                    if (result.code === 200) {
                        // const url = result.data.url
                        const url = 'https://editor.csdn.net/md/?articleId='+result.data.id
                        resolve(url)
                    } else {
                        reject('发布失败,' +result.msg)
                    }
                }else {
                    reject('发布失败:' + res.statusCode)
                }
            });
        });

        request.write(json)
        request.end();

        request.on('error', function (e) {
            console.log('problem with request: ' + e.message);
            reject('网络连接异常')
        });
    })
}

exports.uploadPictureToCSDN = uploadPictureToCSDN
exports.publishArticleToCSDN = publishArticleToCSDN