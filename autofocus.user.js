// ==UserScript==
// @name          AutoFocus
// @namespace     http://d.hatena.ne.jp/samurai20000/
// @description	  auto focus on where you wish
// @include       http://*
// @include	  https://*
// @version       0.0.5
// ==/UserScript==
//
// this script based on autopagerize.user.js
// thanks to id:swdyh
//

const CACHE_EXPIRE = 24 * 60 * 60 * 1000;
const SITEINFO_URLS = ['http://wedata.net/databases/AutoFocus/items.json'];
const XHR_TIMEOUT = 30 * 1000;
const SITEINFO = [
    /* sample
    {
	url:   'http://reader\\.livedoor\\.com/',
	focus: '//div[@id="login"]/h3/a'
    }
    */
    /* templete
    {
	url:   '',
	focus: ''
    }
    */
];

var AutoFocus = function(info) {
    var focus_element = getFocusElementByXpath(info.focus);
    focus_element.focus();
    log('focus!');
};

var launchAutoFocus = function(list) {
    for (var i = 0; i < list.length; i++) {
	try {
	    if (!af && location.href.match(list[i].url) &&
		getFocusElementByXpath(list[i].focus)) {
		af = new AutoFocus(list[i]);
	    }
	}
	catch(e) {
	    log(e);
	    continue;
	}
    }
};


var getsiteinfo = function(urls) {
    var xhrStates = {};
    cacheInfo = getCache();
    urls.forEach(function(i) {
	if(!cacheInfo[i] || cacheInfo[i].expire < new Date()) {
	    var opt = {
		method  : 'get',
		url     : i,
		onload  : function(res) {
                    xhrStates[i] = 'loaded';
                    getCacheCallback(res, i);
                },
		onerror : function(res) {
                    xhrStates[i] = 'error';
                    getCacheErrorCallback(i);
                }
	    };
            xhrStates[i] = 'start';
	    GM_xmlhttpRequest(opt);
            setTimeout(function() { if (xhrStates[i] == 'start') { getCacheErrorCallback(i); }} , XHR_TIMEOUT);
	}
	else {
	    launchAutoFocus(cacheInfo[i].info);
	}
    });
};

// utility SITE_INFO
function parseInfo(str) {
    var lines = str.split(/\r?\n|\r/);
    var strip = str.replace(/^\s+|\s+$/g, '');
    var re = /^([^:]+?):(.*)$/;
    var info = {};
    lines.forEach(function(line) {
	if (re.test(line)) {
	    info[RegExp.$1] = RegExp.$2.replace(/^\s+/, '');
	}
    });

    var isValid = function(info) {
	return !['url', 'focus'].some(function(property) {
	    return !info.hasOwnProperty(property);
	});
    };

    return isValid(info) ? info : null;
}

function clearCache() {
    GM_setValue('cacheInfo', '');
}

function getCache() {
    return eval(GM_getValue('cacheInfo')) || {};
}

function getCacheCallback(res, url) {
    if (res.status != 200) {
	return getCacheErrorCallback(url);
    }
    
    var info
    try {
        info = eval(res.responseText).map(function(i) { return i.data })
    } catch(e) {
        var info      = [];
        var matched   = false;
        var hdoc      = createHTMLDocumentByString(res.responseText);
        var textareas = getElementsByXPath('//*[@class="autofocus_data"]', hdoc) || [];

        textareas.forEach(function(textareass) {
	    var d = parseInfo(textareas.innerHTML);
	    if (!d) return;
	    info.push(d);
	    if (!matched && location.href.match(d.url)) {
	        matched = d;
	    }
        });
    }

    if (info.length > 0) {
	cacheInfo[url] = {
	    urls   : url,
	    expire : new Date(new Date().getTime() + CACHE_EXPIRE),
	    info   : info
	}
	GM_setValue('cacheInfo', cacheInfo.toSource());
        log('cache!');

	if (!af && !!matched) {
	    af = new AutoFocus(matched);
	}
    }
}

function getCacheErrorCallback(url) {
    if (cacheInfo[url]) {
	cacheInfo[url].expire = new Date(new Date().getTime() + CACHE_EXPIRE);
	GM_setValue('cacheInfo', cacheInfo.toSource());
	launchAutoFocus(cacheInfo[url].info);
    }
}

function createHTMLDocumentByString(str) {
    var html     = str.replace(/<!DOCTYPE[ \t\r\n][^>]*>|<html(?:(?=<)|[ \t\r\n]*>|[ \t\r\n][^<>]*(?:>|(?=<)))|<\/html(?:[ \t\r\n>].*)?$/ig, '');
    var htmlDoc  = document.implementation.createDocument(null, 'html', null);
    var fragment = createDocumentFragmentByString(html);
    try {
        fragment = htmlDoc.adoptNode(fragment);
    } catch(e) {
        fragment = htmlDoc.importNode(fragment, true);
    };
    htmlDoc.documentElement.appendChild(fragment);
    return htmlDoc;
}

function createDocumentFragmentByString(str) {
    var range = document.createRange();
    range.setStartAfter(document.body);
    return range.createContextualFragment(str);
}

function getFocusElementByXpath(xpath) {
    var result = document.evaluate(xpath, document, null,
                                   XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    return result.singleNodeValue ? result.singleNodeValue: null;
}

function getElementsByXPath(xpath, node) {
    var node = node || document;
    var nodesSnapshot = document.evaluate(xpath, node, null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    var data = [];
    for (var i = 0; i < nodesSnapshot.snapshotLength; i++) {
	data.push(nodesSnapshot.snapshotItem(i));
    }
    return (data.length >= 1) ? data : null;
}

function log(message) {
    GM_log(message);
}

//main
GM_registerMenuCommand('AutoFocus - clear cache', clearCache)
var af = null;
launchAutoFocus(SITEINFO);
getsiteinfo(SITEINFO_URLS);
