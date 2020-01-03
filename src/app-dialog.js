const {dialog} = require('electron')
const util = require('./app-util')
const fs = require('fs')
const path = require('path')

// 读取选中的文件信息
exports.openLocalFile = (callback) => {
    dialog.showOpenDialog({
                              properties: ['openFile', 'createDirectory'],
                              filters: [
                                  {name: 'markdown', extensions: ['md']}
                              ]
                          })
        .then(files => {
            if (!files.canceled) {
                // 已选中文件
                const filePath = files.filePaths[0]
                const title = util.getTitle(filePath)
                const dirname = path.dirname(filePath)
                fs.readFile(filePath, function (err, data) {
                    if (err) {
                        return console.error(err);
                    }
                    const content = data.toString()
                    callback(title, content, dirname)
                });
            }
        })
        .catch(err => {
            console.log(err)
        })
}

// 读取选中的文件信息(同步)
exports.openLocalFileSync = () => {
    let files = dialog.showOpenDialogSync({
                                  properties: ['openFile', 'createDirectory'],
                                  filters: [
                                      {name: 'markdown', extensions: ['md']}
                                  ]
                              })
    let result = {}
    result.canceled = (files === undefined)
    if (files) {
        // 已选中文件
        const filePath = files[0]
        const title = util.getTitle(filePath)
        const dirname = path.dirname(filePath)
        const content = fs.readFileSync(filePath)
        result.title = title
        result.content = content.toString()
        result.dirname = dirname
    }
    return result
}