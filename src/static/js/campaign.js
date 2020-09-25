hype.campaign = {
    data: {},
    init: function () {
        // refresh tpls
        KYB.template.tpls = {};
        this.isReport = false;
        var T = this;
        this.sidebar = document.querySelector('.hype-sidebar-right');
        this.mediaList = document.getElementById('hype-campaign--sidebar-media-list');
        this.mediaListSort = document.getElementById('hype-campaign--sidebar-media-list-sort')
        this.mediaListInfo = document.getElementById('hype-campaign--sidebar-media-list-info');
        this.mediaListUpd = document.getElementById('hype-campaign--sidebar-media-list-upd');
        if(this.mediaList) {
            this.mediaList.addEventListener('click', function (e) {

                if(e.target.classList.contains('hype-campaign--post-img') && e.target.dataset.id) {
                    var d = T.media.detailsPopup(e.target.dataset.campaign, e.target.dataset.id, e.target.dataset.type);
                } else {
                    var q = e.target.closest('.hype-campaign--post-quality');
                    if(q && q.dataset.id) {
                        var d = T.media.detailsPopup(q.dataset.campaign, q.dataset.id, q.dataset.type);
                    }
                }

                if(d && d.then) {
                    var m = e.target.closest('.hype-campaign--post');
                    var cn = 'kyb-preload';
                    m.classList.add(cn);
                    hype.campaign.sidebar.classList.add('preload');
                    d.then(function () {
                        m.classList.remove(cn);
                        hype.campaign.sidebar.classList.remove('preload');
                    });
                }
            });
        }
        hype.tabsInit();
        hype.dropmenuInit();
        KYB.imageLoader.add(document.getElementsByClassName('hype-ava'));
    },
    requestDemo: function (title, callback) {
        return KYB.requestDemoPopup('Campaign tracking', {
            title: title ? title : false,
            btn: __('Request'),
            source: 'web request campaign tracking',
            callback: callback
        });
    },
    ttipInit: function(els) {
        _.each(els, function (ttip) {
            App.tooltip({
                el: ttip,
                content: ttip.title
            });
            ttip.title = '';
        });
    },
    getTotalPrice: function(campaignId) {

        if(this.data.id) {
            var campaign = this.data;
        } else {
            // campaign list
            var campaign = this.data.campaigns[campaignId];
        }

        var totalPrice = 0;
        _.each(campaign.features.influencers.data, function (i) {
            if(i.metrics.price.value) {
                totalPrice += parseFloat(i.metrics.price.value);
            }
        });
        return totalPrice;
    },
    influencer: {
        add: function (campaignId, usernames, isBulk) {
            return KYB.post(KYB.baseUrl + 'ajax/addToCampaign/', {
                campaign_id: campaignId,
                username: usernames,
                bulk: isBulk
            }).then(function (resp) {
                if(resp.limit_reached) {
                    hype.campaign.influencer.limitPopup();
                }
            });
        },
        remove: function (campaignId, channelId, callback) {
            KYB.popup.confirm({
                msg: __('Remove influencer from the campaign?'),
                yes: __('Yes, remove it')
            }, function() {
                KYB.get(KYB.baseUrl + 'ajax/deleteCampaignInfluencer/', {
                    campaign_id: campaignId,
                    channel_id: channelId
                }).then(function (resp) {
                    if(callback) {
                        callback(resp);
                    }
                });
            });
        },
        limitPopup: function () {
            KYB.requestDemoPopup('Campaign tracking influencers limit', {
                title: __('Track more influencers'),
                textarea: __('I need to add more influencers to my campaigns'),
                btn: __('Request'),
                source: 'web request campaign tracking'
            });
        },
        unlockStat: function() {
            KYB.tracker.trackEvent('Page Action', {target: 'Campaign tracking report unlock'});
        },
        unlock: function (type, id) {
            hype.dashboard.accounts.unlock(type, id);
            this.unlockStat();
        },
        unlockAll: function (count, btn) {
            if(KYB.user.tokens + KYB.user.free_reports < count) {
                document.location.href = 'https://hypeauditor.com/pricing/';
                return false;
            }
            btn.classList.add('button-preload');
            KYB.get(KYB.baseUrl + 'ajax/unlockCampaignInfluencers/', {
                id: hype.campaign.data.id
            }).then(function (resp) {
                if(resp.success) {
                    hype.router.reload();

                    // TODO
                    if(hype.campaign.mediaList) {
                        window.addEventListener('afterLoad', function () {
                            setTimeout(function () {
                                KYB.trigger(document.querySelectorAll('.hype-campaign--overview-tab')[1], 'click');
                            });
                        }, {once: true});
                    }
                } else {
                    if(resp.non_paid) {
                        document.location.href = 'https://hypeauditor.com/pricing/';
                    }
                }
                btn.classList.remove('button-preload');
            });
            this.unlockStat();
        },
        table: {
            renderBody: function(inf) {
                let T = hype.campaign;
                if(!inf) {
                    var inf = T.data.features.influencers;
                }
                if(!inf || !inf.data) {return false;}

                _.each(T.data.columnsData, function (d, id) {
                    if(inf.data[id]) {
                        inf.data[id].user_column = d;
                    }
                });

                var infTRs = '';
                let s = _.size(inf.data);
                if(s) {
                    var cnt = 0;
                    _.each(inf.data, function (i) {
                        i.cnt = ++cnt;
                        infTRs += KYB.template.render({
                            template: 'hypeCampaignIGInfTrTpl'
                        }, i);
                    });
                } else {
                    infTRs = '<tr class="nodata"><td colspan="'+(_.size(T.data.columns)+3)+'">'+__('No influencers to display')+'</td></tr>'
                }
                T.influencerTableBody.innerHTML = infTRs;
                this.total(inf);
                if(!s) {
                    return true;
                }


                T.ttipInit(T.influencerTableBody.querySelectorAll('.hype-ttip-target'));
                let t = this;
                t.imgArr = [];
                _.each(T.influencerTableBody.querySelectorAll('.hype-table--ava'), function(el){
                    t.imgArr.push({
                        t: el,
                        src: el.dataset.image
                    });
                    el.dataset.image = '';
                });

                KYB.imageLoader.update(t.imgArr, t.wrap);
                if(!hype.campaign.isReport && !hype.campaign.isDemo) {
                    _.each(inf.data, function (i) {
                        App.tooltip({
                            el: T.influencerTableBody.querySelector('[data-'+(T.data.type == 1 ? 'user' : 'channel')+'_id="'+i.basic.id+'"] .js-campaign-table-menu'),
                            byClick: true,
                            hideByClick: true,
                            position: 'left',
                            cssClass: 'campaign-table-menu-ttip',
                            content: function (ttip) {
                                return ttip.$content.innerHTML = KYB.template.render({
                                    template: i.basic.platform == 2 ? 'hypeCampaignTableInfMenuYTTpl' : 'hypeCampaignTableInfMenuTpl'
                                }, i);
                            }
                        });
                    });
                }

                return true;
            },
            renderHead: function() {
                let t = this;
                let T = hype.campaign;
                T.influencerTableHead.innerHTML = KYB.template.render({
                    template: 'hypeCampaignTableHeadTpl'
                }, {
                    columns: T.data.columns
                });
                hype.campaign.sort.init();
                if(!T.isDemo) {
                    let stng = T.influencerTable.querySelector('.js-campaign-table-settings');
                    if(stng) {
                        this.settingsTtip = App.tooltip({
                            el: stng,
                            byClick: true,
                            hideByClick: true,
                            position: 'left',
                            cssClass: 'campaign-table-settings-ttip campaign-table-menu-ttip',
                            content: function (ttip) {
                                t.addColumnFormShowed = false;
                                t.editColumnFormShowed = false;
                                return ttip.$content.innerHTML = KYB.template.render({
                                    template: 'hypeCampaignTableSettingsTpl'
                                }, {columns: hype.campaign.data.columns});
                            },
                            onHide: function (ttip) {
                                let form = ttip.$content.querySelector('.campaign-table-settings-add-column');
                                if(form.classList.contains('-show')) {
                                    if(!form.querySelector('input').value) {
                                        t.addColumnForm();
                                        //form.classList.remove('-show');
                                        //ttip.$content.querySelector('.campaign-table-settings-column.-show').classList.remove('-show');
                                    }
                                }
                            },
                            onShow: function (ttip) {
                                ttip.$content.addEventListener('click', function (e) {
                                    if(e.target.closest('.campaign-table-settings-column-checkbox')) {
                                        hype.campaign.data.columns[e.target.name].visible = e.target.checked;
                                        hype.campaign.influencer.table.toggleColumns();
                                        t.wrap.scrollTo({
                                            left: t.wrap.scrollWidth,
                                            behavior: 'smooth'
                                        });
                                    }
                                });
                                ttip.onShow = false;
                            }
                        });
                    }
                }
            },
            render: function() {
                let T = hype.campaign;
                let wrap = document.querySelector('.hype-campaign-table-wrap--inner');
                if(!wrap) {return false;}

                wrap.innerHTML = KYB.template.render({
                    template: 'hypeCampaignTableTpl'
                }, T.data);
                T.influencerTable = document.getElementById('hype-campaign--influencers-list-table');
                T.influencerTableHead = document.getElementById('hype-campaign--influencers-list-table-head');
                this.renderHead();
                this.wrap = wrap;
                T.influencerTableBody = document.getElementById('hype-campaign--influencers-list-table-body');
                window.addEventListener('leave', function () {
                    hype.campaign.influencerTable = false
                }, {once: true});

                if(this.renderBody()) {
                    this.init();
                }
            },
            textToLink: function(str) {
                return str.replace(/((http|https):\/\/[\w?=&.\/-;#~%-]+(?![\w\s?&.\/;#~%"=-]*>))/g, "<a href='$1' target='_blank'>"+__('Link')+"</a>");
            },
            toggleColumns: function() {
                let T = hype.campaign;
                let cn = 'hidden';
                let columns = {};
                _.each(T.data.columns, function (column, name) {
                    _.each(T.influencerTable.querySelectorAll('[data-name="'+name+'"]'), function (t) {
                        let isHidden = t.classList.contains(cn);
                        if(column.visible && isHidden) {
                            t.classList.remove(cn);
                        } else if(!column.visible && !isHidden) {
                            t.classList.add(cn);
                        }
                    });
                    columns[name] = column.visible?1:0;
                });
                if(T.isReport) {
                    T.report.settings.columns = columns;
                    T.report.save();
                } else {
                    KYB.post(KYB.baseUrl + 'ajax/ctSaveColumns/', {
                        campaign_id: T.data.id,
                        columns: columns
                    });
                }
            },
            init: function() {
                let T = hype.campaign;
                let t = this;
                let cn = 'hype-campaign--influencers-settings-';
                let inf = T.data.features.influencers;
                if (hype.campaign.influencer.table.unSortData) {
                    hype.campaign.influencer.table.unSortData = null;
                }
                t.wrap.style.maxHeight = (window.innerHeight-64-(document.getElementById('hype-campaign--feedback') ? 100 : 0))+'px';
                let scroll = function(e) {
                    if(t.wrap.scrollLeft>8) {
                        t.wrap.classList.add('-scrolled');
                    } else {
                        t.wrap.classList.remove('-scrolled');
                    }
                    if(t.wrap.scrollWidth - t.wrap.clientWidth - t.wrap.scrollLeft > 0) {
                        t.wrap.parentNode.classList.add('-clipped');
                    } else {
                        t.wrap.parentNode.classList.remove('-clipped');
                    }
                    KYB.imageLoader.update(t.imgArr, t.wrap);
                };
                t.wrap.addEventListener('scroll', scroll);
                scroll();

                let tableTabs = document.getElementById('hype-campaign--influencers-list-tabs');
                if(tableTabs) {
                    tableTabs.addEventListener('click', function (e) {
                        if(e.target.closest('.hype-tab')) {
                            let s = e.target.dataset.status;
                            t.currTab = s;
                            if(s != 'all') {
                                let sInf = _.filter(inf.data, function (i) {
                                    let c = i.metrics.media_posted_count.value;
                                    if((s == 'queue' && !c) || (s == 'posted' && c)) {
                                        return true;
                                    }
                                });
                                hype.campaign.influencer.table.unSortData = sInf;
                                hype.campaign.sort.clearSort();
                                t.renderBody({data: sInf});
                            } else {
                                t.renderBody();
                            }
                            tableTabs.querySelector('.active').classList.remove('active');
                            e.target.classList.add('active');
                        }
                    });
                }

                T.influencerTable.addEventListener('click', function (e) {
                    var setLink = e.target.closest('.'+cn+'link');
                    if(setLink) {
                        if(!setLink.ttip) {
                            var formType = setLink.dataset.form;
                            if(!t.forms[formType].inited) {
                                t.forms.init(formType, setLink.dataset);
                            }
                            setLink.ttip = App.tooltip({
                                el: setLink,
                                visible: true,
                                byClick: true,
                                hideByClick: true,
                                //delay: 0,
                                position: 'left',
                                cssClass: cn+'ttip',
                                alwaysFresh: true,
                                content: function (ttip) {
                                    return ttip.$content.appendChild(t.forms.render(formType, setLink.dataset));
                                },
                                onShow: function (ttip) {
                                    if(t.setTtip && ttip != t.setTtip) {
                                        t.setTtip.hide(false, true);
                                    }
                                    setTimeout(function () {
                                        t.setTtip = ttip;
                                        ttip.$content.querySelector('input').focus();
                                    }, 50);
                                }
                            });
                        }
                    } else if(!hype.campaign.isReport) {
                        let tr = e.target.closest('tr');
                        if(tr) {
                            let inf = T.data.features.influencers.data;
                            let id = tr.dataset.user_id || tr.dataset.channel_id;
                            if(!id) {return false;}
                            let c = '-selected';
                            let curr = T.influencerTable.querySelector('.'+c);
                            if(curr) {
                                curr.classList.remove(c);
                            }
                            tr.classList.add(c);
                            T.sidebar.classList.add('-show');
                            document.body.classList.add('campaign-media-filtered');
                            window.addEventListener('leave', function () {
                                document.body.classList.remove('campaign-media-filtered');
                            }, {once: true});
                            T.media.filter(id, tr.dataset.user_id ? 'user_id' : 'channel_id', false, inf[id].basic.title);
                        }
                    }
                });
            },
            forms: {
                custom: {
                    inited: false,
                    render: function (data) {
                        var T = this;
                        var html = '';
                        var cn = 'hype-campaign--influencers-settings-video';
                        let p = {
                            all: 1,
                            filters: {}
                        };
                        let type = hype.campaign.data.type;
                        if(type == 2) {
                            p.filters.channel_id = data.channel_id;
                        } else {
                            p.filters.user_id = data.channel_id;
                        }
                        T.form.querySelector('[name="channel_id"]').value = data.channel_id;
                        var content = T.form.querySelector('.hype-campaign--influencers-settings-content');
                        content.innerHTML = '<div class="preloader"></div>';
                        hype.campaign.media.get(p).then(function (resp) {
                            T.media = resp.data.media;
                            _.each(T.media, function (m) {
                                if(m.basic.media_type == 'story' && data.field == 'saves') {
                                    return;
                                }
                                let val = m.metrics[data.field] ? m.metrics[data.field].value : '';
                                html += '<div class="'+cn+'"><img src="'+m.basic.preview_url+'"><div class="'+cn+'-info"><div class="ellipsis">'+(m.basic.title?m.basic.title:moment.utc(m.basic.time_post).fromNow())+'</div>' +
                                        '<input type="number" min="0" name="'+data.field+'['+m.basic.media_id+']" value="'+val+'" class="hype-input -small hype-input--gray" placeholder="'+__('Enter {f} amount', {f: data.field.split('_')[0]})+'"></div></div>';

                            });

                            if(html) {
                                content.innerHTML = html;
                            } else {
                                content.innerHTML = __('No media yet');
                            }
                            hype.campaign.influencer.table.setTtip.align();
                        });
                    },
                    update: function (resp, data) {
                        hype.campaign.media.sort();

                        KYB.tracker.trackEvent('Campaign Set '+data.field,{
                            'Campaign id': hype.campaign.data.id
                        });
                    }
                },
                user_column: {
                    inited: false,
                    update: function (resp, data, formData) {
                        /*let inf = hype.campaign.data.features.influencers.data[formData.channel_id];
                        if(!inf.user_column) {
                            inf.user_column = {};
                        }
                        inf.user_column[formData.column_id] = formData.value;*/


                        let column = _.findWhere(hype.campaign.data.columns, {id: formData.column_id+''});
                        KYB.tracker.trackEvent('Campaign Set Post Data',{
                            'Campaign id': hype.campaign.data.id,
                            field: column.title,
                            value: formData.value,
                            platform: hype.campaign.data.type == 1 ? 'instagram' : 'youtube'
                        });
                    }
                },
                price: {
                    inited: false
                },
                init: function (type, data) {
                    var T = this;
                    var cn = 'hype-campaign--influencers-settings-';
                    var form = document.getElementById(cn+'form-'+type);
                    this[type].form = form;
                    this[type].inited = true;
                    window.addEventListener('leave', function () {
                        T[type].inited = false
                    }, {once: true});
                    form.querySelector('.button-transparent').addEventListener('click', function () {
                        if(hype.campaign.influencer.table.setTtip) {
                            hype.campaign.influencer.table.setTtip.hide(false, true);
                        }
                    });

                    if(hype.campaign.isDemo) {return false;}
                    form.addEventListener('submit', function (e) {
                        e.preventDefault();
                        form.classList.add('kyb-preload');
                        var formData = {};
                        _.each(form.querySelectorAll('input'), function (input) {
                            let val = input.value;
                            if(val) {
                                if(isNaN(val)) {
                                    val = val.trim();
                                }
                                formData[input.name] = val;
                            }
                        });
                        KYB.post(form.action, formData).then(function (resp) {
                            if(!_.isEmpty(resp.data)) {
                                form.classList.remove('kyb-preload');
                                if(resp.success) {
                                    hype.campaign.data.features = resp.data.features;
                                    hype.campaign.data.metrics = resp.data.metrics;
                                    hype.campaign.data.columnsData = resp.custom_columns_data;

                                    if(T[type].update) {
                                        T[type].update(resp, data, formData);
                                    } else {
                                        hype.campaign.media.sort();
                                        hype.campaign.charts.render.posted();
                                        hype.campaign.charts.render.spend();
                                    }

                                    hype.campaign.influencer.table.setTtip.hide(false, true);
                                    hype.campaign.influencer.table.renderBody();
                                } else {
                                    hype.campaign.errLog('cant save inf data');
                                    KYB.notify(resp.error?resp.error:__('Error saving data. Please try again later'), 'danger');
                                }
                            } else {
                                hype.router.reload();
                            }
                        });
                    });
                },
                render: function (type, data) {
                    var t = this[type];
                    if(t.render) {
                        t.render(data);
                    } else {

                        _.each(data, function (d, n) {
                            var el = t.form.querySelector('input[name="'+n+'"]');
                            if(el) {
                                //if(n=='channel_id'||parseInt(d)) {
                                if(!isNaN(d)) {
                                    d = parseInt(d);
                                }
                                if(d) {
                                    el.value = d;
                                } else {
                                    el.value = '';
                                }
                            }
                        });
                    }
                    return t.form;
                }
            },
            total: function(inf) {
                let t = this;
                let data = hype.campaign.data;
                if(!inf || !inf.data) {return false;}
                let tfoot = hype.campaign.influencerTable.querySelector('tfoot');
                let s = _.size(inf.data);
                if(!s) {
                    tfoot.style.visibility = 'hidden';
                    return true;
                } else {
                    tfoot.style.visibility = 'visible';
                }
                _.each(data.columns, function (column, name) {
                    if(name == 'audience' || name == 'aqs') {return;}
                    let td = tfoot.querySelector('[data-name="'+name+'"]');
                    if(name == 'er') {
                        td.innerHTML = t.currTab == 'queue' ? '' : data.metrics.er ? data.metrics.er.value+'%' : 'N/A';
                        return;
                    } else if(name == 'roi') {
                        td.innerHTML = data.metrics.roi ? Math.round(data.metrics.roi.value)+'%' : 'N/A';
                        return;
                    } else if(_.indexOf(['cpe', 'cpm', 'cpc'], name) > -1) {
                        td.innerHTML = t.currTab == 'queue' ? '' : (data.sym + (data.metrics[name] ? data.metrics[name].value.toFixed(2) : 0));
                        return;
                    } else if(name == 'stories') {
                        let s = data.storiesCountByChannels;
                        if(!_.isEmpty(s)) {
                            let sum = _.reduce(inf.data, function (memo, num) {
                                return memo+(s[num.basic.id] ? s[num.basic.id] : 0);
                            }, 0);
                            td.innerHTML = sum;
                        } else {
                            td.innerHTML = 0;
                        }
                        return;
                    }

                    if(column.id) {
                        let sum = _.reduce(data.columnsData, function (memo, num, a, b) {
                            let v = num[column.id];
                            if(!isNaN(v)) {
                                return memo+parseFloat(v);
                            } else {
                                if(typeof (v) == 'undefined') {
                                    return memo
                                }
                            }
                        }, 0);
                        if(sum) {
                            td.innerHTML = KYB.numberFormat(sum);
                        }
                    } else {
                        let sum = _.reduce(inf.data, function (memo, num) {
                            return memo+(num.metrics[name] ? num.metrics[name].value : 0);
                        }, 0);
                        var unit = ''
                        if(name == 'media_posted_count') {
                            unit = ' ' + __('of') + ' ';
                            unit += _.reduce(inf.data, function (memo, num) {
                                return memo+num.metrics['posts_count'].value;
                            }, 0);
                        }
                        if(name == 'price') {
                            td.innerHTML = data.sym + KYB.numberToLocale(sum);
                        } else {
                            td.innerHTML = (column.currency ? column.currency : '') + KYB.numberFormat(sum) + unit;
                        }
                    }
                });
            },
            addColumnFormInit: function() {
                let T = this;
                let form = document.querySelector('.campaign-table-settings-add-column');
                let input = form.querySelector('input');
                form.addEventListener('submit', function (e) {
                    e.preventDefault();
                    let btn = form.querySelector('button');
                    btn.classList.add('button-preloader');
                    KYB.post(KYB.baseUrl+'ajax/ctCreateCustomColumn/', {
                        campaign: hype.campaign.data.id,
                        name: input.value
                    }).then(function (resp) {
                        if(resp.success) {
                            hype.campaign.data.columns['custom-'+resp.column_id] = {
                                id: resp.column_id+"",
                                title: input.value,
                                visible: 1,
                                class: "custom-col"
                            };
                            T.settingsTtip.remove();
                            T.renderHead();
                            T.renderBody();

                            KYB.tracker.trackEvent('Campaign Add Column',{
                                'Campaign id': hype.campaign.data.id,
                                field: input.value,
                                platform: hype.campaign.data.type == 1 ? 'instagram' : 'youtube'
                            });

                            KYB.notify(__('New column added'), 'success');

                            T.wrap.scrollTo({
                                left: T.wrap.scrollWidth,
                                behavior: 'smooth'
                            });
                        } else {
                            KYB.notify(__('Something went wrong'), 'danger');
                        }
                    });
                });
                form.inited = true;
            },
            addColumnForm: function (btn) {
                let form = document.querySelector('.campaign-table-settings-add-column');
                if(form.classList.contains('-show')) {
                    form.classList.remove('-show');
                    if(!btn) {
                        document.querySelector('.campaign-table-settings-column.-show').classList.remove('-show');
                    } else {
                        btn.classList.remove('-show');
                    }
                    this.addColumnFormShowed = false;
                    return false;
                }
                if(!form.inited) {
                    this.addColumnFormInit();
                }
                let input = form.querySelector('input');
                btn.classList.add('-show');
                form.classList.add('-show');
                input.focus();
                this.addColumnFormShowed = true;
                if(this.editColumnFormShowed) {
                    this.editColumnForm();
                }
            },
            editColumnFormInit: function() {
                let T = this;
                let form = document.querySelector('.campaign-table-settings-edit-column');
                let input = form.querySelector('input');
                form.addEventListener('submit', function (e) {
                    let id = input.dataset.id;
                    let column = _.findWhere(hype.campaign.data.columns, {id: id+''});
                    e.preventDefault();
                    let btn = form.querySelector('button');
                    btn.classList.add('button-preloader');
                    KYB.post(KYB.baseUrl+'ajax/ctEditCustomColumn/', {
                        column: id,
                        name: input.value
                    }).then(function (resp) {
                        if(resp.success) {
                            column.title = input.value;
                            T.settingsTtip.remove();
                            T.renderHead();

                            KYB.notify(__('Column name edited'), 'success');
                        } else {
                            KYB.notify(__('Something went wrong'), 'danger');
                        }
                    });
                });
                this.editColumnFormShowed = false;
            },
            editColumnForm: function (id) {
                let form = document.querySelector('.campaign-table-settings-edit-column');
                if(!id && this.editColumnFormShowed) {
                    form.classList.remove('-show');
                    this.editColumnFormShowed = false;
                    return false;
                }
                let input = form.querySelector('input');
                let column = _.findWhere(hype.campaign.data.columns, {id: id+''});
                input.value = column.title;
                if(!input.dataset.id) {
                    this.editColumnFormInit();
                }
                input.dataset.id = id;
                form.classList.add('-show');
                input.focus();
                this.editColumnFormShowed = true;
                if(this.addColumnFormShowed) {
                    this.addColumnForm();
                }
            }
        }
    },
    mention: {
        add: function (campaignId, value) {
            return KYB.get(KYB.baseUrl + 'ajax/addCampaignMentionOrHashtag/', {
                campaign_id: campaignId,
                value: value
            });
        },
        remove: function (campaignId, id) {
            return KYB.get(KYB.baseUrl + 'ajax/removeCampaignMentionOrHashtag/', {
                campaign_id: campaignId,
                id: id
            });
        }
    },
    media: {
        find: function(id) {
            let media = _.find(this.cache, function (m) {
                if(m.basic.media_id == id) {
                    return true;
                }
            });
            if(media) {
                return media;
            } else {
                return this.get({
                    filters: {
                        media_id: id
                    }
                });
            }
        },
        detailsPopup: function(campaignId, id, type) {
            var T = hype.campaign;
            var mediaData;
            if(T.data.campaigns) {
                // campaign list
                var campaign = T.data.campaigns[campaignId];
            } else {
                var campaign = T.data;
            }
            var inf = campaign.features.influencers.data;
            var show = function () {
                KYB.popup.show({
                    cssClass: 'hype-campaign--post-popup',
                    html: KYB.template.render({
                        template: mediaData.basic.platform == 2 ? 'hypeCampaignMediaYTPopupTpl' : 'hypeCampaignMediaPopupTpl'
                    }, mediaData),
                    onOpen: function (t) {
                        hype.campaign.ttipInit(t.$content.querySelectorAll('.hype-ttip-target'));

                        if(hype.router) {
                            hype.router.updatePageLinks();
                        }

                        var img = t.$content.querySelector('.hype-campaign--post-popup-img');
                        if(img) {
                            KYB.imageLoader.update([{
                                t: img,
                                src: img.dataset.image
                            }], t.$el);
                        }

                        KYB.tracker.trackEvent('View Campaign Post',{
                            'Campaign id': mediaData.basic.campaign_id,
                            username: mediaData.basic.username,
                            platform: mediaData.basic.platform == 2 ? 'youtube' : 'instagram'
                        });
                    }
                });
            };
            if(type != 'story') {
                var info = this.getMediaInfo(campaignId ? campaignId : T.data.id, id);
                info.then(function (resp) {
                    if(resp.success && resp.details) {
                        mediaData = resp.details;

                        mediaData.features.blogger = inf[mediaData.basic.platform==2?mediaData.basic.channel_id:mediaData.basic.user_id];
                        mediaData.price = T.getTotalPrice(mediaData.basic.campaign_id);
                        show();
                        T.media.chartRender(resp.details);
                    } else {
                        hype.campaign.errLog('cant load details post popup (id '+id+')');
                    }
                });
                return info;
            } else {
                mediaData = this.find(id);
                if(mediaData.then) {
                    mediaData.then(function (resp) {
                        mediaData = resp.data.media[0];
                        mediaData.features.blogger = inf[mediaData.basic.user_id];
                        show();
                    });
                } else {
                    mediaData.features.blogger = inf[mediaData.basic.user_id];
                    show();
                }
            }
        },
        chartRender: function(data) {
            var T = hype.campaign;
            var wrap = document.getElementById('hype-campaign--post-popup-graph');
            var graphConf = T.charts.config.basic;
            var graphY1 = _.extend({}, T.charts.config.y1);
            var graphY2 = _.extend({}, T.charts.config.y2);

            graphY1.title.text = data.basic.platform == 2 ? __('Views') : __('Likes');
            graphY1.title.style.color = '#FF6436';
            graphY1.labels.style.color = '#FF6436';
            graphY2.title.text = __('Comments');
            graphY2.title.style.color = '#86939E';
            graphY2.labels.style.color = '#86939E';

            var data1 = data.basic.platform == 2 ? data.metrics.views_count.history : data.metrics.likes_count.history;
            var data2 = data.metrics.comments_count.history;
            var graphEngDataLastVal1 = data1[data1.length-1].value;
            graphY1.plotLines = [{
                value: graphEngDataLastVal1,
                dashStyle: 'dash',
                width: 1,
                color: 'rgba(134,147,158,0.4)'
            }];
            var graphEngDataMaxVal1 = _.max(data1, function (d) {
                return d.value;
            });
            graphY1.tickPositions = [0, graphEngDataLastVal1, graphEngDataMaxVal1.value*1.05];
            var graphEngDataLastVal2 = data2[data2.length-1].value;
            graphY2.plotLines = [{
                value: graphEngDataLastVal2,
                dashStyle: 'dash',
                width: 1,
                color: 'rgba(187,203,216,0.4)'
            }];
            var graphEngDataMaxVal2 = _.max(data2, function (d) {
                return d.value;
            });
            graphY2.tickPositions = [0, graphEngDataLastVal2, graphEngDataMaxVal2.value*2];

            var graphEngData = _.extend({}, graphConf, {
                yAxis: [graphY1, graphY2],
                series: [
                    {
                        type: 'spline',
                        color: '#FF6436',
                        tooltip_pre: (data.basic.platform == 2 ? __('Views') : __('Likes'))+'<br>',
                        name: data.basic.platform == 2 ? __('Views') : __('Likes'),
                        data: _.map(data1, function (t) {
                            return [moment(t.time).valueOf(), t.value];
                        }),
                        stickyTracking: false
                    },
                    {
                        type: 'spline',
                        color: '#86939E',
                        tooltip_pre: __('Comments')+'<br>',
                        name: __('Comments'),
                        data: _.map(data2, function (t) {
                            return [moment(t.time).valueOf(), t.value];
                        }),
                        yAxis: 1,
                        stickyTracking: false
                    }
                ]
            });
            var dataEst = _.where(data1, {is_estimate: true});
            var dataEst2 = _.where(data2, {is_estimate: true});
            if(dataEst.length > 1) {
                graphEngData.series[0].zoneAxis = 'x';
                graphEngData.series[0].zones = [{
                    value: 0
                }, {
                    value: moment(data1[dataEst.length].time).valueOf(),
                    dashStyle: 'ShortDash'
                }];
            }
            if(dataEst2.length > 1) {
                graphEngData.series[1].zoneAxis = 'x';
                graphEngData.series[1].zones = [{
                    value: 0
                }, {
                    value: moment(data2[dataEst2.length].time).valueOf(),
                    dashStyle: 'ShortDash'
                }];
            }
            hype.graph.render(wrap, graphEngData);
        },
        getMediaInfo: function(campaignId, mediaId) {
            var T = this;
            var p = {
                campaign_id: campaignId,
                media_id: mediaId
            };
            if(KYB.pageId == 'Auditor.CampaignReport' && hype.campaign.data.hash) {
                p.hash = hype.campaign.data.hash;
            }
            T.xhr = KYB.get(KYB.baseUrl+'ajax/getCampaignPostInfo/', p);
            return T.xhr;
        },
        get: function(params) {
            var T = this;
            if(!params) {
                var params = {};
                params.page = this.page;
                if(this.sortParams) {
                    params.sort = this.sortParams;
                }
                if(this.filterParams) {
                    params.filters = {};
                    params.filters[this.filterParams.by] = this.filterParams.value;
                    if(this.filterParams.campaign_id) {
                        params.filters.campaign_id = this.filterParams.campaign_id;
                    }
                }
            }
            if(hype.campaign.data.id) {
                params.campaign_id = hype.campaign.data.id;
            }
            if(this.xhr) {
                this.xhr.abort();
            }
            hype.campaign.sidebar.classList.add('preload');
            this.xhr = KYB.get(KYB.baseUrl+'ajax/getCampaignMedia/', params).then(function (resp) {
                T.xhr = false;
                if(resp.success && resp.data && resp.data.media) {
                    T.cache.push(...resp.data.media);
                }
                hype.campaign.sidebar.classList.remove('preload');
            });
            return this.xhr;
        },
        imageLoader: function() {
            KYB.imageLoader.update(this.postsImgArr, this.sidebarContent);
        },
        render: function(resp) {
            var T = hype.campaign;
            if(!T.mediaList) {
                return false;
            }

            if(resp.success && resp.data && resp.data.media) {
                if(T.media.page) {
                    T.data.media.push(...resp.data.media);
                } else {
                    T.data.media = resp.data.media;
                }

                T.media.totalCount = resp.data.total_count;

            } else {
                T.mediaList.parentNode.appendChild(document.getElementsByClassName('hype-campaign--post-nodata')[0]);
                T.mediaList.style.display = 'none';
                T.errLog('cant load media' + (T.data && T.data.id ? ' (campaign_id ' + T.data.id + ')' : ''));
                return;
            }


            var t = this;
            var media = resp.data.media;
            if(media.length) {
                this.append(media);
                T.mediaList.style.display = 'flex';
            } else {
                if(!t.filterParams || !t.filterParams.by) {
                    T.mediaList.parentNode.appendChild(document.getElementsByClassName('hype-campaign--post-nodata')[0]);
                    T.mediaList.style.display = 'none';
                    return false
                } else {
                    T.mediaList.innerHTML = '';
                }
            }
            var newPosts = _.filter(media, function (m) {
                if(!m.basic.is_viewed) {
                    return true;
                }
            });

            let infoHtml;
            if(newPosts.length) {
                infoHtml = '<i class="hype-campaign--new-posts-ico"></i> '+__n('1 new post', '{n} new posts', newPosts.length, {n: newPosts.length});
            } else {
                infoHtml = __n('1 post found', '{n} posts found', this.totalCount, {n: this.totalCount});
            }

            if(t.filterParams && t.filterParams.by) {
                if(t.filterParams.by == 'campaign_id') {
                    infoHtml = __n('1 post found for', '{n} posts found for', this.totalCount, {n: this.totalCount});
                } else if(t.filterParams.by == 'user_id' || t.filterParams.by == 'channel_id') {
                    infoHtml = __n('1 post found from', '{n} posts found from', this.totalCount, {n: this.totalCount});
                } else if(t.filterParams.by == 'date') {
                    infoHtml = __n('1 post found on', '{n} posts found on', this.totalCount, {n: this.totalCount});
                } else {
                    infoHtml = __n('1 post found with', '{n} posts found with', this.totalCount, {n: this.totalCount});
                }
                T.mediaListUpd.classList.add('collapse');
                infoHtml += '<span id="hype-campaign--sidebar-media-filter-clear" class="hype-campaign--sidebar-btn" onclick="hype.campaign.media.filter();"><i class="far fa-times">&#xf00d;</i></span> <span class="hype-campaign--sidebar-media-filter ellipsis">' + t.filterParams.title + '</span>';
            } else {
                if(hype.campaign.data.last_upd) {

                    T.mediaListUpd.innerHTML = __('Updated {time}', {time: moment(hype.campaign.data.last_upd).fromNow()});
                }
                T.mediaListUpd.classList.remove('collapse');
            }
            T.mediaListInfo.innerHTML = infoHtml;

            hype.router.updatePageLinks();
        },
        onScroll: function(e) {
            var T = this;
            this.imageLoader();
            if(!this.xhr && hype.campaign.data.media.length < this.totalCount && (this.scrollHeight - this.clientHeight - e.target.scrollTop) < 110) {
                this.page++;
                this.get().then(function(resp) {
                    T.render(resp);
                });
            }
        },
        init: function() {
            var T = this;
            this.postsImgArr = [];
            this.page = 1;
            this.sortParams = false;
            this.filterParams = false;
            hype.campaign.data.media = [];
            this.sidebarContent = hype.campaign.sidebar.querySelector('.hype-sidebar-right--content');
            this.sidebarContent.addEventListener('scroll', this.onScroll.bind(this));
            window.addEventListener('leave', function () {
                T.sidebarContent.removeEventListener('scroll', T.onScroll.bind(T));
                if(T.xhr) {
                    T.xhr.abort();
                }
            }, {once: true});
            this.get().then(function(resp) {
                T.render(resp);
            });
        },
        append: function(media) {
            var T = this;
            var html = '';
            _.each(media, function (m) {
                html += KYB.template.render({
                    template: m.basic.platform == 2 ? 'hypeCampaignMediaYoutubeTpl' : (m.basic.media_type=='story' ? 'hypeCampaignMediaStoryTpl' : 'hypeCampaignMediaTpl')
                }, m);
            });
            var frag = document.createRange().createContextualFragment(html);
            hype.campaign.ttipInit(frag.querySelectorAll('.hype-ttip-target'));
            _.each(frag.querySelectorAll('.hype-campaign--post-img'), function(el){
                T.postsImgArr.push({
                    t: el,
                    src: el.dataset.image
                });
                el.dataset.image = '';
            });

            if(this.page < 2) {
                hype.campaign.mediaList.innerHTML = '';
            }
            hype.campaign.mediaList.appendChild(frag);
            this.scrollHeight = this.sidebarContent.scrollHeight;
            this.clientHeight = this.sidebarContent.clientHeight;
            this.imageLoader();
        },
        sort: function (by) {
            if(!hype.campaign.mediaList) {return false;}
            var T = this;
            if(!by) {
                this.filterParams = false;
                var by = 'most_recent';
            }
            this.sortParams = by;
            this.postsImgArr = [];
            this.page = 1;
            hype.campaign.data.media = [];
            this.get().then(function(resp) {
                T.render(resp);
            });
        },
        filter: function (value, filter, campaignId, title) {
            if(!hype.campaign.mediaList) {return false;}
            var t = this;
            var T = hype.campaign;
            if(value) {
                this.filterParams = {
                    by: filter,
                    value: value,
                    campaign_id: campaignId
                };

                if(title) {
                    this.filterParams.title = title;
                } else {
                    this.filterParams.title = value;
                }
            } else {
                this.filterParams = false;

                T.sidebar.classList.remove('-show');
                if(T.influencerTable) {
                    let tr = T.influencerTable.querySelector('.-selected');
                    if(tr) {
                        tr.classList.remove('-selected');
                    }
                }
                document.body.classList.remove('campaign-media-filtered');
            }
            this.postsImgArr = [];
            this.page = 1;
            T.data.media = [];
            this.get().then(function(resp) {
                t.render(resp);
            });
            this.sidebarContent.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        },
        delete: function (id) {
            KYB.post(KYB.baseUrl+'ajax/removeCampaignPost/', {
                campaign_id: hype.campaign.data.id,
                media_id: id
            }).then(hype.router.reload);
            KYB.popup.allHide();
        }
    },
    initAddForms: function() {
        var T = this;
        var postForm = document.getElementById('campaign--influencers-post-add-form');
        var postLink = postForm.querySelector('input');
        var submit = postForm.querySelector('button');

        postLink.addEventListener('input', function(e) {
            if(postLink.value) {
                submit.removeAttribute('disabled');
                submit.classList.remove('button-disabled')
            } else {
                submit.setAttribute('disabled', 'disabled');
                submit.classList.add('button-disabled');
            }
        });

        postForm.addEventListener('submit', function(e) {
            e.preventDefault();

            KYB.get(KYB.baseUrl + 'ajax/addCampaignPost/', {
                campaign_id: T.data.id,
                bulk: 0,
                link: postLink.value
            }).then(function (resp) {

                if(resp.errors.length) {
                    KYB.notify(resp.errors.map(x => x + '\n'), 'danger');
                    return;
                }

                if(resp.added) {
                    postLink.value = '';
                    KYB.notify(__('Post added to campaign'), 'success');
                    hype.router.reload();
                }

            });
        })
    },
    postBulkFormProcess: function() {
        var T = this;
        var form = document.getElementById('hype-campaign--influencers-list-add-form-bulk');
        var textarea = form.querySelector('textarea');
        var value = textarea.value;

        KYB.get(KYB.baseUrl + 'ajax/addCampaignPost/', {
            campaign_id: T.data.id,
            bulk: 1,
            link: value
        }).then(function (resp) {

            if(resp.errors.length) {
                KYB.notify(resp.errors.map(x => x + '\n'), 'danger');
                return;
            }

            if(resp.added) {
                textarea.value = '';
                KYB.notify(__('Posts added to campaign'), 'success');
                hype.router.reload();
            }

        });
    },
    showAddInfForm: function(isPost) {
        var T = this;

        document.getElementById('hype-campaign--influencers-list-add').classList.add('show');

        let hideRecent = this.data.type == 2 ? true : false;

        var infForm = document.getElementById('hype-campaign--influencers-list-add-form');
        var postForm = document.getElementById('campaign--influencers-post-add-form');
        var bulkTextarea = document.querySelector('.js-bulk-textarea');

        document.getElementById('hype-campaign--influencers-list-add-form-bulk').querySelector('textarea').value = ""

        infForm.classList.remove('show')
        postForm.classList.remove('show')

        if(isPost) {
            this.bulkFormPosts = true;
            bulkTextarea.setAttribute('placeholder', this.data.type == 2 ? __('Enter YouTube post links, one per line') : __('Enter Instagram post links, one per line'));
            postForm.classList.add('show')
        } else {
            this.bulkFormPosts = false;
            bulkTextarea.setAttribute('placeholder', this.data.type == 2 ? __('Enter YouTube accounts, one per line') : __('Enter Instagram @usernames, one per line'));
            infForm.classList.add('show')

            var s = KYB.channelsSuggest.init(infForm, {
                btnText: __('Add'),
                action: 'ajax/addToCampaign',
                type: this.data.type,
                hideRecent: hideRecent,
                inputClass: 'hype-input hype-input--gray',
                params: {
                    campaign_id: T.data.id
                },
                usernameParamName: 'username',
                usernameParamField: this.data.type === 1 ? 'username' : 'channel_id',
                onSubmit: function (resp) {
                    if(resp.added) {
                        hype.router.reload();
                    }
                    if(resp.limit_reached) {
                        T.influencer.limitPopup();
                    }
                }
            });

            s.input.focus();
        }


        if(!this.influencersListBulkForm) {

            this.influencersListBulkForm = document.getElementById('hype-campaign--influencers-list-add-form-bulk');
            this.influencersListBulkForm.addEventListener('submit', function (e) {
                e.preventDefault();

                if(T.bulkFormPosts) {
                    T.postBulkFormProcess();
                    return;
                }

                var textarea = e.target.querySelector('.hype-textarea');
                var val = textarea.value.trim();
                if(val) {
                    hype.campaign.influencer.add(T.data.id, val, 1).then(function(response) {
                        textarea.disabled = false;

                        if (response.errors.length) {
                            var errorMsg = '';

                            var errors = response.errors.slice(0, 2);
                            _.each(errors, function (error) {
                                errorMsg += error + '<br>';
                            });

                            if(response.errors.length > 3) {
                                errorMsg += '... and ' + (response.errors.length - 3) + ' more';
                            }

                            KYB.notify(errorMsg, 'danger');

                            hype.campaign.errLog(errorMsg);
                        }

                        if(response.added) {
                            hype.router.reload();
                        }
                        if(response.limit_reached) {
                            T.influencer.limitPopup();
                        }
                    });
                }
            });
        }
    },
    feedbackInit: function() {
        KYB.feedbackModule.init({
            id: 26,
            header: __('Do you find Campaign tracking useful?'),
            container: '#hype-campaign--feedback',
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

            sendBtnHint: __('...to make Campaign tracking better'),

            onInit: function (t) {
                window.addEventListener('leave', function () {
                   t.container.remove();
                }, {once: true});
            }
        });
    },
    changeStatus: function(id, finishConfirm, menuItem, callback) {
        let cn = 'hype-dropmenu--item-active';
        if(menuItem&&menuItem.classList.contains(cn)) {return false;}
        let T = this;
        if(menuItem) {
            var p = menuItem.parentNode;
            var currActive = p.querySelector('.'+cn);
        }
        let rollback = function () {
            if (p.querySelector('.'+cn)) {
                p.querySelector('.'+cn).classList.remove(cn);
                currActive.classList.add(cn);
            }
        };
        let change = function() {
            KYB.post(KYB.baseUrl+'ajax/changeCampaignStatus/', {
                campaign_id: id?id:T.data.id
            }).then(function (resp) {
                if(resp.limit_reached) {
                    let p = {
                        title: __('Track more campaigns'),
                        btn: __('Request'),
                        source: 'web request campaign tracking'
                    };
                    if(T.data.status == 2) {
                        // draft
                        p.title = __('Request a call to start tracking campaigns');
                    } else {
                        p.textarea = __('I need to track more campaigns');
                    }
                    KYB.requestDemoPopup('Campaign tracking campaigns limit', p);
                    if(menuItem) {
                        rollback();
                    }
                } else if(callback) {
                    callback();
                } else {
                    hype.router.reload();
                }
            });
        };
        if(finishConfirm) {
            KYB.popup.confirm({
                msg: __('Finish this campaign?'),
                desc: __('We will move it to Finished & stop monitoring influencers for new mentions. You will be able to restart campaign anytime. Finished campaigns do not count against your plan limits.'),
                yes: __('Finish campaign'),
                no: __('Leave active')
            }, change, rollback);
        } else {
            change();
        }
    },
    deleteStory: function (id) {
        var T = this;
        KYB.popup.confirm({
            msg: __('Delete Story?'),
            desc: __('This cannot be undone. All your data will be lost.'),
            yes: __('Delete'),
            no: __('Don’t delete')
        }, function () {
            KYB.post(KYB.baseUrl+'ajax/removeStory/', {
                id: id
            }).then(function () {
                hype.router.navigate('campaign/'+T.data.id+'/');
            });
        });
    },
    delete: function(id) {
        var T = this;
        KYB.popup.confirm({
            msg: __('Delete Campaign?'),
            desc: __('This cannot be undone. All your data will be lost.'),
            yes: __('Delete'),
            no: __('Don’t delete')
        }, function () {
            KYB.post(KYB.baseUrl+'ajax/deleteCampaign/', {
                campaign_id: id?id:T.data.id
            }).then(function () {
                hype.router.navigate('campaign');
            });
        });
    },
    renderListItem: function(data, id) {
        var idPart = 'hype-campaign--list-item-'+id;
        let el = document.getElementById(idPart);
        let dateEl = document.getElementById(idPart+'-date');
        let d = data?data:{};
        d.postCountText = __('new post', 'new posts', data.metrics.media_new_count ? data.metrics.media_new_count.value : 0);
        dateEl.innerHTML = KYB.template.render({
            template: 'hypeCampaignListItemDateTpl'
        }, d);

        if(data && !_.isEmpty(data.metrics) && data.features) {
            var m = data.metrics;
            let mentions = el.querySelectorAll('.hype-campaign--list-item-mention');
            let postedEl = document.getElementById(idPart+'-posted');
            let h = '<i class="far fa-hourglass-half">&#xf252;</i>';
            if(this.data.campaignsMap[id].status != 2) {
                // not freezed
                if (data.basic.platform === 2) {
                    let subsEl = document.getElementById(idPart+'-subs');
                    let viewsEl = document.getElementById(idPart+'-views');
                    let reactionEl = document.getElementById(idPart+'-reaction');
                    subsEl.innerHTML = m.total_audience.value ? KYB.numberFormat(m.total_audience.value,1) : h;
                    viewsEl.innerHTML = m.views_count.value ? KYB.numberFormat(m.views_count.value,1) : h;
                    reactionEl.innerHTML = m.engagements_count.value ?KYB.numberFormat(m.engagements_count.value,1) : h;
                } else {
                    let qaEl = document.getElementById(idPart+'-qa');
                    let engEl = document.getElementById(idPart+'-eng');
                    let erEl = document.getElementById(idPart+'-er');
                    qaEl.innerHTML = m.quality_audience.value ? KYB.numberFormat(m.quality_audience.value,1) : h;
                    engEl.innerHTML = m.engagements_count.value ? KYB.numberFormat(m.engagements_count.value,1) : h;
                    erEl.innerHTML = m.er.value ? m.er.value+'%' : h;
                }
            }
            postedEl.innerHTML = m.media_posted_channels_count.value + '<small>/'+m.media_channels_count.value+'</small>';

            _.each(mentions, function (c) {
                var s = c.children[0];
                var count = data.features.mentions.data[c.textContent.slice(0, -1)];
                if(count) {
                    s.innerHTML = count;
                } else {
                    s.remove();
                }
            });
        } else {
            _.each(el.querySelectorAll('.hype-campaign--list-item-digit strong'), function (item) {
                item.innerHTML = 'N/A';
            });
        }
    },
    fetchListData: function() {
        var T = this;
        var xhr = KYB.get(KYB.baseUrl+'ajax/getCtListData/').then(function (resp) {
            xhr = false;
            if(resp.data) {
                T.data.campaigns = resp.data;
                T.data.campaignsMap = resp.map;
                //T.data.stories = resp.stories;
                _.each(resp.map, function (d, id) {
                    T.renderListItem(resp.data[id], id);
                });
            }
        });
        window.addEventListener('leave', function () {
            if(xhr) {
                xhr.abort();
            }
        }, {once: true});
        return xhr;
    },
    listInit: function() {
        hype.campaign.data.id = false;
        hype.campaign.init();
        var T = this;
        this.fetchListData().then(function () {
            if(T.mediaList) {
                T.media.cache = [];
                T.media.init();
            }
            var postsCount = 0;
            _.each(T.data.campaigns, function (c) {
                if(c.basic) {
                    let campaign = T.data.campaignsMap[c.basic.id];
                    if(!campaign.demo && campaign.status === 0 && !_.isEmpty(c.metrics)) {
                        postsCount += c.metrics.media_posted_count.value;
                    }
                }
            });
            KYB.tracker.trackEvent('View Campaigns', {
               'Post Count': postsCount
            });
        });
        this.feedbackInit();
    },
    dailySpendingsCalc: function() {
        if(!this.data.features.engagement) {return false;}
        var eng = this.data.features.engagement.data;
        if(!eng) {
            return false;
        }
        this.charts.data.daily_spendings = _.map(eng, function (e) {
            return {
                time: e.time,
                value: e.spendings,
                media_posted: e.media_posted
            };
        });
    },
    indexInit: function() {
        this.init();
        this.dailySpendingsCalc();

         // index
        var T = this;
        this.influencer.table.render();

        if(this.mediaList) {
            T.media.cache = [];
            T.media.init();
        }


        this.charts.render.all();
        this.initAddForms();
        this.feedbackInit();

        if(T.sidebar && window.innerHeight < document.body.scrollHeight) {
            setTimeout(function() {
                T.observer = new IntersectionObserver(function(entries) {
                    if(KYB.isOurIp) {
                        console.log(entries[0])
                    }
                    if(document.body.scrollHeight - window.innerHeight < entries[0].boundingClientRect.height/2) {
                        var r = 1;
                    } else {
                        var r = (window.innerHeight/2)/entries[0].boundingClientRect.height;
                        if(r > 1) {
                            r = 1
                        }
                        if(KYB.isOurIp) {
                            console.log('r', r)
                        }
                    }
                    if(entries[0].intersectionRatio >= r) {
                        T.sidebar.classList.add('-hide');
                    } else {
                        T.sidebar.classList.remove('-hide');
                    }
                }, {
                    threshold: [0,.1,.2,.3,.4,.5,1],
                    root: null
                });
                T.observer.observe(document.getElementById('hype-campaign--influencers-tabs'));

            }, 250);

            window.addEventListener('leave', function () {
                T.observer.disconnect();
            }, {once: true});
        }

        var clearFilter = function(e) {
            if(e.currentTarget.classList.contains('campaign-media-filtered') && !e.target.closest('.hype-sidebar-right') && !T.media.xhr) {
                T.media.filter();
            }
        };
        document.body.addEventListener('click', clearFilter);
        window.addEventListener('leave', function () {
            document.body.removeEventListener('click', clearFilter);
        })
    },
    report: {
        saveExcel: function() {
            let T = this;
            let url = '/campaignExport/?id='+hype.campaign.data.id;
            if(T.settings.hash) {
                document.location.href = url + '&report_id='+T.settings.hash;
            } else {
                T.save().then(function () {
                    document.location.href = url + '&report_id='+T.settings.hash;
                });
            }
        },
        savePdf: function(btn) {
            let T = this;
            var pdfHeader = true;
            if(T.currLink) {
                KYB.saveAsPDF('campaign', T.currLink, btn, '', pdfHeader);
            } else {
                T.save().then(function () {
                    KYB.saveAsPDF('campaign', T.currLink, btn, '', pdfHeader);
                });
            }
        },
        saved: true,
        init: function() {
            // refresh tpls
            KYB.template.tpls = {};
            hype.campaign.mediaList = false;
            hype.campaign.media.cache = [];

            var T = this;
            hype.campaign.isReport = true;
            hype.campaign.dailySpendingsCalc();
            setTimeout(function () {
                hype.campaign.charts.render.all();
            }, KYB.isPDF ? 300 : 100);
            hype.campaign.influencer.table.render();
            hype.contentNavigate(false, true);

            hype.dropmenuInit();

            KYB.imageLoader.add(document.querySelectorAll('.hype-campaign--report-media-img img'));




            if(this.isGuest) {
                return false;
            }

            var conf = this.settings;
            var switchs = document.querySelectorAll('.hype-campaign--report-collapsible-block-switch input');
            _.each(switchs, function (s) {
                s.addEventListener('change', function () {
                    var p = s.parentNode.parentNode.parentNode;
                    if(s.checked) {
                        p.classList.remove('collapsed');
                    } else {
                        p.classList.add('collapsed');
                    }
                    conf.elements[s.name].visible = s.checked;
                    T.save();

                });
            });

            var logoCN = 'hype-campaign--report-has-logo';
            this.logo = document.getElementById('hype-campaign--report-logo');
            var fileElem = document.getElementById('fileElem');
            if(fileElem) {
                fileElem.addEventListener('change', function () {
                    var reader = new FileReader();
                    T.logoFile = this.files[0];
                    reader.readAsDataURL(T.logoFile);
                    reader.onloadend = function() {
                        T.save();
                        T.logo.style.backgroundImage = 'url(' + reader.result + ')';
                        T.logo.parentNode.classList.add(logoCN);
                    };

                    KYB.tracker.trackEvent('Campaign Report Logo Upload', {
                        'Campaign id': hype.campaign.data.id,
                        platform: hype.campaign.data.type == 2 ? 'youtube' : 'instagram'
                    });
                });
            }
            var trash = this.logo.querySelector('.fa-trash-alt');
            if(trash) {
                trash.addEventListener('click', function () {
                    T.logoFile = '';
                    conf.logo = '';
                    T.logo.parentNode.classList.remove(logoCN);
                    T.save();
                });
            }

            this.textareas = document.getElementsByClassName('hype-campaign--report-comment-field');
            var textareaAutoSize = function(t) {
                t.rows = 1;
                t.rows = Math.ceil((t.scrollHeight - 20) / 20);;
            };
            _.each(this.textareas, function (t) {
                t.dataset.value = t.value;
                t.addEventListener('input', function () {
                    textareaAutoSize(t);
                    if(t.dataset.value != t.value) {
                        t.parentNode.classList.add('not-saved');
                    } else {
                        t.parentNode.classList.remove('not-saved');
                    }
                });
                textareaAutoSize(t);
            });
            this.saveCommentBtn = document.getElementsByClassName('hype-campaign--report-comment-btn');
            _.each(this.saveCommentBtn, function (t) {
                t.addEventListener('click', function () {
                    T.save().then(function () {
                        t.parentNode.classList.remove('not-saved');
                    });
                });
                textareaAutoSize(t);
            });
        },
        save: function () {
            var T = this;
            _.each(this.textareas, function (t) {
                //if(t.value) {
                    if(t.name == 'global') {
                        T.settings.comment = t.value;
                    } else if(t.name == 'media_comments') {
                        if(_.isEmpty(T.settings.elements[t.name])) {
                            T.settings.elements[t.name] = {};
                        }
                        T.settings.elements[t.name][t.dataset.id] = t.value;
                    } else {
                        T.settings.elements[t.name].comment = t.value;
                    }
                //}
            });
            return KYB.sendForm(KYB.baseUrl+'ajax/saveCampaignReport', {
                logo: T.logoFile,
                id: hype.campaign.data.id,
                config: this.settings
            }).then(function (resp) {
                //T.saved = true;
                if(!resp.success) {
                    KYB.notify(__('Something went wrong'), 'danger');
                    hype.campaign.errLog('cant save report');
                } else {
                    KYB.notify('Report saved', 'light');
                    document.getElementById('hype-campaign--report-share-link').value = resp.config.link;
                    T.settings.hash = resp.config.hash;
                    T.currLink = resp.config.link;
                }
            });

        },
        share: function () {
            if(!hype.campaign.data.hash) {
                this.save();
            }
            document.getElementById('hype-campaign--report-share-popup').classList.add('show');
            KYB.tracker.trackEvent('Share Campaign Report', {
                'Campaign id': hype.campaign.data.id,
                url: this.currLink,
                platform: hype.campaign.data.type == 2 ? 'youtube' : 'instagram'
            });
        },
        logoRequest: function () {
            KYB.requestDemoPopup('Campaign tracking logo report', {
                title: __('White-label campaign reports'),
                textarea: __('I need to add my logo to campaign reports'),
                btn: __('Request'),
                source: 'web request campaign tracking'
            });
        }
    },
    charts: {
        config: {
            basic: {
                chart: {
                    margin: [50, 60, 40, 60],
                    height: 280,
                    zoomType: 'x'
                },
                legend: {
                    squareSymbol: false,
                    useHTML: true,
                    symbolWidth: 0,
                    itemDistance: 30,
                    verticalAlign: 'top',
                    itemStyle: {fontFamily:'',fontWeight:'',fontSize:'',fill:'',margin:'',color:''},
                    labelFormatter: function(a) {
                        return '<i class="hype-campaign--graph-legend-symbol" style="background-color:'+(this.color?this.color:'#FF6436')+'"></i>' + this.name;
                    }
                }
            },
            y1: {
                title: {
                    align: 'low',
                    style: {color: '#FF6436', fontWeight: 600},
                    offset: 8
                },
                lineWidth: 1,
                showFirstLabel: false,
                showLastLabel: false,
                gridLineWidth: 0,
                labels: {
                    distance: 0,
                    padding: 0,
                    reserveSpace: false,
                    useHTML: true,
                    x: -7,
                    formatter: function() {
                        return KYB.numberFormat(this.value,2);
                    },
                    style: {
                        fontFamily: '',
                        fontSize: '12px',
                        color: '#FF6436'
                    }
                },
                minPadding: 0,
                endOnTick: true,
                startOnTick: true
            },
            y2: {
                lineWidth: 1,
                title: {
                    align: 'high',
                    style: {color: '#039BE5', fontWeight: 600},
                    offset: 8
                },
                labels: {
                    distance: 0,
                    padding: 0,
                    reserveSpace: false,
                    useHTML: true,
                    x: 7,
                    formatter: function() {
                        return KYB.numberFormat(this.value,1);
                    },
                    style: {
                        fontFamily: '',
                        fontSize: '12px',
                        color: '#039BE5'
                    }
                },
                gridLineWidth: 0,
                opposite: true,
                showFirstLabel: false,
                showLastLabel: false,
                minPadding: 0,
                endOnTick: true,
                startOnTick: true
            }
        },
        render: {
            all: function() {
                if(KYB.isPDF) {
                    let c = hype.campaign.charts.config.basic.chart;
                    c.width = 1300;
                    c.height = 600;
                }
                this.posted();
                this.audience();
                if(hype.campaign.data.type == 2) {
                    this.engagement_yt();
                } else {
                    this.engagement();
                }
                this.spend();
            },
            audience: function () {
                var T = hype.campaign.charts;
                var audienceGraph = document.getElementById('hype-campaign--graph-audience');
                if(!audienceGraph) {return false;}
                Highcharts.chart(audienceGraph, {
                    chart: {
                        plotBackgroundColor: null,
                        plotBorderWidth: null,
                        plotShadow: false,
                        type: 'pie',
                        spacing: [0, 0, 0, 0],
                        margin: [0, 0, 0, 0],
                        width: 102,
                        height: 102
                    },
                    title: false,
                    tooltip: false,
                    series: [{
                        enableMouseTracking: false,
                        animation: false,
                        innerSize: '33.333%',
                        slicedOffset: 1,
                        dataLabels: false,
                        labels: false,
                        data: T.data.audience
                    }]
                });
            },
            posted: function () {
                var T = hype.campaign.charts;
                var postedGraph = document.getElementById('hype-campaign--graph-posted');
                if(!postedGraph) {return false;}
                var total_eng = hype.campaign.data.features.engagement.data;
                if(!total_eng.length) {return false;}
                var likesDataEst = _.where(total_eng, {is_estimate: true});
                var daily_spendings = [];
                _.each(T.data.daily_spendings, function (e) {
                    let stories = e.media_posted.filter(m => {return m.basic.media_type});
                    if(e.media_posted.length) {
                        daily_spendings.push({
                            x: moment.utc(e.time).valueOf(),
                            y: e.value,
                            posts: e.media_posted,
                            stories: stories
                        });
                    }
                });
                var postedGraphY1 = _.extend({}, T.config.y1);
                var postedGraphY2 = _.extend({}, T.config.y2);

                if(hype.campaign.data.type == 2) {
                    postedGraphY1.title.text = __('Total views');
                    var dataY1 = _.map(total_eng, function (e) {
                        return [moment(e.time).valueOf(), e.views_count];
                    });
                } else {
                    postedGraphY1.title.text = __('Total engagements');
                    var dataY1 = _.map(total_eng, function (e) {
                        return [moment(e.time).valueOf(), e.likes_count+e.comments_count];
                    });
                }
                postedGraphY2.title.text = __('Money spent');

                var dataY1LastVal = dataY1[dataY1.length-1][1];
                var dataY1MaxVal = _.max(dataY1, function (d) {
                    return d[1];
                });
                postedGraphY1.plotLines = [{
                    value: dataY1LastVal,
                    dashStyle: 'dash',
                    width: 1,
                    color: 'rgba(255,100,54,0.4)'
                }];
                postedGraphY1.tickPositions = [0,dataY1LastVal,dataY1MaxVal[1]*1.05];

                var dataY2MaxVal = _.max(T.data.daily_spendings, function (d) {
                    return d.value;
                });
                postedGraphY2.max = dataY2MaxVal.value*2;
                postedGraphY2.plotLines = [{
                    value: dataY2MaxVal.value,
                    dashStyle: 'dash',
                    width: 1,
                    color: 'rgba(3,155,229,0.4)'
                }];
                postedGraphY2.tickPositions = [0,dataY2MaxVal.value,dataY2MaxVal.value*2];

                let n = hype.campaign.data.type == 2 ? __('Total views') : __('Total engagements');
                var postedGraphData = _.extend({}, T.config.basic, {
                    yAxis: [postedGraphY1, postedGraphY2],
                    series: [{
                        tooltip_pre: n+'<br>',
                        name: n,
                        animation: false,
                        type: 'spline',
                        data: dataY1,
                        color: '#FF6436',
                        stickyTracking: false

                    }, {
                        name: __('Daily spendings'),
                        color: '#039BE5',
                        tooltip_unit: '$',
                        crisp: false,
                        borderWidth: 0,
                        borderRadius: 2.5,
                        maxPointWidth: 3,
                        animation: false,
                        minPointLength: 5,
                        type: 'column',
                        yAxis: 1,
                        data: daily_spendings,
                        tooltip: {
                            distance: 30,
                            pointFormatter: function () {
                                console.log('pointFormatter', this.stories.length)
                                return KYB.template.render({
                                    template: 'hypeCampaignPostedGraphTtipTpl'
                                }, {
                                    x: this.x,
                                    y: this.y,
                                    posts: this.posts.length,
                                    stories: this.stories.length
                                });
                            }
                        },
                        events: {
                            click: function (e) {
                                if(hype.campaign.mediaList) {
                                    hype.campaign.media.filter(e.point.x/1000, 'date', false, moment(e.point.x).format('MMM D'));
                                }
                            }
                        },
                        dataLabels: {
                            padding: 0,
                            enabled: true,
                            verticalAlign: 'top',
                            y: -22,
                            useHTML: true,
                            inside: true,
                            formatter: function () {
                                return '<div class="hype-campaign--graph-column-label">'+this.point.posts.length+'</div>'
                            }
                        },
                        stickyTracking: false
                    }]
                });
                if(likesDataEst.length > 1) {
                    postedGraphData.series[0].zoneAxis = 'x';
                    postedGraphData.series[0].zones = [{
                        value: 0
                    }, {
                        value: dataY1[likesDataEst.length][0],
                        dashStyle: 'ShortDash'
                    }];
                }
                hype.graph.render(postedGraph, postedGraphData);
            },
            engagement: function () {
                var T = hype.campaign.charts;
                var engagementGraph = document.getElementById('hype-campaign--graph-engagement');
                if(!engagementGraph) {return false;}

                var total_eng = hype.campaign.data.features.engagement.data;
                if(!total_eng.length) {return false;}
                var total_eng_data = _.map(total_eng, function (e) {
                    return [moment(e.time).valueOf(), e.likes_count+e.comments_count];
                });
                var likesDataEst = _.where(total_eng, {is_estimate: true});

                var engGraphY1 = _.extend({}, T.config.y1);
                var engGraphY2 = _.extend({}, T.config.y2);

                engGraphY1.title.text = __('Total likes');
                engGraphY1.title.style.color = '#86939E';
                engGraphY1.labels.style.color = '#86939E';
                engGraphY2.title.text = __('Total comments');
                engGraphY2.title.style.color = '#BBCBD8';
                engGraphY2.labels.style.color = '#BBCBD8';

                var likes_count_data = _.map(total_eng, function (e, i) {
                    return [moment(e.time).valueOf(), e.likes_count];
                });
                var comments_count_data = _.map(total_eng, function (e, i) {
                    return [moment(e.time).valueOf(), e.comments_count];
                });

                var graphEngDataLastVal1 = likes_count_data[likes_count_data.length-1][1];
                engGraphY1.plotLines = [{
                    value: graphEngDataLastVal1,
                    dashStyle: 'dash',
                    width: 1,
                    color: 'rgba(134,147,158,0.4)'
                }];
                var graphEngDataMaxVal1 = _.max(likes_count_data, function (d) {
                    return d[1];
                });
                engGraphY1.tickPositions = [0, graphEngDataLastVal1, graphEngDataMaxVal1[1]*1.05];

                var graphEngDataLastVal2 = comments_count_data[comments_count_data.length-1][1];
                engGraphY2.plotLines = [{
                    value: graphEngDataLastVal2,
                    dashStyle: 'dash',
                    width: 1,
                    color: 'rgba(187,203,216,0.4)'
                }];
                var graphEngDataMaxVal2 = _.max(comments_count_data, function (d) {
                    return d[1];
                });
                engGraphY2.tickPositions = [0, graphEngDataLastVal2, graphEngDataMaxVal2[1]*2];

                var graphEngData = _.extend({}, T.config.basic, {
                    yAxis: [engGraphY1, engGraphY2],
                    series: [
                        {
                            type: 'spline',
                            color: '#86939E',
                            tooltip_pre: __('Total likes')+'<br>',
                            name: __('Total likes'),
                            data: likes_count_data,
                            stickyTracking: false,
                            animation: false,
                        },
                        {
                            type: 'spline',
                            color: '#BBCBD8',
                            tooltip_pre: __('Total comments')+'<br>',
                            name: __('Total comments'),
                            data: comments_count_data,
                            yAxis: 1,
                            stickyTracking: false,
                            animation: false,
                        },
                        {
                            type: 'spline',
                            color: '#FF6436',
                            tooltip_pre: __('Total engagements')+'<br>',
                            name: __('Total engagements'),
                            data: total_eng_data,
                            stickyTracking: false,
                            visible: false,
                            animation: false,
                        }
                    ]
                });

                if(likesDataEst.length > 1) {
                    graphEngData.series[0].zoneAxis = 'x';
                    graphEngData.series[0].zones = [{
                        value: 0
                    }, {
                        value: likes_count_data[likesDataEst.length][0],
                        dashStyle: 'ShortDash'
                    }];
                    graphEngData.series[1].zoneAxis = 'x';
                    graphEngData.series[1].zones = [{
                        value: 0
                    }, {
                        value: comments_count_data[likesDataEst.length][0],
                        dashStyle: 'ShortDash'
                    }];
                    graphEngData.series[2].zoneAxis = 'x';
                    graphEngData.series[2].zones = [{
                        value: 0
                    }, {
                        value: total_eng_data[likesDataEst.length][0],
                        dashStyle: 'ShortDash'
                    }];
                }

                hype.graph.render(engagementGraph, graphEngData);
            },
            engagement_yt: function () {
                var T = hype.campaign.charts;
                var engagementGraph = document.getElementById('hype-campaign--graph-engagement');
                if(!engagementGraph) {return false;}

                var total_eng = hype.campaign.data.features.engagement.data;
                if(!total_eng.length) {return false;}
                var likesDataEst = _.where(total_eng, {is_estimate: true});

                var engGraphY1 = _.extend({}, T.config.y1);
                var engGraphY2 = _.extend({}, T.config.y2);
                engGraphY1.title.text = __('Total comments');
                engGraphY1.title.style.color = '#FF6436';
                engGraphY1.labels.style.color = '#FF6436';
                engGraphY2.title.text = __('Votes');
                engGraphY2.title.style.color = '#BBCBD8';
                engGraphY2.labels.style.color = '#BBCBD8';

                var likes_count_data = _.map(total_eng, function (e, i) {
                    return [moment(e.time).valueOf(), e.likes_count];
                });
                var dislikes_count_data = _.map(total_eng, function (e, i) {
                    return [moment(e.time).valueOf(), e.dislikes_count];
                });
                var comments_count_data = _.map(total_eng, function (e, i) {
                    return [moment(e.time).valueOf(), e.comments_count];
                });

                var graphEngDataLastVal1 = comments_count_data[comments_count_data.length-1][1];
                engGraphY1.plotLines = [{
                    value: graphEngDataLastVal1,
                    dashStyle: 'dash',
                    width: 1,
                    color: 'rgba(255,100,54,0.4)'
                }];
                var graphEngDataMaxVal1 = _.max(comments_count_data, function (d) {
                    return d[1];
                });
                engGraphY1.tickPositions = [0, graphEngDataLastVal1, graphEngDataMaxVal1[1]*1.05];

                var graphEngDataLastVal2 = likes_count_data[likes_count_data.length-1][1];
                engGraphY2.plotLines = [{
                    value: graphEngDataLastVal2,
                    dashStyle: 'dash',
                    width: 1,
                    color: 'rgba(187,203,216,0.4)'
                }];
                var graphEngDataMaxVal2 = _.max(likes_count_data, function (d) {
                    return d[1];
                });
                engGraphY2.tickPositions = [0, graphEngDataLastVal2, graphEngDataMaxVal2[1]*2];

                var graphEngData = _.extend({}, T.config.basic, {
                    yAxis: [engGraphY1, engGraphY2],
                    series: [
                        {
                            type: 'spline',
                            color: '#FF6436',
                            name: __('Total comments'),
                            data: comments_count_data,
                            stickyTracking: false,
                            animation: false,
                        },
                        {
                            type: 'spline',
                            color: '#86939E',
                            name: __('Total upvotes'),
                            data: likes_count_data,
                            yAxis: 1,
                            stickyTracking: false,
                            animation: false,
                        },
                        {
                            type: 'spline',
                            color: '#BBCBD8',
                            name: __('Total downvotes'),
                            data: dislikes_count_data,
                            yAxis: 1,
                            stickyTracking: false,
                            animation: false,
                        }
                    ]
                });

                if(likesDataEst.length > 1) {
                    graphEngData.series[0].zoneAxis = 'x';
                    graphEngData.series[0].zones = [{
                        value: 0
                    }, {
                        value: likes_count_data[likesDataEst.length][0],
                        dashStyle: 'ShortDash'
                    }];
                    graphEngData.series[1].zoneAxis = 'x';
                    graphEngData.series[1].zones = [{
                        value: 0
                    }, {
                        value: comments_count_data[likesDataEst.length][0],
                        dashStyle: 'ShortDash'
                    }];
                    graphEngData.series[2].zoneAxis = 'x';
                    graphEngData.series[2].zones = [{
                        value: 0
                    }, {
                        value: dislikes_count_data[likesDataEst.length][0],
                        dashStyle: 'ShortDash'
                    }];
                }

                hype.graph.render(engagementGraph, graphEngData);
            },
            spend: function () {
                var T = hype.campaign.charts;
                var spendingsGraph = document.getElementById('hype-campaign--graph-spendings');
                if(!spendingsGraph) {return false;}

                var spendings = T.data.daily_spendings;
                if(!spendings.length) {return false;}
                var spendingsPrev = 0;
                var spendings_data = _.map(spendings, function (t) {
                    spendingsPrev += t.value;
                    return [moment(t.time).valueOf(), spendingsPrev];
                });
                var media_posted = [];
                _.each(spendings, function (t) {
                    if(t.media_posted.length) {
                        _.each(t.media_posted, function (post) {
                            if(post.basic.platform == 2) {
                                media_posted.push({
                                    x: moment(post.basic.time_post).valueOf(),
                                    y: post.metrics.cpm.value,
                                    z: post.metrics.engagements_count.value,
                                    id: post.basic.media_id
                                });
                            } else {
                                if(post.basic.media_type != 'story') {
                                    media_posted.push({
                                        x: moment(post.basic.time_post).valueOf(),
                                        y: post.metrics.cpe.value,
                                        z: post.metrics.comments_count.value+post.metrics.likes_count.value,
                                        id: post.basic.media_id
                                    });
                                }
                            }
                        });
                    }
                });
                var spnGraphY1 = _.extend({}, T.config.y1);
                var spnGraphY2 = _.extend({}, T.config.y2);

                spnGraphY1.title.style.color = '#FF6436';
                spnGraphY1.labels.style.color = '#FF6436';

                if(hype.campaign.data.type == 2) {
                    spnGraphY1.title.text = __('CPM');
                    var avgCP = hype.campaign.data.metrics.cpm.value;
                } else {
                    spnGraphY1.title.text = __('Post CPE');
                    var avgCP = hype.campaign.data.metrics.cpe.value;
                }


                spnGraphY1.plotLines = [{
                    value: avgCP,
                    dashStyle: 'dash',
                    width: 1,
                    color: 'rgba(255,100,54,0.4)'
                }];
                let maxCP = _.max(media_posted, function (m) {
                    return m.y;
                });
                spnGraphY1.tickPositions = [0,avgCP,maxCP.y*1.05];

                spnGraphY2.title.text = __('Money spent');
                spnGraphY2.title.style.color = '#039BE5';
                spnGraphY2.labels.style.color = '#039BE5';
                var graphSpnDataLastVal1 = spendings_data[spendings_data.length-1][1];
                spnGraphY2.plotLines = [{
                    value: graphSpnDataLastVal1,
                    dashStyle: 'dash',
                    width: 1,
                    color: 'rgba(3,155,229,0.4)'
                }];
                spnGraphY2.tickPositions = [0,graphSpnDataLastVal1,graphSpnDataLastVal1*2];

                var graphSpnData = _.extend({}, T.config.basic, {
                    yAxis: [spnGraphY1, spnGraphY2],
                    series: [
                        {
                            type: 'bubble',
                            color: '#FF6436',
                            name: hype.campaign.data.type == 2 ? __('CPM') : __('Post CPE'),
                            data: media_posted,
                            stickyTracking: false,
                            animation: false,
                            zIndex: 2,
                            events: {
                                click: function () {
                                    var h = this.halo;
                                    if(h.xhr) {return false;}
                                    var cn = 'highcharts-halo-preload';
                                    h.element.classList.add(cn);
                                    // todo check if story
                                    h.xhr = hype.campaign.media.detailsPopup(false, h.point.id).then(function () {
                                        h.element.classList.remove(cn);
                                        h.xhr = false;
                                    });
                                },
                                mouseOut: function () {
                                    if(chart.xhr) {
                                        chart.xhr.abort();
                                    }
                                }
                            },
                            tooltip: {
                                pointFormatter: function () {
                                    if(!KYB.user) {
                                        return __('Click to view post');
                                    }
                                    if(chart.xhr) {
                                        chart.xhr.abort();
                                    }
                                    var point = this;
                                    var media = hype.campaign.media.find(this.id);
                                    if(!media.then) {
                                        media.features.blogger = hype.campaign.data.features.influencers.data[media.basic.platform==2?media.basic.channel_id:media.basic.user_id];
                                        return KYB.template.render({
                                            template: 'hypeCampaignMediaGraphTtipTpl'
                                        }, {
                                            x: this.x,
                                            y: this.y,
                                            z: this.z,
                                            media: media
                                        });
                                    } else {
                                        chart.xhr = media.then(function () {
                                            chart.xhr = false;
                                            chart.tooltip.refresh(point);
                                        });
                                        return '<div class="preloader"></div>';
                                    }
                                }
                            }
                        },
                        {
                            type: 'spline',
                            color: '#039BE5',
                            name: __('Money spent'),
                            data: spendings_data,
                            tooltip_unit: '$',
                            yAxis: 1,
                            dashStyle: 'dash',
                            stickyTracking: false,
                            animation: false,
                        }
                    ],
                });
                graphSpnData.chart.scrollablePlotArea = false;
                var chart = hype.graph.render(spendingsGraph, graphSpnData);
            }
        }
    },
    sidebarToggle: function () {
        var cn = 'expanded';
        if(this.sidebarExpanded) {
            this.sidebar.classList.remove(cn);
            this.sidebarExpanded = false;
        } else {
            this.media.imageLoader();
            this.sidebar.classList.add(cn);
            this.sidebarExpanded = true;
        }
    },
    errLog: function (text) {
        KYB.tracker.trackEvent('Campaign Tracking Error', {
            'Page Id': KYB.pageId,
            'error': text,
            url: document.location.href,
            platform: hype.campaign.data.type == 2 ? 'youtube' : 'instagram'
        });
    },
    sort: {
        init: function() {
            var T = this;
            var th = document.getElementsByClassName('kyb-table-sort-th');
            _.each(th, function (t) {
                T.addEvent(t);
            });
        },
        clearSort: function() {
            let cn = 'kyb-table-sort-th--';
            Array.prototype.forEach.call(document.querySelectorAll('.kyb-table-sort-th'), (el) => {
                el.classList.remove(cn+'asc',cn+'desc');
                el.dataset.sort = '';
            });
        },
        addEvent: function(el) {
            let T = this;
            el.addEventListener('click', function (e) {
                let t = e.currentTarget;
                let d = t.dataset;
                let sort = d.sort;
                sort = !sort ? 'desc' : sort === 'desc' ? 'asc' : '';
                let cn = 'kyb-table-sort-th--';
                T.clearSort();
                d.sort = sort;
                if(sort) {
                    T.by(d.sortType, sort);
                    el.classList.add(cn+sort);
                } else {
                    hype.campaign.influencer.table.sortData = null;
                    hype.campaign.influencer.table.renderBody();
                }
            });
        },
        setSort: function (type, sort) {
            let cn = 'kyb-table-sort-th--';
            let el = document.querySelector(`[data-sort-type=${type}]`);
            el.classList.add(cn+sort);
            el.dataset.sort = sort;
        },
        filtered: function (type, sign) {
            var dataCase = {};
            if (type === 'aqs') {
                dataCase.filter = function (item) {return item.features && item.features[type].data.value};
                dataCase.empty = function (item) {return !item.features || !item.features[type]};
                dataCase.sort = function (item) {return sign * item.features[type].data.value};
            } else if (type === 'stories') {
                dataCase.filter = function (item) {return hype.campaign.data.storiesCountByChannels[item.basic.id]};
                dataCase.empty = function (item) {return !hype.campaign.data.storiesCountByChannels[item.basic.id]};
                dataCase.sort = function (item) {return sign * hype.campaign.data.storiesCountByChannels[item.basic.id];};
            } else if (type.indexOf('custom') >= 0) {
                var customId = parseInt(type.split('-')[1]);
                dataCase.filter = function (item) {return item.user_column && item.user_column[customId]};
                dataCase.empty = function (item) {return !item.user_column || typeof(item.user_column[customId]) === 'undefined'};
                if ( this.customString(customId) ) {
                    dataCase.sort = function (item) {return item.user_column[customId]};
                } else {
                    dataCase.sort = function (item) {return sign * parseInt(item.user_column[customId])};
                }
            } else {
                dataCase.filter = function (item) {return item.metrics[type] && typeof(item.metrics[type].value) !== 'undefined'};
                dataCase.empty = function (item) {return typeof(item.metrics[type].value) === 'undefined'};
                dataCase.sort = function (item) {return sign * item.metrics[type].value};
            }
            return dataCase;
        },
        customString: function (id) {
            return Object.values(hype.campaign.data.columnsData).filter(function (item) {return item[id] && /\D/.test(item[id])}).length;
        },
        by: function (type, sort) {
            let sign = sort === 'desc' ? -1 : 1;
            var sortData;
            var inflData = hype.campaign.influencer.table.unSortData ? hype.campaign.influencer.table.unSortData : hype.campaign.data.features.influencers.data;
            if (type === 'username') {
                sortData = _.sortBy(inflData, (item) => {
                    return item.basic.username;
                });
                if (sign > 0) {
                    sortData = sortData.reverse();
                }
            } else {
                var filterData, EmptyData;
                filterData = Object.values(inflData).filter(this.filtered(type, sign).filter);
                EmptyData = Object.values(inflData).filter(this.filtered(type, sign).empty);
                sortData = _.sortBy(filterData, this.filtered(type, sign).sort);
                if ((type.indexOf('custom') >= 0) && this.customString(parseInt(type.split('-')[1])) && (sign > 0)) {
                    sortData = sortData.reverse();
                }
                sortData = sortData.concat(EmptyData);
            }
            hype.campaign.influencer.table.sortData = sortData;

            hype.campaign.influencer.table.renderBody({data: hype.campaign.influencer.table.sortData});
        }
    }
};
hype.campaignCreator = {
    init: function (options) {
        var T = this;

        this.campaign = '';
        this.brand = '';

        this.dateStart = '';
        this.campaignId = options.campaignId || 0;
        this.options = options;

        this.startPath = 'https://' + KYB.domain + KYB.baseUrl + (!PRODUCTION ? 'app/' : '');

        this.container = document.getElementById('hype-campaign-creator');
        this.stepsContainer = this.container.querySelector('.js-hype-steps');
        this.startDate = this.container.querySelector('.js-start-date');
        this.brandInput = this.container.querySelector('.js-hype-brand');
        this.startBtn = this.container.querySelector('.js-campaign-list');
        this.startContent = this.container.querySelector('.js-hype-start-content');
        this.step1Btn = this.container.querySelector('.js-hype-step-btn-1');
        this.step2Btn = this.container.querySelector('.js-hype-step-btn-2');
        this.step3Btn = this.container.querySelector('.js-hype-step-btn-3');

        this.mentiones = [];
        this.mentioneTemplate = document.getElementById('mentione-template').innerHTML;
        this.mentionesList = this.container.querySelector('.js-mentiones-list');

        this.influencerInput = this.container.querySelector('.js-hype-influencers');
        this.influencersList = this.container.querySelector('.js-influencers-list');
        this.showMoreInfluencers = this.influencersList.querySelector('.js-show-more');
        this.showMoreTexEl = this.showMoreInfluencers.querySelector('span');

        this.parseUrlParams();

        this.campaign = options.campaign || this.urlparams.campaign || '';
        this.currentStep = options.step || this.urlparams.step || 0;

        if (this.currentStep) {
            this.stepsContainer.classList.remove('hype-layout_start');
            this.stepsContainer.classList.add(`hype-layout_${this.campaign}`);
            hype.steps.init(this.stepsContainer, +this.currentStep);
        }

        this.bulkInput = this.container.querySelector('.js-hype-influencers-bulk');

        if (this.campaign === 'youtube') {
            this.bulkInput.setAttribute('placeholder', __('Write or copy multiple Youtube channel links, one per line'));
        }

        if(options.brand && this.urlparams.campaign === 'instagram') {
            let mention = {
                type: 'account',
                campaign: this.campaign,
                data: {
                    avatar_url: options.brand.ava,
                    username: options.brand.username
                },
                brand: true,
                id: options.brand.id
            };
            T.renderMention(mention);
        }

        if(options.mentions) {
            _.each(options.mentions, (item) => {
                var mention = {
                    type: item.type === 1 ? 'account' : T.campaign === 'instagram' ? 'hashtag' : 'keywords',
                    campaign: this.campaign,
                    data: {
                        avatar_url: item.ava,
                        username: item.value
                    },
                    id: item.id
                };
                T.renderMention(mention);
            });
        }

        if(options.influencers) {
            _.each(options.influencers, (item) => {
                var influencer = {
                    type: 'influencer',
                    data: {
                        avatar_url: item.ava,
                        username: item.value
                    },
                    campaign: this.campaign,
                    id: item.id,
                    extraClass: 'thing-container--two-col',
                };
                T.renderInfluencer(influencer);
            });
        }

        this.startBtn.addEventListener('click', (e) => {
            let el = e.target;
            if (!el.classList.contains('hype-campaign__item') || el.classList.contains('hype-campaign__item_disabled')) {
                return false;
            }

            el.classList.add('hype-campaign__item_checked');
            this.campaign = el.dataset.campaign;
            setTimeout((e) => {
                T.redirectToStep(2);
            }, 15);
        });

        let start = moment().subtract(30, 'days');
        this.picker = new Lightpick({
            field: this.startDate,
            numberOfMonths: 1,
            minDate: start,
            startDate: start,
            format: 'MMM D, YYYY',
            singleDate: true,
            hoveringTooltip: false,
            dropdowns: {
                years: {
                    min: 2015,
                    max: null,
                },
                months: true,
            },
            locale: {
                buttons: {
                    prev: '<i class="far fa-chevron-left">&#xf053;</i>',
                    next: '<i class="far fa-chevron-right">&#xf054;</i>',
                }
            },
            onSelect: function(date) {
                T.dateStartTimeStamp = date._i;
                T.dateStart = date.format('MMM D, YYYY');
                hype.steps.validate(T.validators.step1, T.container, T.step1Btn, T.step1Btn);
            }
        });

        let type = this.campaign === 'instagram' ? 1: 2;
        let hideRecent = this.campaign === 'youtube';
        let brandPlaceholder = type === 1 ? __('Enter Instagram username') : __('Enter name');
        let brandSuggester = KYB.channelsSuggest.init(this.brandInput, {
            inputClass: 'hype-input',
            action: false,
            type: type,
            hideRecent: hideRecent,
            placeholder: brandPlaceholder,
            hideSearch: type === 2,
            onSubmit: function (data, suggester) {
                T.brand = data.username;

                hype.steps.validate(T.validators.step1, T.container, T.step1Btn, T.step1Btn);
            },
            onInput: (e, data) => {
                if (e.target.value.length > 0) {
                    T.step1Btn.classList.remove('button-disabled');
                    T.step1Btn.removeAttribute('disabled', 'disabled');
                } else {
                    T.step1Btn.classList.add('button-disabled');
                    T.step1Btn.setAttribute('disabled', 'disabled');
                }
            }
        });
        if(options.brand) {
            brandSuggester.input.value = options.brand.username;
            T.step1Btn.classList.remove('button-disabled');
            T.step1Btn.removeAttribute('disabled', 'disabled');
        }

        this.mentionesSuggesterInit();

        let placeholder = type === 1 ? __('Enter Instagram username') : __('Enter YouTube channel name or copy link');
        let usernameParamField = type === 1 ? 'username' : 'channel_id';
        KYB.channelsSuggest.init(this.influencerInput, {
            inputClass: 'hype-input',
            action: 'ajax/addToCampaign',
            type: type,
            hideRecent: hideRecent,
            btnText: '<i class="far fa-plus">&#xf067;</i> ' + __('Add'),
            placeholder: placeholder,
            usernameParamName: 'username',
            usernameParamField: usernameParamField,
            params: {
                campaign_id: T.campaignId
            },
            onSubmit: function (resp) {
                if(resp.added) {
                    _.each(resp.map, (data, index) => {
                        T.renderInfluencer({
                            type: 'influencer',
                            campaign: T.campaign,
                            data: {
                                avatar_url: data.ava,
                                username: type === 1 ? index : data.name
                            },
                            id: data.id,
                            extraClass: 'thing-container--two-col'
                        });
                    });
                }
                setTimeout(function () {
                    if(resp.added_as_brand) {
                        let err = T.influencerInput.querySelector('.kyb-error');
                        if(err) {
                            err.insertAdjacentHTML('afterbegin', '<strong>'+__('Add influencers who will mention {s} in their post.', {s: (type === 1 ? '@': '') + brandSuggester.input.value})+'</strong> ');
                            err.classList.add('added_as_brand')
                        }
                    }
                });

                if(resp.limit_reached) {
                    T.influencer.limitPopup();
                }
            }
        });

        // show more influencers
        this.showMoreTexEl.innerHTML = this.getShowMoreLabel();
        this.showMoreInfluencers.addEventListener('click', function (e) {
            T.influencersList.classList.toggle('active');
            T.showMoreTexEl.innerHTML = T.getShowMoreLabel();
        }, true);

        KYB.pageId = 'Auditor.CreateCampaign';
        var eventName = 'View Create Campaign';
        var step = parseInt(options.step);
        if(step == 2) {
            KYB.pageId += 'Brand';
            eventName += ' Brand';
        } else if(step == 3) {
            KYB.pageId += 'Mentions';
            eventName += ' Mentions';
            if (options.date_start) {
                var curDate = new Date(parseInt(options.date_start.split('-')[0]), parseInt(options.date_start.split('-')[1]) - 1, parseInt(options.date_start.split('-')[2]));
                this.picker.setDate(curDate);
            }
        } else if(step == 4) {
            KYB.pageId += 'Influencers';
            eventName += ' Influencers';
        }
        KYB.tracker.trackEvent(eventName, {
            platform: type == 2 ? 'youtube' : 'instagram'
        });

        if(step == 4) {
            let el = document.querySelector('.'+(type == 2 ? 'yt' : 'ig')+'-only .js-hype-mentions-list');
            let m = [];
            if(type == 1) {
                m.push('<strong>@'+this.options.brand.username+'</strong>');
            }
            _.each(this.options.mentions, function (item) {
                m.push('<strong>'+(item.type == 1 ? '@' : (item.type == 2 ? '#' : ''))+item.value+'</strong>');
            });
            if(m.length > 1) {
                el.innerHTML = m.slice(0,-1).join(', ')+(m.length > 2 ? ',' : '')+' and '+m.slice(-1);
            } else {
                el.innerHTML = m[0];
            }
        }
    },
    mentionesSuggesterInit: function()
    {
        var T = this;
        var sendVal = false;
        let type = this.campaign === 'instagram' ? 1: 2;
        let suggestSettings = {
            keywords: false,
            placeholder: __('Enter #hashtag or @username'),
        };
        if (type === 2) {
            suggestSettings.el = this.container.querySelector('.js-add-keywords');
            suggestSettings.keywords = true;
            suggestSettings.placeholder = __('Enter phrase to search in video name or description');
        } else {
            suggestSettings.el = this.container.querySelector('.js-add-mentioned');
        }
        var mentionedSuggester = KYB.channelsSuggest.init(suggestSettings.el, {
            inputClass: 'hype-input',
            action: false,
            hideRecent: true,
            placeholder: suggestSettings.placeholder,
            type: type,
            keywords: suggestSettings.keywords,
            hideSearch: type === 2,
            btnText: '<i class="far fa-plus">&#xf067;</i> ' + __('Add'),
            onSubmit: function (data, suggester) {
                suggester.form.classList.add('preload');
                if(sendVal == suggester.input.value) {
                    return false;
                }
                sendVal = suggester.input.value;
                if(suggester.input.value[0] == '#' && suggester.input.value.length < 2) {
                    return false;
                }
                if(lastMentionVal[0] == '@' && suggester.input.value[0] != '@') {
                    suggester.input.value = '@'+suggester.input.value;
                }

                hype.campaign.mention.add(T.campaignId, suggester.input.value).then(function(response) {
                    suggester.form.classList.remove('preload');
                    sendVal = false;

                    if(!response.success) {
                        KYB.notify(response.error, 'danger');
                        hype.campaign.errLog(response.error);
                        return;
                    }

                    suggester.input.value = '';
                    T.renderMention({
                        type: response.type === 1 ? 'account' : T.campaign === 'instagram' ? 'hashtag' : 'keywords',
                        campaign: T.campaign,
                        data: {
                            username: response.name,
                            avatar_url: response.ava || ''
                        },
                        id: response.id
                    });
                });
            }
        });

        var focusCN = 'kyb-search-bar--form-focus';
        var lastMentionVal = '';
        mentionedSuggester.input.addEventListener('input', function (e) {
            lastMentionVal = mentionedSuggester.input.value.trim();
            if(lastMentionVal[0] != '@') {
                clearTimeout(mentionedSuggester.reqT);
                mentionedSuggester.form.classList.remove('preload');
                mentionedSuggester.wrap.classList.remove(focusCN);
            } else {
                mentionedSuggester.wrap.classList.add(focusCN);
            }
        });
    },
    initEditor: function(options) {
        var T = this;
        this.container = document.querySelector('.js-hype-campaign-editor');
        this.mentioneTemplate = document.getElementById('mentione-template').innerHTML;
        this.mentionesList = this.container.querySelector('.js-mentiones-list');
        this.form = this.container.querySelector('.js-form');
        this.campaignId = options.id;
        this.campaign = options.campaign;

        this.mentionesSuggesterInit();

        if(options.brand) {
            var mention = {
                type: 'account',
                brand: true,
                campaign: this.campaign || 'instagram',
                data: {
                    avatar_url: options.brand.ava,
                    username: options.brand.username
                },
                id: options.brand.id
            };
            T.renderMention(mention);
        }

        if(options.mentions) {
            _.each(options.mentions, (item) => {
                var mention = {
                    type: item.type === 1 ? 'account' : 'hashtag',
                    campaign: this.campaign || 'instagram',
                    data: {
                        avatar_url: item.ava,
                        username: item.value
                    },
                    id: item.id
                };
                T.renderMention(mention);
            });
        }

        this.form.addEventListener('submit', function (evt) {
            evt.preventDefault();
            T.saveCampaign();
        })
    },
    saveCampaign: function() {
        var T = this;
        var form = new FormData(T.form);
        let status = hype.campaign.data.status;
        let p = {
            campaign_id: form.get('campaign_id'),
            name: form.get('name'),
            notify: form.get('notify'),
            currency: form.get('currency')
        };
        let formStatus = parseInt(form.get('status'));
        if(formStatus != status) {
            p.status = form.get('status');
        }
        KYB.post(KYB.baseUrl + 'ajax/editCampaign/', p).then(function (resp) {
            if(resp.success) {
                KYB.notify(__('Campaign settings saved'), 'success');
                return;
            } else {
                if(resp.limit_reached) {
                    let p = {
                        title: __('Track more campaigns'),
                        btn: __('Request'),
                        source: 'web request campaign tracking'
                    };
                    if(status == 2) {
                        // draft
                        p.title = __('Request a call to start tracking campaigns');
                    } else {
                        p.textarea = __('I need to track more campaigns');
                    }
                    KYB.requestDemoPopup('Campaign tracking campaigns limit', p);

                } else {
                    KYB.notify(resp.error, 'danger');
                    hype.campaign.errLog(resp.error);
                }
            }
        });
    },
    redirectToStep: function(step) {
        var url = this.startPath + 'campaign/new/?step=' + step + '&campaignId=' + this.campaignId+ '&campaign=' + this.campaign;
        hype.router.navigate(url, true);
    },
    create: function() {
        var T = this;
        if(!this.brand) {
            this.brand = this.brandInput.querySelector('.hype-input').value.trim();
        }
        T.step1Btn.classList.add('button-preload');
        var dateStart;
        var __addLeadZero = function (num) {
            return num >= 10 ? num : `0${num}`;
        };

        if (T.dateStart) {
            dateStart = new Date(T.dateStartTimeStamp)
        } else {
            dateStart = new Date();
        }
        let params = {
            brand: T.brand,
            date_start: `${dateStart.getFullYear()}-${__addLeadZero(dateStart.getMonth() + 1)}-${__addLeadZero(dateStart.getDate())}`,
            type: this.campaign === 'instagram' ? 1 : 2
        };
        KYB.get(KYB.baseUrl + 'ajax/createCampaign/', params).then(function (response) {
            if(!response.success) {
                KYB.notify(response.error, 'danger');
                hype.campaign.errLog(response.error);
                return;
            }

            T.campaignId = response.campaignId;
            history.replaceState({page: 2}, "step 2", T.startPath + 'campaign/new/?step=2&campaignId=' + T.campaignId+ '&campaign=' + T.campaign);
            T.redirectToStep(3);
            T.step1Btn.classList.remove('button-preload');
            // hype.steps.activate(2);
        });
    },
    submitMentions: function() {
        this.redirectToStep(4);
    },
    finish: function() {
        let T = this;
        let go = function () {
            hype.router.navigate(T.startPath + 'campaign/' + T.campaignId + '/?start=1', true);
        };

        if(T.options.show_request) {
            let popup = hype.campaign.requestDemo(__('Request a call to start tracking campaigns'));
            popup.$el.addEventListener('popup_close', go, {once: true});
        } else {
            go();
        }
    },
    renderMention: function(mention) {
        var html = _.template(this.mentioneTemplate)(mention);
        var mentione = document.createElement('div');
        mentione.classList.add('thing-container');
        mentione.innerHTML = html;

        this.mentionesList.appendChild(mentione);

        hype.steps.validate(this.validators.step2, this.container, this.step2Btn);
    },
    deleteMention: function(el) {
        var T = this;
        var thing = el.parentElement;

        hype.campaign.mention.remove(this.campaignId, thing.dataset.id).then(function (response) {
            if(!response.success) {
                KYB.notify(response.error, 'danger');
                hype.campaign.errLog(response.error);
                return;
            }

            thing.classList.remove('thing--active');
            setTimeout(function () {
                thing.parentElement.parentElement.removeChild(thing.parentElement);
                hype.steps.validate(T.validators.step2, T.container, T.step2Btn);
            }, 300);
        });
    },
    renderInfluencer: function(data) {
        var T = this;
        var html = _.template(this.mentioneTemplate)(data);
        var influencer = document.createElement('div');

        influencer.classList.add('thing-container');
        if(data.extraClass) {
            influencer.classList.add(data.extraClass);
        }
        influencer.innerHTML = html;

        this.influencersList.insertBefore(influencer, this.showMoreInfluencers);

        if(this.influencersList.querySelectorAll('.thing-container').length - 1 > 7) {
            this.showMoreInfluencers.style.display = 'inline-block';
        } else {
            this.showMoreInfluencers.style.display = 'none';
        }

        hype.steps.validate(this.validators.step3, this.container, this.step3Btn);

        this.showMoreTexEl.innerHTML = this.getShowMoreLabel();

    },
    deleteInfluencer: function(el) {
        var T = this;
        var thing = el.parentElement;

        hype.campaign.influencer.remove(this.campaignId, thing.dataset.id, function (response) {
            if(!response.success) {
                KYB.notify(response.error, 'danger');
                hype.campaign.errLog(response.error);
                return;
            }

            thing.classList.remove('thing--active');
            setTimeout(function () {
                thing.parentElement.parentElement.removeChild(thing.parentElement);
                hype.steps.validate(T.validators.step3, T.container, T.step3Btn);

                T.showMoreTexEl.innerHTML = T.getShowMoreLabel();
            }, 300);
        });
    },
    getShowMoreLabel: function() {
        var numberToShow = this.influencersList.querySelectorAll('.thing-container').length - 1 - 7;
        var textLabel = this.showMoreInfluencers.querySelector('span');

        if(this.influencersList.classList.contains('active')) {
            textLabel = __('Show less');
        } else {
            textLabel = __n('And 1 other', 'And {n} others', numberToShow, {n: numberToShow});
        }

        return textLabel;
    },
    bulkAddShow: function(el) {
        var T = this;
        el.classList.toggle('active');

        var button = this.container.querySelector('.js-hype-influencers button');
        var formInput = this.container.querySelector('.js-hype-influencers .hype-channels-suggest--form-fields');
        var textarea = this.container.querySelector('.js-hype-influencers-bulk');

        if(el.classList.contains('active')) {
            textarea.addEventListener('input', this.bulkInputHandler);
            button.addEventListener('click', this.bulkAddHandler);
            this.bulkInput.style.display = 'block';
            setTimeout(function () {
                T.bulkInput.classList.add('active');
                formInput.classList.add('active');
            }, 1);
        } else {
            textarea.removeEventListener('input', this.bulkInputHandler);
            button.removeEventListener('click', this.bulkAddHandler);
            this.bulkInput.classList.remove('active');
            formInput.classList.remove('active');
            setTimeout(function () {
                T.bulkInput.style.display = 'none';
            }, 200);
        }
    },
    bulkInputHandler: function (event) {
        var button = document.querySelector('.js-hype-influencers button');
        if (event.target.value.length > 0) {
            button.classList.remove('button-disabled');
            button.removeAttribute('disabled', 'disabled');
        }  else {
            button.classList.add('button-disabled');
            button.setAttribute('disabled', 'disabled');
        }
    },
    bulkAddHandler: function(event) {
      event.preventDefault();
      var content = document.getElementById('hype-influencers-bulk').value.trim();
      if(content.length) {
          hype.campaignCreator.bulkAdd(content);
      }
    },
    bulkAdd: function(content) {
        var T = this;
        var textarea = this.container.querySelector('.js-hype-influencers-bulk');
        var button = this.container.querySelector('.js-hype-influencers button');
        textarea.disabled = true;
        button.classList.add('button-preload');
        hype.campaign.influencer.add(this.campaignId, content, 1).then(function(response) {
            textarea.disabled = false;

            if (response.errors.length) {
                var errorMsg = '';

                var errors = response.errors.slice(0, 2);
                _.each(errors, function (error) {
                    errorMsg += error + '<br>';
                });

                if(response.errors.length > 3) {
                    errorMsg += '... and ' + (response.errors.length - 3) + ' more';
                }

                KYB.notify(errorMsg, 'danger');
                hype.campaign.errLog(errorMsg);
                //return;
            } else {
                textarea.value = '';
            }
            _.each(response.map, (item, index) =>{
                T.renderInfluencer({
                    type: 'influencer',
                    campaign: T.campaign,
                    data: {
                        avatar_url: item.ava,
                        username: T.campaign === 'youtube' ? item.name : index
                    },
                    id: item.id,
                    extraClass: 'thing-container--two-col',
                });
            });
            button.classList.remove('button-preload');
        });
    },
    validators: {
        // простые правила валидации
        step1: function (container, button) {
            if (container.querySelector('.js-hype-brand .hype-input').value.length
                && container.querySelector('.js-start-date').value.length
            ) {
                return true;
            } else {
                return false;
            }
        },
        step2: function (container, button) {
            return container.querySelector('.js-mentiones-list').children.length !== 0;
        },
        step3: function (container, button) {
            return container.querySelector('.js-influencers-list').children.length !== 0;
        }
    },
    parseUrlParams: function() {
        let urlparams = _.reduce(location.search.slice(1, location.search.length).split("&"), (function(memo, item) {
            let pair = item.split("=");
            if (pair.length === 2) {
                memo[pair[0]] = decodeURIComponent(pair[1]);
            }
            return memo;
        }), {});
        this.urlparams = urlparams;
    }

};
