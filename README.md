# imd
[慕课网http://www.imooc.com](http://www.imooc.com)视频下载工具imd(imook downloader)

安装nodejs
```
npm install -g imd  //安装 imd
```

####下载课程 http://www.imooc.com/learn/345

```
imd -i 345

...
下载:[99%, 16.27 MB/16.52 MB] 3-13goget常用标记案例演示(02_53).mp4
下载:[100%, 16.44 MB/16.52 MB] 3-13goget常用标记案例演示(02_53).mp4
完成: 3-13goget常用标记案例演示(02_53)
```

####搜索课程 http://www.imooc.com/index/search?words=javascript 获得课程ID

```
imd -s javascript
共找到 36 条数据 [1/3]页
36 JavaScript入门篇
80 用JavaScript实现图片缓慢缩放效果
10 JavaScript进阶篇
277 JavaScript深入浅出
144 用JavaScript实现图片剪切效果
90 展开与收起效果
92 WheniOSlovesJS
65 回到顶部效果
74 侧边栏信息展示效果
101 瀑布流布局
14 如何实现“新手引导”效果
52 固定边栏滚动特效

需要翻页请执行 imd -s "javascript" -j 2
```

####查看搜索关键字

```
imd -l 

找到以下匹配度高的关键字

 html
 javascript
 CSS3
 html5
 jquery
 angularjs
 nodejs
 bootstrap
 webapp
 fetool
 php
 java
 linux
 python
 C
 Go
 data
 android
 ios
 Unity
 Cocos2d-x
 mysql
 mongodb
 cloudcomputing
 Oracle
 大数据
 SQL
 photoshop
 maya
 premiere
 ZBrush

推荐使用关键字搜索课程
```

####命令行帮助

```
imd

  Usage: imd [options]

  Options:

    -h, --help                 output usage information
    -V, --version              output the version number
    -i, --id [id]              课程ID, http://www.imooc.com/video/3235 的 3235
    -d, --dir [dir]            视频下载目录, 默认当前目录
    -p, --progress [progress]  是否显示下载进度, 默认显示
    -q, --queue [queue]        下载队列个数, 默认3个
    -t, --timeout [timeout]    下载超时退出, 默认0不超时,单位分钟
    -s, --search [search]      输入搜索内容
    -j, --jump [jump]          指定搜索分页页码序号, 默认1
    -l, --list                 列出搜索关键字
```