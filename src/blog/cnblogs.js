const https = require('https');
const DataStore = require('../app-store');
const dataStore = new DataStore();
const jsdom = require("jsdom");
const querystring = require('querystring');
const FormData = require('form-data');
const fs = require('fs');
const { Console } = require('console');
const axios = require('axios')
const { session } = require('electron')
//上传图片到博客园
function uploadPictureToCnBlogs(filePath) {
    return new Promise((resolve, reject) => {
        let formData = new FormData();
        formData.append('imageFile', fs.createReadStream(filePath)); //'file'是服务器接受的key
        formData.append("host", 'www.cnblogs.com');
        formData.append("uploadType", 'Paste');

        let headers = formData.getHeaders(); //这个不能少
        headers.Cookie = dataStore.getCnBlogCookies(); //获取Cookie
        headers.Connection = 'close';
        //自己的headers属性在这里追加
        let request = https.request({
            host: 'upload.cnblogs.com',
            method: 'POST',
            path: '/imageuploader/CorsUpload',
            agent: false,
            headers: headers
        }, function (res) {
            let str = '';
            res.on('data', function (buffer) {
                str += buffer;//用字符串拼接
            }
            );
            res.on('end', () => {
                if (res.statusCode === 200) {
                    const result = JSON.parse(str);
                    if (result.success) {
                        resolve(result.message)
                    } else {
                        reject('上传图片失败,' + result.message)
                    }
                } else {
                    reject('上传图片失败:' + res.statusCode)
                }
            });
        });
        formData.pipe(request);

        request.on('error', function (e) {
            reject('网络连接异常' + e.message)
        });
    })
}

let cnBlog_url = 'https://i1.cnblogs.com/EditPosts.aspx?opt=1';

//发布文章到博客园
function publishArticleToCnBlogs(title, content, isPublish) {

    return new Promise((resolve, reject) => {
        axios.get(cnBlog_url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:45.0) Gecko/20100101 Firefox/45.0',
                'Cookie': dataStore.getCnBlogCookies(),
                'Connection': 'close',
            }
        }).then(res => {
            let token = dataStore.GetCnblogsToken()
            //let cookies = session.defaultSession.cookies.get()
            if (!token) {
                reject('请先登录博客园');
                return
            }
            publishArticleToCnBlogFact(title, content, resolve, reject, isPublish)
        }).catch(err => {
            console.log(err)
        })
    })
}

function publishArticleToCnBlogFact(title, content, resolve,
    reject, isPublish) {
    let params = {
        "id": null,
        "postType": 1,
        "title": title,
        "postBody": content,
    }
    axios({
        method: 'post',
        url: 'https://i.cnblogs.com/api/posts',
        data: JSON.stringify(params),
        headers: {
            "Accept-Language": "zh-CN,zh;q=0.8,en-US;q=0.5,en;q=0.3",
            'Referer': 'https://i.cnblogs.com',
            'Accept': '*/*',
            'Origin': 'https://i.cnblogs.com',
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:45.0) Gecko/20100101 Firefox/45.0',
            'Cookie': dataStore.getCnBlogCookies(),
            'x-xsrf-token': dataStore.GetCnblogsToken()
        }
    }).then(res => {
        if (res.status == 200) {
            resolve(res.data.url)
        }
        // console.log(res)
    }).catch(res => {
        reject('发布失败！\n1.文章标题已存在\n2.尚未登录博客园\n3.发布频繁请稍后再试\n4.超过当日100篇限制')

    })


    // const dom = new jsdom.JSDOM(str);
    // const a = dom.window.document.body.getElementsByTagName('a')[0];
    // let url = 'https://i.cnblogs.com' + a.href;


    // //发布失败

}

exports.uploadPictureToCnBlogs = uploadPictureToCnBlogs;
exports.publishArticleToCnBlogs = publishArticleToCnBlogs;