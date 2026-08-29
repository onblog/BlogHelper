const {MenuItem} = require('electron');
const toast = require('../../common/app-toast');

exports.status = function (menu, tray) {
    menu.append(new MenuItem({
                                 label: '插件化测试',
                                 click() {
                                     toast.toast({title: '插件化测试成功！'})
                                 }
                             }));
    tray.setTitle('插件')
};