let routeKeyNumber = 1;

/**
 * 获取route.key 如果不存在则会生成一个唯一的
 */
export function getRouteKey(route) {
  if (!route.key) {
    route.key = String(routeKeyNumber++);
  }
  return route.key;
}

export const prepareRouteKey = getRouteKey;

export function calcAnimatorScenes(scenes, transitionProps) {
  let beforeActiveScene; // 0
  let activeScene; // 1
  let afterActiveScene; // 2
  let currentIndex = 1; // 当前可见scene index 上面三个值中的一个
  const prevActiveScene = transitionProps && transitionProps.prevActiveScene;
  let scene;
  for (let i = scenes.length - 1; i >= 0; --i) {
    scene = scenes[i];
    if (!activeScene) {
      if (scene.isActive) {
        activeScene = scene;
      } else if (scene === prevActiveScene) {
        afterActiveScene = scene;
        currentIndex = 2;
      }
    } else if (!afterActiveScene) {
      if (scene === prevActiveScene) {
        beforeActiveScene = scene;
        currentIndex = 0;
      } else if (!beforeActiveScene && !scene.isStale) {
        // 用于GestureResponder
        beforeActiveScene = scene;
      }
    }
  }
  if (transitionProps && !prevActiveScene && activeScene) {
    // scenes 从空到有的情况
    beforeActiveScene = null;
    currentIndex = 0;
  }
  return {
    0: beforeActiveScene,
    1: activeScene,
    2: afterActiveScene,
    currentIndex,
  };
}
