'use strict';
(function(define) {
    return define(function() {
        var pluralRe = /^Plural-Forms:\s*nplurals\s*=\s*(\d+);\s*plural\s*=\s*([^a-zA-Z0-9\$]*([a-zA-Z0-9\$]+).+)$/im;

        function format(s, ctx) {
            return s.replace(/(^|.)?\{([^\}]+)\}/g, function(match, prev, k) {
                if (prev === '\\') {
                    return '{' + k + '}';
                }
                prev = prev || ""; // should be empty string if something like `undefined`
                return prev + ctx[k.split('#')[0].trim()];
            });
        }


        function parsePlural(header) {
            var rv = {
                pluralNum: 2,
                isPlural: function(n) {
                    return n !== 1;
                }
            };
            if (!header) {
                return rv;
            }

            var match = header.match(pluralRe);
            if (!match) {
                return rv;
            }

            rv.pluralNum = parseInt(match[1], 10);

            if (rv.pluralNum == 1) {
                rv.isPlural = function () {return 0;};
                return rv;
            }

            var expr = match[2];
            var varName = match[3];

            var code = "(function (" + varName + ") { return " + expr + " })";
            try {
                rv.isPlural = eval(code);
            } catch (e) {
                console.log("Could not evaluate: " + code);
            }
            return rv;
        }

        function gettrans(messages, isPlural, msg1, msg2, num) {
            if (!messages || !messages[msg1]) {
                return num !== undefined && isPlural(num) ? msg2 : msg1;
            }

            var trans = messages[msg1];

            if (msg2 === undefined && num === undefined) {
                return typeof trans === 'string' ? trans : trans[0];
            }

            if (num !== undefined && typeof trans === 'string') {
                console.error(format('Plural number ({num}) provided for "{msg1}", ' +
                    'but only singular translation exists: {trans}',
                    {num: num, msg1: msg1, trans: trans}));
                return isPlural(num) ? msg2 : msg1;
            }

            return trans[+isPlural(num)];
        }

        return function(messages) {
            function puttext(msg1, msg2, num, ctx) {
                // in case of `puttext(msg, ctx);`
                if (typeof msg2 === 'object' && num === undefined &&
                    ctx === undefined) {
                    ctx = msg2;
                    msg2 = undefined;
                }

                var text = gettrans(puttext.messages, puttext.plural,
                    msg1, msg2, num);
                if (ctx) {
                    return format(text, ctx);
                }
                return text;
            }

            puttext.format = format;
            puttext.setMessages = function(messages) {
                puttext.messages = messages;
                var parsed = parsePlural(messages && messages[""]);
                puttext.pluralNum = parsed.pluralNum;
                puttext.plural = parsed.isPlural;
            };
            puttext.setMessages(messages);

            return puttext;
        };
    });
})(typeof define !== 'undefined' ? define : function(factory) {
    if (typeof module !== 'undefined' && typeof exports !== 'undefined') {
        return module.exports = factory();
    } else {
        return window.puttext = factory();
    }
});
window.__ = puttext(window.locale);
window.__n = puttext(window.locale);

