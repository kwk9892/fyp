'use strict';

KYB.report = {
    init: function (type, id, data) {
        var T = this;
        this.contentWrap = document.getElementById('content');
        this.tabs = document.getElementsByClassName('report-profile-tabs--list-item');
        this.tabContent = document.getElementById('report-tab-content');
        if(type == 'youtube') {

            this.youtube.data = data.data;
            this.youtube.id = id;

            var period = KYB.getParams().period ? KYB.getParams().period !== 'false' ? KYB.getParams().period : '' : 90;
            if(!data.is_paid) {
                period = 30
            }
            this.youtube.tab(data, period);

            var loadParams = {
                username: id,
                platform: 'youtube',
                quality: data.quality
            };

            let getParams = KYB.getParams();
            if(data.is_paid) {
                if(data.is_example) {
                    var eName = 'View Report Example';
                } else {
                    var eName = 'View Report';
                }
            } else {
                var eName = 'View Report Preview';
                let type = 'Guest Preview';
                if(KYB.user) {
                    if(data.report_state == 'NOT_READY') {
                        type = 'Generating';
                    } else {
                        type = 'Paywall';
                    }
                }
                loadParams.type = type;
            }
            if(getParams.source === 'similar') {
                loadParams.source = 'Similar account';
            }
            KYB.tracker.pageLoad(loadParams, eName);

        } else {
            this.instagram.id = id;
            this.instagram.init(id);
        }
        var cn = 'report-profile-tabs--list-item-active';
        _.each(this.tabs, function (tab) {
            if(tab.dataset.id==id && tab.dataset.type==type) {
                tab.classList.add(cn);
            } else {
                tab.classList.remove(cn);
            }
        });

        if (KYB.isOurIp) {
            var updateReportBtn = document.querySelector('.js-report-update'),
                updateStatus = document.querySelector('.js-report-update-status');
            if(updateReportBtn) {
                updateReportBtn.addEventListener('click', (e) => {
                    updateReportBtn.classList.add('button-preload');
                    var params = {
                        type: type === 'instagram' ? 1 : 2,
                        channel: id,
                    }
                    KYB.post(KYB.baseUrl+'ajax/updateReport/', params).then(function (resp) {
                        updateReportBtn.classList.remove('button-preload');
                        if (resp.success) {
                            updateStatus.innerText = 'Updated successfully!';
                        } else {
                            updateStatus.innerText = 'Update error!';
                        }
                        setTimeout(function () {
                            updateStatus.innerText = '';
                        }, 1000)
                    });
                });
            }
        }
    },
    cache: {},
    youtube: {
        similarData: [],
        numberFormat: function(v) {
            var f = 0;
            if(v>=100000000) {
                f = 0;
            } else if(v>=10000000) {
                f = 1;
            } else if(v>=1000000) {
                f = 2;
            } else if(v>=100000) {
                f = 0;
            } else if(v>=10000) {
                f = 1;
            } else if(v>=1000) {
                f = 2;
            }
            return KYB.numberFormat(v, f);
        },
        hypeYtConnect: function () {
            var p = document.getElementById('report-yt-connect--popup');
            if(p) {
                KYB.popup.show({
                    html: p.innerHTML,
                    cssClass: 'report-yt-connect--popup'
                });
            }
        },
        tab: function (resp, period) {
            if(resp) {
                var data = resp.data;
            } else {
                var data = this.data;
            }
            this.globalGraphPeriod = period;
            var p = KYB.getParams();
            if(p && p.ytConnected) {
                resp.quality = 'demography calculating';
                KYB.notify('Audience demography is calculating...', 'success');
            }

            if(resp && resp.report_state) {
                data.quality = resp.quality;
                data.is_paid = resp.is_paid;
                data.report_state = resp.report_state;
                data.is_example = resp.is_example;

                data.noDemography = !data.features || ['audience_age_gender', 'audience_geo', 'audience_languages']
                    .every(function(key) {
                        return !data.features[key]
                    });
            }


            // Для репорта в процессе генерации
            if(data.report_state === 'NOT_READY') {
                data.features = {}
            }

            // fake data for not paid report
            if(!data.is_paid && data.features && data.features.video_integration_price_status == 'OK') {
                data.features.video_integration_price = {
                    status: {code: 'OK'},
                    price: KYB.rand(1500,1600),
                    price_from: KYB.rand(500,600),
                    price_to: KYB.rand(7000,8000),
                    price_factors: {
                        video_views_avg: {value: KYB.rand(40000,42000), score: 3, style: "color"},
                        audience_geo: {score: 4, style: "color", country_name: "United States"},
                        audience_latitude: {title: "good", score: 4, style: "color"},
                        virality: {title: "Good", score: 1, style: "color"},
                        instagram_popularity: {title: "Very popular", score: 2, style: "color"}
                    }
                };
            }
            var T = this;
            data.periodTitle = __('Last {d} days', {d: T.globalGraphPeriod});
            var tpl = KYB.template.render({
                template: 'reportYoutubeTpl'
            }, data || {});

            var frag = document.createRange().createContextualFragment(tpl);
            this.overviewGraphs = frag.getElementById('report-overview-graphs');
            this.analyticsGraphs = frag.getElementById('report-content-analytics--stats');
            this.contentList = frag.getElementById('report-content--list');
            this.contentWrap = frag.getElementById('report-content--wrap');
            this.mentionsWrap = frag.querySelector('.yt-report-mention');
            this.similarChannels = frag.querySelector('.js-similar-channel');
            var dropdowns = frag.querySelectorAll('.dropdown');
            this.tooltipInit(frag.querySelectorAll('.integration-price__factors .kyb-tooltip-target'));

            this.graph = {};

            KYB.report.tabContent.innerHTML = '';
            KYB.report.tabContent.appendChild(frag);

            let contactsCopy = document.querySelectorAll('.contact-to-copy');
            if(contactsCopy.length) {
                contactsCopy.forEach(function(el) {
                    el.addEventListener('mousedown', function (e) {
                        if(e.target.className == 'contact-to-copy') {
                            copyToClipboard(e.target.innerText);
                            KYB.notify(__('Contact copied to clipboard'), 'success');
                        }
                    });
                });
            }

            if(resp && resp.report_state != 'NOT_READY' && data.basic) {
                T.ranksRender();
                KYB.get(KYB.baseUrl+'youtube/getRanking/', {channel: KYB.report.youtube.id}).then(function (resp) {
                    T.ranksRender(resp);
                });
            }

            if(p && p.connect) {
                this.hypeYtConnect();
            }

            if(resp && resp.report_state == 'NOT_READY') {
                KYBProgessBar.init({
                    channelType: 'youtube',
                    username: T.id
                });
                KYBProgessBar.start();
            }
            if(data && data.metrics && !_.isEmpty(data.metrics)) {
                T.metrics = data.metrics;
                //KYB.whenToScroll(T.overviewGraphs, function () {
                    T.graphInit('subscribers_count');
                    T.graphInit('views_count_cumulative');
                    T.overviewItemRender('views_avg');
                    T.overviewItemRender('er_per_video');

                //});
                T.contentAnalyticsStatRender(data.metrics);
            }

            let renderAqs = function() {
                let aqs = data.features.aqs.value_description;
                Highcharts.chart(document.getElementById('yt-report-aqs-chart'), {
                    reflow: false,
                    tooltip: T.highchartsOptions.tooltip,
                    chart: {
                        polar: true,
                        type: 'area',
                        width: 180,
                        height: 180,
                        spacing: [0, 0, 0, 0],
                        margin: [0, 0, 0, 0],
                        style: {
                            overflow: 'visible'
                        }
                    },
                    credits: false,
                    legend: false,
                    title: false,
                    pane: {
                        size: '70%'
                    },
                    xAxis: {
                        categories: ['Creator', 'Audience', 'Engagement', 'Credibility'],
                        tickmarkPlacement: 'on',
                        lineWidth: 0,
                        labels: {
                            distance: '110%',
                            rotation: 'auto',
                            align: 'center',
                            style: {
                                color: '#ffffff'
                            }
                        }
                    },
                    yAxis: {
                        gridLineInterpolation: 'circle',
                        lineWidth: 0,
                        min: 0,
                        max: 5,
                        labels: false,
                    },
                    series: [{
                        name: __('Component value'),
                        fillColor: 'rgba(255,255,255,0.5)',
                        lineColor: '#fff',
                        marker: false,
                        data: [aqs.creator.value, aqs.audience.value, aqs.engagement.value, aqs.credibility.value],
                    }]
                });
            }
            let aqsChart = document.getElementById('yt-report-aqs-chart');
            if(aqsChart && data && data.features && data.features.aqs && data.features.aqs.value_description) {
                KYB.whenToScroll(aqsChart, function () {
                    /*if(typeof(Highcharts) != 'undefined') {
                        renderAqs();
                    } else {
                        KYB.loadFile('/s/auditor/dist/js/libs/highcharts.js', 'js', function () {
                            KYB.loadFile('/s/auditor/dist/js/libs/highcharts-more.js', 'js', renderAqs);
                        });
                    }*/
                    KYB.feedbackModule.init({
                        id: 31,
                        data: {
                            username: T.data.basic.username
                        },
                        setCookieOnlyCurrPage: true,
                        header: __('Do you find the metric useful?'),
                        container: '.js-aqs-feedback',
                        className: 'hype-feedback-compact',
                        reactions: [
                            {ico: '&#xf164;', className: 'fal fa-thumbs-up', id: 1},
                            {ico: '&#xf165;', className: 'fal fa-thumbs-down', id: 0}
                        ],
                        popupAfterReaction: true,
                        headerNegativeReaction: __('Did not like?'),
                        headerPositiveReaction: __('Do you like it?'),
                        placeholderNegative: __('What kind of difficulties have you experienced?'),
                        placeholderPositive: __('What did you like most?'),
                        sendBtnHint: __('...to make Channel Quality Score more accurate.'),
                    });
                    document.querySelector('.report-aqs').classList.add('--showed');
                });
            }

            KYB.whenToScroll(this.contentWrap, function () {
                KYB.report.getYoutubeContent(KYB.report.youtube.id).then(function (resp) {
                    if(resp && resp.data) {
                        T.contentData = resp.data;
                        T.contentRender();
                    }
                });
            });

            KYB.whenToScroll(this.mentionsWrap, function () {
                T.mentions.get().then(function(resp) {
                    if(resp.success && resp.total_count) {
                        document.querySelector('.js-mention-count').innerHTML = __('{n} brand in last 90 days', '{n} brands in last 90 days', resp.total_count, {n: resp.total_count});
                        if(resp.brands) {
                            T.mentions.render(resp);
                        }
                    } else {
                        let calc = `<div id="report-demography-nofull">
                            <div id="report-demography-calculating"></div>
                            <h2>${__('Searching for brands mentioned last 90 days...')}</h2>
                            ${__('Check it back in 10 minutes to view Brands mentioned by the influencer, their est. CPM and benchmarks, industries and CTAs.')}
                        </div>`
                        let nodata = `<div class="report-no-data"><i class="far"></i> ${__('No brands mentioned last 90 days')}</div>`
                        if(resp._report_state == 'CALCULATING') {
                            if(data.is_paid) {
                                T.mentionsWrap.innerHTML = calc;
                            }
                        } else {
                            if(data.is_paid) {
                                T.mentionsWrap.innerHTML = nodata;
                            } else {
                                T.mentionsWrap.parentNode.parentNode.remove();
                            }
                        }
                    }
                });
            });

            this.getSimilar(KYB.report.youtube.id).then((data) => {
                if (Object.keys(this.similarData).length > 4) {
                    let similar = document.querySelector('.js-tabs-similar'),
                        similarTotal = document.querySelector('.js-similar-total'),
                        similarList = document.querySelector('.js-similar-list');
                    if (similar) {
                        similar.classList.remove('report__similar_disabled');
                        similar.addEventListener('click', (e) => {
                            KYB.tracker.trackEvent('Page Action', {'Page Id': KYB.pageId, Action: 'tap', target: 'YouTube View Similar top tab'});
                            this.scrollToSimilar();
                        });
                    }
                    similarTotal.addEventListener('click', function (e) {
                        KYB.tracker.trackEvent('Page Action', {'Page Id': KYB.pageId, Action: 'tap', target: 'YT Similar show more btn'});
                    });
                    similarList.addEventListener('click', function (e){
                       if (e.target.classList.contains('js-similar-total-item')) {
                           KYB.tracker.trackEvent('Page Action', {'Page Id': KYB.pageId, Action: 'tap', target: 'YT Similar show more btn'});
                       }
                    });
                } else {
                    KYB.report.hideSimilarBlock();
                }
            });

            _.each(dropdowns, function (dropdown) {
                var menu = dropdown.querySelector('.dropdown-menu');
                if(menu) {
                    var title = dropdown.querySelector('.dropdown-title');
                    menu.addEventListener('click', function (e) {
                        if(e.target.tagName == 'LI') {
                            title.innerHTML = e.target.innerHTML;
                            var activeClass = 'dropdown-menu--item-active';
                            dropdown.querySelector('.'+activeClass).classList.remove(activeClass);
                            e.target.classList.add(activeClass);
                        }
                    });
                } else {
                    var toggle = dropdown.querySelector('.dropdown-toggle');
                    var content = dropdown.querySelector('.dropdown-content');
                    var collapse = function(e) {
                        if(e.target != toggle && e.target != content) {
                            dropdown.classList.remove('dropdown--active');
                            document.body.removeEventListener('click', collapse);
                        }
                    };
                    dropdown.addEventListener('click', function (e) {
                        dropdown.classList.add('dropdown--active');
                        setTimeout(function () {
                            document.body.addEventListener('click', collapse);
                        });
                    });
                }
            });

            this.demographyWrap = document.getElementById('report-demography');
            if(this.demographyWrap && data.features && data.is_paid) {
                this.demographyCountries = document.getElementById('report-demography--countries');
                this.demographyCountriesMenu = this.demographyCountries.querySelector('.report-tabs--menu');
                var activeTabI = -1;
                var i = 0;
                var demograpyFeatures = ['audience_geo', 'audience_age_gender', 'audience_languages'];
                _.each(demograpyFeatures, function (name) {
                    var feature = data.features[name];
                    var tpl = KYB.template.render({
                        template: feature ? (name == 'audience_geo' ? 'reportYoutubeCountriesChartTpl' : 'reportYoutubeDemographyChartTpl') : 'reportYoutubeLowDataTpl'
                    }, {
                        data: feature,
                        name: name,
                        status: !feature && data.features[name+'_status_title'] ? data.features[name+'_status_title'] : false
                    });

                    if(activeTabI<0 && feature) {
                        activeTabI = i;
                    }
                    i++;

                    var frag = document.createRange().createContextualFragment(tpl);
                    var tab = document.createElement('div');
                    tab.className = 'report-tabs--content';
                    tab.appendChild(frag);
                    var tabLink = document.createElement('li');
                    var conf = T.config.demography[name];
                    tabLink.innerHTML = conf.ico+' '+conf.title;
                    tabLink.className = 'report-tabs--menu-item';

                    T.demographyCountries.appendChild(tab);
                    T.demographyCountriesMenu.appendChild(tabLink);
                });
                var menuActiveCLass = 'report-tabs--menu-active';
                var tabActiveClass = 'report-tabs--content-active';
                _.each(this.demographyWrap.querySelectorAll('.report-tabs-wrap'), function (w) {
                    var menuActive, tabActive;
                    var changeTab = function(i) {
                        if(menuActive) {
                            menuActive.classList.remove(menuActiveCLass);
                            tabActive.classList.remove(tabActiveClass);
                        }
                        if(menuItems[i]) {
                            menuActive = menuItems[i];
                            tabActive = tab[i];
                            menuActive.classList.add(menuActiveCLass);
                            tabActive.classList.add(tabActiveClass);
                        }
                    };
                    var menuItems = w.querySelectorAll('.report-tabs--menu-item');
                    var tab = w.querySelectorAll('.report-tabs--content');
                    changeTab(activeTabI);
                    _.each(menuItems, function (item, i) {
                        item.addEventListener('click', function () {
                            changeTab(i);
                        })
                    });
                });

                var savedFeedbacks = Cookies.getJSON('feedback');
                if(!savedFeedbacks || _.indexOf(savedFeedbacks, 21)<0) {
                    var ytDemographyFeedback = document.createElement('div');
                    ytDemographyFeedback.id = 'ytDemographyFeedback';
                    KYB.feedbackModule.init({
                        id: 21,
                        data: {
                            username: data.basic.id
                        },
                        setCookieOnlyCurrPage: true,
                        header: __('Do you find Audience demography relevant?'),
                        container: ytDemographyFeedback,
                        className: 'hype-feedback-compact',
                        reactions: [
                            {ico: '&#xf164;', className: 'fal fa-thumbs-up', id: 1},
                            {ico: '&#xf165;', className: 'fal fa-thumbs-down', id: 0}
                        ],
                        popupAfterReaction: true,
                        headerNegativeReaction: __('Did not like?'),
                        headerPositiveReaction: __('Do you like it?'),
                        placeholderNegative: __('What kind of difficulties have you experienced?'),
                        placeholderPositive: __('What did you like most?'),
                        suggestions: [__('Lack of metrics'), __('Wrong data'), __('Nothing new'), __('Bugs'), __('Other')],
                        sendBtnHint: __('...to make Audience demography more accurate.'),
                    });
                    this.demographyWrap.appendChild(ytDemographyFeedback);
                }
                if(KYB.isOurIp && data.extra) {
                    var confidence = '<b>isOurIP</b><br>';
                    _.each(data.extra, function (data, key) {
                        confidence += key+': '+JSON.stringify(data)+'<br>';
                    });
                    this.demographyWrap.insertAdjacentHTML('beforeend', confidence);
                }
            }

            if(data.report_state !== 'NOT_READY') {

                KYB.feedbackModule.init({
                    id: 19,
                    data: {
                        username: data.basic.id
                    },
                    container: '#report-feedback',
                    header: __('Do you find the YouTube report useful?'),
                    headerPositiveReaction: __('Can we improve anything about the report?'),
                    placeholderNegative: __('What should be improved about the report?'),
                    sendBtnHint: __('...to make this report better'),
                    suggestions: [__('Inaccurate demography'),__('Lack of metrics'),__('Other')]
                });
            }


            this.priceFeedbackInit();

            document.addEventListener('DOMContentLoaded',function() {
                var previewAbout = document.getElementById('preview-about');
                if(previewAbout && previewAbout.offsetHeight > 52) {
                    previewAbout.classList.add('collapsed');
                    previewAbout.addEventListener('click', function () {
                        previewAbout.classList.remove('collapsed');
                    });
                }
            }, {once: true})
            if(data.basic.blogger_emails && data.basic.blogger_emails.length > 1) {
                App.tooltip({
                    el: document.querySelector('.kyb-user-info--contacts'),
                    content: function (t) {
                        var html = '';
                        html += '<h4>'+__('Contact emails')+':</h4><ul class="kyb-user-info--contacts-list">';
                        _.each(data.basic.blogger_emails, function (c) {
                            html+='<li>'+c+'</li>';
                        });
                        html += '</ul>';
                        var copy = document.createElement('div');
                        copy.className = 'kyb-user-info--contacts-copy';
                        copy.innerHTML = '<i class="far fa-copy">&#xf0c5;</i> '+__('Click email to copy');
                        t.$content.innerHTML = html;
                        t.$content.appendChild(copy);
                        t.$content.addEventListener('click',function (e) {
                            if(e.target.tagName == 'LI') {
                                copyToClipboard(e.target.innerText);
                                KYB.notify(__('Contact copied to clipboard'), 'success');
                            }
                        });
                        return true;
                    },
                    cssClass: 'kyb-user-info--contacts-ttip'
                });
            }

            document.getElementById('report-footer').style.display = 'block';
        },
        ranksRender: function(data) {
            var ranksContainer = document.getElementById('report-ranks');
            if(data) {
                this.ranksData = data;
            }
            var ranksHTML = document.createRange().createContextualFragment(KYB.template.render({
                template: 'reportYoutubeRanksTpl'
            }, this.ranksData?this.ranksData:{}));
            ranksContainer.innerHTML = '';
            ranksContainer.appendChild(ranksHTML);
        },
        mentions: {
            errSrc: 'data:image/svg+xml;base64,PHN2ZyBhcmlhLWhpZGRlbj0idHJ1ZSIgZGF0YS1wcmVmaXg9ImZhciIgZGF0YS1pY29uPSJ1bmxpbmsiIGNsYXNzPSJzdmctaW5saW5lLS1mYSBmYS11bmxpbmsgZmEtdy0xNiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2aWV3Qm94PSIwIDAgNTEyIDUxMiI+PHBhdGggZmlsbD0iY3VycmVudENvbG9yIiBkPSJNMzA0LjA4MyAzODguOTM2YzQuNjg2IDQuNjg2IDQuNjg2IDEyLjI4NCAwIDE2Ljk3MWwtNjUuMDU3IDY1LjA1NmMtNTQuNzA5IDU0LjcxMS0xNDMuMjcgNTQuNzIxLTE5Ny45ODkgMC01NC43MTMtNTQuNzEzLTU0LjcxOS0xNDMuMjcgMC0xOTcuOTg5bDY1LjA1Ni02NS4wNTdjNC42ODYtNC42ODYgMTIuMjg0LTQuNjg2IDE2Ljk3MSAwbDIyLjYyNyAyMi42MjdjNC42ODYgNC42ODYgNC42ODYgMTIuMjg0IDAgMTYuOTcxTDgxLjM4NiAzMTEuODJjLTM0LjM0MSAzNC4zNDEtMzMuNDUxIDg4LjI2OS41OTcgMTIwLjg2NiAzMi41NzcgMzEuMTg3IDg0Ljc4OCAzMS4zMzcgMTE3LjQ0NS0xLjMybDY1LjA1Ny02NS4wNTZjNC42ODYtNC42ODYgMTIuMjg0LTQuNjg2IDE2Ljk3MSAwbDIyLjYyNyAyMi42MjZ6bS01Ni41NjgtMjQzLjI0NWw2NC4zMDQtNjQuMzA0YzM0LjM0Ni0zNC4zNDYgODguMjg2LTMzLjQ1MyAxMjAuODgyLjYxMiAzMS4xOCAzMi41ODYgMzEuMzA5IDg0Ljc4NS0xLjMzNSAxMTcuNDNsLTY1LjA1NiA2NS4wNTdjLTQuNjg2IDQuNjg2LTQuNjg2IDEyLjI4NCAwIDE2Ljk3MWwyMi42MjcgMjIuNjI3YzQuNjg2IDQuNjg2IDEyLjI4NCA0LjY4NiAxNi45NzEgMGw2NS4wNTYtNjUuMDU3YzU0LjcxMS01NC43MDkgNTQuNzIxLTE0My4yNzEgMC0xOTcuOTktNTQuNzEtNTQuNzExLTE0My4yNy01NC43Mi0xOTcuOTg5IDBsLTY1LjA1NyA2NS4wNTdjLTQuNjg2IDQuNjg2LTQuNjg2IDEyLjI4NCAwIDE2Ljk3MWwyMi42MjcgMjIuNjI3YzQuNjg1IDQuNjg1IDEyLjI4MyA0LjY4NSAxNi45Ny0uMDAxem0yMzguMzQzIDM2Mi43OTRsMjIuNjI3LTIyLjYyN2M0LjY4Ni00LjY4NiA0LjY4Ni0xMi4yODQgMC0xNi45NzFMNDMuMTEyIDMuNTE1Yy00LjY4Ni00LjY4Ni0xMi4yODQtNC42ODYtMTYuOTcxIDBMMy41MTUgMjYuMTQyYy00LjY4NiA0LjY4Ni00LjY4NiAxMi4yODQgMCAxNi45NzFsNDY1LjM3MyA0NjUuMzczYzQuNjg2IDQuNjg2IDEyLjI4NCA0LjY4NiAxNi45Ny0uMDAxeiIvPjwvc3ZnPg==',
            imgErr: function(img, id) {
                let brand = KYB.report.youtube.data.mentions.find(item => item.basic.unique_id == id);
                if(brand && brand.basic) {
                    //let u = brand.basic.logo_urls;
                    let u = brand.features.merged_domains.data[0].basic.logo_urls;
                    let i = brand.basic.logo_i || 0;
                    i++;
                    if(u[i]) {
                        img.src = u[i];
                        brand.basic.logo_i = i;
                    } else {
                        brand.basic.logo_i = -1;
                        img.onerror = '';
                        img.style.opacity = .5;
                        img.src = this.errSrc;
                        return true;
                    }
                }
            },
            get: function() {
                return KYB.get(KYB.baseUrl+'youtube/getBrandMentions/', {channel: KYB.report.youtube.id}).then(function (resp) {
                    KYB.report.youtube.data.categoriesMap = resp.categories;
                    KYB.report.youtube.data.mentions = resp.brands;
                });
            },
            videos: {
                init: function() {
                    this.c = 'yt-report-mention--sidebar';
                    let o = 'onclick="KYB.report.youtube.mentions.videos.hide();"';
                    this.sidebar = document.createElement('div');
                    this.sidebar.className = this.c;
                    this.sidebar.innerHTML = `
                        <div class="${this.c}-overlay" ${o}></div>
                        <div class="${this.c}-content">
                            <div class="${this.c}-close" ${o}><i class="far fa-times">&#xf00d;</i></div>
                            <div class="${this.c}-scroll">
                                <div class="${this.c}-header"></div>
                                <div class="${this.c}-videos"></div>
                            </div>
                        </div>`;
                    this.header = this.sidebar.querySelector('.'+this.c+'-header');
                    this.list = this.sidebar.querySelector('.'+this.c+'-videos');
                    this.scroll = this.sidebar.querySelector('.'+this.c+'-scroll');
                    let wrap = document.getElementById('hype-content');
                    if(wrap) {
                        wrap.appendChild(this.sidebar);
                    } else {
                        document.body.appendChild(this.sidebar);
                    }
                },
                show: function(data) {
                    let T = this;
                    let el = document.querySelector('.'+this.c);
                    if(!el) {
                        this.init();
                    }
                    let videos = data.features.videos.data;
                    let domains = data.features.merged_domains.data;
                    let listHtml = '<a href="'+domains[0].basic.full_url+'" target="_blank">';
                    if(!data.basic.logo_i || data.basic.logo_i >= 0) {
                        let urls = domains[0].basic.logo_urls;
                        listHtml += `<div class="${T.c}-header-img" style="background-image: url('${urls[data.basic.logo_i || 0]}')"></div>`;
                    }
                    listHtml += `
                        <h5 class="ellipsis">${data.basic.title}</h5></a>
                        <div class="${T.c}-header-info">
                            <div class="${T.c}-header-info-count">${__n('1 video in last 90d', '{n} videos in last 90d', videos.length, {n: videos.length})}</div>
                            <div>${__('Last video {d}', {d: timeago.format(Date.parse(videos[0].time_added_iso))})}</div>
                        </div>
                    `;
                    this.header.innerHTML = listHtml;

                    listHtml = '';
                    videos.forEach(v => {
                        let cta = [];
                        domains.forEach(domain => {
                            let f = domain.basic.link_texts.filter(link => link.video_id == v.id && link.text);
                            cta.push(...f.map(link => '“'+link.text+'”'));
                        });
                        v.cta = cta.join(', ');
                        listHtml += KYB.template.render({
                            template: 'reportYoutubeMentionVideoTpl'
                        }, v);
                    });

                    this.list.innerHTML = listHtml;
                    KYB.report.youtube.tooltipInit(this.list.querySelectorAll('.kyb-tooltip-target'));

                    T.scroll.scrollTop = 0;
                    window.requestAnimationFrame(function () {
                        document.body.classList.add(T.c+'-showed');
                    });

                    KYB.tracker.trackEvent('Page Action', {
                        Action: 'tap',
                        target: 'YouTube show videos'
                    });
                },
                hide: function() {
                    document.body.classList.remove(this.c+'-showed');
                }
            },
            render: function(resp) {
                let T = this;
                let mentions = document.querySelector('.js-mention-list');
                let html = '';
                let count = resp.brands.length;
                let c = 'yt-report-mention--';
                let allBtn = false;
                /*
                let filter = document.querySelector('.js-mention-filter');
                if(count > 3) {
                    html = '<h4>'+__('Popular industries')+'</h4><ul>';
                    let industries = Object.keys(resp.categories);
                    const index = industries.indexOf('UNKNOWN');
                    if (index > -1) {
                        industries.splice(index, 1);
                    }
                    industries.slice(0,3).forEach(item => {
                        let i = resp.categories[item];
                        html += '<li class="'+c+'filter-item" data-id="'+item+'">'+i.title+'</li>';
                    });
                    html += '</ul>';
                    filter.innerHTML = html;
                    let mentionsItems = false;
                    filter.addEventListener('click', function (e) {
                        let elC = e.target.classList;
                        let a = 'active';
                        let h = 'hidden';
                        if(elC.contains(c+'filter-item')) {
                            if(!mentionsItems) {
                                mentionsItems = mentions.querySelectorAll('.'+c+'item');
                            }

                            mentionsItems.forEach(i => i.classList.remove(h));

                            if(!elC.contains(a)) {
                                let curr = filter.querySelector('.'+a);
                                if(curr) {
                                    curr.classList.remove(a);
                                }
                                elC.add(a);
                                for(let i = 0; i < count; i++) {
                                    if(resp.brands[i].features.categories.data.indexOf(e.target.dataset.id) < 0) {
                                        mentionsItems[i].classList.add(h);
                                    }
                                }
                            } else {
                                elC.remove(a);
                            }

                            if(allBtn) {
                                allBtn.remove();
                                mentions.classList.remove('collapsed');
                            }
                        }
                    });
                }
                html = '';*/

                resp.brands.forEach(item => {
                    if(item.basic.has_errors) {
                        item.err_src = this.errSrc;
                    }
                    let videos_count = item.metrics.videos_count.performance['90d'].value;
                    item.videoCountText = __n('View video', '{n} videos', videos_count, {n: videos_count});
                    html += KYB.template.render({
                        template: 'reportYoutubeMentionTpl'
                    }, item);
                });
                mentions.innerHTML = html;

                mentions.addEventListener('click', function (e) {
                    if(e.target.classList.contains(c+'show-videos')) {
                        let data = resp.brands.find(item => item.basic.unique_id == e.target.dataset.id);
                        T.videos.show(data);
                    }/* else if(e.target.classList.contains('js-mention-show-industry')) {
                        e.target.parentNode.querySelectorAll('.hidden').forEach(el => {
                            el.classList.remove('hidden');
                        });
                        e.target.remove();
                    }*/
                });

                KYB.imageLoader.add(mentions.querySelectorAll('.'+c+'img'));
                KYB.report.youtube.tooltipInit(mentions.querySelectorAll('.kyb-tooltip-target'));

                if(count > 6 && !KYB.isPDF) {
                    allBtn = document.createElement('div');
                    allBtn.className = 'button '+c+'all-btn';
                    allBtn.innerHTML = __n('Show one more brand', 'Show {n} more brands', count - 6, {n: count - 6});
                    allBtn.addEventListener('click', function () {
                        allBtn.remove();
                        mentions.classList.remove('collapsed');
                        KYB.tracker.trackEvent('Page Action', {
                            Action: 'tap',
                            target: 'YouTube show more brand mentions'
                        });
                    }, {once: true});
                    mentions.classList.add('collapsed');
                    mentions.appendChild(allBtn);
                }
/*
                let err = resp.link_with_errors;
                if(err && err.length) {
                    mentions.insertAdjacentHTML('afterend', '<div class="report-caption">'+__('One more link we were unable to recognize', '{n} more links we were unable to recognize', err.length, {n: err.length})+'</div>');
                }*/

                KYB.feedbackModule.init({
                    id: 30,
                    data: {
                        username: KYB.report.youtube.data.basic.username
                    },
                    setCookieOnlyCurrPage: true,
                    header: __('Do you find Brand Mentions relevant?'),
                    container: '#hype-youtube--mentions-feedback',
                    className: 'hype-feedback-compact',
                    reactions: [
                        {ico: '&#xf164;', className: 'fal fa-thumbs-up', id: 1},
                        {ico: '&#xf165;', className: 'fal fa-thumbs-down', id: 0}
                    ],
                    popupAfterReaction: true,
                    headerNegativeReaction: __('Did not like?'),
                    headerPositiveReaction: __('Does all brands look like brands, have we found all mentions?'),
                    placeholderNegative: __('What should be improved about the Brand Mentions?'),
                    placeholderPositive: __('What did you like most?'),
                    suggestions: [__('Wrong brand mentions'), __('Lack of metrics'), __('Other')],
                    sendBtnHint: __('...to make this report better'),
                });

                KYB.tracker.trackEvent('Page Action', {
                    Action: 'scroll',
                    target: 'YouTube brand mentions'
                });
            }
        },
        contentRender: function(sort, e) {
            if(!KYB.user && e && !KYB.isWhiteLabel) {
                this.showLogin();
                e.stopPropagation();
                return false;
            }
            if(!this.contentData) {
                return false;
            }
            if(!this.contentData.length) {
                this.contentEmptyState();
                return false;
            }
            var T = this;
            if(!sort) {
                var sort = T.contentSort?T.contentSort:(T.data.is_paid ? 'views_count' : 'recent');
            }
            T.contentSort = sort;

            if(T.globalGraphPeriod) {
                var startDateCurrPeriod = Math.floor(Date.now()/1000)-(86400*T.globalGraphPeriod);
                var data = [];
                _.find(T.contentData.slice().reverse(), function (d) {
                    if(d.time_added > startDateCurrPeriod) {
                        data.push(d);
                    } else {
                        return true;
                    }
                });
                if(!data.length) {
                    this.contentEmptyState();
                    return false;
                }
            } else {
                var data = T.contentData;
            }

            data = _.sortBy(data, function(d) {
                if(sort == 'liked_disliked') {
                    var m = d.metrics;
                    return (m.likes_count.value+m.dislikes_count.value+m.comments_count.value) / m.views_count.value;
                } else if(sort == 'recent') {
                    return d.time_added;
                } else {
                    return d.metrics[sort].value;
                }
            });
            data.reverse();

            var html = '';
            var tpl = document.createElement('template');
            _.each(data.slice(0, 12), function (item) {
                item.stat = item.metrics;
                item.sort = sort;

                if(item.stat.likes_count.value+item.stat.dislikes_count.value>=50) {
                    item.mark = item.stat.ltd_rate.mark;
                    item.markText = T.config.graph['ltd_rate'].markText[item.mark];
                } else {
                    item.mark = 'none';
                }
                html += KYB.template.render({
                    template: 'reportYoutubeContentItemTpl'
                }, item);
            });
            tpl.innerHTML = html;
            KYB.imageLoader.add(tpl.content.querySelectorAll('.report-content-item--img'));
            _.each(tpl.content.querySelectorAll('.report-content-item--score'), function (el, i) {
                App.tooltip({
                    el: el,
                    content: function(t) {
                        let d = {
                            ttip: false
                        };
                        let like = data[i].stat.likes_count.value;
                        let dislike = data[i].stat.dislikes_count.value;
                        if(like + dislike >= 50) {
                            d.ttip = __('{l} likes per 1 dislike', {l: Math.round(like/dislike)})
                        }
                        var tpl = KYB.template.render({
                            template: 'reportYoutubeContentItemTtipTpl'
                        }, d);
                        return t.$content.innerHTML = tpl;
                    },
                    cssClass: 'report-content-item--ttip',
                    sendStat: true
                });
            });
            T.contentList.innerHTML = '';
            T.contentList.appendChild(tpl.content);
        },
        similarRender: function () {
            let html = '';
            for (let key in this.similarData) {
                if (key === 'total') {
                    html += `<div class="similar-channels__item similar-channels__item_total report-column report-column25">
                                <div class="report-content-item">
                                    <div class="report-content-item--img-wrap">
                                        
                                        <div class="report-content-item--img">
                                        <div class="similar-channels__total-text">${__('Discover more similar channels')}</div>
                                        </div>
                                    </div>
                                    <div class="report-content-item--header">
                                        <div class="report-content-item--logo"><i class="far fa-compass"></i></div>
                                        <a href='https://${KYB.domain}${KYB.baseUrl}${(!PRODUCTION ? 'app/' : '')}discovery/?search%5Byt_similar%5D="${KYB.report.youtube.id}"&search%5Bst%5D="yt"' class="report-content-item--title js-similar-total-item">${__('Show more similar')} <i class="far fa-arrow-right"></i></a>
                                    </div>
                                    <div class="report-content-item--info">
                                        <span class="report-content-item--info-stat report-content-item--info-stat_total">
                                            ${__n('Total 1 found', 'Total {n} found', this.similarData[key], {n: this.similarData[key]})}
                                        </span>
                                    </div>
                                </div>
                            </div>`;
                    document.querySelector('.js-similar-total').innerHTML = `Show all ${this.similarData[key]} similar`;
                } else {
                    let item = this.similarData[key];
                    let period = this.globalGraphPeriod ? this.globalGraphPeriod + 'd':'all';
                    html += `<div class="similar-channels__item report-column report-column25">
                            <a href="${location.origin}${KYB.baseUrl}${this.similarData[key].report}?source=similar" class="report-content-item">
                                <div class="report-content-item--img-wrap">
                                    <div class="report-content-item--img" data-image="${item.features.last_media.data.thumbnail}">
                                    </div>
                                </div>
                                <div class="report-content-item--header">
                                    <div class="report-content-item--logo" data-image="${item.basic.avatar_url}"></div>
                                    <h5 class="report-content-item--title">${item.basic.title}</h5>
                                </div>
                                <div class="report-content-item--info">
                                    <span class="report-content-item--info-stat report-content-item--info-stat_subs">${KYB.numberFormat(item.metrics.subscribers_count.value, 0)} ${__('subscribers')}</span>
                                    <i class="fas fa-circle report-content-item--icon"></i>
                                    <span class="report-content-item--info-stat report-content-item--info-stat_avg">${KYB.numberFormat(item.metrics.views_avg.performance[period].value, 0)} ${__('avg views')}</span>
                                </div>
                            </a>
                        </div>`;
                }

            }
            let similarList = document.querySelector('.js-similar-list');
            similarList.innerHTML = html;
            KYB.imageLoader.add(similarList.querySelectorAll('.report-content-item--img,.report-content-item--logo'));

            if (!KYB.isPDF) {
                var resizeEnd;

                var items_count = this.isMobile() ? 2 : 4;
                this.sliderInit(items_count);

                window.addEventListener('resize', (e) => {
                    clearTimeout(resizeEnd);
                    resizeEnd = setTimeout(() => {
                        if ((this.isMobile() ? 2 : 4) !== items_count) {
                            items_count = this.isMobile() ? 2 : 4;
                            this.sliderInit(items_count);
                        }
                    }, 300);
                });
            }
        },
        sliderInit: function (items) {
            function Slider(options) {
                this._default = {
                    selector: '.slider',
                    arrows: {
                        selector: '[data-js-arrow]',
                        prev: 'disable',
                        next: ''
                    },
                    items: 4,
                    padding: 20,
                };
                Object.assign(this._options = {}, this._default, options);

                this._options.el = document.querySelector(this._options.selector);
                this._options.count = this._options.el.children.length;
                // this._options.itemWidth = +(100/this._options.count).toFixed(2);
                this._options.itemWidth = 0.01*Math.floor(100*100/this._options.count);
                this._options.maxOffset = (this._options.count - this._options.items)* this._options.itemWidth;

                this.clearArrows = function () {
                    document.querySelector("[data-js-arrow='1']").classList.remove('similar-channels__arrow_disable');
                    document.querySelector("[data-js-arrow='-1']").classList.remove('similar-channels__arrow_disable');
                    this._options.arrows.prev = '';
                    this._options.arrows.next = '';
                }

                this.setDefault = function() {

                    Array.prototype.forEach.call(this._options.el.children, (el) => {
                        el.style.width = `${this._options.itemWidth}%`;
                        el.style.paddingRight = `${this._options.padding}px`;
                    })

                    this._options.el.style.width = `calc(${(100/this._options.items) * this._options.count}% + ${this._options.padding}px)`;
                    this._options.el.style.transform = `translate3d(0%, 0px, 0px)`;

                    this.clearArrows();

                    this._options.arrows.prev = 'disable';
                    document.querySelector("[data-js-arrow='1']").classList.add('similar-channels__arrow_disable');
                    if (this._options.count <= this._options.items) {
                        this._options.arrows.next = 'disable';
                        document.querySelector("[data-js-arrow='-1']").classList.add('similar-channels__arrow_disable');
                    }
                }

                this.checkDisable = function(offset) {
                    return !(offset <= 0 || offset >= this._options.maxOffset);
                }

                this.move = function(e) {
                    if (e.currentTarget.dataset.jsArrow) {
                        e.stopPropagation();

                        let sign = e.currentTarget.dataset.jsArrow;
                        if ((this._options.arrows.prev === 'disable' && sign === '1') || (this._options.arrows.next === 'disable' && sign === '-1')) {
                            return false;
                        }
                        let offset = parseFloat(this._options.el.style.transform.split(',')[0].split('(')[1]) + sign * this._options.itemWidth;
                        // console.log(`slide: ${offset}`);
                        this._options.el.style.transform = `translate3d(${offset}%, 0px, 0px)`;
                        this.clearArrows();
                        if (sign === '1') {
                            KYB.tracker.trackEvent('Page Action', {target: 'YouTube Similar Accounts slide left'});
                        } else {
                            KYB.tracker.trackEvent('Page Action', {target: 'YouTube Similar Accounts slide right'});
                        }
                        if (!this.checkDisable(-offset)) {
                            let direction = sign === '1' ? 'prev' : 'next';
                            this._options.arrows[direction] = 'disable';
                            e.currentTarget.classList.add('similar-channels__arrow_disable');
                        }
                    }
                }

                this.handleEvent = function(e) {
                    if (e.type == 'click') {
                        this.move(e);
                    }
                };

                this.unbindEvents = function () {
                    Array.prototype.forEach.call(document.querySelectorAll(this._options.arrows.selector), (item) => {
                        item.removeEventListener('click', this);
                    });
                }

                this.bindEvents = function () {
                    this.unbindEvents();
                    Array.prototype.forEach.call(document.querySelectorAll(this._options.arrows.selector), (item) => {
                        item.addEventListener('click', this);
                    });
                }

                this.reset = function() {
                    this.unbindEvents();
                }

                this.init = function () {
                    this.setDefault();
                    this.bindEvents();
                }

                this.init();
            }
            if (this.slider) {
                this.slider.reset();
            }
            this.slider = new Slider({
                selector: '.js-similar-list',
                items: items ? items : 4,
                padding: items ? items*5 : 20
            });
        },
        setPeriod: function(period, e) {
            if(!KYB.user && e && !KYB.isWhiteLabel) {
                this.showLogin();
                e.stopPropagation();
                return false;
            }
            var T = this;
            T.globalGraphPeriod = period;

            history.replaceState({
                id: 'youtube'
            }, '', `${location.origin}${location.pathname}?period=${period}`);

            T.graphInit('subscribers_count');
            T.graphInit('views_count_cumulative');
            T.overviewItemRender('views_avg');
            T.overviewItemRender('er_per_video');

            //T.setMoreGraphPeriod(false, period);
            if(T.graphMoreWrap) {
                KYB.report.collapseSection(T.graphMoreWrap);
                T.graphMoreWrap = false;
            }

            T.analyticsGraphs.innerHTML = '';
            T.contentAnalyticsStatRender();
            T.contentRender();
            T.similarRender();
            T.ranksRender();

            return false;
        },
        graphInit: function(name) {
            var T = this;
            var metrics = T.data.metrics;
            var m = metrics[name];
            var period = T.globalGraphPeriod ? T.globalGraphPeriod + 'd' : 'all';

            if(m && m.performance) {
                var performance = m.performance[period];

                T.config.graph[name].performance = performance;
                T.config.graph[name].diff = {
                    value: performance.value,
                    prc: 0
                };

                if(T.globalGraphPeriod && performance.value_prev) {
                    T.config.graph[name].diff.prc = Number(((performance.value-performance.value_prev)/Math.abs(performance.value_prev)*100).toFixed(1));
                }
            }

            if(_.isEqual(name, 'views_count_cumulative')) {
                var byPeriod = T.dataForPeriod(m.history, T.globalGraphPeriod, false).diff;

                T.config.graph[name].diff = {
                    staticValue: true,
                    value: m.value,
                    prc: byPeriod.prc
                }
            }

            if(m) {
                var dataForPeriod = T.dataForPeriod(m.history, T.globalGraphPeriod, false);

                if(dataForPeriod.series.length) {
                    T.config.graph[name].isNeg = dataForPeriod.series[0].y > dataForPeriod.series[dataForPeriod.series.length-1].y;
                }

                T.config.graph[name].name = name;
                T.config.graph[name].value = m.value;
                //T.config.graph[name].media_count = T.data.mediaForPeriod.value;
                T.config.graph[name].data = m.history;
            }

            var tpl = KYB.template.render({
                template: 'reportYoutubeGraphTpl'
            }, T.config.graph[name]);
            var frag = document.createRange().createContextualFragment(tpl);
            var column = frag.querySelector('.report-column');
            var wrap = frag.querySelector('.report-graph--wrap');
            var moreBtn = frag.querySelector('.report-graph--more-btn');
            var closeBtn = frag.querySelector('.report-graph--close-btn');
            T.tooltipInit(frag.querySelectorAll('.kyb-tooltip-target'));

            if(T.config.graph[name].el) {
                // update (set new period)
                T.overviewGraphs.insertBefore(column, T.config.graph[name].el.nextSibling);
                T.config.graph[name].el.remove();
            } else {
                T.overviewGraphs.appendChild(frag);
            }
            T.config.graph[name].el = column;



            var renderGraph = function () {

                // if(name == 'views_count') {
                //     T.graph[name] = T.renderGraphBar(wrap, dataForPeriod);
                // } else {
                    T.graph[name] = T.renderGraph(wrap, dataForPeriod);
                // }

            };
            if(m && m.history.length) {
                moreBtn.addEventListener('click', function () {
                    T.renderGraphMore(name, m.history, column);
                });
                closeBtn.addEventListener('click', function () {
                    KYB.report.collapseSection(T.graphMoreWrap);
                    T.graphMoreWrap = false;
                    column.classList.remove('report-graph--active');
                });
            }

            //if(graph) {
            if(typeof(Highcharts) != 'undefined') {
                renderGraph();
            } else {
                KYB.loadFile('/s/auditor/dist/js/libs/highcharts.js', 'js', renderGraph);
            }
            /*} else {
                KYB.get(KYB.baseUrl+'youtube/getReportYtContent/', {channel: T.id}).then(function (resp) {
                    if(resp) {
                        m.history = resp.data;
                        graph = m.history;
                        renderGraph();
                    }
                });
            }*/
        },
        overviewItemRender: function(name) {
            var T = this;
            var metrics = T.data.metrics;
            var period = T.globalGraphPeriod?T.globalGraphPeriod+'d':'all';
            var config = T.config.graph[name];
            if(name == 'views_avg') {
                var views_avg = metrics.views_avg.performance[period];
                config.diff = {
                    min: views_avg.min,
                    max: views_avg.max,
                    value: views_avg.value,
                    prc: views_avg.value_prev?Number(((views_avg.value-views_avg.value_prev)/Math.abs(views_avg.value_prev)*100).toFixed(1)):0
                };
            } else {
                var comments = metrics.comments_avg.performance[period];
                var reactions = metrics.alikes_avg.performance[period];
                comments.prc = comments.value_prev?Number(((comments.value-comments.value_prev)/Math.abs(comments.value_prev)*100).toFixed(1)):0;
                reactions.prc = reactions.value_prev?Number(((reactions.value-reactions.value_prev)/Math.abs(reactions.value_prev)*100).toFixed(1)):0;

                var value = reactions.value+comments.value;
                var valuePrev = reactions.value_prev+comments.value_prev;
                config.diff = {
                    value: value,
                    prc: valuePrev?Number(((value-valuePrev)/Math.abs(valuePrev)*100).toFixed(1)):0
                };

                config.reactions = reactions;
                config.comments = comments;
            }

            config.name = name;
            config.media_count = metrics.media_count.performance[period].value;
            if(config.media_count < 0) {
                config.media_count = 0;
            } else {
                config.videoCountText = __n('{c}video{c2} published in this period', '{c}videos{c2} published in this period', config.media_count, {c: '<strong>'+config.media_count+' ', c2: '</strong>'})
            }
            var tpl = KYB.template.render({
                template: 'reportYoutubeOverviewItemTpl'
            }, config);
            var frag = document.createRange().createContextualFragment(tpl);
            var column = frag.querySelector('.report-column');
            T.tooltipInit(frag.querySelectorAll('.kyb-tooltip-target'));

            if(config.el) {
                // update (set new period)
                T.overviewGraphs.insertBefore(column, config.el.nextSibling);
                config.el.remove();
            } else {
                T.overviewGraphs.appendChild(frag);
            }
            config.el = column;
        },
        contentEmptyState: function() {
            this.contentList.innerHTML = '<div class="report-content--list-nodata"><p>'+__('No videos for this period')+'</p>'+(this.contentData.length?'<div class="button button-outline" onclick="KYB.report.youtube.setPeriod()">'+__('Show all time')+'</div>':'')+'</div>';
        },
        contentAnalyticsStatRender: function(metrics) {
            if(!this.data.is_paid) {
                return false;
            }
            if(!metrics) {
                var metrics = this.metrics;
            }
            var T = this;
            var period = T.globalGraphPeriod?T.globalGraphPeriod+'d':'all';

            _.each(metrics, function (m, name) {
                if(_.indexOf(['comments_rate', 'reactions_rate', 'ltd_rate', 'videos_per_week'], name) < 0) {
                    return false;
                }
                var data = m.performance[period];
                var conf = T.config.graph[name];
                var mediaForPeriod = metrics.media_count.performance[period];
                data.markText = T.config.score[data.mark];
                switch(name) {
                    case 'comments_rate':
                        if(mediaForPeriod.value <= 0) {
                            var compareText = __('No videos published in this period');
                            data.mark = 'none';
                        } else {
                            if(!data.is_comments_enabled) {
                                var compareText = __('Comments disabled for this period');
                                data.mark = 'none';
                            } else {

                                if (data.value * 10 < 0.1) {
                                    var compareText = __('Low amount of comments per 1000&nbsp;views');
                                } else {
                                    var compareText = (data.value * 10).toFixed(1) + ' ' + __('comments per 1000 views');
                                    compareText += '<br><br>' + __('Similar accounts have') + ' <br><strong>' + (data.similar * 10).toFixed(1) + '</strong> ' + __('comments per 1000 views');
                                }
                            }
                        }
                        break;
                    case 'reactions_rate':
                        if(mediaForPeriod.value <= 0) {
                            var compareText = __('No videos published in this period');
                            data.mark = 'none';
                        } else {
                            if(!data.is_rating_allowed) {
                                var compareText = __('Reactions disabled for this period');
                                data.mark = 'none';
                            } else {
                                if (data.value * 10 < 0.1) {
                                    var compareText = __('Low amount of reactions per 1000&nbsp;views');
                                } else {
                                    var compareText = (data.value * 10).toFixed(1) + ' ' + __('reactions per 1000 views')
                                    compareText += '<br><br>' + __('Similar accounts have') + ' <br><strong>' + (data.similar * 10).toFixed(1) + '</strong> ' + __('reactions per 1000 views');
                                }
                            }
                        }
                        break;
                    case 'ltd_rate':
                        if(!data.error) {
                            var value = data.value<100?Math.round(data.value/(100-data.value)):0;
                            var similar = Math.round(data.similar/(100-data.similar));
                            var compareText = value ? '<b>' + KYB.numberToLocale(value) + '</b> ' + __n('like per 1 dislike', 'likes per 1 dislike', value) : '<b>'+__('No dislikes')+'</b>';
                            compareText += '<br><br>'+ __('Similar accounts receive') + ' <b>' + KYB.numberToLocale(similar) + '</b> ' + __n('like per 1 dislike on average', 'likes per 1 dislike on average', similar);

                            data.markText = conf.markText[data.mark];
                        } else {
                            if(mediaForPeriod.value <= 0) {
                                var compareText = __('No videos published in this period');
                            } else {
                                if (!data.is_rating_allowed) {
                                    var compareText = __('Reactions disabled for this period');
                                } else {
                                    var compareText = __('Low amount of reactions per 1000&nbsp;views');
                                }
                            }
                            data.mark = 'none';
                        }
                        break;
                    case 'videos_per_week':
                        if(data.value) {
                            var compareText = __('Account posts') + ' <b>' + KYB.numberToLocale(data.value) + '</b> ' + __n('video a week', 'videos a week', data.value);
                        } else {
                            var compareText = __('No videos published in this period');
                        }
                        break;
                }
                var tpl = KYB.template.render({
                    template: 'reportYoutubeContentAnalyticsStatTpl'
                }, {
                    name: name,
                    compareText: compareText,
                    data: data,
                    title: conf.title,
                    desc: conf.desc,
                    unit: conf.unit
                });
                var frag = document.createRange().createContextualFragment(tpl);
                T.tooltipInit(frag.querySelectorAll('.kyb-tooltip-target'));
                T.analyticsGraphs.appendChild(frag);
            });
        },
        tooltipInit: function(elements) {
            _.each(elements, function (el) {
                var p = {
                    el: el,
                    content: el.title,
                    sendStat: true
                };
                App.tooltip(p);
                el.setAttribute('title', '');
            });
        },
        dataForPeriod: function(data, period, isMore) {
            var diff = {
                value: false,
                prc: false
            };
            if(!data || !data.length) {
                return {
                    series: [],
                    diff: diff
                }
            }

            var curr = [];
            var past = [];
            var series = [];
            var startDateCurrPeriod = data[data.length-1].time-(86400*period);
            var startDatePastPeriod = startDateCurrPeriod-(86400*period);

            _.find(data.slice().reverse(), function (d) {
                if(period) {
                    if(d.time > startDatePastPeriod) {
                        if(d.time > startDateCurrPeriod) {
                            curr.push(d);
                            if(!isMore) {
                                series.push({x: d.time*1000, y: d.value, dataLabels: {enabled: false}});
                            } else {
                                series.push([d.time*1000, d.value]);
                            }
                        } else {
                            past.push(d);
                        }
                    } else {
                        return true;
                    }
                } else {
                    curr.push(d);
                    if(!isMore) {
                        series.push({x: d.time*1000, y: d.value, dataLabels: {enabled: false}});
                    } else {
                        series.push([d.time*1000, d.value]);
                    }
                }
            });
            diff.median = median(_.pluck(curr, 'value'));
            diff.min = _.min(curr, function(c) {return c.value;});
            diff.max = _.max(curr, function(c) {return c.value;});
            if(past.length) {
                diff.value = curr[0].value-past[0].value;
                if(diff.value) {
                    diff.prc = past[0].value?Number(((diff.value/past[0].value)*100).toFixed(1)):0;
                }
            } else {
                diff.value = curr[0].value-curr[curr.length-1].value;
            }
            series.reverse();

            if(!isMore) {
                series[0].dataLabels = {
                    enabled: true,
                    x: -8
                };
                series[series.length-1].dataLabels = {
                    enabled: true,
                    x: 8
                };
            }
            return {
                past: past,
                series: series,
                diff: diff
            };
        },

        setMoreGraphPeriod: function(name, period, e) {
            if(!KYB.user && e && !KYB.isWhiteLabel) {
                this.showLogin();
                e.stopPropagation();
                return false;
            }
            if(!this.graphMore) {return false}
            if(!name) {
                var name = this.graphMore.name;
            }
            var dataForPeriod = this.dataForPeriod(this.config.graph[name].data, period, true);
            this.graphMore.series[0].setData(dataForPeriod.series);

            var activeClass = 'report-overview--more-period-active';
            var curr = this.graphMorePeriodMenu.querySelector('.'+activeClass);
            curr.classList.remove(activeClass);
            curr = this.graphMorePeriodMenu.querySelector(period?'[data-period="'+period+'"]':':last-child');
            curr.classList.add(activeClass);
        },
        validateGraphData: function(wrap, series) {
            var validDataI = 0;
            var validData = _.find(series, function (s) {
                if(s.y) {
                    validDataI++;
                    if(validDataI>1) {
                        return true;
                    }
                }
            });
            if(!validData) {
                wrap.classList.add('notValid');
            } else {
                wrap.classList.remove('notValid');
            }
        },
        renderGraph: function (wrap, data) {
            var T = this;
            var series = data.series.slice(0,1000);
            var min = _.min(series, function (s) {return s.y;}).y;
            var max = _.max(series, function (s) {return s.y;}).y;

            this.validateGraphData(wrap, series);

            if(series.length>1) {
                var isNeg = series[0].y > series[series.length-1].y;
            }

            var chart = {
                style: T.highchartsOptions.chartStyle,
                backgroundColor: null,
                spacing: [0,0,0,0],
                margin: [0,0,0,0],
                height: 180
            };
            if(navigator.userAgent.match('HypeauditorPdfGen/1.0')) {
                chart.width = 349;
            }

            return Highcharts.chart(wrap, {
                title: false,
                legend: false,
                credits: false,
                reflow: false,
                tooltip: T.highchartsOptions.tooltip,
                xAxis: {
                    tickPositioner: function(min, max) {
                        var positions = [],
                            tick = Math.floor(this.dataMin),
                            increment = Math.ceil((this.dataMax - this.dataMin) / 5);
                        if (increment && this.dataMax !== null && this.dataMin !== null) {
                            for (tick; tick - increment <= this.dataMax; tick += increment) {
                                positions.push(tick);
                            }
                        }

                        positions.info = {
                            unitName: 'day',
                            //count: 4,
                            higherRanks: {},
                            //totalRange: interval * 6
                        };
                        return positions;
                    },
                    type: 'datetime',
                    showFirstLabel: false,
                    showLastLabel: false,
                    minPadding: 0,
                    maxPadding: 0,
                    tickWidth: 0,
                    tickPosition: 'inside',
                    offset: -25,
                    lineWidth: 0,
                    labels: {
                        padding: 0,
                        y: 15,
                        useHTML: true
                    },
                },
                yAxis: {
                    visible: false,
                    //endOnTick: false,
                    max: max,
                    min: min-((max-min)*0.3),
                },
                chart: chart,
                plotOptions: {
                    areaspline: {
                        stickyTracking: false,
                        shadow: false,
                        marker: {
                            radius: 0
                        },
                        dataLabels: {
                            color: 'rgba(134, 147, 158, 0.6)',
                            inside: false,
                            padding: 12,
                            crop: false,
                            style: {
                                fontWeight: 'normal',
                                textOutline: null,
                            },
                            verticalAlign: 'bottom',
                            formatter: function () {return KYB.numberFormat(this.y)}
                        },
                        color: !isNeg ? T.highchartsOptions.areaColor : T.highchartsOptions.areaColorNeg,
                        fillColor: !isNeg ? T.highchartsOptions.fillColor : T.highchartsOptions.fillColorNeg
                    }
                },
                series: [{
                    animation: false,
                    tooltip: {
                        pointFormatter: function () {
                            var v = KYB.numberToLocale(this.y);
                            return '<b>'+v+'</b>';
                        }
                    },
                    type: 'areaspline',
                    data: series
                }]
            });
        },
        renderGraphBar: function (wrap, data) {
            var T = this;
            var series = data.series;
            this.validateGraphData(wrap, series);

            var period = [];
            var categories = [];
            if(series.length <= 30) {
                _.each(series, function (s) {
                    categories.push(s.x);
                    period.push([s.x, s.y]);
                });
            } else {
                var interval = Math.ceil(series.length/30);
                var sumValue = 0;
                var startX = series[0].x;

                _.each(series, function (s, i) {
                    sumValue += s.y;
                    if(!series[i+1] || !((i+1)%interval)) {
                        categories.push({
                            x: startX,
                            x2: s.x
                        });
                        period.push([
                            startX, sumValue
                        ]);
                        if(series[i+1]) {
                            startX = series[i+1].x;
                        }
                        sumValue = 0;
                    }
                });
            }
            var chart = {
                style: T.highchartsOptions.chartStyle,
                backgroundColor: null,
                spacing: [0,0,0,0],
                margin: [0,20,25,20],
                height: 180
            };
            if(navigator.userAgent.match('HypeauditorPdfGen/1.0')) {
                chart.width = 349;
            }

            return Highcharts.chart(wrap, {
                title: false,
                legend: false,
                credits: false,
                tooltip: T.highchartsOptions.tooltip,
                xAxis: {
                    tickPositioner: function() {
                        if(_.isObject(categories[0])) {
                            var min = categories[0].x;
                            var max = categories[categories.length-1].x;
                        } else {
                            var min = categories[0];
                            var max = categories[categories.length-1];
                        }

                        var positions = [],
                            tick = Math.floor(min),
                            increment = Math.ceil((max - min) / 5);
                        if (increment && max !== null && min !== null) {
                            for (tick; tick - increment <= max; tick += increment) {
                                positions.push(tick);
                            }
                        }
                        positions.info = {
                            unitName: 'day',
                            higherRanks: {}
                        };
                        return positions;
                    },
                    type: 'datetime',
                    showFirstLabel: false,
                    showLastLabel: false,
                    minPadding: 0,
                    maxPadding: 0,
                    tickWidth: 0,
                    tickPosition: 'inside',
                    lineWidth: 0,
                    labels: {
                        style: {
                            whiteSpace: 'nowrap',
                        },
                        reserveSpace: false,
                        padding: 0,
                        y: 15
                    }
                },
                yAxis: {
                    min: 0,
                    visible: false
                },
                chart: chart,
                plotOptions: {
                    column: {
                        color: '#BBCBD8',
                        states: {
                            hover: {
                                brightness: 0,
                                color: '#FF6436'
                            }
                        },
                        stickyTracking: false,
                        shadow: false,
                    }
                },
                series: [{
                    borderRadius: 2,
                    pointWidth: 240/20/2,
                    tooltip: {
                        useHTML: true,
                        headerFormat: '',
                        pointFormatter: function () {
                            var c = categories[this.index];
                            if(_.isObject(c)) {
                                var d = Highcharts.dateFormat('%b %e, %Y', c.x)+' &ndash; '+Highcharts.dateFormat('%b %e, %Y', c.x2);
                            } else {
                                var d = Highcharts.dateFormat('%b %e, %Y', c);
                            }
                            return '<small>'+d+'</small><br><b>'+KYB.numberToLocale(this.y)+'</b>';
                        }
                    },
                    type: 'column',
                    data: period
                }]
            });
        },
        renderGraphMoreTable: function(name, data) {
            var T = this;
            var mediaCount = this.data.metrics.media_count.history.slice().reverse();
            var config = this.config.graph[name];
            var isCumulativeViewsCount = name === 'views_count_cumulative';

            function cumulativeViewsCell(index) {
                var dd = T.data.metrics.views_count_cumulative.history
                var current = dd[dd.length - index - 1]
                var prev = dd[dd.length - index - 2]

                var value = prev
                    ? current.value - prev.value
                    : 0
                    ;

                var renderedTemplate = KYB.template.render({
                    template: 'reportYoutubeGraphDiffTpl'
                }, {
                    value: value,
                    className: '--more-table'
                })

                return '<td class="t-a-r">' + renderedTemplate + '</td>'
            }

            var tpl = '<thead><tr>' +
                '<th class="t-a-l">'+__('Date')+'</th>' +
                '<th>'+ config.label +'</th>' +
                (isCumulativeViewsCount ? '<th>Difference</th>': '') +
                '<th>'+__('Videos number')+'</th>' +
            '</tr></thead>';

            var prevVideosNumber;

            _.each(data, function (d, index) {
                var videosNumber = _.findWhere(mediaCount, {time: d.time});
                if(!videosNumber) {
                    if(!prevVideosNumber) {
                        prevVideosNumber = videosNumber = mediaCount[0];
                    } else {
                        videosNumber = _.find(mediaCount, function (m) {
                            if(m.time < prevVideosNumber.time) {
                                return true;
                            }
                        });
                    }
                } else {
                    prevVideosNumber = videosNumber;
                }

                tpl += '<tr>' +
                    '<td>'+formatDate(d.time*1000)+'</td>' +
                    '<td class="t-a-r">'+(name == 'subscribers_count' && d.time >= 1569283200 ? T.numberFormat(d.value) : KYB.numberToLocale(d.value))+ '</td>' +
                    (isCumulativeViewsCount ? cumulativeViewsCell(index) : '') +
                    '<td class="t-a-r">'+(videosNumber?KYB.numberToLocale(videosNumber.value):'')+'</td>' +
                '</tr>';
            });

            return tpl;
        },
        renderGraphMore: function (name, data, column) {
            var T = this;
            if (T.graphMoreWrap) {
                T.graphMoreWrap.innerHTML = '';
                T.graphMoreWrap.style.height = '';
                T.graphMoreWrap.dataset.collapsed = '';
            }
            T.graphMoreWrap = column.nextElementSibling;
            T.graphMoreWrap.innerHTML = '';

            var config = KYB.report.youtube.config.graph[name];
            var tpl = KYB.template.render({
                template: 'reportYoutubeMoreTpl'
            }, {
                is_paid: T.data.is_paid,
                data: data,
                name: name
            });
            var frag = document.createRange().createContextualFragment(tpl);
            var graphWrap = frag.querySelector('#report-overview--more-graph');
            var tableBody = frag.querySelector('#report-overview--more-table');
            var close = frag.querySelector('#report-overview--close');
            this.graphMorePeriodMenu = frag.querySelector('#report-overview--more-period');
            close.addEventListener('click', function () {
               KYB.report.collapseSection(T.graphMoreWrap);
               T.graphMoreWrap = false;
               column.classList.remove(activeClass);
            });
            var tableMoreBtn = frag.querySelector('#report-overview--more-table-btn');
            tableMoreBtn.addEventListener('click', function () {
                if(!KYB.user) {
                    T.showLogin();
                } else {
                    this.remove();
                    tableBody.innerHTML = T.renderGraphMoreTable(name, data.slice().reverse());
                }
            });
            tableBody.innerHTML = T.renderGraphMoreTable(name, data.slice(-6).reverse());
            var dataForPeriod = this.dataForPeriod(data, T.globalGraphPeriod, true);
            var series = dataForPeriod.series;
            T.graphMoreWrap.appendChild(frag);
            var seriesData = [{
                name: config.label,
                type: 'spline',
                data: series,
                tooltip: {
                    pointFormatter: function () {
                        if(name == 'subscribers_count' && this.x >= 1569283200000) {
                            // YT hide subscribers (24 Sep)
                            var v = T.numberFormat(this.y);
                        } else {
                            var v = KYB.numberToLocale(this.y);
                        }
                        return config.label+': <b>'+v+'</b>';
                    }
                }
            }];
            var yAxis = {
                title: false,
                offset: -30,
                gridLineColor: '#E8EBED',
                maxPadding: 0,
                startOnTick: false,
                labels: {
                    align: 'left',
                    formatter: function() {
                        if (this.isLast || this.isFirst) {
                            return KYB.numberToLocale(this.value)
                        }
                    },
                    style: {
                        color: 'rgba(134, 147, 158, 0.6)',
                        fontSize: '11px',
                        fontWeight: 600
                    }
                }
            };


            if(name == 'views_count' && KYB.isOurIp) {
                var videoCountSeries = this.dataForPeriod(T.data.metrics.media_count.history, T.globalGraphPeriod, true).series;
                var newVideoCountSeries = [];
                var prevCount = videoCountSeries[0][1];
                _.each(videoCountSeries, function (v) {
                    if(v[1]-prevCount>0) {
                        newVideoCountSeries.push([v[0], v[1]-prevCount]);
                        prevCount = v[1];
                    }
                });
                seriesData.push({
                    name: 'New videos number',
                    type: 'column',
                    data: newVideoCountSeries,
                    yAxis: 1,
                    borderRadius: 2,
                    color: '#BBCBD8',
                    states: {
                        hover: {
                            brightness: 0,
                            color: '#FF6436'
                        }
                    }
                });
                seriesData[0].zIndex = 2;
                yAxis.minPadding = 0;
                yAxis.min = 0;
                yAxis = [yAxis];
                yAxis.push({
                    visible: false,
                    min: 0,
                    maxPadding: 0,
                    minPadding: 0,
                    //startOnTick: false,
                    endOnTick: false,
                    max: _.max(newVideoCountSeries, function (v) {
                        return v[1];
                    })[1]+1
                });
            }


            this.graphMore = Highcharts.chart(graphWrap, {
                title: false,
                legend: false,
                credits: false,
                tooltip: T.highchartsOptions.tooltip,
                xAxis: {
                    type: 'datetime',
                    showFirstLabel: false,
                    minPadding: 0,
                    maxPadding: 0,
                    tickWidth: 0,
                    gridLineWidth: 1,
                    gridLineColor: '#E8EBED',
                    lineColor: 'rgba(134, 147, 158, 0.15)',
                    tickColor: 'rgba(32, 113, 67, 0.15)',
                    labels: {
                        style: {
                            color: 'rgba(134, 147, 158, 0.6)',
                            fontSize: '11px',
                            fontWeight: 600
                        },
                        y: 25
                    },
                    crosshair: {
                        color: '#FF6436'
                    }
                },
                yAxis: yAxis,
                chart: {
                    zoomType: 'x',
                    style: T.highchartsOptions.chartStyle,
                    backgroundColor: null,
                    spacing: [0, 0, 0, 0],
                    margin: [0, 0, 46, 0],
                    height: 330
                },
                plotOptions: {
                    spline: {
                        lineWidth: 3,
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
                                    radius: 5.5,
                                }
                            },
                        },
                        color: '#FF6436',
                    }
                },
                series: seriesData
            });
            this.graphMore.name = name;

            var activeClass = 'report-graph--active';
            var curr = T.overviewGraphs.querySelector('.'+activeClass);
            if(curr) {
                curr.classList.remove(activeClass);
            }
            column.classList.add(activeClass);

            if(typeof(T.graphMoreWrap.dataset.collapsed)=='undefined') {
                T.graphMoreWrap.style.height = 0 + 'px';
                T.graphMoreWrap.dataset.collapsed = true;
            }
            if(T.graphMoreWrap.dataset.collapsed == 'true') {
                KYB.report.expandSection(T.graphMoreWrap);
            }
        },
        highchartsOptions: {
            chartStyle: {
                fontFamily : '"Proxima Nova", Tahoma, sans-serif',
                overflow: 'visible'
            },
            areaColor: '#289155',
            areaColorNeg: '#DF1010',
            fillColor: {
                linearGradient: {
                    x1: 0,
                    y1: 0,
                    x2: 0,
                    y2: 1
                },
                stops: [
                    [0, 'rgba(40, 145, 85, 0.2)'],
                    [1, 'rgba(40, 145, 85, 0)']
                ]
            },
            fillColorNeg: {
                linearGradient: {
                    x1: 0,
                    y1: 0,
                    x2: 0,
                    y2: 1
                },
                stops: [
                    [0, 'rgba(223, 16, 16, 0.2)'],
                    [1, 'rgba(223, 16, 16, 0)']
                ]
            },
            tooltip: {
                outside: true,
                backgroundColor: '#86939E',
                borderRadius: 14,
                borderWidth: 0,
                padding: 6,
                shadow: false,
                useHTML: true,
                pointFormat: '{series.name}: <b>{point.y}</b>',
                style: {
                    color: "#fff",
                    fontSize: "13px",
                    pointerEvents: "none",
                    whiteSpace: "nowrap",
                    fontFamily : '"Proxima Nova", Tahoma, sans-serif',
                }
            }
        },
        showLogin: function () {
            var T = this;
            KYB.signup.popupShow({
                r: 'youtube/'+T.id,
                btnText: __('Get free report'),
                headerText: __('Register to get free {n} report', {n: T.data.basic.username})
            });
        },
        unlock: function (e, source) {
            var T = this;
            if(e) {
                e.stopPropagation();
            }
            if(!KYB.user) {
                this.showLogin();
                return false;
            } else {
                KYB.tracker.trackEvent('Page Action', {
                    target: 'Unlock YouTube report',
                    source: source
                });

                if(!KYB.user.tokens && !KYB.user.free_reports) {
                    this.buyCreditsPromoPopup();
                    return false;
                }
                var ok = function() {
                    KYB.post(KYB.baseUrl+'youtube/unlock/?channel='+T.id).then(function (resp) {
                        document.location.reload();
                    });
                };
                if(Cookies.get('payConfirmSkip')) {
                    ok();
                } else {
                    this.buyCreditsPromoPopup(true, ok);
                }
            }
        },
        buyCreditsPromoPopup: function (hasCredits, callback) {
            KYB.popup.show({
                cssClass: 'report-credits-promo-popup',
                html: KYB.template.render({
                    template: 'reportYoutubeCreditsPromoTpl'
                }, {hasCredits: hasCredits}),
                onOpen: function (t) {
                    if(callback) {
                        var btn = t.$content.querySelector('.button');
                        btn.addEventListener('click', function () {
                            if(t.$content.querySelector('input').checked) {
                                Cookies.set('payConfirmSkip', 1, { expires: 2*365, path: '/' });
                            }
                            btn.classList.add('kyb-preload');
                            callback();
                        }, {once: true});
                    }
                }
            });
        },
        priceFeedbackInit: function() {
            KYB.feedbackModule.init({
                id: 27,
                data: {
                    username: this.data.basic.username
                },
                setCookieOnlyCurrPage: true,
                header: __('Is this price accurate?'),
                container: '#hype-youtube--integration-price-feedback',
                className: 'hype-feedback-compact',
                reactions: [
                    {ico: '&#xf164;', className: 'fal fa-thumbs-up', id: 1},
                    {ico: '&#xf165;', className: 'fal fa-thumbs-down', id: 0}
                ],
                popupAfterReaction: true,
                headerNegativeReaction: __('Did not like?'),
                headerPositiveReaction: __('Do you like it?'),
                placeholderNegative: __('What kind of difficulties have you experienced?'),
                placeholderPositive: __('What did you like most?'),
                suggestions: [__('Lack of metrics'), __('Wrong data'), __('Nothing new'), __('Bugs'), __('Other')],
                sendBtnHint: __('...to make integration price more accurate.'),
            });
        },
        getSimilar: function (channel) {
            return this.fetchSimilar(channel).then((resp) => {
                if(resp && resp.success) {
                    this.similarData = resp.channels;
                    this.similarData['total'] = resp.total;
                    if (resp.total > 0) {
                        this.similarRender();
                        var data = [];
                        for (var item of Object.keys(resp.channels)) {
                            if(resp.channels[item]) {
                                data.push(resp.channels[item]);
                            }
                        }
                        KYB.report.similarTabsRender(data, 'youtube');
                    } else {
                        KYB.report.hideSimilarBlock();
                    }
                }
            });
        },
        fetchSimilar: function (channel) {
            if(this.getSimilarContentXHR) {
                this.getSimilarContentXHR.abort();
            }
            let T = this;
            return this.getSimilarContentXHR = KYB.get(KYB.baseUrl+'youtube/getSimilar/', {channel: channel}).then(function () {
                T.getSimilarContentXHR = false;
            });
        },
        scrollToSimilar: function () {
            window.scrollTo({
                top: this.similarChannels.offsetTop - 10,
                left: 0,
                behavior: 'smooth'
            });
        },
        isMobile: function () {
            return window.innerWidth <= 425;
        }
    },
    instagram: {
        init: function (id) {
            if (document.querySelector('.report-instagram_initial') && KYB.user) {
                let initialShowExample = document.querySelectorAll('.js-initial-show-example'),
                    initialUnlockReport = document.querySelectorAll('.js-initial-unlock-report'),
                    initial = document.querySelectorAll('.js-initial'),
                    container = document.querySelector('.js-ab-container');

                var closeInital = function () {
                    Array.prototype.forEach.call(initial, function (item) {
                        item.classList.remove('initial_showed');
                    })
                    Array.prototype.forEach.call(initialShowExample, function (el) {
                        el.innerHTML = __('show example');
                    })
                }

                container.addEventListener('click', function () {
                    closeInital();
                });
                Array.prototype.forEach.call(initialShowExample, (el) => {
                    el.addEventListener('click', (e) => {
                        e.stopPropagation();
                        let el = e.currentTarget;
                        let elBlock = el.closest('.js-initial');
                        if (elBlock.classList.contains('initial_showed')) {
                            elBlock.classList.remove('initial_showed');
                            el.innerHTML = __('show example');
                        } else {
                            closeInital();
                            elBlock.classList.add('initial_showed');
                            el.innerHTML = '<i class="fas fa-eye-slash"></i>' +  __('hide example');
                        }
                        // send show example event
                        if (el.dataset.showExample === "1") {
                            return false;
                        }
                        let eventData = {
                            'Page Id': KYB.pageId,
                            Action: 'tap',
                            target: 'Preview Show example btn'
                        };
                        el.dataset.showExample = "1";
                        KYB.tracker.trackEvent('Page Action', eventData);
                    });
                });
                Array.prototype.forEach.call(initialUnlockReport, (el) => {
                    el.addEventListener('click', (e) => {
                        e.stopPropagation();
                        let el = e.currentTarget;
                        KYB.paywallPopupShow({
                            header: __('Upgrade your plan or buy reports'),
                        }, 'reports hub');
                        // send show example event
                        if (el.dataset.unlockReport === "1") {
                            return false;
                        }
                        let eventData = {
                            'Page Id': KYB.pageId,
                            Action: 'tap',
                            target: 'Preview Unlock full report btn'
                        };
                        el.dataset.unlockReport = "1";
                        KYB.tracker.trackEvent('Page Action', eventData);
                        console.log('unlock full report event trigger');
                    });
                });

            }
            this.getSimilar(id).then((data) => {
                if (data.success && Object.keys(data.data.bloggers).length > 0) {
                    // if (this.similarData.length > 5) {
                    //     let moreBtn = document.querySelector('.js-instagram-similar-more-btn');
                    //     moreBtn.classList.remove('report-lookalike__more_hidden');
                    //
                    //     moreBtn.addEventListener('click', (e) => {
                    //         this.similarRender(this.similarData.slice(this.similarPage * 5, (this.similarPage + 1) * 5));
                    //         this.similarPage++;
                    //         if (this.similarPage >= this.similarData.length/5) {
                    //             moreBtn.classList.add('report-lookalike__more_hidden');
                    //         }
                    //     });
                    // }
                    let similarList = document.querySelector('.js-instagram-similar-list');
                    if(similarList) {
                        similarList.addEventListener('click' , (e) => {
                            let eventData = {
                                'Page Id': KYB.pageId,
                                Action: 'tap',
                                target: 'Preview report in similar accounts'
                            };
                            KYB.tracker.trackEvent('Page Action', eventData);
                        });
                    }
                    let similar = document.querySelector('.js-tabs-similar');
                    if (similar) {
                        similar.classList.remove('report__similar_disabled');
                        similar.addEventListener('click', (e) => {
                            KYB.tracker.trackEvent('Page Action', {'Page Id': KYB.pageId, Action: 'tap', target: 'Instagram View Similar top tab'});
                            if(similarList) {
                                this.scrollToSimilar();
                            } else {
                                document.location.href = 'https://hypeauditor.com/discovery/?search%5Big_similar%5D="'+id+'"';
                            }
                        });
                    }
                } else {
                    KYB.report.hideSimilarBlock();
                }
            });
        },
        similarData: [],
        similarPage: 0,
        similarRender: function (data, options) {
            let html = '';
            let similarList = document.querySelector('.js-instagram-similar-list');
            if(!similarList) {return}
            for (let key of Object.keys(data)) {
                html += `<li><a href="${location.origin}/${KYB.isLocal() ? 'auditor/': ''}${KYB.user ? 'instagram' : 'preview'}/${data[key].basic.username}/?source=similar" data-navigo class="report-lookalike__item js-report-lookalike-item" title="${data[key].basic.fullname}">
                      <img class="report-lookalike__avatar" src="${data[key].basic.avatar_url}" alt="${data[key].basic.username}">
                      <div class="report-lookalike__btn button button-small">${__('View report')+(KYB.user ? ' <i class="ico ico-token-white"></i> 1' : '')}</div>
                      <h3 class="report-lookalike__username ellipsis">@${data[key].basic.username}</h3>
                      <div class="report-lookalike__name">${data[key].basic.fullname}</div>
                      ${data[key].metrics.subscribers_count ? `<div class="report-lookalike__estimation">${KYB.numberFormat(data[key].metrics.subscribers_count.value)} ${__('followers')}</div>` : ''}
                      ${data[key].metrics.er ? `<div class="report-lookalike__estimation">${__('ER')}: ${data[key].metrics.er.value}%</div>` : ''} 
                      </a></li>`;
            }
            html += `<li>
                    <div class="report-lookalike__item report-lookalike__item_total">
                        <div class="report-lookalike__avatar"><i class="far fa-compass"></i></div>
                        <div>${__('Discover more similar accounts')}</div>
                        <a href='https://${KYB.domain}${KYB.baseUrl}${(!PRODUCTION ? 'app/' : '')}discovery/?search%5Big_similar%5D="${KYB.report.instagram.id}"&source=similar' data-navigo class="report-lookalike__total-link">${__('Show more similar')}</a>
                        <div class="report-lookalike__total-text">${__n('Total 1 found', 'Total {n} found', options.total, {n: options.total})}</div>
                    </div>
                </li>`;
            if (options && options.replace) {
                similarList.innerHTML = html;
            } else {
                similarList.insertAdjacentHTML('beforeend', html);
            }
            if(typeof KYB.reportPreview != 'undefined') {
                KYB.reportPreview.getBtnOffset();
            }
            if(typeof hype != 'undefined' && hype.router) {
                hype.router.updatePageLinks();
            }
        },
        getSimilar: function (id) {
            return this.fetchSimilar(id).then((resp) => {
                if(resp && resp.success) {
                    let similarBlock = document.querySelector('.js-report-lookalike');
                    if (resp.success) {
                        KYB.report.similarTabsRender(resp.data.bloggers, 'instagram');
                        this.similarData = resp.data.bloggers;
                        if(similarBlock) {
                            this.similarRender(resp.data.bloggers, {total: resp.data.total,replace: true});
                            // this.similarPage++;
                            similarBlock.classList.remove('report-lookalike_disabled');
                        }
                    } else if(similarBlock) {
                        similarBlock.classList.add('report-lookalike_disabled');
                    }
                }
            });
        },
        fetchSimilar: function (name) {
            // return KYB.getTestJSON('https://anosova.naca.dev/s/auditor/data/getInstSimilar.json');
            return KYB.get(KYB.baseUrl+`ajax/getSimilarIg/${KYB.getParams().fh ? '?fn='+KYB.getParams().fh : ''}`, {username: name});
        },
		scrollToSimilar: function () {
            let lookalikeBlock = document.querySelector('.js-report-lookalike');
			window.scrollTo({
				top: lookalikeBlock.offsetTop,
				left: 0,
				behavior: 'smooth'
			});
		},
    },
    collapseSection: function(element) {
        var sectionHeight = element.scrollHeight;
        var elementTransition = element.style.transition;
        element.style.transition = '';
        requestAnimationFrame(function() {
            element.style.height = sectionHeight + 'px';
            element.style.transition = elementTransition;
            requestAnimationFrame(function() {
                element.style.height = 0 + 'px';
            });
        });
        element.dataset.collapsed = true;
    },
    expandSection: function(element) {
        var sectionHeight = element.scrollHeight;
        element.style.height = sectionHeight + 'px';
        element.addEventListener('transitionend', function end(e) {
            element.removeEventListener('transitionend', end);
            if(!element.dataset.collapsed) {
                element.style.height = null;
            }
        });
        element.dataset.collapsed = false;
    },
    getYoutubeContent: function (channel) {
        if(this.getContentXHR) {
            this.getContentXHR.abort();
        }
        var T = this;
        return this.getContentXHR = KYB.get(KYB.baseUrl+'youtube/getReportYtContent/', {channel: channel}).then(function () {
            T.getContentXHR = false;
        });
    },
    payConfirm: function(e, link, onOk) {
        e.stopImmediatePropagation();
        KYB.popup.show({
            html: '<h3>'+__('Confirm')+'</h3><p>'+__('You will unlock the report for 1 credit if you didn’t pay for it previously')+'</p><label><input type="checkbox" class="checkbox-input">'+__('Don’t warn again')+'</label><p><div class="button" id="discovery-confirm-btn">'+__('Proceed')+'</div><div onclick="KYB.popup.allHide();" class="button button-outline button-gray">'+__('Cancel')+'</div></p>',
            cssClass: 'discovery-confirm-popup',
            onOpen: function (t) {
                var btn = t.$content.querySelector('#discovery-confirm-btn');
                btn.addEventListener('click', function () {
                    if(t.$content.querySelector('input').checked) {
                        Cookies.set('payConfirmSkip', 1, { expires: 2*365, path: '/' });
                    }
                    if(onOk) {
                        onOk();
                    }
                    if(link) {
                        var href = link.getAttribute('href');
                        if(typeof(hype)!='undefined') {
                            hype.router.navigate(href, 1);
                        } else {
                            document.location.href = href;
                        }
                    }
                    t.hide();
                });
            }
        });
        e.preventDefault();
    },
    explainAQS: function (platform) {
        var T = this;

        var $html = document.createElement('div');
        $html.id = 'explain-aqs-popup';
        $html.innerHTML = '<div class="preloader"></div>';
        var popup = KYB.popup.show({
            html: $html,
            cssClass: 'explain-aqs-popup',
            onClose: function () {
                if(T.xhr) {
                    T.xhr.abort();
                }

                KYB.tracker.trackEvent('Page Action', {
                    'Page Id': KYB.pageId,
                    'target': 'Explain AQS popup closed',
                    'platform': platform && platform == 2 ? 'youtube' : 'instagram'
                });
            },
            onOpen: function () {
                KYB.tracker.trackEvent('Page Action', {
                    'Page Id': KYB.pageId,
                    'target': 'Explain AQS popup opened',
                    'platform': platform && platform == 2 ? 'youtube' : 'instagram'
                });
            }
        });
        let p = {}
        if(platform) {
            p.platform = platform;
        }

        this.xhr = KYB.get(KYB.baseUrl+'ajax/getAQSPopup/', p).then(function (resp) {
            if(resp.html) {
                var frag = document.createRange().createContextualFragment(resp.html);
                $html.appendChild(frag);
                $html.querySelector('.preloader').remove();

                var closeButton = document.getElementById('close-explain-aqs-popup');
                closeButton.addEventListener('click', function () {
                  popup.hide();
                });
            } else {
                $html.innerHTML = 'Error. Try again.';
            }
        });
    },
    similarTabsRender: function (data, type) {
        let tabsList = document.querySelector('.js-tabs-similar-list');
        if (!tabsList) {
            return false;
        }
        let html = '';
        let count = tabsList.querySelectorAll('.report__similar-item_animate').length-1;
        let tabsItem
        if (type === 'youtube') {
            if(data.length < count) {
                count = data.length;
            }
            tabsItem = data.slice(0, count);
            for (let item of tabsItem) {
                html += `<li class="report__similar-item" style="background-image: url(${item.basic.avatar_url})"></li>`;
            }
            if ((data.length - count) > 0) {
                html += `<li class="report__similar-item report__similar-count"><span>+${data.length - count}</span></li>`;
            }
        } else {
            if(Object.keys(data).length < count) {
                count = Object.keys(data).length;
            }
            tabsItem = Object.keys(data).slice(0, count);
            for (let key of tabsItem) {
                html += `<li class="report__similar-item" style="background-image: url(${data[key].basic.avatar_url})"></li>`;
            }
            if ((Object.keys(data).length - count) > 0) {
                html += `<li class="report__similar-item report__similar-count"><span>+${Object.keys(data).length - count}</span></li>`;
            }
        }
        tabsList.innerHTML = html;
    },
    hideSimilarBlock: function () {
        let similarTag = document.querySelector('.js-tabs-similar'),
            similarBlock = document.querySelector('.js-report-lookalike'),
            similarChannels = document.querySelector('.js-similar-channel');
        if (similarTag) {
            similarTag.classList.add('report__similar_hidden');
        }
        similarBlock ? similarBlock.classList.add('report-lookalike-block_hidden') : '';
        similarChannels ? similarChannels.classList.add('similar-channels_hidden') : '';
    }
};
