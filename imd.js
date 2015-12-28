var fs = require('fs'),
	path = require('path'),
	cheerio = require("cheerio"),
	program = require('commander'),
	pkg = require('./package.json'),
	mook = require('./download');

var RE_FORB = new RegExp('\\'+'\/:*?"<>|'.split('').join("|\\"), 'g'),
	urlPrefix = 'http://www.imooc.com';

//获得搜索课程关键字

function getKeywords(next) {
	var url = urlPrefix + '/course/list';
	mook.getUrl(url, function(err, html){
		if (err) {
			return next(err);
		}
		var keywords;
		try {
			var $ = cheerio.load(html);
			keywords = parseKeywords($);
		} catch(errs) {
			return next(errs);
		}
		next(null, keywords);
	});
}

var skipKeywords = [
	'C#',
];
function parseKeywords($) {
	var $it = $('.course-nav-item >a[data-id]'),
		arr = [];
	for(var i=0; i<$it.length; i++) {
		var url = $it.eq(i).attr('href').replace('/course/list?c=', '');
		url = decodeURIComponent(url);
		if (skipKeywords.indexOf(url) !== -1)
			continue;
		var pos = url.indexOf('+');
		if (pos !== -1) { // 'C+puls+puls' 'data+structure', 'Unity+3D',
			url = url.substr(0, pos);
		}
		if (arr.indexOf(url) === -1) {
			arr.push(url);
		}
	}
	return arr;
}

// 搜索课程
function getListPage(words, page, next) {
	var url = urlPrefix + '/index/searchcourse?tag=0&page='+page+'&words='+encodeURIComponent(words);
	mook.getUrl(url, function(err, html){
		if (err) {
			return next(err);
		}
		var pageInfo;
		try {
			var $ = cheerio.load(html);
			pageInfo = parseListPage($);
			pageInfo.page = page;
			pageInfo.totalPage = page;
			pageInfo.nextPage = false;
			if (pageInfo.lists.length * page < pageInfo.total) { //多页
				pageInfo.nextPage = +page +1;
				pageInfo.totalPage = Math.round(pageInfo.total/pageInfo.lists.length);
			}
		} catch(errs) {
			return next(errs);
		}
		next(null, pageInfo);
	});
}

function parseListPage($) {
	var total = parseInt($('.result-header>span').text().match(/\d+/)[0]);
	var pageInfo = {
		total: total
	};
	var $it = $('.title > a'),
		arr = [];
	for(var i=0; i<$it.length; i++) {
		var $a = $it.eq(i);
		var url = $a.attr('href');
		var dist = {
			name:  $a.text().replace(/\r|\n|\s/g, '').replace(RE_FORB, '_'),
			url : urlPrefix + url,
			lid : path.basename(url)
		};
		arr.push(dist);
	}
	pageInfo.lists = arr;
	return pageInfo;
}

// 获取课程
function getLearnPage(id, next) {
	var url = urlPrefix + '/learn/'+id;
	mook.getUrl(url, function(err, html){
		if (err) {
			return next(err);
		}
		var $ = cheerio.load(html);
		next(null, {
			url: url,
			learnId: id,
			title: parseTitle($),
			videoUrls: parseLearnVideoUrl($)
		});
	});
}

function parseTitle($) {
	var title = $('title').text().replace(/\r|\n|\s/g, '');
	var pos = title.indexOf('_');
	if (pos >0) {
		title = title.substr(0, pos);
	}
	return title.replace(RE_FORB, '_');
}

function parseLearnVideoUrl($) {
	var $it = $('.studyvideo'),
		arr = [];
	for(var i=0; i<$it.length; i++) {
		var $a = $it.eq(i);
		var url = $a.attr('href');
		var dist = {
			name:  $a.text().replace(/\r|\n|\s/g, '').replace(RE_FORB, '_'),
			url : urlPrefix + url,
			mid : path.basename(url)
		};
		arr.push(dist);
	}
	return arr;
}

// 获取视频地址
/*
http://www.imooc.com/course/ajaxmediainfo/?mid=3235&mode=flash
{
    "result": 0,
    "data": {
        "result": {
            "mid": 3235,
            "mpath": [
                "http://v1.mukewang.com/e2683b34-157f-4327-99a3-fec22711ac38/H.mp4",
                "http://v1.mukewang.com/e2683b34-157f-4327-99a3-fec22711ac38/M.mp4",
                "http://v1.mukewang.com/e2683b34-157f-4327-99a3-fec22711ac38/L.mp4"
            ],
            "cpid": "825",
            "name": "Linux简介",
            "time": "121",
            "practise": []
        }
    },
    "msg": "成功"
}
 */
