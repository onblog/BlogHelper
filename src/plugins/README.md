# 插件开发指南

## 写在前面

当你看到这段文字的时候，相信你已经对本项目充满兴趣！

如果你想使用托盘的形式开发属于自己的快捷功能，请仔细阅读插件开发指南。

当你开发并测试完成时，你可以自行编译、打包使用，并且可以提交 pull request。

## 开发步骤

1. 第一步，找到此目录的`app-plugins.js`文件，注册你的插件，例如:

```js
exports.customMenu = function (menu, tray) {
    // 示例：一行代码注册一个插件
    require('./demo/demo').status(menu, tray)
}
```

2. 为保持良好的代码隔离，请新建一个目录，在新目录下新建`.js`文件，例如`demo.js`:

```js
const {MenuItem} = require('electron')
const toast = require('../../app-toast')

exports.status = function (menu, tray) {
    menu.append(new MenuItem({
                                 label: '插件化测试',
                                 click() {
                                     toast.toast({title: '插件化测试成功！'})
                                 }
                             }))
    tray.setTitle('插件已启用')
}
```

如果你需要一些媒体文件，也需要在你的插件目录下新建目录并添加。

教程结束，到此你就可以新建你的插件了！

请注意，切勿改动除`plugins`目录之外的其它文件，否则，不通过pull request哦！
