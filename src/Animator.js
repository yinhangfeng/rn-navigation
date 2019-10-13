import { Animated } from 'react-native';
import { calcAnimatorScenes } from './NavigationUtils';
import { DEBUG } from './Constants';

const USE_NATIVE_DRIVER = true;

/**
 * TODO prepareAnimationProp 不同的SceneConfig animationStyles 需要使用不同的animationProp配置策略
 * 如FadePopup 只需给最上层的scene 配置animationProp
 * 解决 Popup FadePopup 在透明背景时 hide show 同时触发时的闪烁问题
 * 透明背景 + 堆栈内scene 都可见的情况 除了0 1 2 动画之外还要增加在栈内部不可见到可见 以及栈内部可见到不可见的动画
 */
export default class Animator {
  constructor(navigation) {
    this._navigation = navigation;
    this._transmitterValue = 0;
    // this._transmitter = new Animated.Value(this._transmitterValue); // android native modulo 不是非负的 给一个很大的初始值 防止进入复数区域
    this._nextTransmitterValue = null; // 下一步动画要到达的值
    // this._animationIndex = Animated.modulo(this._transmitter, 3); // 动画index [0, 3]
    // this._animationIndexValue = getModuloValue(this._transmitterValue);
    const animationIndexValue = getModuloValue(this._transmitterValue);
    this._animationIndex = new Animated.Value(animationIndexValue); // 动画index [0, 3]
    this._animationStylesCache = new Map();
    this._sceneConfig = null; // 当前的sceneConfig
    this._animationStyles = null; // 当前animationStyles
    this._isAnimationRunning = false;
    this._scenes = null;
    this._layout = null;

    this._onTransitionAnimationEnd = this._onTransitionAnimationEnd.bind(this);
    // TEST
    if (__DEV__ && DEBUG) {
      this._testListen = () => {
        // this._animationIndex.removeAllListeners();
        this._animationIndex.addListener((arg) => {
          const getStyleString = (i) => {
            let result = ` ${i}:`;
            const style = this._animationStyles[i];
            if (style.transform) {
              const transform0 = style.transform[0];
              if (transform0.translateX) {
                result += ` x:${transform0.translateX.__getValue()}`;
              } else {
                result += ` y:${transform0.translateY.__getValue()}`;
              }
            }
            if (style.opacity) {
              result += ` o:${style.opacity.__getValue()}`;
            }
            return result;
          };
          // eslint-disable-next-line
          console.log(
            'animationIndex:',
            arg.value,
            getStyleString(0),
            getStyleString(1),
            getStyleString(2)
          );
        });
      };
      this._testListen();
    }
  }

  /**
   * render 之前准备 animationProp
   * animationProp: Animation style
   */
  prepareAnimationProp(scenes, layout, transitionProps) {
    // scenes 改变或 layout 改变时需要重新计算
    // 但只有layout 改变且存在 transitionProps 也就是正处于transition 过程中则不计算 防止动画出错
    // 在transition 结束时会重新计算的
    // 支持当前index 不为堆栈最后一个 需要比较transitionScenes  在transitionProps 改变时也需要计算
    const transitionScenes = calcAnimatorScenes(scenes, transitionProps);
    const oldTransitionScenes = this._transitionScenes;
    if (
      oldTransitionScenes &&
      oldTransitionScenes[0] === transitionScenes[0] &&
      oldTransitionScenes[1] === transitionScenes[1] &&
      oldTransitionScenes[2] === transitionScenes[2] &&
      oldTransitionScenes.currentIndex === transitionScenes.currentIndex &&
      (this._layout === layout || transitionProps)
    ) {
      return;
    }
    this._transitionScenes = transitionScenes;
    this._layout = layout;

    for (let i = scenes.length - 1; i >= 0; --i) {
      // 去除原来的animationProp
      scenes[i].animationProp = null;
    }

    const currentIndex = transitionScenes.currentIndex;
    const animationIndexValue = getModuloValue(this._transmitterValue);
    // 先将_sceneConfig 置空 在_prepareSceneAnimationProp 中会使用0 1 2 中最上面的那一个scene 的 config
    this._sceneConfig = null;
    this._prepareSceneAnimationProp(
      2,
      transitionScenes[2],
      currentIndex,
      animationIndexValue
    );
    this._prepareSceneAnimationProp(
      1,
      transitionScenes[1],
      currentIndex,
      animationIndexValue
    );
    this._prepareSceneAnimationProp(
      0,
      transitionScenes[0],
      currentIndex,
      animationIndexValue
    );

    // 计算下一步动画的目标值
    this._nextTransmitterValue = this._transmitterValue - (currentIndex - 1);

    if (__DEV__ && DEBUG) {
      // eslint-disable-next-line
      console.log(
        'prepareAnimationProp transitionScenes:',
        transitionScenes,
        'animationIndexValue:',
        animationIndexValue,
        'transmitterValue:',
        this._transmitterValue,
        'nextTransmitterValue:',
        this._nextTransmitterValue
      );
    }
  }

  _prepareSceneAnimationProp(
    transitionIndex,
    scene,
    currentIndex,
    animationIndexValue
  ) {
    if (!scene) {
      return;
    }

    if (!this._sceneConfig) {
      // 以当前需要animationProp scene 中的最上面一个的sceneConfig 作为当前整个堆栈的sceneConfig
      this._sceneConfig = scene.config;
      this._animationStyles = this._getAnimationStyles(this._sceneConfig);
    }

    if (transitionIndex === currentIndex) {
      this._setSceneAnimationProp(scene, animationIndexValue);
    } else if (transitionIndex > currentIndex) {
      this._setSceneAnimationProp(scene, animationIndexValue + 1);
    } else {
      this._setSceneAnimationProp(scene, animationIndexValue - 1);
    }
  }