(function (document, window) {
    var self = {};
    function _submitUser(data, suggester) {
        if (data.redirect) {
            var goToReport = function (url) {
                if(typeof(hype)!='undefined') {
                    hype.router.navigate(url, 1);
                    var pre = document.querySelector('.kyb-search-bar--results.preload');
                    if(pre) {
                        pre.classList.remove('preload');
                    }
                } else {
                    window.location.href = url;
                }
            };
            goToReport(data.redirect);
        }
        if(data.type != 'ig' && data.link) {
            var link = KYB.domain + KYB.baseUrl + (!PRODUCTION&&KYB.user ? 'app/' : '') + data.link;
            if(typeof(hype)!='undefined') {
                hype.router.navigate('https://' + link, 1);
            } else {
                window.location.href = 'https://' + (PRODUCTION&&KYB.user ? 'app.' : '') + link;
            }
        }
    };


    self = {
        btnTarget: null,
        init: function() {
            if (this.isSourceEmail) { // remove params
                var pathname = window.location.pathname;
                window.history.pushState('page2', 'Title', pathname);
            }

            //self.time.init();
            self.btns();

            this.initUserForm();
            this.initToggleDrop();
/*
TODO
            $(document).ajaxSend(function(event, request, settings) {
                if (self.btnTarget) self.waiting(self.btnTarget, 'before');
            });
            $(document).ajaxSuccess(function(event, request, settings) {
                if (self.btnTarget) self.waiting(self.btnTarget, 'success');
                self.btnTarget = null;
            });
*/
            self.cmdKeyPressed = false;
            document.addEventListener('keydown', function (e) {
                var key = e.which || e.keyCode;
                if (key == 91 || key == 93 || key == 17 || key == 224) self.cmdKeyPressed = true;
            });
            document.addEventListener('keyup', function () {
                self.cmdKeyPressed = false;
            });


            self.customFields.init();

            var headerClassFlag = 0;
            var body = document.body;
            var onScroll = function (e) {
                if(window.scrollY) {
                    if(!headerClassFlag) {
                        headerClassFlag = 1;
                        body.classList.add('top-menu-fixed');
                    }
                } else {
                    if(headerClassFlag) {
                        headerClassFlag = 0;
                        body.classList.remove('top-menu-fixed');
                    }
                }
            };
            window.requestAnimationFrame(onScroll);
            window.addEventListener('scroll', onScroll);

            var topMenu = document.getElementsByClassName('kyb-top-menu--links')[0];
            var topMenuLinks = document.getElementsByClassName('kyb-top-menu__el');
            var lastHoveredLinkI = 0;
            var activeLink = _.find(topMenuLinks, function (l) {
                if(l.classList.contains('active')) {
                    return true;
                }
            });
            var activeLinkI = activeLink ? _.indexOf(topMenuLinks, activeLink) : 0;
            var currHoveredLinkI = activeLinkI;
            _.each(topMenuLinks, function (l) {
                l.addEventListener('mouseenter', function (e) {
                    var el = e.currentTarget;
                    currHoveredLinkI = _.indexOf(topMenuLinks, el);
                    var cn = 'kyb-top-menu__el';
                    el.classList.remove(cn+'-a', cn+'-r', cn+'-l');
                    if(currHoveredLinkI > lastHoveredLinkI) {
                        el.classList.add(cn+'-l');
                    } else {
                        el.classList.add(cn+'-r');
                    }
                    if(activeLink) {
                        var cn2 = 'kyb-top-menu--links';
                        topMenu.classList.remove(cn2+'-l');
                        if(currHoveredLinkI < activeLinkI) {
                            topMenu.classList.add(cn2+'-l');
                        }
                    }
                    window.requestAnimationFrame(function () {
                        setTimeout(function () {
                            el.classList.add(cn+'-a');
                            el.classList.add('hover');
                        });
                    });
                    lastHoveredLinkI = currHoveredLinkI;
                });
                l.addEventListener('mouseleave', function (e) {
                    var el = e.currentTarget;
                    var cn = 'kyb-top-menu__el';
                    var leaveI = _.indexOf(topMenuLinks, el);
                    setTimeout(function () {
                        el.classList.remove(cn+'-r', cn+'-l');
                        if(currHoveredLinkI > leaveI) {
                            el.classList.add(cn+'-r');
                        } else {
                            el.classList.add(cn+'-l');
                        }
                        el.classList.remove('hover');
                    }, 250);
                });
                if(activeLink) {
                    topMenu.addEventListener('mouseleave', function (e) {
                        lastHoveredLinkI = activeLinkI;
                        currHoveredLinkI = activeLinkI;
                    });
                }
            });
        },
        btns: function ($target) {
            if(!$target) {
                $target = window.document;
            }
            $target.addEventListener('mouseup', function (e) {
                var t = e.target.closest('.js-btn-loader');
                if(t) {
                    self.btnTarget = t;
                }
            });
        },
        waiting: function ($target, status) {
            if (status == 'success') {
                $target.classList.remove('button-preload');
            }
            if (status == 'before') {
                $target.classList.add('button-preload');
            }
        },
        rand: function(min, max) {
            return max ? Math.floor(Math.random() * (max - min + 1)) + min : Math.floor(Math.random() * (min + 1));
        },
        fsIndentify: function () {
            var user = self.user;
            if (user) {
                if(self.isOurIp) {
                    console.log(FS, user);
                }
                FS.identify(user.user_id, {
                    displayName: user.name,
                    email: user.email
                });
                FS.setUserVars({
                    userName_str: user.name,
                    page_srt: KYB.pageId,
                    tokens_int: user.tokens,
                    payable_int: user.payable,
                    lang_srt: user.lang,
                    spentTokens_int: user.spentTokens,
                    boughtTokens_int: user.boughtTokens
                });
            }
        },
        fullstory: {
            config: function() {
                //return (self.user && (self.user.payable && self.user.spentTokens > 50)) || self.fullstoryRecord ? 1 : 500
                return self.fullstoryRecord ? 1 : 500
            },
            init: function(type, params) {
                if(1 || KYB.isOurIp || this.isInit) {
                    return false;
                }
                if(!Cookies.get('fs_inited')) {
                    if(KYB.rand(1,this.config()) != 1) {
                        return false;
                    }
                }
                KYB.fsType = type;
                this.start(params);
                this.isInit = true;
            },
            start: function(params) {
                params = params || {};
                window['_fs_debug']     = params.debug || false;
                window['_fs_host']      = params.host ||'fullstory.com';
                window['_fs_org']       = params.org || '8MY4Y';
                window['_fs_namespace'] = params.namespace || 'FS';
                (function(m,n,e,t,l,o,g,y){
                    if (e in m) {if(m.console && m.console.log) { m.console.log('FullStory namespace conflict. Please set window["_fs_namespace"].');} return;}
                    g=m[e]=function(a,b,s){g.q?g.q.push([a,b,s]):g._api(a,b,s);};g.q=[];
                    o=n.createElement(t);o.async=1;o.crossOrigin='anonymous';o.src='https://'+_fs_host+'/s/fs.js';
                    o.addEventListener('load', KYB.fsIndentify);
                    y=n.getElementsByTagName(t)[0];y.parentNode.insertBefore(o,y);
                    g.identify=function(i,v,s){g(l,{uid:i},s);if(v)g(l,v,s)};g.setUserVars=function(v,s){g(l,v,s)};g.event=function(i,v,s){g('event',{n:i,p:v},s)};
                    g.shutdown=function(){g("rec",!1)};g.restart=function(){g("rec",!0)};
                    g.log = function(a,b) { g("log", [a,b]) };
                    g.consent=function(a){g("consent",!arguments.length||a)};
                    g.identifyAccount=function(i,v){o='account';v=v||{};v.acctId=i;g(o,v)};
                    g.clearUserCookie=function(){};
                })(window,document,window['_fs_namespace'],'script','user');

                Cookies.set('fs_inited', 1, { expires: 1, path: '/' });
            }
        },
        tracker: {
            pageLoad: function (params, eventName) {
                var onLoad = function () {
                    if(!params) {
                        params = {};
                    }
                    params.url = window.location.href;
                    if(!params['Page Id']) {
                        params['Page Id'] = KYB.pageId;
                    }
                    if(typeof(params['Load Time'])=='undefined') {
                        if(typeof(hype)!='undefined' && hype.controllers && hype.controllers.startLoadDate) {
                            params['Ajax Time'] = parseFloat(((Date.now() - hype.controllers.startLoadDate) / 1000).toFixed(2));
                        }
                        if(KYB.performance) {
                            params['Response Time'] = parseFloat((KYB.performance.responseTime/1000).toFixed(2));
                            params['Render Time'] = parseFloat((KYB.performance.renderTime/1000).toFixed(2));
                            params['Load Time'] = parseFloat((KYB.performance.loadTime/1000).toFixed(2));
                            if(params['Ajax Time']) {
                                params['Load Time'] = parseFloat((params['Load Time']+params['Ajax Time']).toFixed(2));
                            }
                            params['Full Time'] = parseFloat((KYB.performance.fullTime/1000).toFixed(2));
                            KYB.performance = false;
                        } else {
                            if(params['Ajax Time']) {
                                params['Load Time'] = params['Ajax Time'];
                            } else {
                                params['Load Time'] = 'Empty performance data';
                            }
                        }
                    }
                    KYB.tracker.trackEvent(eventName ? eventName : 'Page Load', params);
                };
                if(KYB.performance || typeof(KYB.performance)!='undefined') {
                    onLoad();
                } else {
                    window.addEventListener("load", onLoad);
                }
            },
            setUserId: function(userId){
                if(self.amplitudeInstance) {
                    self.amplitudeInstance.setUserId(userId);
                }
            },
            // TODO
            deleteAlreadySetProperties: function(properties){
                var cookieProperties = Cookies.get('a_p');
                if(!cookieProperties) {return properties;}
                var newProperties = {};

                    _.each(properties, function (v,k) {
                        if(!cookieProperties[k] || (cookieProperties[k] != v && k != 'source')) {
                            newProperties[k] = v;
                        }
                    });

                return newProperties;
            },
            setProperties: function(properties){
                if(!KYB.amplitudeInstance) {return false;}
                KYB.amplitudeInstance.setUserProperties(properties);
            },
            setOnceProperties: function(properties){
                if(!KYB.amplitudeInstance) {return false;}
                var identify = new amplitude.Identify();
                _.each(properties, function (value, key) {
                    identify.setOnce(key, value);
                });
                KYB.amplitudeInstance.identify(identify);
            },
            setUserProperty: function(properties){
                if(!KYB.amplitudeInstance) {return false;}
                var identify = new amplitude.Identify();
                _.each(properties, function (value, key) {
                    identify.append(key, [value]);
                });
                KYB.amplitudeInstance.identify(identify);
            },
            saveProperties: function (properties) {
                var cookieProperties = Cookies.get('a_p') || {};

                _.extend(cookieProperties, properties);
                Cookies.set('a_p', cookieProperties, {expires: 180, path: '/'});
            },
            trackEvent: function(evName, eventProperties, skipAmplitude, amplitudeEventCallback){
                if(!KYB.amplitudeInstance) {
                    if(amplitudeEventCallback) {
                        amplitudeEventCallback(false);
                    }
                    return false;
                }
                KYB.amplitudeInstance.logEvent(evName, eventProperties || {}, amplitudeEventCallback || false);

                if(evName == 'View Report Preview') {
                    evName += ' (' + (!KYB.user ? 'non-' : '') + 'reg)';
                } else if(evName == 'Page Action' && eventProperties.target) {
                    let rdText = 'Request Demo btn';
                    if(eventProperties.target.indexOf(rdText) !== -1) {
                        evName = rdText;
                    }
                }

                dataLayer.push({'event': 'logEventNoAmplitude', 'eventType': evName, 'eventProperties': eventProperties});
            }
        },
        // required jquery.validate.js
        formValidation: (function(){
            return {
                init: function($form, config){
                    config = config || {};

                    var self = this;
                    var $requiredFields = $form.find(':input[required]');
                    this.$form = $form;
                    this.$submit = $form.find('button[type="submit"]');

                    if(Object.getOwnPropertyNames(config).length === 0) {
                        if (this.$submit.length === 0 || $requiredFields.length === 0) {
                            return;
                        }
                    }

                    function checkSendPrevent(e) {
                        if (!$form.isValid) {
                            e.preventDefault();
                            e.stopImmediatePropagation();
                        } else {
                            if(config.beforeSubmit) {
                                config.beforeSubmit(e);
                            }
                        }
                    }

                    $.extend(this, config);
                    $form.validate($.extend({
                        showErrors: function(errorMap, errorList) {
                            this.defaultShowErrors()
                        },
                        onkeyup: function(element) {
                            var el = $(element);
                            if(el.attr("aria-invalid")) {
                                el.valid();
                            }
                            setTimeout(function() {
                                self.checkSubmit($form);
                            }, 0);
                        }
                    }, config));

                    $requiredFields.on('change', function(e) {
                        setTimeout(function() {
                            self.checkSubmit($form);
                        }, 0);
                    });

                    $form.find('select[required]').on('change', function(){
                        var el = $(this);
                        if(el.attr("aria-invalid")) {
                            el.valid();
                        }
                        setTimeout(function() {
                            self.checkSubmit($form);
                        }, 0);
                    });

                    $form.on('submit', checkSendPrevent);
                    this.checkSubmit($form);
                },

                checkSubmit: function($form) {

                    if(!$form) {
                        $form = this.$form;
                    }
                    var validate = $form.validate();
                    $form.isValid = validate.checkForm();
                    validate.submitted = {}; // Reset immediate form field checking mode

                    if ($form.isValid) {
                        this.$submit.css('opacity', '1').removeAttr('disabled').removeClass('js-disabled');
                        if (this.onerror && this.$submit.next('.js-validate-error').length){
                            this.$submit.next('.js-validate-error').remove();
                        }
                    } else {
                        this.$submit.css('opacity', '0.5').addClass('js-disabled');
                        if (this.onerror){
                            this.$submit.next('.js-validate-error').remove();
                            this.$submit.after('<div class="js-validate-error text-danger" style="margin-top:8px;">' + this.onerror + '</div>');
                        }
                    }
                }
            }
        })(),
        notify: function(message, type, params){
            var wrap = document.createElement('DIV');
            var close = document.createElement('DIV');
            wrap.setAttribute('class', 'notify'+(type ? ' '+type: ''));
            close.setAttribute('class', 'fas fa-times');
            wrap.innerHTML = message;
            close.innerHTML = '&#xf00d';
            wrap.appendChild(close);
            document.body.appendChild(wrap);
            setTimeout(function () {
                wrap.remove();
            }, 5000);
            close.addEventListener('click', function () {
                wrap.remove();
            });
        },
        initUserForm: function(selector){
            selector = selector || '.js-username-form';
            var $forms = document.querySelectorAll(selector);
            if ($forms.length === 0) return false;
            _.each($forms, function(form) {
                self.channelsSuggest.init(form, {
                    onSubmit: _submitUser,
                    showVerified: true,
                });
            });
        },
        initSignupForm: function(options, parent, isLoginForm){
            var _this = this;
            var selector = '.js-signup-form';
            if(parent) {
                var $form = parent.querySelector(selector);
            } else {
                var $form = document.querySelector(selector);
            }
            if(!$form) {return false;}
            var btn = $form.querySelector('.js-btn-loader');

            KYB.loadFile('/s/auditor/dist/js/libs/jquery.validate.min.js', 'js', function () {
                KYB.loadFile('/s/auditor/dist/js/validate-custom-methods.js', 'js', function () {
                    self.formValidation.init($($form), {
                        errorClass: 'hype-error',
                        errorPlacement: function ($error, $element) {
                            $element.closest('.js-error-wrap').append($error);
                        }
                    });
                    KYB.signupSubmitEvent = function(e) {
                        e.preventDefault();
                        if (!formSent) {
                            btn.classList.add('button-preload');
                            if(typeof(grecaptcha)!='undefined' && !isLoginForm) {
                                grecaptcha.ready(function() {
                                    grecaptcha.execute(KYB.recaptchaId, {action: 'signup'}).then(function(token) {
                                        ajaxSubmit(token);
                                    });
                                    if(typeof(KYB.recaptchaId)=='undefined') {
                                        KYB.tracker.trackEvent('Signup Error', {
                                            'Page Id': KYB.pageId,
                                            'error text': 'Captcha missing ID',
                                            'email': _this.currentEmail,
                                            'url': window.location.href
                                        });
                                    }
                                });
                                document.getElementById('recaptcha').classList.add('show');
                            } else {
                                ajaxSubmit();
                            }
                        }
                    };
                    $form.addEventListener('submit', KYB.signupSubmitEvent);
                });
            });


            var formSent = 0 ;
            var ajaxSubmit = function(token, visibleCaptcha) {
                formSent = 1;
                var fields = $form.querySelectorAll('[name]');
                var formData = {};
                _.map(fields, function (field) {
                    if(field.value) {
                        if(field.name == 'email') {
                            _this.currentEmail = field.value;
                        }
                        formData[field.name] = field.value;
                    }
                });
                formData.device_id = typeof(KYB.deviceId) != 'undefined' ? KYB.deviceId : false;
                if(options && options.r) {
                    formData.r = options.r;
                }
                if(token) {
                    formData.token = token;
                }
                if(visibleCaptcha) {
                    formData.visible_captcha = true;
                }
                KYB.post($form.action, formData).then(function (data) {
                    formSent = 0;
                    if (data.success) {
                        if (data.user_id) {
                            // signup
                            KYB.tracker.setUserId(data.user_id);
                            KYB.tracker.setProperties({'Email' : _this.currentEmail});

                            if (typeof Intercom === 'function') {
                                Intercom('boot', {
                                    app_id: KYB.intercomID,
                                    name: $form.querySelector('[name="name"]').value,
                                    email: _this.currentEmail,
                                    user_id: data.user_id || 0
                                });
                                Intercom('update');
                            }

                            if(data.login) {
                                if(options && options.r) {
                                    document.location.href = KYB.baseUrl+options.r;
                                } else {
                                    document.location.href = 'https://app.hypeauditor.com/';
                                }
                                return true;
                            }
                        } else {
                            // login
                            if(data.auth_res == 'Email sent') {
                                // by magiclink

                            } else {
                                // by password
                                if(options && options.r) {
                                    document.location.href = KYB.baseUrl+options.r;
                                } else {
                                    document.location.href = 'https://app.hypeauditor.com/';
                                }
                            }
                        }

                        if(data.email_link) {
                            var emailLink = data.email_link;
                        } else {
                            var emailLink = 'http://'+_this.currentEmail.split('@')[1];
                        }
                        $('#login-form-wrap', parent?parent:false).hide();
                        $('#kyb-email-val', parent?parent:false).text(_this.currentEmail);
                        $('#kyb-email-link', parent?parent:false).attr('href', emailLink);
                        if(isLoginForm) {
                            $('#kyb-email-link-block', parent?parent:false).show();
                        } else {
                            $('#login-container--bottom').hide();
                            if(data.user_id) {
                                hype.roleChoose.fd = data.fd;
                                hype.roleChoose.user_id = data.user_id;
                            }

                            if(parseInt(formData.company_size)) {
                                $('#login-choose-role', parent?parent:false).show();
                            } else {
                                // influ
                                hype.roleChoose.set(2);
                                document.getElementById('kyb-email-link-block').style.display = 'block';
                            }
                        }

                        if(typeof(exitIntentPopup) != 'undefined' && exitIntentPopup.showEvent) {
                            document.removeEventListener("mouseout", exitIntentPopup.showEvent);
                        }
                    }
                    btn.classList.remove('button-preload');
                    try {
                        if (!data.success && data.error) {
                            KYB.tracker.trackEvent('Signup Error', {
                                'Page Id': KYB.pageId,
                                'error text': data.error_type ? data.error_type : data.error,
                                'email': _this.currentEmail,
                                'url': window.location.href
                            });
                            var $errPlace = document.getElementById('hype-login-error');
                            var errorContent = '<label class="hype-login-error fas-before">' + data.error + (data.error_type == 'already_reg' ? '&nbsp;<strong class="kyb-jslink" onclick="KYB.resetPassword(\''+_this.currentEmail+'\', \'login-form-wrap\');">'+__('Send password reset link')+'</strong>' : '') +'</label>';
                            $errPlace.innerHTML = errorContent;

                            if(data.error_type == 'captcha') {
                                $form.classList.add('captchaStep');
                                document.getElementById('recaptcha').remove();
                                var recaptchaId = grecaptcha.render('recaptchaSignup', {
                                    sitekey: '6Lf5MfYUAAAAAHobQOpu2UvBBfxYfp-G-jNm3Tjk',
                                    badge: 'inline',
                                    callback: function (t) {
                                        $errPlace.innerHTML = '';
                                        ajaxSubmit(t, true);
                                    }
                                });
                                KYB.tracker.trackEvent('View Captcha');
                                grecaptcha.execute(recaptchaId, {});
                            }
                        }
                    }
                    catch(err){}
                });
            };


            KYB.trackUserAction.init('#kyb-email-link, #kyb-email-resend-link');
        },
        showError: function($errPlace, text, type){
            var inp = $errPlace.querySelectorAll('input');
            $errPlace.insertAdjacentHTML('afterbegin', '<label for="'+ inp[inp.length-1].name +'" class="kyb-error">' + text + (type == 'already_reg' ? '&nbsp;<strong class="kyb-jslink" onclick="KYB.resetPassword(\''+this.currentEmail+'\', \'login-form-wrap\');">'+__('Send password reset link')+'</strong>' : '') +'</label>');
        },
        initToggleDrop: function(){
            var $btn = document.getElementsByClassName('js-kyb-toggle');
            var $body = document.body;
            _.each($btn, function (b) {
                b.addEventListener('click', function (e) {
                    e.stopPropagation();
                    if (!b.classList.contains('show')) {
                        $body.addEventListener('click', function(){
                            $body.classList.remove('popup-showed');
                            b.classList.remove('show');
                        }, {once: true});

                        $body.classList.add('popup-showed');
                        b.classList.add('show');
                    } else {
                        b.classList.remove('show');
                    }
                });
                b.addEventListener('touchstart', function (e) {
                    e.stopPropagation();
                },  { passive: true } );
            });
        },
        trackScroll: {
            init: function () {
                document.addEventListener('scroll', function(){
                    setTimeout(function () {
                        KYB.tracker.trackEvent('Page Action', {
                            'Page Id': KYB.pageId ? KYB.pageId : 'unset',
                            'Action': 'scroll',
                            'target': 'body'
                        });
                    }, 250);
                }, {
                    once: true
                });
            }
        },
        trackUserAction: (function(){
            var _sendEvent = function(e){
                if (!e.currentTarget) return;
                var targetName = e.currentTarget.getAttribute('data-track-target');
                if (!targetName) return;
                var actionName = 'tap';

                var params = {'Page Id': KYB.pageId ? KYB.pageId : 'unset', 'Action': actionName, 'target': targetName};
                var sendEvBefore = e.currentTarget.hasAttribute('data-pd');
                if (!sendEvBefore) {
                    KYB.tracker.trackEvent('Page Action', params);
                    return;
                }
                e.preventDefault();
                var href = e.currentTarget.getAttribute('href');
                KYB.tracker.trackEvent('Page Action', params, false, function(){
                    window.location = href;
                });
            };

            return {
                init: function($trackEls) {
                    _.each($trackEls.split(','), function(selector) {
                        _.each(document.querySelectorAll(selector), function (s) {
                            s.addEventListener('click', _sendEvent);
                        });
                    });
                },
                /*detouch: function($selector) {
                    if (!$selector || $selector.length === '0') return false;
                    $('body').off('click', $selector, _sendEvent)
                }*/
            }
        })(),
        channelsSuggest: {
            settings: {
                action: 'request',
                btnText: __('Check'),
                placeholder: false,
                type: false,
                recentSearch: true,
                keywords: false,
                hideSearch: false,
                showVerified: false,
                onSelect: function () {},
                onInput: function () {},
            },
            activeItem: {},
            init: function (wrap, options) {
                if(wrap.suggestInited) {
                    return wrap.suggestInited;
                }

                var s = KYB.clone(this, false, true);
                _.extend(s.settings, options);
                s.wrap = wrap;

                if(wrap.tagName == 'FORM') {
                    s.form = wrap;
                    s.input = wrap.querySelector('.field-input');
                    s.button = wrap.querySelector('.button');
                } else if(wrap.tagName == 'INPUT') {
                    s.input = wrap;
                    s.wrap = wrap.parentNode;
                    s.form = s.wrap;
                } else {
                    s.render();
                }
                s.results = document.createElement('div');
                s.results.className ='kyb-search-bar--results';
                s.form.appendChild(s.results);

                s.input.addEventListener('input', s.onInput.bind(s));
                s.input.addEventListener('focus', s.onFocus.bind(s));
                s.input.addEventListener('blur', s.onBlur.bind(s));
                s.input.addEventListener('keydown', s.onKeydown.bind(s));
                s.results.addEventListener('click', s.onClick.bind(s));
                s.form.addEventListener('submit', s.onSubmit.bind(s));

                wrap.suggestInited = s;
                return s;
            },
            render: function () {
                var s = this.settings;
                this.form = document.createElement('form');
                this.form.className = 'hype-channels-suggest--form';
                this.form.method = 'post';
                this.form.action = KYB.baseUrl + (s.action ? s.action + '/' : '');
                var fields = document.createElement('div');
                fields.innerHTML = '<input class="js-email-hidden" type="text" name="email" value="">';
                fields.className = 'hype-channels-suggest--form-fields';
                this.input = document.createElement('input');
                this.input.type = 'text';
                this.input.className = s.inputClass || 'field-input';
                this.input.required = true;
                this.input.autocomplete = 'off';
                this.input.name = 'username';
                this.input.placeholder = s.placeholder ? s.placeholder : s.type ? (s.type == 1 ? __('Enter Instagram username') : __('Enter YouTube account')) : __('Enter Instagram username or YouTube account');
                this.button = document.createElement('button');
                this.button.type = 'submit';
                this.button.setAttribute('disabled', 'disabled');
                this.button.className = 'button button-disabled';
                this.button.innerHTML = s.btnText;
                fields.appendChild(this.input);
                this.form.appendChild(fields);
                this.form.appendChild(this.button);
                this.wrap.appendChild(this.form);
            },
            onFocus: function () {
                if (this.hideT) {
                    clearTimeout(this.hideT);
                }
                if(!this.suggestions && localStorage && !this.settings.hideRecent) {
                    var storage = JSON.parse(localStorage.getItem('suggestions'));
                    if(storage) {
                        var sortedStorage = _.sortBy(storage, 'date');
                        this.suggestions = _.toArray(sortedStorage).slice(-3).reverse();
                    }
                    if(this.suggestions) {
                        var r = document.createElement('div');
                        r.className = 'kyb-search-bar--results-title';
                        r.innerText = __('Recent reports:');
                        this.results.appendChild(r);
                        this.renderSuggest();
                    }
                }

                if (!this.settings.hideSearch) {
                    this.wrap.classList.add('kyb-search-bar--form-focus');
                }
            },
            onBlur: function () {
                var T = this;
                this.hideT = setTimeout(function () {
                    T.wrap.classList.remove('kyb-search-bar--form-focus');
                    T.hideT = false;
                }, 250);
            },
            onSubmit: function(e) {
                e.preventDefault();
                var T = this;
                var username = this.input.value;
                if(!username) {
                    return false;
                }

                if(this.xhr) {this.xhr.abort();}
                if(this.reqT) {clearTimeout(this.reqT); this.reqT = false;}
                //T.form.classList.remove('preload');
                this.results.innerHTML = '';
                this.input.blur();
                if(this.button) {
                    this.button.setAttribute('disabled', 'disabled');
                    this.button.className = 'button button-disabled';
                }

                if(this.currSelectedI >= 0) {
                    var s = this.suggestions[this.currSelectedI];
                    this.activeItem = s;
                    if(s && s.type && s.type != 'ig' && this.settings.action == 'request') {
                        T.input.value = '';
                        this.settings.onSubmit(s, T);
                        T.form.classList.remove('preload');
                        // skip action for YT reports
                        return true;
                    }
                }

                var params = {};
                if(this.settings.usernameParamName) {
                    params[this.settings.usernameParamName] = (this.settings.usernameParamField && e.detail) ? e.detail[this.settings.usernameParamField] : username;
                } else {
                     params.username = username;
                }

                if(this.settings.params) {
                    _.extend(params, this.settings.params);
                }

                if(this.settings.action) {
                    T.form.classList.add('preload');
                    KYB.get(this.form.action, params).then(function (resp) {
                        if(T.settings.onSubmit) {
                            resp.info = {
                                type: params.type,
                                channelId: username
                            };
                            T.settings.onSubmit(resp, T);
                        }
                        T.input.value = '';
                        T.suggestions = false;
                        T.form.classList.remove('preload');
                        try {
                            if (!resp.success && resp.errors && resp.errors.length) {
                                var $errPlace = T.form.querySelectorAll('.hype-channels-suggest--form-fields');
                                $errPlace = $errPlace[$errPlace.length-1];

                                if(_.isArray(resp.errors[0])) {
                                    var errorText = resp.errors[0][1];
                                } else {
                                    var errorText = resp.errors[0];
                                }
                                KYB.showError($errPlace, errorText);

                                T.input.addEventListener('focus', function () {
                                    $errPlace.querySelector('.kyb-error').remove();
                                }, {once: true});
                                KYB.tracker.trackEvent('Report Error', {
                                    'error text': errorText,
                                    'username': username,
                                    'url': window.location.href
                                });
                            }
                        }
                        catch(err){console.log(err);}
                    });
                } else if(this.settings.onSubmit) {
                    T.form.classList.remove('preload');
                    if(!s) {
                        s = {
                            username: username
                        };
                    }
                    this.settings.onSubmit(s, this);
                    this.suggestions = false;
                }
            },
            onInput: function (e) {
                e.preventDefault();

                this.settings.onInput(e, this);

                var T = this;

                if(this.button) {
                    if (this.input.value.length > 1) {
                        this.button.removeAttribute('disabled', 'disabled');
                        this.button.classList.remove('button-disabled');
                    } else {
                        this.button.setAttribute('disabled', 'disabled');
                        this.button.classList.add('button-disabled');
                    }
                }

                if(this.xhr) {this.xhr.abort();}
                if(this.reqT) {clearTimeout(this.reqT); this.reqT = false;}

                var str = this.input.value.trim();
                if(str.length<2) {
                    T.form.classList.remove('preload');
                    return false;
                }

                if (!this.settings.hideSearch) {
                    T.form.classList.add('preload');
                    this.reqT = setTimeout(function () {
                        T.get(str).then(function () {
                            T.renderSuggest();
                            T.form.classList.remove('preload');
                        });
                        T.reqT = false;
                    }, 100);
                }
                T.suggestions = [{
                    isTip: true,
                    text: str
                }];
                this.results.innerHTML = '';
                this.renderSuggest();
            },
            onKeydown: function (e) {
                if (typeof(this.currSelectedI) === 'undefined') {
                    this.currSelectedI = -1;
                }
                if (this.suggestions && this.suggestions.length) {
                    if (e.which === 40 && this.currSelectedI < this.suggestions.length - 1) {
                        e.preventDefault();
                        this.currSelectedI++;
                        this.selected(this.currSelectedI);
                    } else if (e.which === 38 && this.currSelectedI > 0) {
                        e.preventDefault();
                        this.currSelectedI--;
                        this.selected(this.currSelectedI);
                    } else if (e.which === 13) {
                        var s = this.suggestions[this.currSelectedI];
                        if(s) {
                            this.input.value = s.type === 'yt' ? s.channel_id : s.username;
                        }
                    }
                }
            },
            onClick: function (e) {
                var link = e.target.closest('.kyb-suggest--user-link');
                if(link) {
                    var i = _.indexOf(_.pluck(this.suggestions, 'el'), link);
                    if(i >=0 && this.suggestions[i].username) {
                        this.currSelectedI = i;
                        //console.log(i, this.suggestions);
                        console.log(link, i,  this.suggestions[i].username)
                        this.selected(i);
                        this.input.value = this.suggestions[i].username;
                    }
                    KYB.trigger(this.form, 'submit', this.suggestions[i]);
                }
            },
            selected: function (i) {
                if (typeof(i) === 'undefined') {
                    i = 0;
                    this.currSelectedI = 0;
                }
                if (this.suggestions) {
                    var className = 'kyb-suggest--user-link-selected';
                    var curr = _.find(this.suggestions, function (s) {
                        return s.el.classList.contains(className);
                    });
                    if (curr) {
                        curr.el.classList.remove(className);
                    }
                    if (this.suggestions[i]) {
                        this.suggestions[i].el.classList.add(className);
                    }
                }
            },
            get: function (string) {
                var T = this;
                var p = {search: string};
                if(this.settings.type) {
                    p.st = this.settings.type == 2 ? 'yt' : 'ig';
                }
                return this.xhr = KYB.get('https://'+KYB.domain+KYB.baseUrl+'suggest/', p).then(function(resp) {
                    T.currSelectedI = -1;
                    T.suggestions = resp.list;
                    T.xhr = false;

                    // костыль для ТТ
                    if(T.settings.action == 'request' && !resp.list.filter(s => s.type == 'tt').length) {
                        setTimeout(function () {
                            T.form.classList.add('preload');
                            T.xhr = KYB.get('https://'+KYB.domain+KYB.baseUrl+'suggestTt/', p).then(function(resp) {
                                if(resp.success) {
                                    T.suggestions.push(...resp.success.list);
                                    T.renderSuggest();
                                }
                                T.form.classList.remove('preload');
                            });
                        });
                    }
                });
            },
            renderSuggest: function (resp) {
                var T = this;

                var frag = document.createDocumentFragment();
                _.each(T.suggestions, function (suggest) {
                    suggest.el = document.createElement('div');
                    suggest.el.className = 'kyb-suggest--user-link';
                    //suggest.$el.dataset.type = suggest.type;
                    //suggest.$el.dataset.link = suggest.link;
                    //suggest.$el.dataset.full_name = suggest.full_name;

                    if(suggest.isTip) {
                        suggest.el.dataset.username = suggest.text;
                        var tpl = '<div class="kyb-suggest-avatar"><i class="far fa-search">&#xf002;</i></div>' +
                                  '<div class="kyb-suggest--user-name">'+suggest.text+'</div>' + __('Press "Enter" to request') +
                                  '<i class="far fa-angle-right">&#xf105;</i>';
                    } else {
                        suggest.el.dataset.username = suggest.type=='yt'?suggest.channel_id:suggest.username;
                        var tpl = '<img class="kyb-suggest-avatar" src="'+suggest.avatar_url+'">' +
                              '<div class="kyb-suggest--user-name">'+(suggest.username?suggest.username:suggest.full_name)+
                              (suggest.is_verified&&T.settings.showVerified?' <i class="fas fa-badge-check ig-verified-bage"></i>':'')+'</div>' +
                              ''+(suggest.username?suggest.full_name:'') +
                              (suggest.followers_count?'<span class="kyb-suggest--user-followers">'+KYB.numberFormat(suggest.followers_count,1)+' '+(suggest.type=='yt'?__('subscribers'):__('followers'))+'</span>':'') +
                              '<i class="far fa-angle-right">&#xf105;</i>' +
                              '<i class="channel-icon '+(suggest.type == 'yt' ? 'youtube' : suggest.type == 'tt' ? 'tiktok' : 'instagram')+'-icon"></i>';
                    }
                    suggest.el.innerHTML = tpl;
                    frag.appendChild(suggest.el);
                });
                if(this.reqAnimF) {
                    window.cancelAnimationFrame(this.reqAnimF);
                }
                this.reqAnimF = window.requestAnimationFrame(function () {
                    T.results.appendChild(frag);
                });
            }
        }
    };

    self.clone = function clone(o, copyProto, copyNested){
       function Create(i){
            for(i in o){
              if(o.hasOwnProperty(i)) this[i] = ( copyNested && typeof o[i] == "object" )
                 ? clone(o[i], true, true) : o[i];
            }
       }
       if(copyProto && "__proto__" in o) Create.prototype = o.__proto__; //IE затупит
       return new Create();
    };

    self.goUrlOnClick = function (url, blank) {
        if(!self.cmdKeyPressed && !blank) {
            document.location.href = url;
        } else {
            return window.open(url,'_blank');
        }
    };

    self.instagramCleanName = function (name) {
        if(name[name.length-1] == '/') {
            name = name.slice(1,-1);
        }
        if(name[0] == '@') {
            name = name.substring(1);
        }
        var i = name.lastIndexOf('/');
        if(i >= 0) {
            name = name.substring(i + 1);
        }
        return name;
    };

    self.newSaveAsPdf = function (btn, options) {
        if(!KYB.isWhiteLabel) {
            if(!KYB.user) {
                document.location.href = '/signup/';
                return false;
            }
            if(!KYB.user.hasPdfExport && KYB.user.myReport != options.username) {
                KYB.paywallPopupShow({header: __('Upgrade your plan or buy reports to download PDF')}, 'PDF');
                return false;
            }
        }
        if(btn) {
            btn.classList.add('button-preload');
        }
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                var status = xhr.status;
                if (status == 200) {
                    var success = xhr.response;
                    var a = document.createElement('a');
                    var blob = new Blob([success], {
                        type: 'application/octet-stream'
                    });

                    var URL = window.URL || window.webkitURL;

                    var url = URL.createObjectURL(blob);

                    if (window.navigator.msSaveBlob) {
                        // For IE
                        window.navigator.msSaveOrOpenBlob(blob, fileName)
                    } else {
                        a.setAttribute('href', url);
                        a.setAttribute('download', fileName);
                        var event = new MouseEvent('click');
                        a.dispatchEvent(event);
                    }

                    // fix safari bug
                    if (!/^((?!chrome|android).)*safari/i.test(navigator.userAgent)) {
                        URL.revokeObjectURL(url);
                    }
                } else {
                    KYB.notify('Download error :(', 'danger');
                    setTimeout(function () {
                        document.location.reload(true);
                    }, 2000);
                }
                if (btn) {
                    btn.classList.remove('button-preload');
                }
            }
        };

        let p = {
            type: options.type,
            url: KYB.isLocal() ? `${location.origin}/` : 'https://app.hypeauditor.com/'
        };

        if (KYB.isWhiteLabel) {
            p.whitelabel = 1;
        }
        var date = new Date();
        var META_MONTH = [__('Jan'), __('Feb'), __('Mar'), __('Apr'), __('May'), __('Jun'), __('Jul'), __('Aug'), __('Sep'), __('Oct'), __('Nov'), __('Dec')]
        var fileName = 'HypeAuditor_@' + options.username + '_Report_' + date.getFullYear() + '_' + META_MONTH[date.getMonth()] + '_' + (date.getDate() >=10 ? date.getDate() : '0' + date.getDate()) + '.pdf'

        p.url += `pdf/${options.username}/instagram/`;
        p.width = 900;
        p.height = 636;
        p.channel = options.username;
        p.loading = 1;

        if(document.location.search) {
            p.url += document.location.search;
        }
        if(document.location.hash) {
            p.url += document.location.hash;
        }

        xhr.open('POST', KYB.baseUrl+'ajax/getPdf/', true);
        xhr.responseType = 'arraybuffer';
        xhr.withCredentials = true;
        xhr.setRequestHeader("Accept", "application/pdf");

        // xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded; charset=utf-8");
        xhr.setRequestHeader("Content-type", "application/json; charset=utf-8");
        xhr.setRequestHeader("Accept", "*/*");
        xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
        xhr.send(JSON.stringify(p));
    };

    self.saveAsPDF = function (type, channelId, btn, url='', header= '') {
        if(!KYB.isWhiteLabel && type != 'campaign') {
            if(!KYB.user) {
                document.location.href = '/signup/';
                return false;
            }
            if(!KYB.user.hasPdfExport && KYB.user.myReport != channelId) {
                KYB.paywallPopupShow({header: __('Upgrade your plan or buy reports to download PDF')}, 'PDF');
                return false;
            }
        }
        if(btn) {
            btn.classList.add('button-preload');
        }
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                var status = xhr.status;
                if (status == 200) {
                    var success = xhr.response;
                    var a = document.createElement('a');
                    var blob = new Blob([success], {
                        type: 'application/octet-stream'
                    });

                    var URL = window.URL || window.webkitURL;
                    var url = URL.createObjectURL(blob);

                    if (window.navigator.msSaveBlob) {
                        // For IE
                        window.navigator.msSaveOrOpenBlob(blob, fileName)
                    } else {
                        a.setAttribute('href', url);
                        a.setAttribute('download', fileName);
                        var event = new MouseEvent('click');
                        a.dispatchEvent(event);
                    }
                    // fix safari bug
                    if (!/^((?!chrome|android).)*safari/i.test(navigator.userAgent)) {
                        URL.revokeObjectURL(url);
                    }
                } else {
                    KYB.notify('Download error :(', 'danger');
                    setTimeout(function () {
                        document.location.reload(true);
                    }, 2000);
                }
                if (btn) {
                    btn.classList.remove('button-preload');
                }
            }
        };


        let p = {
            type: type,
            url: 'https://hypeauditor.com/'
        };
        if (KYB.isWhiteLabel) {
            p.whitelabel = 1;
        }
        if (header) {
            p.header = header;
        }
        let date = new Date();
        var fileName = '-' + date.toLocaleString(false, {dateStyle: 'short'}) + '.pdf';
        if(type == 1 || type == 2) {
            // report
            if(type == 2) {
                p.url += 'youtube';
                p.width = 940;
            } else {
                p.url += 'instagram';
                p.width = 1480;
                p.height = 980;
            }
            p.url += '/'+ (url ? url : channelId) +'/';
            p.channel = channelId;
            fileName = channelId + fileName;
        } else if(type == 'tracking') {
            p.url += 'tracking/instagram/'+channelId+'/';
            fileName = type + fileName;
        } else if(type == 'comparison') {
            p.url += 'comparison/'+channelId+'/';
            fileName = type + fileName;
        } else if(type == 'campaign') {
            p.url = channelId;
            // p.width = 900;
            p.width = 1080;
            if(hype.campaign) {
                fileName = hype.campaign.data.title + fileName;
            } else {
                fileName = type + fileName;
            }
        }

        if(document.location.search) {
            p.url += document.location.search;
        }
        if(document.location.hash) {
            p.url += document.location.hash;
        }

        xhr.open('POST', KYB.baseUrl+'ajax/getPdf/', true);
        xhr.responseType = 'arraybuffer';
        xhr.withCredentials = true;
        xhr.setRequestHeader("Accept", "application/pdf");

        // xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded; charset=utf-8");
        xhr.setRequestHeader("Content-type", "application/json; charset=utf-8");
        xhr.setRequestHeader("Accept", "*/*");
        xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
        xhr.send(JSON.stringify(p));
    };
    self.exitIntentPopup = {
        init: function () {
            var T = this;
            var show = function(e){
                if(e.clientY < 7) {
                    T.show();
                    document.removeEventListener("mouseout", show, false);
                }
            };
            document.addEventListener("mouseout", show, false);
        },
        show: function () {
            this.popup = self.popup.show({
                html: '<div class="kyb-exit-intent-popup--img"></div><div class="kyb-exit-intent-popup--logo"></div>'+
                '<h2>'+__('The State of&nbsp;Influencer Marketing 2019')+'</h2>' +
                '<h3>'+__('Exploring influencer fraud of&nbsp;Instagram')+'</h3>' +
                '<h4>'+__('In this annual report you will discover:')+'</h4><ol>' +
                '<li>'+__('Instagram Audience Analytics')+'</li>' +
                '<li>'+__('Performance Benchmarks including the average engagement rates')+'</li>' +
                '<li>'+__('The percentage of influencers who inflate their&nbsp;followers and engagement by country and size.')+'</li></ol>' +
                '<p>'+__('<b>Get Free</b> PDF with the research and start optimizing your marketing campaigns')+'</p>' +
                '<div class="kyb-exit-intent-popup--btn"><a href="https://hypeauditor.com/s/auditor/resources/The-State-of-Influencer-Marketing-2019.pdf" class="button button-huge">'+__('Download it Free')+'</a>'+__('I want free research')+'</div>' +
                '<div class="kyb-exit-intent-popup--btn"><div class="button button-transparent button-huge kyb-exit-intent-popup--btn-close">'+__('No, thanks')+'</div>'+__('I don’t want to optimize my marketing campaigns')+'</div>',
                cssClass: 'kyb-exit-intent-popup',
                onOpen: function (t) {
                    Cookies.set("exitIntentPopup", 1, {expires: 30, path: '/'});
                    t.$content.querySelector('.kyb-exit-intent-popup--btn-close').addEventListener('click', function () {
                        t.hide();
                    }, {once: true});
                    KYB.tracker.trackEvent('View Promo', {
                        type: 'White Paper popup'
                    });
                }
            });
        }
    };

    self.queue = {
        queue: [],
        sort: function () {
            this.queue.sort(function (a, b) {
                if (a.priority < b.priority) {
                    return 1;
                } else if (a.priority === b.priority) {
                    return 0;
                } else {
                    return -1;
                }
            });
        },
        push: function (f, p) {
            this.queue.push({
                method: f,
                priority: p ? p : 1
            });
            this.sort();
        },
        execute: function () {
            var f = this.queue.shift();
            if (f) {
                f.method.call();
            }
        }
    };
    self.currPopup = false;
    self.allPopups = [];
    self.popup = {
        settings: {
            html: '',
            cssClass: ''
        },
        all: [],
        create: function (options) {
            var popup = KYB.clone(self.popup, false, true);
            _.extend(popup.settings, options);

            self.allPopups.push(popup);
            return popup;
        },
        show: function (options) {
            // skip in pdf
            if(navigator.userAgent.match('HypeauditorPdfGen/1.0')) {return false;}

            var popup = this.create(options);
            popup.open();
            return popup;
        },
        /*add: function (options, when, priority) {
            var popup = this.create(options);
            var T = this;
            self.queue.push(function () {
                if (when) {
                    if (!_.isArray(when)) {
                        when = [when];
                    }
                    $.when.apply(T, when).done(function () {
                        popup.open();
                    });
                } else {
                    popup.open();
                }
            }, priority);
            window.addEventListener("load", function () {
                if (!self.currPopup) {
                    self.queue.execute();
                }
            });

            return popup;
        },*/
        render: function () {
            var T = this;
            this.$el = document.createElement('div');
            this.$el.setAttribute('class', 'kyb-popup kyb-popup--curr'+(this.settings.cssClass ? ' '+this.settings.cssClass : '')+(this.settings.without_close_btn ? ' kyb-popup--without-close-btn' : ''));
            this.$wrap = document.createElement('div');
            this.$wrap.classList.add('kyb-popup-wrap');
            this.wrapS = this.$wrap.style;
            this.$content = document.createElement('div');
            this.$content.classList.add('kyb-popup-content');
            if(this.settings.html.jquery) {
                this.$content.appendChild(this.settings.html[0]);
            } else if(_.isObject(this.settings.html)) {
                this.$content.appendChild(this.settings.html);
            } else {
                var frag = document.createRange().createContextualFragment(this.settings.html);
                this.$content.appendChild(frag);
            }
            this.contentS = this.$content.style;

            if(!this.settings.without_close_btn) {
                this.$close = document.createElement('div');
                this.$close.classList.add('kyb-popup-close');
                this.$close.innerHTML = '<i class="fas fa-times">&#xf00d;</i>';
                this.$close.addEventListener('click',function () {
                    T.hide();
                });
                this.$wrap.appendChild(this.$close);
            }

            this.$wrap.appendChild(this.$content);
            this.$el.appendChild(this.$wrap);
            this.$el.addEventListener('click', function (e) {
                if(e.target === T.$el && !T.settings.keepOpened) {
                    T.hide();
                }
            });
            return this;
        },
        update: function (html) {
            if (!this.$el) {
                this.settings.html = html;
            } else {
                //this.$content.empty().html(html);
                this.$content.innerHTML = '';
                if(html.jquery) {
                    this.$content.appendChild(html[0]);
                } else if(_.isObject(html)) {
                    this.$content.appendChild(html);
                } else {
                    var frag = document.createRange().createContextualFragment(html);
                    this.$content.appendChild(frag);
                }
            }
            if(!this.settings.isCentered) {
                //this.updWidth();
            }
        },
        updWidth: function () {
            var T = this;
            this.wrapS.width = 'auto';
            this.contentS.width = 'auto';
            var newWidth = Math.round(T.$wrap.width());
            this.wrapS.width = (self.popup.oldWidth)+'px';
            window.requestAnimationFrame(function() {
                T.wrapS.width = newWidth+'px';
                self.popup.oldWidth = newWidth;
            });
        },
        open: function () {
            var T = this;
            var popup = this.render();
            /*if(window.scrollY) {
                popup.returnScrollTop = window.scrollY;
                var container = document.getElementsByClassName('.kyb-container')[0];
                if(container) {
                    var containerS = container.style;
                    popup.$el.addEventListener('popup_close', function close() {
                        console.log('popup_close');
                        popup.$el.removeEventListener('popup_close', close);
                        containerS.transform = '';
                        KYB.scrollTop(popup.returnScrollTop);
                    });
                    containerS.transform = 'translateY(-' + window.scrollY + 'px)';
                }
            }*/
            document.body.appendChild(popup.$el);
            document.body.classList.add('kyb-popup-showing');
            //KYB.scrollTop(0);

            if(self.allPopups[self.allPopups.length-2]) {
                self.allPopups[self.allPopups.length-2].$el.classList.remove('kyb-popup--curr');
            }

            //popup.$el.css({'min-height': Math.round(popup.$content.height())+'px'});

            if (T.settings.onOpen) {
                T.settings.onOpen(T);
            }
            self.currPopup = popup;
        },
        hide: function () {
            if (this.$el) {
                self.allPopups.splice(_.indexOf(self.allPopups, this), 1);
                if(!self.allPopups.length) {
                    document.body.classList.remove('kyb-popup-showing');
                    self.currPopup = false;
                } else {
                    if(self.allPopups[self.allPopups.length-1]) {
                        self.currPopup = self.allPopups[self.allPopups.length-1];
                        self.currPopup.$el.classList.add('kyb-popup--curr');
                    }
                }
                if (typeof(CustomEvent)!='undefined') {
                    var event = new CustomEvent('popup_close');
                    this.$el.dispatchEvent(event);
                }
                else {
                    this.$el.fireEvent('popup_close');
                }

                this.$el.remove();

                if (this.settings.onClose) {
                    this.settings.onClose();
                }
                self.queue.execute();
            }
        },
        currPopupHide: function () {
            if(self.currPopup) {
                self.currPopup.hide();
            }
        },
        allHide: function () {
            var s = self.allPopups.length;
            for(var i = 0; i < s; i++) {
                this.currPopupHide();
            }
        },
        confirm: function (msg, yes, no) {
            var title = msg;
            var yesBtnText = __('Yes');
            var noBtnText = __('No');
            if(_.isObject(msg)) {
                if(msg.msg) {
                    title = msg.msg;
                }
                if(msg.yes) {
                    yesBtnText = msg.yes;
                }
                if(msg.no) {
                    noBtnText = msg.no;
                }
                if(msg.desc) {
                    var desc = msg.desc;
                }
            }
            var popup = this.show({
                html: '<h3>'+title+'</h3>'+(typeof(desc)!='undefined' ? '<p>'+desc+'</p>' : ''),
                cssClass: 'confirm-popup',
                onOpen: function (t) {
                    var $yes = document.createElement('div');
                    $yes.className = 'button';
                    $yes.innerHTML = yesBtnText;

                    var $no  = document.createElement('div');
                    $no.className = 'button button-outline button-gray';
                    $no.innerHTML = noBtnText;

                    $yes.addEventListener('click', function () {
                        yes();
                        popup.hide();
                    }, {once: true});
                    $no.addEventListener('click', function () {
                        if(no) {
                            no();
                        }
                        popup.hide();
                    }, {once: true});

                    t.$content.appendChild($yes);
                    t.$content.appendChild($no);
                }
            });
        }
    };

    window.KYB = self;

    return self;
})(document, window);

