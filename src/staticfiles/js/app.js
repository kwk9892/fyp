'use strict';
window.hype = {
    init: function () {
        var T = this;
        this.container = document.getElementById('hype-container');
        this.content = document.getElementById('hype-content');
        this.sidebarMenuItem = document.getElementsByClassName('hype-sidebar--menu-item');
        this.viewport = document.querySelector("meta[name=viewport]");
        if (typeof (Navigo) != 'undefined') {
            this.router = new Navigo(location.protocol + '//' + KYB.domain + KYB.baseUrl + (!PRODUCTION ? 'app/' : ''));
            this.router.firstLoad = true;
            this.router.preload = {
                start: function () {
                    if (!KYB.isPDF) {
                        document.body.classList.add('preload');
                    }
                },
                end: function () {
                    document.body.classList.remove('preload');
                }
            };
            this.router.load = function (options, callback) {
                hype.controllers.beforeRoute();
                if (options.controller) {
                    if (options.controller != T.router.currController) {
                        // hype.container.setAttribute('class', options.controller+'-page hype-container js-hype-container');
                        hype.container.classList.remove('dashboard-page', 'discovery-page', 'reports-page', 'tracking-page', 'comparison-page', 'campaign-page', 'ratings-page');
                        hype.container.classList.add(`${options.controller}-page`);
                        hype.controllers.setCurrMenuItem(options.controller);
                        if (options.controller === 'campaign') {
                            hype.container.classList.remove('hype-container_trial');
                        }
                    }
                    T.router.currController = options.controller;
                } else {
                    // hype.container.removeAttribute('class');
                    hype.container.classList.remove('dashboard-page', 'discovery-page', 'reports-page', 'tracking-page', 'comparison-page', 'campaign-page', 'ratings-page');
                    T.router.currController = 'page';
                }
                var load = function (resp) {
                    hype.controllers.afterRoute();

                    if (callback) {
                        callback(resp);
                    }
                    setTimeout(function () {
                        _.each(hype.content.querySelectorAll('.hype-ttip-target, .kyb-tooltip-target'), function (ttip) {
                            App.tooltip({
                                el: ttip,
                                content: ttip.title
                            });
                            ttip.title = '';
                        });
                    }, 300);
                    KYB.initUserForm();

                    if (resp && resp.title) {
                        document.title = resp.title;
                    } else if (options.title) {
                        document.title = options.title + ' – HypeAuditor';
                    }

                    if (options.pageLoadParams) {
                        let eventName = '';
                        if (KYB.pageId == 'Auditor.Settings.index') {
                            eventName = 'View Settings'
                        } else if (KYB.pageId == 'Auditor.Error.Index') {
                            eventName = 'View Report'
                        }
                        KYB.tracker.pageLoad(options.pageLoadParams, eventName);
                    }

                    if (!KYB.isPDF) {
                        hype.viewport.setAttribute('content', options.mobileMaybe ? 'width=device-width' : 'width=1260');
                    }

                    window.dispatchEvent(afterLoadEvent);
                };
                if (hype.router.firstLoad) {
                    load();
                } else {
                    var path = options.action + (options.params ? options.params : '');
                    path = path.replace(/\/?(\?|#|$)/, '/$1');
                    var url = KYB.baseUrl + (!PRODUCTION ? 'app/' : '') + path + (options.query ? '?' + options.query : '');
                    this.xhr = KYB.get(url).then(function (resp) {
                        hype.content.innerHTML = '';
                        var frag = document.createRange().createContextualFragment(resp.html);
                        hype.content.appendChild(frag);
                        load(resp);
                    }, function (xhr) {
                        if (KYB.isOurIp) {
                            console.log('error load', xhr);
                        }
                        if (xhr.status) {
                            hype.content.innerHTML = '';
                            document.title = 'HypeAuditor - Error';
                            if (xhr.response && xhr.response.html) {
                                var resp = xhr.response.html;
                            } else {
                                var resp = xhr.response;
                            }
                            var frag = document.createRange().createContextualFragment(resp);
                            hype.content.appendChild(frag);
                            hype.controllers.afterRoute();
                        }
                    });
                }
            };

            this.router.reload = function () {
                var params = KYB.param(KYB.getParams());
                var currentUrl = T.router._lastRouteResolved.url;
                T.router._lastRouteResolved = null;
                T.router.preventScroll = true;
                return T.router.navigate(T.router.root + currentUrl + (params ? '?' + params : ''), 1);
            };

            var afterLoadEvent = new CustomEvent('afterLoad', {
                cancelable: true
            });
            this.router.hooks({
                before: function (done, params) {
                    // gc
                    if (T.router.xhr) {
                        T.router.xhr.abort();
                    }
                    if (KYB.whenToScrollA) {
                        KYB.whenToScrollA = [];
                    }
                    KYB.popup.currPopupHide();
                    T.router.preload.start();
                    var leaveEvent = new CustomEvent('leave', {
                        cancelable: true,
                        detail: params
                    });
                    window.dispatchEvent(leaveEvent);
                    App.tooltip.destroy();
                    done();
                },
                after: function (params, b) {
                    T.router.firstLoad = false;
                }
            });

            this.router.on(function (params, query) {
                T.controllers.dashboard(params, query)
            }).resolve();
            this.router.on('preview/:report', function (params, query) {
                T.controllers.preview(params, query)
            }).resolve();
            this.router.on('tracking/instagram/:report', function (params, query) {
                T.controllers.tracking(params, query)
            }, {
                leave: function (params) {
                    window.removeEventListener('scroll', T.tracking.scrollEvent);
                    var f = document.getElementById('hype-sidebar--feedback');
                    if (f) {
                        f.innerHTML = '';
                    }
                }
            }).resolve();
            this.router.on('instagram/:report', function (params, query) {
                T.controllers.instagram(params, query)
            }).resolve();
            this.router.on('youtube/:report', function (params, query) {
                T.controllers.youtube(params, query)
            }).resolve();
            this.router.on('discovery', function (params, query) {
                T.controllers.discovery(params, query)
            }, {
                before: function (done, params) {
                    // doing some async operation
                    done();
                },
                after: function (params) {
                    // after resolving
                },
                leave: function (params) {
                    KYB.discovery.gc();
                }
            }).resolve();
            this.router.on('reports', function (params, query) {
                T.controllers.reports(params, query)
            }).resolve();

            this.router.on('connect', function (params, query) {
                T.controllers.connect(params, query)
            }).resolve();
            this.router.on('tracking', function (params, query) {
                T.controllers.trackingTable(params, query)
            }).resolve();
            this.router.on('comparison/:usernames', function (params, query) {
                T.controllers.comparison(params, query)
            }).resolve();
            this.router.on('comparison', function (params, query) {
                T.controllers.comparison(params, query)
            }).resolve();
            this.router.on('campaign/new', function (params, query) {
                T.controllers.campaign.create(params, query)
            }).resolve();
            this.router.on('campaign/:id', function (params, query) {
                T.controllers.campaign.index(params, query)
            }).resolve();
            this.router.on('campaign', function (params, query) {
                T.controllers.campaign.list(params, query)
            }).resolve();
            this.router.on('campaign/:id/:action', function (params, query) {
                T.controllers.campaign.action(params, query)
            }).resolve();
            this.router.on('ratings', function (params, query) {
                T.controllers.ratings(params, query)
            }).resolve();
            this.router.on('ratings-yt', function (params, query) {
                T.controllers.ratingsYt(params, query)
            }).resolve();
            this.router.on('settings', function (params, query) {
                T.controllers.page(params, query)
            }).resolve();
            this.router.on('en', function (params, query) {
                T.controllers.dashboard(params, query)
            }).resolve();
            this.router.on('tiktok/:report', function (params, query) {
                T.controllers.vue(params, query)
            }).resolve();
            this.router.on('research', function (params, query) {
                T.controllers.vue(params, query)
            }).resolve();
            this.router.on({
                'deleted/:report': function (params, query) {
                    T.controllers.page(params.report, query)
                },
                'hidden/:report': function (params, query) {
                    T.controllers.page(params.report, query)
                }
            }).resolve();
        }

        // trial check
        if (this.container.classList.contains('hype-container_trial')) {
            var self = this;
            document.querySelector('.js-trial-not-now').addEventListener('click', function (e) {
                KYB.get(KYB.baseUrl + 'ajax/ctCloseTrialIntro/').then(function (response) {
                    if (response.success) {
                        self.container.classList.remove('hype-container_trial');
                    }
                });
            });
        }

        var sidebarToggle = document.getElementById('hype-mobile-sidebar-toggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', function () {
                var cn = 'hype-sidebar--show';
                var c = document.body.classList;
                if (T.mobileSidebarShowed) {
                    c.remove(cn);
                    T.mobileSidebarShowed = false;
                } else {
                    c.add(cn);
                    T.mobileSidebarShowed = true;
                }
            });
        }

        KYB.cmdKeyPressed = false;
        document.addEventListener('keydown', function (e) {
            var key = e.which || e.keyCode;
            if (key == 91 || key == 93 || key == 17 || key == 224) KYB.cmdKeyPressed = true;
        });
        document.addEventListener('keyup', function () {
            KYB.cmdKeyPressed = false;
        });

        function isTouchDevice() {
            return 'ontouchstart' in document.documentElement;
        }

        if (isTouchDevice()) {
            document.body.classList.add('is-touch');
        }
        var hypeContainer = document.querySelector('.js-hype-container'),
            hypeSidebar = document.querySelector('.js-sidebar');
        if (hypeSidebar) {
            document.querySelector('.js-sidebar-toggle').addEventListener('click', function (e) {
                hypeContainer.classList.toggle('hype-container__sidebar_min');
                var cookiesSidebarVal = hypeContainer.classList.contains('hype-container__sidebar_min') ? true : '';
                Cookies.set('sidebar', cookiesSidebarVal, {expires: 365, path: '/'});
                hypeSidebar.removeEventListener('mouseout', mouseoutEventHandler);
                hypeSidebar.removeEventListener('mouseover', mouseoverEventHandler);
                hypeContainer.classList.remove('hype-container__sidebar_hover');
                if (cookiesSidebarVal) {
                    setTimeout(function () {
                        hypeSidebar.addEventListener('mouseout', mouseoutEventHandler);
                    }, 150);
                    KYB.tracker.trackEvent('Page Action', {target: 'left menu collapse'});
                } else {
                    KYB.tracker.trackEvent('Page Action', {target: 'left menu expand'});
                }
            });
            if (hypeContainer && hypeContainer.classList.contains('hype-container__sidebar_min')) {
                hypeSidebar.addEventListener('mouseout', mouseoutEventHandler);
            }

            function mouseoutEventHandler(e) {
                hypeContainer.classList.remove('hype-container__sidebar_hover');
                hypeSidebar.removeEventListener('mouseover', mouseoverEventHandler);
                hypeSidebar.addEventListener('mouseover', mouseoverEventHandler);
            }

            function mouseoverEventHandler() {
                hypeContainer.classList.add('hype-container__sidebar_hover');
            }


            // lang dropdown
            var langContainer = document.querySelector('.js-lang-container'),
                langCurrent = document.querySelector('.js-lang-current');

            langCurrent.addEventListener('click', function (e) {
                langContainer.classList.toggle('lang_open');
            });

            langContainer.addEventListener('click', function (e) {
                let a = e.target.closest('.lang__item');
                let lang = a.dataset.lang;
                if (a && lang) {
                    e.preventDefault();
                    document.location.href = location.protocol + '//' + KYB.domain + '/' + lang + (!PRODUCTION ? '/auditor/app' : '') + T.router._lastRouteResolved.url;
                }
            });
        }
    },
    pagePromos: [],
    controllers: {
        activeItemClassName: 'hype-sidebar--menu-item-active',
        beforeRoute: function () {
            if (this.xhr) {
                this.xhr.abort();
            }
            if (hype.sidebarMenuItemCurr) {
                hype.sidebarMenuItemCurr.classList.remove(this.activeItemClassName);
            }
            this.startLoadDate = Date.now();
        },
        afterRoute: function (name) {
            if (!hype.router.preventScroll) {
                window.scrollTo(0, 0);
                hype.router.preventScroll = false;
            }
            hype.router.preload.end();
            if (hype.mobileSidebarShowed) {
                document.body.classList.remove('hype-sidebar--show');
            }
            if (document.location.hash) {
                var el = document.getElementById(document.location.hash.slice(1));
                if (el) {
                    var scrollTo = function () {
                        window.requestAnimationFrame(function () {
                            window.scrollTo(0, getOffset(el).top - 64);
                        });
                    };
                    if (typeof (KYB.performance) != 'undefined') {
                        scrollTo();
                    } else {
                        window.addEventListener("load", scrollTo, {once: true});
                    }
                }
            }
            hype.router.updatePageLinks();
        },
        setCurrMenuItem: function (name) {
            hype.sidebarMenuItemCurr = _.find(hype.sidebarMenuItem, function (i) {
                if (i.dataset.controller == name) {
                    return true;
                }
            });
            if (hype.sidebarMenuItemCurr) {
                hype.sidebarMenuItemCurr.classList.add(this.activeItemClassName);
            }
        },
        page: function (page, query) {
            // default
            var url = hype.router._lastRouteResolved.url.substr(1) + (query ? '?' + query : '');
            hype.router.load({
                action: url,
                pageLoadParams: {}
            });
        },
        connect: function (params, query) {
            hype.router.load({
                action: 'connect/',
                query: query
            });
        },
        instagram: function (params, query) {
            hype.router.load({
                action: 'instagram/',
                params: params.report,
                query: query,
                mobileMaybe: true
            }, KYB.initToggleDrop);
        },
        youtube: function (params, query) {
            hype.router.load({
                action: 'youtube/',
                params: params.report,
                query: query,
                mobileMaybe: true
            });
        },
        preview: function (params, query) {
            hype.router.load({
                action: 'preview/',
                params: params.report,
                query: query,
                mobileMaybe: true
            }, KYB.initToggleDrop);
        },
        trackingTable: function (params, query) {
            hype.router.load({
                action: 'tracking/',
                query: query,
                controller: 'tracking'
            });
        },
        tracking: function (params, query) {
            hype.router.load({
                action: 'tracking/instagram/',
                params: params.report,
                query: query,
                controller: 'tracking'
            });
        },
        comparison: function (params, query) {
            hype.router.load({
                action: 'comparison/',
                query: query,
                params: params && params.usernames ? params.usernames : false,
                controller: 'comparison'
            });
        },
        campaign: {
            list: function () {
                hype.router.load({
                    action: 'campaign/',
                    controller: 'campaign'
                }, function (resp) {
                    if (!KYB.fullstory.isInit) {
                        KYB.fullstoryRecord = true;
                        KYB.fullstory.init('auditor', {org: '8MY4Y'});
                    }
                });
            },
            index: function (params, query) {
                hype.router.load({
                    action: 'campaign/',
                    controller: 'campaign',
                    params: params.id,
                    query: query
                }, function (resp) {
                    if (!KYB.fullstory.isInit) {
                        KYB.fullstoryRecord = true;
                        KYB.fullstory.init('auditor', {org: '8MY4Y'});
                    }
                });
            },
            create: function (params, query) {
                hype.router.load({
                    action: 'campaign/new/',
                    controller: 'campaign',
                    query: query
                }, function () {
                    if (!KYB.fullstory.isInit) {
                        KYB.fullstoryRecord = true;
                        KYB.fullstory.init('auditor', {org: '8MY4Y'});
                    }
                });
            },
            action: function (params, query) {
                hype.router.load({
                    action: 'campaign/' + params.id + '/' + params.action,
                    controller: 'campaign',
                    query: query
                }, function () {
                    if (!KYB.fullstory.isInit) {
                        KYB.fullstoryRecord = true;
                        KYB.fullstory.init('auditor', {org: '8MY4Y'});
                    }
                });
            }
        },
        vue: function (params, query) {
            console.log(params, query);
            let url = '';
            if (params.report) {
                url = 'tiktok/' + params.report + '/';
            } else {
                url = 'research/';
            }

            document.location.href = 'https://' + KYB.domain + KYB.baseUrl + url;
        },
        dashboard: function (params, query) {
            hype.router.load({
                action: 'dashboard/',
                query: params,
                controller: 'dashboard'
            });
        },
        discovery: function (params, query) {
            hype.router.load({
                action: 'discovery/',
                controller: 'discovery',
                query: query
            });
        },
        reports: function (params, query) {
            hype.router.load({
                action: 'reports/',
                controller: 'reports',
                query: query
            });
        },
        ratings: function (params, query) {
            hype.router.load({
                action: 'ratings/',
                controller: 'ratings',
                query: query
            });
        },
        ratingsYt: function (params, query) {
            hype.router.load({
                action: 'ratings-yt/',
                controller: 'ratings',
                query: query
            });
        }
    },
    dataForPeriod: function (data, period) {
        if (!data || !data.length) {
            return [];
        }
        var startDateCurrPeriod = data[data.length - 1].time - (86400 * period);
        var curr = [];
        _.find(data.slice().reverse(), function (d) {
            if (d.time > startDateCurrPeriod) {
                curr.push({
                    time: d.time * 1000,
                    value: d.value
                });
            } else {
                return true;
            }
        });
        return curr.reverse();
    },
    highchartsOptions: {
        chartStyle: {
            //fontFamily : '"Proxima Nova", Tahoma, sans-serif',
            //overflow: 'visible'
        },
        tooltip: {
            outside: true,
            backgroundColor: '#86939E',
            borderRadius: 14,
            borderWidth: 0,
            padding: 6,
            shadow: false,
            useHTML: true,
            headerFormat: '',
            hideDelay: 100,
            pointFormatter: function (a) {
                // TODO hardcode (tooltip_pre -> tooltipOptions.valuePrefix)
                var o = this.series.userOptions;
                var c = o.categories;
                var d = '';
                if (o.tooltip_pre) {
                    d = o.tooltip_pre + ' ';
                }
                if (c) {
                    d += Highcharts.dateFormat('%b %e, %Y', c[this.index].x);
                    if (c[this.index].x2) {
                        d += ' &ndash; ' + Highcharts.dateFormat('%b %e, %Y', c[this.index].x2);
                    }
                    d += '<br>';
                } else if (this.series.xAxis.userOptions.type == 'datetime') {
                    d += Highcharts.dateFormat('%b %e, %Y', this.x) + '<br>';
                }
                var html = (d ? '<small>' + d + '</small>' : '') + '<b>' + KYB.numberToLocale(this.y, 2) + (o.tooltip_unit ? o.tooltip_unit : '') + '</b>';

                return html;
            },
            style: {
                color: "#fff",
                fontSize: "13px",
                pointerEvents: "none",
                whiteSpace: "nowrap",
                fontFamily: '"Proxima Nova", Tahoma, sans-serif',
            }
        },
    },
    dateRange: function (options) {
        var startDateFormat = 'MMM D, YYYY';
        var endDateFormat = 'MMM D, YYYY';
        if (options.start.year() == options.end.year()) {
            startDateFormat = 'MMM D';
        }
        if (options.start.month() == options.end.month()) {
            startDateFormat = 'MMM D';
            endDateFormat = 'D, YYYY';
        }
        return options.start.format(startDateFormat) + '&thinsp;&ndash;&thinsp;' + options.end.format(endDateFormat);
    },
    deltaRender: function (data) {
        if (data && data.delta) {
            return '<div class="' + (data.period.value > data.period.value_prev ? 'positive' : 'negative') + '">' + (data.period.value > data.period.value_prev ? '+' : '&minus;') + (Math.abs(data.delta / data.period.value_prev) * 100).toFixed(2) + '%</div>';
        }
    },
    dashboard: {
        init: function () {
            var T = this;
            KYB.initUserForm();
            var lists = document.getElementById('lists-table-wrap');
            if(lists) {
                KYB.get('https://' + KYB.domain + KYB.baseUrl + (!PRODUCTION ? 'app/' : '') + 'recentSearches/').then(function (resp) {
                    lists.innerHTML = resp.html;
                    KYB.imageLoader.add(document.getElementsByClassName('lists-blogger-ava'));
                    hype.router.updatePageLinks();
                });
            }
            var tracking = document.getElementById('hype-dashboard-tracking');
            let params = KYB.getParams();
            if(params.account) {
                T.account = params.account;
            }
            KYB.whenToScroll(tracking, function () {
                KYB.get('https://' + KYB.domain + KYB.baseUrl + (!PRODUCTION ? 'app/' : '') + 'widgetTracking/', params).then(function (resp) {
                    tracking.innerHTML = resp.html;
                    T.dataWrap = document.getElementById('hype-dashboard--data');
                    if (resp.data) {
                        T.data = resp.data;
                        if(T.dataWrap) {
                            T.renderData();
                        }
                    }
                });
            });
            var tops = document.getElementById('hype-dashboard-ratings');
            KYB.whenToScroll(tops, function () {
                KYB.get('https://' + KYB.domain + KYB.baseUrl + (!PRODUCTION ? 'app/' : '') + 'getTop/?ajax=1').then(function (resp) {
                    tops.appendChild(document.createRange().createContextualFragment(resp.html));
                    hype.router.updatePageLinks();
                });
            });
            var blog = document.getElementById('hype-blog');
            KYB.whenToScroll(blog, function () {
                KYB.get('https://' + KYB.domain + KYB.baseUrl + (!PRODUCTION ? 'app/' : '') + 'getBlogPosts/?ajax=1').then(function (resp) {
                    var posts = '<div class="hype-columns">';
                    _.each(resp.posts, function (post) {
                        posts += KYB.template.render({
                            template: 'hypeBlogPostTpl'
                        }, post);
                    });
                    posts += '</div>';
                    blog.appendChild(document.createRange().createContextualFragment(posts));
                });
            });
            let campaigns = document.getElementById('hype-dashboard-campaigns');
            KYB.whenToScroll(campaigns, function () {
                KYB.get('https://' + KYB.domain + KYB.baseUrl + (!PRODUCTION ? 'app/' : '') + 'getCtDashboard/?ajax=1').then(function (resp) {
                    if (resp.success && !_.isEmpty(resp.campaigns)) {
                        Object.keys(resp.campaigns).forEach(id => {
                            let m = resp.campaigns[id].data.metrics;
                            if(m.media_new_count.value){
                                m.media_new_count.text = __n('1 new post', '{n} new posts', m.media_new_count.value, {n: m.media_new_count.value})
                            }
                        });
                        document.getElementById('hype-dashboard-campaigns--list').innerHTML = KYB.template.render({
                            template: 'hypeDashboardCampaignsTpl'
                        }, {
                            campaigns: resp.campaigns,

                        });
                        hype.router.updatePageLinks();
                    } else {
                        campaigns.remove();
                    }
                });
            });
            var discovery = document.getElementById('hype-discovery-recent-searches');
            KYB.whenToScroll(discovery, function () {
                KYB.get('https://' + KYB.domain + KYB.baseUrl + (!PRODUCTION ? 'app/' : '') + 'getDiscoveryRequests/?ajax=1').then(function (resp) {
                    var f = KYB.discovery.filterParams;
                    if (resp.thematics) {
                        f.influencer_category.list = resp.thematics;
                        f.influencer_yt_category.list = resp.thematics;
                    }
                    if (resp.locations) {
                        f.influencer_location.list = resp.locations;
                        f.audience_location.list = resp.locations;
                    }
                    if (resp.requests.length) {
                        var requests = '<div class="hype-white-block"><h3>' + __('Recent requests') + '</h3><ul class="hype-discovery-recent-searches">';
                        _.each(resp.requests, function (r) {
                            var texts = [];
                            _.each(r.search, function (f, n) {
                                if (_.isArray(f) && n != 'mentioned' && n != 'not_mentioned') {
                                    _.each(f, function (ff, i) {
                                        var t = hype.discovery.getFiltersText(ff, n);
                                        if (t) {
                                            texts.push(t);
                                        }
                                    });
                                } else {
                                    var t = hype.discovery.getFiltersText(f, n);
                                    if (t) {
                                        texts.push(t);
                                    }
                                }
                            });
                            var paramForUrl = {};
                            _.each(r.search, function (f, n) {
                                if (_.isArray(f) && _.isObject(f[0])) {
                                    _.each(f, function (ff, i) {
                                        _.each(ff, function (fff, ii) {
                                            paramForUrl['search[' + n + '][' + i + '][' + ii + ']'] = !isNaN(fff) ? parseInt(fff) : fff;
                                            ;
                                        });
                                    });
                                } else {
                                    if (!_.isArray(f) && _.isObject(f)) {
                                        _.each(f, function (fff, ii) {
                                            paramForUrl['search[' + n + '][' + ii + ']'] = !isNaN(fff) ? parseInt(fff) : fff;
                                        });
                                    } else {
                                        paramForUrl['search[' + n + ']'] = f;
                                    }
                                }

                            });

                            requests += KYB.template.render({
                                template: 'hypeDiscoveryRecentSearcheTpl'
                            }, {
                                total: KYB.numberToLocale(r.total),
                                text: texts.join(', '),
                                link: KYB.discovery.paramsToUrl(paramForUrl)
                            });
                        });
                        requests += '</ul><a href="discovery" onclick="KYB.tracker.trackEvent(\'Page Action\', {target: \'Dashboard discovery\'});">' + __('Go to discovery') + '</a></div>';
                        discovery.appendChild(document.createRange().createContextualFragment(requests));
                    } else {
                        var promoEL = document.getElementById('hype-discovery-promo');
                        if (promoEL) {
                            promoEL.style.display = 'block';
                        }
                        hype.pagePromos.push('discovery');
                    }
                });
            });
            KYB.pageId = 'Auditor.App.index';
            var pageLoadParams = {};
            if (hype.pagePromos.length) {
                pageLoadParams['Page Promos'] = _.uniq(hype.pagePromos);
            }
            KYB.tracker.pageLoad(pageLoadParams, 'View Dashboard');
        },
        getData: function () {
            var T = this;
            hype.router.preload.start();
            var query = (T.period ? '?date_from=' + T.period.start.format('YYYY-MM-DD') + '&date_to=' + T.period.end.format('YYYY-MM-DD') : '');
            if(T.account) {
                query += (query ? '&' : '?') + 'account='+T.account;
            }
            if (hype.router.xhr) {
                hype.router.xhr.abort();
            }
            hype.router.xhr = KYB.get(KYB.baseUrl + (!PRODUCTION ? 'app/' : '') + 'widgetTracking/' + query).then(function (resp) {
                T.data = resp.data;
                T.renderData();
                hype.router.preload.end();
                hype.router.xhr = false;
            });
        },
        renderData: function (period) {
            var T = this;
            var data = {};
            _.each(this.data.metrics, function (m, key) {
                if (m) {
                    data[key] = _.clone(m);
                    if (m.period && m.period.value_prev) {
                        //var p = m.performance[data.period+'d'];
                        //data[key].performance = p;
                        data[key].delta = m.period.value - m.period.value_prev;
                    }
                    if (data[key].grouped_history) {
                        var sum = [];
                        var dateFormat = '%e %b, %Y';
                        if (key == 'new_followers_count' || key == 'subscribers_count') {
                            _.each(data[key].grouped_history, function (s, i) {
                                sum.push({
                                    value: s.value,
                                    fromDate: moment(s.date_from).format('MMM D, YYYY'),
                                    toDate: moment(s.date_to).format('MMM D, YYYY')
                                });
                            });
                        } else if (key == 'views_count') {
                            var dataForPeriod = hype.dataForPeriod(history, period);
                            if (dataForPeriod.length <= 30) {
                                _.each(dataForPeriod, function (s) {
                                    sum.push({
                                        value: s.value,
                                        fromDate: Highcharts.dateFormat(dateFormat, s.time)
                                    });
                                });
                            } else {
                                var interval = Math.ceil(dataForPeriod.length / 30);
                                var sumValue = 0;
                                var fromDate = dataForPeriod[0].time;

                                _.each(dataForPeriod, function (s, i) {
                                    sumValue += s.value;
                                    if (!dataForPeriod[i + 1] || !((i + 1) % interval)) {
                                        sum.push({
                                            value: sumValue,
                                            fromDate: Highcharts.dateFormat(dateFormat, fromDate),
                                            toDate: Highcharts.dateFormat(dateFormat, s.time)
                                        });
                                        if (dataForPeriod[i + 1]) {
                                            fromDate = dataForPeriod[i + 1].time;
                                        }
                                        sumValue = 0;
                                    }
                                });
                            }
                        }
                        data[key].graph = sum;
                    }
                }
            });
            if (this.data.basic) {
                data.id = this.data.basic.id;
            }

            var tpl = KYB.template.render({
                template: this.data.channel_type == 'instagram' ? 'hypeDashboardDataTpl' : 'hypeDashboardYTDataTpl'
            }, data);
            this.dataWrap.innerHTML = '';
            this.dataWrap.appendChild(document.createRange().createContextualFragment(tpl));

            _.each(this.dataWrap.querySelectorAll('.hype-card-graph--bar'), function (ttip) {
                App.tooltip({
                    el: ttip,
                    content: ttip.title,
                    cssClass: 'hype-card-graph--bar-ttip'
                });
                ttip.title = '';
            });
            _.each(hype.content.querySelectorAll('.hype-ttip-target, .kyb-tooltip-target'), function (ttip) {
                App.tooltip({
                    el: ttip,
                    content: ttip.title
                });
                ttip.title = '';
            });
            KYB.channelsSuggest.init(document.getElementById('hype-accounts--menu-add-form'), {
                btnText: __('Add account'),
                type: 1,
                inputClass: 'hype-input',
                action: 'ajax/addToTracklist',
                usernameParamName: 'channelId',
                params: {
                    source: 'dashboard',
                    type: 1
                },
                onSubmit: function (data) {
                    if (data.success) {
                        hype.creditsUpdate(data.tokens, data.free_reports);
                        hype.router.navigate('/?account='+data.id);
                    } else {
                        if (data.error_type === 'exist') {
                            hype.router.navigate('/?account='+data.id);
                        }
                    }
                }
            });
            hype.router.updatePageLinks();
        },
        setPeriod: function (period, e) {
            this.period = {
                start: moment().subtract(period - 1, 'days'),
                end: moment()
            };
            this.getData();

            var menu = e.target.parentNode;
            var title = menu.parentNode.parentNode.querySelector('.dropdown-title');
            var cn = 'dropdown-menu--item-active';
            menu.querySelector('.' + cn).classList.remove(cn);
            e.target.classList.add(cn);
            title.innerHTML = __('Last {d} days', {d: period});
        },
        requestMultipleAccPopup: function () {
            KYB.requestDemoPopup('Track multiple accounts', {
                title: 'Track multiple accounts',
                btn: 'Request',
                source: 'web request dashboard tracking'
            });
        },
        addAccountPopup: function () {
            /*var promo = document.getElementById('hype-add-account-promo');
            var input = promo.querySelector('.field-input');
            promo.classList.remove('hype-add-account-promo--hide');
            input.focus();
            KYB.scrollTo('hype-add-account-promo');*/
            var formWrap = document.querySelectorAll('#hype-accounts--menu-wrap .hype-accounts--menu-wrap')[1];
            formWrap.classList.add('show-form');
            formWrap.querySelector('.hype-input').focus();
        },
        aboutPopup: function () {
            KYB.popup.show({
                html: document.getElementById('hype-dashboard--promo-popup').cloneNode(true),
                cssClass: 'hype-dashboard--promo-popup'
            });
        },
        accounts: {
            remove: function (type, id, full_name, e, source) {
                KYB.popup.confirm({
                    msg: __('Remove account'),
                    desc: __('You are going to remove {n} from the list of accounts you track.', {n: '<strong>' + full_name + '</strong>'}),
                    yes: __('Yes, remove it')
                }, function () {
                    KYB.post(KYB.baseUrl + 'ajax/removeFromTracklist/', {
                        channelId: id,
                        type: type,
                        source: source
                    }).then(function (data) {
                        if (!data.success && data.error) {
                            KYB.notify(data.error);
                        } else {
                            if (_.isEmpty(KYB.getParams())) {
                                document.location.reload();
                            } else {
                                if (source == 'list') {
                                    hype.router.navigate('/tracking/');
                                } else {
                                    hype.router.navigate('/');
                                }
                            }
                        }
                    });
                });

                e.stopPropagation();
            },
            unlock: function (type, id) {
                if (!KYB.user.tokens && (!KYB.user.free_reports || KYB.user.free_reports < 0)) {
                    document.location.href = 'https://hypeauditor.com/pricing/';
                    return false;
                }
                var done = function (resp) {
                    if (resp.success) {
                        if (resp[0]) {
                            resp = resp[0];
                        }
                        if (resp && resp.error) {
                            KYB.notify(__('This report is recalculating'), 'info');
                            return;
                        }

                        hype.creditsUpdate(resp.tokens, resp.free_reports);

                        if (resp.is_free) {
                            KYB.notify(__('This report is free, we didn\'t charge a credit'), 'info');
                        }


                        //hype.router.navigate('/?account='+id);
                        //document.location.reload();
                        hype.router.reload();
                    } else {
                        KYB.notify(__('Something went wrong'), 'danger');
                    }
                };
                if (type == 2) {
                    return KYB.post(KYB.baseUrl + 'youtube/unlock/?channel=' + id).then(done);
                } else {
                    return KYB.get(KYB.baseUrl + 'lists/unlockReport/', {id: id}).then(done);
                }
            }
        }
    },
    creditsUpdate: function (credits, free) {
        document.getElementById('hype-header--credits').innerHTML = '<i class="hype-credit-ico"></i> ' + (credits ? credits : __('No credits'));
        var free_r = document.getElementById('hype-header--free-report');
        if (free_r) {
            free_r.innerHTML = '<i class="fal fa-file-chart-pie">&#xf65a;</i> ' + free + ' free ' + __('report', 'reports', free);
        }
        KYB.user.tokens = credits;
        KYB.user.free_reports = free;
    },
    getQuality: function (value) {
        if (value > 90) {
            return ['excellent', __('Excellent')];
        } else if (value > 80) {
            return ['great', __('Very Good')];
        } else if (value > 60) {
            return ['good', __('Good')];
        } else if (value > 40) {
            return ['average', __('Average')];
        } else if (value > 25) {
            return ['fair', __('Could be improved')];
        } else if (value >= 0) {
            return ['poor', __('Low')];
        }
        return ['none', 'N/A'];
    },
    discovery: {
        getFiltersText: function (filter, name) {
            var param = KYB.discovery.filterParams[name];
            if (!param) {
                return false;
            }
            var text = '';
            var s = '<strong>';
            if (name == 'is_personal' || name == 'has_contacts') {
                text += param.name;
            } else if (name == 'mentioned' || name == 'not_mentioned') {
                var d = _.map(filter, function (m) {
                    return '@' + m;
                });
                text += d.join(', ');
            } else {
                if (_.isObject(filter)) {
                    if (typeof (filter.id) != 'undefined') {
                        text += s + param.list[filter.id];
                    } else if (param.name) {
                        text += param.name + ':';
                    }
                    if (param.list && filter.from && param.list[filter.from]) {
                        text += ' ' + s + param.list[filter.from];
                    } else {
                        if (filter.from && filter.to) {
                            text += ' ' + (!filter.id ? s : '') + KYB.numberFormat(filter.from) + '–' + KYB.numberFormat(filter.to);
                        } else {
                            if (filter.from && filter.from > 0) {
                                text += (!filter.id ? s : '') + ' >' + KYB.numberFormat(filter.from);
                            } else if (filter.to && filter.to > 0) {
                                text += (!filter.id ? s : '') + ' <' + KYB.numberFormat(filter.to);
                            }
                        }
                    }
                    if (filter.p) {
                        text += ' >' + filter.p + '%'
                    }
                } else {
                    if (param.list) {
                        text += s + param.list[filter];
                    } else {
                        text += s + filter;
                    }
                }
            }
            if (param.unit) {
                text += param.unit;
            }
            if (param.pre) {
                if (name == 'mentioned') {
                    text = param.pre + ' ' + text;
                } else {
                    text = param.pre + ': ' + text;
                }
            }
            return text + '</strong>';
        }
    },
    upgrade: {
        showPopup: function (discoveryChannel) {
            var T = this;

            KYB.tracker.trackEvent('Page Action', {
                'Page Id': KYB.pageId,
                'target': 'Click Upgrade button'
            });

            var $html = document.createElement('div');
            $html.id = 'upgrade-popup';
            $html.innerHTML = '<h2 class="popup-header upgrade-popup__title"><i class="far fa-fire-alt">&#xf7e4;</i> ' + __('Upgrade your Free plan to Starter subscription') + '</h2><div class="preloader"></div>';
            this.popup = KYB.popup.show({
                html: $html,
                cssClass: 'hype-fullscreen-popup upgrade-popup',
                onClose: function () {
                    if (T.xhr) {
                        T.xhr.abort();
                    }
                    KYB.tracker.trackEvent('Page Action', {
                        'Page Id': KYB.pageId,
                        'target': 'Close Upgrade popup'
                    });
                }
            });

            this.xhr = KYB.get(KYB.baseUrl + 'ajax/getUpgradePopup/').then(function (resp) {
                if (resp.html) {
                    var frag = document.createRange().createContextualFragment(resp.html);
                    $html.appendChild(frag);
                    $html.querySelector('.preloader').remove();
                    if(discoveryChannel) {
                        let p = $html.querySelector('[data-plan="'+discoveryChannel+'"]');
                        if(p) {
                            KYB.trigger(p, 'click');
                        }
                    }
                } else {
                    $html.innerHTML = 'Error. Try again.';
                }
            });
        },
        buy: function (options, btn) {
            var T = this;
            if (!KYB.user) {
                document.location.href = '/signup/';
                return false;
            }

            KYB.subscribe.popup(options)
        }
    },
    stories: {
        init: function () {
            var stories = document.querySelector('.js-stories');
            if (!stories) {
                return false;
            }
            var list = document.querySelector('.js-stories-list'),
                listAr = [...list.querySelectorAll('[data-js-stories-item-id]')],
                storiesClose = document.querySelector('.js-stories-close');

            var readedStories = Cookies.get('stories');
            if (readedStories) {
                var readedStoriesArr =  readedStories.slice(0, -1).split(',');
                readedStoriesArr.forEach((item) => {
                    document.querySelector(`[data-js-stories-item-id="${item}"]`).classList.remove('new');
                });
            }

            // sliderList controltz
            this.sliderList.init();

            //modal control
            this.modal.init();
            this.closeIcon = document.querySelector('.js-stories-modal-close');

            window.addEventListener('keyup', (e) => {
                if (!this.modal.isOpen()) {
                    return false;
                }
                if (e.keyCode === 27) {
                    var currentActive = this.slider.getActive();
                    KYB.tracker.trackEvent('Close Story', {
                        'Page Id': KYB.pageId,
                        Action: 'Close Story',
                        id: currentActive.id,
                        page: currentActive.page + 1
                    });
                    this.modal.close();
                    this.slider.clear();
                }
                if (e.keyCode === 13) {
                    console.log('enter');
                }
                if (e.keyCode === 39) {
                    this.slider.moveRight();
                }
                if (e.keyCode === 37) {
                    this.slider.moveLeft();
                }
            });

            if (this.closeIcon) {
                this.closeIcon.addEventListener('click', () => {
                    var currentActive = this.slider.getActive();
                    KYB.tracker.trackEvent('Close Story', {
                        'Page Id': KYB.pageId,
                        Action: 'Close Story',
                        id: currentActive.id,
                        page: currentActive.page + 1
                    });
                    this.modal.close();
                    this.slider.clear();
                })
            }
            //slider control
            this.slider.init({
                onStoriesViewed: (id) => {
                    KYB.tracker.trackEvent('Finish Story', {'Page Id': KYB.pageId, Action: 'Finish Story', id: id});
                    document.querySelector(`[data-js-stories-item-id="${id}"]`).classList.remove('new');
                    var st = Cookies.get('stories') ? Cookies.get('stories') : '';
                    if (st.indexOf(id) < 0) {
                        Cookies.set('stories', st += `${id},`, { expires: 365, path: '/' })
                    }
                },
                onStoriesSwitched: function (id) {
                    KYB.tracker.trackEvent('Switch Story', {'Page Id': KYB.pageId, Action: 'Switch Story', id: id});
                },
                onStoriesCTAClick: function (currentActive) {
                    KYB.tracker.trackEvent('Tap Story CTA', {
                        'Page Id': KYB.pageId,
                        Action: 'Tap Story CTA',
                        id: currentActive.id,
                        page: currentActive.page + 1
                    });
                },
                onCarouselFinished: () => {
                    this.modal.close();
                    this.slider.clear();
                }
            });

            list.addEventListener('click', (e) => {
                var el = e.target.closest('[data-js-stories-item-id]');
                if (!el) {
                    return false;
                }
                this.slider.reinit(listAr.indexOf(el));
                KYB.tracker.trackEvent('Open Story', {
                    'Page Id': KYB.pageId,
                    Action: 'Open Story',
                    id: el.dataset.jsStoriesItemId
                });
                this.modal.open();
            })

            storiesClose.addEventListener('click', () => {
                stories.style.display = 'none';slideLeft
                Cookies.set('storiesClose', 1, {expires: 1, path: '/'});
            })

        },
        sliderList: {
            init() {
                console.log('sliderList init!');
                this.mainElenemt = document.querySelector('.js-stories-list');
                this.sliderWrapper = this.mainElenemt.querySelector('.js-stories-list-wrap');
                this.sliderItems = this.mainElenemt.querySelectorAll('[data-js-stories-item-id]');
                this.sliderControlLeft = document.querySelector('[data-js-slider-list-control="left"]');
                this.sliderControlRight = document.querySelector('[data-js-slider-list-control="right"]');

                this.wrapperWidth = parseFloat(getComputedStyle(this.sliderWrapper).width);
                this.itemStyle = this.sliderItems[0].currentStyle || window.getComputedStyle(this.sliderItems[0]);
                this.itemWidth = parseFloat(getComputedStyle(this.sliderItems[0]).width) + parseFloat(this.itemStyle.marginLeft) + parseFloat(this.itemStyle.marginRight);
                this.positionLeftItem = 0;
                this.transform = 0;
                this.step = this.itemWidth / this.wrapperWidth * 100;
                this.items = [];

                this.sliderItems.forEach((item, index) => {
                    this.items.push({ item: item, position: index, transform: 0 });
                });

                this.position = {
                    getMin: 0,
                    getMax: this.items.length,
                }

                if (this.wrapperWidth >= this.itemWidth * this.items.length) {
                    this.sliderControlRight.classList.remove('show');
                }

                this.sliderControlLeft.addEventListener('click', this.transformItem.bind(this));
                this.sliderControlRight.addEventListener('click', this.transformItem.bind(this));
                window.addEventListener('resize', this.reinit.bind(this));
            },
            reinit() {
                console.log('reinit sliderList');
                this.wrapperWidth = parseFloat(getComputedStyle(this.sliderWrapper).width);
                this.itemStyle = this.sliderItems[0].currentStyle || window.getComputedStyle(this.sliderItems[0]);
                this.itemWidth = parseFloat(getComputedStyle(this.sliderItems[0]).width) + parseFloat(this.itemStyle.marginLeft) + parseFloat(this.itemStyle.marginRight);
                this.positionLeftItem = 0;
                this.transform = 0;
                this.step = this.itemWidth / this.wrapperWidth * 100;

                // arrows control
                this.sliderControlLeft.classList.remove('show');
                if (this.wrapperWidth >= this.itemWidth * this.items.length) {
                    this.sliderControlRight.classList.remove('show');
                } else {
                    this.sliderControlRight.classList.add('show');
                }

                this.sliderWrapper.style.transform = 'translateX(0%)';
            },
            transformItem(e) {
                var direction = e.currentTarget.dataset.jsSliderListControl;
                if (direction === 'right') {
                    if ((this.positionLeftItem + this.wrapperWidth / this.itemWidth) >= this.position.getMax) {
                        return;
                    }
                    if (Math.abs(this.transform - this.step * 2) < this.step * this.items.length - 100) {
                        this.positionLeftItem += 2;
                        this.transform -= this.step * 2;
                    } else {
                        this.positionLeftItem = this.position.getMax;
                        this.transform = -(this.step * this.items.length - 100);
                    }
                    if (!this.sliderControlLeft.classList.contains('show')) {
                        this.sliderControlLeft.classList.add('show');
                    }
                    if (this.sliderControlRight.classList.contains('show') && (this.positionLeftItem + this.wrapperWidth / this.itemWidth) >= this.position.getMax) {
                        this.sliderControlRight.classList.remove('show');
                    }
                }
                if (direction === 'left') {
                    if (this.positionLeftItem <= this.position.getMin) {
                        return;
                    }
                    if ((this.transform + this.step * 2) < 0) {
                        this.positionLeftItem -= 2;
                        this.transform += this.step * 2;
                    } else {
                        this.positionLeftItem = 0;
                        this.transform = 0;
                    }
                    if (!this.sliderControlRight.classList.contains('show')) {
                        this.sliderControlRight.classList.add('show');
                    }
                    if (this.sliderControlLeft.classList.contains('show') && this.positionLeftItem <= this.position.getMin) {
                        this.sliderControlLeft.classList.remove('show');
                    }
                }
                this.sliderWrapper.style.transform = 'translateX(' + this.transform + '%)';
            }
        },
        modal: {
            init() {
                this.modal = document.querySelector('.js-stories-modal');
            },
            close() {
                this.modal.classList.remove('is-open');
                document.body.style.overflow = 'auto';
            },
            open() {
                this.modal.classList.add('is-open');
                document.body.style.overflow = 'hidden';
            },
            isOpen() {
                return this.modal.classList.contains('is-open');
            },
        },
        slider: {
            _default() {
                return {
                    onStoriesViewed: function () {
                    },
                    onStoriesSwitched: function () {
                    },
                    onStoriesCTAClick: function () {
                    },
                    onCarouselFinished: function () {
                    },
                }
            },
            init(options) {
                console.log('slider init');
                this.slideLeft = document.querySelector('.js-slide-left');
                this.slideRight = document.querySelector('.js-slide-right');
                this.btns = document.querySelectorAll('.js-stories-card-btn');

                //calbacks
                Object.assign(this._options = {}, this._default(), options);

                Array.prototype.forEach.call(this.btns, (item) => {
                    item.addEventListener('click', (e) => {
                        if (this._options.onStoriesCTAClick && typeof this._options.onStoriesCTAClick === 'function') this._options.onStoriesCTAClick(this.getActive());
                    })
                });

                this.slideLeft.addEventListener('click', this.moveLeft.bind(this));
                this.slideRight.addEventListener('click', this.moveRight.bind(this));
            },
            reinit(index) {
                console.log('slider reinit');

                this.carouselIndex = index;
                this.idx = 0;
                this.duration = 15;
                this.timerProgress;

                this.carouselCell = document.querySelectorAll('.js-stories-carousel-cell');

                // clear
                this.clear();
                document.querySelector('.js-card-list-active').classList.remove('js-card-list-active');
                this.carouselCell[this.carouselIndex].classList.add('js-card-list-active');

                this.setInitial().then(()=> {
                    this.progress(this.lines[this.idx].children[0]);
                });
                this.carousel.init(this.carouselIndex);
            },
            clear() {
                clearTimeout(this.timerProgress);
                Array.prototype.forEach.call(document.querySelectorAll('.js-line-item'), (item) => {
                    item.classList.remove('animate', 'complete');
                    item.children[0].style.transform = 'translateX(-100%)';
                });
                Array.prototype.forEach.call(document.querySelectorAll('.js-stories-card'), (item) => {
                    item.style.display = 'block';
                    item.classList.remove('js-stories-card-active');
                });
            },
            setInitial() {
                return new Promise((resolve, reject) => {
                    this.idx = 0;
                    this.slider = document.querySelector('.js-card-list-active');
                    this.cards = this.slider.querySelectorAll('.js-stories-card');
                    this.lines = this.slider.querySelectorAll('.js-line-item');
                    this.cards[0].classList.add('js-stories-card-active');
                    this.renderImage(this.cards[0]).then(() => {
                        this.cards[this.idx].classList.add('_visible');
                        resolve();
                    }, function (error) {
                        reject(error);
                    });
                })
            },
            getActive() {
                return {
                    id: this.slider.dataset.jsStoriesCardListId,
                    page: [...this.cards].indexOf(this.slider.querySelector('.js-stories-card-active')),
                }
            },
            loadImage(src) {
                return new Promise((resolve, reject) => {
                    var img = new Image();
                    img.onload = () => {
                        resolve(img);
                    }
                    img.onerror = (error) => reject(error);
                    img.src = src;
                })
            },
            renderImage(el) {
                return new Promise((resolve, reject) => {
                    var elImg = el.querySelector('[data-image-load]');
                    if (!elImg) {
                        resolve();
                        return true;
                    }
                    this.loadImage(elImg.dataset.imageLoad).then(function (img) {
                        // elImg.src = elImg.dataset.imageLoad;
                        if (!!elImg.parentElement) {
                            // img.dataset.imageLoad = elImg.dataset.imageLoad;
                            elImg.parentElement.replaceChild(img, elImg);
                        } else {
                            elImg.src = img.src;
                        }
                        resolve();
                    }, function (error) {
                        reject(error);
                    })
                })
            },
            moveLeft() {
                clearTimeout(this.timerProgress);
                if (this.idx === 0 && this.carouselIndex !== 0) {
                    this.prevCarousel();
                    return false;
                }
                this.slideLeft.style.display = 'block';

                this.cards[this.idx].style.display = 'none';
                this.cards[this.idx].classList.remove('js-stories-card-active');
                this.lines[this.idx].classList.remove('animate');
                this.lines[this.idx].children[0].style.transform = 'translateX(-100%)';

                if (this.idx !== 0) {
                    --this.idx;
                }

                this.cards[this.idx].style.display = 'block';
                this.cards[this.idx].classList.add('js-stories-card-active');
                this.lines[this.idx].classList.remove('animate', 'complete');
                this.lines[this.idx].children[0].style.transform = 'translateX(-100%)';

                this.renderImage(this.cards[this.idx]).then(() => {
                    this.cards[this.idx].classList.add('_visible');

                    setTimeout(() => {
                        this.progress(this.lines[this.idx].children[0]);
                    }, 0)


                    if (this.idx === this.cards.length - 1) {
                        this.slideRight.style.display = 'none';
                    }
                });
            },
            moveRight() {
                clearTimeout(this.timerProgress);
                if (this.idx === this.cards.length - 1) {
                    if (this._options.onStoriesViewed && typeof this._options.onStoriesViewed === 'function') this._options.onStoriesViewed(this.getActive().id);
                    this.nextCarousel();
                    return false;
                }
                this.slideRight.style.display = 'block';

                this.cards[this.idx].style.display = 'none';
                this.cards[this.idx].classList.remove('js-stories-card-active');
                this.lines[this.idx].classList.add('complete');
                this.lines[this.idx].classList.remove('animate');

                this.cards[++this.idx].style.display = 'block';
                this.renderImage(this.cards[this.idx]).then(() => {
                    this.cards[this.idx].classList.add('_visible');
                    this.cards[this.idx].classList.add('js-stories-card-active');
                    this.progress(this.lines[this.idx].children[0]);

                    if (this.idx === 0) {
                        this.slideLeft.style.display = 'none';
                    }
                })
            },
            progress(el) {
                var i = 1;
                let self = this;
                this.timerProgress = setTimeout(function tick() {
                    el.style.transform = `translateX(-${100 - ++i * (100 / (self.duration - 1))}%)`;
                    if (i < self.duration) {
                        self.timerProgress = setTimeout(tick, 1000)
                    } else {
                        el.parentElement.classList.remove('animate');
                        self.moveRight();
                    }
                }, 1000);
                el.parentElement.classList.add('animate');
                el.style.transform = `translateX(-${100 - i * (100 / (this.duration - 1))}%)`;
            },
            nextCarousel() {
                if (this.carouselIndex === this.carouselCell.length - 3) {
                    if (this._options.onCarouselFinished && typeof this._options.onCarouselFinished === 'function') this._options.onCarouselFinished(this);
                    clearTimeout(this.timerProgress);
                    return false;
                }

                this.carouselCell[this.carouselIndex].classList.remove('js-card-list-active');
                this.carouselCell[++this.carouselIndex].classList.add('js-card-list-active');

                this.clear();
                this.setInitial().then(()=> {
                    this.progress(this.lines[this.idx].children[0]);
                })
                if (this._options.onStoriesSwitched && typeof this._options.onStoriesSwitched === 'function') this._options.onStoriesSwitched(this.getActive().id);

                this.carousel.moveCarouselRight();
            },
            prevCarousel() {
                if (this.carouselIndex === 0) {
                    // if (this._options.onCarouselFinished && typeof this._options.onCarouselFinished === 'function') this._options.onCarouselFinished(this);
                    clearTimeout(this.timerProgress);
                    return false;
                }

                this.carouselCell[this.carouselIndex].classList.remove('js-card-list-active');
                this.carouselCell[--this.carouselIndex].classList.add('js-card-list-active');

                this.clear();

                this.setInitial().then(()=> {
                    this.progress(this.lines[this.idx].children[0]);
                })
                if (this._options.onStoriesSwitched && typeof this._options.onStoriesSwitched === 'function') this._options.onStoriesSwitched(this.getActive().id);

                this.carousel.moveCarouselLeft();
            },
            carousel: {
                init(index) {
                    this.carousel = document.querySelector('.js-stories-carousel');
                    this.cells = this.carousel.querySelectorAll('.js-stories-carousel-cell');
                    this.cellCount = this.cells.length;
                    // this.selectedIndex = 0;
                    this.selectedIndex = index;
                    // this.cellWidth = this.carousel.offsetWidth;
                    this.cellWidth = 695; //#todo width as a params
                    this.rotateFn = 'rotateY';

                    this.changeCarousel();
                },
                moveCarouselLeft() {
                    this.selectedIndex--;
                    this.rotateCarousel();
                },
                moveCarouselRight() {
                    this.selectedIndex++;
                    this.rotateCarousel();
                },
                rotateCarousel() {
                    var angle = this.theta * this.selectedIndex * -1;
                    this.carousel.style.transform = 'translateZ(' + -this.radius + 'px) ' +
                        this.rotateFn + '(' + angle + 'deg)';
                },
                changeCarousel() {
                    this.theta = 360 / this.cellCount;
                    var cellSize = this.cellWidth;
                    this.radius = Math.round((cellSize / 2) / Math.tan(Math.PI / this.cellCount));
                    for (var i = 0; i < this.cells.length; i++) {
                        var cell = this.cells[i];
                        if (i < this.cellCount) {
                            // visible cell
                            cell.style.opacity = 1;
                            var cellAngle = this.theta * i;
                            cell.style.transform = this.rotateFn + '(' + cellAngle + 'deg) translateZ(' + this.radius + 'px)';
                        } else {
                            // hidden cell
                            cell.style.opacity = 0;
                            cell.style.transform = 'none';
                        }
                    }

                    this.rotateCarousel();
                },
            },
        }
    }
};


hype.graph = {
    options: {
        title: false,
        credits: false,
        chart: {
            animation: false,
            zoomType: 'x',
            style: hype.highchartsOptions.chartStyle,
            backgroundColor: null,
            spacing: [0, 0, 0, 0],
            margin: [0, 0, 40, 0],
            height: 150,
            reflow: true
        },
        tooltip: hype.highchartsOptions.tooltip,
        plotOptions: {
            spline: {
                clip: false,
                lineWidth: 2,
                shadow: false,
                states: {
                    hover: {
                        lineWidth: 3,
                        halo: {
                            size: 0
                        }
                    }
                },
                marker: {
                    radius: 0,
                    states: {
                        hover: {
                            fillColor: '#FF6436',
                            lineColor: '#FFFFFF',
                            lineWidth: 4,
                            radius: 5.5
                        }
                    }
                }
            }
        },
        xAxis: {
            type: 'datetime',
            dateTimeLabelFormats: {
                day: '%b %e',
            },
            minPadding: 0,
            maxPadding: 0,
            tickWidth: 0,
            gridLineWidth: 1,
            gridLineColor: '#DEE7EE',
            lineWidth: 0,
            labels: {
                align: 'left',
                padding: 0,
                style: {
                    color: '#BBCBD8',
                    fontSize: '12px'
                },
                y: 20
            },
            crosshair: {
                color: '#FF6436'
            },
            zoomEnabled: true
        },
        yAxis: [{
            title: false,
            lineWidth: 1,
            gridLineWidth: 0,
            minorGridLineWidth: 0,
            labels: {
                reserveSpace: false,
                x: -7,
                padding: 0,
                formatter: function () {
                    return KYB.numberFormat(this.value);
                },
                useHTML: true,
                style: {
                    fontFamily: '',
                    backgroundColor: 'rgba(255, 255, 255, 1)',
                    //color: '#FF6436',
                    fontSize: '12px'
                }
            }
        }]
    },
    render: function (wrap, data) {
        var options = _.extend({}, this.options, data);
        if (KYB.isPDF) {
            options.chart.reflow = false;
        }

        return Highcharts.chart(wrap, options);
    }
};

hype.tabsInit = function () {
    var attr = 'data-tab';
    _.each(document.querySelectorAll('[' + attr + ']'), function (tabWrap) {
        var tabSelector = tabWrap.dataset.tab;
        tabWrap.removeAttribute(attr);
        var tabContent = document.querySelectorAll(tabSelector);
        if (tabContent.length) {
            var tabs = tabWrap.querySelectorAll('.hype-tab');
            var tabActiveI = _.indexOf(tabs, tabWrap.querySelector('.active'));
            _.each(tabs, function (tab) {
                tab.addEventListener('click', function () {
                    let cn = 'active';
                    let c = tabContent;
                    let i = tabActiveI;
                    tabs[i].classList.remove(cn);
                    c[i].classList.remove(cn);
                    i = tabActiveI = _.indexOf(tabs, tab);
                    tabs[i].classList.add(cn);
                    c[i].classList.add(cn);

                    KYB.tracker.trackEvent('Page Action', {
                        'Page Id': KYB.pageId,
                        'target': tabs[i].dataset.targetStat ? tabs[i].dataset.targetStat : 'Click tab',
                        'Action': 'tap'
                    });
                });
            });
        }
    });
};

hype.dropmenuInit = function () {
    _.each(document.querySelectorAll('.hype-dropmenu'), function (menu) {
        var isOpen = false;
        var o = 'hype-dropmenu--open';
        var a = 'hype-dropmenu--item-active';
        var curr = menu.querySelector('.' + a);
        var collapse = function (e) {
            menu.classList.remove(o);
            isOpen = false;
            var link = e.target.closest('.hype-dropmenu--item');
            if (link) {
                curr.classList.remove(a);
                link.classList.add(a);
                curr = link;
            }
        };
        menu.addEventListener('click', function (e) {
            if (isOpen) {
                //collapse(e);
            } else {
                menu.classList.add(o);
                isOpen = true;
                setTimeout(function () {
                    document.body.addEventListener('click', collapse, {once: true});
                });
            }
        });
    });
};

hype.contentNavigate = function (offset, alwaysFresh) {
    if (KYB.isPDF) {
        return false;
    }
    var contentNavLinks = document.getElementsByClassName('hype-content-nav--link');
    var contentNavOffsets = [];
    var contentNavCurr = 0;
    var scrollEvent = function () {
        if (alwaysFresh) {
            getOffsets();
        }
        var y = window.scrollY + 100;
        var o = contentNavOffsets;
        var curr = o.length - 1;
        for (var i = 0; i < o.length; i++) {
            if (o[i] > y) {
                curr = i - 1;
                break;
            }
        }
        if (curr < 0) {
            curr = 0;
        }
        if (contentNavCurr != curr) {
            var prev = contentNavCurr;
            contentNavCurr = curr;
            var cn = 'hype-content-nav--link-curr';
            window.requestAnimationFrame(function () {
                contentNavLinks[prev].classList.remove(cn);
                contentNavLinks[curr].classList.add(cn);
            });
        }
    };
    var getOffsets = function () {
        contentNavOffsets = [];
        _.each(contentNavLinks, function (link) {
            var o = getOffset(document.querySelector('[data-nav-target="' + link.dataset.nav + '"]')).top - (offset ? offset : 74);
            contentNavOffsets.push(o);
        });
    };
    if (contentNavLinks.length) {
        _.each(contentNavLinks, function (link) {
            link.addEventListener('click', function () {
                KYB.scrollTop(contentNavOffsets[_.indexOf(contentNavLinks, link)]);
            });
        });
        getOffsets();
        window.addEventListener('scroll', scrollEvent);
        window.addEventListener('leave', function () {
            window.removeEventListener('scroll', scrollEvent);
        }, {once: true});
    }
};

/**
 * Чтобы можно было переиспользовать
 *
 * @param container
 * @param currentStep
 */
hype.steps = {
    init: function (container, currentStep) {
        this.currentStep = currentStep || 1;
        this.stepTitles = container.querySelectorAll('.js-hype-step-title');
        this.stepContainers = container.querySelectorAll('.js-hype-step-content');

        this.activate(this.currentStep);
    },

    activate: function (stepNumber) {
        _.each(this.stepTitles, function (title) {
            if ((+title.dataset.step) === stepNumber) {
                title.classList.add('hype-steps__step--active');
            } else {
                title.classList.remove('hype-steps__step--active');
            }
        });

        _.each(this.stepContainers, function (step) {
            if ((+step.dataset.step) === stepNumber) {
                step.style.display = 'block';
            } else {
                step.style.display = 'none';
            }
        });
    },

    validate: function (rule, container, button) {
        if (!button) {
            return true;
        }

        if (rule(container)) {
            button.classList.remove('button-disabled');
            button.disabled = false;
        } else {
            button.classList.add('button-disabled');
            button.disabled = true;
        }
    }
};

hype.imageUploader = {
    init: function (options) {
        var T = this;
        this.container = options.el;
        this.area = this.container.querySelector('.js-drag-area');
        this.input = this.container.querySelector('.js-choose-input');
        this.previewArea = this.container.querySelector('.js-preview');

        // function preventDefaults(e) {
        //     e.preventDefault();
        //     e.stopPropagation();
        // }
        // function highlight(e) {
        //     T.area.classList.add('highlight');
        // }
        // function unhighlight(e) {
        //     T.area.classList.remove('highlight');
        // }
        //
        // ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function(eventName) {
        //     T.area.addEventListener(eventName, preventDefaults, false)
        // });
        //
        // ['dragenter', 'dragover'].forEach(function(eventName) {
        //     T.area.addEventListener(eventName, highlight, false)
        // });
        // ['dragleave', 'drop'].forEach(function(eventName) {
        //     T.area.addEventListener(eventName, unhighlight, false)
        // });

        if (this.input) {
            this.input.addEventListener('change', function () {
                T.handle(this.files);
            });
            this.area.addEventListener('drop', function (e) {
                var dt = e.dataTransfer;
                var files = dt.files;
                T.handle(files);
            }, false);
        }
    },
    handle: function (files) {
        var file = files[0];
        this.preview(file);
    },
    preview: function (file) {
        var T = this;

        var reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = function () {
            var img = document.createElement('img');
            img.src = reader.result;
            T.previewArea.style.backgroundImage = 'url(' + reader.result + ')';
        }
    }
};

hype.init();