  _setSceneAnimationProp(scene, stylesIndex) {
    // eslint-disable-next-line
    stylesIndex = getModuloValue(stylesIndex);
    scene.animationProp = this._animationStyles[stylesIndex];

    if (__DEV__) {
      scene._animationPropIndex = stylesIndex;
    }
  }

  _getAnimationStyles(sceneConfig) {
    // 以createStyles 函数作为缓存的key
    let cachedStyles = this._animationStylesCache.get(sceneConfig.createStyles);
    if (!cachedStyles) {
      cachedStyles = this._animationStylesCache[sceneConfig.key] = {};
    }

    const layout = this._layout;
    if (cachedStyles.layout !== layout) {
      // layout 改变(包括第一次) 更新缓存
      cachedStyles.layout = layout;
      cachedStyles.styles = sceneConfig.createStyles(
        this._animationIndex,
        layout,
        cachedStyles.styles
      );
    }
    return cachedStyles.styles;
  }

  getAnimationProp(scene) {
    return scene.animationProp;
  }

  // XXX 放在这里不是很合适
  isSceneVisible(scene) {
    return !!scene.animationProp;
  }

  _startTiming(config, callback) {
    // 2+ => 3(0)
    // 0(3) => 2
    // 3(0) => 1

    let currentValue;
    let setValue;
    if (config.startValue != null) {
      // 来自GestureResponder
      currentValue = getModuloValue(config.startValue);
      delete config.startValue;
      // 当前value 是确定的 不需要setValue
      setValue = false;
    } else {
      // TODO 在swipe back 动画结束时 currentValue 不能这么获取 暂时使用duration 为0 判断不setValue
      currentValue = getModuloValue(this._transmitterValue);
      setValue = true;
    }
    let toValue = getModuloValue(config.toValue);
    if (__DEV__ && DEBUG) {
      // eslint-disable-next-line
      console.log(
        '_startTiming config:',
        config,
        'currentValue:',
        currentValue,
        'toValue:',
        toValue,
        'setValue:',
        setValue,
        '_nextTransmitterValue:',
        this._nextTransmitterValue
      );
    }

    if (toValue === 0 && currentValue >= 2) {
      toValue = 3;
    } else if (setValue) {
      const dv = toValue - currentValue;
      if (dv > 1) {
        currentValue = 3;
      } else if (dv < -1 /* || currentValue === 0 */) {
        currentValue = 0;
      }
    }
    if (setValue && config.duration > 0) {
      // duration 为0 时 不需要
      // TODO RN Animated BUG detach 到 attach 调用一下 setValue 可以防止出现问题 (解决之后 可减少setValue 的需要)
      this._animationIndex.setValue(currentValue);
    }
    config.toValue = toValue;
    Animated.timing(this._animationIndex, config).start(callback);
  }

  /**
   * 开始Transition 动画
   * 动画目标已在prepareAnimationProp 计算好
   */
  startTransitionAnimation(noAnimation) {
    if (__DEV__) {
      if (this._isAnimationRunning)
        throw new Error('startTransitionAnimation isAnimationRunning!!!');
    }
    this._isAnimationRunning = true;
    if (
      this._nextTransmitterValue === this._transmitterValue ||
      this._nextTransmitterValue == null
    ) {
      // TODO 前后active scene 为同一个 应该在Navigation._startTransition 时优化处理 不用调用Animator
      if (__DEV__ && DEBUG && this._nextTransmitterValue == null) {
        console.warn(
          'startTransitionAnimation this._nextTransmitterValue == null'
        );
      }
      this._onTransitionAnimationEnd();
    } else {
      const animationConfig = {
        ...this._sceneConfig.transitionSpec,
        useNativeDriver: USE_NATIVE_DRIVER,
        toValue: this._nextTransmitterValue,
      };
      if (noAnimation) {
        // XXX
        animationConfig.duration = 0;
      }
      // else {
      //   // TEST
      //   animationConfig.duration = 2000;
      // }

      this._startTiming(animationConfig, this._onTransitionAnimationEnd);
    }
  }

  _onTransitionAnimationEnd() {
    this._transmitterValue = this._nextTransmitterValue;
    this._nextTransmitterValue = null;
    this._isAnimationRunning = false;
    this._navigation._onAnimationEnd();
  }

  isAnimationRunning() {
    return this._isAnimationRunning;
  }

  /**
   * 获取当前采用的sceneConfig
   * 可能为空 如果prepareAnimationProp 未调用过 或者当前没有scenes
   */
  getSceneConfig() {
    return this._sceneConfig;
  }

  /**
   * 获取当前的transmitterValue
   * 该值在动画过程中不会更新 动画结束之后才会更新
   */
  getTransmitterValue() {
    return this._transmitterValue;
  }

  /**
   * GestureResponder 调用
   */
  setAnimationValue(value) {
    this._animationIndex.setValue(getModuloValue(value));
  }

  /**
   * GestureResponder 调用
   * 开始reset 或者 pop back 动画
   */
  startAnimation(config, callback) {
    if (__DEV__) {
      if (this._isAnimationRunning)
        throw new Error('startAnimation isAnimationRunning!!!');
    }
    this._isAnimationRunning = true;
    this._startTiming(
      {
        ...config,
        useNativeDriver: USE_NATIVE_DRIVER,
      },
      () => {
        this._isAnimationRunning = false;
        callback();
      }
    );
  }

  stopAnimation(value) {
    if (value != null) {
      this._animationIndex.setValue(getModuloValue(value));
    } else {
      this._animationIndex.stopAnimation();
    }
  }
}

function getModuloValue(value) {
  return ((value % 3) + 3) % 3;
}