var HighChartsHelper = (function(){
    return {
        setStrictChartGrid: function(chart, xCellsCount, yCellsCount, params) {
            params = params || {};

            if (typeof chart !== 'object' || !xCellsCount || !yCellsCount) {
                return false;
            }

            var yExtremes = this.getBrautyExtremes(chart.yAxis[0].getExtremes());
            //var yExtremes = chart.yAxis[0].getExtremes();
            var minY = Math.ceil(yExtremes.min);
            var maxY = Math.ceil(yExtremes.max);
            var yInterval =  (maxY - minY) / (yCellsCount - 1);

            var xExtremes = this.getBrautyExtremes(chart.xAxis[0].getExtremes());
            //var xExtremes = chart.xAxis[0].getExtremes();
            var minX = Math.ceil(xExtremes.min);
            var maxX = Math.ceil(xExtremes.max);
            var xInterval = (maxX - minX) / (xCellsCount - 1);

            chart.yAxis[0].options.startOnTick = true;
            chart.yAxis[0].options.endOnTick = true;
            chart.yAxis[0].options.allowDecimals = false;
            chart.yAxis[0].options.tickInterval = yInterval;
            chart.yAxis[0].setExtremes(minY,maxY,true,false);

            chart.xAxis[0].options.startOnTick = true;
            chart.xAxis[0].options.endOnTick = true;
            chart.xAxis[0].options.tickInterval = xInterval;
            chart.xAxis[0].setExtremes(minX,maxX,true,false);
        },
        getBrautyExtremes: function(extremes){
            var obj = {};
            var delta = (extremes.dataMax - extremes.dataMin);
            var overDelta = delta/5;
            var order = Math.floor(Math.log(overDelta) / Math.log(10));

            obj.min = Util.roundDown(extremes.dataMin, order);
            obj.max = Util.roundUp(extremes.dataMax, order);

            return obj;
        }
    }
}());

var Util = (function(){
    return {
        roundDown: function (num, precision) {
            precision = Math.pow(10, -precision)
            return Math.floor(num * precision) / precision
        },
        roundUp: function (num, precision) {
            precision = Math.pow(10, -precision)
            return Math.ceil(num * precision) / precision
        }
    }
}());

var KYBProgessBar = (function(){
    var self = {}
    var MAX_DURATION = (5 * 60 * 1000);

    var $container;
    var $persent;
    var $time;
    var $progresStates;
    var $bar;

    var dateEnd;
    var dateStart;
    var dateNow;
    var interval;

    var initFail;
    var channelType;
    var username;

    var _fillStates = function(state) {
        _.each($progresStates, function($state,key){
            var $ico = $state.querySelector('.preview-status-ico');
            if (key === state) {
                $state.classList.add('js-state--active');
                $state.classList.remove('js-state--done', 'js-state--next');
                $ico.setAttribute('class', 'preview-status-ico fas fa-cog');
                $ico.innerHTML = '&#xf013';
            } else if (key < state) {
                $state.classList.add('js-state--done')
                $state.classList.remove('js-state--active', 'js-state--next');
                $ico.setAttribute('class', 'preview-status-ico fas fa-check');
                $ico.innerHTML = '&#xf00c';
            } else {
                $state.classList.add('js-state--next');
                $state.classList.remove('js-state--active');
            }
        });
    };

    var _calcTick = function() {
        dateNow = Date.now();

        var duration = (dateEnd - dateStart);
        var progress = duration - (dateEnd - dateNow);
        var persentage = (progress > 0) ? (progress/duration*100).toFixed(0) : 95;

        if (parseFloat(persentage) > 98) {
            persentage = 98;
            self.stop();
        }

        var min = Math.ceil((MAX_DURATION - (MAX_DURATION * (persentage/100))) / (1000 * 60));

        $persent.innerHTML = persentage + '%';
        $time.innerHTML = min + ' min';
        $bar.style.width = persentage + '%';

        if (persentage < 20) {
            _fillStates(0);
        } else if (persentage < 40) {
            _fillStates(1);
        } else if (persentage < 60) {
            _fillStates(2);
        } else if (persentage < 80) {
            _fillStates(3);
        } else if (persentage < 100) {
            _fillStates(4);
        }
    };

    var _getEndDate = function() {
        var date = Date.now();
        date += MAX_DURATION;
        return date;
    };

    var _setDates = function() {
        dateNow = Date.now();

        var timersStr = Cookies.get("KYBProgressTimer") || '';
        var timers = timersStr ? JSON.parse(timersStr) : {};
        var activeTimer = timers[username] || {};
        var isDateNew = (typeof timers[username] === 'object') ? false : true;

        if (activeTimer.start) {
            dateStart = activeTimer.start;
        } else {
            dateStart = Date.now();
            activeTimer.start = dateStart;
        }

        if (activeTimer.end) {
            dateEnd = activeTimer.end;
        } else {
            dateEnd = _getEndDate(11);
            activeTimer.end = dateEnd
        }

        if (isDateNew) {
            timers[username] = activeTimer;
            Cookies.set("KYBProgressTimer", JSON.stringify(timers), {expires: 1, path: '/'});
        }
    };
    self = {
        init: function (params) {
            params = params || {};

            if(params.channelType) {
                channelType = params.channelType;
            }
            if(params.username) {
                username = params.username;
            }

            $container = document.querySelector('.js-preview-progerss');

            if (!$container || $container.length === 0) {
                initFail = true;
                return false;
            }

            $persent       = document.querySelector('.js-preview-progerss-num');
            $time          = document.querySelector('.js-preview-progerss-timer');
            $progresStates = document.getElementsByClassName('js-state');
            $bar           = document.querySelector('.js-preview-bar');
        },
        start: function () {
            if (initFail) {
                return false;
            }

            _setDates();

            interval = setInterval(function(){
                _calcTick();
            }, 1000);
            setTimeout(function () {
                _calcTick();
            });
            var T = this;
            setTimeout(function () {
                T.check();
            }, 60000);
        },
        stop: function () {
            clearInterval(interval);
        },
        check: function () {
            if(channelType == 'youtube') {
                KYB.get(KYB.baseUrl+'youtube/check/?channel='+username).then(function (resp) {
                    if(resp.success && resp.report_state != 'NOT_READY') {
                        if(KYB.report.youtube.id == username) {
                            window.location.reload(true);
                        } else {
                            KYB.report.cache[username] = false;
                        }
                    }
                });
            } else {
                KYB.get(KYB.baseUrl+'checkReady/', {username: username}).then(function (resp) {
                    if(resp.success && parseInt(resp.is_done)) {
                        window.location.reload(true);
                    }
                });
            }
            var T = this;
            setTimeout(function () {
                T.check();
            }, 15000);
        }
    };

    return self;
}());

