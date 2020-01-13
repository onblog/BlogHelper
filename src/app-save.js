const {shell, dialog, clipboard} = require('electron')
const fs = require('fs')
const path = require('path')

// 操作完成，保存在新文件还是剪贴板？
exports.saveNewFileOrClipboard = function(result, content, mark) {
    // 1.提示保存
    let number = dialog.showMessageBoxSync({message: '操作完成，保存在', buttons: ['新文件', '剪贴板']})
    if (number === 0) {
        // 2.写入新文档
        let filename = result.title + mark + result.extname
        let filepath = path.join(result.dirname, filename)
        fs.writeFileSync(filepath, content)
        let num = dialog.showMessageBoxSync(
            {message: '保存成功，是否打开新文档？', buttons: ['不了,谢谢', '打开']})
        if (num === 1) {
            shell.openItem(filepath)
        }
    } else if (number === 1) {
        // 3.写入剪贴板
        while (clipboard.readText() !== content) {
            clipboard.writeText(content)
        }
    }
}