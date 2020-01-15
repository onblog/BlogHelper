const weiBo = require('./picture/wei-bo')
const smMs = require('./picture/sm-ms')
const DataStore = require('./app-store')
const dataStore = new DataStore()

exports.uploadPicture = async function (fullpath) {
    if (dataStore.isWeiBoFigureBedSwitch()){
        return await weiBo.uploadPictureToWeiBo(fullpath)
    }else if (dataStore.isSmMSFigureBedSwitch()){
        return await smMs.uploadPictureToSmMs(fullpath)
    }else {  // 默认图床
        return await smMs.uploadPictureToSmMs(fullpath)
    }
}

