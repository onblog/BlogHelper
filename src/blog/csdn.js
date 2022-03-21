const https = require('https');
const fetch = require('node-fetch');
const DataStore = require('../app-store');
const dataStore = new DataStore();
const FormData = require('form-data');
const fs = require('fs');

const extMap = {
  'jpg': 'jpeg',
  'jpeg': 'jpeg',
  'png': 'png',
  'gif': 'gif',
}

//上传图片到CSDN
function uploadPictureToCSDN(filePath) {
    return new Promise((resolve, reject) => {
        const ext = extMap[filePath.split('.').pop().toLowerCase()] || 'png';

        fetch("https://imgservice.csdn.net/direct/v1.0/image/upload?watermark=&type=blog&rtype=markdown", {
          "headers": {
            "content-type": "application/json",
            "x-image-app": "direct_blog",
            "x-image-dir": "direct",
            "x-image-suffix": ext,
            "cookie": dataStore.getCSDNCookies(),
            "Referer": "https://editor.csdn.net/",
          }
        }).then(result => result.json())
          .then(result => {
            console.log('get access info:', result);
            if (result.code === 200) {
              const accessId = result.data.accessId;
              const callbackUrl = result.data.callbackUrl;
              const remoteFilePath = result.data.filePath;
              const url = result.data.host;
              const policy = result.data.policy;
              const signature = result.data.signature;

              let formData = new FormData();
              formData.append('key', remoteFilePath);
              formData.append('OSSAccessKeyId', accessId);
              formData.append('policy', policy);
              formData.append('signature', signature);
              formData.append('success_action_status', '200');
              formData.append('callback', callbackUrl);
              formData.append('file', fs.createReadStream(filePath));

              let headers = formData.getHeaders();
              headers.Cookie = dataStore.getCSDNCookies();
              headers["user-agent"] = "Mozilla/5.0";
              headers.Referer = "https://editor.csdn.net/";
              headers.ContentType = 'multipart/form-data';
              headers.Accept = 'application/json';

              // post formData to host
              fetch(url, {
                method: 'POST',
                body: formData,
                headers: headers
              }).then(result => result.json())
                .then(result => {
                  if (result.code === 200) {
                    resolve(result.data.imageUrl)
                  } else {
                    reject('上传图片失败,' + result.msg)
                  }
                })
                .catch(error => {
                  reject('上传图片失败,' + error)
                })
            } else {
              reject('上传图片失败,' + result.msg)
            }
          })
          .catch(error => {
            reject('上传图片失败,' + error)
          })
    })
}

//上传文章到CSDN
function publishArticleToCSDN(title, markdowncontent, content, isPublish) {
    return new Promise((resolve, reject) => {
        const parms = {
            title: title,
            markdowncontent: markdowncontent,
            content: content,
            readType: "public",
            not_auto_saved: "1",
            source: "pc_mdeditor",
            level: 1
        };
        if (isPublish) {
            parms['status'] = 0;
            parms['type'] = 'original';
            parms['Description'] = content.toString().substring(0,100);
            parms['authorized_status'] = false;
            parms['categories'] = '';
            parms['original_link'] = '';
            parms['resource_url'] = '';
            parms['tags'] = '经验分享'
        }else {
            parms['status'] = 2
        }
        const json = JSON.stringify(parms);
        let request = https.request({
                                        host: 'blog-console-api.csdn.net',
                                        method: 'POST',
                                        path: '/v1/mdeditor/saveArticle',
                                        headers: {
                                            "content-type": "application/json",
                                            "cookie": dataStore.getCSDNCookies(),
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
                    if (result.code === 200) {
                        const url = isPublish ? result.data.url
                                              : 'https://editor.csdn.net/md/?articleId='
                                                + result.data.id;
                        resolve(url)
                    } else {
                        reject('发布失败,' + result.msg)
                    }
                } else {
                    reject('发布失败: ' + res.statusCode + '\n'+decodeURI(result.msg))
                }
            });
        });

        request.write(json);
        request.end();

        request.on('error', function (e) {
            reject('网络连接异常'+e.message)
        });
    })
}

exports.uploadPictureToCSDN = uploadPictureToCSDN;
exports.publishArticleToCSDN = publishArticleToCSDN;
