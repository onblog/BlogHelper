const weiBo = require('./picture/wei-bo');
const DataStore = require('./app-store');
const dataStore = new DataStore();
const picgo = require('./picture/picgo/picgo');

exports.uploadPicture = async function (fullpath) {
    const Bed = dataStore.getFigureBedSwitch();
    switch (Bed) {
        case dataStore.PIC_WEIBO:
            return await weiBo.uploadPictureToWeiBo(fullpath);
        case dataStore.PIC_SMMS:
            return await picgo.uploadPicture(fullpath, Bed);
        case dataStore.PIC_GITHUB:
            return await picgo.uploadPicture(fullpath, Bed);
        case dataStore.PIC_ALIYUN:
            return await picgo.uploadPicture(fullpath, Bed);
        case dataStore.PIC_QINIU:
            return await picgo.uploadPicture(fullpath, Bed);
        case dataStore.PIC_UPYUN:
            return await picgo.uploadPicture(fullpath, Bed);
        case dataStore.PIC_TCYUN:
            return await picgo.uploadPicture(fullpath, Bed);
        case dataStore.PIC_IMGUR:
            return await picgo.uploadPicture(fullpath, Bed);
        default:
            return await uploadPicture();
    }
};

function uploadPicture() {
    return new Promise((resolve, reject) => {
        reject("未启用任何图床！")
    })
}