KYB.loadFileArr = {};
KYB.loadFile = function (path, type, callback) {
    if( type == 'js') {
        if(!KYB.loadFileArr[path]) {
            KYB.loadFileArr[path] = {
                callbacks: []
            };
            (function(document, tag) {
                var scriptTag = document.createElement(tag),
                    firstScriptTag = document.getElementsByTagName(tag)[0];
                scriptTag.onload = function() {
                    _.each(KYB.loadFileArr[path].callbacks, function (c) {
                        c();
                    });
                };
                scriptTag.src = 'https://'+KYB.domain+path;
                firstScriptTag.parentNode.insertBefore(scriptTag, firstScriptTag);
            }(document, 'script'));
        }
        if(callback) {
            KYB.loadFileArr[path].callbacks.push(callback);
        }
    }
    else if( type == 'css' ) {
        document.getElementsByTagName('head')[0].insertAdjacentHTML('beforeend', '<link href="https://'+KYB.domain+path+'" rel="stylesheet" type="text/css">');
    }
};
KYB.editTopics = function (username, btn) {
    KYB.tracker.trackEvent('Page Action', {
        'Page Id': KYB.pageId,
        'Action': 'tap',
        'Target': "Suggest topic icon"
    });
    var parent = btn.parentNode;
    var form = document.createElement('form');
    form.className = 'kyb-edit-topics-form';

    let select = document.createElement('select');
    select.className = 'field-select';
    select.setAttribute('multiple', true);
    select.dataset.title = __('Select the top topic for')+' @'+username;
    let options = '';
    let topics = KYB.reportData.topics;
    let topicsA = Object.keys(topics).map(id => {return {id: id, title: topics[id]}});
    topicsA.sort((a, b) => a.title.localeCompare(b.title));
    topicsA.forEach(t => {
        options += '<option value="'+t.id+'">'+t.title+'</option>';
    });
    select.innerHTML = options;

    var upd = document.createElement('button');
    upd.type = 'submit';
    upd.className = 'button button-small';
    upd.innerHTML = __('Update');

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        console.log(select)
        var ids = [];
        var html = '';
        _.each(select.options, function (o) {
            if(o.selected) {
                ids.push(o.value);
                html += '<div class="kyb-user-info--topic">'+topics[o.value]+'</div> ';
            }
        });
        var thanks = document.createElement('span');
        thanks.innerHTML = __('Thank you!');
        if(html) {
            _.each(parent.querySelectorAll('.kyb-user-info--topic'), function (t) {
                if(!t.classList.contains('kyb-edit-topics--btn')) {
                    t.remove();
                }
            });
            parent.insertAdjacentHTML('afterbegin', html);

            parent.appendChild(thanks);
            setTimeout(function () {
                KYB.fadeOut(thanks);
            },2000);
        }
        gc();
        if(ids.length) {
            KYB.post(KYB.baseUrl+'saveUserTopics/', {
                username: username,
                topics: ids
            });
        }
    });
    var cancel = document.createElement('span');
    cancel.className = 'kyb-edit-topics--cancel kyb-cursor-p';
    cancel.innerHTML = __('Cancel');
    var gc = function () {
        form.remove();
        upd.remove();
        cancel.remove();
        parent.classList.remove('kyb-topics-edit-process');
    };
    cancel.addEventListener('click', function () {
        gc();
    }, {once: true});
    /*KYB.loadFile('/s/auditor/dist/js/libs/awesomplete.css', 'css');
    KYB.loadFile('/s/auditor/dist/js/libs/awesomplete.min.js', 'js', function () {
        new Awesomplete(input, {
            list: source,
            data: function (item) {
                return { label: item.label, value: item.id };
            },
            filter: function(text, inp) {
                return Awesomplete.FILTER_CONTAINS(text, inp.match(/[^,]*$/)[0]);
            },
            item: function(text, inp) {
                return Awesomplete.ITEM(text, inp.match(/[^,]*$/)[0]);
            },
            replace: function(text) {
                var before = this.input.value.match(/^.+,\s*|/)[0];
                this.input.value = before + text + ", ";
            }
        });
        input.focus();
    });*/
    form.appendChild(select);
    form.appendChild(upd);
    form.appendChild(cancel);
    KYB.customFields.init(form);
    parent.appendChild(form);
    window.requestAnimationFrame(function () {
        parent.classList.add('kyb-topics-edit-process');
    });
};

function getOffset (el, wrap) {
  var box = el.getBoundingClientRect();
  return {
    top: box.top + (wrap ? wrap.scrollTop : window.pageYOffset) - (wrap ? wrap.getBoundingClientRect().top : document.documentElement.clientTop),
    left: box.left + window.pageXOffset - document.documentElement.clientLeft
  };
}
KYB.imageLoader = {
    uuid: 0,
    active: 0,
    arr: {},
    cache: {},
    add: function(selector, clear){
        var T = this;
        /*if(navigator.userAgent.match('HypeauditorPdfGen/1.0')) {
            _.each(selector, function(el){
                var src = el.dataset.image;
                if (src) {
                    T.load(el, src);
                    el.dataset.image = '';
                }
            });
            return false;
        }*/
        if (clear) this.clear();
        _.each(selector, function(el){
            var src = el.dataset.image;
            if (src) {
                T.uuid += 1;
                T.arr[T.uuid] = { t: el, src: src };
                el.dataset.image = '';
            }
        });
        if (!this.active && !_.isEmpty(this.arr)) this.init();
        this.update();
    },
    update: function(arr, wrap){
        // REFLOW!
        var T = this;
        if(!arr || !_.isArray(arr)) {
            var arr = T.arr;
        }
        window.requestAnimationFrame(function () {
            if(wrap) {
                var s = wrap.scrollTop;
            } else {
                var s = window.scrollY;
            }
            if (!KYB.windowHeight) {
                KYB.windowHeight = window.innerHeight;
            }
            var height = KYB.windowHeight;

            for (var i in arr) {
                var a = arr[i], top = getOffset(a.t, wrap).top;
                if (top) {
                    if (KYB.isPDF || (s + height > top - 110 && s < top + 110)) {
                        T.load(a.t, a.src);
                        delete arr[i];
                    }
                }
                //else if(document.contains(a.t[0])) {
                //delete arr[i];
                //}
            }
            if (_.isEmpty(arr)) {
                T.active = 0;
                window.removeEventListener('scroll', T.eventUpd);
            }
        });
    },
    load: function(t, src){
        var T = this;
        var cache = this.cache[src];
        if(cache) {
            if(cache.img) {
                var img = cache.img;
            } else {
                if(cache.status == 'ok') {
                    this.onLoad(t, src);
                } else {
                    this.onError(t, src);
                }
                return false;
            }
        } else {
            var img = new Image();
            cache = {
                img: img
            };
            img.src = src;
        }
        img.onload = function(){
            cache.status = 'ok';
            cache.img = false;
            T.onLoad(t, src);
            img = false;
        };
        img.onerror = function() {
            cache.status = 'error';
            cache.img = false;
            T.onError(t, src);
            img = false;
        };
    },
    onLoad: function (t, src) {
        if(t.tagName.toLowerCase() == 'img') {
            t.src = src;
        } else {
            t.style.backgroundImage = 'url('+src+')';
        }
    },
    onError: function (t, src) {
        if(t.tagName.toLowerCase() == 'img') {
            t.src = KYB.staticUrl+'/app/nfloo/img/aurora/ic_broken_image.svg';
        } else {
            var ico = document.createElement('i');
            ico.setAttribute('class', 'far fa-file-times');
            ico.innerHTML = '\uf317';
            t.appendChild(ico);
        }
        t.classList.add('kyb-img--deleted');
    },
    clear: function(){
        var a = this.arr;
        for (var i in a) delete a[i];
    },
    init: function(){
        this.eventUpd = this.update.bind(this);
        window.addEventListener('scroll', this.eventUpd);
        this.active = 1;
    }
};

KYB.numberFormat = function(n, toFixed, minimumFractionDigits) {
    if(typeof(toFixed) == 'undefined') {var toFixed = 2;}
    if(minimumFractionDigits > toFixed) {
        toFixed = minimumFractionDigits;
    }
    var ranges = [
        { divider: 1e18 , suffix: 'P' },
        { divider: 1e15 , suffix: 'E' },
        { divider: 1e12 , suffix: 'T' },
        { divider: 1e9 , suffix: 'B' },
        { divider: 1e6 , suffix: 'M' },
        { divider: 1e3 , suffix: 'K' }
    ];

    for (var i = 0; i < ranges.length; i++) {
        if (n >= ranges[i].divider) {
            var newN = n / ranges[i].divider;
            var p = {maximumFractionDigits: toFixed};
            if(minimumFractionDigits) {
                p.minimumFractionDigits = minimumFractionDigits;
            }
            return newN.toLocaleString('en', p) + ranges[i].suffix;
        }
    }
    return this.numberToLocale(n, toFixed, minimumFractionDigits);
};

if(typeof(Intl)!='undefined') {
    KYB.numberToLocaleDefaultFormater = new Intl.NumberFormat('en');
}
KYB.numberToLocale = function(number, toFixed, minimumFractionDigits) {
    if(!number) {return 0;}
    if(!KYB.numberToLocaleDefaultFormater || toFixed || minimumFractionDigits) {
        var p = {};
        if(toFixed) {
            p.maximumFractionDigits = toFixed;
        }
        if(minimumFractionDigits) {
            p.minimumFractionDigits = minimumFractionDigits;
        }
        return number.toLocaleString('en', p);
    } else {
        return KYB.numberToLocaleDefaultFormater.format(number);
    }
};


KYB.recalculateReport = function (btn) {
    KYB.post(KYB.baseUrl+'settings/recount/').then(function () {
        btn.insertAdjacentHTML('afterend', __('Report is being generated'));
        btn.remove();
        KYB.notify(__('Audience data will be recalculated shortly.<br> You can recalculate it once a week.'), 'success');
    });
};

KYB.scrollTo = function (id) {
    var el = document.getElementById(id);
    KYB.scrollTop(getOffset(el).top);
};

KYB.counterAnimate = function (oldCount, newCount, onStep) {
    if (oldCount == newCount) {
        return false
    }
    var step = (newCount - oldCount) / 10;
    if (Math.abs(step) < 1) {
        step = oldCount > newCount ? -1 : 1;
    }
    onStep(oldCount);
    var prevCount = oldCount;
    var pointsInterval = setInterval(function () {
        prevCount += step;
        var p = Math.round(prevCount);
        if ((oldCount > newCount && p <= newCount) || (oldCount < newCount && p >= newCount)) {
            onStep(newCount);
            clearInterval(pointsInterval);
            prevCount = false;
            pointsInterval = false;
        } else {
            onStep(p);
        }
    }, 20);
};

