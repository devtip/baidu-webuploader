(function( $ ){
    // 当domReady的时候开始初始化
    $(function() {
        var $wrap = $('#uploader'),

            $queueList = $wrap.find( '.queueList' );

            // 图片容器
            $queue = $( '<ul class="filelist"></ul>' )
                .appendTo( $queueList ),

            // 状态栏，包括进度和控制按钮
            $statusBar = $wrap.find( '.statusBar' ),

            // 文件总体选择信息
            $info = $statusBar.find( '.info' ),

            // 上传按钮
            $upload = $wrap.find( '.uploadBtn' ),

            // 没选择文件之前的内容。
            $placeHolder = $wrap.find( '.placeholder' ),

            // 页面初始化的时候先将上传文件总进度信息隐藏掉
            $progress = $statusBar.find( '.progress' ).hide(),

            // 添加的文件数量
            fileCount = 0,

            // 添加的文件总大小
            fileSize = 0,

            // ********** 图片大小相关逻辑 S ************

            // 优化retina, 在retina下这个值是2
            ratio = window.devicePixelRatio || 1,

            // 缩略图大小
            thumbnailWidth = 110 * ratio,
            thumbnailHeight = 110 * ratio,

            // ********** 图片大小相关逻辑 E ************

            // 可能有pedding, ready, uploading, confirm, done.
            state = 'pedding',

            // 所有文件的进度信息，key为file id
            percentages = {},

            // WebUploader实例
            uploader;

        // 实例化
        uploader = WebUploader.create({
            pick: {
                // label: '点击选择图片',
                id: '#filePicker'
            },
            
            // 服务器可能需要分类信息
            // 比如sort-id
            formData: {
                uid: 123
            },


  
            chunked: false,
            // chunked: true,
            chunkSize: 512 * 1024,

            server: 'http://localhost:8888/fileupload.php',


            // // 接受的文件类型
            // accept: {
            //     title: 'Images',
            //     extensions: 'gif,jpg,jpeg,bmp,png',
            //     mimeTypes: 'image/*'
            // },

             
            fileNumLimit: 300,
            fileSizeLimit: 200 * 1024 * 1024,    // 200 M
            fileSingleSizeLimit: 50 * 1024 * 1024    // 50 M
        });


        // WebUploader内部会在uploader实例ready的时候触发dialogOpen事件
        uploader.on('dialogOpen', function() {
            console.log('here');
        });


        // 添加“添加文件”的按钮，
        uploader.addButton({
            id: '#filePicker2',
            label: '继续添加'
        });

        uploader.on('ready', function() {
            window.uploader = uploader;
        });

        // 当有文件添加进来时执行，负责view的创建
        function addFile( file ) {
            // 每个图片项的视图模板
            var $li = $( '<li id="' + file.id + '">' +
                    '<p class="title">' + file.name + '</p>' +
                    '<p class="imgWrap"></p>'+
                    '<p class="progress"><span></span></p>' +
                    '</li>' ),

                // 每个文件的操作面板
                $btns = $('<div class="file-panel">' +
                    '<span class="cancel">删除</span>' +
                    '<span class="rotateRight">向右旋转</span>' +
                    '<span class="rotateLeft">向左旋转</span></div>').appendTo( $li ),

                // 文件总体上传进度相关的DOM元素
                $prgress = $li.find('p.progress span'),

                // 专门用来存放base64编码图片的容器
                $wrap = $li.find( 'p.imgWrap' ),

                // 创建一个用来显示错误信息的jQuery容器
                // 这个主要是在图片上传失败才会用到
                $info = $('<p class="error"></p>'),

                // 显示错误信息
                showError = function( code ) {
                    switch( code ) {
                        case 'exceed_size':
                            text = '文件大小超出';
                            break;

                        case 'interrupt':
                            text = '上传暂停';
                            break;

                        default:
                            text = '上传失败，请重试';
                            break;
                    }

                    $info.text( text ).appendTo( $li );
                };

            if ( file.getStatus() === 'invalid' ) {
                showError( file.statusText );
            } else {
                // @todo lazyload
                $wrap.text( '预览中' );

                // ** 创建缩略图 **
                uploader.makeThumb( file, function( error, src ) {
                    var img;

                    if ( error ) {
                        $wrap.text( '不能预览' );
                        return;
                    }

                    img = $('<img src="'+src+'">');

                    // 先从DOM中移除集合中匹配元素的所有子节点
                    $wrap.empty().append( img );
                }, thumbnailWidth, thumbnailHeight );

                // 存储文件的进度信息
                // - file.size ==> 文件大小
                // - 0         ==> 文件已加载的百分比
                percentages[ file.id ] = [ file.size, 0 ];

                // 设置文件的旋转角度
                file.rotation = 0;
            }



            // ******** 状态发生改变就会触发 ***********
            // WebUploader内部会触发statuschange
            file.on('statuschange', function( cur, prev ) {
                console.log(prev, '=>', cur);

                if ( prev === 'progress' ) {
                    $prgress.hide().width(0);
                } else if ( prev === 'queued' ) {
                    $li.off( 'mouseenter mouseleave' );
                    $btns.remove();
                }

                // 成功
                if ( cur === 'error' || cur === 'invalid' ) {
                    console.log( file.statusText );
                    showError( file.statusText );
                    percentages[ file.id ][ 1 ] = 1;
                } else if ( cur === 'interrupt' ) { // 上传被中断
                    showError( 'interrupt' );
                } else if ( cur === 'queued' ) {
                    $info.remove();
                    $prgress.css('display', 'block');
                    percentages[ file.id ][ 1 ] = 0;
                } else if ( cur === 'progress' ) { // 上传处理中
                    $info.remove();
                    $prgress.css('display', 'block');
                } else if ( cur === 'complete' ) {
                    // 隐藏进度条
                    $prgress.hide().width(0);
                    // 图片右下角显示上传成功的提示
                    $li.append( '<span class="success"></span>' );
                }

                $li.removeClass( 'state-' + prev ).addClass( 'state-' + cur );
            });


            // 为每个文件的功能操作绑定事件
            $btns.on( 'click', 'span', function() {
                // 获取span的索引值
                var index = $(this).index(),
                    deg;

                switch ( index ) {
                    case 0: // 删除
                        uploader.removeFile( file );
                        return;

                    case 1: // 向右旋转
                        file.rotation += 90;
                        break;

                    case 2: // 向左旋转
                        file.rotation -= 90;
                        break;
                }

               
                deg = 'rotate(' + file.rotation + 'deg)';

                $wrap.css({
                    '-webkit-transform': deg,
                    '-mos-transform': deg,
                    '-o-transform': deg,
                    'transform': deg
                });


            });

            $li.appendTo( $queue );
        }




        // 负责view的销毁
        function removeFile( file ) {
            // 根据文件id找到对应的li容器
            var $li = $('#' + file.id);

            delete percentages[ file.id ];

            // 更新文件总上传进度
            updateTotalProgress();

            // - 移除相关事件以节省内存
            // - 将当前li容器从上传主容器uploader中移除
            $li.off()
                .find('.file-panel').off()
                .end().remove();
        }




        // 更新文件上传总进度
        function updateTotalProgress() {
            var loaded = 0,
                total  = 0,
                spans  = $progress.children(),
                percent;

            $.each( percentages, function( k, v ) {
                total  += v[ 0 ];          // 总文件大小
                loaded += v[ 0 ] * v[ 1 ]; // 已上传的文件大小
            } );

            percent = total ? loaded / total : 0;

            // 更新上传值
            spans.eq( 0 ).text( Math.round( percent * 100 ) + '%' );

            // 更新上传进度条
            spans.eq( 1 ).css( 'width', Math.round( percent * 100 ) + '%' );

        }


        function setState( val ) {
            var file, stats;

            // 状态相同的时候，避免做不必要的操作
            if ( val === state ) {
                return;
            }

            $upload.removeClass( 'state-' + state );
            $upload.addClass( 'state-' + val );
            state = val;

            switch ( state ) {
                case 'pedding':
                    $placeHolder.removeClass( 'element-invisible' );
                    $queue.hide();
                    $statusBar.addClass( 'element-invisible' );
                    uploader.refresh();
                    break;

                case 'ready':
                    $placeHolder.addClass( 'element-invisible' );
                    $( '#filePicker2' ).removeClass( 'element-invisible');
                    $queue.show();
                    $statusBar.removeClass('element-invisible');
                    uploader.refresh();
                    break;

                case 'uploading':
                    $( '#filePicker2' ).addClass( 'element-invisible' );
                    $progress.show();
                    $upload.text( '暂停上传' );
                    break;

                case 'paused':
                    $progress.show();
                    $upload.text( '继续上传' );
                    break;

                case 'confirm':
                    $progress.hide();
                    $( '#filePicker2' ).removeClass( 'element-invisible' );
                    $upload.text( '开始上传' );

                    stats = uploader.getStats();
                    if ( stats.successNum && !stats.uploadFailNum ) {
                        setState( 'finish' );
                        return;
                    }
                    break;
                case 'finish':
                    stats = uploader.getStats();
                    if ( stats.successNum ) {
                        console.log( '上传成功' );
                    } else {
                        // 没有成功的图片，重设
                        state = 'done';
                        location.reload();
                    }
                    break;
            }

            // updateStatus();
        }

        // 当文件上传过程中触发
        uploader.on('uploadProgress', function( file, percentage ) {
            var $li      = $('#' + file.id),
                $percent = $li.find('.progress span');

            $percent.css( 'width', percentage * 100 + '%' );
            percentages[ file.id ][ 1 ] = percentage;
            updateTotalProgress();
        });

        // 当文件添加进来触发
        uploader.on('fileQueued', function( file ) {
            fileCount++;
            fileSize += file.size;

            if ( fileCount === 1 ) {
                $placeHolder.addClass( 'element-invisible' );
                // 显示状态栏
                $statusBar.show();
            }


            // 创建单个上传文件的视图
            addFile( file );
            // 设置状态
            setState( 'ready' );
            // 更新上传进度
            updateTotalProgress();
        });

        uploader.on('fileDequeued', function( file ) {
            fileCount--;
            fileSize -= file.size;

            // 上传文件数目为0的时候触发
            if ( !fileCount ) {
                setState( 'pedding' );
            }

            removeFile( file );
            updateTotalProgress();

        });


        //一个简单的状态机
        uploader.on( 'all', function( type ) {
            var stats;
            switch( type ) {
                case 'uploadFinished':
                    setState( 'confirm' );
                    break;

                case 'startUpload':
                    setState( 'uploading' );
                    break;

                case 'stopUpload':
                    setState( 'paused' );
                    break;

            }
        });

        uploader.onError = function( code ) {
            console.log( 'Error: ' + code );
        };

        $upload.on('click', function() {
            if ( $(this).hasClass( 'disabled' ) ) {
                return false;
            }

            if ( state === 'ready' ) {
                uploader.upload();
            } else if ( state === 'paused' ) {
                uploader.upload();
            } else if ( state === 'uploading' ) {
                uploader.stop();
            }
        });


        // 设置上传按钮的状态
        $upload.addClass( 'state-' + state );


        // 更新上传进度
        updateTotalProgress();
    });

})( jQuery );
