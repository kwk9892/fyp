'use strict';
KYB.awards = {
    stories: {
        mobileInit: function() {
            this.isMobile = true;
        },
        dataUriA: {},
        imgRender: function(award) {
            var img = document.createElement('div');
            var userInfo = '<div id="awards-stories-img--ava-wrap"><div style="background-image: url('+KYB.reportData.user.ava+')" id="awards-stories-img--ava"></div></div>' +
                '<div id="awards-stories-img--name">'+KYB.reportData.user.name+'</div>' +
                '<div id="awards-stories-img--username">@'+KYB.reportData.user.username+'</div>';
            if(this.scale) {
                var scale = 'style="transform: scale('+this.scale+')"';
            }
            if(award.isAQS) {
                var aqs = KYB.reportData.user.aqs;
                var html = '<div id="awards-stories-img" '+(scale?scale:'')+' class="award-aqs"><div id="award-aqs-title">My Audience Quality Score is&nbsp;'+aqs.value+(aqs.isBetterThanPrc ? ' and that\'s <strong>better than '+Math.round(aqs.isBetterThanPrc)+'% of bloggers' : '')+'</strong></div>' + userInfo +
                '<div id="award-aqs"><div id="award-aqs-value" class="award-aqs--'+aqs.cssClass+'">'+aqs.value+'<small>of 100</small></div><div id="award-aqs-desc--wrap"><div id="award-aqs-desc" class="award-aqs-title--'+aqs.cssClass+'">'+aqs.title+'</div>'+aqs.desc+'</div></div>';
            } else {
                var html = '<div id="awards-stories-img" '+(scale?scale:'')+'>'+userInfo+'<div id="awards-stories-img--label" class="type-'+award.type+'">' +
                    '<div class="achievement-ico achievement-ico-huge achievement-ico-type-'+award.type+' achievement-ico-'+award.subtype+(award.country_code ? ' achievement-with-country' : '')+(award.subtype3 && award.subtype3>0 ? ' achievement-with-category' : '')+'">' +
                        (award.country_code ? '<div class="achievement-country" style="background-image: url('+KYB.staticUrl+'/auditor/img/flags/big/'+award.country_code.toLowerCase()+'.png"></div>' : '') +
                        (award.subtype3 && award.subtype3>0 ? '<div class="achievement-category achievement-category-'+award.subtype3+'"></div>' : '') +
                        (award.type == "3" && !award.country_code && (!parseInt(award.subtype3) || parseInt(award.subtype3)<0) ? '<div class="achievement-ico-global"></div>' : '') +
                    '</div>' +
                '</div>' +
                '<div id="awards-stories-img--info"><div id="awards-stories-img--date">'+award.month+'</div><br>' +
                '<div id="awards-stories-img--title">'+award.title+'</div>' +
                '<div id="awards-stories-img--desc">'+award.subtitle+'</div></div></div>';
            }
            img.innerHTML = html;
            return img.firstChild;
        },
        getAwardData: function() {
            if(KYB.awards.data[this.currImgI]) {
                return KYB.awards.data[this.currImgI];
            } else {
                return {
                    isAQS: true
                }
            }
        },
        next: function() {
            this.currImgI++;
            if(this.currImgI > (this.aqsShow ? KYB.awards.data.length : KYB.awards.data.length - 1)) {
                this.currImgI = 0;
            }
            this.changeImg();

            KYB.tracker.trackEvent('Page Action', {
                'Action': 'tap',
                'Page Id': KYB.pageId,
                'target': 'next award'
            });
        },
        prev: function() {
            this.currImgI--;
            if(this.currImgI < 0) {
                this.currImgI = this.aqsShow ? KYB.awards.data.length : KYB.awards.data.length - 1;
            }
            this.changeImg();

            KYB.tracker.trackEvent('Page Action', {
                'Action': 'tap',
                'Page Id': KYB.pageId,
                'target': 'prev award'
            });
        },
        changeImg: function() {
            var T = this;
            this.$img = this.imgRender(this.getAwardData());
            this.$imgWrap.innerHTML = '';
            this.$imgWrap.appendChild(this.$img);
            this.imgGenerate();
            if(this.isMobile) {
                this.$currPos.innerHTML = (this.currImgI+1);
            }
            var cn = 'awards-nav-progress--item-active';
            if(this.$progressItems) {
                _.each(this.$progressItems, function (p, i) {
                    if(i == T.currImgI) {
                        p.classList.add(cn);
                    } else if(p.classList.contains(cn)) {
                        p.classList.remove(cn);
                    }
                });
            }
        },
        domtoimageP: false,
        imgGenerate: function() {
            var T = this;
            this.imgGenerateF = function () {
                T.jsLibLoaded = true;
                var node = T.$img.cloneNode(true);
                T.$imgH.innerHTML = '';
                node.style.width = '1080px';
                node.style.height = '1920px';
                T.$imgH.appendChild(node);
                T.$download.classList.add('button-preload');
                if(T.domtoimageP) {
                    if(T.img && T.img.onload) {
                        T.img.onload = false;
                    }
                }

                (function () {
                    var promise = domtoimage.toSvg(node, {width: 1080, height: 1920})
                        .then(function (dataUrl) {
                            if(promise != T.domtoimageP) {
                                return false;
                            }
                            T.img = new Image();
                            T.canvas = document.createElement("canvas");
                            T.canvas.width = 1080;
                            T.canvas.height = 1920;

                            T.img.onload = function() {
                                T.domtoimageP = false;
                                var context = T.canvas.getContext('2d');
                                setTimeout(function () {
                                    context.drawImage(T.img, 0, 0);
                                    setTimeout(function () {
                                        T.$download.classList.remove('button-preload');
                                    }, 1000);
                                }, 2000);
                            };

                            T.img.style.display = 'none';
                            T.$imgH.innerHTML = '';
                            T.img.src = dataUrl;
                            window.requestAnimationFrame(function () {
                                T.$imgH.appendChild(T.img);
                            });
                        })
                        .catch(function (error) {
                            console.error('oops, something went wrong!', error);
                        });
                    T.domtoimageP = promise;
                })();
            };
            if(typeof(T.jsLibLoaded) == 'undefined') {
                T.jsLibLoaded = false;
                KYB.loadFile('/s/auditor/dist/js/libs/dom-to-image-more.js', 'js', this.imgGenerateF);
            } else if(T.jsLibLoaded) {
                this.imgGenerateF();
            }
        },
        popupShow: function (source) {
            var T = this;
            this.currImgI = 0;
            var award = this.getAwardData();
            var $html = document.createElement('div');
            $html.id = 'awards-stories-popup';
            this.$imgWrap = document.createElement('div');
            this.$imgWrap.id = 'awards-stories-img-wrap';
            var body = document.body;

            this.aqsShow = KYB.reportData.user.aqs && KYB.reportData.user.aqs.value > 60 ? true : false;

            this.$download = document.createElement('div');
            this.$download.id = 'awards-stories-download';
            this.$download.className = 'button button-outline button-small button-preload';
            this.$download.innerHTML = '<i class="fas fa-cloud-download-alt">&#xf381;</i> '+__('Download');

            var awardsLength  = KYB.awards.data.length;
            if(awardsLength > 1) {
                this.$next = document.createElement('div');
                this.$next.id = 'awards-next';
                this.$next.className = 'awards-nav-btn';
                this.$next.innerHTML = '<i class="far fa-angle-right">&#xf105;</i>';
                this.$next.addEventListener('click', function () {
                    T.next();
                });
                this.$prev = document.createElement('div');
                this.$prev.id = 'awards-prev';
                this.$prev.className = 'awards-nav-btn';
                this.$prev.innerHTML = '<i class="far fa-angle-left">&#xf104;</i>';
                this.$prev.addEventListener('click', function () {
                    T.prev();
                });

                var $progress = document.createElement('div');
                $progress.id = 'awards-nav-progress';
                var progressItemsHtml = '';
                for(var i=0; i < (this.aqsShow ? awardsLength+1 : awardsLength); i++) {
                    progressItemsHtml += '<div class="awards-nav-progress--item'+(i==0 ? ' awards-nav-progress--item-active' : '')+'"></div>';
                }
                $progress.innerHTML = progressItemsHtml;
                this.$progressItems = $progress.querySelectorAll('.awards-nav-progress--item');
            }


            if(T.isMobile) {
                var $back = document.createElement('div');
                $back.id = 'awards-nav-close';
                $back.innerHTML = '<i class="far fa-angle-left">&#xf104;</i> '+__('Back');
                $back.addEventListener('click',function() {
                    T.popup.hide();
                });
                var $pos = document.createElement('div');
                $pos.id = 'awards-nav-position';
                $pos.innerHTML = ' of '+(KYB.awards.data.length+1);
                this.$currPos = document.createElement('span');
                this.$currPos.innerText = '1';
                $pos.insertBefore(this.$currPos, $pos.firstChild);
                $html.appendChild($back);
                $html.appendChild($pos);
            } else {
                if(!Cookies.get('award_promo')) {
                    var $promoBtn = document.createElement('div');
                    $promoBtn.className = 'button button-outline';
                    $promoBtn.innerText = __('Got it');
                    $promoBtn.addEventListener('click',function () {
                        Cookies.set('award_promo', true, {expires: 365, path: '/'});
                        $promoBtn.parentNode.remove();
                    });
                    var promo = document.createElement('div');
                    promo.id = 'award-promo';
                    promo.appendChild($promoBtn);
                    $html.appendChild(promo);
                }
            }

            if(!this.$imgH) {
                this.$imgH = document.createElement('div');
                this.$imgH.id = 'awards-img-h';
                body.prepend(this.$imgH);
            }


            this.popup = KYB.popup.show({
                html: $html,
                cssClass: 'awards-stories-popup',
                onOpen: function (t) {
                    document.body.classList.add('awards-stories-popup--open');
                    setTimeout(function () {
                        if(T.isMobile) {
                            T.scale = (window.innerHeight - (49+75)) / 598;
                            if(T.scale >= 0.99) {
                                T.scale = false;
                            }
                        }
                        T.$img = T.imgRender(award);
                        T.imgGenerate();
                        T.$imgWrap.appendChild(T.$img);
                        $html.appendChild(T.$download);
                        $html.insertAdjacentHTML('beforeend', '<div id="awards-stories-user"><img src="'+KYB.reportData.user.ava+'">'+KYB.reportData.user.username+'</div>');
                        if($progress) {
                            $html.appendChild($progress);
                        }
                        $html.appendChild(T.$imgWrap);
                        if(T.$next) {
                            $html.appendChild(T.$next);
                            $html.appendChild(T.$prev);
                        }

                        if(T.isMobile) {
                            T.slideInit(t);
                        }
                    },T.isMobile?100:0);
                },
                onClose: function () {
                    document.body.classList.remove('awards-stories-popup--open');
                }
            });

            this.$download.addEventListener('click',function() {
                var link = document.createElement('a');
                var d = T.canvas.toDataURL('image/png');
                var dd = dataURItoBlob(d)
                var ddd = URL.createObjectURL(dd)
                link.setAttribute('href', ddd);
                link.setAttribute('download', 'HypeAuditor_Award');
                setTimeout(function () {
                    link.dispatchEvent(new MouseEvent('click'));
                    T.img.style.display = 'none';
                }, 200);

                var a = T.getAwardData();

                KYB.tracker.trackEvent('Download Award', {
                    'Page Id': KYB.pageId,
                    'award type': (a.isAQS ? 'aqs' : a.type == "1" ? 'fraud free' : a.type == "2" ? 'quality' : 'top'),
                    username: KYB.reportData.user.username
                });
            });

            KYB.tracker.trackEvent('View Awards', {
                'Page Id': KYB.pageId,
                'source': source ? source : 'right-side promo',
                username: KYB.reportData.user.username
            });
        },
        slideInit: function(popup) {
            var wrap = popup.$wrap;
            var $content = wrap.querySelector('#awards-stories-img-wrap');
            var content = $content;
            var $parent = $content.parentNode;

            var startX = false;
            var width = wrap.offsetWidth;
            var to;
            var T = this;
            wrap.addEventListener("touchstart", function (e) {
                to = 0;
                startX = e.changedTouches[0].clientX;
                content.classList.add('touchStart');
            }, false);
            wrap.addEventListener("touchend", function () {
                startX = false;
                content.classList.remove('touchStart');
                if(!to) {return false;}
                if(Math.abs(to) > width/6) {
                    var clone = $content.cloneNode(true);
                    clone.style.position = 'absolute';
                    clone.style.top = '49px';
                    clone.style.height = content.offsetHeight+'px';
                    $parent.appendChild(clone);
                    content.classList.add('touchStart');
                    content.style.opacity = 0;
                    content.style.transform = 'rotateY('+(to > 0 ? -60 : 60)+'deg) translateX('+(to < 0 ? to*-1+200 : to*-1-200)+'px)';
                    window.requestAnimationFrame(function () {
                        clone.style.transform = 'rotateY(' + (to < 0 ? -60 : 60) + 'deg) translateX(' + (to < 0 ? -width : width) + 'px)';
                        clone.style.opacity = 0;
                    });

                    if(to < 0) {
                        T.next();
                    } else {
                        T.prev();
                    }

                    window.requestAnimationFrame(function () {
                        content.classList.remove('touchStart');
                        content.style.transform = 'none';
                        content.style.opacity = 1;
                    });

                    setTimeout(function () {
                        clone.remove();
                    }, 600);
                } else {
                    content.style.transform = 'none';
                    content.style.opacity = 1;
                }
            }, false);
            wrap.addEventListener("touchcancel", function () {
                startX = false;
            }, false);
            wrap.addEventListener("touchmove", function (e) {
                var currX = e.changedTouches[0].clientX;
                to = currX-startX;
                e.preventDefault();
                var direction = to > 0 ? 1 : -1;
                var to3d = (Math.abs(to) / width) * 60 * direction;
                if (to3d < -60 || to3d > 60) {
                  return false;
                }
                content.style.transform = 'rotateY('+to3d+'deg) translateX('+(to*1.5)+'px)';
                content.style.opacity = 1-Math.abs(to)/(width/2);
            }, false);
        }
    },
    popupShow: function (data) {
        var link = 'hypeauditor.com/instagram/'+KYB.reportData.user.username;
        var text = 'Wow! I have got "'+data.title+'" award in @hypeauditor! '+link;
        this.popup = KYB.popup.show({
            html: '<div id="new-award--popup-header"></div><div id="new-award-img"><div class="achievement-ico achievement-ico-huge achievement-ico-type-'+data.type+' achievement-ico-'+data.subtype+(data.country_code ? ' achievement-with-country' : '')+(data.subtype3 && data.subtype3>0 ? ' achievement-with-category' : '')+'">' +
                    (data.country_code ? '<div class="achievement-country" style="background-image: url('+KYB.staticUrl+'/auditor/img/flags/big/'+data.country_code.toLowerCase()+'.png"></div>' : '') +
                    (data.subtype3 && data.subtype3>0 ? '<div class="achievement-category achievement-category-'+data.subtype3+'"></div>' : '') +
                    (data.type == "3" && !data.country_code && (!parseInt(data.subtype3) || parseInt(data.subtype3)<0) ? '<div class="achievement-ico-global"></div>' : '') +
                '</div></div>' +
                '<h3>'+__('Congratulations!')+'</h3><p>'+__('You have a new award')+'</p><p class="achievements-popup--title">'+data.title+'</p><small>'+__('Share your award to show that your audience is high-quality')+'</small><div class="achievements-popup-share">' +
                '<div class="kyb-award-share--code-btn kyb-award-share--code-btn-fb st-custom-button" data-network="facebook" data-title=\''+text+'\' data-url="https://'+link+'"><i class="fab fa-facebook-square">&#xf082;</i> '+__('Share')+'</div>' +
                '<div class="kyb-award-share--code-btn kyb-award-share--code-btn-t"><i class="fab fa-twitter-square">&#xf081;</i> '+__('Tweet')+'</div>' +
            '</div><span class="kyb-jslink" onclick="KYB.awards.popup.hide();">'+__('Skip')+'</span>',
            cssClass: 'achievements-popup',
            onOpen: function (t) {
                t.$content.insertAdjacentHTML('beforeend', '<script type="text/javascript" src="//platform-api.sharethis.com/js/sharethis.js#property=5b16af19467fef00119b9d44&product=custom-share-buttons"></script>');
                if (!window.twttr) {
                    window.twttr = (function (d, s, id) {
                        var js, fjs = d.getElementsByTagName(s)[0],
                            t = window.twttr || {};
                        if (d.getElementById(id)) return t;
                        js = d.createElement(s);
                        js.id = id;
                        js.src = "https://platform.twitter.com/widgets.js";
                        fjs.parentNode.insertBefore(js, fjs);

                        t._e = [];
                        t.ready = function (f) {
                            t._e.push(f);
                        };

                        return t;
                    }(document, "script", "twitter-wjs"));
                }

                t.$content.querySelector('.kyb-award-share--code-btn-t').addEventListener('click', function (e) {
                    e.preventDefault();
                    var twitterWindow = window.open('https://twitter.com/share?url=' + link + '&text=' + encodeURIComponent(text), 'twitter-popup', 'height=350,width=600');
                    if (twitterWindow.focus) {
                        twitterWindow.focus();
                    }

                    KYB.tracker.trackEvent('Page Action', {
                        'Page Id': KYB.pageId,
                        'Action': 'tap',
                        'target': 'share award from popup'
                    });
                    return false;
                });
                t.$content.querySelector('.kyb-award-share--code-btn-fb').addEventListener('click', function () {
                    KYB.tracker.trackEvent('Page Action', {
                        'Page Id': KYB.pageId,
                        'Action': 'tap',
                        'target': 'share award from popup'
                    });
                });

                KYB.tracker.trackEvent('View Promo', {
                    'Page Id': KYB.pageId,
                    'type': 'Report My Award Popup',
                    username: KYB.reportData.user.username
                });
            }
        });
    }
};
