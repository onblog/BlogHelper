const path = require('path')

// 读取每一个已插入的图片链接
exports.readImgLink = (text, callback) => {
    let objReadline = text.split('\n')
    for (let i = 0; i < objReadline.length; i++) {
        let line = objReadline[i] + ''
        const split = line.indexOf('!') !== -1 ? line.split('!') : []
        for (let i = 0; i < split.length; i++) {
            let block = split[i]
            if (block.length > 4 && block.indexOf('[') !== -1 && block.indexOf(']') !== -1
                && block.indexOf('(') !== -1 && block.indexOf(')') !== -1) {
                const start = block.lastIndexOf('(')
                const end = block.lastIndexOf(')')
                const src = block.substring(start + 1, end) //图片地址
                callback(src)
            }
        }
    }
}

// 是否是网络图片
exports.isWebPicture = (src) => {
    return src.startsWith('http') && (src.endsWith('png') || src.endsWith('jpg')
                                      || src.endsWith('png') || src.endsWith('jpeg')
                                      || src.endsWith('gif') || src.endsWith('bmp'))
}

// 是否是本地图片
exports.isLocalPicture = (src) => {
    return !src.startsWith('http') && (src.endsWith('png') || src.endsWith('jpg')
                                       || src.endsWith('png') || src.endsWith('jpeg')
                                       || src.endsWith('gif') || src.endsWith('bmp'))
}

// 返回图片的真实路径
exports.relativePath = (dirname, str) => {
    //补齐相对路径
    if (str.indexOf('.') === 0) {
        str = path.join(dirname, str)
    }
    //最终一定是格式化好的路径
    return path.normalize(str)
}

// 返回去掉扩展名的文件名
exports.getTitle = (filePath) => {
    let title = path.basename(filePath)
    if (title.lastIndexOf('.') > 0) {
        title = title.substring(0, title.lastIndexOf('.'))
    }
    return title
}

// 格式化代码
exports.formatCode = (code) => {
    if (code === null || code.length < 1) {
        return ''
    }
    let oldText = code
    let newText = ''
    let objReadline = oldText.split('\n')
    let num = 0
    for (let i = 0; i < objReadline.length; i++) {
        let line = objReadline[i]
        if (i === 0) {
            for (let j = 0; j < line.length; j++) {
                if (line.charAt(j) === ' ') {
                    num++
                } else {
                    break
                }
            }
        }
        newText += line.substring(num)
        if (i !== objReadline.length - 1) {
            newText += '\n'
        }
    }
    return newText
}

/**
 * 版本号比较
 * @return {number}
 */
exports.compareVersion = function (v1, v2){
    const vv1 = v1.split('.')
    const vv2 = v2.split('.')
    const length = vv1.length >= vv2.length ? vv1.length : vv2.length
    for (let i = 0; i < length; i++) {
        if (!vv1[i]) {
            vv1[i] = 0
        }
        if (!vv2[i]) {
            vv2[i] = 0
        }
        if (vv1[i] > vv2[i]) {
            return 1
        } else if (vv1[i] < vv2[i]) {
            return -1
        }
    }
    return 0
}