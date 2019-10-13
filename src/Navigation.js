import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { StyleSheet, View, Platform, Dimensions } from 'react-native';
import { VisibleController } from '../VisibleManager';
import SceneView from './SceneView';
import ScenesReducer from './ScenesReducer';
import SceneConfigs from './SceneConfigs';
import Animator from './Animator';
import GestureResponder from './GestureResponder';
import {
  TRANSITION_STATE_IDLE,
  TRANSITION_STATE1,
  TRANSITION_STATE2,
  TRANSITION_STATE3,
  TRANSITION_STATE4,
  DEBUG,
} from './Constants';

const IS_WEB = Platform.OS === 'web';
const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
// 由于动画结束回调的调用时间会比动画duration 大不少(动画300ms 实际700左右 可能是由于useNativeDriver 时动画结束通知有延迟)
// 所以为了防止操作无效 设置了一个最大的事件阻止时间 (web 不需要)
const INTERCEPT_TOUCH_TIMEOUT = 450;

/**
 * TODO visibleManager 可开关
 */
export default class Navigation extends Component {
  static propTypes = {
    /**
     * Styles to apply to the container of each scene.
     */
    sceneStyle: PropTypes.any,

    invisibleSceneStyle: PropTypes.any,

    /**
     * Enable gestures. Default value is true.
     */
    enableGestures: PropTypes.bool,

    /**
     * 当只有一个scene 时是否允许手势
     */
    enableGestureOnFirstScene: PropTypes.bool,

    /**
     * Function that renders the a scene for a route.
     */
    renderScene: PropTypes.func.isRequired,

    /**
     * 初始navigationState 后续修改无效
     */
    initialNavigationState: PropTypes.object,

    /**
     * 可比普通ref属性 更早获取ref
     */
    navigationRef: PropTypes.func,

    /**
     * 是否将不可见scene remove 掉 降低内存消耗
     * 会保留当前和前一个scene
     */
    removeClippedScenes: PropTypes.bool,

    /**
     * 是否将非当前scene 隐藏
     */
    hideNonActiveScenes: PropTypes.bool,

    /**
     * 初始layout
     * {
     *   width,
     *   height,
     * }
     * 默认使用屏幕宽高, 如果需要使用不同的值 则可以提供此参数
     * 作为初始参数 后续修改无效
     */
    initialLayout: PropTypes.object,

    /**
     * 获取 route 对应的 SceneConfig
     * 在每次transition 开始之前会调用一次 一般来说对每个route 每次调用返回的应该是相同的
     * (scene: Scene) => SceneConfig
     */
    configureScene: PropTypes.func,

    /**
     * (transitionProps) => Void
     */
    onTransitionStart: PropTypes.func,

    /**
     * (transitionProps, hasPendingTransition) => Void
     */
    onTransitionEnd: PropTypes.func,

    /**
     * 是否关闭返回动画
     * 主要用于解决web 下与 safari 手势返回冲突的问题
     * @platform web
     */
    disableBackAnimation: PropTypes.bool,
  };

  static contextTypes = {
    visibleManager: PropTypes.object,
  };

  static defaultProps = {
    initialNavigationState: {
      routes: [],
      index: -1,
    },
    enableGestures:
      Platform.OS === 'ios' ||
      (Platform.OS === 'android' && Platform.Version >= 19),
    enableGestureOnFirstScene: false,
    // gestureResponseDistance: 40,
    removeClippedScenes: true,
    hideNonActiveScenes: true,
    configureScene: (scene) => {
      return SceneConfigs.DefaultSceneConfig;
    },
  };

