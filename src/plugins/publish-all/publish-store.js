const string = require('../../app-string')
const DataStore = require('../../app-store')

class PublishDataStore extends DataStore {
    //所有已经登录平台的cookies
    allLoginBlogPlatformKey = 'all-login-blog-cookie-key'
    allLoginPlatform = []

    constructor(settings) {
        super(settings)
    }

    /**
     * 保存已经登录的博客平台
     */
    saveAllLoginPlatform(v) {
        this.allLoginPlatform.push(v)
        this.set(this.allLoginBlogPlatformKey, this.allLoginPlatform)
    }

    /**
     * 获取已经登录的博客平台
     */
    getAllLoginPlatform() {
        if (this.has(this.allLoginBlogPlatformKey)) {
            return this.get(this.allLoginBlogPlatformKey)
        }
        return null
    }

    setJianShuCookies(v) {
        this.saveAllLoginPlatform(string.jianshu)
        super.setJianShuCookies(v)
    }

    setZhiHuCookies(v) {
        this.saveAllLoginPlatform(string.zhihu)
        super.setZhiHuCookies(v)
    }

    setCnBlogCookie(v) {
        this.saveAllLoginPlatform(string.cnblogs)
        super.setCnBlogCookie(v)
    }

    setCSDNCookie(v) {
        this.saveAllLoginPlatform(string.csdn)
        super.setCSDNCookie(v)
    }

    setJueJinCookie(v) {
        this.saveAllLoginPlatform(string.juejin)
        super.setJueJinCookie(v)
    }


    setOsChinaCookie(v) {
        this.saveAllLoginPlatform(string.oschina)
        super.setOsChinaCookie(v)
    }
}

module.exports = PublishDataStore