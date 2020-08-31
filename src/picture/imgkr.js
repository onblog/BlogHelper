const https = require('https');
const fs = require('fs');
const FormData = require('form-data');

/**
 * 上传图片到图壳
 * @param filePath
 */
function uploadPictureToImgKr(filePath) {
    return new Promise((resolve, reject) => {
        let formData = new FormData();
        formData.append('file',fs.createReadStream(filePath));

        let headers = formData.getHeaders();
        // headers.Cookie =
        headers['user-agent'] = 'Mozilla/5.0';
        let request = https.request({
            host: 'imgkr.com',
            method: 'POST',
            path: '/api/files/upload',
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
                    //上传之后result就是返回的结果
                    // console.log(result)
                    if (result.success) {
                        resolve(result.data)
                    } else {
                        reject('上传图片失败,' + result.message)
                    }
                } else {
                    reject('上传图片失败,响应码' + res.statusCode)
                }
            });
        });
        formData.pipe(request);

        request.on('error', function (e) {
            console.log('problem with request: ' + e.message);
            reject('网络连接异常')
        });
    })
}

exports.uploadPictureToImgKr = uploadPictureToImgKr;