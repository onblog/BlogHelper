const https = require('https');
const DataStore = require('../app-store');
const dataStore = new DataStore();
const FormData = require('form-data');
const fs = require('fs');
const Path = require('path');
const zlib = require('zlib');

/**
 * 上传图片到简书
 */
exports.uploadPictureToJianShu = function uploadPictureToJianShu(filePath) {
    return new Promise((resolve, reject) => {
        // 请求Token
        https.get(
            `https://www.jianshu.com/upload_images/token.json?filename=${Path.basename(filePath)}`,
            {
                headers: {
                    cookie: dataStore.getJianShuCookies(),
                    'User-Agent': 'Mozilla/5.0'
                }
            },
            (response) => {
                response.setEncoding('utf8');
                let body = '';
                response.on('data', (chunk) => {
                    body += chunk;
                });
                response.on('end', () => {
                    if (response.statusCode === 200) {
                        const parms = JSON.parse(body);
                        uploadPic(resolve, reject, parms, filePath)
                    } else {
                        reject("上传图片失败: " + response.statusCode)
                    }
                });

            }).on('error', (e) => {
            console.error(`请求出现问题: ${e.message}`);
            reject(e.message)
        });
    })
};

function uploadPic(resolve, reject, parms, filePath) {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    formData.append("token", parms.token);
    formData.append("key", parms.key);
    formData.append("x:protocol", "https");

    const headers = formData.getHeaders(); //这个不能少
    headers.Cookie = dataStore.getCnBlogCookies(); //获取Cookie
    //自己的headers属性在这里追加
    let request = https.request({
                                    host: 'upload.qiniup.com',
                                    method: 'POST',
                                    path: '/',
                                    headers: headers
                                }, function (res) {
        let body = '';
        res.on('data', function (buffer) {
                   body += buffer;
               }
        );
        res.on('end', () => {
            if (res.statusCode === 200) {
                const result = JSON.parse(body);
                if (result.url) {
                    resolve(result.url)
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
        reject('网络连接异常' + e.message)
    });
}

/**
 * 上传文章到简书
 */
exports.publishArticleToJianshu = function publishArticleToJianShu(title, content, isPublish) {
    return new Promise((resolve, reject) => {
        // 获取作品集
        https.get('https://www.jianshu.com/author/notebooks',
                  {
                      headers: {
                          cookie: dataStore.getJianShuCookies(),
                          'User-Agent': 'Mozilla/5.0',
                          Accept: 'application/json',
                          Referer: 'https://www.jianshu.com/writer'
                      }
                  },
                  (response) => {
                      // 解决返回数据使用gzip进行压缩
                      if (response.headers['content-encoding'] === 'gzip') {
                          const gzip = zlib.createGunzip();
                          response.pipe(gzip);
                          response = gzip;
                      }
                      response.setEncoding('utf8');
                      let body = '';
                      response.on('data', (chunk) => {
                          body += chunk;
                      });
                      response.on('end', () => {
                          if (response.statusCode === 200) {
                              const parms = JSON.parse(body);
                              createNote(resolve, reject, parms, title, content, isPublish)
                          } else {
                              reject('发布失败-1:' + response.statusCode)
                          }
                      });

                  }).on('error', (e) => {
            console.error(`请求出现问题: ${e.message}`);
            reject(e.message)
        });
    })
};

function createNote(resolve, reject, parms, title, content, isPublish) {
    const notebookId = parms[0].id;
    const myDate = new Date();
    const json = JSON.stringify({
                                    title: `${myDate.getFullYear()}-${myDate.getMonth()
                                                                      + 1}-${myDate.getDate()}`,
                                    notebook_id: notebookId,
                                    at_bottom: true
                                });
    let request = https.request({
                                    host: 'www.jianshu.com',
                                    method: 'POST',
                                    path: '/author/notes',
                                    headers: {
                                        "Accept": "application/json",
                                        "content-type": "application/json; charset=UTF-8",
                                        "Referer": "https://www.jianshu.com/writer",
                                        "Cookie": dataStore.getJianShuCookies(),
                                        "user-agent": "Mozilla/5.0"
                                    }
                                }, function (res) {
        if (res.headers['content-encoding'] === 'gzip') {
            console.log('解决返回数据使用gzip进行压缩');
            let gzip = zlib.createGunzip();
            res.pipe(gzip);
            res = gzip;
        }
        let str = '';
        res.on('data', function (buffer) {
                   str += buffer;
               }
        );
        res.on('end', () => {
            if (res.statusCode === 200) {
                const result = JSON.parse(str);
                if (result.id) {
                    updateNote(resolve, reject, notebookId, result.id, title, content, isPublish)
                } else {
                    reject('发布失败,' + result)
                }
            } else {
                reject('发布失败-2:' + res.statusCode)
            }
        });
    });

    request.write(json);
    request.end();

    request.on('error', function (e) {
        reject('网络连接异常' + e.message)
    });
}

function updateNote(resolve, reject, notebookId, id, title, content, isPublish) {
    const json = JSON.stringify({
                                    id: id,
                                    title: title,
                                    content: content,
                                    autosave_control: 1
                                });
    let request = https.request({
                                    host: 'www.jianshu.com',
                                    method: 'PUT',
                                    path: '/author/notes/' + id,
                                    headers: {
                                        "Accept": "application/json",
                                        "content-type": "application/json; charset=UTF-8",
                                        "Referer": "https://www.jianshu.com/writer",
                                        "Cookie": dataStore.getJianShuCookies(),
                                        "user-agent": "Mozilla/5.0"
                                    }
                                }, function (res) {
        if (res.headers['content-encoding'] === 'gzip') {
            console.log('解决返回数据使用gzip进行压缩');
            const gzip = zlib.createGunzip();
            res.pipe(gzip);
            res = gzip;
        }
        let str = '';
        res.on('data', function (buffer) {
                   str += buffer;
               }
        );
        res.on('end', () => {
            if (res.statusCode === 200) {
                const result = JSON.parse(str);
                if (result.id) {
                    if (isPublish) {
                        publicNote(id, notebookId, resolve, reject)
                    } else {
                        const url = `https://www.jianshu.com/writer#/notebooks/${notebookId}/notes/${id}`;
                        resolve(url)
                    }
                } else {
                    reject('发布失败,' + result)
                }
            } else {
                reject('发布失败-3:' + res.statusCode)
            }
        });
    });

    request.write(json);
    request.end();

    request.on('error', function (e) {
        reject('网络连接异常' + e.message)
    });
}

function publicNote(id, notebookId, resolve, reject) {
    let request = https.request({
                                    host: 'www.jianshu.com',
                                    method: 'POST',
                                    path: '/author/notes/' + id + '/publicize',
                                    headers: {
                                        "Accept": "application/json",
                                        "content-type": "application/json; charset=UTF-8",
                                        "Referer": "https://www.jianshu.com/writer",
                                        "Cookie": dataStore.getJianShuCookies(),
                                        "user-agent": "Mozilla/5.0"
                                    }
                                }, function (res) {
        if (res.headers['content-encoding'] === 'gzip') {
            console.log('解决返回数据使用gzip进行压缩');
            const gzip = zlib.createGunzip();
            res.pipe(gzip);
            res = gzip;
        }
        let str = '';
        res.on('data', function (buffer) {
                   str += buffer;
               }
        );
        res.on('end', () => {
            if (res.statusCode === 200) {
                const url = `https://www.jianshu.com/writer#/notebooks/${notebookId}/notes/${id}`;
                resolve(url)
            } else {
                reject('发布失败:' + str)
            }
        });
    });

    request.end();

    request.on('error', function (e) {
        reject('网络连接异常' + e.message)
    });
}