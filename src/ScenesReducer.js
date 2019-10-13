import { shallowEqual } from '../../utils';
import { getRouteKey } from './NavigationUtils';

function compareKey(one, two) {
  const delta = one.length - two.length;
  if (delta > 0) {
    return 1;
  }
  if (delta < 0) {
    return -1;
  }
  return one > two ? 1 : -1;
}

function compareScenes(one, two) {
  if (one.index > two.index) {
    return 1;
  }
  if (one.index < two.index) {
    return -1;
  }

  if (one.isStale !== two.isStale) {
    return one.isStale ? 1 : -1;
  }

  return compareKey(one.key, two.key);
}

/**
 * Whether two scenes are the same.
 * 不比较scene.config 因为config 是 Navigation 内部使用 SceneView不需要知道其细节
 */
function areScenesShallowEqual(one, two) {
  return (
    one.key === two.key &&
    one.index === two.index &&
    one.isStale === two.isStale &&
    one.isActive === two.isActive &&
    areRoutesShallowEqual(one.route, two.route)
  );
}

/**
 * Whether two routes are the same.
 */
function areRoutesShallowEqual(one, two) {
  if (!one || !two) {
    return one === two;
  }

  if (one.key !== two.key) {
    return false;
  }

  return shallowEqual(one, two);
}

// 控制ScenesReducer 是否去除非必要的stale scene (只保留之前为active 的 stable scene)
const REMOVE_UNNECESSARY_STALE_SCENE = true;

/**
 * 通过当前 scenes 与 nextState 得到新的 scenes
 * @param scenes 当前scenes
 * @param nextState 新的navigationState
 * @param outInfo: Object 输出信息 { prevActiveScene, activeScene } 如果给出这个参数则可以得到额外信息
 * @return 新的scenes
 */
export default function ScenesReducer(scenes, nextState, outInfo) {
  let i;
  let scene;
  const scenesMap = Object.create(null);
  for (i = scenes.length - 1; i > -1; --i) {
    scene = scenes[i];
    scenesMap[scene.key] = scene;
  }

  const nextScenes = [];
  let prevActiveScene;
  let activeScene;

  const routes = nextState.routes;
  const nextIndex = nextState.index;
  let route;
  let key;
  let prevScene;
  let nextScene;
  for (i = routes.length - 1; i > -1; --i) {
    route = routes[i];
    key = getRouteKey(route);
    prevScene = scenesMap[key];
    delete scenesMap[key];
    nextScene = {
      ...prevScene, // 继承原scene 属性
      index: i,
      isActive: i === nextIndex,
      isStale: false,
      key,
      route,
    };
    if (prevScene) {
      if (areScenesShallowEqual(prevScene, nextScene)) {
        nextScene = prevScene;
      }
      if (prevScene.isActive) {
        prevActiveScene = nextScene;
      }
    }
    if (nextScene.isActive) {
      activeScene = nextScene;
    }
    nextScenes[i] = nextScene;
  }

  // stale
  // eslint-disable-next-line
  for (const staleKey in scenesMap) {
    scene = scenesMap[staleKey];
    if (!scene.isStale || scene.isActive) {
      nextScene = {
        ...scene,
        index: scene.index,
        key: scene.key,
        route: scene.route,
        isActive: false,
        isStale: true,
      };
      if (scene.isActive) {
        prevActiveScene = nextScene;
      }
    } else {
      nextScene = scene;
    }
    if (REMOVE_UNNECESSARY_STALE_SCENE) {
      if (scene.isActive) {
        nextScenes.push(nextScene);
      }
    } else {
      nextScenes.push(nextScene);
    }
  }

  // sort
  nextScenes.sort(compareScenes);

  if (outInfo) {
    outInfo.activeScene = activeScene;
    outInfo.prevActiveScene = prevActiveScene;
  }

  if (nextScenes.length !== scenes.length) {
    return nextScenes;
  }
  for (i = scenes.length - 1; i > -1; --i) {
    if (!areScenesShallowEqual(scenes[i], nextScenes[i])) {
      return nextScenes;
    }
  }
  // scenes haven't changed.
  return scenes;
}
