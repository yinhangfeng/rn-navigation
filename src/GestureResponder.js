import { PanResponder, Easing } from 'react-native';
import { TRANSITION_STATE_IDLE, DEBUG } from './Constants';

/**
 * The max duration of the card animation in milliseconds after released gesture.
 * The actual duration should be always less then that because the rest distance
 * is always less then the full distance of the layout.
 */
const ANIMATION_DURATION = 500;

/**
 * The gesture distance threshold to trigger the back behavior. For instance,
 * `1/2` means that moving greater than 1/2 of the width of the screen will
 * trigger a back action
 */
const POSITION_THRESHOLD = 0.5;

/**
 * The threshold (in pixels) to start the gesture action.
 * 根据Android PAGING_TOUCH_SLOP
 */
const RESPOND_THRESHOLD = 16;

/**
 * The distance of touch start from the edge of the screen where the gesture will be recognized
 */
const GESTURE_RESPONSE_DISTANCE_HORIZONTAL = 40;
const GESTURE_RESPONSE_DISTANCE_VERTICAL = 135;

const RESPONDER_STATE_IDLE = 0;
const RESPONDER_STATE_DRAGGING = 1;
const RESPONDER_STATE_RESETTING = 2;
const RESPONDER_STATE_BACKING = 3;
const RESPONDER_STATE_UNABLE = 4;

/**
 * Navigation 手势管理
 * 支持 horizontal vertical 手势
 * 只支持在Navigation 静止状态下开始drag
 */
export default class GestureResponder {
  constructor(navigation, animator, onStartShouldSetPanResponderCapture) {
    this._navigation = navigation;
    this._animator = animator;
    this._onStartShouldSetPanResponderCapture = onStartShouldSetPanResponderCapture;
    this._responderState = RESPONDER_STATE_IDLE;
    this._isVertical = null; // 是否为vertical 为null 表示sceneConfig 不支持手势
    this._currentValue = 0;
    this._isEnabled = true;

    this._responder = PanResponder.create({
      onStartShouldSetPanResponderCapture: this.onStartShouldSetPanResponderCapture.bind(
        this
      ),
      onPanResponderTerminate: this.onPanResponderTerminate.bind(this),
      onPanResponderGrant: this.onPanResponderGrant.bind(this),
      onMoveShouldSetPanResponder: this.onMoveShouldSetPanResponder.bind(this),
      onPanResponderMove: this.onPanResponderMove.bind(this),
      onPanResponderTerminationRequest: this.onPanResponderTerminationRequest.bind(
        this
      ),
      onPanResponderRelease: this.onPanResponderRelease.bind(this),
    });
    this._panHandlers = this._responder.panHandlers;

    if (__DEV__ && DEBUG) {
      this.log = (...args) => {
        // eslint-disable-next-line
        console.log(
          `GestureResponder ${this._navigation.props.tag || ''}`,
          ...args
        );
      };
    }
  }

  _reset(duration) {
    // this.log('_reset', duration);
    this._responderState = RESPONDER_STATE_RESETTING;

    this._animator.startAnimation(
      {
        startValue: this._currentValue,
        toValue: this._startValue,
        duration,
        easing: Easing.linear(),
      },
      () => {
        this._responderState = RESPONDER_STATE_IDLE;
      }
    );
  }

  _goBack(duration) {
    // this.log('_goBack', duration);
    this._responderState = RESPONDER_STATE_BACKING;

    this._animator.startAnimation(
      {
        startValue: this._currentValue,
        toValue: this._startValue - 1,
        duration,
        easing: Easing.linear(),
      },
      () => {
        // 可能是forceReset 使动画停止
        if (this._responderState !== RESPONDER_STATE_IDLE) {
          this._responderState = RESPONDER_STATE_IDLE;
          this._navigation._onResponderBack();
        }
      }
    );
  }

  _getLayout() {
    return this._navigation.state.layout;
  }

