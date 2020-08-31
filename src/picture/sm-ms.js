const https = require('https');
const fs = require('fs');
const FormData = require('form-data');

/**
 * 上传图片到SM.MS
 * @param filePath
 */
function uploadPictureToSmMs(filePath) {
    return new Promise((resolve, reject) => {
        let formData = new FormData();
        formData.append('smfile', fs.createReadStream(filePath));
        formData.append('file_id',0);

        let headers = formData.getHeaders();
        // headers.Cookie =
        headers['user-agent'] = 'Mozilla/5.0';
        let request = https.request({
                                        host: 'sm.ms',
                                        method: 'POST',
                                        path: '/api/v2/upload?inajax=1',
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
                        resolve(result.data.url)
                    } else {
                        reject('上传图片失败,' +result.message)
                    }
                }else {
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
exports.uploadPictureToSmMs = uploadPictureToSmMs;