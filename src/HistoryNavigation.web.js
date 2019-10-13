import PropTypes from 'prop-types';
import React, { Component } from 'react';
import Navigation from './Navigation';
import StateUtils from './StateUtils';
import { definePrivateProperty } from '../../utils';

/**
 * Navigation 与 history 结合
 * 问题:
 * 目前发现 在4.4android上 页面加载完成之后会触发一次popstate，其url就是当前页面的url
 */
export default class HistoryNavigation extends Component {
  static propTypes = {
    /**
     * history对象
     */
    history: PropTypes.object.isRequired,

    /**
     * route 转 history location
     * (route) => location
     */
    routeToLocation: PropTypes.func.isRequired,

    /**
     * history location 转 route
     * (location) => route
     * 返回null 表示location 没有对应的route 此时Navigation 不会做处理
     */
    locationToRoute: PropTypes.func.isRequired,

    navigationRef: PropTypes.func,
  };

  constructor(props, context) {
    super(props, context);
    // history 参数改变无效
    this._history = props.history;
    this._navigationRef = this._navigationRef.bind(this);
  }

  componentWillMount() {
    // 同步浏览器history与初始堆栈
    const navigationState = this.props.initialNavigationState;
    for (let i = 0; i <= navigationState.index; ++i) {
      if (i === 0) {
        this._history.replace(this._routeToLocation(navigationState.routes[i]));
      } else {
        this._history.push(this._routeToLocation(navigationState.routes[i]));
      }
    }

    this._unListenHistory = this._history.listen(
      this._handleHistoryChange.bind(this)
    );
  }

  componentDidMount() {}

  componentWillUnmount() {
    this._unListenHistory();
    this.props.navigationRef && this.props.navigationRef(null);
  }

  getNavigationState() {
    return this._navigation.getNavigationState();
  }

  updateNavigationState(navigationState, config) {
    this._navigation.updateNavigationState(navigationState, config);
  }

  push(route) {
    this._history.push(this._routeToLocation(route));
    this._updateByAction('push', route);
  }

  replace(route) {
    this._history.replace(this._routeToLocation(route));
    this._updateByAction('replace', route);
  }

  popBack(n) {
    if (n <= 0) {
      if (__DEV__) {
        console.warn('popBack n <= 0', n);
      }
      return;
    }
    this._history.go(-n);
  }

  replaceAtIndex(route, i) {
    const state = this.getNavigationState();
    if (i < 0 || state.routes.length <= i) {
      if (__DEV__) {
        console.warn(
          'replaceAtIndex i < 0 || state.routes.length <= i',
          i,
          'state.routes.length:',
          state.routes.length
        );
      }
      return;
    }
    this._routeToLocation(
      route,
      getLocationKey(this._routeToLocation(state.routes[i])),
      true
    );
    this._updateByAction('replaceAtIndex', route, i);
  }

  reset(routes) {
    for (let i = 0; i < routes.length; ++i) {
      this._history.push(this._routeToLocation(routes[i]));
    }
    this._updateByAction('reset', routes);
  }

  _navigationRef(navigation) {
    if (navigation) {
      this.props.navigationRef && this.props.navigationRef(this);
    }
    this._navigation = navigation;
  }

  _handleHistoryChange(location, action) {
    if (action !== 'POP') {
      return;
    }
    // 只处理POP history.go() 以及 浏览器前进后退都属于POP
    const locationKey = getLocationKey(location);
    if (!locationKey) {
      // 对不存在locationKey (不是由本类产生的location) 的不做处理
      return;
    }
    if (!this._navigation) {
      return;
    }

    const navigationState = this._navigation.getNavigationState();
    const routes = navigationState.routes;
    for (let i = 0; i < routes.length; ++i) {
      if (getLocationKey(this._routeToLocation(routes[i])) === locationKey) {
        if (this._routeToLocation(routes[i]).key !== location.key) {
          // pop 目标的route 已被replaceAtIndex 执行延迟replace
          this._history.replace(this._routeToLocation(routes[i]));
        }
        this._navigation.updateNavigationState({
          routes: routes.slice(0, i + 1),
          index: i,
        });
        return;
      }
    }

    // 不存在目标route 可能是浏览器前进、history.go(n) 或者浏览器history 堆栈与routes不一致
    // 统一当成resetTo
    const targetRoute = this._locationToRoute(location);
    if (targetRoute) {
      this._navigation.updateNavigationState({
        routes: [targetRoute],
        index: 0,
      });
    }
  }

  /**
   * 获取route 对应的location
   */
  _routeToLocation(route, locationKey, refreshCache) {
    if (!refreshCache && route.__location) {
      return route.__location;
    }
    const location = this.props.routeToLocation(route);
    location.state = {
      ...location.state,
      __locationKey: locationKey || generateLocationKey(),
    };
    definePrivateProperty(route, '__location', location);
    return location;
  }

  _locationToRoute(location) {
    const route = this.props.locationToRoute(location);
    if (route && !route.__location) {
      definePrivateProperty(route, '__location', location);
    }
    return route;
  }

  _updateByAction(action, ...args) {
    args.unshift(this._navigation.getNavigationState());
    const nextState = StateUtils[action](...args);
    this._navigation.updateNavigationState(nextState);
  }

  render() {
    return <Navigation {...this.props} navigationRef={this._navigationRef} />;
  }
}

const locationKeyPrefix = Math.random()
  .toString(36)
  .slice(2, 10);
let _number = 0;

function generateLocationKey() {
  return locationKeyPrefix + _number++;
}

function getLocationKey(location) {
  return location.state && location.state.__locationKey;
}
