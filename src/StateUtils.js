const StateUtils = {
  push(state, route) {
    const index = state.index + 1;
    const routes = state.routes.slice(0, index);
    routes.push(route);
    return {
      routes,
      index,
    };
  },

  replace(state, route) {
    const routes = state.routes.slice();
    routes[state.index] = route;
    return {
      routes,
      index: state.index,
    };
  },

  pop(state, popFirst) {
    const index = state.index - 1;
    if (popFirst ? index < -1 : index < 0) {
      // if (__DEV__) {
      //   console.warn('pop state.index:', state.index, 'popFirst:', popFirst);
      // }
      return state;
    }
    return {
      routes: state.routes.slice(0, index + 1),
      index,
    };
  },

  popBack(state, n) {
    const index = state.index - n;
    if (index < 0) {
      if (__DEV__) {
        console.warn('popBack index < 0 state.index:', state.index, 'n:', n);
      }
      return state;
    }
    return {
      routes: state.routes.slice(0, index + 1),
      index,
    };
  },

  popToTop(state) {
    if (state.routes.length < 2) {
      return state;
    }
    return {
      routes: state.routes.slice(0, 1),
      index: 0,
    };
  },

  popToRoute(state, route) {
    const index = state.routes.indexOf(route);
    if (index < 0) {
      if (__DEV__) {
        console.warn('popToRoute route不存在!');
      }
      return state;
    }
    return {
      routes: state.routes.slice(0, index + 1),
      index,
    };
  },

  popById(state, id, include) {
    let index = state.routes.length - 1;
    for (; index >= 0; --index) {
      if (state.routes[index].id === id) {
        if (include) {
          --index;
        }
        break;
      }
    }
    if (index < 0) {
      if (__DEV__) {
        // 也可能id 是第一个且include = true
        console.warn('popById id:', id, 'include:', include, 'index:', index);
      }
      return state;
    }
    return {
      routes: state.routes.slice(0, index + 1),
      index,
    };
  },

  replaceAtIndex(state, route, i) {
    if (i < 0 || state.routes.length <= i) {
      if (__DEV__) {
        console.warn(
          'replaceAtIndex i < 0 || state.routes.length <= i',
          i,
          'state.routes.length:',
          state.routes.length
        );
      }
      return state;
    }
    const routes = state.routes.slice();
    routes[i] = route;
    return {
      routes,
      index: state.index,
    };
  },

  replacePrevious(state, route) {
    return this.replaceAtIndex(state, route, state.index - 1);
  },

  replacePreviousAndPop(state, route) {
    if (state.index < 1) {
      if (__DEV__) {
        console.warn('replacePreviousAndPop state.index < 1');
      }
      return state;
    }
    const index = state.index - 1;
    const routes = state.routes.slice(0, index + 1);
    routes[index] = route;
    return {
      routes,
      index,
    };
  },

  reset(state, routes, index) {
    return {
      routes,
      index: index == null ? routes.length - 1 : index,
    };
  },
};

export default StateUtils;
