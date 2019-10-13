import ReactDOM from 'react-dom';
import { calcAnimatorScenes } from './NavigationUtils';
import { DEBUG } from './Constants';

const WILL_SHOW_STYLE = {
  opacity: 0,
};
const ANIMATION_DURATION = 371;

export default class Animator {
  constructor(navigation) {
    this._navigation = navigation;
  }

  /**
   * animationProp: {
   *   style,
   *   sceneView,
   *   isVisible,
   * }
   */
  prepareAnimationProp(scenes, layout, transitionProps) {
    const isInTransition = !!transitionProps;
    if (this._scenes === scenes && this._isInTransition === isInTransition) {
      return;
    }
    this._scenes = scenes;
    this._isInTransition = isInTransition;

    const transitionScenes = calcAnimatorScenes(scenes, transitionProps);
    for (let i = scenes.length - 1; i >= 0; --i) {
      const animationProp = getSceneAnimationProp(scenes[i]);
      if (animationProp) {
        animationProp.isVisible = false;
      }
    }

    const currentIndex = transitionScenes.currentIndex;

    this._nextAnimationScene = undefined;
    this._isEnterAnimation = null;
    this._prepareSceneAnimationProp(
      2,
      transitionScenes[2],
      currentIndex,
      isInTransition
    );
    this._prepareSceneAnimationProp(
      1,
      transitionScenes[1],
      currentIndex,
      isInTransition
    );
    this._prepareSceneAnimationProp(
      0,
      transitionScenes[0],
      currentIndex,
      isInTransition
    );
  }

  _prepareSceneAnimationProp(
    transitionIndex,
    scene,
    currentIndex,
    isInTransition
  ) {
    if (!scene) {
      return;
    }
    let animationProp = getSceneAnimationProp(scene);
    let isWillShowScene;
    // let willShowAnimationProp;
    if (this._nextAnimationScene === undefined) {
      // 只动画最上层的scene
      if (currentIndex === 1) {
        // 不需要动画
        this._nextAnimationScene = null;
      } else if (scene.isActive) {
        // 将要可见的scene
        // 设置其初始style
        if (!animationProp || !animationProp.style) {
          animationProp = {
            style: WILL_SHOW_STYLE,
          };
        }
        this._nextAnimationScene = scene;
        this._isEnterAnimation = true;
        isWillShowScene = true;
      } else {
        // 将要消失的scene
        this._nextAnimationScene = scene;
        this._isEnterAnimation = false;
      }
    }

    if (!animationProp) {
      animationProp = {};
    }
    if (!isWillShowScene) {
      // 只有willShowScene 才需要style
      // 不需要改变animationProp 防止不必要的刷新
      animationProp.style = null;
    }
    // 0 只有在需要动画时才需要visible pop
    animationProp.isVisible = this._nextAnimationScene || transitionIndex !== 0;
    setSceneAnimationProp(scene, animationProp);
  }

  getAnimationProp(scene) {
    return getSceneAnimationProp(scene);
  }

  isSceneVisible(scene) {
    const animationProp = getSceneAnimationProp(scene);
    return animationProp && animationProp.isVisible;
  }

  startTransitionAnimation(noAnimation) {
    if (__DEV__) {
      if (this._nextAnimationScene === undefined)
        throw new Error(
          'startTransitionAnimation this._nextAnimationScene === undefined'
        );
      if (this._isAnimationRunning)
        throw new Error('startTransitionAnimation isAnimationRunning!!!');
    }

    const onAnimationEnd = () => {
      sceneDOM &&
        sceneDOM.classList.remove(
          this._isEnterAnimation ? 'lrnw-fadein' : 'lrnw-fadeout'
        );
      this._animationTimer = null;
      this._nextAnimationScene = undefined;
      this._isAnimationRunning = false;
      this._navigation._onAnimationEnd();
    };

    if (!this._nextAnimationScene) {
      // 不需要动画
      onAnimationEnd();
      return;
    }

    const animationProp = getSceneAnimationProp(this._nextAnimationScene);
    // eslint-disable-next-line
    const sceneDOM = ReactDOM.findDOMNode(animationProp.sceneView);
    if (!sceneDOM) {
      if (__DEV__ && DEBUG) {
        console.warn(
          'startTransitionAnimation !sceneDOM',
          this._nextAnimationScene
        );
      }
      onAnimationEnd();
      return;
    }
    if (
      !this._isEnterAnimation &&
      this._navigation.props.disableBackAnimation
    ) {
      // 关闭返回动画
      sceneDOM.style.opacity = 0;
      onAnimationEnd();
      return;
    }

    this._isAnimationRunning = true;
    sceneDOM.classList.add(
      this._isEnterAnimation ? 'lrnw-fadein' : 'lrnw-fadeout'
    );
    sceneDOM.style.opacity = this._isEnterAnimation ? 1 : 0;
    this._animationTimer = setTimeout(onAnimationEnd, ANIMATION_DURATION);
  }

  isAnimationRunning() {
    return this._isAnimationRunning;
  }

  getSceneConfig() {
    return null;
  }

  getTransmitterValue() {
    // not support
    return 0;
  }

  setAnimationValue(value) {
    // not support
  }

  startAnimation(config, callback) {
    // not support
  }

  stopAnimation(value) {
    // not support
  }
}

function getSceneAnimationProp(scene) {
  return scene.route.__animationProp;
}

function setSceneAnimationProp(scene, animationProp) {
  // 设置到route 上 使得可以缓存
  Object.defineProperty(scene.route, '__animationProp', {
    enumerable: false,
    configurable: true,
    value: animationProp,
  });
}
