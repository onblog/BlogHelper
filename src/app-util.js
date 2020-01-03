const path = require('path')

//读取每一个已插入的图片链接
exports.readImgLink = (text, callback)=> {
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

//是否是网络图片
exports.isWebPicture = (src)=> {
    return src.startsWith('http') && (src.endsWith('png') || src.endsWith('jpg')
                                      || src.endsWith('png') || src.endsWith('jpeg')
                                      || src.endsWith('gif') || src.endsWith('bmp'))
}

//是否是本地图片
exports.isLocalPicture = (src)=> {
    return !src.startsWith('http') && (src.endsWith('png') || src.endsWith('jpg')
                                       || src.endsWith('png') || src.endsWith('jpeg')
                                       || src.endsWith('gif') || src.endsWith('bmp'))
}

//返回图片的真实路径
exports.relativePath = (dirname, str) => {
    //补齐相对路径
    if (str.indexOf('.') === 0) {
        str = path.join(dirname,str)
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