  constructor(props, context) {
    super(props, context);

    const initialLayout = props.initialLayout;
    const layout = {
      width: initialLayout ? initialLayout.width : SCREEN_WIDTH,
      height: initialLayout ? initialLayout.height : SCREEN_HEIGHT,
      isMeasured: false,
    };
    const navigationState = props.initialNavigationState;
    this._navigationState = navigationState; // 实时的navigationState
    this.state = {
      layout,
      navigationState, // 将要应用的navigationState 放在state中 会滞后于_navigationState
      scenes: null, // 当前渲染的scenes
      activeScene: null,
      transitionProps: null, // transition 过程中的信息
    };

    this._visibleController = new VisibleController(context.visibleManager);
    this._isMounted = false;
    this._transitionState = TRANSITION_STATE_IDLE;
    this._hasPendingTransition = false;
    this._animator = new Animator(this);
    this._responder = new GestureResponder(
      this,
      this._animator,
      this._onStartShouldSetResponderCapture.bind(this)
    );
    this._noAnimation = false; // 标记下一次 transition 是否需要动画
    this._onTransitionStartTime = 0;
    this._onLayout = IS_WEB ? undefined : this._onLayout.bind(this);
    // this._containerRef = this._containerRef.bind(this);
  }

  componentWillMount() {
    this.props.navigationRef && this.props.navigationRef(this);
  }

  componentDidMount() {
    this._isMounted = true;
    if (this.state.activeScene) {
      this._visibleController.emit(this.state.activeScene.key, 'willShow');
      this._visibleController.emit(this.state.activeScene.key, 'didShow');
    }
  }