KYB.lists = {
    create: function (btn, name, callback) {
        btn.classList.add('kyb-preload');
        var params = {};
        if(name) {
            params.name = name;
        }
        KYB.get(KYB.baseUrl+'lists/createFolder/', params).then(function(resp) {
            if(resp && resp.folder) {
                if(callback) {
                    callback(resp.folder);
                } else {
                    hype.router.navigate('reports?id='+resp.folder+'&new=1');
                }
            } else {
                KYB.notify(__('Something went wrong'), 'danger');
            }
        });
    },
    share: function(id, status) {
        KYB.get(KYB.baseUrl+'lists/shareFolder/', {folderId: id, share: status?status:0});
    },
    editName: function (btn, id) {
        var T = this;
        var $btn = btn;
        var $name = $btn.previousElementSibling;
        var $parent = $name.parentNode.parentNode;
        var $form = document.createElement('form');
        $form.id = 'lists-list-name--form';
        var $input = document.createElement('input');
        $input.classList.add('field-input');
        $input.id = 'lists-list-name--input';
        $input.type = 'text';
        $input.autocomplete = 'off';
        $input.required = 'true';
        $input.placeholder = __('Enter list name');
        $parent.classList.add('edit-name');
        $form.appendChild($input);

        $name.parentNode.insertBefore($form, $name.nextSibling);

        $input.focus();
        $input.value = $name.innerText;
        var editname = function() {
            if($input.value.trim()) {
                if (typeof(CustomEvent)!='undefined') {
                    $form.dispatchEvent(new CustomEvent('submit'));
                }
                else {
                    $form.fireEvent('onsubmit');
                }
            }
        };
        $form.addEventListener('submit',function (e) {
            e.preventDefault();
            $btn.classList.add('kyb-preload');
            var name = $input.value.trim();
            T.rename(id, name, function () {
                $btn.classList.remove('kyb-preload');
                $form.remove();
            });
            $name.innerHTML = name;
            $parent.classList.remove('edit-name');
            document.body.removeEventListener('click', editname);

            if(KYB.lists.$menu) {
                KYB.trigger(KYB.lists.$menu, 'folderRename', {
                    id: id,
                    name: name
                });
            }
        });
        $form.addEventListener('click', function (e) {
            e.stopPropagation();
        });
        setTimeout(function () {
            document.body.addEventListener('click', editname);
        });
    },
    rename: function (id, name, callback) {
        KYB.get(KYB.baseUrl+'lists/renameFolder/', {folderId: id, folderName: name}).then(function () {
            if(callback) {
                callback();
            }
        });
    },
    getList: function (callback, reportId) {
        var p = {};
        if(reportId) {
            p.reportId = reportId;
        }
        KYB.get(KYB.baseUrl+'lists/getFolders/', p).then(function (resp) {
            if(callback) {
                callback(resp);
            }
        });
    },
    report: {
        addForm: function (reportId, e, source, username, channel) {
            e.stopPropagation();
            var T = this;
            var $form;
            var $btn = e.currentTarget;
            $btn.classList.add('kyb-preload');
            var removeForm = function () {
                KYB.lists.newListNameTmp = T.$addFormWrap.querySelector('.lists-add-form--item-new-input').value;
                KYB.fadeOut(T.$addFormWrap, function () {
                    T.$addFormWrap.remove();
                });
            };
            if(this.$addFormWrap) {
                removeForm();
            }

            var saveCallback = function () {
                var ids = [];
                _.each($form.querySelectorAll('input:checked'), function (el) {
                    ids.push(el.dataset.id);
                });
                T.set(reportId, ids, source, username, channel);
            };
            var renderItem = function (folder) {
                var $input = document.createElement('input');
                $input.classList.add('checkbox-input');
                $input.dataset.id = folder.id;
                $input.type = "checkbox";
                if(folder.within_report) {
                    $input.checked = "checked";
                }
                $input.addEventListener('change', function () {
                    var checked = $input.checked;
                    clearTimeout(T.addAutosave);
                    T.addAutosave = setTimeout(saveCallback, 1000);
                    if(KYB.lists.$menu) {
                        KYB.trigger(KYB.lists.$menu, 'folderChange', {
                            id: folder.id,
                            status: checked
                        });
                    }
                    var curr = parseInt($count.innerText);
                    if(checked) {
                        $count.innerHTML = curr+1;
                    } else {
                        $count.innerHTML = curr-1;
                    }
                    $count.classList.add('changed');
                    setTimeout(function () {
                        $count.classList.remove('changed');
                    }, 200);
                });
                var $count = document.createElement('span');
                $count.classList.add('lists-add-form--item-count');
                $count.innerHTML = folder.count;
                var $folder = document.createElement('label');
                $folder.classList.add('lists-add-form--item');
                $folder.innerHTML = '<span class="checkbox-text">'+folder.name+(folder.team_shared ? ' <i class="far fa-share-alt">&#xf1e0;</i> ' :'')+'</span>';

                $folder.insertBefore($count, $folder.firstChild);
                $folder.insertBefore($input, $folder.firstChild);

                return $folder;
            };
            KYB.lists.getList(function (resp) {
                if(resp.folders) {
                    T.$addFormWrap = document.createElement('div');
                    T.$addFormWrap.classList.add('lists-add-form--wrap');
                    $form = document.createElement('div');
                    $form.classList.add('lists-add-form');
                    _.each(resp.folders, function (folder) {
                        if(folder.id) {
                            $form.appendChild(renderItem(folder));
                        }
                    });
                    // new list ui
                    var $inputName = document.createElement('input');
                    $inputName.type = 'text';
                    $inputName.required = true;
                    $inputName.setAttribute('class', 'field-input lists-add-form--item-new-input');
                    $inputName.value = (KYB.lists.newListNameTmp ? KYB.lists.newListNameTmp : '');
                    $inputName.placeholder = __('Enter new list name');
                    $inputName.autocomplete = 'off';

                    var $folder = document.createElement('form');
                    $folder.setAttribute('class', 'lists-add-form--item lists-add-form--item-new');

                    var $save = document.createElement('button');
                    $save.type = 'submit';
                    $save.setAttribute('class', 'button button-gray button-outline lists-add-form--item-new-btn');
                    $save.innerHTML = __('Create and add');

                    $folder.addEventListener('submit', function (e) {
                        e.preventDefault();
                        var name = $inputName.value;
                        KYB.lists.create($save, name, function (folderId) {
                            $form.appendChild(renderItem({
                                id: folderId,
                                name: name,
                                within_report: 1,
                                count: 1
                            }));
                            $inputName.value = '';
                            $inputName.focus();
                            KYB.lists.newListNameTmp = false;
                            saveCallback();
                            $save.classList.remove('kyb-preload');
                            if(KYB.lists.$menu) {
                                var li = document.createElement('li');
                                li.classList.add('second-menu--item');
                                li.innerHTML = '<a id="lists-menu-folder-' + folderId + '" class="second-menu--link" href="/lists/?id=' + folderId + '"><span class="second-menu--link-side">1</span><span class="second-menu--link-name">' + name + '</span></a>';
                                KYB.lists.$menu.appendChild(li);
                            }

                            $form.scrollTop = $form.scrollHeight;
                        });
                    });

                    T.$addFormWrap.appendChild($form);
                    $folder.appendChild($inputName);
                    $folder.appendChild($save);
                    T.$addFormWrap.appendChild($folder);
                    T.$addFormWrap.addEventListener('click', function (e) {
                        e.stopPropagation();
                    });

                    if(source == 'report') {
                        $btn.parentNode.appendChild(T.$addFormWrap);
                    } else {
                        $btn.appendChild(T.$addFormWrap);
                    }

                    $btn.classList.remove('kyb-preload');
                    document.body.addEventListener('click', function remove() {
                        document.body.removeEventListener('click', remove);
                        removeForm();
                    });
                }
            }, reportId);
        },
        set: function (reportId, folderIds, source, username, channel) {
            if(this.xhrAddReport) {
                this.xhrAddReport.abort();
            }
            var p = {
                folderIds: folderIds,
                source: source
            };
            if(reportId) {
                p.reportId = reportId;
            }
            if(username) {
                p.username = username;
            }
            if (channel) {
                p.channel = channel;
            }
            this.xhrAddReport = KYB.get(KYB.baseUrl+'lists/addReportToFolders/', p);

            KYB.tracker.trackEvent('Page Action', {
                target: 'Add to list item',
                source: source
            });
        },
        remove: function (reportId, folderId, e) {
            if(e) {
                var btn = e.currentTarget;
                btn.classList.add('kyb-preload');
                e.stopPropagation();
            }

            KYB.lists.getList(function (foldersData) {
                var foldersList = foldersData.folders;

                KYB.get(KYB.baseUrl+'lists/removeReportFromFolder/', {reportId: reportId, folderId: folderId}).then(function(){
                    if(btn) {
                        var extraFolders = [];

                        //Если удаляем из All Influencers, то удаляем из всех папок
                        if ((folderId === 0) && foldersList) {
                            foldersList.forEach(function(folder) {
                                if ((folder.id === 0) || folder.within_report) {
                                    extraFolders.push(folder.id);
                                }
                            });
                        } else {
                            extraFolders.push(folderId);
                        }

                        var onclickUndo = "KYB.lists.report.undoRemove("+reportId+", '"+extraFolders.join(",")+"', event);";
                        var tr = btn.parentNode.parentNode;
                        var html = '<td height="'+tr.clientHeight+'" colspan="'+tr.parentNode.parentNode.querySelectorAll('thead th').length+'">'+__('Account Removed')+'. <a class="lists-blogger--undo-remove-btn" onclick="'+onclickUndo+'">'+__('Undo')+'</a>'+'</td>';

                        if (!KYB.lists.$removed) {
                            KYB.lists.$removed = {};
                        }

                        KYB.lists.$removed[reportId] = tr.innerHTML;

                        tr.innerHTML = html;
                        tr.classList.add('lists-removed-noti');

                        if(KYB.lists.$menu) {
                            extraFolders.forEach(function(extraFolderId) {
                                KYB.trigger(KYB.lists.$menu, 'folderChange', {
                                    id: extraFolderId,
                                    status: false
                                });
                            });
                        }

                        KYB.lists.report.refreshFolderStats(folderId);
                    }
                });
            }, reportId);

            if(e) {
                var btn = e.currentTarget;
                btn.classList.remove('kyb-preload');
            }
        },
        undoRemove: function (reportId, folderIds, e) {
            if(e) {
                e.stopPropagation();
            }

            KYB.get(KYB.baseUrl+'lists/undoRemoveReport/', {reportId: reportId, folderIds: folderIds}).then(function (resp) {
                var tr = document.getElementById('report-row-'+reportId);

                tr.innerHTML = KYB.lists.$removed[reportId];
                tr.classList.remove('lists-removed-noti');

                var folderIdsArr = folderIds.split(',');

                if (folderIdsArr.length === 1) {
                    KYB.lists.report.refreshFolderStats(folderIdsArr[0]);
                }

                folderIdsArr.forEach(function(folderId) {
                    KYB.trigger(KYB.lists.$menu, 'folderChange', {
                        id: folderId,
                        status: true
                    });
                });
            });
        },
        refreshFolderStats: function(folderId) {
            var summary = document.getElementById('lists-summary');

            if (!summary) {
                return;
            }

            KYB.get(KYB.baseUrl+'lists/getFolderStats/', {id: folderId}).then(function (resp) {
                var items = summary.querySelectorAll('.lists-summary--item-val');

                if(resp.count) {
                    items[0].innerHTML = KYB.numberToLocale(resp.count);
                } else {
                    items[0].innerHTML = '–';
                }

                if(resp.followers_quality) {
                    items[1].innerHTML = KYB.numberFormat(resp.followers_quality);
                } else {
                    items[1].innerHTML = '–';
                }

                if(resp.auth_engagement) {
                    items[2].innerHTML = KYB.numberFormat(resp.auth_engagement);
                } else {
                    items[2].innerHTML = '–';
                }
            });
        },
        autoSaveMsgShow: function ($input) {
            if($input.dataset.autoSaveMsgInited) {
                $input.dataset.autoSaveMsgInited = 0;
                var $msg = document.createElement('div');
                $msg.classList.add('auto-save-msg');
                $msg.innerHTML = __('Changes autosaved');
                $input.after($msg);
                setTimeout(function () {
                    $msg.remove();
                }, 1500);
            }
        },
        saveComment: function (id, input){
            var T = this;
            var $input = input;
            clearTimeout(this.commentAutosave);
            clearTimeout(this.commentAutosaveMsg);
            var saveCallback = function () {
                if(T.xhrSaveComment) {
                    T.xhrSaveComment.abort();
                }
                T.xhrSaveComment = KYB.get(KYB.baseUrl+'lists/setReportComment/', {reportId: id, comment: $input.value}).then(function() {
                    T.commentAutosaveMsg = setTimeout(function () {
                        T.autoSaveMsgShow($input);
                    }, 2000);
                });
            };
            if(!$input.dataset.autoSaveMsgInited) {
                $input.dataset.autoSaveMsgInited = 1;
                $input.addEventListener('blur', function () {
                    T.autoSaveMsgShow($input);
                }, {once: true});
            }
            this.commentAutosave = setTimeout(saveCallback, 1000);
        },
        unlock: function (id, e, callback) {
            if(e) {
                e.stopPropagation();
            }
            if(KYB.user.tokens + KYB.user.free_reports <= 0) {
                KYB.tracker.trackEvent('Page Action', {target: 'Unlock report from lists', 'not enough credits': 1});
                if(typeof(hype)!='undefined') {
                    document.location.href = 'https://hypeauditor.com/pricing/';
                }
                return false;
            }
            if(e) {
                var btn = e.currentTarget;
                btn.classList.add('kyb-preload');
            }
            if(_.isArray(id)) {
                id = id.join();
            }
            KYB.get(KYB.baseUrl+'lists/unlockReport/', {id: id}).then(function(resp){
                if(btn && resp.success) {
                    if (resp[0].error){
                        KYB.notify(__('This report is recalculating'), 'info');
                        return;
                    }
                    var td = btn.parentNode;
                    var html = '<td class="lists-blogger-digit--td">'+(resp[0].followers_quality >-1 ? KYB.numberFormat(resp[0].followers_quality, 1) : '<span class="color-gray">&mdash;</span>')+'</td>';
                    html += '<td class="lists-blogger-digit--td">'+(resp[0].auth_eng > -1 ? KYB.numberFormat(resp[0].auth_eng, 1) : '<span class="color-gray">&mdash;</span>')+'</td>';
                    html += '<td class="lists-blogger-digit--td">'+(resp[0].aqs ? '<div class="lists-blogger-aqs kyb-score-tag--'+resp[0].aqs_display[0]+'">'+(KYB.numberFormat(resp[0].aqs))+'</div>' : '<span class="color-gray">&mdash;</span>')+'</td>';
                    if (resp[0].audience_age[0] != 0){
                        html += '<td class="lists-blogger-age">'+resp[0].audience_age[0]+' <span class="lists-blogger-data-percent">'+Math.round(resp[0].audience_age[1])+'%</span></td>';
                    } else {
                        html += '<td class="lists-blogger-age"></td>';
                    }
                    if (resp[0].audience_country[0] != ''){
                        html += '<td class="lists-blogger-country">'+resp[0].audience_country[0]+' <span class="lists-blogger-data-percent">'+Math.round(resp[0].audience_country[1])+'%</span></td>';
                    } else {
                        html += '<td class="lists-blogger-country"></td>';
                    }
                    td.insertAdjacentHTML('afterend', html);
                    td.remove();

                    document.getElementById('hype-header--credits').innerHTML = '<i class="hype-credit-ico"></i> '+(resp[0].tokens ? resp[0].tokens : __('No credits'));
                    var free_r = document.getElementById('hype-header--free-report');
                    if(free_r) {
                        free_r.innerHTML = '<i class="fal fa-file-chart-pie">&#xf65a;</i> '+resp[0].free_reports+' free '+__('report', 'reports', resp[0].free_reports);
                    }

                    if (resp[0].is_free){
                        KYB.notify(__('This report is free, we didn\'t charge a credit'), 'info');
                    }
                    KYB.tracker.trackEvent('Page Action', {target: 'Unlock report from lists'});
                    KYB.user.tokens = resp[0].tokens;
                    KYB.user.free_reports = resp[0].free_reports;
                }
                if(callback) {
                    callback();
                }
            });
        }
    },
    bulkForm: function (folderId, e) {
        if(this.bulkFormVisible) {
            return false;
        }
        var T = this;
        var btn = e.currentTarget;
        if(!this.$bulk) {
            this.$bulk = document.createElement('div');
            this.$bulk.classList.add('lists-bulk-form--wrap');

            this.$bulkForm = document.createElement('form');
            this.$bulkForm.classList.add('lists-bulk-form');

            var $textarea = document.createElement('textarea');
            $textarea.classList.add('lists-bulk-form--textarea');
            $textarea.placeholder = __('Username or link, one per line');
            $textarea.required = true;

            var $btn = document.createElement('button');
            $btn.classList.add('button');
            $btn.type = 'submit';
            $btn.innerHTML = __('Add and Unlock');

            this.$bulkResult = document.createElement('div');
            this.$bulkResult.id = 'lists-bulk-result';
            this.$bulkResult.innerHTML = __('Input usernames to request reports')+(folderId ? ' '+_('and add to&nbsp;this list') : '');

            this.$bulk.appendChild(this.$bulkResult);
            this.$bulkForm.appendChild($textarea);
            this.$bulkForm.appendChild($btn);
            this.$bulk.appendChild(this.$bulkForm);
            btn.appendChild(this.$bulk);

            this.$bulkForm.addEventListener('submit', function (e) {
                e.preventDefault();
                $btn.classList.add('kyb-preload');
                var bloggers = $textarea.value;
                KYB.get(KYB.baseUrl+'lists/addBloggers/', {folderId: folderId, bloggers: bloggers}).then(function (resp) {
                    $btn.classList.remove('kyb-preload');
                    if(resp.success) {
                        $textarea.value = '';
                        T.$bulkResult.innerHTML = (resp.ok && resp.ok.length ? '<div class="lists-bulk-status lists-bulk-status--ok"><i class="far fa-check">&#xf00c;</i>'+resp.ok.length+' '+(__('report', 'reports', resp.ok.length))+' '+__('added')+'.</div>' : '');
                        if(resp.err && resp.err.length) {
                            var $err = false;
                            var bloggersA = bloggers.split("\n");
                            var errG = _.groupBy(resp.err, 'text');
                            var needTokensErr = [];
                            _.each(errG, function (g, t) {
                                var rows = [];
                                _.each(g, function (gg) {

                                    if(t == 'Not enough credits') {
                                        needTokensErr.push(gg.id);
                                    } else {
                                        rows.push(bloggersA[gg.row]);
                                    }
                                    KYB.tracker.trackEvent('Report Error', {'username': bloggersA[gg.row], 'error text': t, 'url': window.location.href});
                                });
                                if(rows.length) {
                                    var $t = document.createElement('span');
                                    $t.innerText = rows.join(', ');
                                    var $e = document.createElement('div');
                                    $e.classList.add('lists-bulk-status--err-item');
                                    $e.innerHTML = '<i class="far fa-times-octagon">&#xf2f0;</i><b>'+t+':</b><br>';
                                    $e.appendChild($t);
                                    if(!$err) {
                                        $err = document.createElement('div');
                                        $err.setAttribute('class', 'lists-bulk-status lists-bulk-status--err');
                                    }
                                    $err.appendChild($e);
                                }

                            });
                            if($err) {
                                T.$bulkResult.appendChild($err);
                            }
                            if(needTokensErr.length) {
                                T.buyTokensRender(needTokensErr.length, T.$bulk, function () {
                                    T.report.unlock(needTokensErr, false, function() {
                                        document.location.reload();
                                    });
                                });
                            }

                            hype.router.navigate('reports/');
                        } else {
                            KYB.notify(__('Done!'), 'success');
                            setTimeout(function () {
                                document.location.reload();
                            }, 500);
                        }
                    } else {
                        if(resp.errors.description) {
                            KYB.notify(resp.errors.description, 'danger');
                        } else {
                            KYB.notify(__('Something went wrong'), 'danger');
                        }
                    }
                });
            });
        } else {
            KYB.fadeIn(this.$bulk);
        }
        this.bulkFormVisible = true;

        this.$bulk.addEventListener('click', function (e) {
            e.stopPropagation();
        });
        this.$bulk.querySelector('textarea').focus();
        setTimeout(function () {
            document.body.addEventListener('click', function () {
                KYB.fadeOut(T.$bulk);
                T.bulkFormVisible = false;
            }, {once: true});
        });
    },
    buyTokensRender: function (tokens, wrap, callback) {
        if(tokens <= 1) {
            var couponsPack = 1;
        } else if(tokens <= 10) {
            var couponsPack = 10;
        } else if(tokens <= 50) {
            var couponsPack = 50;
        } else {
            var couponsPack = tokens;
        }

        var $cancel = document.createElement('div');
        $cancel.id = 'lists-paypal-cancel';
        $cancel.classList.add('kyb-gray-link');
        $cancel.innerHTML = __('Pay Later');

        var $btn = document.createElement('div');
        $btn.classList.add('button');
        $btn.style.display = 'block';
        $btn.style.margin = '12px 0 0 0';
        $btn.innerHTML = 'Buy for $'+KYB.newTotalPrice(couponsPack);
        $btn.addEventListener('click', function () {
            KYB.buyTokenPopupShow(couponsPack);
        });

        var $paypalWrap = document.createElement('div');
        $paypalWrap.id = 'lists-paypal-wrap';
        $paypalWrap.innerHTML = '<h3>'+__('Purchase')+' '+couponsPack+' '+(__('token', 'tokens', couponsPack))+' '+__('to continue')+'</h3>'+__('Bulk Add unlocks reports automatically, so you need')+' '+tokens+' '+(__('token', 'tokens', tokens))+' '+__('to check all reports from the list');

        var fee = document.createElement('small');
        fee.innerHTML = '<small>'+__('Fees may apply')+'</small>';

        $paypalWrap.appendChild($btn);
        $paypalWrap.appendChild(fee);
        $paypalWrap.appendChild($cancel);
        wrap.appendChild($paypalWrap);
        wrap.classList.add('lists-paypal-showed');
        var clearPaypal = function () {
            wrap.classList.remove('lists-paypal-showed');
            $paypalWrap.remove();
        };
        $cancel.addEventListener('click',function () {
            clearPaypal();
        });
    },
    menuInit: function (el) {
        this.$menu = document.querySelector(el);
        var T = this;
        this.$menu.addEventListener('folderChange', function (e) {
            var data = e.detail;
            var $item = T.$menu.querySelector('#lists-menu-folder-'+data.id);
            var $count = $item.querySelector('.second-menu--link-side');
            var curr = parseInt($count.innerText);
            if(data.status) {
                $count.innerHTML = (curr+1);
            } else {
                $count.innerHTML = (curr-1) >= 0 ? curr-1 : 0;
            }
        });
        this.$menu.addEventListener('folderRename', function (e) {
            var data = e.detail;
            var $item = T.$menu.querySelector('#lists-menu-folder-'+data.id);
            $item.querySelector('.second-menu--link-name').innerHTML = data.name;
        });
    },
    sortInit: function () {
        var T = this;
        _.each(document.getElementsByClassName('kyb-table-sort-th'), function (th) {
            th.addEventListener('click', function () {
                var sortType = th.dataset.sortType;
                var sort = th.dataset.sort;
                if(sort) {
                    sort = sort == 'desc' ? 'asc' : '';
                } else {
                    sort = 'desc';
                }
                T.$tableWrap.classList.add('kyb-preload');

                var params = KYB.getParams();
                if(sort) {
                    params.sort = sortType+'-'+sort;
                } else {
                    delete params.sort;
                }
                delete params.p;

                hype.router.navigate('reports/?'+KYB.param(params));

                KYB.tracker.trackEvent('Page Action', {
                    target: 'Sort by '+sortType,
                    'Page Id': KYB.pageId
                });
            });
        });

        KYB.imageLoader.add(document.getElementsByClassName('lists-blogger-ava'));
    },
    tableInit: function () {
        var T = this;
        this.$tableWrap = document.getElementById('lists-table--wrap');
        if(this.$tableWrap) {
            var lastHoverThI = false;
            var lastHoverTh = false;
            var tableTh = T.$tableWrap.getElementsByTagName('TH');
            var overLeave = function(e) {
                if(e.target.tagName == 'TD' || e.type == 'mouseleave') {
                    if(e.type == 'mouseover' && e.target.classList.contains('lists-blogger-digit--td')) {
                        var i = _.indexOf(e.target.parentNode.children, e.target);
                        if(i != lastHoverThI) {
                            var newHoverTh = tableTh[i];
                            newHoverTh.classList.add('kyb-table-th--hover');
                            if(lastHoverTh) {
                                lastHoverTh.classList.remove('kyb-table-th--hover');
                            }
                            lastHoverTh = newHoverTh;
                            lastHoverThI = i;
                        }
                    } else if(lastHoverTh) {
                        lastHoverTh.classList.remove('kyb-table-th--hover');
                        lastHoverTh = false;
                        lastHoverThI = false;
                    }
                }
            };
            let tbody = T.$tableWrap.querySelector('tbody');
            tbody.addEventListener('mouseover', overLeave);
            tbody.addEventListener('mouseleave', overLeave);
            tbody.addEventListener('click', function (e) {
                let tr = e.target.closest('tr');
                let link = tr.dataset.link;
                if(link) {
                    var ava = tr.querySelector('.lists-blogger-ava');
                    ava.classList.add('kyb-preload');
                    if(!KYB.cmdKeyPressed) {
                        hype.router.navigate(link);
                    } else {
                        var w = KYB.goUrlOnClick('https://'+KYB.domain+KYB.baseUrl+link, true);
                        w.addEventListener('load', function() {
                            ava.classList.remove('kyb-preload');
                        }, false);
                    }
                }
            });
        }
    }
};

KYB.getParams = function () {
    var params = {};
    if(window.location.search.substring(1)) {
        params = JSON.parse('{"' + window.location.search.substring(1).replace(/&/g, '","').replace(/=/g,'":"') + '"}', function(key, value) {
            return key === "" ? value : decodeURIComponent(value);
        });
    }
    return params;
};

KYB.plural = function(n, form1, form2, form3) {
    return n%10==1&&n%100!=11?form1:(n%10>=2&&n%10<=4&&(n%100<10||n%100>=20)?form2:form3);
};

KYB.growCharsRender = function (options) {
    /*if(_.some(options.charts, function (chart) {
        if(chart.data.length < 6) {
            return true;
        }
    })) {
        return false;
    }*/
    var followers = options.charts[0].data;
    var last = followers[0];
    var lessVal = false;
    var moreVal = false;
    var time4week = last.time-(86400*7*4);
    var first = _.find(followers, function (d, i) {
        if(d.time < time4week) {
            if(!lessVal) {
                lessVal = d;
                moreVal = followers[i-1];
            }
            if(d.time >= last.time-(86400*(7*4+1))) {
                return true;
            }
        }
    });
    if(!first) {
        if(lessVal && moreVal) {
            // approximation
            first = {
                time: time4week,
                count: lessVal.count + Math.round((moreVal.count-lessVal.count)*((time4week-lessVal.time)/(moreVal.time-lessVal.time)))
            };
            if(KYB.isOurIp) {
                console.log('approximation', first, moreVal, lessVal);
            }
        }
    }
    // if(first && !KYB.isOurIp) {
    //     var div = last.count-first.count;
    //     var newEl = document.createElement('div');
    //     newEl.className = 'report-chart-pretext';
    //     newEl.innerHTML = '<strong>'+(div < 0 ? '&minus;' : '+')+KYB.numberToLocale(Math.abs(div))+'</strong> '+__("followers last 4 weeks")+' <div class="report_preview_follower_change--perc report_preview_data_val--'+(div < 0 ? 'neg' : 'pos')+'">'+(div < 0 ? '&minus;' : '+')+(Math.abs(div/last.count*100).toFixed(2))+'%</div>';
    //     var el = options.container;
    //     el.parentNode.insertBefore(newEl, el);
    // }

    var charts = [];
    _.each(options.charts, function (c, i) {
        var $chart = document.createElement('div');
        $chart.className = 'chart-'+i+(i==0 && options.charts.length>1 ? ' highcharts-hide-part' : '');
        var dataset = {
            data: [],
            name: c.name ? c.name : 'Followers',
            type: 'line',
            valueDecimals: '',
            unit: ''
        };
        _.each(c.data, function (d, i) {
            dataset.data[i] = [d.time*1000, d.count];
        });
        options.container.appendChild($chart);
        var title = !options.hideTitle ? {
            text: dataset.name,
            align: 'left',
            margin: 0,
            x: 0,
            y: -30,
            inside: true
        } : false;

        var chart = Highcharts.chart($chart, {
            chart: {
                zoomType: 'x',
                height: 230,
                margin: [30,0,45,45],
                spacing: [40,0,0,0],
                style: {
                    overflow: 'visible'
                }
            },
            title: title,
            credits: false,
            legend: false,
            xAxis: {
                type: 'datetime',
                dateTimeLabelFormats: {
                    day: '%b %e'
                },
                crosshair: true,
                tickLength: 4,
                tickWidth: 1,
            },
            yAxis: {
                tickLength: 8,
                tickWidth: 1,
                title: {
                    text: null
                },
                labels: {
                    style: {
                        whiteSpace: 'nowrap'
                    },
                    padding: 0,
                }
            },
            tooltip: {
                pointFormat: '{series.name}: {point.y}',
                split: true,
                shadow: false,
                borderWidth: 0,
                backgroundColor: 'none'
            },
            series: [{
                animation: false,
                data: dataset.data.reverse(),
                name: dataset.name,
                type: dataset.type,
                color: '#f00',
                fillOpacity: 0.3,
                tooltip: {
                    valueSuffix: ' ' + dataset.unit
                }
            }]
        });
        charts.push(Highcharts.charts[chart.index]);
    });
    if(options.fixScroll && navigator.userAgent.indexOf("Chrome") == -1) {
        var h = options.container.clientHeight-85;
        if(window.scrollY > getOffset(options.container).top) {
            window.scroll(0, window.scrollY+h);
        }
    }
    return charts;
};

KYB.whenToScroll = function(el, callback) {
    if(navigator.userAgent.match('HypeauditorPdfGen/1.0')) {
        callback();
        return false;
    }
    if(!KYB.whenToScrollA) {
        KYB.whenToScrollA = [];
        KYB.whenToScrollObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
                if(entry.isIntersecting) {
                    let el = entry.target;
                    KYB.whenToScrollA[el.id+el.className]();
                    KYB.whenToScrollObserver.unobserve(el);
                }
            });
        }, {
            rootMargin: '-65px 0px 50px 0px',
        });
    }
    if(el) {
        KYB.whenToScrollA[el.id+el.className] = callback;
        KYB.whenToScrollObserver.observe(el);
    }
};

function dataURItoBlob(dataURI) {
    // convert base64/URLEncoded data component to raw binary data held in a string
    var byteString;
    if (dataURI.split(',')[0].indexOf('base64') >= 0)
        byteString = atob(dataURI.split(',')[1]);
    else
        byteString = unescape(dataURI.split(',')[1]);

    // separate out the mime component
    var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

    // write the bytes of the string to a typed array
    var ia = new Uint8Array(byteString.length);
    for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }

    return new Blob([ia], {type:mimeString});
}

