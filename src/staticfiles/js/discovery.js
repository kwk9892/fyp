KYB.discovery = {
    fields: {
        get: function(name, value) {
            var fields = KYB.discovery.filters.querySelectorAll('[name="'+name+'"]');
            if(!fields.length) {return false}
            if(fields.length > 1) {
                if(value) {
                    return _.find(fields, function (f) {
                        if(f.value == value) {
                            return true;
                        }
                    });
                } else {
                    return Array.prototype.slice.call(fields);
                }
            } else {
                return fields[0];
            }
        },
        setValue: function(field, value, silent) {
            if(field.type == 'select-multiple') {
                if(!value || !value.length) {
                    // unset
                    field.value = '';
                } else {
                    if(!_.isArray(value)) {
                        value = [value];
                    }
                    _.each(field.options, function (o) {
                        if(_.indexOf(value, o.value) >= 0) {
                            o.selected = true;
                        } else {
                            o.selected = false;
                        }
                    });
                }
            } else if(field.type == 'radio' || field.type == 'checkbox') {
                if(value) {
                    field.checked = true;
                } else {
                    field.checked = false;
                }
            } else {
                field.value = typeof(value)!='undefined'?value:'';
            }
            this.trigger(field, false, {silent: silent});
        },
        getValue: function(field) {
            var value;
            if(field.type == 'select-multiple') {
                value = this.getMultiValue(field);
            } else {
                if(Number(field.value)) {
                    value = parseFloat(field.value);
                } else {
                    value = field.value;
                }
            }
            return value;
        },
        getMultiValue: function(field) {
            var value;
            _.each(field.options, function (o) {
                if(o.selected) {
                    if(!value) {
                        value = [];
                    }
                    value.push(o.value);
                }
            });
            return value;
        },
        getRootName: function (str) {
            if(!str) {return false}
            var spt = str.split('[');
            return spt[1] ? spt[1].split(']')[0] : false;
        },
        getLastName: function(str) {
            return str ? _.last(str.split('[')).slice(0, -1) : false;
        },
        trigger: function (field, event, eventData) {
            if(!event) {
                var event = 'change';
            }
            if (typeof(CustomEvent)!='undefined') {
                var event = new CustomEvent(event, {
                    detail: eventData
                });
                field.dispatchEvent(event);
            }
            else {
                field.fireEvent('on'+event);
            }
        },
        multi: {
            init: function(selects) {
                var P = KYB.discovery;
                var f = function () {
                    // highlight selected value

                    var fields = P.filters.querySelectorAll('[data-group-name="'+P.fields.getRootName(selects[0].name)+'"]');
                    fields = _.filter(fields, function (f) {
                        if(f.dataset.uniqvalue) {
                            return true;
                        }
                    });
                    var selectedVals = [];
                    _.map(fields, function (f) {
                        if(f.value) {
                            selectedVals.push(f.value);
                        }
                    });
                    _.each(fields, function (f) {
                        _.each(f.customField.getElementsByClassName('select-option'), function (s) {
                            if(s.dataset.value) {
                                if(_.indexOf(selectedVals, s.dataset.value) < 0) {
                                    s.classList.remove('disable');
                                } else {
                                    s.classList.add('disable');
                                }
                            }
                        });
                    });
                };
                f();
                _.each(selects, function (s) {
                    s.addEventListener('change', function (e) {
                        if(s.dataset.uniqvalue) {
                            f();
                        }
                        P.backgroundSearch(e);
                    });
                });
            },
            add: function (name, index) {
                var T = this;
                var wrap = document.getElementById('discovery-filters--'+name+'-wrap');

                if(typeof(index) == 'undefined') {
                    var index = this.count(name);
                }
                if(document.getElementById(name+'_'+index)) {
                    return false;
                }
                var tpl = KYB.template.render({
                    template: 'multiFieldTpl'
                }, {
                    name: name,
                    index: index
                });
                var frag = document.createRange().createContextualFragment(tpl);
                KYB.customFields.init(frag);
                var selects = frag.querySelectorAll('select');
                var close = frag.querySelector('.fa-times');

                var autocompleteField = frag.querySelector('.discovery-autocomplete-field');
                if(autocompleteField) {
                    KYB.discovery.locationAutocomplete.init(autocompleteField);
                }

                var condField = frag.querySelector('#'+name+'_'+index);
                wrap.appendChild(frag);

                if(selects.length) {
                    this.init(selects);
                }

                if(name == 'audience_location' || name == 'ig_audience_races') {
                    //condField.dataset.defaultCond = 10;
                    KYB.discovery.defaultCondFieldInit(condField);
                    condField.addEventListener('change', function (e) {
                        KYB.discovery.backgroundSearch(e);
                    });
                }

                if(close && condField) {
                    close.addEventListener('click', function () {
                        if(index) {
                            T.remove(condField);
                        } else {
                            KYB.discovery.fields.setValue(condField);
                        }
                    });
                }
                if(index >= 2) {
                    condField.parentNode.parentNode.classList.add('limit-fields');
                }
                return selects;
            },
            remove: function (field) {
                KYB.discovery.fields.setValue(field);
                field.parentNode.parentNode.classList.remove('limit-fields');
                field.parentNode.remove();
            },
            count: function (name) {
                return KYB.discovery.filters.querySelectorAll('[data-group-name="'+name+'"]').length;
            }
        },
        clear: function (silent) {
            var T = KYB.discovery;
            _.each(T.filters.querySelectorAll('[name]'), function (field) {
                T.fields.setValue(field, '', silent);
            });
        },
        clearUnavailable: function () {
            var T = KYB.discovery;
            _.each(T.filters.querySelectorAll('[name]'), function (field) {
                var params = T.filterParams[T.fields.getRootName(field.name)];
                if(params && params.unavailable) {
                    T.fields.setValue(field, false, true);
                }
            });
        }
    },
    serialize: function() {
        //console.time('serialize');
        var fields = this.filters.querySelectorAll('[name]');
        var data = {};
        var T = this;
        _.each(fields, function (field) {
            //console.log(field.name, field.type);
            if(!field.value || (field.type == 'radio' && !field.checked) || (field.type == 'checkbox' && !field.checked)) {
                return false;
            }

            var rootName = T.fields.getRootName(field.name);
            var onlyFor = T.filterParams[rootName]['only_for'];

            if(onlyFor && T.st && onlyFor.split(',').indexOf(T.st)<0) {
                return false;
            }
            if(field.dataset.dependent) {
                var dependentField = T.filters.querySelectorAll(field.dataset.dependent);
                var dependentFieldVal = _.filter(dependentField, function (f) {
                    if(f.value) {
                        return true;
                    }
                });
                if(!dependentFieldVal.length) {
                    return false;
                }
            }

            value = T.fields.getValue(field);

            if(typeof(value) == 'undefined') {
                return false;
            }
            var name = field.name;
            if(data[name] && _.isArray(data[name])) {
                data[name].push(value);
            } else {
                data[name] = name.substr(-2) == '[]' ? [value] : value;
            }
        });
        //console.timeEnd('serialize');
        this.serializeData = data;
        return data;
    },
    applyParamsToFields: function(name, data) {
        var T = this;
        var rootName = T.fields.getRootName(name);
        if(rootName) {
            var field = T.fields.get(name);
            if(T.filterParams[rootName] && T.filterParams[rootName].multi) {
                if(_.isArray(data)) {
                    for(var i=(field ? (_.isArray(field) ? field.length : 1) : 0); i<data.length; i++) {
                        this.fields.multi.add(rootName);
                    }
                } else if(!field) {
                    this.fields.multi.add(rootName);
                }
            }
            if(rootName == 'keywords') {
                T.keywords.data = data;
                T.backgroundSearch();
            } else {
                field = T.fields.get(name);
                if(!field) {
                    return false;
                }
                if(_.isArray(field)) {
                    // radio or checkbox (same names)
                    if(field[0].type == 'radio') {
                        field = _.findWhere(field, {value: data+""});
                        T.fields.setValue(field, data);
                    } else {
                        _.each(field, function (f, i) {
                            T.fields.setValue(f, _.isArray(data) ? data[i] : data);
                        });
                    }
                } else {
                    T.fields.setValue(field, data);
                }
            }
        }
    },
    parseUrlParams: function() {
        var T = this;
        this.searchParams = new URLSearchParams(window.location.search);
        for(var pair of this.searchParams.entries()) {
            var name = pair[0];
            try {
                var data = JSON.parse(pair[1]);
                if(name == 'sort') {
                    T.sort.params = data;
                } else if(name == 'search[st]') {
                    if(data != 'ig') {
                        T.filterTabChange(data);
                    }
                } else {
                    T.applyParamsToFields(name, data);
                }
            } catch(e) {
                if(KYB.isOurIp) {
                    console.error(e);
                }
            }
        }
    },
    st: 'ig',
    filterTabChange: function(st) {
        var T = this;
        var cn = 'discovery-tab--menu-active';
        T.filterTabMenu.querySelector('.'+cn).classList.remove(cn);
        T.filterTabMenu.querySelector('[data-st="'+st+'"]').classList.add(cn);
        T.filters.setAttribute('class', (T.filtersCollapsed?'collapse ':'')+'discovery-filters--'+st);
        T.st = st;
        T.type = st === 'ig' ? 1 : st === 'yt' ? 2 : 3;

        // set lock start
        var influencerFilters = document.querySelector('#discovery-filters--influencer').querySelectorAll('.discovery-filters--form-fields');
        var audienceFilters = document.querySelector('#discovery-filters--audience').querySelectorAll('.discovery-filters--form-fields');

        _.each(influencerFilters, function (field) {
            var label = field.querySelector('label');
            var input = field.querySelector('[name]');
            var rootName = T.fields.getRootName(input.name);
            if (KYB.discovery.avalible.indexOf(T.type) > -1 && KYB.discovery.filterParams[rootName].unavailable) {
                label.classList.remove('discovery-filters--form-fields--title')
                label.classList.add('discovery-filters--form-fields--title-lock')
                label.innerHTML = `<i class="fas fa-lock">&#xf023;</i> ${KYB.discovery.filterParams[rootName].name}`
            } else {
                label.classList.remove('discovery-filters--form-fields--title-lock')
                label.classList.add('discovery-filters--form-fields--title')
                label.innerHTML = `<i class="ico ${KYB.discovery.filterParams[rootName].ico}"></i> ${KYB.discovery.filterParams[rootName].name}`
            }
        });

        _.each(audienceFilters, function (field) {
            var label = field.querySelector('label');
            var input = field.querySelector('[name]');
            var rootName = T.fields.getRootName(input.name);
            if (!rootName) {
                return false;
            }
            if (KYB.discovery.avalible.indexOf(T.type) > -1 && KYB.discovery.filterParams[rootName].unavailable) {
                label.classList.remove('discovery-filters--form-fields--title')
                label.classList.add('discovery-filters--form-fields--title-lock')
                label.innerHTML = `<i class="fas fa-lock">&#xf023;</i> ${KYB.discovery.filterParams[rootName].name}`
            } else {
                label.classList.remove('discovery-filters--form-fields--title-lock')
                label.classList.add('discovery-filters--form-fields--title')
                label.innerHTML = `<i class="ico ${KYB.discovery.filterParams[rootName].ico}"></i> ${KYB.discovery.filterParams[rootName].name}`
            }
        });
        // set lock end

        // TODO tmp
        var location = document.getElementById('influencer_location_autocomplete');
        if(st != 'ig') {
            T.keywords.input.placeholder = __('Search by keyword, channel, location and more');
            location.placeholder = __('Country');

            _.each(T.filtersForm.querySelectorAll('[data-group-name="audience_location"]'), function(i) {
                i.placeholder = 'Country';
            });
        } else {
            T.keywords.input.placeholder = __('Search by keyword, category, location and more');
            location.placeholder = 'Country, city or state';
            _.each(T.filtersForm.querySelectorAll('[data-group-name="audience_location"]'), function(i) {
                i.placeholder = __('Country, city or state');
            });
        }

        T.keywords.suggest.gc();

        T.lastSearchResult = false;
        T.submit();
    },
    filtersCollapsed: true,
    filtersInit: function() {
        var T = this;
        this.filters.addEventListener('submit', function (e) {
            e.preventDefault();

            if(T.keywords.input.value) {
                T.keywords.add(T.keywords.input.value);
                T.keywords.input.value = '';
            }
            if(T.mentions.input.value) {
                T.mentions.add(T.mentions.input.value);
                T.mentions.input.value = '';
            }
            T.submit();
            if(!T.filtersCollapsed) {
                window.scroll(0,0);
                T.collapseFilters();
            }
            KYB.tracker.trackEvent('Page Action', {
                target: 'Discovery Apply Filter btn'
            });
        });
        document.getElementById('discovery-filters--search-btn').addEventListener('click', function (e) {
            e.stopPropagation();
        });

        document.getElementById('discovery-filters--list-wrap').addEventListener('click', function () {
            T.keywords.input.focus();
        });

        this.filterTabMenu = document.getElementById('discovery-filters--menu');
        if(this.filterTabMenu) {

            this.filterTabMenu.addEventListener('click', function (e) {
                if(e.target.tagName == 'LI') {
                    T.filterTabChange(e.target.dataset.st);
                    e.stopPropagation();
                    T.dropdownSelect.hide({target: T.keywords.input});
                }
            });
        }



        if(!this.fields.multi.count('audience_location')) {
            this.fields.multi.add('audience_location', 0);
        }

        KYB.discovery.locationAutocomplete.init(document.getElementById('influencer_location_autocomplete'));


        if(!this.fields.multi.count('ig_audience_races')) {
            this.fields.multi.add('ig_audience_races', 0);
        }

/*
        _.each(this.filters.querySelectorAll('.field-select'), function (select) {
            if(select.type == 'select-multiple') {
                select.addEventListener('change', function (e) {
                    var value = T.fields.getMultiValue(select);
                    if(value) {
                        var title = value.length > 1 ? (value.length+__(' selected')) : select.querySelector('[value="'+value+'"]').innerHTML;
                    }
                    select.customField.querySelector('.select-title').innerHTML = title?title:__('Any');
                });
            }
        });
*/
        document.querySelectorAll('.discovery-filters--similar--input').forEach(similarInput => {
            let similarInputH = similarInput.previousElementSibling;
            let name = T.fields.getRootName(similarInputH.name)
            let param = KYB.discovery.filterParams[name];
            let type = name == 'ig_similar' ? 1 : 2;
            // TODO всегда должен быть выбран первый элемент
            var similarSuggest = KYB.channelsSuggest.init(similarInput, {
                type: type,
                action: false,
                hideRecent: true,
                onSubmit: function (data) {
                    let id = type == 1 ? data.username : data.channel_id;
                    if(id) {
                        param.list[id] = type == 1 ? data.username : data.full_name;
                        similarInputH.value = id;
                        similarInput.focus();
                        T.backgroundSearch();
                    }
                }
            });
            similarInputH.addEventListener('change', function (e) {
                similarInput.value = e.target.value ? param.list[e.target.value] : '';
            });
            similarInput.addEventListener('keypress', function (e) {
                var code = e.keyCode || e.which;
                if (code == 13) {
                    similarSuggest.onSubmit(e);
                }
            });
        });

        _.each(this.filters.querySelectorAll('[data-default-cond]'), this.defaultCondFieldInit.bind(this));



        _.each(document.querySelectorAll('.kyb-tooltip-target, #discovery-brand-mentions--field-label, .discovery-followers-growth--field-label'), function (el) {
            var p = {
                el: el,
                content: el.title
            };
            App.tooltip(p);
            el.title = '';
        });
    },
    filterLabels: function() {
        this.filtersLabelText = [];
        this.filtersList.innerHTML = '';
        var T = this;
        var groupData = {};
        _.each(this.serializeData, function (filter, name) {
            var sName = name.split('[');
            var prev = groupData;
            if(_.last(sName) == ']') {
                sName = _.initial(sName);
            }
            _.each(sName, function (s, i) {
                var n = s.replace(']', '');
                if(!prev[n]) {
                    prev[n] = i<(sName.length-1) ? {} : {
                        field: T.fields.get(name),
                        value: filter
                    };
                }
                prev = prev[n];
            });
        });

        _.each(groupData, function (group) {
            _.each(group, function (filter, name) {
                if(name == 'audience_location' || name == 'ig_audience_races') {
                    _.each(filter, function (f) {
                        T.addFilterLabel(f, name);
                    });
                } else {
                    //if(_.isArray(filter.value) && (_.isArray(filter.field) || name == 'influencer_category')) {
                    if(_.isArray(filter.value) && name != 'mentioned' && name != 'not_mentioned') {
                        _.each(filter.value, function (v, n) {
                            T.addFilterLabel({
                                field: filter.field,
                                value: v
                            }, name);
                        });
                    } else {
                        T.addFilterLabel(filter, name);
                    }
                }
            });
        });
        if(this.keywords.data.length) {
            _.each(this.keywords.data, function (k) {
                T.addFilterLabel({
                    value: k
                }, 'keywords');
            });
        }
        /*if(this.mentions.data.length) {
            T.addFilterLabel({
                value: this.mentions.data.join(', ')
            }, 'mentioned');
        }*/
    },
    getAgeRangeText: function(value) {
        var text = ' ';
        var lastAge = false;
        var firstAge = false;
        _.each(KYB.ageGroups, function (a, index) {
            var isSelected = _.indexOf(value, index) >= 0;
            if(isSelected) {
                var ages = a.split('–');
                lastAge = ages.length > 1 ? ages[1] : ages[0];
                if(!firstAge && ages.length > 1) {
                    firstAge = ages[0];
                }
            }
            if(!isSelected || index == 8) {
                if(lastAge) {
                    text += (text != ' ' ? ', ': '')+(firstAge?firstAge+'–':'')+lastAge;
                    firstAge = false;
                    lastAge = false;
                }
            }
        });
        return text;
    },
    addFilterLabel: function(filter, name) {
        var T = this;
        var param = this.filterParams[name];
        if(!param) {return false;}
        var text = ' ';
        var fields = [];
        if(name == 'is_personal' || name == 'has_contacts') {
            text += param.name;
            fields.push(filter.field);
        } else if(name == 'mentioned' || name == 'not_mentioned') {
            var d = _.map(T.mentions.data, function (m) {
                return '@'+m;
            });
            text += d.join(', ');
        } else {
            if(!filter.value) {
                if(typeof(filter.id)!='undefined') {
                    text += param.list[filter.id.value];
                    if(_.isArray(filter.id.field)) {
                        var field = _.findWhere(filter.id.field, {value: filter.id.value+''});
                        fields.push(field);
                        var dependentId = field.id;
                    } else {
                        fields.push(filter.id.field);
                    }
                } else if(param.name) {
                    if(name == 'aqs' && T.st == 'yt') {
                        text += __('CQS')+':';
                    } else {
                        text += param.name+':';
                    }
                }
                if(param.list && filter.from && !filter.id && param.list[filter.from.value]) {
                    text += ' '+param.list[filter.from.value];

                } else {
                    if(filter.from && filter.to) {
                        text += ' '+KYB.numberFormat(filter.from.value)+'–'+KYB.numberFormat(filter.to.value);
                    } else {
                        if(filter.from && filter.from.value > 0) {
                            text += ' >'+KYB.numberFormat(filter.from.value);
                        } else if(filter.to && filter.to.value > 0) {
                            text += ' <'+KYB.numberFormat(filter.to.value);
                        }
                    }
                }

                if(filter.p) {
                    text += ' >'+filter.p.value+'%';
                }

                if(filter.from) {
                    if(_.isArray(filter.from.field) && dependentId) {

                    } else {
                        fields.push(filter.from.field);
                    }
                }
                if(filter.to) {
                    fields.push(filter.to.field);
                }

            } else {
                if(param.list) {
                    text += param.list[filter.value];
                } else {
                    text += filter.value;
                }
                if(filter.field) {
                    if(_.isArray(filter.field)) {
                        fields.push(_.findWhere(filter.field, {value: filter.value}));
                    } else {
                        fields.push(filter.field);
                    }
                }
            }
        }

        if(param.unit) {
            text += param.unit;
        }
        if(filter.period) {
            text += ' '+filter.period.value+' days';
        }
        if(param.pre) {
            if(name == 'mentioned') {
                text = param.pre+' '+text;
            } else {
                text = param.pre+': '+text;
            }
        }

        var li = document.createElement('li');
        var ico = document.createElement('i');
        var close = document.createElement('i');

        li.setAttribute('class', 'discovery-filters--item discovery-filters--item-'+name+(param.unavailable?' discovery-filters--item-unavailable':''));
        ico.setAttribute('class', 'ico '+param.ico);
        close.setAttribute('class', 'far fa-times');

        close.innerHTML = '\uf00d';

        li.innerHTML = text;
        T.filtersLabelText.push(text);


        li.insertBefore(ico, li.firstChild);
        li.insertBefore(close, ico);

        close.addEventListener('click', function (e) {
            if(fields) {
                _.each(fields, function (field) {
                    var value = '';
                    if(name == 'influencer_category') {
                        value = _.without(T.serializeData[field.name], filter.value);
                    }
                    if(_.isArray(field)) {
                        _.each(field, function (f) {
                            T.fields.setValue(f, value);
                        });
                    } else {
                        T.fields.setValue(field, value);
                    }
                });
            }
            if(name == 'keywords') {
                T.keywords.remove(filter.value);
            }
            if(name == 'mentioned' || name == 'not_mentioned') {
                T.mentions.removeAll();
            }

            if(T.filtersCollapsed) {
                e.stopPropagation();
                T.submit();
            } else {
                li.remove();
            }
            KYB.tracker.trackEvent('Page Action', {
                target: 'Discovery filter label remove',
                type: name
            });
        });
        this.filtersList.appendChild(li);
    },
    onpopstate: function() {
        KYB.discovery.fields.clear(true);//todo удалять кейворды и сортировку
        KYB.discovery.parseUrlParams();
        KYB.discovery.submit(true);
    },
    gc: function() {
        document.removeEventListener('scroll', this.scrollEvent);
        window.removeEventListener('popstate', this.onpopstate, false);
        if(this.backgroundXHR) {
            this.backgroundXHR.abort();
        }
        if(this.xhr) {
            this.xhr.abort();
        }
    },
    init: function () {
        var T = this;
        this.filters = document.getElementById('discovery-filters');
        this.filtersForm = document.getElementById('discovery-filters--form');
        this.filtersList = document.getElementById('discovery-filters--list');
        this.resultsTable = document.getElementById('discovery-results--table');
        this.results = document.getElementById('discovery-results--table-result');
        this.resultsWrap = document.getElementById('discovery-results');
        this.resultsTotalWrap = document.getElementById('discovery-results--total');
        this.resultsTotal = document.getElementById('discovery-results--total-count');
        this.pageElement = document.getElementById('discovery-page');
        this.totalHeaderBtn = document.querySelector('.js-search-total-header');
        this.totalBtn = document.querySelector('.js-search-total');
        this.filtersWrap = document.querySelector('.js-discovery-filters-wrap')

        KYB.customFields.init();

        this.filters.addEventListener('click', function(e) {
            if(T.filtersCollapsed) {
                T.expandFilters();
                KYB.tracker.trackEvent('Page Action', {
                    target: 'Discovery filters expand'
                });
            }
        });
        document.getElementById('discovery-filters--title').addEventListener('click', function (e) {
            if(!T.filtersCollapsed) {
                e.stopPropagation();
                T.collapseFilters();
            }
        });

        this.mentions.init();

        this.keywords.init();

        this.filtersInit();

        this.parseUrlParams();

        var formFields = this.filters.querySelectorAll('[name]');
        _.each(formFields, function (field) {
            var rootName = T.fields.getRootName(field.name);
            if(rootName) {
                var onlyFor = T.filterParams[rootName]['only_for'];

                if(onlyFor) {
                    let cn = 'discovery-filters--form-fields';
                    let el = field.closest('.'+cn);
                    _.each(onlyFor.split(','), function (o) {
                        el.classList.add(cn+'-'+o);
                    });
                }

                field.addEventListener('change', function (e) {
                    T.backgroundSearch(e);
                });
            }
        });

        this.columns.init();
        this.scrollInit();
        this.submit();
        this.filtersCollapsed = true;

        window.addEventListener('popstate', T.onpopstate, false);

        KYB.trackUserAction.init('.discovery-report-link');

        this.exportBtn = document.getElementById('discovery-results--total-export');
        if(this.exportBtn) {
            this.exportBtn.addEventListener('click',function () {
                //var p = _.clone(T.serializeData);
                var p = T.getParams();
                p.export = 1;
                var addSlash = '';
                if (window.location.pathname.endsWith('/') == false) {
                    addSlash = '/';
                }
                window.open(window.location.protocol + "//" + window.location.host + window.location.pathname + addSlash + 'ajax/?' + KYB.param(p), '_blank');
            });
        }

        if(this.discoveryConfirmFlag && (KYB.user.tokens + KYB.user.free_reports > 0)) {
             this.results.addEventListener('click', function (e) {
                if(KYB.discovery.st != 'ig') {
                    return false;
                }
                if(e.target.tagName == 'A') {
                    var target = e.target;
                } else if(e.target.parentNode.tagName == 'A') {
                    var target = e.target.parentNode;
                }
                if(!target || !target.classList.contains('discovery-report-link') || parseInt(target.dataset.ispaid)) {
                    return false;
                }
                var C = arguments.callee;
                KYB.popup.show({
                    html: '<h3>'+__('Confirm')+'</h3><p>'+__('You will unlock the report for 1 credit')+'</p><label><input type="checkbox" class="checkbox-input">'+__('Don’t warn again')+'</label><br><br><div class="button" id="discovery-confirm-btn">'+__('Proceed')+'</div><div onclick="KYB.popup.allHide();" class="button button-outline button-gray">'+__('Cancel')+'</div>',
                    cssClass: 'confirm-popup discovery-confirm-popup',
                    onOpen: function (t) {
                        var btn = t.$content.querySelector('#discovery-confirm-btn');
                        btn.addEventListener('click', function () {
                            if(t.$content.querySelector('input').checked) {
                                Cookies.set('discoveryConfirm', 1, { expires: 2*365, path: '/' });
                                KYB.discovery.results.removeEventListener('click', C);
                            }
                            //btn.classList.add('button-preload');
                            KYB.tracker.trackEvent('Page Action', {
                                'Page Id': KYB.pageId,
                                'target': 'View discovery report'
                            });
                            window.open(target.getAttribute('href'), '_blank');
                            t.hide();
                        });
                    }
                });
                e.preventDefault();
            });
        }

        KYB.tracker.pageLoad({}, 'View Discovery');
    },
    defaultCondFieldInit: function(field) {
        var T = this;
        var condField = document.getElementById(field.dataset.defaultCondId);
        var fieldChange = function(e) {
            //if((e.target.type == 'radio' && !e.target.checked) || !e.target.value) {
            if(!e.target.value) {
                let fields = T.filters.querySelectorAll('[data-default-cond-id="'+field.dataset.defaultCondId+'"]');
                if(!_.filter(fields, f => f.value).length) {
                    condField.value = '';
                    T.fields.trigger(condField);
                }
            } else {
                if(!condField.value) {
                    /*if(field.type == 'radio') {
                        _.each(T.filters.querySelectorAll('[name="'+condField.name+'"]'), function (f) {
                            if(f != condField) {
                                f.value = '';
                                T.fields.trigger(f);
                            }
                        });
                    }*/
                    condField.value = e.target.dataset.defaultCond;
                    T.fields.trigger(condField);
                }
            }
        };
        field.addEventListener('change', fieldChange);
        condField.addEventListener('change', function (e) {
            if(!e.target.value) {
                /*if(field.type == 'radio') {
                    setTimeout(function () {
                        field.checked = false;
                    });
                } else */
                if(field.value) {
                    field.value = '';
                    T.fields.trigger(field);
                }
            }
        });
    },
    addMultiFieldsWrap: function(filterName) {
        let currCount = this.fields.multi.count(filterName);
        if(currCount >= 3) {
            KYB.notify('Limit fields', 'warning');
            return false;
        }
        let index = 0;
        if(currCount) {
            for(let i = 0; i < 3; i++) {
                if(!document.getElementById(filterName+'_'+i)) {
                    index = i;
                    break;
                }
            }
        }
        this.fields.multi.add(filterName, index);
    },
    nextResultsPage: function(callback) {
        if(this.xhr) {
            return false;
        }
        var T = this;
        this.page++;
        this.getResults(function(results) {
            T.appendResults(results);
            if(callback) {
                callback();
            }
        });
    },
    appendResults: function(results) {
        var T = this;
        var html = '';
        var tpl = document.createElement('template');
        _.each(results.data, function (item) {
            html += T.resultRender(item, results.columns);
        });
        tpl.innerHTML = html;
        KYB.imageLoader.add(tpl.content.querySelectorAll('.bloggers-table-ava'));
        T.results.appendChild(tpl.content);
        //KYB.imageLoader.update();
    },
    backgroundSearch: function(e) {
        if(e && e.detail && e.detail.silent) {
            return false;
        }
        if(this.backgroundXHR) {
            this.backgroundXHR.abort();
        }
        /*if(this.xhr) {
            return false;
        }*/
        var T = this;
        var params = T.getParams();
        //if (params['search[yt_comments_rate]'] || params['search[yt_reactions_rate]']) {
            //params = T.getArrayParams(params);
        //}

        T.lastSearchResult = false;
        params.counter = 1; // flag for backend
        T.filtersForm.classList.add('preload');
        T.backgroundXHR = KYB.get(KYB.baseUrl+'discovery/ajax/', params).then(function (resp) {
            //T.lastSearchResult = resp;
            T.setTotalBtn(resp);
            T.filtersForm.classList.remove('preload');
            T.backgroundXHR = false;
        }, function (status) {
            T.backgroundXHR = false;
        });
        T.filterLabels();
    },
    setTotalBtn: function (resp) {
        if (resp.total > 0) {
            let total = resp.total;
            this.totalHeaderBtn.innerHTML = __n('Show 1 result', 'Show {n} results', KYB.numberFormat(total, 0), {n: KYB.numberFormat(total, 0)});
            this.totalHeaderBtn.classList.remove('button-newgray', 'discovery__search-btn_disabled');
            this.totalHeaderBtn.removeAttribute('disabled');

            this.totalBtn.innerHTML = __n('Show 1 result', 'Show {n} results', KYB.numberToLocale(total), {n: KYB.numberToLocale(total)});
            this.totalBtn.classList.remove('button-newgray', 'discovery__search-btn_disabled');
            this.totalBtn.removeAttribute('disabled');
        } else {
            if(resp.limits_reached || resp.trial_limits_reached) {
                //T.resultsTotal.innerHTML = __('You’ve reached monthly request number limit. {a}Contact us{a2} to increase limit.', {a: '<a href="mailto:info@hypeauditor.com">', a2: '</a>'})+'<br><br>';
                this.setLimitReachedState();
            } else {
                this.totalHeaderBtn.innerHTML = __('No results found');
                this.totalHeaderBtn.classList.add('button-newgray', 'discovery__search-btn_disabled');
                this.totalHeaderBtn.setAttribute('disabled', true);

                this.totalBtn.innerHTML = __('No results found, try to expand filters');
                this.totalBtn.classList.add('button-newgray', 'discovery__search-btn_disabled');
                this.totalBtn.setAttribute('disabled', true);
            }
        }
    },
    getParams: function() {
        var params = {};
        _.extend(params, this.serialize());
        if(this.sort.params) {
            params.sort = this.sort.params;
        }
        if(this.keywords.data && this.keywords.data.length) {
            params['search[keywords]'] = this.keywords.data;
        }
        if(this.filterTabMenu) {

            var currFilterTab = this.filterTabMenu.querySelector('.discovery-tab--menu-active');
            if(currFilterTab && currFilterTab.dataset.st != 'ig') {
                params['search[st]'] = currFilterTab.dataset.st;
            }
        }
        return params;
    },
    getArrayParams: function (params) {
        if (params['search[yt_comments_rate]']) {
            params['search[yt_comments_rate]'] = params['search[yt_comments_rate]'] + '';
            params['search[yt_comments_rate]'] = params['search[yt_comments_rate]'].split(',').map((x) => parseInt(x));
        }
        if (params['search[yt_reactions_rate]']) {
            params['search[yt_reactions_rate]'] = params['search[yt_reactions_rate]'] + '';
            params['search[yt_reactions_rate]'] = params['search[yt_reactions_rate]'].split(',').map((x) => parseInt(x));
        }
        return params;
    },
    getResults: function(callback) {
        var T = this;
        if(this.xhr) {
            this.xhr.abort();
        }
        if(this.backgroundXHR) {
            this.backgroundXHR.abort();
        }

        var params = T.getParams();
        //if (params['search[yt_comments_rate]'] || params['search[yt_reactions_rate]']) {
            //params = T.getArrayParams(params);
        //}


        if(!_.isEmpty(params)) {
            T.pageElement.classList.remove('main');
        }

        var resultsCallback = function (resp) {
            T.columns.results = resp.columns;
            // TODO tmp
            var feedbackCookie = Cookies.get('feedback');
            if(!feedbackCookie) {feedbackCookie = [];}
            if( (params['search[influencer_location][id]'] && _.indexOf(feedbackCookie, 14)<0) ||
                (params['search[influencer_gender]'] && _.indexOf(feedbackCookie, 15)<0) ||
                ((params['search[influencer_age][from]'] || params['search[influencer_age][to]']) && _.indexOf(feedbackCookie, 16)<0) ||
                (params['search[is_personal]'] && _.indexOf(feedbackCookie, 17)<0)) {
                if(!T.trialLockState && !resp.not_available_filter) {
                    T.showFeedback = true;
                    if(params['search[influencer_location][id]'] && _.indexOf(feedbackCookie, 14)<0) {
                        var featureName = 'Influencer Location';
                        var featureId = 14
                    } else if(params['search[influencer_gender]'] && _.indexOf(feedbackCookie, 15)<0) {
                        var featureName = 'Influencer Gender';
                        var featureId = 15
                    } else if((params['search[influencer_age][from]'] || params['search[influencer_age][to]']) && _.indexOf(feedbackCookie, 16)<0) {
                        var featureName = 'Influencer Age';
                        var featureId = 16
                    } else if(params['search[is_personal]'] && _.indexOf(feedbackCookie, 17)<0) {
                        var featureName = 'Person / Brand';
                        var featureId = 17
                    }
                    setTimeout(function () {


                    KYB.feedbackModule.init({
                        id: featureId,
                        container: '#discovery-filters--feedback',
                        className: 'hype-feedback-compact',
                        reactions: [
                            {ico: '&#xf164;', className: 'fal fa-thumbs-up', id: 1},
                            {ico: '&#xf165;', className: 'fal fa-thumbs-down', id: 0}
                        ],
                        popupAfterReaction: true,
                        header: __('Do you like {name} filter results?', {name: '<strong>'+featureName+'</strong>'}),
                        headerPositiveReaction: __('Can we improve anything about the filter?'),
                        placeholderNegative: __('What should be improved about the filter?')
                    });
                    });
                } else {
                    T.showFeedback = false;
                }
            } else {
                T.showFeedback = false;
            }
            T.setTotalBtn(resp);
            callback(resp, params);

            T.nextOffset = resp.next_offset;
            T.xhr = false;
        };

        if(T.nextOffset) {
            params.offset = T.nextOffset;
        } else if(T.lastSearchResult) {
            resultsCallback(T.lastSearchResult);
            return true;
        }
        T.resultsWrap.classList.add('kyb-preload');
        var failMsgShow = function () {
            T.resultsWrap.classList.add('notFound');
            T.resultsTotal.innerHTML = __('Sorry, we could not complete this search.')+'<br><br>'+T.tryMsg;
            KYB.tracker.trackEvent('Discovery Error', {
                type: 'search fail',
                url: document.location.href
            });
        };
        this.xhr = KYB.get(KYB.baseUrl+'discovery/ajax/', params).then(function (resp) {
            if(resp.success) {
                resultsCallback(resp);
            } else {
                failMsgShow();
            }
            T.resultsWrap.classList.remove('kyb-preload');
        }, function (resp) {
            if(resp.status) {
                failMsgShow();
            }
            T.resultsWrap.classList.remove('kyb-preload');
        });
    },
    tryMsg: __('Suggestions:')+'<br>- '+__('Make sure that all filters are specified correctly.')+'<br>- '+__('Try different filters.')+'<br>- '+__('Try more general filters.')+'<br>- '+__('Try fewer filters.'),
    setLimitReachedState: function () {
        this.filtersWrap.classList.add('_limit');
    },
    submit: function(isBack) {
        var T = this;
        T.page = 0;
        T.nextOffset = false;
        T.filtersForm.classList.add('preload');
        T.getResults(function(results, params) {
            T.resultsWrap.classList.remove('notFound', 'locked');
            T.results.innerHTML = '';
            T.foundCountNum = results.total;
            T.foundCount = results.total ? KYB.numberToLocale(results.total) + ' influencers found' : false;
            T.resultsTotal.innerHTML = T.foundCount ? T.foundCount : __('Your search did not match any influencers.')+'<br><br>'+T.tryMsg;

            if (results.limits_reached){
                T.resultsTotal.innerHTML = __('You’ve reached monthly request number limit. {a}Contact us{a2} to increase limit.', {a: '<a href="mailto:info@hypeauditor.com">', a2: '</a>'})+'<br><br>';
                T.setLimitReachedState();
            }
            if(results.data && results.data.length) {
                if(!T.resultsCache) {
                    T.resultsCache = {
                        columns: results.columns,
                        data: _.sample(results.data, 10)
                    };
                }

                if(results.not_available_filter) {
                    T.notAvailableFilterLockState = true;
                } else {
                    T.notAvailableFilterLockState = false;
                }

                T.columns.headRender();
                T.appendResults(results);
                if(results.total < 100 && !T.trialLockState && !results.not_available_filter) {
                    T.results.insertAdjacentHTML('beforeend', '<tr><td colspan="'+results.columns.length+'"><div id="discovery-low-results"><h2>Are you satisfied with discovery results?</h2><div class="button" onclick="this.parentNode.innerHTML=\'This is great!\'">Yes</div> <div class="button" onclick="KYB.discovery.amplitude.request(false, true); this.parentNode.innerHTML=\'Thank you, we will work on that!\'">No</div></div></td></tr>');
                }
                T.resultsTotalWrap.classList.remove('notFound');
            } else if(results.trial_limits_reached) {
                T.columns.headRender();
                T.setLimitReachedState();

                var tpl = document.createElement('template');
                tpl.innerHTML = T.lockStateRender(results.columns, __('Get full access for unlimited searches and full results list'), __('You have reached the daily search limit'));
                T.results.appendChild(tpl.content);

                T.resultsTotalWrap.classList.remove('notFound');
            } else {
                T.resultsTotalWrap.classList.add('notFound');
                T.resultsWrap.classList.add('notFound');
            }
            T.filtersForm.classList.remove('preload');

            if(T.exportBtn) {
                var exportParams = [];
                _.each(params, function (p, n) {
                    if(n!='sort' && n!='search[st]') {
                        exportParams.push(n);
                    }
                });
                if(!results.data || !results.data.length || !exportParams.length) {
                    T.exportBtn.style.display = '';
                } else {
                    T.exportBtn.style.display = 'inline-block';
                }
            }
            if(!isBack) {
                var newurl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?' + T.paramsToUrl(params);
                window.history.pushState({path:newurl},'',newurl);
            }

            T.amplitude.request(results);
        });
        T.filterLabels();
    },
    amplitude: {
        request: function (resp, isLowResults) {
            var T = KYB.discovery;
            var filters = [];
           // console.log(T.serializeData);
            _.each(T.serializeData, function (f, n) {
                filters.push(T.fields.getRootName(n));
            });
            if(T.keywords.data.length) {
                filters.push('keywords');
            }
            if(T.mentions.data.length) {
                //filters.push('mentions');
            }
            //console.log(filters);
            var p = {
                filters: _.uniq(filters),
                offset: resp&&resp.next_offset?resp.next_offset-100:0,
                results: resp?resp.total:T.foundCountNum,
                query: T.filtersLabelText,
                query_string: T.filtersLabelText.join(', '),
                platform: T.st == 'yt' ? 'youtube' : (T.st == 'tt' ? 'tiktok' : 'instagram'),
                url: document.location.href
            };
            //console.log(p);
            KYB.tracker.trackEvent(isLowResults?'Discovery Low Results':'Request Discovery Front', p);
        }
    },
    paramsToUrl: function(params) {
        var T = this;
        this.searchParams = new URLSearchParams();
        _.each(params, function (v,k) {

            if(k != 'offset') {
                var param = JSON.stringify(v);
                T.searchParams.set(k, param);
            }
        });
        return T.searchParams.toString();
    },
    lockStateRequestDemoPopup: function(source, header) {
        var T = this;
        KYB.requestDemoPopup('Discovery', {
            platform: T.st == 'ig' ? 'instagram' : (T.st == 'tt' ? 'tiktok' : 'youtube'),
            btn: __('Request a demo'),
            title: header ? header : (T.notAvailableFilterLockState ? __('Access all filters to find your perfect match') : __('Unlimited searches and full results list')),
            source: source ? source : 'web request pro',
            subtitle: T.notAvailableFilterLockState ? '' : __('Request a demo call with our influencer marketing experts and learn how you can use the Influencer Discovery to boost your campaigns and scale your business.')
        });
    },
    lockStateRender: function(columns, header, preheader, source) {
        return '<tr class="discovery-table-lock--tr"><td></td><td><div class="lock-animate-ico"></div></td><td colspan="'+(columns.length-2)+'">' +
                (preheader ? preheader : '') +
                '<h2>'+(header ? header : __('Subscribe to discover all {c} influencers', {c: KYB.numberFormat(this.foundCountNum)}))+'</h2>' +
                '<div onclick="KYB.discovery.lockStateRequestDemoPopup('+(source?'\''+source+'\'':'')+')" class="button">'+__('Request full access')+'</div>' +
                '</td></tr>';
    },
    resultRender: function(data, columns) {
        var userData = _.find(data, function (d) {
            if(d && d.type && (d.username || d.channel_id)) {
                return true;
            }
        });
        var T = this;

        if(this.trialLockState) {
            var trialParams = [];
            _.each(T.getParams(), function (p, n) {
                if(n!='sort' && n!='search[st]') {
                    trialParams.push(T.fields.getRootName(n));
                }
            });
        }

        var lockState = ((this.trialLockState && trialParams.length) || this.notAvailableFilterLockState);
        if(lockState && data[0] == 4) {
            let found = __('{c} influencers found', {c: KYB.numberToLocale(this.foundCountNum)});
            if(T.st == 'tt' || !T.starterFilters || _.difference(trialParams, T.starterFilters[T.st]).length) {
                var tr = this.lockStateRender(columns, found, __('Subscribe to Pro to access all filters'), this.trialLockState ? 'web request discovery full' : '');
            } else {
                var tr = '<tr class="discovery-table-lock--tr"><td></td><td><div class="lock-animate-ico"></div></td><td colspan="'+(columns.length-2)+'">' +
                __('Subscribe to Discovery Starter to access results') +
                '<h2>'+found+'</h2>' +
                '<div onclick="hype.upgrade.showPopup(\''+T.st+'\');" class="button">'+__('Upgrade your Free plan')+'</div>' +
                '</td></tr>';
            }
        } else {
            if(userData) {
                if(typeof(hype)!='undefined') {
                    var baseUrl = location.protocol + '//' + KYB.domain + KYB.baseUrl + (PRODUCTION ? '' : 'app/');
                } else {
                    var baseUrl = KYB.baseUrl;
                }
                if(userData.type == 1) {
                    var reportLink = baseUrl + 'preview/'+userData.username+'/';
                } else if(userData.type == 2) {
                    var reportLink = baseUrl + 'youtube/'+userData.channel_id+'/';
                } else {
                    var reportLink = baseUrl + 'tiktok/'+userData.username+'/';
                }
            }
            var tr = '<tr'+(lockState && data[0]>4 ? ' class="lock"' : '')+'>' + KYB.template.render({
                template: 'resultItemTpl'
            }, {
                data: data,
                columns: columns,
                reportLink: reportLink ? reportLink : '',
                username: userData ? userData.username : '',
                isPaid: userData ? userData.is_paid : 0
            }) + '</tr>';
            if(T.showFeedback && data[0] == 3) {
                tr += '<tr class="discovery-table-lock--tr"><td></td><td style="vertical-align: top"><i id="discovery-filters--feedback-ico" class="fal fa-comment-smile">&#xf4b4;</i></td><td colspan="'+(columns.length-2)+'">' +
                    '<div id="discovery-filters--feedback"></div>' +
                '</td></tr>';
            }
        }
        return tr;
    },
    scrollEvent: function() {
        var T = KYB.discovery;
        if(!T.scrollProcess && T.nextOffset) {
            T.scrollProcess = true;
            window.requestAnimationFrame(function () {
                if(window.scrollY + window.innerHeight > T.pageElement.scrollHeight - 160 - 300) {
                    T.nextResultsPage(function () {
                        T.scrollProcess = false;
                    });
                } else {
                    T.scrollProcess = false;
                }
            });
        }
    },
    scrollInit: function() {
        if(this.trialLockState) {
            return false;
        }
        var T = this;
        T.scrollProcess = false;
        document.addEventListener('scroll', this.scrollEvent);
    },
    sort: {
        init: function () {
            var T = this;
            var th = document.getElementsByClassName('kyb-table-sort-th');
            _.each(th, function (t) {
                T.addEvent(t);
            });
        },
        addEvent: function(el) {
            var T = this;
            el.addEventListener('click', function (e) {
                var t = e.currentTarget;
                var d = t.dataset;
                var sort = d.sort;
                if(sort) {
                    sort = sort == 'desc' ? 'asc' : '';
                } else {
                    sort = 'desc';
                }
                var cn = 'kyb-table-sort-th--';
                el.classList.remove(cn+'asc',cn+'desc');
                d.sort = sort;
                if(sort) {
                    T.by(d.sortType, sort);
                    el.classList.add(cn+sort);
                } else {
                    T.params = false;
                    KYB.discovery.submit();
                }
            });
        },
        by: function (type, sort) {
            var P = KYB.discovery;
            this.params = {};
            this.params[type] = sort;
            P.lastSearchResult = false;
            P.submit();

            KYB.tracker.trackEvent('Page Action', {
                target: 'Discovery sort',
                type: type
            });
        }
    },
    expandFilters: function () {
        var T = this;
        var element = this.filtersForm;
        var sectionHeight = element.scrollHeight;
        element.style.height = sectionHeight + 'px';
        element.addEventListener('transitionend', function(e) {
            element.removeEventListener('transitionend', arguments.callee);
            element.style.height = null;
            T.filters.classList.remove('collapse');
        });
        this.filtersCollapsed = false;
    },
    collapseFilters: function (e) {
        if(e) {
            e.stopPropagation();
        }
        var T = this;
        var element = this.filtersForm;
        var sectionHeight = element.scrollHeight;
        var elementTransition = this.filtersForm.style.transition;
        element.style.transition = '';
        requestAnimationFrame(function() {
            element.style.height = sectionHeight + 'px';
            element.style.transition = elementTransition;
            requestAnimationFrame(function() {
                element.addEventListener('transitionend', function(e) {
                    element.removeEventListener('transitionend', arguments.callee);
                    setTimeout(function () {
                        KYB.imageLoader.update();
                    });
                });
                T.filters.classList.add('collapse');
                element.style.height = 0 + 'px';
            });
        });
        this.filtersCollapsed = true;
    },
    columns: {
        init: function () {
            this.editSelectorWrap = document.getElementById('discovery-results-edit');
            this.resultsTableHead = document.getElementById('discovery-results--table-head');
            //this.selectorRender();
            //this.headRender();
        },
        checkSelected: function(name) {
            var selected = KYB.discovery.selectedColumns;
            return (!selected || _.indexOf(selected, name) > -1) ? true : false;
        },
        selectorRender: function () {
            var items = [];
            var T = this;
            var selected = KYB.discovery.selectedColumns;
            _.each(this.default, function (d, n) {
                items.push({
                    title: d,
                    value: n,
                    className: T.checkSelected(n) ? 'selected' : ''
                });
            });

            _.each(KYB.discovery.filterData, function (f, n) {
                if(!T.default[n]) {
                    var param = KYB.discovery.filterParams[n];

                    if(_.isArray(f)) {
                        _.each(f, function (ff) {
                            if(_.isObject(ff)) {
                                var text = (ff.key ? param.list[ff.key] : param.name);
                            } else {
                                var text = param.list[ff];
                            }
                            items.push({
                                title: text,
                                value: n,
                                className: T.checkSelected(n) ? 'selected' : ''
                            });
                        });
                    } else {


                    }

                }
            });
            var selector = KYB.customFields.selectRender({
                title: __('Edit Columns'),
                className: 'discovery-results-edit--selector',
                //field: s,
                items: items
            });

            this.editSelectorWrap.innerHTML = '';
            this.editSelectorWrap.appendChild(selector);
        },
        headRender: function () {
            this.resultsTableHead.innerHTML = KYB.template.render({
                template: 'resultHeadTpl'
            }, this.results);
            KYB.discovery.sort.init();
        }
    },
    mentions: {
        data: [],
        init: function() {
            this.tags = document.getElementById('discovery-brand-mentions--labels');
            this.select = document.getElementById('discovery-brand-mentions');
            this.type = document.getElementById('discovery-brand-mentions--type');
            this.input = document.getElementById('discovery-filters--brand-mentions--input');
            var T = this;
            var P = KYB.discovery;

            this.type.addEventListener('change', function (e) {
                P.lastSearchResult = false;
                T.select.setAttribute('name', 'search['+e.target.value+']');
                //P.filterParams.mentioned.pre = e.target.value == 'not_mentioned' ? __('Not mentioned') : __('Mentioned');
            });

            var searchParams = new URLSearchParams(window.location.search);
            for(var pair of searchParams.entries()) {
                var name = pair[0];
                if(name == 'search[mentioned]' || name == 'search[not_mentioned]') {

                    var data = JSON.parse(pair[1]);
                    T.data = data;
                    _.each(data, function (m) {
                        T.appendOption(m);
                    });

                    if(name == 'search[not_mentioned]') {
                        T.type.querySelector('[value="not_mentioned"]').selected = true;
                        //P.filterParams.mentions.pre = __('Not mentioned');
                        P.fields.trigger(T.type);
                    }

                    break;
                }
            }

            KYB.discovery.usernameSuggest.init(this.input);


            if(this.data.length) {
                _.each(this.data, function (m) {
                    T.tags.appendChild(T.label(m));
                });
            }
        },
        label: function(username) {
            var T = this;
            var el = document.createElement('div');
            var close = document.createElement('i');
            el.setAttribute('class', 'discovery-brand-mentions--label');
            el.dataset.username = username;
            close.setAttribute('class', 'far fa-times');
            el.innerHTML = '@'+username;
            close.innerHTML = '\uf00d';
            close.addEventListener('click', function () {
                T.remove(username);
                el.remove();
            });
            el.appendChild(close);
            return el;
        },
        add: function (username) {
            if(!username) {return false;}
            var P = KYB.discovery;
            var T = this;
            username = username.toLowerCase();
            var index = _.indexOf(this.data, username);
            if(index >= 0) {
                var label = T.tags.getElementsByClassName('discovery-brand-mentions--label')[index];
                label.classList.add('highlight');
                setTimeout(function () {
                    label.classList.remove('highlight');
                }, 500);
            } else {
                this.data.push(username);

                this.appendOption(username);

                P.backgroundSearch();
                T.tags.appendChild(this.label(username));
            }
        },
        appendOption: function(username) {
            var o = document.createElement('option');
            o.setAttribute('value', username);
            o.setAttribute('selected', true);
            o.innerHTML = username;
            this.select.appendChild(o);
        },
        remove: function (username) {
            var P = KYB.discovery;
            P.lastSearchResult = false;
            this.data = _.without(this.data, username);

            var o = this.select.querySelector('[value="'+username+'"]');
            if(o) {
                o.remove();
            }
            var t = this.tags.querySelector('[data-username="'+username+'"]');
            if(t) {
                t.remove();
            }

            P.backgroundSearch();
        },
        removeAll: function () {
            var P = KYB.discovery;
            P.lastSearchResult = false;
            this.data = [];

            this.select.innerHTML = '';
            this.tags.innerHTML = '';

            P.backgroundSearch();
        }
    },
    keywords: {
        data: [],
        init: function () {
            this.wrap = document.getElementById('discovery-filters--search');
            this.input = document.getElementById('discovery-filters--search-input');
            this.input.addEventListener('click', function (e) {
                e.stopPropagation();
            });
            this.suggest.init(this.input);
        },
        add: function (keyword) {
            if(!keyword) {return false;}
            var P = KYB.discovery;
            keyword = keyword.toLowerCase();
            var index = _.indexOf(this.data, keyword);
            if(index >= 0) {
                var label = P.filtersList.getElementsByClassName('discovery-filters--item-keywords')[index];
                label.classList.add('highlight');
                setTimeout(function () {
                    label.classList.remove('highlight');
                }, 500);
            } else {
                this.data.push(keyword);
                /*if(!P.filtersCollapsed) {
                    P.backgroundSearch();
                    P.filterLabels();
                } else {*/
                    P.lastSearchResult = false;
                    P.submit();
                //}
            }
        },
        remove: function (keyword) {
            var P = KYB.discovery;
            P.lastSearchResult = false;
            this.data = _.without(this.data, keyword);
            if(!P.filtersCollapsed) {
                P.backgroundSearch();
            }
        },
        removeAll: function() {
            var P = KYB.discovery;
            P.lastSearchResult = false;
            this.data = [];
            if(!P.filtersCollapsed) {
                P.backgroundSearch();
            }
        },
        suggest: {
            gc: function() {
                let P = KYB.discovery;
                P.keywords.input.results.innerHTML = '';
                if(P.usernameSuggest.xhr) {
                    P.usernameSuggest.xhr.abort();
                }
                if(P.locationAutocomplete.xhr) {
                    P.locationAutocomplete.xhr.abort();
                }
            },
            init: function (input) {
                if(!input) {return false;}
                var T = this;
                var P = KYB.discovery;
                var results = document.createElement('div');

                var blockKeyup = false;
                input.addEventListener('keydown', function (event) {
                    if(event.which === 13 || event.key === ",") {
                        event.preventDefault();
                        blockKeyup = true;
                        T.select(results.getElementsByClassName('hover')[0], event.target);
                        P.dropdownSelect.hide(event);
                    } else if(event.which === 38) {
                        event.preventDefault();
                        blockKeyup = true;
                        P.dropdownSelect.hover(results, -1);
                    } else if(event.which === 40) {
                        event.preventDefault();
                        blockKeyup = true;
                        P.dropdownSelect.hover(results, 1);
                    } else if(event.which === 27) {
                        blockKeyup = true;
                        P.dropdownSelect.hide(event);
                    }
                });
                input.addEventListener('input', function(event) {
                    if(!blockKeyup) {
                        if(event.target.value.slice(-1) == '-') {
                            event.target.value = event.target.value.replace(/-$/,"–")
                        }
                        T.searchEvent(event);
                    }
                    blockKeyup = false;
                });

                input.addEventListener('focus', function (event) {
                    P.dropdownSelect.show(event);
                });

                results.setAttribute('class', 'discovery-autocomplete-list');
                results.addEventListener('click', function (event) {
                    var target = event.target.tagName == 'LI' ? event.target : event.target.tagName == 'SMALL' ? event.target.parentNode : false;
                    if(target) {
                        T.select(target, input);
                    }
                    event.stopPropagation();
                });

                input.parentNode.appendChild(results);
                input.results = results;
            },
            searchEvent: function (e) {
                e.preventDefault();
                var T = this;
                var P = KYB.discovery;
                var s = e.target.value.trim();
                if(s === '') {
                    e.target.results.innerHTML = '';
                    return false;
                }
                T.getSuggest(s, function (results) {
                    var html = T.render(results);
                    if(html != '') {
                        e.target.results.innerHTML = '<ul class="select-list">'+html+'</ul>';
                        P.dropdownSelect.show(e);
                    } else {
                        e.target.results.innerHTML = '';
                    }
                });
            },
            getSuggest: function (string, callback) {
                var T = this;
                var P = KYB.discovery;
                var toSearch = string.toLowerCase();
                if(!toSearch.length) {callback({});}

                T.results = {};
                _.each(P.filterParams, function (f, f_name) {
                    if(f.unavailable || (f.only_for && P.st && f.only_for.split(',').indexOf(P.st)<0)) {
                        return false;
                    }
                    if(!isNaN(toSearch)) {
                        var n = Number(toSearch);
                        if(n > 0 && f.min <= n && (!f.max || f.max >= n)) {
                            T.results[f_name] = [{
                                from: n,
                                title: '>'+n
                            }];
                        }
                    }

                    var fromTo = toSearch.split('–');
                    if(fromTo.length>1 && !f.not_interval) {
                        var r = {};
                        _.each(fromTo, function (v,i) {
                            var n = Number(v);
                            if(n > 0 && f.min <= n && (!f.max || f.max >= n)) {
                                if(!i) {
                                    r.from = n;
                                    r.title = '>'+n;
                                } else if(!r.from || n > r.from) {
                                    r.to = n;
                                    if(r.from) {
                                        r.title = r.from+'–'+n;
                                    } else {
                                        r.title = '<'+n;
                                    }
                                }
                            }
                        });
                        if(!_.isEmpty(r)) {
                            T.results[f_name] = [r];
                        }
                    }
                    if(f_name == 'keywords' && fromTo.length < 2) {
                        T.results[f_name] = [{
                            title: toSearch,
                            value: toSearch
                        }];
                    }

                    if(!_.isEmpty(T.results[f_name])) {
                        return true;
                    }

                    if (toSearch.length>2 && (f_name == 'audience_location' || f_name == 'influencer_location') && isNaN(toSearch)) {
                        P.locationAutocomplete.search(toSearch).then(function (resp) {
                            if (resp.success && (!_.isEmpty(resp.cities) || !_.isEmpty(resp.countries) || !_.isEmpty(resp.states)) ) {
                                if(KYB.discovery.st != 'ig') {
                                    T.results['audience_location'] = false;
                                    T.results['influencer_location'] = resp.countries.length ? {
                                        countries:  resp.countries.slice(0,5)
                                    } : false;
                                } else {
                                    T.results['audience_location'] = {
                                        cities: resp.cities.slice(0,5),
                                        states: resp.states.slice(0,5),
                                        countries: resp.countries.slice(0,5)
                                    };
                                    T.results['influencer_location'] = {
                                        cities: resp.cities.slice(0,5),
                                        states: resp.states.slice(0,5),
                                        countries: resp.countries.slice(0,5)
                                    };
                                }
                                callback(T.results);
                            }
                        });
                    } if(toSearch.length>2 && (f_name == 'mentioned' || f_name == 'yt_similar') && isNaN(toSearch)) {
                        P.usernameSuggest.getSuggest(string, function (resp) {
                            if(resp) {
                                T.results[f_name] = _.map(resp.slice(0,5), function (t) {
                                    return {
                                        title: t.full_name,
                                        value: f_name == 'mentioned' ? t.username : t.channel_id
                                    };
                                });
                                callback(T.results);
                            }
                        });
                    } else if (f.list && toSearch.length>1) {
                        var r = _.pick(f.list, function (o) {
                            if (o.toLowerCase().indexOf(toSearch) >= 0) {
                                return true;
                            }
                        });
                        if (!_.isEmpty(r)) {
                            T.results[f_name] = _.map(r, function (t,v) {
                                if(f_name == 'audience_gender') {
                                    return {
                                        title: t,
                                        id: v
                                    };
                                } else if(f_name == 'aqs' || f_name == 'yt_reactions_rate' || f_name == 'yt_comments_rate') {
                                    return {
                                        title: t,
                                        from: v
                                    };
                                } else {
                                    return {
                                        title: t,
                                        value: v
                                    };
                                }
                            });
                            T.results[f_name] = T.results[f_name].slice(0,5);
                        }
                    }
                });

                callback(T.results);
            },
            render: function (results) {
                var T = this;
                var P = KYB.discovery;
                var items = '';
                _.each(results, function (result, name) {
                    if(!result) {
                        return false
                    }
                    var title =  P.filterParams[name].name;
                    if(name == 'audience_location' || name == 'influencer_location') {
                        items += '<li class="select-option--title">'+title+':</li>';
                        items += P.locationAutocomplete.render(result, name);
                    } else {
                        items += '<li class="select-option--title">'+title+':</li>';
                        _.each(result, function (o) {
                            var dataset = '';
                            _.each(o, function (d, n) {
                                if(n != 'title') {
                                    dataset += ' data-'+n+'="'+d+'"';
                                }
                            });
                            items += '<li class="select-option" data-name="'+name+'"'+dataset+'>'+o.title+'</li>';
                        });
                    }
                });
                return items.replace('"select-option"', '"select-option hover"');
            },
            select: function(target, input) {
                if(!target) {
                    return false;
                }
                var P = KYB.discovery;
                var name = target.dataset.name;

                input.value = '';
                this.gc();
                //input.results.innerHTML = '';
                input.focus();



                if(name == 'mentioned') {
                    KYB.discovery.mentions.add(target.dataset.value);
                    return true;
                }

                var params = KYB.discovery.getParams();
                var data = _.omit(target.dataset, 'name');
                _.each(data, function (d, n) {
                    var search = 'search['+name+']';
                    if(n == 'value') {
                        var val = [d];
                        if(params[search]) {
                            val = _.union(params[search], val);
                        }
                    } else {
                        if(P.filterParams[name].multi) {
                            var index = P.fields.multi.count(name);
                            if(!params[search+'['+(index-1)+']['+n+']']) {
                                index-=1;
                            }
                            search+='['+index+']';
                        }
                        search+='['+n+']';
                        var val = d;
                    }
                    if((n=='id' || n=='value') && P.filterParams[name].list && !P.filterParams[name].list[d]) {
                        P.filterParams[name].list[d] = target.innerHTML;
                    }

                    KYB.discovery.applyParamsToFields(search, val);
                });

                if(P.filtersCollapsed) {
                    P.lastSearchResult = false;
                    P.submit();
                }
            }
        },
    },
    numberFormat: function(n) {
        //if (n >= 1e3) {
            var newN = n / 1e3;
            var p = {
                maximumFractionDigits: 2,
                minimumFractionDigits: n?2:0
            };
            return newN.toLocaleString('en', p) + 'K';
        //}
        //return KYB.numberToLocale(n, 2, 2);
    },
    locationAutocomplete: {
        init: function (input) {
            var T = this;
            var results = document.createElement('div');

            var blockKeyup = false;
            input.addEventListener('keydown', function (event) {
                if(event.which === 13) {
                    event.preventDefault();
                    blockKeyup = true;
                    var els = results.getElementsByClassName('select-option');
                    if(els.length) {
                        if(els.length == 1) {
                            var s = els[0];
                        } else {
                            var s = results.getElementsByClassName('hover')[0];
                        }
                        if(s) {
                            T.select(s, event.target);
                            T.hide(event);
                            input.blur();
                        }
                    }
                } else if(event.which === 38) {
                    event.preventDefault();
                    blockKeyup = true;
                    T.hover(results, -1);
                } else if(event.which === 40) {
                    event.preventDefault();
                    blockKeyup = true;
                    T.hover(results, 1);
                } else if(event.which === 27) {
                    blockKeyup = true;
                    setTimeout(function () {
                        T.hide(event);
                        input.blur();
                    });
                }
            });

            input.addEventListener('keyup', function(event) {
                if(!blockKeyup) {
                    T.searchEvent(event);
                }
                blockKeyup = false;
            });

            input.addEventListener('focus', this.show.bind(this));

            var fieldToSend = input.previousElementSibling;
            input.addEventListener('blur', function (e) {
                if(!e.target.value && fieldToSend.value) {
                    fieldToSend.value = '';
                    KYB.discovery.fields.trigger(fieldToSend);
                }
            });

            results.setAttribute('class', 'discovery-autocomplete-list');
            results.addEventListener('click', function (event) {
                if(event.target.tagName == 'LI') {
                    T.select(event.target, input);
                }
            });
            fieldToSend.addEventListener('change', function (e) {
                var groupName = KYB.discovery.fields.getRootName(e.target.name);
                input.value = e.target.value ? KYB.discovery.filterParams[groupName].list[e.target.value] : '';
            });

            input.parentNode.appendChild(results);
            input.results = results;
        },
        select: function(target, input) {
            if(!target) {
                return false;
            }
            var idField = input.previousElementSibling;
            var typeField = idField.previousElementSibling;
            var id = target.dataset.id;
            var type = target.dataset.type;
            var name = target.textContent;
            idField.value = id;
            typeField.value = type;

            var groupName = KYB.discovery.fields.getRootName(idField.name);
            if(groupName) {
                KYB.discovery.filterParams[groupName].list[id] = name;
            }

            if(groupName == 'audience_location') {
                idField.dataset.defaultCond = target.dataset.from;
            }
            KYB.discovery.fields.trigger(idField);
        },
        hover: function(list, d) {
            var curr = list.getElementsByClassName('hover')[0];
            var items = list.getElementsByClassName('select-option');
            if(!items.length) {return false;}
            if(!curr) {
                var index = -1;
            } else {
                var index = _.indexOf(items, curr);
                curr.classList.remove('hover');
            }
            var newIndex = index+d;
            if(newIndex<0) {
                newIndex = 0;
            } else if(newIndex > items.length-1) {
                newIndex = items.length-1;
            }
            items[newIndex].classList.add('hover');
        },
        searchEvent: function (event) {
            var T = this;
            var val = event.target.value.trim().toLowerCase();
            if(!val || val.length < 2) {
                event.target.results.innerHTML = '';
                T.hide(event);
                return false;
            }

            var pc = 'discovery-autocomplete-preload';
            var p;
            if(event.target.preloadT) {
                clearTimeout(event.target.preloadT);
                event.target.preloadT = false;
            }
            event.target.preloadT = setTimeout(function () {
                p = event.target.results.parentNode;
                p.classList.add(pc);
            }, 250);

            var result = this.search(val);
            result.then(function (resp) {
                if(resp.success) {
                    var withoutCities = false;
                    if((event.target.id == 'influencer_location_autocomplete' || event.target.dataset.groupName == 'audience_location') && KYB.discovery.st != 'ig') {
                        // TODO tmp
                        withoutCities = true;
                    }
                    var html = T.render(resp, KYB.discovery.fields.getRootName(event.target.name), withoutCities);
                    if(html != '') {
                        event.target.results.innerHTML = '<ul class="select-list">'+html+'</ul>';
                    } else {
                        event.target.results.innerHTML = '<div class="discovery-autocomplete-not-found">Not found</div>';
                        //T.hide(event);
                    }
                    T.show(event);
                }
                if(event.target.preloadT) {
                    clearTimeout(event.target.preloadT);
                    event.target.preloadT = false;
                }
                if(p) {
                    p.classList.remove(pc);
                }
            });
            event.preventDefault();
        },
        search: function (val) {
            if(this.xhr) {
                this.xhr.abort();
            }
            this.xhr = KYB.get(KYB.baseUrl+'discovery/location/', {request: val});
            return this.xhr;
        },
        render: function (results, filterName, withoutCities) {
            var items = '';
            if(!withoutCities) {
                _.each(results.cities, function (o, id) {
                    items += '<li class="select-option" data-name="'+filterName+'" data-from="1" data-id="'+o.geonameid+'" data-type="1">'+o.name+', '+(o.country.geonameid == '6252001' && o.state ? o.state.name+', ' : '')+o.country.name+'</li>';
                });
                _.each(results.states, function (o, id) {
                    items += '<li class="select-option" data-name="'+filterName+'" data-from="1" data-id="'+o.geonameid+'" data-type="2">'+o.name+', '+o.country.name+'</li>';
                });
            }
            _.each(results.countries, function (o, id) {
                items += '<li class="select-option" data-name="'+filterName+'" data-from="10" data-id="'+o.geonameid+'" data-type="0">'+o.name+'</li>';
            });
            return items;
        },
        show: function (event) {
            if(event.target.showed || event.target.results.innerHTML == '') {
                return false;
            }
            event.target.results.style.display = 'block';
            event.target.showed = true;
            var T = this;
            window.requestAnimationFrame(function () {
                event.target.parentNode.classList.add('field--focus');
                setTimeout(function () {
                    document.body.addEventListener('click', function (e) {
                        if(e.target != event.target) {
                            T.hide(event);
                            document.body.removeEventListener('click', arguments.callee);
                        }
                    });
                }, 100);
            });
        },
        hide: function (event) {
            if(!event.target.showed) {
                return false;
            }
            event.target.parentNode.classList.remove('field--focus');
            event.target.results.addEventListener('transitionend', function(e) {
                event.target.results.removeEventListener('transitionend', arguments.callee);
                event.target.results.style.display = 'none';
                event.target.showed = false;
            });
        }
    },
    usernameSuggest: {
        init: function (input) {
            if(!input) {return false;}
            var T = this;
            var P = KYB.discovery;
            var results = document.createElement('div');

            var blockKeyup = false;
            input.addEventListener('keydown', function (event) {
                if(event.which === 13) {
                    event.preventDefault();
                    blockKeyup = true;
                    var h = results.getElementsByClassName('hover')[0];
                    if(h) {
                        T.select(h, event.target);
                    } else {
                        T.select(results.querySelector('.select-option'), event.target);
                    }
                    P.dropdownSelect.hide(event);
                    input.blur();
                } else if(event.which === 38) {
                    event.preventDefault();
                    blockKeyup = true;
                    P.dropdownSelect.hover(results, -1);
                } else if(event.which === 40) {
                    event.preventDefault();
                    blockKeyup = true;
                    P.dropdownSelect.hover(results, 1);
                } else if(event.which === 27) {
                    blockKeyup = true;
                    setTimeout(function () {
                        T.hide(event);
                        input.blur();
                    });
                }
            });
            input.addEventListener('keyup', function(event) {
                if(!blockKeyup) {
                    T.searchEvent(event);
                }
                blockKeyup = false;
            });

            input.addEventListener('focus', function (event) {
                P.dropdownSelect.show(event);
            });

            results.setAttribute('class', 'discovery-autocomplete-list');
            results.addEventListener('click', function (event) {
                var target = event.target.tagName == 'LI' ? event.target : event.target.tagName == 'SMALL' ? event.target.parentNode : false;
                if(target) {
                    T.select(target, input);
                }
            });

            /*input.previousElementSibling.addEventListener('change', function (e) {
                input.value = e.target.value ? KYB.discovery.filterParams['audience_location'].list[e.target.value] : '';
            });*/

            input.parentNode.appendChild(results);
            input.results = results;
        },
        searchEvent: function (e) {
            e.preventDefault();
            var T = this;
            var P = KYB.discovery;
            if(!this.reqT) {
                this.reqT = setTimeout(function () {
                    var s = e.target.value.trim();
                    if(s && s!=='') {
                        //$results.addClass('preload');
                        T.getSuggest(s, function (resp, string) {
                            resp.unshift(T.firstSuggestAsRequest(string));
                            var html = T.render(resp);
                            if(html != '') {
                                e.target.results.innerHTML = '<ul class="select-list">'+html+'</ul>';
                                P.dropdownSelect.show(e);
                            } else {
                                P.dropdownSelect.hide(e);
                            }
                            //$results.removeClass('preload');
                        });
                    }
                    T.reqT = false;
                }, 200);
            }
            var s = e.target.value.trim();
            if(s === '') {
                //$results.empty().removeClass('preload');
                 e.target.results.innerHTML = '';
                if(this.reqT) {
                    clearTimeout(this.reqT);
                    this.reqT = false;
                }
                if(this.xhr) {
                    this.xhr.abort();
                }
            } else {
                e.target.results.innerHTML = '<ul class="select-list">'+T.firstSuggestAsRequest(s).el+'</ul>';
                P.dropdownSelect.show(e);
            }
        },
        firstSuggestAsRequest: function(string) {
            return {
                el: '<li class="select-option" data-value="'+string+'"><div class="kyb-suggest-avatar"><i class="far fa-search">&#xf002;</i></div>@'+string+' <small>Press "Enter" to request</small></li>'
            };
        },
        getSuggest: function (string, callback) {
            var T = this;
            if (this.xhr) {
                this.xhr.abort();
            }
            //var s = KYB.instagramCleanName(string);
            var p = {search: string, st: KYB.discovery.st};
            this.xhr = KYB.get(KYB.baseUrl+'suggest/', p).then(function (resp) {
                if (callback) {
                    var list = resp.list;
                    callback(list, string);
                }
                //T.xhr = false;
            }, function (status) {
                //T.xhr = false;
            });
        },
        render: function (results) {
            var items = '';
            _.each(results, function (o) {
                if(o.el) {
                    items += o.el;
                } else {
                    items += '<li class="select-option" data-value="'+o.username+'"><img src="'+o.avatar_url+'" class="kyb-suggest-avatar">@'+o.username+' <small>'+o.full_name+'</small></li>';
                }
            });
            return items;
        },
        select: function(target, input) {
            if(!target) {
                return false;
            }
            KYB.discovery.mentions.add(target.dataset.value);
            input.value = '';
            input.results.innerHTML = '';
            input.focus();
        },
    },
    dropdownSelect: {
        hover: function(list, d) {
            var curr = list.getElementsByClassName('hover')[0];
            var items = list.getElementsByClassName('select-option');
            if(!items.length) {return false;}
            if(!curr) {
                var index = -1;
            } else {
                var index = _.indexOf(items, curr);
                curr.classList.remove('hover');
            }
            var newIndex = index+d;
            if(newIndex<0) {
                newIndex = 0;
            } else if(newIndex > items.length-1) {
                newIndex = items.length-1;
            }
            items[newIndex].classList.add('hover');
        },
        show: function (event) {
            if(event.target.showed || event.target.results.innerHTML == '') {
                return false;
            }
            event.target.results.style.display = 'block';
            event.target.showed = true;
            var T = this;
            window.requestAnimationFrame(function () {
                event.target.parentNode.classList.add('field--focus');
                //setTimeout(function () {
                    document.body.addEventListener('click', function (e) {
                        if(e.target != event.target) {
                            T.hide(event);
                            document.body.removeEventListener('click', arguments.callee);
                        }
                    });
                //}, 100);
            });
        },
        hide: function (event) {
            if(!event.target.showed) {
                return false;
            }
            event.target.parentNode.classList.remove('field--focus');
            if(event.target.results.innerHTML == '') {
                event.target.results.style.display = 'none';
                event.target.showed = false;
            } else {
                event.target.results.addEventListener('transitionend', function(e) {
                    event.target.results.removeEventListener('transitionend', arguments.callee);
                    event.target.results.style.display = 'none';
                    event.target.showed = false;
                });
            }
        }
    }
};