  componentWillUpdate(nextProps, nextState) {
    if (__DEV__ && DEBUG) {
      // eslint-disable-next-line
      console.log(
        'componentWillUpdate transitionState:',
        this._transitionState
      );
    }
    if (this.state.navigationState !== nextState.navigationState) {
      if (this._transitionState !== TRANSITION_STATE_IDLE) {
        this._hasPendingTransition = true;
        if (__DEV__ && DEBUG) {
          // eslint-disable-next-line
          console.log('componentWillUpdate mark hasPendingTransition');
          this.__debugUpdateStartTime = null;
        }
      } else {
        // 在willUpdate 中调用可减少一次render
        this._startTransition(
          nextState.scenes,
          nextState.navigationState,
          false,
          nextState
        );
      }
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (__DEV__ && DEBUG) {
      // eslint-disable-next-line
      console.log('componentDidUpdate transitionState:', this._transitionState);
    }
    switch (this._transitionState) {
      case TRANSITION_STATE1:
        this._onTransitionStart(this.state.transitionProps);
        break;
      case TRANSITION_STATE3:
        this._onTransitionEnd(prevState.transitionProps);
        break;
      case TRANSITION_STATE4:
        this._onTransitionEnd(prevState.transitionProps, true);
        this._onTransitionStart(this.state.transitionProps);
        break;
      default:
        break;
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
    this.props.navigationRef && this.props.navigationRef(null);
  }

  getNavigationState() {
    return this._navigationState;
  }

  getActiveScene() {
    return this.state.activeScene;
  }

  /**
   * 设置是否启用手势
   * enableGestures 为 true时才起效
   */
  setGestureEnabled(enabled) {
    this._responder.setEnabled(enabled);
  }

  isGestureEnabled() {
    return this._responder.isEnabled();
  }

  /**
   * @return navigation 是否处于transition 过程中
   */
  isInTransition() {
    return (
      this._transitionState !== TRANSITION_STATE_IDLE ||
      this._responder.isResponding()
    );
  }

  updateNavigationState(navigationState, config, callback) {
    if (this._navigationState !== navigationState) {
      if (__DEV__) {
        if (!navigationState.routes || !(navigationState.index >= -1)) {
          throw new Error(
            'updateNavigationState navigationState 不合法',
            navigationState
          );
        }
        this.__debugUpdateStartTime = Date.now();
      }
      this._noAnimation = !!(config && config.animation === false);
      // 直接修改_navigationState 使得接下来调用getNavigationState 获取到的必定是最新的
      // 在onPress 等事件回调中由于批处理的存在setState 之后不会立即更新state
      this._navigationState = navigationState;
      if (!this._isMounted) {
        return;
      }
      this.setState(
        {
          navigationState,
        },
        callback
      );
    } else {
      callback && callback();
    }
  }

  /**
   * 给堆栈active scene 发送back 事件
   * @return true scene 处理了事件 否则 没有处理
   */
  dispatchBackEvent() {
    if (this.isInTransition()) {
      return true;
    }
    const activeScene = this.state.activeScene;
    if (!activeScene) {
      return false;
    }
    if (activeScene.listenerInfo.onBackEvent) {
      return activeScene.listenerInfo.onBackEvent();
    }
    return false;
  }

  _initScenes(state) {
    // 初始化scenes
    // 不能放在构造函数中 因为可能在componentWillMount 中setState
    const reducerInfo = {};
    const scenes = ScenesReducer([], state.navigationState, reducerInfo);
    this._configureScenes(scenes);
    state.scenes = scenes;
    state.activeScene = reducerInfo.activeScene;
  }

  _startTransition(
    scenes,
    navigationState,
    isPendingTransition,
    willUpdateState
  ) {
    const reducerInfo = {};
    const nextScenes = ScenesReducer(scenes, navigationState, reducerInfo);
    if (__DEV__ && DEBUG) {
      // eslint-disable-next-line
      console.log(
        'startTransition scenes:',
        scenes,
        'navigationState:',
        navigationState,
        'isPendingTransition:,',
        isPendingTransition,
        'willUpdate:',
        !!willUpdateState,
        'nextScenes:',
        nextScenes,
        'nextScenes === scenes:',
        nextScenes === scenes
      );
    }
    if (nextScenes === scenes) {
      return false;
    }

    // 中断GestureResponder
    this._responder.forceReset();
    this._interceptTouchStartTime = Date.now();

    this._configureScenes(nextScenes);
    const transitionProps = buildTransitionProps(navigationState, reducerInfo);
    // TODO 对不需要transition 的优化 两次setState合并为1次 1. 不需要动画的 2. 前后active scene 无变化
    this._transitionState = isPendingTransition
      ? TRANSITION_STATE4
      : TRANSITION_STATE1;

    if (willUpdateState) {
      // 在willUpdate 中不能 setState 只需修改nextState 就可以
      willUpdateState.scenes = nextScenes;
      willUpdateState.activeScene = transitionProps.activeScene;
      willUpdateState.transitionProps = transitionProps;
    } else {
      this.setState({
        scenes: nextScenes,
        activeScene: transitionProps.activeScene,
        transitionProps,
      });
    }
    return true;
  }

  _onTransitionStart(transitionProps) {
    const { prevActiveScene, activeScene } = transitionProps;
    if (__DEV__ && DEBUG) {
      // eslint-disable-next-line
      console.log(
        'navigation-transition-prepare-time:',
        Date.now() - this.__debugUpdateStartTime
      );
    }
    this.props.onTransitionStart &&
      this.props.onTransitionStart(transitionProps);
    if (prevActiveScene !== activeScene) {
      if (prevActiveScene) {
        this._visibleController.emit(prevActiveScene.key, 'willHide');
      }
      if (activeScene) {
        this._visibleController.emit(activeScene.key, 'willShow');
      }
    }
    this._startAnimation();
  }

  _startAnimation() {
    this._transitionState = TRANSITION_STATE2;
    this._animator.startTransitionAnimation(this._noAnimation);
  }

  _onAnimationEnd() {
    if (!this._isMounted) {
      return;
    }
    // 去除stale scenes
    const scenes = filterStaleScenes(this.state.scenes);

    // 对_hasPendingTransition优化 将本次 setState 与下一次 _startTransition 合并
    if (this._hasPendingTransition) {
      this._hasPendingTransition = false;
      if (this._startTransition(scenes, this.state.navigationState, true)) {
        return;
      }
    }

    this._transitionState = TRANSITION_STATE3;
    this.setState({
      scenes,
      transitionProps: null,
    });
  }

  _onTransitionEnd(transitionProps, hasPendingTransition) {
    const { prevActiveScene, activeScene } = transitionProps;
    if (!hasPendingTransition) {
      // _transitionState 为 TRANSITION_STATE4 时紧接着会开始pending transition 所以不需要改变_transitionState
      this._transitionState = TRANSITION_STATE_IDLE;
    }

    if (prevActiveScene !== activeScene) {
      if (prevActiveScene) {
        this._visibleController.emit(prevActiveScene.key, 'didHide');
      }
      if (activeScene) {
        this._visibleController.emit(activeScene.key, 'didShow');
      }
    }

    this.props.onTransitionEnd &&
      this.props.onTransitionEnd(transitionProps, hasPendingTransition);
  }

  _onLayout(event) {
    const { width, height } = event.nativeEvent.layout;
    if (
      this.state.layout.width === width &&
      this.state.layout.height === height
    ) {
      return;
    }
    this.setState({
      layout: {
        width,
        height,
        isMeasured: true,
      },
    });
  }

  _onStartShouldSetResponderCapture(e) {
    if (this._transitionState !== TRANSITION_STATE_IDLE) {
      if (
        Date.now() - this._interceptTouchStartTime < INTERCEPT_TOUCH_TIMEOUT ||
        this._hasPendingTransition
      ) {
        return true;
      }
    }
    return false;
  }

  // 添加scene 的补充信息
  // TODO 考虑在创建scene object时补充 而不是通过在scenes 改变时遍历
  _configureScenes(scenes) {
    const configureScene = this.props.configureScene;
    let scene;
    for (let i = 0; i < scenes.length; ++i) {
      scene = scenes[i];
      if (!scene.config) {
        scene.config = configureScene(scene);
      }
      if (!scene.listenerInfo) {
        scene.listenerInfo = {};
      }
    }
  }

  _onResponderBack() {
    if (!this._isMounted) {
      return;
    }
    const { routes, index } = this._navigationState;
    // onResponderBack 调用时scene 已在正确位置 不需要动画
    this.updateNavigationState(
      {
        routes: routes.slice(0, index),
        index: index - 1,
      },
      {
        animation: false,
      }
    );
  }

  render() {
    const props = this.props;
    const state = this.state;
    let scenes = state.scenes;
    if (!scenes) {
      this._initScenes(state);
      scenes = state.scenes;
    }
    const animator = this._animator;
    animator.prepareAnimationProp(scenes, state.layout, state.transitionProps);

    const sceneViews = new Array(scenes.length);
    let scene;
    let animationProp;
    let invisibleSceneStyle;
    for (let i = 0; i < scenes.length; ++i) {
      scene = scenes[i];
      animationProp = animator.getAnimationProp(scene);
      invisibleSceneStyle =
        props.hideNonActiveScenes && !animator.isSceneVisible(scene)
          ? props.invisibleSceneStyle || styles.invisibleScene
          : null;
      sceneViews[i] = (
        <SceneView
          key={scene.key}
          childKey={scene.key}
          controller={this._visibleController}
          navigation={this}
          scene={scene}
          animationProp={animationProp}
          render={props.renderScene}
          style={[
            styles.scene,
            props.sceneStyle,
            scene.config.style,
            invisibleSceneStyle,
          ]}
        />
      );
    }

    const panHandlers = this._responder.getPanHandlers(props.enableGestures);
    // XXX 是否有必要在transition 过程中使用pointerEvents 阻止native 事件
    // const pointerEvents = (this._transitionState === TRANSITION_STATE_IDLE || this._transitionState === TRANSITION_STATE3) ? 'auto' : 'none';
    return (
      <View
        {...panHandlers}
        // ref={this._containerRef}
        onLayout={this._onLayout}
        removeClippedSubviews={props.removeClippedScenes}
        style={[styles.container, props.style]}
      >
        {sceneViews}
      </View>
    );
  }
}

function filterStaleScenes(scenes) {
  const nextScenes = scenes.filter(isSceneNotStale);
  if (nextScenes.length === scenes.length) {
    return scenes;
  }
  return nextScenes;
}

function isSceneNotStale(scene) {
  return !scene.isStale;
}

/**
 *
 * transitionProps:
 * {
 *   navigationState, // 引起本次transition 的 navigationState
 *   activeScene, // 当前active scene
 *   prevActiveScene, // 之前的active scene 可能与当前的是同一个
 * }
 */
function buildTransitionProps(navigationState, reducerInfo) {
  return {
    navigationState,
    activeScene: reducerInfo.activeScene,
    prevActiveScene: reducerInfo.prevActiveScene,
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  scene: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },
  invisibleScene: IS_WEB
    ? {
        top: -1000000,
        bottom: 1000000,
        visibility: 'hidden',
        opacity: 0,
      }
    : {
        top: -1000000,
        bottom: 1000000,
      },
});