KYB.newTotalPrice = function(coupons) {
    var totalPrice = 0;
    var coupons = parseInt(coupons);
    switch (coupons) {
        case 1:
            totalPrice = KYB.couponsPriceConfig[1];
            break;
        case 10:
            totalPrice = KYB.couponsPriceConfig[10];
            break;
        case 50:
            totalPrice = KYB.couponsPriceConfig[50];
            break;
        default:
            totalPrice = (coupons * (coupons>50?6.98:14.9)).toFixed(2);
    }
    if(!KYB.user.discount20Tokens50Done && coupons == 10) {
        return Math.floor(totalPrice*(99/totalPrice));
    } else if(KYB.user.discountAffiliate && coupons != 10) {
        return totalPrice * 0.6;
    } else {
        return totalPrice;
    }
};
KYB.buyTokenPopupShow = function(token, header, desc, source) {
    KYB.buyBtnClickDate = new Date().getTime();
    var T = this;
    var $html = document.createElement('div');
    $html.id = 'buy-token-popup';
    $html.innerHTML = '<h2 class="popup-header">'+(header ? header : (token+(token>1?' credits':' credit')+' '+__('for')+' $'+KYB.newTotalPrice(token)))+'<p style="color: #7f7f7f; margin-top: 8px; line-height: 24px">'+(desc ? desc : __('1 credit = 1 Instagram/Youtube report for 1 year.'))+'</p></h2><div class="preloader"></div>';
    var popup = KYB.popup.show({
        html: $html,
        cssClass: 'buy-token-popup',
        onClose: function () {
            if(T.xhr) {
                T.xhr.abort();
            }
        }
    });
    var p = {
        source: source ? source : 'paywall',
        credits: token
    };
    this.xhr = KYB.get(KYB.baseUrl+'ajax/getTokensBuyForm/', p).then(function (resp) {
        if(resp.html) {
            var frag = document.createRange().createContextualFragment(resp.html);
            $html.appendChild(frag);
            $html.querySelector('.preloader').remove();
            if(KYB.user) {
                KYB.buy.popup.init();
            }
        } else {
            $html.innerHTML = 'Error. Try again.';
        }
    });
};

KYB.subscribe = {
    popup: function (plan) {
        var popup = KYB.popup.show({
            html: '<h2>'+__('Subscribe to')+' '+plan.title+'</h2><div id="card-element" class="kyb-preload"></div><div id="errors--wrap"><i class="far fa-times-octagon">&#xf2f0;</i> <span id="errors"></span></div><div id="card-element--btn" class="button">'+__('Subscribe')+'</div><div id="pricing-popup-secure-msg"><i class="fas fa-lock-alt">&#xf30d;</i> '+__('Secure credit card payment')+'</div><div id="credits--total">USD<span class="total-price-val">'+plan.price+'/'+plan.period+'</span></div><div id="pricing-popup-secure-logos"></div>',
            cssClass: 'hype-subscribe-popup'
        });
        this.init(plan);
    },
    init: function (plan) {
        var card = KYB.buy.stripe.init();
        card.on('ready', function () {
            document.getElementById('card-element').classList.remove('kyb-preload');
            var btn = document.getElementById('card-element--btn');
            btn.addEventListener('click', function () {
                btn.classList.add('button-preload');
                KYB.buy.stripe.instance.createPaymentMethod('card', card, {
                    billing_details: {
                        email: KYB.user.email
                    },
                }).then(function(result) {
                    if(result.paymentMethod) {
                        var params = {
                            stripeToken: result.paymentMethod.id,
                            stripeEmail: KYB.user.email,
                            source: plan.source?plan.source:false
                        };
                        if(plan.planId) {
                            params.planId = plan.planId;
                        }
                        if(plan.quote) {
                            params.quote = plan.quote;
                        }
                        if(plan.seller) {
                            params.seller = plan.seller;
                        }
                        KYB.post(KYB.baseUrl+'billing/stripeSubscription/', params).then(function (resp) {
                            if(resp.success) {
                                if(plan.onSuccess) {
                                    plan.onSuccess();
                                } else {
                                    KYB.popup.allHide();
                                    window.scrollTo(0,0);
                                    KYB.notify(plan.title+' bought', 'success');
                                }
                            } else {
                                KYB.notify(resp.message, 'danger');
                                KYB.buy.stripe.trackError(resp.message, resp.decline_code);
                            }
                            btn.classList.remove('button-preload');
                        }, function (resp) {
                            KYB.buy.stripe.trackError('Server error');
                            KYB.notify(__('Error. Try again.'), 'danger');
                            btn.classList.remove('button-preload');
                        });
                    } else {
                        btn.classList.remove('button-preload');
                        var errorElement = document.getElementById('errors');
                        errorElement.textContent = result.error.message;
                        errorElement.parentNode.style.display = 'block';
                        KYB.buy.stripe.trackError(result.error.message, result.error.decline_code);
                    }
                });
            });
        });
    }
};
KYB.buy = {
    paymentDone: function (credits, bought) {
        Intercom('trackEvent', 'paypal-buy', {
            tokens: credits
        });
        let html = '<h2 class="popup-header">'+__('Purchase successful!')+'<span>'+__('Use them to check bloggers')+'</span></h2><div class="popup-content"><div class="popup-token"><i class="ico ico-token ico-token-big mh-s"></i><div class="kyb-market-points">+</div><div class="kyb-market-points kyb-market-points--count">'+bought+'</div></div><div class="button" onclick="KYB.buy.paymentPopupSuccess()">'+__('Done')+'</div></div>';
        document.querySelector('.buy-token-popup').classList.add('buy-token-popup_success');
        document.getElementById('buy-token-popup').innerHTML = html;
        window.scrollTo(0,0);
    },
    paymentPopupSuccess() {
        KYB.popup.allHide();
        if (location.pathname.indexOf('preview') !== -1) {
            location.search = '?update=1';
        }
    },
    popup: {
        init: function () {
            var T = this;
            KYB.buy.paypal.inited = false;
            this.amountInput = document.getElementById('credits-amount');
            var credits = T.amountInput.value;
            this.total = document.getElementById('credits--total');
            this.popupTabs = document.querySelectorAll('#credits-form .kyb-report-tab');
            var btn = document.getElementById('card-element--btn');

            var card = KYB.buy.stripe.init();
            card.on('ready', function () {
                document.getElementById('card-element').classList.remove('kyb-preload');

                document.getElementById('credits-form').addEventListener('submit', function (e) {
                    e.preventDefault();
                    btn.classList.add('button-preload');
                    if(T.loading) {
                        return false;
                    }
                    T.loading = true;
                    KYB.buy.stripe.instance.createToken(card).then(function(result) {
                        if (!result.error) {
                            KYB.buy.stripe.bill(result, credits).then(function (resp) {
                                if(resp.success) {
                                    card.clear();
                                    KYB.buy.paymentDone(KYB.user.tokens+parseInt(credits), credits);
                                } else {
                                    var errorElement = document.getElementById('errors');
                                    errorElement.textContent = resp.message;
                                    errorElement.parentNode.style.display = 'block';
                                    KYB.buy.stripe.trackError(resp.message, resp.decline_code);
                                }
                                btn.classList.remove('button-preload');
                                T.loading = false;
                            }, function (resp) {
                                var errorElement = document.getElementById('errors');
                                errorElement.textContent = __('Server error');
                                errorElement.parentNode.style.display = 'block';
                                KYB.buy.stripe.trackError('Server error');
                            });
                        } else {
                            btn.classList.remove('button-preload');
                            T.loading = false;
                            var errorElement = document.getElementById('errors');
                            errorElement.textContent = result.error.message;
                            errorElement.parentNode.style.display = 'block';
                            KYB.buy.stripe.trackError(result.error.message, result.error.decline_code);
                        }
                    });
                });
            });


            KYB.buy.stripe.applePay.init(credits);

            var methodTabs = document.getElementsByClassName('kyb-report-tabs--item');
            _.each(methodTabs, function (tab) {
                tab.addEventListener('click', function () {
                    KYB.buyBtnClickDate = new Date().getTime();
                    var cn = 'kyb-report-tabs--item-active';
                    _.each(methodTabs, function (t) {
                        t.classList.remove(cn);
                    });
                    tab.classList.add(cn);
                    var method = tab.dataset.type;
                    T.choosePaymentMethod(method, credits);
                    T.methodStat(method);
                    T.showTotalPrice(credits, method);
                });
            });

            T.methodStat('stripe');
            T.showTotalPrice(credits, 'stripe');
        },
        choosePaymentMethod: function(type, credits) {
            var cn = 'kyb-report-tab--active';
            _.each(this.popupTabs, function(tab) {
                tab.classList.remove(cn);
            });
            if(type == 'paypal') {
                if(!KYB.buy.paypal.inited) {
                    KYB.buy.paypal.init(credits);
                }
                document.getElementById('paypal--wrap').classList.add(cn)
            } else if(type == 'apple') {
                document.getElementById('payment-request-button').classList.add(cn)
            } else {
                document.getElementById('card-element--wrap').classList.add(cn)
            }
        },
        methodStat: function (method) {
            KYB.tracker.trackEvent('Payment Form Opened', {
                'Page Id': KYB.pageId,
                'method': method,
                'time elapsed': parseFloat(((new Date().getTime() - KYB.buyBtnClickDate) / 1000).toFixed(2))
            });
        },
        showTotalPrice: function (val, method) {
            var T = this;
            if(val < 1) {
                var errorElement = document.getElementById('errors');
                errorElement.textContent = __('Min credits amount is 1');
                errorElement.parentNode.style.display = 'block';
                T.total.innerHTML = '';
            } else {
                var totalPrice = parseFloat(KYB.newTotalPrice(val));
                if(!KYB.user.discount20Tokens50Done && val == 10) {
                    var price = '<s>'+KYB.couponsPriceConfig[10]+'</s> USD'+totalPrice;
                } else {
                    var price = '<span class="total-price-val">'+totalPrice+'</span>';
                }
                if(method == 'paypal') {
                    var taxVal = KYB.buy.paypal.getTax(val);
                } else {
                    var taxVal = KYB.buy.stripe.getTax(val).toFixed(2);
                }
                var fee = ' $'+taxVal+' ';
                T.total.innerHTML = __('Total: $') + price + ' <small>+'+fee+__('fee')+'</small>';
            }
        }
    },
    paypal: {
        init: function(credits) {
            this.inited = true;
            var T = this;
            paypal.Buttons({
                createOrder: function(data, actions) {
                    KYB.tracker.trackEvent('Page Action', {
                        'Page Id': KYB.pageId,
                        'Action': 'tap',
                        'method': 'paypal',
                        'target': 'Pay button'
                    });
                    var totalCreditsPrice = parseFloat(KYB.newTotalPrice(credits));
                    var tax = parseFloat(T.getTax(credits));
                    var breakdown = {
                        item_total: {
                            currency_code: "USD",
                            value: (KYB.couponsPriceConfig[credits]).toFixed(2)
                        },
                        handling: {
                            currency_code: "USD",
                            value: tax
                        }
                    };
                    if(!KYB.user.discount20Tokens50Done && credits == 10) {
                        breakdown.discount = {
                            currency_code: "USD",
                            value: (KYB.couponsPriceConfig[credits]-99).toFixed(2)
                        };
                    } else if(KYB.user.discountAffiliate && credits != 10) {
                        breakdown.discount = {
                            currency_code: "USD",
                            value: (KYB.couponsPriceConfig[credits]*0.4).toFixed(2)
                        };
                    }
                    return actions.order.create({
                        intent: "CAPTURE",
                        payer: {
                            email_address: KYB.user.email
                        },
                        application_context: {
                            shipping_preference: "NO_SHIPPING",
                            user_action: 'PAY_NOW',
                            payment_method: {
                                payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED'
                            }
                        },
                        purchase_units: [{
                            custom_id: KYB.user.user_id,
                            amount: {
                                currency_code: "USD",
                                value: (totalCreditsPrice+tax).toFixed(2),
                                breakdown: breakdown
                            },
                            items: [{
                                name: "Reports",
                                unit_amount: {
                                    currency_code: "USD",
                                    value: (KYB.couponsPriceConfig[credits]/credits).toFixed(2)
                                },
                                quantity: credits,
                                category: "DIGITAL_GOODS"
                            }]
                        }]
                    });
                },
                onError: function (err) {
                    KYB.tracker.trackEvent('Paypal Error', {'error text': err, 'url': window.location.href});
                },
                onApprove: function(data, actions) {
                    return actions.order.capture().then(function(details) {
                        KYB.buy.paymentDone(KYB.user.tokens+parseInt(credits), credits);
                    });
                }
            }).render('#paypal-button-container');
        },
        getTax: function (credits) {
            var totalCreditsPrice = parseFloat(KYB.newTotalPrice(credits));
            if (KYB.user.countryCode == 'US'){
                var tax = (totalCreditsPrice * 0.029) + 0.3;
            } else {
                var tax = (totalCreditsPrice * 0.044) + 0.3;
            }
            return tax.toFixed(2);
        }
    },
    stripe: {
        init: function() {
            this.instance = Stripe(KYB.stripe.key);
            this.elements = this.instance.elements();
            var card = this.elements.create('card', {style: {
                base: {
                    iconColor: '#666ee8',
                    color: '#31325f',
                    fontWeight: 400,
                    fontFamily: '"Proxima Nova", -apple-system, sans-serif',
                    fontSmoothing: 'antialiased',
                    fontSize: '16px',
                    '::placeholder': {
                        color: '#747e87'
                    },
                    ':-webkit-autofill': {
                        color: '#666ee8'
                    }
                }
            }, hidePostalCode: true});
            card.mount('#card-element');
            var errorElement = document.getElementById('errors');
            card.addEventListener('change', function(event) {
                if (event.error) {
                    errorElement.textContent = event.error.message;
                    errorElement.parentNode.style.display = 'block';
                    KYB.buy.stripe.trackError(event.error.message);
                } else {
                    errorElement.textContent = '';
                    errorElement.parentNode.style.display = 'none';
                }
            });
            return card;
        },
        bill: function(result, credits) {
            return KYB.post(KYB.baseUrl+'billing/stripe/', {
                stripeToken: result.token.id,
                stripeEmail: result.token.email ? result.token.email : KYB.user.email,
                credits: credits,
                method: result.methodName,
                source: KYB.buy.source
            });
        },
        getTax: function(credits) {
            var totalCreditsPrice = parseFloat(KYB.newTotalPrice(credits));
            return (totalCreditsPrice * 0.029) + 0.2;
        },
        getAmount: function(credits) {
            var totalCreditsPrice = parseFloat(KYB.newTotalPrice(credits));
            return Math.round((totalCreditsPrice + this.getTax(credits)) * 100);
        },
        applePay: {
            init: function (credits) {
                var T = this;
                this.paymentRequest = KYB.buy.stripe.instance.paymentRequest({
                    country: 'US',
                    currency: 'usd',
                    total: {
                        label: 'Payment for '+credits+' credits',
                        amount: KYB.buy.stripe.getAmount(credits)
                    }
                });
                var prButton = KYB.buy.stripe.elements.create('paymentRequestButton', {
                    paymentRequest: this.paymentRequest
                });
                this.paymentRequest.canMakePayment().then(function(result) {
                    var tab = document.getElementById('payment-request-tab');
                    if (result) {

                        if(result.applePay) {
                            tab.textContent = 'Apple Pay';
                        } else {
                            tab.textContent = 'Other';
                        }
                        tab.style.display = '';


                        prButton.mount('#payment-request-button');
                        T.paymentRequest.on('token', function(ev) {
                            KYB.buy.stripe.bill(ev, credits).then(function (resp) {
                                if(resp.success) {
                                    ev.complete('success');
                                    KYB.buy.paymentDone(resp.credits, credits);
                                } else {
                                    KYB.notify(resp.message, 'danger');
                                    ev.complete('fail');
                                    KYB.buy.stripe.trackError(resp.message, resp.decline_code);
                                }
                            }, function(e, type) {
                                KYB.notify('Error', 'danger');
                                ev.complete('fail');
                                KYB.buy.stripe.trackError('Apple pay '+type);
                            });
                        });
                        T.paymentRequest.on('cancel', function () {
                            KYB.buy.stripe.trackError('CANCEL (Apple Pay or Other)');
                        });
                    } else {
                        document.getElementById('payment-request-button').style.display = 'none';
                        tab.style.display = 'none';
                    }
                });
            }
        },
        trackError: function (errText, errCode) {
            if(typeof(errText)!='string') {
                errText = JSON.stringify(errText);
            }
            let p = {
                'error text': errText,
                'url': window.location.href
            };
            if(errCode) {
                p['error code'] = errCode;
            }
            KYB.tracker.trackEvent('Stripe Error', p);
        }
    }
};


KYB.paywallPopupShow = function(options,from) {
    var T = this;
    var $html = document.createElement('div');
    $html.innerHTML = '<div class="preloader"></div>';
    var popup = KYB.popup.show({
        html: $html,
        cssClass: 'hype-paywall-popup'+(typeof(hype)!='undefined'?' hype-fullscreen-popup':''),
        onClose: function () {
            if(T.xhr) {
                T.xhr.abort();
            }
        }
    });
    var params = {
        source: 'paywall'
    };
    if(from) {
        params.hubspotSource = from;
    }
    _.extend(params, options);
    this.xhr = KYB.get(KYB.baseUrl+'ajax/paywallPopup/', params).then(function (resp) {
        if(resp.html) {
            $html.innerHTML = '';
            var frag = document.createRange().createContextualFragment(resp.html);
            $html.appendChild(frag);

            KYB.tracker.trackEvent('View Paywall Popup', {
                'Page Id': KYB.pageId,
                url: window.location.href,
                type: 'paywall '+from
            });
        } else {
            $html.innerHTML = __('Error. Try again.');
        }
    });
};

