const urlEncode = require('urlencode');
const https = require('https');
const DataStore = require('../app-store');
const dataStore = new DataStore();
const fs = require('fs');

/**
 * 上传图片到新浪微博
 * @param filePath
 */
function uploadPictureToWeiBo(filePath) {
    return new Promise((resolve, reject) => {
        // 验证是否登录
        if (!dataStore.getWeiBoCookies()) {
            reject('请先绑定新浪微博');
            return
        }
        let image_url = 'https://picupload.weibo.com/interface/pic_upload.php?mime=image%2Fjpeg&data=base64&url=0&markpos=1&logo=&nick=0&marks=1&app=miniblog';
        fs.readFile(filePath, {encoding: 'base64'}, function (err, data) {
            if (err) {
                return console.error(err)
            }
            const image_data = 'b64_data=' + urlEncode(data);
            let options = {
                host: 'picupload.weibo.com',
                method: 'POST',
                headers: {
                    'Accept-Encoding': 'gzip, deflate, br',
                    "Accept-Language": "zh-CN,zh;q=0.8,en-US;q=0.5,en;q=0.3",
                    'Referer': 'https://weibo.com/',
                    'Accept': '*/*',
                    'Origin': 'https://weibo.com',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(image_data),
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:45.0) Gecko/20100101 Firefox/45.0',
                    'Cookie': dataStore.getWeiBoCookies()
                }
            };

            let req = https.request(image_url, options, function (res) {
                // console.log('STATUS: ' + res.statusCode);
                res.setEncoding('utf8');
                const prefix = 'http://ww3.sinaimg.cn/large/';
                res.on('data', function (chunk) {
                    // console.log('BODY: ' + chunk);
                    let start = chunk.toString().indexOf('script>') + 'script>'.length;
                    const text = chunk.toString().substring(start).trim();
                    // console.log(text)
                    const parse = JSON.parse(text);
                    const pid = parse.data.pics.pic_1.pid;
                    const src = prefix + pid + '.jpg';
                    // console.log(src)
                    if (pid === undefined || pid === null) {
                        reject('请先登录新浪微博')
                    } else {
                        resolve(src)
                    }
                });
            });

            req.on('error', function (e) {
                console.log('problem with request: ' + e.message);
                reject('网络连接异常')
            });

            req.write(image_data);
            req.end()
        })
    })
}
exports.uploadPictureToWeiBo = uploadPictureToWeiBo;