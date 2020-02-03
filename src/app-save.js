const {shell, dialog, clipboard} = require('electron')
const fs = require('fs')
const path = require('path')

let numOne = 0
let numTwo = 0

// 操作完成，保存在新文件还是剪贴板？
exports.saveNewFileOrClipboard = function saveNewFileOrClipboard(result, content, output, i) {
    if (!i) {
        i = 0
    }
    if (i === 0) {
        // 1.提示保存
        numOne = dialog.showMessageBoxSync({message: '操作完成，保存在', buttons: ['新文件', '剪贴板']})
    }
    if (numOne === 0) {
        // 2.写入新文档
        let filename = result.title + result.extname
        const dirname = path.join(result.dirname, output)
        if (!fs.existsSync(dirname)) {
            fs.mkdirSync(dirname, {recursive: true})
        }
        let filepath = path.join(dirname, filename)
        fs.writeFileSync(filepath, content)
        if (i === 0) {
            numTwo = dialog.showMessageBoxSync({message: '保存成功，是否打开新文档？', buttons: ['不了,谢谢', '打开']})
        }
        if (numTwo === 1) {
            shell.openItem(filepath)
        }
    } else if (numOne === 1) {
        // 3.写入剪贴板
        while (clipboard.readText() !== content) {
            clipboard.writeText(content)
        }
    }
}