  onStartShouldSetPanResponderCapture(e, gesture) {
    if (this._isEnabled) {
      // 判断当前scene SceneConfig 设置_isVertical
      const sceneConfig = this._animator.getSceneConfig();
      if (sceneConfig) {
        switch (sceneConfig.gesture) {
          case 'horizontal':
            this._isVertical = false;
            break;
          case 'vertical':
            this._isVertical = true;
            break;
          default:
            this._isVertical = null;
            break;
        }
      }
    }
    if (
      this._responderState !== RESPONDER_STATE_RESETTING &&
      this._responderState !== RESPONDER_STATE_BACKING
    ) {
      this._responderState = RESPONDER_STATE_IDLE;
    }
    this._isIntercept = this._onStartShouldSetPanResponderCapture(e);
    if (__DEV__ && DEBUG) {
      this.log(
        'onStartShouldSetPanResponderCapture isVertical:',
        this._isVertical,
        'isIntercept:',
        this._isIntercept
      );
    }
    return this._isIntercept;
  }

  /**
   * 就算子View 已经捕获事件 此函数还是会调用 但返回true 没用
   */
  onMoveShouldSetPanResponder(event, gesture) {
    // 判断是否开启手势
    if (!this._isEnabled) {
      return false;
    }

    // 判断responderState
    if (this._responderState !== RESPONDER_STATE_IDLE) {
      return false;
    }

    // 判断sceneConfig 是否支持手势
    const isVertical = this._isVertical;
    if (isVertical == null) {
      return false;
    }

    // 判断是否处于边缘
    let currentDragDistance;
    let currentCrossDragDistance;
    let currentDragPosition;
    let gestureResponseDistance;
    if (isVertical) {
      currentDragDistance = gesture.dy;
      currentCrossDragDistance = gesture.dx;
      // XXX 由于location 是现对于当前触摸元素的 所以只能用page
      currentDragPosition = event.nativeEvent.pageY;
      gestureResponseDistance = GESTURE_RESPONSE_DISTANCE_VERTICAL;
    } else {
      currentDragDistance = gesture.dx;
      currentCrossDragDistance = gesture.dy;
      currentDragPosition = event.nativeEvent.pageX;
      gestureResponseDistance = GESTURE_RESPONSE_DISTANCE_HORIZONTAL;
    }
    const screenEdgeDistance = currentDragPosition - currentDragDistance;
    if (__DEV__ && DEBUG) {
      this.log(
        'onMoveShouldSetPanResponder isVertical:',
        isVertical,
        ' currentDragDistance:',
        currentDragDistance,
        'currentCrossDragDistance:',
        currentCrossDragDistance,
        'currentDragPosition:',
        currentDragPosition,
        'screenEdgeDistance:',
        screenEdgeDistance
      );
    }
    if (screenEdgeDistance > gestureResponseDistance) {
      this._responderState = RESPONDER_STATE_UNABLE;
      return false;
    }

    const navigation = this._navigation;
    // 判断第一个scene
    const scenes = navigation.state.scenes;
    if (
      !scenes.length ||
      (scenes.length < 2 && !navigation.props.enableGestureOnFirstScene)
    ) {
      return false;
    }

    // 判断是否处于transition
    if (navigation._transitionState !== TRANSITION_STATE_IDLE) {
      return false;
    }

    this._isIntercept = false;

    const canStartDrag =
      Math.abs(currentDragDistance) > RESPOND_THRESHOLD &&
      Math.abs(currentCrossDragDistance) < RESPOND_THRESHOLD;
    if (__DEV__ && DEBUG && canStartDrag) {
      this.log('onMoveShouldSetPanResponder start drag');
    }

    return canStartDrag;
  }

  onPanResponderGrant() {
    if (!this._isIntercept) {
      this._responderState = RESPONDER_STATE_DRAGGING;
      this._startValue = this._animator.getTransmitterValue();
      if (__DEV__ && DEBUG) {
        this.log('onPanResponderGrant !_isIntercept', this._startValue);
      }
    }
  }

