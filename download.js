var fs = require('fs'),
	http = require('http'),
	path = require('path');

// 创建所有目录
var mkdirs = function(dirpath, mode, callback) {
    fs.exists(dirpath, function(exists) {
        if(exists) {
        	if (callback) {
            	callback(null, dirpath);
        	}
        } else {
            //尝试创建父目录，然后再创建当前目录
            mkdirs(path.dirname(dirpath), mode, function(){
                fs.mkdir(dirpath, mode, callback);
            });
        }
    });
};

function mkdirp(dirpath, mode, callback){
	dirpath = path.resolve(dirpath);
	if (!callback) {
		callback = mode;
		mode = 0777;
	}
	return mkdirs(dirpath, mode, callback);
}

function download(url, saveTo, opts, next) {
	if (!next) {
		next = opts;
		opts = {
			timeout: 0
		};
	}
	var timeout = opts.timeout,
		percentSize = opts.percentSize,
		progress = opts.progress;
	if (!next) {
		next = function(err, data){
			if (err) {
				console.error(err.message, url, saveTo);
			} else {
				console.log('success:', data.file);
			}
		};
	}
	mkdirp(path.dirname(saveTo), function(){
		var timeoutEvent = -1,
			done = function(err, r){
				if (timeoutEvent) {
					if (timeoutEvent >0 ) {
			        	clearTimeout(timeoutEvent);
					}
			        timeoutEvent = 0;
					next(err, r);
				}
			};
		var req = http.get(url, function(res) {
			if (res.statusCode !== 200) {
				return next({
					message: '响应失败:' + res.statusCode
				});
			}
			var size = 0,
	    		writeStream,
	    		contentLength = res.headers['content-length'],
	    		percent;
	    	try {
	    		writeStream = fs.createWriteStream(saveTo);
	    		res.pipe(writeStream);
	    	} catch(e) {
				done({
					message:'创建文件失败'
				});
		        if (req.res) {
		            req.res.emit("abort");
		        }
		        req.abort();
		        return ;
	    	}
			res.on('data', function (chunk) {
	    		size += chunk.length;
	    		if (progress && contentLength > 1048576) { // 1M 1024*1024 大文件
	    			var per = Math.floor(Number(size/contentLength).toFixed(percentSize || 2)*100);
	    			if (per !== percent) {
	    				percent = per;
    					progress(per, size, contentLength);
	    			}
	    		}
			});
			res.on('end', function() {
	            done(null, {
	            	size: size,
	            	url: url,
	            	file: saveTo
	            });
			});
	        res.on("close", done);
		}).on('error', function(e) {
			done(e);
		}).on("timeout", function() {
			done({
				message:'访问超时'
			});
	        if (req.res) {
	            req.res.emit("abort");
	        }
	        req.abort();
	    });
	    if (timeout) {
	    	timeoutEvent =  setTimeout(function() {
		        req.emit("timeout");
		    }, timeout * 1000);
	    }
	});
}

function getUrl(url, next) {
	http.get(url, function(res) {
		var size = 0;
		var chunks = [];
		res.on('data', function(chunk){
		    size += chunk.length;
		    chunks.push(chunk);
		});
		res.on('end', function(){
		    var data = Buffer.concat(chunks, size);
		    next(null, data.toString());
		});
	}).on('error', next);
}

function DownloadManager(opts) {
	this.options = {
		timeout: 0, //默认超时
		queue: 1,   //队列个数
		progress: true,  // 输出进度
		percentSize: 2,  // 进度位数精度 2=>32% 4=>32.51%
		finish: function(){}, //结束回调
	};
	for(var x in opts) {
		if (opts.hasOwnProperty(x)) {
			this.options[x] = opts[x];
		}
	}
	this.tasks = [];
	this.queueLength = 0;
	this.running = 0;
}

DownloadManager.prototype.add = function(url, opts, next) {
	if (!next) {
		next = opts;
		opts = {};
	}
	if (!opts.hasOwnProperty('timeout')) {
		opts.timeout = this.options.timeout;
	}
	var task = {
		url: url,
		saveTo: opts.saveTo,
		opts: opts,
		fileName: path.basename(opts.saveTo||''),
	};
	if (this.options.progress) {
		opts.progress  = this.proxyProgress(opts.progress, task);
	}
	task.next = this.proxyNext(next, task);
	this.tasks.push(task);
	this.take();
};

DownloadManager.prototype.take = function() {
	if (this.queueLength> this.options.queue-1) {
		return;
	}
	var task = this.tasks.shift();
	if (task) {
		this.queueLength++;
		this.running++;
		if (task.saveTo) {
			download(task.url, task.saveTo, task.opts, task.next);
		} else {
			getUrl(task.url, task.next);
		}
	} else {
		if (this.queueLength > 0) {
			this.queueLength--;
		}
		if (this.running === 0) {
			this.options.finish();
		}
	}
};

DownloadManager.prototype.proxyNext	= function(next) {
	var self = this;
	return function(err, data){
		self.queueLength--;
		this.running--;
		if (next) {
			next(err, data);
		}
		self.take();
	};
};

function isFunciton(source){  
    return Object.prototype.toString.call(source) === "[object Function]";  
}

DownloadManager.prototype.proxyProgress	= function(next, task) {
	var progress = this.options.progress;
	if (!isFunciton(progress)) {
		progress = null;
	}
	return function(per, curr, total){
		if (progress) {
			progress(per, curr, total, task);
		} else {
			console.log('下载:[%d%, %s/%s]', per, formatFileSize(curr), formatFileSize(total), task.fileName);
		}
		if (next) {
			next(per, curr, total,task);
		}
	};
};

function formatFileSize(len) {
    len = +len; // coerce to number
    if (len <= 1024) {
        return len.toFixed(0)  + " B";
    }
    len /= 1024;
    if (len <= 1024) {
        return len.toFixed(1) + " KB";
    }
    len /= 1024;
    if (len <= 1024) {
        return len.toFixed(2) + " MB";
    }
    len /= 1024;
    return len.toFixed(3) + " GB";
}

module.exports.download = download;
module.exports.getUrl = getUrl;
module.exports.DownloadManager = DownloadManager;
module.exports.formatFileSize = formatFileSize;

