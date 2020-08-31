const Store = require('electron-store');

class DataStore extends Store {
    //新浪微博图床设置
    weiBoCookiesKey = 'wei-Bo-cookies-key';

    //博客园Cookie
    cnBlogCookieKey = 'cn-blog-cookie-key';
    //CSDN
    CSDNCookieKey = 'csdn-cookie-key';
    //掘金
    JueJinCookieKey = 'jueJin-cookie-key';
    //知乎
    ZhiHuCookiekey = 'zhihu-cookie-key';
    //开源中国
    OsChinaCookieKey = 'OsChina-cookie-key';
    OsChinaUserCodeKey = 'osChina-user-code-key';
    OsChinaUserIdKey = 'osChina-user-id-key';
    //思否
    SegmentFaultCookieKey = 'segmentFault-cookie-key';
    SegmentFaultTokenKey = 'segmentFault-token-key';
    //简书
    JianShuCookieKey = 'jianShu-cookie-key';

    // 图片上传快捷键
    uploadClipboardPicSwitch = 'uploadClipboardPicSwitch';
    // 富文本转纯文字
    coverToTextSwitch = 'coverToTextSwitch';

    constructor(settings) {
        const baseConfig = {name: 'blog-helper'};
        const finalConfig = {...baseConfig, ...settings};
        super(finalConfig)
    }

    /*
     * 博客网站Cookie
     */
    getJianShuCookies() {
        if (this.has(this.JianShuCookieKey)) {
            return this.get(this.JianShuCookieKey)
        }
        return null
    }

    setJianShuCookies(v) {
        return this.set(this.JianShuCookieKey, v)
    }

    getZhiHuCookies() {
        if (this.has(this.ZhiHuCookiekey)) {
            return this.get(this.ZhiHuCookiekey)
        }
        return null
    }

    setZhiHuCookies(v) {
        return this.set(this.ZhiHuCookiekey, v)
    }

    getCnBlogCookies() {
        if (this.has(this.cnBlogCookieKey)) {
            return this.get(this.cnBlogCookieKey)
        }
        return null
    }

    setCnBlogCookie(v) {
        return this.set(this.cnBlogCookieKey, v)
    }

    getCSDNCookies() {
        if (this.has(this.CSDNCookieKey)) {
            return this.get(this.CSDNCookieKey)
        }
        return null
    }

    setCSDNCookie(v) {
        return this.set(this.CSDNCookieKey, v)
    }

    getJueJinCookies() {
        if (this.has(this.JueJinCookieKey)) {
            return this.get(this.JueJinCookieKey)
        }
        return null
    }

    setJueJinCookie(v) {
        return this.set(this.JueJinCookieKey, v)
    }

    getOsChinaCookies() {
        if (this.has(this.OsChinaCookieKey)) {
            return this.get(this.OsChinaCookieKey)
        }
        return null
    }

    setOsChinaCookie(v) {
        return this.set(this.OsChinaCookieKey, v)
    }

    getOsChinaUserCode() {
        if (this.has(this.OsChinaUserCodeKey)) {
            return this.get(this.OsChinaUserCodeKey)
        }
        return null
    }

    setOsChinaUserCode(v) {
        return this.set(this.OsChinaUserCodeKey, v)
    }

    getWeiBoCookies() {
        if (this.has(this.weiBoCookiesKey)) {
            return this.get(this.weiBoCookiesKey)
        }
        return null
    }

    setWeiBoCookies(v) {
        return this.set(this.weiBoCookiesKey, v)
    }

    getSegmentFaultCookie() {
        if (this.has(this.SegmentFaultCookieKey)) {
            return this.get(this.SegmentFaultCookieKey)
        }
        return null
    }

    setSegmentFaultCookie(v) {
        return this.set(this.SegmentFaultCookieKey, v)
    }

    getSegmentFaultToken() {
        if (this.has(this.SegmentFaultTokenKey)) {
            return this.get(this.SegmentFaultTokenKey)
        }
        return null
    }

    setSegmentFaultToken(v) {
        return this.set(this.SegmentFaultTokenKey, v)
    }

    getOsChinaUserId() {
        if (this.has(this.OsChinaUserIdKey)) {
            return this.get(this.OsChinaUserIdKey)
        }
        return null
    }

    setOsChinaUserId(v) {
        return this.set(this.OsChinaUserIdKey, v)
    }

    // 启用图床Key
    figureBedSwitch = 'figureBedSwitch';
    // Value
    PIC_WEIBO = 'WEIBO';
    PIC_SMMS = 'smms';
    PIC_GITHUB = 'github';
    PIC_QINIU = 'qiniu';
    PIC_UPYUN = 'upyun';
    PIC_TCYUN = 'tcyun';
    PIC_ALIYUN = 'aliyun';
    PIC_IMGUR = 'imgur';
    // 启用的图床一定要添加到下面的数组
    PIC = [this.PIC_SMMS, this.PIC_WEIBO, this.PIC_GITHUB, this.PIC_QINIU, this.PIC_UPYUN, this.PIC_TCYUN, this.PIC_ALIYUN, this.PIC_IMGUR];

    // 设置当前使用的图床
    setFigureBedSwitch(name) {
        this.set(this.figureBedSwitch, name)
    }

    // 判断是否启用该图床
    isFigureBedSwitch(name) {
        if (this.has(this.figureBedSwitch)) {
            return this.get(this.figureBedSwitch) === name
        }
        return false
    }

    // 读取当前使用的图床
    getFigureBedSwitch() {
        return this.get(this.figureBedSwitch)
    }

    /**
     * 是否启用快捷键
     */
    isUploadClipboardPicSwitch() {
        if (this.has(this.uploadClipboardPicSwitch)) {
            return this.get(this.uploadClipboardPicSwitch)
        }
        return false
    }

    setUploadClipboardPicSwitch(check) {
        this.set(this.uploadClipboardPicSwitch, check)
    }

    isCoverToTextSwitch() {
        if (this.has(this.coverToTextSwitch)) {
            return this.get(this.coverToTextSwitch)
        }
        return false
    }

    setCoverToTextSwitch(check) {
        this.set(this.coverToTextSwitch, check)
    }


}

module.exports = DataStore;