const PicGo = require('picgo')
const fs = require('fs')
const Path = require('path')
const os = require('os')
const configPath = `${os.homedir()}/BlogHelper/BlogHelper.json`

function uploadPicture(filePath, name) {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(Path.dirname(configPath))) {
            fs.mkdirSync(Path.dirname(configPath))
        }
        if (!fs.existsSync(configPath)) {
            fs.writeFileSync(configPath, fs.readFileSync(`${__dirname}/config.json`))
        }
        const picgo = new PicGo(configPath)
        // 切换
        picgo.setConfig({
            'picBed.uploader': name
        })
        // 上传
        picgo.upload([filePath])
        // 监听结果
        picgo.on('finished', ctx => {
            if (ctx.output[0].imgUrl) {
                resolve(ctx.output[0].imgUrl)
                // [{fileName, width, height, extname, imgUrl}]
                // console.log(ctx.output)
            }
            deleteLog()
        })
        // 监听错误
        picgo.on('failed', error => {
            // console.log(error) //错误信息
            reject(error)
            deleteLog()
        })
    })
}

function deleteLog(){
    setTimeout(function () {
        const packageFile = Path.join(Path.dirname(configPath), 'package.json')
        if (fs.existsSync(packageFile)) {
            fs.unlinkSync(packageFile)
        }
        const picgoLog = Path.join(Path.dirname(configPath), 'picgo.log')
        if (fs.existsSync(picgoLog)) {
            fs.unlinkSync(picgoLog)
        }
    }, 1000)
}

exports.configPath = configPath
exports.uploadPicture = uploadPicture