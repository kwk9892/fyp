'use strict';
hype.comparison = {
    period: {},
    setPeriod: function(days, event) {
        this.periodDays = days;
        this.period = {
            start: moment().subtract(days-1, 'days'),
            end: moment()
        };
        this.getData();
        KYB.tracker.trackEvent('Page Action', {target: 'Comparison set period'});
    },
    init: function (resp) {
        var T = this;
        if(!this.data) {
            return false;
        }
        this.usernames = [];
        _.each(this.data, function (d) {
            T.usernames.push(d.basic.username);
        });
        this.periodDays = Math.round((this.period.end-this.period.start)/(24*60*60*1000))+1;

        console.time('comparison');
        this.dataWrap = document.getElementById('hype-comparison-table');
        this.emptyStateWrap = document.getElementById('hype-comparison-empty');
        //KYB.customFields.init(this.emptyStateWrap);
        this.addAccountFormInit(document.getElementById('hype-comparison-empty--add'));

        this.feedback = KYB.feedbackModule.init({
            id: 24,
            setCookieOnlyCurrPage: true,
            header: __('Do you find comparison useful?'),
            container: '#hype-comparison-feedback',
            className: 'hype-app-feedback',
            reactions: [
                {ico: '&#xf119;', className: 'fas fa-frown', id: 0},
                {ico: '&#xf11a;', className: 'fas fa-meh', id: 3},
                {ico: '&#xf581;', className: 'fas fa-grin-alt', id: 1}
            ],
            popupAfterReaction: true,

            headerNegativeReaction: __('Did not like?'),
            headerPositiveReaction: __('Do you like it?'),
            headerNeutralReaction: __('Not good enough?'),

            placeholderNegative: __('What kind of difficulties have you experienced?'),
            placeholderPositive: __('What did you like most?'),
            placeholderNeutral: __('Tell us what can be improved?'),

            suggestions: [__('Poor usability'), __('Lack of metrics'), __('Wrong data'), __('Nothing new'), __('Bugs'), __('Other')],

            sendBtnHint: __('...to make comparison better'),

            onInit: function () {
                hype.pagePromos.push('feedback');
            }
        });
        if(this.feedback) {
            this.feedback.hidden = true;
        }

        this.renderData();

        console.timeEnd('comparison');
    },
    colors: ['FF6436','646E77','80B4D9','D9D080','9DD980'],
    renderData: function() {
        var T = this;
        console.time('comparison tpl');
        var tpl = KYB.template.render({
            template: 'hypeComparisonTableTpl'
        }, {
            accounts: this.data?this.data:[],
            period: this.periodDays
        });
        console.timeEnd('comparison tpl');
        console.time('comparison tpl append');
        this.dataWrap.innerHTML = '';
        this.dataWrap.className = 'hype-comparison--count-'+this.data.length;
        this.dataWrap.appendChild(document.createRange().createContextualFragment(tpl));
        console.timeEnd('comparison tpl append');
        console.time('comparison other');
        if(!this.data || this.data.length<1) {
            this.emptyStateWrap.classList.remove('hide');
        } else {
            this.emptyStateWrap.classList.add('hide');
        }
        if(this.data.length && this.data.length<5) {
            var addFormWrap = document.getElementById('hype-comparison-header--add-wrap');
            if(addFormWrap) {
                T.addAccountFormInit(document.getElementById('hype-comparison-header--add'));
                var addShow = function() {
                    addFormWrap.classList.add('show');
                    addFormWrap.querySelector('.field-input').focus();
                    if(T.data.length == 4) {
                        T.dataWrap.classList.remove('hype-comparison--count-4');
                        T.dataWrap.classList.add('hype-comparison--count-5');
                    }
                };
                addFormWrap.querySelector('.hype-accounts--add-btn').addEventListener('click', function () {
                    addShow();
                    KYB.tracker.trackEvent('Page Action', {target: 'Comparison add btn'});
                });
                if(this.data.length==1) {
                    addShow();
                }
                document.getElementById('hype-comparison-header--add-close').addEventListener('click', function () {
                    addFormWrap.classList.remove('show');
                });
            }
        }


        var removes = this.dataWrap.querySelectorAll('.hype-comparison--remove-acc-btn');
        _.each(removes, function (r) {
            r.addEventListener('click', function () {
                T.usernames = _.without(T.usernames, r.dataset.username);
                T.getData();
                KYB.tracker.trackEvent('Page Action', {target: 'Comparison remove btn'});
            });
        });


        _.each(this.dataWrap.querySelectorAll('.hype-comparison--block-geo .hype-comparison--more'), function (m) {
            m.addEventListener('click', function () {
                _.each(m.parentNode.querySelectorAll('.hype-comparison--geo'), function (g) {
                    g.style.display = '';
                });
                m.remove();
                KYB.tracker.trackEvent('Page Action', {target: 'Comparison geo more btn'});
            }, {once: true});
        });
        _.each(this.dataWrap.querySelectorAll('.hype-comparison--block-mentions .hype-comparison--more'), function (m) {
            m.addEventListener('click', function () {
                _.each(m.parentNode.querySelectorAll('.hype-comparison--mention'), function (g) {
                    g.style.display = '';
                });
                m.remove();
                KYB.tracker.trackEvent('Page Action', {target: 'Comparison mentions more btn'});
            }, {once: true});
        });
        _.each(this.dataWrap.querySelectorAll('.hype-comparison--block-age-gender .hype-comparison--more'), function (m) {
            m.addEventListener('click', function () {
                _.each(m.parentNode.querySelectorAll('.hype-comparison--age-gender-group'), function (g) {
                    g.style.display = '';
                });
                _.each(m.parentNode.querySelectorAll('.hype-comparison--age-gender-group-max, .hype-comparison--age-gender-digits'), function (g) {
                    g.remove();
                });
                KYB.tracker.trackEvent('Page Action', {target: 'Comparison gender more btn'});
                m.remove();
            }, {once: true});
        });
        _.each(this.dataWrap.querySelectorAll('.hype-comparison--geo'), function (m) {
            var p, s;
            m.addEventListener('mouseenter', function (e) {
                p = m.parentNode.parentNode;
                s = p.querySelectorAll('.'+m.classList[1]);
                if(s.length > 1) {
                    p.classList.add('hover');
                    _.each(s, function (ss) {
                        ss.classList.add('highlight');
                    });
                }
            });
            m.addEventListener('mouseleave', function (e) {
                if(p) {
                    p.classList.remove('hover');
                }
                if(s) {
                    _.each(s, function (ss) {
                        ss.classList.remove('highlight');
                    });
                }
            });
        });
        console.timeEnd('comparison other');

        console.time('comparison graph');
        _.each(this.dataWrap.querySelectorAll('.hype-card--hgraph'), function (graphWrap) {
            var d = graphWrap.dataset;
            var k = d.graphKey;
            if(d.graphType == 'column') {
                var graphData = {
                    data: []
                };
                _.each(T.data, function (d, i) {
                    if(d.metrics && d.features) {

                        var graph = {
                            crisp: false,
                            groupPadding: 0.23,
                            pointPadding: 0.23,
                            borderWidth: 0,
                            borderRadius: 2.5,
                            animation: false,
                            minPointLength: 5,
                            type: 'column',
                            color: '#'+T.colors[i]
                        };
                        graph.tooltip_pre = '<strong>@'+d.basic.username+'</strong><br>';
                        if(k == 'audience_type') {
                            graph.tooltip_unit = '%';
                            var data = d.features[k];
                            if(!graphData.categories) {
                                graphData.categories = [];
                                _.each(data.data.value, function (v, k) {
                                    let c = hype.comparison.config.audience_type[k];
                                    if(c) {
                                        graphData.categories.push(c.title);
                                    }
                                });
                            }
                            graph.data = _.values(data.data.value);
                        } else {
                            var data = d.metrics[k];
                            if(data) {
                                var groupPeriod = data.period.group_period;
                                if(groupPeriod == 'month') {
                                    graph.pointRange = 24 * 30 * 3600 * 1000;
                                } else if(groupPeriod == 'week') {
                                    graph.pointRange = 24 * 7 * 3600 * 1000;
                                } else {
                                    graph.pointRange = 24 * 3600 * 1000;
                                }
                                if(!graphData.categories) {
                                    graph.categories = _.map(data.grouped_history, function (ss) {
                                        var c = {
                                            x: moment(ss.period_start).valueOf()
                                        };
                                        var f = 'YYYY-MM-DD';
                                        if (moment(ss.period_start).utc(false).format(f) != moment(ss.period_end).utc(false).format(f)) {
                                            c.x2 = moment(ss.period_end).valueOf();
                                        }
                                        return c;
                                    });
                                }
                                //graph.data = _.pluck(data.grouped_history, 'value');
                                graph.data = _.map(data.grouped_history, function (ss) {
                                    return [moment(ss.period_start).valueOf(), ss.value];
                                });
                            }
                        }
                        if(graph.data) {
                            graphData.data.push(graph);
                        }
                    }
                });

                KYB.whenToScroll(graphWrap, function () {
                    console.time('graph '+k);
                    T.graphColumnRender(graphWrap, graphData, {
                        pdfWidth: 728
                    });
                    console.timeEnd('graph '+k);
                });


            } else {
                var graphData = [];
                console.time('graph each');
                _.each(T.data, function (d, i) {
                    var graph = {
                        animation: false,
                        type: 'spline',
                        color: '#'+T.colors[i]
                    };
                    if(k == 'er') {
                        graph.tooltip_unit = '%';
                    }
                    graph.tooltip_pre = '<strong>@'+d.basic.username+'</strong><br>';
                    graph.data = _.map(d.metrics[k]?d.metrics[k].history:[], function (ss) {
                        return [moment(ss.time).valueOf(), ss.value];
                    });
                    graphData.push(graph);
                });
                console.timeEnd('graph each');
                if(graphData.length) {

                    KYB.whenToScroll(graphWrap, function () {
                        console.time('graph '+k);
                        hype.tracking.graphRender(graphWrap, graphData, {
                            hidePlotLine: true,
                            pdfWidth: 728
                        });
                        console.timeEnd('graph '+k);
                    });

                }
            }
        });
        console.timeEnd('comparison graph');


        KYB.imageLoader.add(this.dataWrap.querySelectorAll('.hype-tracking--content-item-img, .hype-comparison--mention-img'));

        if(!KYB.isPDF) {
            _.each(hype.content.querySelectorAll('.hype-ttip-target, .kyb-tooltip-target'), function (ttip) {
                App.tooltip({
                    el: ttip,
                    content: ttip.title,
                    //hideByClick: true

                });
                ttip.title = '';
            });

            KYB.whenToScroll(this.dataWrap.querySelector('.hype-comparison--block-er'), function () {
                if(T.feedback && T.feedback.hidden && T.feedback.container) {
                    T.feedback.container.classList.add('show');
                    T.feedback.hidden = false;
                }
                KYB.tracker.trackEvent('Page Action', {
                    Action: 'scroll',
                    target: 'Comparison Engagement'
                });
            });

            KYB.whenToScroll(this.dataWrap.querySelector('#hype-comparison--content-header'), function () {
                KYB.tracker.trackEvent('Page Action', {
                    Action: 'scroll',
                    target: 'Comparison Content'
                });
            });
        }
    },
    getData: function() {
        var startPath = 'https://' + KYB.domain + KYB.baseUrl + (!PRODUCTION ? 'app/' : '');
        var url = startPath + 'comparison/' + this.usernames.join(',');
        if(this.periodDays != 30) {
            url += '?'+KYB.param({
                date_from: this.period.start.format('YYYY-MM-DD'),
                date_to: this.period.end.format('YYYY-MM-DD')
            });
        }
        hype.router.navigate(url, true);
    },
    diffRender: function(account, rootKey, key, subKey, hidePrc, lessIsGood) {
        var T = this;
        if(!account.metrics || !this.data[0].metrics) {
            return '';
        }
        if(rootKey == 'features') {
            if(!account.features[key]) {
                return '';
            }
        } else {
            if(!account.metrics[key]) {
                return '';
            }
        }
        var cn = 'hype-comparison--digit-diff';

        var maxI = 0;
        _.each(this.data, function (a, i) {
            if(i && a.metrics) {
                if(rootKey == 'features') {
                    if(a.features[key] && !_.isEmpty(a.features[key].data) && !_.isEmpty(T.data[maxI].features[key].data)) {
                        var prev = T.data[maxI].features[key].data.value;
                        var curr = a.features[key].data.value;
                        if(subKey) {
                            prev = prev[subKey];
                            curr = curr[subKey];
                        }
                    }
                } else {
                    if(!T.data[maxI].metrics[key]) {
                        maxI = i;
                    } else {
                        if(a.metrics[key]) {
                            var prev = T.data[maxI].metrics[key].value;
                            var curr = a.metrics[key].value;
                        }
                    }
                }
                if(curr && ((lessIsGood && curr < prev) || (!lessIsGood && curr > prev))) {
                    maxI = i;
                }
            }
        });
        if(this.data[maxI] == account) {
            var isMax = true;
        }
        var res = '';
        if(isMax) {
            res += '<i class="far fa-crown">&#xf521;</i>';
        }
        if(rootKey == 'features') {
            if(!_.isEmpty(account.features[key].data) && !_.isEmpty(T.data[0].features[key].data)) {
                var base = T.data[0].features[key].data.value;
                var curr = account.features[key].data.value;
                if(subKey) {
                    base = base[subKey];
                    curr = curr[subKey];
                }
            }
        } else {
            //if(!account.metrics[key].value || !T.data[0].metrics[key].value) {
            if(!account.metrics[key] || !account.metrics[key].value || !T.data[0].metrics[key] || !T.data[0].metrics[key].value) {
                return res;
            }
            var base = T.data[0].metrics[key].value;
            var curr = account.metrics[key].value;
        }

        if(curr>base) {
            var diff = (curr - base)/base*100;
        } else {
            var diff = (base - curr)/base*100;
        }
        if(!hidePrc) {
            if(account == this.data[0]) {
                res += '<span class="'+cn+'">'+__('Base')+'</span>';
            } else {
                if(Math.abs(diff) < 0.1) {
                    res += '<span class="'+cn+'">'+__('Same')+'</span>';
                } else {
                    res += '<span class="'+cn+' '+(curr>base?'positive':'negative')+'">'+Math.abs(diff.toFixed(1))+'% '+(curr>base?__('more'):__('less'))+'</span>';
                }
            }
        }
        return res;
    },
    periodRender: function() {
        var tpl = KYB.template.render({
            template: 'hypeComparisonPeriodTpl'
        }, {
            period: this.periodDays
        });
        return tpl;
    },
    NARender: function(account, withReason) {
        if(account.not_ready && !withReason) {
            return '<i class="far fa-clock hype-ttip-target" title="'+__('Account is being calculated')+'">&#xf017;</i>'
        }
        return account.not_paid?'<i class="far fa-lock-alt">&#xf30d;</i>':'N/A'+(withReason?this.geoReasonRender(account):'');
    },
    geoReasonRender: function(account) {
        var r = '';
        if(account.features && account.features.audience_geo) {
            var q = account.features.audience_geo.status;
            if(q.display_reason && q.title && q.title != 'OK') {
                r = ' <i class="far fa-comment-alt-exclamation hype-ttip-target" title=\''+this.audience_geo_title_dic[q.title]+'\'>&#xf4a5;</i>';
            }
        }
        return r;
    },
    graphColumnRender: function(wrap, data, options) {
        if(!data.data.length) {
            wrap.innerHTML = 'No data';
            return false;
        }
        var yAxisOptions = {
            title: false,
            offset: -17,
            tickAmount: 3,
            endOnTick: true,
            startOnTick: true,
            labels: {
                y: -12,
                padding: 0,
                overflow: 'justify',
                align: 'left',
                formatter: function() {
                    if (this.isLast || (this.isFirst && this.value)) {
                        return KYB.numberToLocale(this.value)
                    }
                },
                useHTML: true,
                style: {
                    padding: '4px 6px',
                    borderRadius: '12px',
                    fontFamily : null,
                    backgroundColor: 'rgba(255, 255, 255, .85)',
                    color: '#86939E',
                    fontSize: '12px',
                    fontWeight: 600
                }
            }
        };
        var yAxis = [yAxisOptions];
        var xAxis = {
            minPadding: 0,
            maxPadding: 0,
            tickWidth: 0,
            gridLineDashStyle: 'dash',
            gridLineWidth: 1,
            gridLineColor: '#DEE7EE',
            lineColor: '#BBCBD8',
            tickAmount: 4,
            dateTimeLabelFormats:{
                day: '%b %e',
            },

            endOnTick: false,
            startOnTick: false,
            labels: {
                padding: 0,
                style: {
                    color: '#86939E',
                    fontSize: '12px',
                    fontWeight: 600
                },
                y: 20
            },
        };
        if(data.categories) {
            xAxis.categories = data.categories;
        } else {
            xAxis.type = 'datetime';

            var minDate = false;
            var maxDate = false;
            _.each(data.data, function (d) {
                _.each(d.data, function (dd) {
                    if(!minDate || minDate>dd[0]) {
                        minDate = dd[0];
                    }
                    if(!maxDate || maxDate<dd[0]) {
                        maxDate = dd[0];
                    }
                });
            });
            var tickInterval = (maxDate - minDate) / (24 * 3600 * 1000) / 4;
            if(tickInterval<7) {
                //tickInterval = 7;
            }
            xAxis.tickInterval = tickInterval * 24 * 3600 * 1000;
        }
        var chartOpt = {
            style: hype.highchartsOptions.chartStyle,
            backgroundColor: null,
            spacing: [0, 0, 0, 0],
            margin: [0, 0, 40, 0],
            height: 150,
            reflow: true,
            animation: false,
        };
        if(KYB.isPDF && options.pdfWidth) {
            chartOpt.width = options.pdfWidth;
            chartOpt.reflow = false;
        }
        Highcharts.chart(wrap, {
            title: false,
            legend: false,
            credits: false,
            tooltip: hype.highchartsOptions.tooltip,
            xAxis: xAxis,
            yAxis: yAxis,
            chart: chartOpt,

            series: data.data
        });
    },
    addAccountFormInit: function (wrap) {
        var T = this;
        KYB.channelsSuggest.init(wrap, {
            action: 'request',
            type: 1,
            btnText: __('Add'),
            onSubmit: function (data, suggester) {
                if (!data.success && data.errors) {
                    var $errPlace = suggester.form.querySelector('.hype-channels-suggest--form-fields');
                    KYB.showError($errPlace, data.errors[0][1]);
                    suggester.input.addEventListener('focus', function () {
                        $errPlace.querySelector('.kyb-error').remove();
                    }, {once: true});
                } else {
                    T.usernames.push(data.username);
                    T.usernames = _.uniq(T.usernames);
                    T.getData();
                    suggester.input.value = '';
                }
            }
        });
    },
    unlock: function (type, id) {
        KYB.tracker.trackEvent('Page Action', {target: 'Comparison unlock'});
        hype.dashboard.accounts.unlock(type, id);
    },
    pdf: function (btn) {
        KYB.saveAsPDF('comparison', this.usernames.join(','), btn);
        /*
        btn.classList.add('kyb-preload');
        KYB.get(KYB.baseUrl+'ajax/getPdfComparison/'+document.location.search, {usernames: this.usernames.join(',')}).then(function (resp) {
            if(resp.success && resp.url) {
                var filename = 'HypeAuditor_'+resp.filename;
                KYB.notify('Download started:<br>' + filename + ' [' + Math.round(resp.size/1024) + ' Kb]', 'success');

                var link = document.createElement('a');
                link.setAttribute('href', resp.url);
                link.setAttribute('download', filename);
                var event = new MouseEvent('click');
                link.dispatchEvent(event);
            } else {
                KYB.notify('Download error :(', 'danger');
            }

            if(btn) {
                btn.classList.remove('kyb-preload');
            }
        });

         */
        KYB.tracker.trackEvent('Page Action', {target: 'Comparison pdf'});
    }
};