KYB.customFields = {
    selectRender: function(options) {
        var T = this;
        var wrap = document.createElement('div');
        var title = document.createElement('div');
        var listWrap = document.createElement('div');
        var list = document.createElement('ul');
        var arr = document.createElement('i');
        var items = '';
        if(options.title) {
            title.innerHTML = options.title;
            items = '<li class="select-option select-option--none" data-value="">'+__('Any')+'</li>';
        } else {
            title.innerHTML = options.items[0].title;
        }
        var renderItem = function(o) {
            return o.value ? '<li class="select-option'+(o.className ? ' '+o.className : '')+(o.selected ? ' select-option--active' : '')+'" data-value="'+o.value+'">'+o.title+'</li>' : '';
        };
        _.each(options.items, function (o) {
            items += renderItem(o);
            if(o.selected) {
                title.innerHTML = o.title;
                title.classList.add('select-title--active');
                wrap.dataset.value = o.value;
                wrap.classList.remove('select-none');
            }
        });

        wrap.setAttribute('class', 'select select-none'+(options.className ? ' '+options.className : '')+(options.field.disabled ? ' select-disabled' : '')+(options.field.type == 'select-multiple' ? ' select-multiple' : ''));
        listWrap.setAttribute('class', 'select-list--wrap');
        list.setAttribute('class', 'select-list');
        title.setAttribute('class', 'select-title');
        arr.setAttribute('class', 'far fa-angle-down select-arrow');
        arr.innerHTML = '\uf107';

        list.innerHTML = items;

        if(options.items.length > 25) {
            var searchWrap = document.createElement('div');
            var search = document.createElement('input');
            searchWrap.setAttribute('class', 'select-search--wrap');
            search.setAttribute('class', 'select-search');
            search.setAttribute('type', 'text');
            search.setAttribute('placeholder', __('Type to search'));
            search.setAttribute('autofocus', 'true');

            searchWrap.appendChild(search);
            listWrap.appendChild(searchWrap);

            search.addEventListener('click', function (e) {
                e.stopPropagation();
            });
            let itemsEls = false;
            search.addEventListener('keyup', function (e) {
                var toSearch = e.target.value.toLowerCase();
                if(!itemsEls) {
                    itemsEls = list.querySelectorAll('.select-option');
                }
                itemsEls.forEach(el => {
                    if(el.dataset.value) {
                        let item = options.items.find(i => {
                            return i.value == el.dataset.value;
                        });
                        if(item.title.toLowerCase().indexOf(toSearch) >= 0) {
                            el.style.display = 'list-item';
                        } else {
                            el.style.display = 'none';
                        }
                    }
                });
                /*
                var result = _.filter(options.items, function (o) {
                    if(o.title.toLowerCase().indexOf(toSearch) >= 0) {
                        return true;
                    }
                });
                var items = '';
                if(options.title) {
                    items += '<li class="select-option select-option--none" data-value="">'+__('Any')+'</li>';
                }
                _.each(result, function (o) {
                    items += renderItem(o);
                });
                list.innerHTML = items;*/
            });
        }

        wrap.appendChild(title);
        listWrap.appendChild(list);
        wrap.appendChild(listWrap);
        wrap.appendChild(arr);

        var collapsed = true;
        var collapse = function() {
            wrap.classList.remove('select--focus');
            listWrap.addEventListener('transitionend', function end(e) {
                listWrap.removeEventListener('transitionend', end);
                if(collapsed) {
                    listWrap.style.display = 'none';
                }
            });
            collapsed = true;
            document.body.removeEventListener('click', collapse);
        };
        wrap.selectItem = function(item) {
            var value = item.dataset.value;
            var cn = 'select-title--active';
            var cn2 = 'select-option--active';
            var curr = wrap.getElementsByClassName(cn2);
            if(curr[0]) {
                curr[0].classList.remove(cn2);
            }
            if(value) {
                title.innerHTML = item.innerHTML;
                title.classList.add(cn);
                wrap.dataset.value = value;
                wrap.classList.remove('select-none');
                item.classList.add(cn2);
            } else {
                title.innerHTML = options.title;
                title.classList.remove(cn);
                wrap.dataset.value = false;
                wrap.classList.add('select-none');
            }
        };
        wrap.addEventListener('click', function(e) {
            if(collapsed) {
                listWrap.style.display = 'block';
                window.requestAnimationFrame(function () {
                    if(!collapsed) {
                        wrap.classList.add('select--focus');
                        document.body.addEventListener('click', collapse);
                        if(search) {
                            search.focus();
                        }
                    }
                });
                collapsed = false;
            } else {
                if(options.field.type != 'select-multiple' || e.target.classList.contains('select-arrow')) {
                    collapse();
                } else {
                    e.stopPropagation();
                }
            }
            if(e.target.tagName == 'LI') {
                if(options.field) {
                    var value = e.target.dataset.value;
                    if(options.field.type == 'select-multiple') {
                        _.each(options.field.options, function (o) {
                            if(!value) {
                                o.selected = false;
                            } else {
                                if(o.value == value) {
                                    if(o.selected) {
                                        o.selected = false;
                                    } else {
                                        o.selected = true;
                                        o.selected = true;
                                    }
                                }
                            }
                        });
                    } else {
                        options.field.value = value;
                    }

                    if ("createEvent" in document) {
                        var evt = document.createEvent("HTMLEvents");
                        evt.initEvent("change", false, true);
                        options.field.dispatchEvent(evt);
                    }
                    else {
                        options.field.fireEvent("onchange");
                    }
                } else {
                    this.selectItem(e.target);
                }
            }
        });

        if(options.field) {
            options.field.addEventListener('change', function(e) {
                if(e.target.type == 'select-multiple') {
                    let cn = 'select-option--active';
                    let count = 0;
                    let selected;
                    _.each(e.target.options, function (o) {
                        var item = wrap.querySelector('[data-value="'+o.value+'"]');
                        if(o.selected) {
                            item.classList.add(cn);
                            count++;
                            selected = o.innerHTML;
                        } else {
                            item.classList.remove(cn);
                        }
                    });
                    title.innerHTML = count ? (count > 1 ? (count+__(' selected')) : selected) : __('Any');
                } else {
                    var item = list.querySelector('[data-value="'+e.target.value+'"]');
                    if(item) {
                        wrap.selectItem(item);
                    }
                }
            });
            options.field.parentNode.insertBefore(wrap, options.field.nextSibling);
            options.field.customField = wrap;
        } else {
            return wrap;
        }
    },
    init: function (parent) {
        var T = this;
        if(!parent) {
            var parent = document;
        }
        var selects = parent.querySelectorAll('.field-select');
        _.each(selects, function(s) {
            var items = [];
            //_.each(s.getElementsByTagName('option'), function (o) {
            _.each(s.options, function (o) {
                items.push({
                    selected: o.selected,
                    title: o.innerHTML,
                    value: o.value,
                    className: o.dataset.className
                });
            });
            T.selectRender({
                title: s.dataset.title,
                className: s.dataset.className,
                field: s,
                items: items
            });
        });

        var lineSelects = parent.querySelectorAll('.field-select-line');
        _.each(lineSelects, function(s) {
            //var options = s.getElementsByTagName('option');
            var options = s.options;
            var wrap = document.createElement('div');
            var list = document.createElement('ul');
            var items = '';

            _.each(options, function (o) {
                if(o.value) {
                    items += '<li class="select-line-option'+(o.dataset.className ? ' '+o.dataset.className : '')+'" data-value="'+o.value+'">'+o.innerHTML+'</li>';
                }
            });

            wrap.setAttribute('class', 'select-line');
            list.setAttribute('class', 'select-line-list');
            list.innerHTML = items;

            wrap.appendChild(list);
            s.parentNode.insertBefore(wrap, s.nextSibling);

            var val = [];

            s.addEventListener('change', function (e) {
                var cn = 'select-line-option--active';
                _.each(e.target.options, function (o) {
                    var item = wrap.querySelector('[data-value="'+o.value+'"]');
                    if(o.selected) {
                        item.classList.add(cn)
                    } else {
                        item.classList.remove(cn)
                    }
                });
            });
            wrap.addEventListener('click', function(e) {
                if(e.target.tagName == 'LI') {
                    var value = e.target.dataset.value;
                    _.each(options, function (o) {
                        if(o.value == value) {
                            if(o.selected) {
                                o.selected = false;
                            } else {
                                o.selected = true;
                            }
                        }
                    });
                    if ("createEvent" in document) {
                        var evt = document.createEvent("HTMLEvents");
                        evt.initEvent("change", false, true);
                        s.dispatchEvent(evt);
                    }
                    else {
                        s.fireEvent("onchange");
                    }
                }
            });
        });

        var slider = parent.querySelectorAll('.field-slider');

        _.each(slider, function(s) {
            var moveThreshold = 8;
            var wrap = document.createElement('div');
            var slider = document.createElement('ul');
            var range = _.range(parseInt(s.dataset.from), parseInt(s.dataset.to), parseInt(s.dataset.step));
            var move = document.createElement('div');
            move.classList.add('slider-move');

            var moving = false
            var moveX = 0

            wrap.setAttribute('class', 'slider-wrap select-none'+(s.dataset.className?' '+s.dataset.className:''));
            slider.setAttribute('class', 'slider-bar' + ( range.length > 10 ? ' slider-bar--compressed' : ''));
            slider.prepend(move)

            move.addEventListener('mousedown', e => {
                moveX = e.clientX
                moving = true
            })

            var debouncedMove = _.throttle(e => {
                if(moving) {
                    const currentX = e.clientX;

                    const diff = currentX - moveX

                    const rect = move.getBoundingClientRect()
                    var next;

                    if(e.clientX > (rect.left + rect.width + moveThreshold)) {
                        const nodes = wrap.querySelectorAll('[data-value]')
                        const ell = wrap.querySelector('[data-value="'+ s.value +'"]')
                        const index = Array.prototype.indexOf.call(nodes, ell)
                        next = nodes[index + 1]
                    }

                    if(e.clientX < (rect.left - moveThreshold)) {
                        const nodes = wrap.querySelectorAll('[data-value]')
                        const ell = wrap.querySelector('[data-value="'+ s.value +'"]')
                        const index = Array.prototype.indexOf.call(nodes, ell)
                        next = nodes[index - 1]
                    }


                    if(next) {
                        const nextValue = next.dataset.value

                        s.value = nextValue;
                        if ("createEvent" in document) {
                            var evt = document.createEvent("HTMLEvents");
                            evt.initEvent("change", false, true);
                            s.dispatchEvent(evt);
                        }
                        else {
                            s.fireEvent("onchange");
                        }

                    }

                    next = null;

                }
            }, 10)

            document.addEventListener('mousemove', debouncedMove)

            document.addEventListener('mouseup', e => {
                if(moving) {
                    moving = false
                }
            })

            function setMoverPositionByValue(value) {
                const el = wrap.querySelector('[data-value="'+value+'"]')

                setTimeout(() => {
                    const left = el ? el.offsetLeft : 0;
                    move.style.transform = `translateX(${left}px)`;
                }, 0)
            }


            _.each(range, function (r) {
                if(typeof(s.dataset.min)!='undefined' && r < s.dataset.min) {
                    r = s.dataset.min;
                }
                var item = document.createElement('li');
                item.setAttribute('class', 'slider-bar--item');
                item.dataset.value = r;
                item.innerText = r+(s.dataset.unit?s.dataset.unit:'');
                App.tooltip({
                    el: item,
                    content: '&gt; '+r+(s.dataset.unit?s.dataset.unit:'')
                });
                slider.appendChild(item);
            });

            wrap.appendChild(slider);
            s.parentNode.insertBefore(wrap, s.nextSibling);
            s.customField = wrap;

            s.addEventListener('change', function (e) {
                var value = e.target.value;
                setMoverPositionByValue(value);
                var cn = 'slider-bar--item--active';
                var curr = wrap.getElementsByClassName(cn);
                if(curr[0]) {
                    curr[0].classList.remove(cn);
                }

                if(value) {
                    wrap.querySelector('[data-value="'+value+'"]').classList.add(cn);
                    wrap.classList.remove('select-none');
                } else {
                    wrap.classList.add('select-none');
                }
            });

            wrap.addEventListener('click', function(e) {
                if(e.target.tagName == 'LI') {
                    s.value = e.target.dataset.value;
                    if ("createEvent" in document) {
                        var evt = document.createEvent("HTMLEvents");
                        evt.initEvent("change", false, true);
                        s.dispatchEvent(evt);
                    }
                    else {
                        s.fireEvent("onchange");
                    }
                }
            });
        });

        var triggerChange = function (input) {
            if ("createEvent" in document) {
                var evt = document.createEvent("HTMLEvents");
                evt.initEvent("change", false, true);
                input.dispatchEvent(evt);
            }
            else {
                input.fireEvent("onchange");
            }
        };

        var intervals = parent.querySelectorAll('.field-select-interval');
        _.each(intervals, function(interval) {
            var T = this;
            var wrap = document.createElement('div');
            var title = document.createElement('div');
            var listWrap = document.createElement('div');

            var changeInput = function(input, list) {
                var value = parseFloat(input.value);
                var text = '';
                if(inputs.length > 1) {
                    var i = _.indexOf(inputs, input);
                    var opp = inputs[i*-1+1];
                    var oppValue = parseInt(opp.value);
                    var oppOptions = opp.parentNode.querySelector('.select-list').querySelectorAll('.select-option');
                    var options = input.parentNode.querySelector('.select-list').querySelectorAll('.select-option');
                    _.each(options, function (s) {
                        var sVal = parseInt(s.dataset.value);
                        if (sVal && value == sVal) {
                            s.classList.add('select-option--active');
                        } else {
                            s.classList.remove('select-option--active');
                        }
                    });
                    if(i) {
                        // to
                        _.each(oppOptions, function (s) {
                            var sVal = parseInt(s.dataset.value);
                            if (sVal) {
                                if (value && sVal >= value) {
                                    s.classList.add('disable');
                                } else {
                                    s.classList.remove('disable');
                                }
                            }
                        });
                        var from = oppValue;
                        var to = value;
                    } else {
                        // from
                        _.each(oppOptions, function (s) {
                            var sVal = parseInt(s.dataset.value);
                            if (sVal) {
                                if (value && sVal <= value) {
                                    s.classList.add('disable');
                                } else {
                                    s.classList.remove('disable');
                                }
                            }
                        });
                        var from = value;
                        var to = oppValue;
                    }

                    if(!isNaN(from) && !isNaN(to)) {
                        text = KYB.numberFormat(from)+' &ndash; '+KYB.numberFormat(to);
                    } else {
                        if(from) {
                            text = '&#8805; '+KYB.numberFormat(from);
                        } else if(to) {
                            text = '&#8804; '+KYB.numberFormat(to);
                        }
                    }
                } else if(value) {
                    text = (input.dataset.pre?input.dataset.pre:'&#8805; ')+KYB.numberFormat(value);
                }
                if(text) {
                    title.innerHTML = text+(input.dataset.unit?input.dataset.unit:'');
                    wrap.classList.add('--selected');
                } else {
                    title.innerHTML = 'Any';
                    wrap.classList.remove('--selected');
                }
            };

            var inputs = interval.querySelectorAll('input');
            _.each(inputs, function (input, i) {
                var inputList = document.createElement('div');
                var list = document.createElement('ul');
                list.setAttribute('class', 'select-list');
                inputList.setAttribute('class', 'select-interval-list select-interval-list--'+(i?'to':'from'));

                var items = '';
                _.each(input.dataset.values.split(','), function(o) {
                    items += '<li class="select-option" data-value="'+o+'">'+KYB.numberFormat(o)+(input.dataset.valueUnit?input.dataset.valueUnit:'')+'</li>';
                });
                list.innerHTML = items;

                inputList.appendChild(input);
                if(input.dataset.unit) {
                    var unit = document.createElement('span');
                    unit.classList.add('select-interval--unit');
                    unit.innerHTML = ' '+input.dataset.unit;
                    inputList.appendChild(unit);
                }
                if(input.dataset.title) {
                    var title = document.createElement('span');
                    title.classList.add('select-interval--title');
                    title.innerHTML = input.dataset.title;
                    inputList.appendChild(title);
                }
                inputList.appendChild(list);
                listWrap.appendChild(inputList);

                input.addEventListener('change', function (e) {
                    if(inputs.length > 1) {
                        var i = _.indexOf(inputs, e.target);
                        var opp = inputs[i*-1+1];
                        var value = parseFloat(e.target.value);
                        if(value) {
                            var oppValue = parseInt(opp.value);
                            var clear = false;
                            if(i) {
                                // to
                                if (value < oppValue) {
                                    clear = true;
                                }
                                if(oppValue == opp.dataset.soloValue) {
                                    clear = true;
                                }
                            } else {

                                if(value > oppValue) {
                                    clear = true;
                                }
                                if(value == e.target.dataset.soloValue) {
                                    clear = true;
                                }
                            }
                            if(clear) {
                                opp.value = '';
                                triggerChange(opp);
                            }
                        }
                    }
                    changeInput(input, list);
                });

            });

            var collapsed = true;
            var collapse = function() {
                wrap.classList.remove('select--focus');
                listWrap.addEventListener('transitionend', function end(e) {
                    listWrap.removeEventListener('transitionend', end);
                    if(collapsed) {
                        listWrap.style.display = 'none';
                    }
                });
                collapsed = true;
                document.body.removeEventListener('click', collapse);
            };
            wrap.addEventListener('click', function(e) {
                if(collapsed) {
                    listWrap.style.display = 'block';
                    window.requestAnimationFrame(function () {
                        if(!collapsed) {
                            wrap.classList.add('select--focus');
                            document.body.addEventListener('click', collapse);
                        }
                    });
                    collapsed = false;
                } else {
                    e.stopPropagation();
                }
                if(e.target.tagName == 'LI') {
                    var value = e.target.dataset.value;
                    var input = e.target.parentNode.parentNode.querySelector('input');
                    if(e.target.classList.contains('select-option--active')) {
                        input.value = '';
                    } else {
                        input.value = parseFloat(value);
                    }
                    triggerChange(input);
                    if(_.indexOf(inputs, input) || value == input.dataset.soloValue) {
                        // to
                        collapse();
                    }
                } else if(e.target.className == 'select-interval-clear') {
                    inputs.forEach(i => {
                        i.value = '';
                        triggerChange(i);
                    });
                }
            });
            wrap.setAttribute('class', 'select select-none select-multiple');
            listWrap.setAttribute('class', 'select-list--wrap'+(inputs.length>1 ? ' select-interval--with-to' : ''));
            title.setAttribute('class', 'select-title');
            title.innerHTML = 'Any';
            let clear = document.createElement('div');
            clear.className = 'select-interval-clear';
            wrap.appendChild(title);
            wrap.appendChild(clear);
            wrap.appendChild(listWrap);
            interval.appendChild(wrap);
        });


        document.body.classList.add('fields-inited');

    }
};


KYB.stripe = {

};

KYB.template = {
    render: function (view, addData) {
        if (view.template) {
            var tpl = view.template;
        } else {
            console.log('view not have template attribute');
            return false;
        }
        if (!this.tpls[tpl]) {
            var $tpl = document.getElementById(tpl);
            if ($tpl) {
                var html = $tpl.innerHTML;
            } else {
                console.log('template ' + tpl + ' not found');
                return false;
            }
            this.tpls[tpl] = {
                html: html,
                template: _.template(html)
            };
        }
        if (view.model) {
            var data = view.model.toJSON();
            if (addData) {
                _.extend(data, addData);
            }
            view.$el.html(this.tpls[tpl].template(data));
        } else {
            if (view.$el) {
                if (addData) {
                    view.$el.html(this.tpls[tpl].template(addData));
                } else {
                    view.$el.html(this.tpls[tpl].template());
                }
            } else {
                if (addData) {
                    return this.tpls[tpl].template(addData);
                } else {
                    return this.tpls[tpl].html;
                }
            }
        }
    },
    tpls: {}
};

function addslashes (str) {
    return (str + '').replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
}

KYB.requestDemoPopup = function (source, options) {
    var $html = document.querySelector('.request-demo-wrap').cloneNode(true);
    if(source=='PDF') {
        $html.querySelector('#request-demo-field-7').required = true;
    }
    if(options) {
        if(options.title) {
            $html.querySelector('.request-demo-wrap--header').innerHTML = options.title;
        }

        if (options.subtitle) {
            $html.querySelector('.request-demo-wrap--subtitle').innerHTML = options.subtitle;
        } else {
            $html.querySelector('.request-demo-wrap--subtitle').remove();
        }

        if(options.btn) {
            $html.querySelector('.button').innerHTML = options.btn;
        }

        if(options.textarea) {
            $html.querySelector('textarea').value = options.textarea;
        }
    }
    var popup = KYB.popup.show({
        html: $html,
        cssClass: 'request-demo--popup',
        onOpen: function (t) {
            var form = t.$content.querySelector('.request-demo--form');
            form.addEventListener('submit', function (e) {
                e.preventDefault();
                var params = serialize(form);

                if(options && options.source) {
                    params += '&source='+options.source;
                }
                if(options && options.platform) {
                    params += '&platform='+options.platform;
                }
                params += '&page='+KYB.pageId;
                KYB.post(KYB.baseUrl+'ajax/requestDemo/?'+params).then(function (resp) {
                    if(resp.success) {
                        popup.hide();
                        KYB.notify(__('Thank you! We will reach you shortly.'), 'success');
                        if(options.calback) {
                            options.calback();
                        }
                    } else {
                        form.querySelector('.button').classList.remove('button-preload');
                        KYB.notify('Error', 'danger');
                    }
                });
                form.querySelector('.button').classList.add('button-preload');
            });
        }
    });
    KYB.tracker.trackEvent('Page Action', {
        'Page Id': KYB.pageId,
        'Action': 'tap',
        'target': 'Request Demo btn '+source
    });
    return popup;
};

function formatDate(date) {
  date = new Date(date);
  var monthNames = [
    "January", "February", "March",
    "April", "May", "June", "July",
    "August", "September", "October",
    "November", "December"
  ];

  var day = date.getDate();
  var monthIndex = date.getMonth();
  var year = date.getFullYear();

  return  monthNames[monthIndex] + ' ' + day + ', ' + year;
}



KYB.signup = {
    popupShow: function (options) {
        var params = KYB.getParams();
        if(options && options.r) {
            params.r = options.r;
        }
        document.location.href = 'https://hypeauditor.com/signup/?'+KYB.param(params);
    }
};
KYB.login = {
    popupShow: function (options) {
        var T = this;
        this.popup = KYB.popup.show({
            html: __('Loading...'),
            cssClass: 'signup-popup'
        });
        var params = KYB.getParams();
        if(options && options.r) {
            params.r = options.r;
        }
        this.xhr = KYB.get(KYB.baseUrl+'login/', params).then(function (resp) {
            var frag = document.createRange().createContextualFragment(resp.html);
            var content = frag.querySelector('#login-container');
            T.popup.update(content);
            KYB.initSignupForm(options, content, true);
        });
    }
};
KYB.resetPassword = function(email, doneMsgBlockId) {
    KYB.post(KYB.baseUrl+'signup/forgotpassword/', {email: email}).then(function () {
        document.getElementById(doneMsgBlockId).innerHTML = '<h2>'+__('Reset your Password')+'</h2><p>'+__('Help is on the way. Check your email for a reset password link.')+'</p>';
    });
};