  onPanResponderMove(event, gesture) {
    if (this._responderState !== RESPONDER_STATE_DRAGGING) {
      return;
    }

    const startValue = this._startValue;
    let axisDistance;
    let currentValue;
    if (this._isVertical) {
      axisDistance = this._getLayout().height;
      currentValue = startValue - gesture.dy / axisDistance;
    } else {
      axisDistance = this._getLayout().width;
      currentValue = startValue - gesture.dx / axisDistance;
    }
    if (currentValue < startValue - 1) {
      currentValue = startValue - 1;
    } else if (currentValue > startValue) {
      currentValue = startValue;
    }
    this._currentValue = currentValue;
    this._animator.setAnimationValue(currentValue);
  }

  onPanResponderTerminationRequest() {
    return this._responderState !== RESPONDER_STATE_DRAGGING;
  }

  onPanResponderRelease(event, gesture) {
    if (__DEV__ && DEBUG) {
      this.log('onPanResponderRelease responderState:', this._responderState);
    }
    if (this._responderState !== RESPONDER_STATE_DRAGGING) {
      return;
    }

    // Calculate animate duration according to gesture speed and moved distance
    let axisDistance;
    let movedDistance;
    let gestureVelocity;
    if (this._isVertical) {
      axisDistance = this._getLayout().height;
      movedDistance = gesture.dy;
      gestureVelocity = gesture.vy;
    } else {
      axisDistance = this._getLayout().width;
      movedDistance = gesture.dx;
      gestureVelocity = gesture.vx;
    }
    const defaultVelocity = axisDistance / ANIMATION_DURATION;
    const velocity = Math.min(
      Math.max(Math.abs(gestureVelocity), defaultVelocity),
      defaultVelocity * 3
    );
    let resetDuration = movedDistance / velocity;
    if (resetDuration < 0) {
      resetDuration = 0;
    }
    let goBackDuration = (axisDistance - movedDistance) / velocity;
    if (goBackDuration < 0) {
      goBackDuration = 0;
    }

    if (__DEV__ && DEBUG) {
      this.log(
        'onPanResponderRelease ',
        gesture,
        '_currentValue:',
        this._currentValue,
        '_startValue:',
        this._startValue
      );
    }

    // If the speed of the gesture release is significant, use that as the indication
    // of intent
    if (gestureVelocity < -0.5) {
      this._reset(resetDuration);
      return;
    }
    if (gestureVelocity > 0.5) {
      this._goBack(goBackDuration);
      return;
    }

    // Then filter based on the distance the screen was moved. Over a third of the way swiped,
    // and the back will happen.
    if (this._currentValue <= this._startValue - POSITION_THRESHOLD) {
      this._goBack(goBackDuration);
    } else {
      this._reset(resetDuration);
    }
  }

  onPanResponderTerminate() {
    if (__DEV__ && DEBUG) {
      this.log('onPanResponderTerminate responderState:', this._responderState);
    }
    if (this._responderState !== RESPONDER_STATE_DRAGGING) {
      return;
    }
    this._responderState = RESPONDER_STATE_IDLE;
    // TODO 这里reset 是否合适?
    this._reset(0);
  }

  isResponding() {
    return (
      this._responderState !== RESPONDER_STATE_IDLE &&
      this._responderState !== RESPONDER_STATE_UNABLE
    );
  }

  forceReset() {
    if (!this.isResponding()) {
      return;
    }
    this._responderState = RESPONDER_STATE_IDLE;
    // 将animator 恢复到dragging 开始之前的值
    this._animator.stopAnimation(this._startValue);
  }

  getPanHandlers(enabled) {
    // XXX enabled 在手势过程中被切换 可能引起BUG
    if (enabled) {
      return this._panHandlers;
    }
    if (!this._unablePanHandlers) {
      this._unablePanHandlers = {
        onStartShouldSetPanResponderCapture: this
          ._onStartShouldSetPanResponderCapture,
      };
    }
    return this._unablePanHandlers;
  }

  setEnabled(enabled) {
    this._isEnabled = enabled;
  }

  isEnabled() {
    return this._isEnabled;
  }
}