// function getVideoUrl(mid, next) {
// 	var url = urlPrefix + "/course/ajaxmediainfo/?mid="+mid+"&mode=flash";
// 	mook.getUrl(url, function(err, text){
// 		if (err) {
// 			return next(err);
// 		}
// 		var curr = parseVideoUrl(text);
// 		if (curr instanceof Error) {
// 			return next(curr);
// 		}
// 		next(err, curr);
// 	});
// }

//获取视频地址
function parseVideoUrl(text) {
	var curr,
		jsonData = JSON.parse(text);
	if (jsonData && jsonData.result === 0) {
		if (jsonData.data) {
			curr = jsonData.data;
		}
		if (curr && curr.result) {
			curr = curr.result;
		}
		if (curr && curr.mpath) {
			curr = curr.mpath;
		}
		if (Array.isArray(curr) && curr.length) {
			curr = curr[0];
		} else {
			curr = null;
		}
	}
	if (!curr) {
		var e = new Error('解析视频地址失败');
		e.data = jsonData;
		return e;
	}
	return curr;
}

function handlerError(err) {
	if (err) {
		console.error();
		console.error(err);
		process.exit(1);
	}
}

function donwloadLearnVideo(args) {
	var opts = {
		id: 0,		// 课程ID
		dir:'.',	// 下载目录

		// 下载选项
		timeout: 0, //默认超时
		queue: 3,   //队列个数
		progress: true,  // 输出进度
		percentSize: 2,  // 进度位数精度 2=>32% 4=>32.51%
		finish: function(){
			console.log('[ DONE]');
		},
	};
	for(var x in opts) {
		if (args.hasOwnProperty(x)) {
			opts[x] = args[x];
		}
	}
	opts.timeout *= 60; //单位分钟

	var dm = new mook.DownloadManager(opts);
	getLearnPage(args.id, function(err, data){
		handlerError(err);
		console.log('[START]:', data.title);
		var url = urlPrefix + "/course/ajaxmediainfo/?mid=%s&mode=flash";
		data.videoUrls.forEach(function(it){ // name url mid
			console.log('解析:', it.name);
			dm.add(url.replace('%s', it.mid), function(err, json){
				handlerError(err);
				var videoUrl = parseVideoUrl(json);
				if (videoUrl instanceof Error) {
					handlerError(videoUrl);
				}
				it.videoUrl = videoUrl;
				it.saveTo = path.resolve(opts.dir , data.title+'/'+it.name + path.extname(videoUrl));
			    fs.exists(it.saveTo, function(exists) {
			        if(exists) {
			        	console.log('跳过:', it.name);
			        } else {
						console.log('队列:', it.name);
						dm.add(videoUrl, {
							saveTo: it.saveTo
						}, function(){
							console.log('完成:', it.name);
						});
			        }
			    });
			});
		});
	});
}

function parseBoolean(val) {
	if (val !== 'false' && val !== '0') {
		return true;
	}
	return false;
}

program
    .version(pkg.version)
	.option('-i, --id [id]', '课程ID, http://www.imooc.com/video/3235 的 3235', parseInt)
    .option('-d, --dir [dir]', '视频下载目录, 默认当前目录')
    .option('-p, --progress [progress]', '是否显示下载进度, 默认显示', parseBoolean)
    .option('-q, --queue [queue]', '下载队列个数, 默认3个', parseInt)
    .option('-t, --timeout [timeout]', '下载超时退出, 默认0不超时,单位分钟', parseInt)
    .option('-s, --search [search]', '输入搜索内容')
    .option('-j, --jump [jump]', '指定搜索分页页码序号, 默认1')
    .option('-l, --list', '列出搜索关键字')
    .parse(process.argv)
    ;

function dumpLearnList(lists) {
	lists.forEach(function(it){
		console.log(it.lid, it.name);
	});
}
if (program.list) {
	getKeywords(function(err, data){
		handlerError(err);
		console.log("找到以下匹配度高的关键字");
		console.log();
		console.log('',data.join("\n "));
		console.log();
		console.log('推荐使用关键字搜索课程');
	});
} else if (program.search) {
	getListPage(program.search, program.jump || 1, function(err, data){
		handlerError(err);
		if (data.lists.length) {
			console.log('共找到 %d 条数据 [%d/%d]页', data.total, data.page, data.totalPage);
			dumpLearnList(data.lists);
			if (data.nextPage) {
				console.log();
				console.log('需要翻页请执行 imd -s "%s" -j %d', program.search, data.nextPage);
			}
		} else {
			console.log('没有搜索到数据');
		}
	});
} else if (program.id) {
	donwloadLearnVideo(program);
} else {
	program.help();
	process.exit(0);
}
