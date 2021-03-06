var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
System.register("src/services/breadcrumb.service", ['@angular/core', '@angular/router', 'rxjs/Rx'], function(exports_1, context_1) {
    "use strict";
    var __moduleName = context_1 && context_1.id;
    var core_1, router_1, Rx_1;
    var NavigationStatus, BreadCrumbService;
    return {
        setters:[
            function (core_1_1) {
                core_1 = core_1_1;
            },
            function (router_1_1) {
                router_1 = router_1_1;
            },
            function (Rx_1_1) {
                Rx_1 = Rx_1_1;
            }],
        execute: function() {
            /**
             * Enum to define current navigation status
             */
            (function (NavigationStatus) {
                /**
                 * NavigationStart event
                 * @type {number}
                 */
                NavigationStatus[NavigationStatus["START"] = 1] = "START";
                /**
                 * Routes recognized event
                 * @type {number}
                 */
                NavigationStatus[NavigationStatus["ROUTES_RECOGNIZED"] = 2] = "ROUTES_RECOGNIZED";
                /**
                 * NavigationEnd event
                 * @type {number}
                 */
                NavigationStatus[NavigationStatus["END"] = 3] = "END";
            })(NavigationStatus || (NavigationStatus = {}));
            /**
             * Main breadcrumb services.
             * Used to subscribe to router events and return names for desired paths and routes.
             * Should be properly to configured to use advanced features
             */
            BreadCrumbService = (function () {
                /**
                 * Service constructor.
                 * Subscribes to router events
                 * @param _router Application router
                 */
                function BreadCrumbService(_router) {
                    var _this = this;
                    this._router = _router;
                    /**
                     * Current breadcrumb trail subject
                     * @type {Subject<string[]>}
                     * @private
                     */
                    this._trail = new Rx_1.Subject();
                    /**
                     * Current route
                     * @type {string}
                     * @private
                     */
                    this._currentRoute = '';
                    /**
                     * Map to save route config by the route's name
                     * @type {Map<string, IBreadCrumbRouteConfig>}
                     * @private
                     */
                    this._routeConfig = new Map();
                    /**
                     * Additional map to save route config by the route's regexp
                     * @type {Map<RegExp, IBreadCrumbRouteConfig>}
                     * @private
                     */
                    this._routeRegExpConfig = new Map();
                    this._router.events
                        .do(function (evt) {
                        switch (true) {
                            case (evt instanceof router_1.NavigationStart):
                                _this._currentNavigationStatus = NavigationStatus.START;
                                break;
                            case (evt instanceof router_1.RoutesRecognized):
                                _this._currentNavigationStatus = NavigationStatus.ROUTES_RECOGNIZED;
                                break;
                            case (evt instanceof router_1.NavigationEnd):
                                _this._currentNavigationStatus = NavigationStatus.END;
                                break;
                        }
                    })
                        .filter(function (evt) { return evt instanceof router_1.NavigationEnd; })
                        .subscribe(function (evt) {
                        _this._currentRoute = evt.urlAfterRedirects || evt.url;
                        _this._trail.next(_this._generateBreadcrumbTrail(_this._currentRoute));
                    });
                }
                Object.defineProperty(BreadCrumbService.prototype, "trail", {
                    /**
                     * Trail getter.
                     * Returns the current trail as an Observable that you have to subscribe to.
                     * Will fire every time the trail changes with new trail values
                     * @returns {Observable<R>} Observable which will be resolved new trail values
                     */
                    get: function () {
                        return this._trail
                            .asObservable()
                            .map(function (urls) { return [].concat(urls); });
                    },
                    enumerable: true,
                    configurable: true
                });
                /**
                 * Configure route method.
                 * Used to configure one path
                 * @param config configuration object which implements IBreadCrumbRouteConfig
                 */
                BreadCrumbService.prototype.configureRoute = function (config) {
                    var _this = this;
                    if (config.children) {
                        config.children.forEach(function (childConfig) {
                            if (config.path instanceof RegExp || childConfig.path instanceof RegExp) {
                                throw new Error('RegExp route config does not support child routes!');
                            }
                            else {
                                childConfig.path = "" + config.path + childConfig.path;
                            }
                            _this.configureRoute(childConfig);
                        });
                    }
                    var route = config.path;
                    if (typeof (route) === 'string' && route.indexOf('*') !== -1) {
                        route = new RegExp('^' + route.replace(/\*/g, '(?:[^\/]*)') + '$');
                        config.path = route;
                    }
                    if (typeof (route) === 'string') {
                        this._routeConfig.set(route, config);
                    }
                    else {
                        this._routeRegExpConfig.set(route, config);
                    }
                };
                /**
                 * Configure routes method.
                 * Used to configure more than one route. Accepts array of IBreadCrumbRouteConfig
                 * @param routes Array of objects which implement IBreadCrumbRouteConfig
                 */
                BreadCrumbService.prototype.configure = function (routes) {
                    var _this = this;
                    routes.forEach(function (config) { return _this.configureRoute(config); });
                };
                /**
                 * This methods returns the desired route name as an Observable you will have to subscribe to
                 * @param route Route to get the name of
                 * @returns {Observable<any>} Observable which will be resolved with the route's name
                 */
                BreadCrumbService.prototype.getRouteName = function (route) {
                    var config = this._findRouteConfig(route);
                    switch (true) {
                        // if no config or no name, we'll generate the name
                        case !config || !config.name:
                            return Rx_1.Observable.of(this._generateDefaultRouteName(route));
                        // if name is a string, return an Observable
                        case typeof (config.name) === 'string':
                            config.name = Rx_1.Observable.of(config.name);
                            break;
                        // if name is a function, return an Observable from callback
                        case typeof (config.name) === 'function':
                            var callback_1 = config.name;
                            config.name = Rx_1.Observable.create(function (observer) { return observer.next(callback_1(route)); });
                            break;
                        // convert subject to observable (applies to EventEmitter as well)
                        case config.name instanceof Rx_1.Subject:
                        case config.name instanceof core_1.EventEmitter:
                            config.name = config.name.asObservable();
                            break;
                        // convert promise to observable
                        case config.name instanceof Promise:
                            config.name = Rx_1.Observable.fromPromise(config.name);
                            break;
                    }
                    return config.name;
                };
                /**
                 * Check if the route is hidden
                 * @param route Route to check
                 * @returns {boolean} true if hidden, false if not
                 */
                BreadCrumbService.prototype.isRouteHidden = function (route) {
                    var config = this._findRouteConfig(route);
                    return !!(config && config.hidden);
                };
                /**
                 * Private method to find the route config in one of two maps
                 * @param route Route, which config we need to find
                 * @returns {IBreadCrumbRouteConfig} Config object which implements IBreadCrumbRouteConfig
                 * @private
                 */
                BreadCrumbService.prototype._findRouteConfig = function (route) {
                    var config;
                    config = this._routeConfig.get(route);
                    if (!config) {
                        // TS' ES5 target does not support for of Map, so we use the hard way...
                        // It is better than Map.forEach, because we can break
                        var iterator = this._routeRegExpConfig.keys();
                        var value = iterator.next();
                        while (!value.done) {
                            var re = value.value;
                            if (re.test(route)) {
                                config = this._routeRegExpConfig.get(re);
                                break;
                            }
                            else {
                                value = iterator.next();
                            }
                        }
                    }
                    return config;
                };
                /**
                 * Private method which generates breadcrumb trail
                 * @param url Current location url
                 * @returns {string[]} Array of strings, which represent the current breadcrumb trail
                 * @private
                 */
                BreadCrumbService.prototype._generateBreadcrumbTrail = function (url) {
                    var urls = [];
                    while (url.lastIndexOf('/') >= 0) {
                        if (!this.isRouteHidden(url)) {
                            urls.unshift(url);
                        }
                        url = url.substr(0, url.lastIndexOf('/'));
                    }
                    return urls;
                };
                /**
                 * Default route name generator.
                 * If path is not configured, then the path name is taken and the first character is capitalized.
                 * For example: '/first' -> 'First', '/first/second' -> 'Second', etc
                 * @param url Url to generate the name for
                 * @returns {string|any} Generated name
                 * @private
                 */
                BreadCrumbService.prototype._generateDefaultRouteName = function (url) {
                    var name;
                    name = url.substr(url.lastIndexOf('/'), url.length).replace(/^\//, '');
                    name = name.replace(/^\w/, name.charAt(0).toUpperCase());
                    return name;
                };
                BreadCrumbService = __decorate([
                    core_1.Injectable(), 
                    __metadata('design:paramtypes', [router_1.Router])
                ], BreadCrumbService);
                return BreadCrumbService;
            }());
            exports_1("BreadCrumbService", BreadCrumbService);
        }
    }
});
System.register("src/components/breadcrumb.component", ['@angular/core', "src/services/breadcrumb.service"], function(exports_2, context_2) {
    "use strict";
    var __moduleName = context_2 && context_2.id;
    var core_2, breadcrumb_service_1;
    var BreadCrumbComponentMetadata, BreadCrumbComponent;
    return {
        setters:[
            function (core_2_1) {
                core_2 = core_2_1;
            },
            function (breadcrumb_service_1_1) {
                breadcrumb_service_1 = breadcrumb_service_1_1;
            }],
        execute: function() {
            /**
             * Component metadata class.
             * This class can be extended and then use to extend the built-in component
             */
            BreadCrumbComponentMetadata = (function () {
                function BreadCrumbComponentMetadata() {
                    /**
                     * Standard angular selector property. Change to whatever you desire
                     * @type {string}
                     */
                    this.selector = 'ng-reactive-breadcrumb';
                    /**
                     * Standard Angular template property. Change to whatever you desire
                     * @type {string}
                     */
                    this.template = "\n        <ol class=\"breadcrumb\">\n            <li *ngFor=\"let url of urls; let last = last\" [ngClass]=\"{'active': last}\">\n                <a role=\"button\" *ngIf=\"!last\" [routerLink]=\"url\">\n                    {{getRouteName(url) | async}}\n                </a>\n                <span *ngIf=\"last\">\n                    {{getRouteName(url) | async}}\n                </span>\n            </li>\n        </ol>\n    ";
                }
                return BreadCrumbComponentMetadata;
            }());
            exports_2("BreadCrumbComponentMetadata", BreadCrumbComponentMetadata);
            /**
             * Breadcrumb component.
             * Simple built-in component to render breadcrumb trail
             */
            BreadCrumbComponent = (function () {
                /**
                 * Component constructor. Subscribes to the breadcrumb trail
                 * @param _breadCrumbService BreadCrumb service which will fire trail changes
                 */
                function BreadCrumbComponent(_breadCrumbService) {
                    var _this = this;
                    this._breadCrumbService = _breadCrumbService;
                    /**
                     * Input property which limits the trail to the minimum number of entries to fill in the urls property
                     * @type {number}
                     */
                    this.min = 0;
                    this._subscription = this._breadCrumbService.trail
                        .subscribe(function (urls) {
                        _this.urls = urls.length >= _this.min ? urls : [];
                    });
                }
                /**
                 * Method allows to receive a route name
                 * @param url Route(Path) to receive the name of
                 * @returns {Observable<any>} Name as an Observable which you will have to subscribe to
                 */
                BreadCrumbComponent.prototype.getRouteName = function (url) {
                    return this._breadCrumbService.getRouteName(url);
                };
                /**
                 * Destroy method. Unsubscribes from the breadcrumb trail
                 */
                BreadCrumbComponent.prototype.ngOnDestroy = function () {
                    this._subscription.unsubscribe();
                };
                __decorate([
                    core_2.Input(), 
                    __metadata('design:type', Number)
                ], BreadCrumbComponent.prototype, "min", void 0);
                BreadCrumbComponent = __decorate([
                    core_2.Component(new BreadCrumbComponentMetadata()), 
                    __metadata('design:paramtypes', [breadcrumb_service_1.BreadCrumbService])
                ], BreadCrumbComponent);
                return BreadCrumbComponent;
            }());
            exports_2("BreadCrumbComponent", BreadCrumbComponent);
        }
    }
});
System.register("src/ng-reactive-breadcrumb", ['@angular/core', '@angular/platform-browser', '@angular/common', '@angular/router', "src/components/breadcrumb.component", "src/services/breadcrumb.service"], function(exports_3, context_3) {
    "use strict";
    var __moduleName = context_3 && context_3.id;
    var core_3, platform_browser_1, common_1, router_2, breadcrumb_component_1, breadcrumb_service_2;
    var NgReactiveBreadCrumbModule;
    var exportedNames_1 = {
        'NgReactiveBreadCrumbModule': true
    };
    function exportStar_1(m) {
        var exports = {};
        for(var n in m) {
            if (n !== "default"&& !exportedNames_1.hasOwnProperty(n)) exports[n] = m[n];
        }
        exports_3(exports);
    }
    return {
        setters:[
            function (core_3_1) {
                core_3 = core_3_1;
            },
            function (platform_browser_1_1) {
                platform_browser_1 = platform_browser_1_1;
            },
            function (common_1_1) {
                common_1 = common_1_1;
            },
            function (router_2_1) {
                router_2 = router_2_1;
            },
            function (breadcrumb_component_1_1) {
                breadcrumb_component_1 = breadcrumb_component_1_1;
                exportStar_1(breadcrumb_component_1_1);
            },
            function (breadcrumb_service_2_1) {
                breadcrumb_service_2 = breadcrumb_service_2_1;
                exportStar_1(breadcrumb_service_2_1);
            }],
        execute: function() {
            NgReactiveBreadCrumbModule = (function () {
                function NgReactiveBreadCrumbModule() {
                }
                NgReactiveBreadCrumbModule = __decorate([
                    core_3.NgModule({
                        imports: [
                            platform_browser_1.BrowserModule,
                            common_1.CommonModule,
                            router_2.RouterModule.forChild([])
                        ],
                        declarations: [
                            breadcrumb_component_1.BreadCrumbComponent
                        ],
                        providers: [
                            breadcrumb_service_2.BreadCrumbService
                        ],
                        exports: [
                            breadcrumb_component_1.BreadCrumbComponent
                        ]
                    }), 
                    __metadata('design:paramtypes', [])
                ], NgReactiveBreadCrumbModule);
                return NgReactiveBreadCrumbModule;
            }());
            exports_3("NgReactiveBreadCrumbModule", NgReactiveBreadCrumbModule);
        }
    }
});
System.register("ng-reactive-breadcrumb", ["src/ng-reactive-breadcrumb"], function(exports_4, context_4) {
    "use strict";
    var __moduleName = context_4 && context_4.id;
    function exportStar_2(m) {
        var exports = {};
        for(var n in m) {
            if (n !== "default") exports[n] = m[n];
        }
        exports_4(exports);
    }
    return {
        setters:[
            function (ng_reactive_breadcrumb_1_1) {
                exportStar_2(ng_reactive_breadcrumb_1_1);
            }],
        execute: function() {
        }
    }
});
//# sourceMappingURL=ng-reactive-breadcrumb.js.map