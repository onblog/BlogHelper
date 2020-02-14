const weiBo = require('./picture/wei-bo')
const smMs = require('./picture/sm-ms')
const imgkr = require('./picture/imgkr')
const DataStore = require('./app-store')
const dataStore = new DataStore()

exports.uploadPicture = async function (fullpath) {
    if (dataStore.isWeiBoFigureBedSwitch()){
        return await weiBo.uploadPictureToWeiBo(fullpath)
    }else if (dataStore.isSmMSFigureBedSwitch()){
        return await smMs.uploadPictureToSmMs(fullpath)
    }else if (dataStore.isIMGKRFigureBedSwitch()){
        return await imgkr.uploadPictureToImgKr(fullpath)
    }else {
        // 默认图床
        return await imgkr.uploadPictureToImgKr(fullpath)
    }
}

