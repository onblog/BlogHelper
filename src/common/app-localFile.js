const {dialog} = require('electron');
const util = require('./app-util');
const fs = require('fs');
const path = require('path');


// 读取选中的多个文件信息
exports.openManyLocalFile = (callback) => {
    dialog.showOpenDialog({
                              properties: ['openFile', 'createDirectory', 'multiSelections'],
                              filters: [
                                  {name: 'markdown', extensions: ['md']}
                              ]
                          })
        .then(files => {
            if (!files.canceled) {
                for (let i = 0; i < files.filePaths.length; i++) {
                    const filePath = files.filePaths[i];
                    const title = util.getTitle(filePath);
                    const dirname = path.dirname(filePath);
                    fs.readFile(filePath, function (err, data) {
                        if (err) {
                            return console.error(err);
                        }
                        const content = data.toString();
                        callback(title, content, dirname)
                    });
                }
            }
        })
        .catch(err => {
            console.log(err)
        })
};

// 读取选中的多个文件信息(同步)
exports.openManyLocalFileSync = (filters) => {
    let files = dialog.showOpenDialogSync({
                                              properties: ['openFile', 'createDirectory',
                                                           'multiSelections'],
                                              filters: filters ? filters :[
                                                  {name: 'markdown', extensions: ['md']}
                                              ]
                                          });
    let result = {};
    result.canceled = (files === undefined);
    if (files) {
        result.files = [];
        for (let i = 0; i < files.length; i++) {
            // 已选中文件
            const filepath = files[i];
            const title = util.getTitle(filepath);
            const dirname = path.dirname(filepath);
            const content = fs.readFileSync(filepath);
            const extname = path.extname(filepath);
            // 返回
            result.files[i] = {
                filepath: filepath,
                title: title,
                content: content.toString(),
                dirname: dirname,
                extname: extname
            }
        }
    }
    return result
};