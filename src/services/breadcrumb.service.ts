import { Injectable } from '@angular/core';
import { Router, NavigationEnd, NavigationStart, RoutesRecognized } from '@angular/router';
import { Subject, Observable } from 'rxjs/Rx';

/**
 * Route config interface
 * Used to send the data into configureRoute method
 */
export interface IBreadCrumbRouteConfig {
    path: string | RegExp;
    name?: string | Function | Observable<any>;
    hidden?: boolean;
    children?: IBreadCrumbRouteConfig[];
}

enum NavigationStatus {
    START = 1,
    ROUTES_RECOGNIZED = 2,
    END = 3
}

@Injectable()
export class BreadCrumbService {
    // Current breadcrumb trail subject
    private _trail: Subject<string[]> = new Subject<string[]>();
    // Current route
    private _currentRoute: string = '';
    // Current navigation status
    private _currentNavigationStatus: NavigationStatus;

    // Map to save route config by the route's name
    private _routeConfig: Map<string, IBreadCrumbRouteConfig> = new Map<string, IBreadCrumbRouteConfig>();
    // Additional map to save route config by the route's regexp
    private _routeRegExpConfig: Map<RegExp, IBreadCrumbRouteConfig> = new Map<RegExp, IBreadCrumbRouteConfig>();

    constructor(private _router: Router) {
        this._router.events
            .do(evt => {
                switch (true) {
                    case (evt instanceof NavigationStart):
                        this._currentNavigationStatus = NavigationStatus.START;
                        break;
                    case (evt instanceof RoutesRecognized):
                        this._currentNavigationStatus = NavigationStatus.ROUTES_RECOGNIZED;
                        break;
                    case (evt instanceof NavigationEnd):
                        this._currentNavigationStatus = NavigationStatus.END;
                        break;
                }
            })
            .filter(evt => evt instanceof NavigationEnd)
            .subscribe((evt: NavigationEnd) => {
                this._currentRoute = evt.urlAfterRedirects || evt.url;
                this._trail.next(this._generateBreadcrumbTrail(this._currentRoute));
            });
    }

    get trail(): Observable<string[]> {
        return this._trail
            .asObservable()
            .map(urls => [].concat(urls));
    }

    configureRoute(config: IBreadCrumbRouteConfig) {
        if (config.children) {
            config.children.forEach((childConfig: IBreadCrumbRouteConfig) => {
                if (config.path instanceof RegExp || childConfig.path instanceof RegExp) {
                    throw new Error('RegExp route config does not support child routes!');
                } else {
                    childConfig.path = `${config.path}${childConfig.path}`;
                }
                this.configureRoute(childConfig);
            });
        }

        let route = config.path;

        if (typeof(route) === 'string' && (route as string).indexOf('*') !== -1) {
            route = new RegExp('^' + (route as string).replace(/\*/g, '(?:[^\/]*)') + '$');
            config.path = route;
        }

        if (typeof(route) === 'string') {
            this._routeConfig.set(route as string, config);
        } else {
            this._routeRegExpConfig.set(route as RegExp, config);
        }
    }

    configure(routes: IBreadCrumbRouteConfig[]) {
        routes.forEach(config => this.configureRoute(config));
    }

    getRouteName(route: string): Observable<any> {
        let config: IBreadCrumbRouteConfig = this._findRouteConfig(route);
        if (!config || !config.name) {
            return Observable.of(this._generateDefaultRouteName(route));
        } else if (config.name instanceof Observable) {
            return config.name;
        } else if (typeof (config.name) === 'function') {
            let callback = config.name as (config: IBreadCrumbRouteConfig) => any;
            return Observable.create(observer => observer.next(callback(config)));
        } else {
            return Observable.of(config.name);
        }
    }

    isRouteHidden(route: string): boolean {
        let config: IBreadCrumbRouteConfig = this._findRouteConfig(route);
        return !!(config && config.hidden);
    }

    private _findRouteConfig(route: string): IBreadCrumbRouteConfig {
        let config: IBreadCrumbRouteConfig;
        config = this._routeConfig.get(route);
        if (!config) {
            // TS' ES5 target does not support for of Map, so we use the hard way...
            // It is better than Map.forEach, because we can break
            let iterator = this._routeRegExpConfig.keys();
            let value: IteratorResult<RegExp> = iterator.next();
            while (!value.done) {
                let re = value.value;
                if (re.test(route)) {
                    if (re.test(route)) {
                        config = this._routeRegExpConfig.get(re);
                        break;
                    }
                } else {
                    value = iterator.next();
                }
            }
        }
        return config;
    }

    private _generateBreadcrumbTrail(url: string) {
        let urls: string[] = [];
        while (url.lastIndexOf('/') >= 0) {
            if (!this.isRouteHidden(url)) {
                urls.unshift(url);
            }
            url = url.substr(0, url.lastIndexOf('/'));
        }
        return urls;
    }

    private _generateDefaultRouteName(url: string) {
        let name;
        name = url.substr(url.lastIndexOf('/'), url.length).replace(/^\//, '');
        name = name.replace(/^\w/, name.charAt(0).toUpperCase());
        return name;
    }
}
