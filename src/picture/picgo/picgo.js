const {app} = require('electron');
const PicGo = require('picgo');
const fs = require('fs');
const Path = require('path');
const OS = require('os');
const configPath = Path.join(OS.homedir(), app.name, 'picgo.json');

function initConfigFile() {
    if (!fs.existsSync(configPath)){
        if (!fs.existsSync(Path.dirname(configPath))) {
            fs.mkdirSync(Path.dirname(configPath))
        }
        fs.writeFileSync(configPath, fs.readFileSync(Path.join(__dirname, Path.basename(configPath))))
    }
}

function uploadPicture(filePath, name) {
    return new Promise((resolve, reject) => {
        initConfigFile();
        const picgo = new PicGo(configPath);
        // 切换
        picgo.setConfig({
            'picBed.uploader': name
        });
        // 上传
        picgo.upload([filePath]);
        // 监听结果
        picgo.on('finished', ctx => {
            if (ctx.output[0].imgUrl) {
                resolve(ctx.output[0].imgUrl)
                // [{fileName, width, height, extname, imgUrl}]
            }
            deleteLog()
        });
        // 监听错误
        picgo.on('failed', error => {
            reject(error);
            deleteLog()
        })
    })
}

function deleteLog(){
    setTimeout(function () {
        const packageFile = Path.join(Path.dirname(configPath), 'package.json');
        if (fs.existsSync(packageFile)) {
            fs.unlinkSync(packageFile)
        }
    }, 1000)
}

exports.configPath = configPath;
exports.initConfigFile = initConfigFile;
exports.uploadPicture = uploadPicture;