function sec2time(timeInSeconds) {
    var pad = function(num, size) { return ('000' + num).slice(size * -1); },
    time = parseFloat(timeInSeconds).toFixed(3),
    hours = Math.floor(time / 60 / 60),
    minutes = Math.floor(time / 60) % 60,
    seconds = Math.floor(time - minutes * 60),
    milliseconds = time.slice(-3);

    return (hours?pad(hours, 2) + ':' : '') + pad(minutes, 2) + ':' + pad(seconds, 2);
}
!function(t,e){"object"==typeof exports&&"undefined"!=typeof module?e(exports):"function"==typeof define&&define.amd?define(["exports"],e):e(t.timeago={})}(this,function(t){"use strict";var f=[60,60,24,7,365/7/12,12],o=function(t){return parseInt(t)},n=function(t){return t instanceof Date?t:!isNaN(t)||/^\d+$/.test(t)?new Date(o(t)):(t=(t||"").trim().replace(/\.\d+/,"").replace(/-/,"/").replace(/-/,"/").replace(/(\d)T(\d)/,"$1 $2").replace(/Z/," UTC").replace(/([\+\-]\d\d)\:?(\d\d)/," $1$2"),new Date(t))},s=function(t,e){for(var n=0,r=t<0?1:0,a=t=Math.abs(t);f[n]<=t&&n<f.length;n++)t/=f[n];return(0===(n*=2)?9:1)<(t=o(t))&&(n+=1),e(t,n,a)[r].replace("%s",t)},d=function(t,e){return((e=e?n(e):new Date)-n(t))/1e3},r="second_minute_hour_day_week_month_year".split("_"),a="秒_分钟_小时_天_周_个月_年".split("_"),e=function(t,e){if(0===e)return["just now","right now"];var n=r[parseInt(e/2)];return 1<t&&(n+="s"),["".concat(t," ").concat(n," ago"),"in ".concat(t," ").concat(n)]},i={en_US:e,zh_CN:function(t,e){if(0===e)return["刚刚","片刻后"];var n=a[parseInt(e/2)];return["".concat(t," ").concat(n,"前"),"".concat(t," ").concat(n,"后")]}},c=function(t){return i[t]||e},l="timeago-tid",u=function(t,e){return t.getAttribute?t.getAttribute(e):t.attr?t.attr(e):void 0},p=function(t){return u(t,l)},_={},v=function(t){clearTimeout(t),delete _[t]},h=function t(e,n,r,a){v(p(e));var o=d(n,a);e.innerHTML=s(o,r);var i,c,u=setTimeout(function(){t(e,n,r,a)},1e3*function(t){for(var e=1,n=0,r=Math.abs(t);f[n]<=t&&n<f.length;n++)t/=f[n],e*=f[n];return r=(r%=e)?e-r:e,Math.ceil(r)}(o),2147483647);_[u]=0,c=u,(i=e).setAttribute?i.setAttribute(l,c):i.attr&&i.attr(l,c)};t.version="4.0.0-beta.2",t.format=function(t,e,n){var r=d(t,n);return s(r,c(e))},t.render=function(t,e,n){var r;void 0===t.length&&(t=[t]);for(var a=0;a<t.length;a++){r=t[a];var o=u(r,"datetime"),i=c(e);h(r,o,i,n)}return t},t.cancel=function(t){if(t)v(p(t));else for(var e in _)v(e)},t.register=function(t,e){i[t]=e},Object.defineProperty(t,"__esModule",{value:!0})});


var copyToClipboard = function (str) {
  var el = document.createElement('textarea');
  el.value = str;
  el.setAttribute('readonly', '');
  el.style.position = 'absolute';
  el.style.left = '-9999px';
  document.body.appendChild(el);
  var selected =
    document.getSelection().rangeCount > 0
      ? document.getSelection().getRangeAt(0)
      : false;
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
  if (selected) {
    document.getSelection().removeAllRanges();
    document.getSelection().addRange(selected);
  }
};

// closest polyfill
var ElementPrototype = window.Element.prototype;
if (typeof ElementPrototype.matches !== 'function') {
    ElementPrototype.matches = ElementPrototype.msMatchesSelector || ElementPrototype.mozMatchesSelector || ElementPrototype.webkitMatchesSelector || function matches(selector) {
        var element = this;
        var elements = (element.document || element.ownerDocument).querySelectorAll(selector);
        var index = 0;

        while (elements[index] && elements[index] !== element) {
            ++index;
        }

        return Boolean(elements[index]);
    };
}
if (typeof ElementPrototype.closest !== 'function') {
    ElementPrototype.closest = function closest(selector) {
        var element = this;

        while (element && element.nodeType === 1) {
            if (element.matches(selector)) {
                return element;
            }

            element = element.parentNode;
        }

        return null;
    };
}

function median(values){
  if(values.length ===0) return 0;

  values.sort(function(a,b){
    return a-b;
  });

  var half = Math.floor(values.length / 2);

  if (values.length % 2)
    return values[half];

  return (values[half - 1] + values[half]) / 2.0;
}

var getJSON = function(url) {
    var xhr = new XMLHttpRequest();
	var promise = new Promise(function(resolve, reject) {
	    xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                var status = xhr.status;
                if (status == 200) {
                    resolve(xhr.response);
                } else {
                    reject(status);
                }
                //console.log('status',xhr.status)
            }
            //console.log(xhr.readyState)
		};
	});

    xhr.open('get', url, true);
    xhr.responseType = 'json';
    xhr.setRequestHeader("x-requested-with", "XMLHttpRequest");
    xhr.send();

	return {
	    abort: function () {
            xhr.abort();
            this.reject();
        },
        then: function (resolve, reject) {
	        this.reject = reject;
            promise.then(resolve, reject).catch(function(e) {
                setTimeout(function() { throw e; });
            });
            return this;
        }
    };
};

KYB.post = function (url, params) {
    return this.ajax(url, 'post', params);
};
KYB.get = function (url, params) {
    return this.ajax(url, 'get', params);
};
KYB.sendForm = function (url, params) {
    return this.ajax(url, 'form', params);
};
KYB.ajax = function (url, method, params) {
    var xhr = new XMLHttpRequest();
    var promise = new Promise(function(resolve, reject) {
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                var status = xhr.status;
                if (status == 200) {
                    if (xhr.responseURL !== location.protocol+'//'+KYB.domain+url && KYB.isOurIp) {
                      console.log('redirected from', url, 'to', xhr.responseURL);
                    }
                    if(!KYB.isOurIp) {
                        resolve(xhr.response);
                    } else {
                        var data = JSON.parse(xhr.responseText);
                        resolve(data);
                    }
                } else {
                    reject(xhr);
                }
            }
        };
        if(KYB.isOurIp) {
             xhr.addEventListener('error', function(e) {
                 console.log('error', e);
             });
        }
    });
    if(params && method == 'get') {
        url += (url.indexOf('?')<0 ? '?' : '&') + KYB.param(params);
    }

    xhr.open(method=='form' ? 'post' : method, url, true);
    if(method == 'get') {
        xhr.setRequestHeader("Content-type", "application/json; charset=utf-8");
    } else if(method == 'post') {
        xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded; charset=utf-8");
    }

    xhr.setRequestHeader("Accept", "*/*");
    xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");

    if(!KYB.isOurIp) {
        xhr.responseType = 'json';
    }

    if(method == 'post') {
        xhr.send(KYB.param(params))
    } else if(method == 'form') {
        if(params instanceof FormData) {
            xhr.send(params);
        } else {
            function buildFormData(formData, data, parentKey) {
              if (data && typeof data === 'object' && !(data instanceof Date) && !(data instanceof File)) {
                Object.keys(data).forEach(key => {
                  buildFormData(formData, data[key], parentKey ? parentKey + '['+key+']' : key);
                });
              } else {
                const value = data == null ? '' : data;
                formData.append(parentKey, value);
              }
            }
            var data = new FormData();
            buildFormData(data, params);
            xhr.send(data);
        }
    } else {
        xhr.send();
    }

    return {
        abort: function () {
            xhr.abort();
        },
        then: function (resolve, reject) {
            this.reject = reject;
            promise.then(resolve, reject).catch(function(e) {
                //if(KYB.isOurIp) {
                    throw e;
                //}
                //if(typeof(debugLog)!='undefined') {
                //    debugLog('onerror: ' + e.message, e.fileName, e.lineNumber, e.columnNumber, e);
                //}

            });
            return this;
        },
        xhr: xhr
    };
};

KYB.param = function(a) {
	var prefix,
		s = [],
		add = function( key, valueOrFunction ) {
			// If value is a function, invoke it and use its return value
			var value = typeof valueOrFunction === "function" ?
				valueOrFunction() :
				valueOrFunction;

			s[ s.length ] = encodeURIComponent( key ) + "=" +
				encodeURIComponent( value == null ? "" : value );
		};

	if ( a == null ) {
		return "";
	}
    for ( prefix in a ) {
        buildParams( prefix, a[ prefix ], add );
    }
	// Return the resulting serialization
	return s.join( "&" );
};
var rbracket = /\[\]$/;
function buildParams( prefix, obj, add ) {
	var name;
	if ( _.isArray( obj ) ) {

		// Serialize array item.
		_.each( obj, function( v, i) {
			if ( rbracket.test( prefix ) ) {

				// Treat each array item as a scalar.
				add( prefix, v );

			} else {

				// Item is non-scalar (array or object), encode its numeric index.
				buildParams(
					prefix + "[" + ( typeof v === "object" && v != null ? i : "" ) + "]",
					v,
					add
				);
			}
		} );
	} else if (toType( obj ) === "object" && !(obj instanceof Date) && !(obj instanceof File)) {

		// Serialize object item.
		for ( name in obj ) {
			buildParams( prefix + "[" + name + "]", obj[ name ], add );
		}

	} else {

		// Serialize scalar item.
		add( prefix, obj );
	}
}
function toType( obj ) {
	if ( obj == null ) {
		return obj + "";
	}
    var class2type = {};
	return typeof obj === "object" ?
		class2type[ class2type.toString.call( obj ) ] || "object" :
		typeof obj;
}


KYB.scrollTop = function (val) {
    var el = document.documentElement ? document.documentElement : document.body;
    if(typeof(val)!='undefined') {
        el.scrollTop = val;
    } else {
        return el.scrollTop;
    }
};

KYB.fadeOut = function(el, callback, ms) {
    if(!ms) {var ms = 200;}
    el.style.transition = 'opacity '+ms+'ms ease-in-out';
    el.addEventListener('transitionend', function hide(event) {
        if(event.target == el) {
            el.style.display = 'none';
            if(callback) {callback();}
            el.removeEventListener('transitionend', hide);
        }
    });
    el.style.opacity = '0';
};
KYB.fadeIn = function(el, callback, ms) {
    if(!ms) {var ms = 200;}
    el.style.opacity = 0;
    el.style.display = 'block';
    var opacity = 0;
    var timer = setInterval(function() {
      opacity += 50 / ms;
      if (opacity >= 1) {
        clearInterval(timer);
        opacity = 1;
        if(callback) {callback();}
      }
      el.style.opacity = opacity;
    }, 50);
};

KYB.trigger = function (el, e, data) {
    if (window.CustomEvent) {
      var event = new CustomEvent(e, {
          cancelable: true,
          detail: data
      });
    } else {
      var event = document.createEvent('CustomEvent');
      event.initCustomEvent(e, true, true, data);
    }
    el.dispatchEvent(event);
};
var serialize = function (form) {

	// Setup our serialized data
	var serialized = [];

	// Loop through each field in the form
	for (var i = 0; i < form.elements.length; i++) {

		var field = form.elements[i];

		// Don't serialize fields without a name, submits, buttons, file and reset inputs, and disabled fields
		if (!field.name || field.disabled || field.type === 'file' || field.type === 'reset' || field.type === 'submit' || field.type === 'button') continue;

		// If a multi-select, get all selections
		if (field.type === 'select-multiple') {
			for (var n = 0; n < field.options.length; n++) {
				if (!field.options[n].selected) continue;
				serialized.push(encodeURIComponent(field.name) + "=" + encodeURIComponent(field.options[n].value));
			}
		}

		// Convert field data to a query string
		else if ((field.type !== 'checkbox' && field.type !== 'radio') || field.checked) {
			serialized.push(field.name + "=" + field.value);
		}
	}

	return serialized.join('&');

};

KYB.feedbackModule = {
    container: 'body',
    reactions: [
        {ico: '&#xf119;', title: __('No, awful!'), className: 'far fa-frown', id: 0},
        {ico: '&#xf11a;', title: __('Could be better'), className: 'far fa-meh', id: 3},
        {ico: '&#xf581;', title: __('Yes, it’s great!'), className: 'far fa-grin-alt', id: 1}
    ],
    headerNegativeReaction: __('What could be improved?'),
    placeholderPositive: __('What could be improved? Its optionally.'),
    init: function(config) {
        if(KYB.isPDF || !KYB.user) {
            return false;
        }
        var f = new function() {
            _.extend(this, KYB.feedbackModule, config);
        };
        f.render();
        return f;
    },
    render: function () {
        var T = this;
        if(!_.isObject(this.container)) {
            this.container = document.querySelector(this.container);
        }
        if(!this.container) {return false;}
        this.el = document.createElement('div');
        this.el.className = 'hype-feedback'+(this.className?' '+this.className:'');
        var ul = document.createElement('ul');
        ul.className = 'hype-feedback--reactions';
        var lis = '';
        _.each(this.reactions, function (r) {
            lis += '<li class="hype-feedback--reaction" data-id="'+r.id+'"><i class="hype-feedback--reaction-ico '+r.className+'" data-id="'+r.id+'">'+r.ico+'</i>'+(r.title?r.title:'')+'</li>';
        });
        ul.addEventListener('click', function (e) {
            var id = e.target.dataset.id;
            if(typeof(id)!='undefined') {
                T.renderReaction(id);
                var cn = 'hype-feedback--reaction-curr';
                _.each(ul.childNodes, function (li) {
                    if(li.dataset.id == id) {
                        li.classList.add(cn);
                    } else {
                        li.classList.remove(cn);
                    }
                });
                T.ratingAlredySend = false;
                T.submit(id);
            }
        });
        ul.innerHTML = lis;
        if(this.header) {
            var h = document.createElement('h2');
            h.innerHTML = this.header;
            this.el.appendChild(h);
        }
        this.el.appendChild(ul);
        var close = document.createElement('i');
        close.className = 'far fa-times';
        close.innerHTML = '&#xf00d;';
        close.addEventListener('click', function () {
            T.setCookieOnlyCurrPage = false;
            T.setCookies();
            T.el.remove();
        }, {once: true});
        this.el.appendChild(close);
        this.container.innerHTML = '';
        this.container.appendChild(this.el);

        if(this.onInit) {
            this.onInit(this);
        }
    },
    renderReaction: function (id) {
        var T = this;
        if(this.reaction) {
            this.reaction.remove();
        }
        this.reaction = document.createElement('div');
        this.reaction.className = 'hype-feedback--reaction-form';
        var h = document.createElement('h3');
        var textarea = document.createElement('textarea');
        var form = document.createElement('form');
        var btn = document.createElement('button');
        textarea.className = 'field-input';
        textarea.rows = 4;
        textarea.autofocus = true;
        btn.type = 'submit';
        btn.className = 'button';
        btn.innerText = __('Send feedback');
        if(id == 1) {
            h.innerText = this.headerPositiveReaction;
            textarea.placeholder = this.placeholderPositive;
            textarea.required = true;
            textarea.focus();
        } else {
            h.innerText = id==3 && this.headerNeutralReaction ? this.headerNeutralReaction : this.headerNegativeReaction;
            textarea.placeholder = id==3 && this.placeholderNeutral ? this.placeholderNeutral : this.placeholderNegative;

            if(this.suggestions) {
                var ul = document.createElement('ul');
                ul.className = 'hype-feedback--suggestions';
                var lis = '';
                _.each(this.suggestions, function (s) {
                    lis += '<li class="hype-feedback--suggestion">'+s+'</li>';
                });
                ul.innerHTML = lis;
                var cn = 'hype-feedback--suggestion-active';
                var block = true;
                ul.addEventListener('click', function (e) {
                    if(e.target.tagName == 'LI') {

                        block = false;
                        if(e.target.classList.contains(cn)) {
                            e.target.classList.remove(cn);
                            if(!ul.getElementsByClassName(cn)[0]) {
                                block = true;
                            }
                        } else {
                            e.target.classList.add(cn);
                        }
                        if(textarea.style.display == 'none') {
                            if(block) {
                                btn.classList.add('button-disabled');
                            } else {
                                btn.classList.remove('button-disabled');
                            }
                            if(showTextarea) {
                                showTextarea();
                            }
                        } else {
                            textarea.required = block;
                        }
                    }
                });
                form.appendChild(ul);

                textarea.style.display = 'none';
                var addMsgBtn = document.createElement('div');
                addMsgBtn.className = 'hype-feedback--show-textarea-btn';
                addMsgBtn.innerHTML = '<i class="far fa-plus-circle">&#xf055;</i>'+__('Add custom feedback message');
                var showTextarea = function() {
                    addMsgBtn.remove();
                    textarea.style.display = 'block';
                    textarea.focus();
                    if(block) {
                        textarea.required = true;
                    }
                    btn.classList.remove('button-disabled');
                    showTextarea = false;
                };
                addMsgBtn.addEventListener('click', showTextarea, {once: true});
                form.appendChild(addMsgBtn);

                btn.classList.add('button-disabled');

            }
        }

        this.reaction.appendChild(h);
        form.appendChild(textarea);
        form.appendChild(btn);
        if(this.sendBtnHint) {
            var hint = document.createElement('span');
            hint.innerText = this.sendBtnHint;
            form.appendChild(hint);
        }
        this.reaction.appendChild(form);
        if(this.popupAfterReaction) {
            this.popup = KYB.popup.show({
                html: this.reaction,
                cssClass: 'hype-fullscreen-popup'
            });
        } else {
            this.el.appendChild(this.reaction);
        }

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            btn.classList.add('kyb-preload');
            var suggestions = [];
            if(ul) {
                _.each(ul.getElementsByClassName('hype-feedback--suggestion-active'), function (s) {
                    suggestions.push(s.innerText);
                });
            }
            T.submit(id, textarea.value, suggestions);
        }, {once: true});
    },
    submit: function (reaction, feedback, suggestions) {
        var T = this;
        var params = {};
        params.featureId = this.id;
        if(this.data) {
            _.extend(params, this.data);
        }
        if(!this.ratingAlredySend) {
            params.rating = reaction;
        }
        if(suggestions && suggestions.length) {
            _.each(suggestions, function (s) {
                feedback = s+'\n' + feedback;
            });
        }
        if(feedback) {
            params.rating_text = feedback;
        }
        KYB.post(KYB.baseUrl+'saveFeedback/', params).then(function (resp) {
            if(feedback) {
                T.thankYou(reaction);
            } else {
                T.ratingAlredySend = 1;
                T.setCookies();
            }
        });
    },
    setCookies: function() {
        var T = this;
        var cf = Cookies.getJSON("feedback");
        if(!cf) {
            cf = [];
        }
        cf.push(T.id);
        Cookies.set("feedback", cf, {expires: 365, path: T.setCookieOnlyCurrPage?document.location.pathname:'/'});
    },
    thankYou: function (rating) {
        var T = this;
        var el = this.popup?this.reaction:this.el;
        KYB.fadeOut(el, function () {
            el.innerHTML = '<h3 class="hype-feedback--done"><i class="fas fa-check">&#xf00c;</i> '+__('Thank you')+(rating ? '!' : __(' for your feedback. It helps us to improve.'))+'</h3>';
            KYB.fadeIn(el);
            if(T.popup) {
                setTimeout(function () {
                    T.container.remove();
                    T.popup.hide();
                }, 2000);
            }
        }, 400);
    }
};

KYB.signupSliderMove = function (e) {
    var list = document.querySelector('.js-slider-list'),
        controls = document.querySelectorAll('[data-control]'),
        title = document.querySelector('.js-signup-title');

    var delta = '-50%',
        titleText = __('Register for free to get access to the full YouTube report:');
    if (e.dataset.control === 'ig') {
        delta = '0';
        titleText = __('Register for free to get access to the full Instagram report:');
    }

    Array.prototype.forEach.call(controls, function (item) {
        item.classList.remove('slider__controls-item_active');
    });
    e.classList.add('slider__controls-item_active');
    title.innerText = titleText;

    list.style.transform = `translateX(${delta})`;
}

KYB.getTestJSON = function(url) {
    return new Promise((resolve, reject) => {
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = () => {
            if (xhr.readyState === 4) {
                var status = xhr.status;
                if (status == 200) {
                    resolve(JSON.parse(xhr.response));
                } else {
                    reject(xhr.error);
                }
            }
        };
        xhr.open('get', url, true);
        xhr.setRequestHeader("Content-type", "application/json; charset=utf-8");
        xhr.send();
    });
};

KYB.isLocal = () => location.href.includes('naca.dev');

KYB.pricingPlans ={
    starter: {
        title: __('Reports Starter'),
            price: '299',
            period: __('month'),
            quote: 1290
    },
    discovery: {
        ig: {
            title: __('Instagram Discovery Starter'),
                price: '299',
                period: __('month'),
                quote: 1294
        },
        yt: {
            title: __('YouTube Discovery Starter'),
                price: '299',
                period: __('month'),
                quote: 1295
        },
        tt: {
            title: __('TikTok Discovery Starter'),
                price: '299',
                period: __('month'),
                quote: 1296
        }
    },
    tracking: {
        title: __('Tracking Starter'),
            price: '299',
            period: __('month'),
            quote: 1297
    }
},
KYB.pricingSubscribe = function (plan, source) {
    if(!KYB.user) {
        document.location.href = '/signup/';
        return false;
    }
    var config = {};
    if(plan == 'discovery') {
        config = KYB.pricingPlans.discovery[KYB.pricingPlansDiscovery];
    } else {
        config = KYB.pricingPlans[plan];
    }
    config.source = source;
    // config.source = '<?=($this->actionName=='preview' || isset($isPreview) || $this->paywall ? 'paywall' : 'pricing')?>';

    KYB.subscribe.popup(config);

    KYB.tracker.trackEvent('Page Action', {
        'Page Id': KYB.pageId,
        'Action': 'tap',
        'target': 'pricing subscribe btn'
    });
}
