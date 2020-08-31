const https = require('https');
const DataStore = require('../app-store');
const dataStore = new DataStore();
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const os = require('os');

//上传图片到知乎
exports.uploadPictureToZhiHu = function uploadPictureToZhiHu(filePath) {
    return new Promise((resolve, reject) => {
        let formData = new FormData();
        formData.append('url', filePath);
        formData.append('source', 'article');

        let headers = formData.getHeaders();
        headers.Cookie = dataStore.getZhiHuCookies(); //获取Cookie
        headers["user-agent"] = "Mozilla/5.0";
        headers['x-requested-with'] = 'Fetch';
        //自己的headers属性在这里追加
        let request = https.request({
                                        host: 'zhuanlan.zhihu.com',
                                        method: 'POST',
                                        path: '/api/uploaded_images',
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
                    // console.log(result)
                    if (result.src) {
                        const url = result.src;
                        resolve(url)
                    } else {
                        reject('上传图片失败,' + result)
                    }
                } else {
                    reject('上传图片失败:' + res.statusCode)
                }
            });
        });
        formData.pipe(request);

        request.on('error', function (e) {
            console.log('problem with request: ' + e.message);
            reject('网络连接异常')
        });
    })
};

//上传文章到知乎
exports.publishArticleToZhiHu = function publishArticleToZhiHu(title, content, isPublish) {
    return new Promise((resolve, reject) => {
        // 创建临时文件
        const filePath = path.join(os.tmpdir(), title + '.md');
        fs.writeFileSync(filePath, content);

        let formData = new FormData();
        formData.append('document', fs.createReadStream(filePath));

        let headers = formData.getHeaders();
        headers.Cookie = dataStore.getZhiHuCookies(); //获取Cookie
        headers["user-agent"] = "Mozilla/5.0";
        headers['referer'] = 'https://zhuanlan.zhihu.com/write';
        headers['origin'] = 'https://zhuanlan.zhihu.com';
        headers['x-requested-with'] = 'Fetch';
        //自己的headers属性在这里追加
        let request = https.request({
                                        host: 'www.zhihu.com',
                                        method: 'POST',
                                        path: '/api/v4/document_convert',
                                        referer: 'https://zhuanlan.zhihu.com/write',
                                        origin: 'https://zhuanlan.zhihu.com',
                                        headers: headers
                                    }, function (res) {
            let str = '';
            res.on('data', function (buffer) {
                       str += buffer;
                   }
            );
            res.on('end', () => {
                // 删除临时文件
                fs.unlink(filePath, err => {
                    if (err) {
                        return console.error(err)
                    }
                });
                if (res.statusCode === 200) {
                    const result = JSON.parse(str);
                    const html = result.html;
                    publishArticle(title, html, resolve, reject, isPublish)
                } else {
                    reject('发布失败:' + str)
                }
            });
        });
        formData.pipe(request);

        request.on('error', function (e) {
            console.log('problem with request: ' + e.message);
            reject('网络连接异常')
        });
    })
};

/**
 * 转换完成发布
 * @param filename
 * @param html
 * @param resolve
 * @param reject
 */
function publishArticle(filename, html, resolve, reject, isPublish) {
    const json = JSON.stringify({
                                    content: html,
                                    delta_time: 0,
                                    title: filename,
                                });
    let request = https.request({
                                    host: 'zhuanlan.zhihu.com',
                                    method: 'POST',
                                    path: '/api/articles/drafts',
                                    headers: {
                                        "content-type": "application/json",
                                        "cookie": dataStore.getZhiHuCookies(),
                                        "user-agent": "Mozilla/5.0"
                                    }
                                }, function (res) {
        let str = '';
        res.on('data', function (buffer) {
                   str += buffer;
               }
        );
        res.on('end', () => {
            if (res.statusCode === 200) {
                const result = JSON.parse(str);
                if (result.url) {
                    if (isPublish) {
                        topicArticle(result.id, resolve, reject)
                    } else {
                        resolve(result.url + '/edit')
                    }
                } else {
                    reject('发布失败,' + JSON.stringify(result))
                }
            } else {
                reject('发布失败:' + res.statusCode)
            }
        });
    });

    request.write(json);
    request.end();

    request.on('error', function (e) {
        reject('网络连接异常')
    });
}

function topicArticle(id, resolve, reject) {
    const json = JSON.stringify({
                                    "introduction": "",
                                    "avatarUrl": "https://pic2.zhimg.com/80/acda162ad89c9b8995b51028d5233d1a_l.jpg",
                                    "name": "程序员",
                                    "url": "https://www.zhihu.com/topic/19552330",
                                    "type": "topic",
                                    "excerpt": "",
                                    "id": "19552330"
                                });
    let request = https.request({
                                    host: 'zhuanlan.zhihu.com',
                                    method: 'POST',
                                    path: `/api/articles/${id}/topics`,
                                    headers: {
                                        "content-type": "application/json",
                                        "cookie": dataStore.getZhiHuCookies(),
                                        "user-agent": "Mozilla/5.0"
                                    }
                                }, function (res) {
        let str = '';
        res.on('data', function (buffer) {
                   str += buffer;
               }
        );
        res.on('end', () => {
            if (res.statusCode === 200) {
                publicArticle(id, resolve, reject)
            } else {
                reject('发布失败:Topic:' + res.statusCode+'\n'+str)
            }
        });
    });

    request.write(json);
    request.end();

    request.on('error', function (e) {
        reject('网络连接异常')
    });
}

function publicArticle(id, resolve, reject) {
    const json = JSON.stringify({
                                    "column": null,
                                    "commentPermission": "anyone",
                                    "disclaimer_status": "close",
                                    "disclaimer_type": "none"
                                });
    let request = https.request({
                                    host: 'zhuanlan.zhihu.com',
                                    method: 'PUT',
                                    path: `/api/articles/${id}/publish`,
                                    headers: {
                                        "content-type": "application/json",
                                        "cookie": dataStore.getZhiHuCookies(),
                                        "user-agent": "Mozilla/5.0"
                                    }
                                }, function (res) {
        let str = '';
        res.on('data', function (buffer) {
                   str += buffer;
               }
        );
        res.on('end', () => {
            const result = JSON.parse(str);
            if (res.statusCode === 200) {
                if (result.url) {
                    resolve(result.url)
                } else {
                    reject('发布失败,' + str)
                }
            } else {
                reject('发布失败:Public:' + res.statusCode + "\n" + decodeURI(result.error.message))
            }
        });
    });

    request.write(json);
    request.end();

    request.on('error', function (e) {
        reject('网络连接异常')
    });
}