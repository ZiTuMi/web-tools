// modify by TuMi. source code from download.js v4.21, by dandavis; 2008-2018. [MIT] see http://danml.com/download.html for tests/usage from gihub: https://github.com/rndme/download


(function (root, factory) {
    //  兼容各种模块写法，在全局对象上挂载download方法
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        //  针对AMD规范，注册一个匿名模块
        define([], factory);
    } else if (typeof exports === 'object') {
        //  针对Node,环境，不支持严格模式
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory();
    } else {
        //  浏览器全局变量支持
        // Browser globals (root is window)
        root.download = factory();
  }
}(this, function () {
    //  第一个参数是数据，第二个参数是文件名，第三个参数是mime类型
    //  下载服务器上的文件直接第一个参数传入url即可，后两个不用传
    return function download(data, strFileName, strMimeType) {
        //  这里的脚本仅支持客户端
        var self = window, // this script is only for browsers anyway...
            // 默认的mime类型
            defaultMime = "application/octet-stream", // this default mime also triggers iframe downloads
            mimeType = strMimeType || defaultMime,
            payload = data,
            //  如果只传入第一个参数，则把其解析为下载url

            // 修改 by TuMi
			// url = !strFileName && !strMimeType && payload,
			url = payload,

            //  创建a标签,方便下载
            anchor = document.createElement("a"),
            toString = function(a){return String(a);},
            //  根据浏览器兼容性，提取Blob
            myBlob = (self.Blob || self.MozBlob || self.WebKitBlob || toString),
			fileName = strFileName || "download",
            blob,
            reader;
            myBlob= myBlob.call ? myBlob.bind(self) : Blob ;
      
        //  调换参数的顺序，允许download.bind(true, "text/xml", "export.xml")这种写法
        if(String(this)==="true"){ //reverse arguments, allowing download.bind(true, "text/xml", "export.xml") to act as a callback
            payload=[payload, mimeType];
            mimeType=payload[0];
            payload=payload[1];
        }

        //  根据传入的url这一个参数下载文件（必须是同源的，因为走的是XMLHttpRequest）
        if(url && url.length< 2048){ // if no filename and no mime, assume a url was passed as the only argument
            //  解析出文件名

            // 修改 by TuMi 解决自定义文件名称
			// fileName = url.split("/").pop().split("?")[0];
			fileName = strFileName;

            //  设置a标签的href
            anchor.href = url; // assign href prop to temp anchor
            //  避免链接不可用
            if(anchor.href.indexOf(url) !== -1){ // if the browser determines that it's a potentially valid url path:
                // 构造一个XMLHttpRequest请求
                var ajax=new XMLHttpRequest();
                //  设置get方法
                ajax.open( "GET", url, true);
                //  设置响应类型为blob,避免浏览器直接解析出来并展示
                ajax.responseType = 'blob';
                //  设置回调
                ajax.onload= function(e){
                // 再次调用自身，相当于递归，把xhr返回的blob数据生成对应的文件
                  download(e.target.response, fileName, defaultMime);
                };
                //  发送ajax请求
                setTimeout(function(){ ajax.send();}, 0); // allows setting custom ajax headers using the return:
                return ajax;
            } // end if valid url?
        } // end if url?


        //go ahead and download dataURLs right away
        //  如果是dataUrl,则生成文件
        if(/^data\:[\w+\-]+\/[\w+\-]+[,;]/.test(payload)){
            //  如果满足条件(大于2m,且myBlob !== toString)，直接通过dataUrlToBlob生成文件
            if(payload.length > (1024*1024*1.999) && myBlob !== toString ){
                payload=dataUrlToBlob(payload);
                mimeType=payload.type || defaultMime;
            }else{      
                //  如果是ie,走navigator.msSaveBlob
                return navigator.msSaveBlob ?  // IE10 can't do a[download], only Blobs:
                    navigator.msSaveBlob(dataUrlToBlob(payload), fileName) :
                    //  否则走saver方法
                    saver(payload) ; // everyone else can save dataURLs un-processed
            }
            
        }//end if dataURL passed?

        blob = payload instanceof myBlob ?
            payload :
            new myBlob([payload], {type: mimeType}) ;

        //  根据传入的dataurl,通过myBlob生成文件
        function dataUrlToBlob(strUrl) {
            var parts= strUrl.split(/[:;,]/),
            type= parts[1],
            decoder= parts[2] == "base64" ? atob : decodeURIComponent,
            binData= decoder( parts.pop() ),
            mx= binData.length,
            i= 0,
            uiArr= new Uint8Array(mx);

            for(i;i<mx;++i) uiArr[i]= binData.charCodeAt(i);

            return new myBlob([uiArr], {type: type});
         }

        //  winMode 是否是在window上调用
        function saver(url, winMode){
            //  如果支持download标签，通过a标签的download来下载
            if ('download' in anchor) { //html5 A[download]
                anchor.href = url;
                anchor.setAttribute("download", fileName);
                anchor.className = "download-js-link";
                anchor.innerHTML = "downloading...";
                anchor.style.display = "none";
                document.body.appendChild(anchor);
                setTimeout(function() {
                    //  模拟点击下载
                    anchor.click();
                    document.body.removeChild(anchor);
                    //  如果在window下，还需要解除url跟文件的链接
                    if(winMode===true){setTimeout(function(){ self.URL.revokeObjectURL(anchor.href);}, 250 );}
                }, 66);
                return true;
            }

            // handle non-a[download] safari as best we can:
            //  针对不支持download的safari浏览器，走window.open的降级操作，优化体验
            if(/(Version)\/(\d+)\.(\d+)(?:\.(\d+))?.*Safari\//.test(navigator.userAgent)) {
                url=url.replace(/^data:([\w\/\-\+]+)/, defaultMime);
                if(!window.open(url)){ // popup blocked, offer direct download:
                    if(confirm("Displaying New Document\n\nUse Save As... to download, then click back to return to this page.")){ location.href=url; }
                }
                return true;
            }

            //do iframe dataURL download (old ch+FF):
            //  针对老的chrome或者firefox浏览器，创建iframe，通过设置iframe的url来达成下载的目的
            var f = document.createElement("iframe");
            document.body.appendChild(f);

            if(!winMode){ // force a mime that will download:
                url="data:"+url.replace(/^data:([\w\/\-\+]+)/, defaultMime);
            }
            f.src=url;
            //  移除工具节点
            setTimeout(function(){ document.body.removeChild(f); }, 333);

        }//end saver



        //  针对ie10+ 走浏览器自带的msSaveBlob
        if (navigator.msSaveBlob) { // IE10+ : (has Blob, but not a[download] or URL)
            return navigator.msSaveBlob(blob, fileName);
        }

        //  如果全局对象下支持URL方法
        if(self.URL){ // simple fast and modern way using Blob and URL:
        //  根据blob创建指向文件的ObjectURL
            saver(self.URL.createObjectURL(blob), true);
        }else{
            // handle non-Blob()+non-URL browsers:
            //  针对不支持Blob和URL的浏览器，通过给saver传入dataUrl来保存文件
            if(typeof blob === "string" || blob.constructor===toString ){
                try{
                    return saver( "data:" +  mimeType   + ";base64,"  +  self.btoa(blob)  );
                }catch(y){
                    return saver( "data:" +  mimeType   + "," + encodeURIComponent(blob)  );
                }
            }

            // Blob but not URL support:
            //  支持Blob但是不支持URL方法的浏览器，通过构造文件阅读器来保存文件
            reader=new FileReader();
            reader.onload=function(e){
                saver(this.result);
            };
            reader.readAsDataURL(blob);
        }
        return true;
    }; /* end download() */
}));
