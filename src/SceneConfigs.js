import { Easing, Platform } from 'react-native';
import { definePrivateProperty } from '../../utils';

const STYLES_KEY = 'STYLES_KEY';
const BASE_EASING = Easing.bezier(0.2833, 0.99, 0.31833, 0.99);
const DECELERATE_EASING = Easing.out(Easing.poly(5));
const IS_IOS = Platform.OS === 'ios';

const SlideFromRight = {
  gesture: 'horizontal',
  transitionSpec: {
    duration: 450,
    easing: BASE_EASING,
  },
  createStyles(animatedValue, layout, oldStyles) {
    const width = layout.width;
    const key = width;
    if (oldStyles && oldStyles[STYLES_KEY] === key) {
      return oldStyles;
    }

    const LEFT_WIDTH_OFFSET_RATIO = 0.3;
    const LEFT_OPACITY = Platform.OS === 'ios' ? 0.85 : 0.4;

    const style0 = {
      transform: [
        {
          translateX: animatedValue.interpolate({
            inputRange: [0, 0.999, 1, 1.5, 1.5, 2, 3],
            outputRange: [
              0,
              -width * LEFT_WIDTH_OFFSET_RATIO,
              IS_IOS ? -width + 0.5 : -100000, // ios removeClippedSubviews 会考虑translate 防止被remove 掉
              -100000,
              100000,
              IS_IOS ? width - 0.5 : width,
              0,
            ],
          }),
        },
      ],
      opacity: animatedValue.interpolate({
        inputRange: [
          0,
          0.999,
          1,
          2,
          2, // 2.001
          3,
        ],
        outputRange: [1, LEFT_OPACITY, 0, 0, 1, 1],
      }),
    };

    const style1 = {
      transform: [
        {
          translateX: animatedValue.interpolate({
            inputRange: [0, 1, 1.999, 2, 2.5, 2.5, 3],
            outputRange: [
              IS_IOS ? width - 0.5 : width,
              0,
              -width * LEFT_WIDTH_OFFSET_RATIO,
              IS_IOS ? -width + 0.5 : -100000,
              -100000,
              100000,
              IS_IOS ? width - 0.5 : width,
            ],
          }),
        },
      ],
      opacity: animatedValue.interpolate({
        inputRange: [
          0,
          0, // 0.001,
          1,
          1.999,
          2,
          3,
        ],
        outputRange: [0, 1, 1, LEFT_OPACITY, 0, 0],
      }),
    };

    const style2 = {
      transform: [
        {
          translateX: animatedValue.interpolate({
            inputRange: [0, 0.5, 0.5, 1, 2, 2.999, 3],
            outputRange: [
              IS_IOS ? -width + 0.5 : -100000,
              -100000,
              100000,
              IS_IOS ? width - 0.5 : width,
              0,
              -width * LEFT_WIDTH_OFFSET_RATIO,
              IS_IOS ? -width + 0.5 : -100000,
            ],
          }),
        },
      ],
      opacity: animatedValue.interpolate({
        inputRange: [
          0,
          1,
          1, // 1.001
          2,
          2.999,
          3,
        ],
        outputRange: [0, 0, 1, 1, LEFT_OPACITY, 0],
      }),
    };

    const styles = [style0, style1, style2];
    definePrivateProperty(styles, STYLES_KEY, key);
    return styles;
  },
};

const SlideFromBottom = {
  gesture: 'vertical',
  transitionSpec: {
    duration: 470,
    easing: BASE_EASING,
  },
  createStyles(animatedValue, layout, oldStyles) {
    const height = layout.height;
    const key = height;
    if (oldStyles && oldStyles[STYLES_KEY] === key) {
      return oldStyles;
    }

    const LEFT_OPACITY = 0.85;

    const style0 = {
      transform: [
        {
          translateY: animatedValue.interpolate({
            inputRange: [0, 0.999, 1, 1.5, 1.5, 2, 3],
            outputRange: [
              0,
              0,
              IS_IOS ? -height + 0.5 : -100000,
              -100000,
              100000,
              IS_IOS ? height - 0.5 : height,
              0,
            ],
          }),
        },
      ],
      opacity: animatedValue.interpolate({
        inputRange: [
          0,
          0.999,
          1,
          2,
          2, // 2.001
          3,
        ],
        outputRange: [1, LEFT_OPACITY, 0, 0, 1, 1],
      }),
    };

    const style1 = {
      transform: [
        {
          translateY: animatedValue.interpolate({
            inputRange: [0, 1, 1.999, 2, 2.5, 2.5, 3],
            outputRange: [
              IS_IOS ? height - 0.5 : height,
              0,
              0,
              IS_IOS ? -height + 0.5 : -100000,
              -100000,
              100000,
              IS_IOS ? height - 0.5 : height,
            ],
          }),
        },
      ],
      opacity: animatedValue.interpolate({
        inputRange: [
          0,
          0, // 0.001,
          1,
          1.999,
          2,
          3,
        ],
        outputRange: [0, 1, 1, LEFT_OPACITY, 0, 0],
      }),
    };

    const style2 = {
      transform: [
        {
          translateY: animatedValue.interpolate({
            inputRange: [0, 0.5, 0.5, 1, 2, 2.999, 3],
            outputRange: [
              IS_IOS ? -height + 0.5 : -100000,
              -100000,
              100000,
              IS_IOS ? height - 0.5 : height,
              0,
              0,
              IS_IOS ? -height + 0.5 : -100000,
            ],
          }),
        },
      ],
      opacity: animatedValue.interpolate({
        inputRange: [
          0,
          1,
          1, // 1.001
          2,
          2.999,
          3,
        ],
        outputRange: [0, 0, 1, 1, LEFT_OPACITY, 0],
      }),
    };

    const styles = [style0, style1, style2];
    definePrivateProperty(styles, STYLES_KEY, key);
    return styles;
  },
};

// Standard Android navigation transition when opening an Activity
// See http://androidxref.com/7.1.1_r6/xref/frameworks/base/core/res/res/anim/activity_open_enter.xml
const FadeFromBottom = {
  gesture: 'none',
  transitionSpec: {
    duration: 370,
    easing: DECELERATE_EASING,
  },
  createStyles(animatedValue, layout, oldStyles) {
    if (oldStyles) {
      return oldStyles;
    }

    const height = layout.height;
    const LEFT_OPACITY = 0.85;
    const LEFT_Y = 25;

    const style0 = {
      transform: [
        {
          translateY: animatedValue.interpolate({
            inputRange: [0, 0.999, 1, 1.5, 1.5, 2, 3],
            outputRange: [
              0,
              0,
              IS_IOS ? -height + 0.5 : -100000, // XXX height cache key
              -100000,
              100000,
              LEFT_Y,
              0,
            ],
          }),
        },
      ],
      opacity: animatedValue.interpolate({
        inputRange: [0, 0.999, 1, 2, 3],
        outputRange: [1, LEFT_OPACITY, 0, 0, 1],
      }),
    };

    const style1 = {
      transform: [
        {
          translateY: animatedValue.interpolate({
            inputRange: [0, 1, 1.999, 2, 2.5, 2.5, 3],
            outputRange: [
              LEFT_Y,
              0,
              0,
              IS_IOS ? -height + 0.5 : -100000,
              -100000,
              100000,
              LEFT_Y,
            ],
          }),
        },
      ],
      opacity: animatedValue.interpolate({
        inputRange: [
          // 0, // TODO Android 下加这个会导致BUG
          0, // 0.001,
          1,
          1.999,
          2,
          3,
        ],
        outputRange: [
          // 0,
          0,
          1,
          LEFT_OPACITY,
          0,
          0,
        ],
      }),
    };

    const style2 = {
      transform: [
        {
          translateY: animatedValue.interpolate({
            inputRange: [0, 0.5, 0.5, 1, 2, 2.999, 3],
            outputRange: [
              IS_IOS ? -height + 0.5 : -100000,
              -100000,
              100000,
              LEFT_Y,
              0,
              0,
              IS_IOS ? -height + 0.5 : -100000,
            ],
          }),
        },
      ],
      opacity: animatedValue.interpolate({
        inputRange: [0, 1, 2, 2.999, 3],
        outputRange: [0, 0, 1, LEFT_OPACITY, 0],
      }),
    };

    return [style0, style1, style2];
  },
};

const Fade = {
  gesture: 'none',
  transitionSpec: {
    duration: 400,
    // easing: DECELERATE_EASING,
  },
  createStyles(animatedValue, layout, oldStyles) {
    if (oldStyles) {
      return oldStyles;
    }

    const width = layout.width;
    const LEFT_OPACITY = 0.85;

    const style0 = {
      transform: [
        {
          translateX: animatedValue.interpolate({
            inputRange: [0, 0.999, 1, 2, 3],
            outputRange: [
              0,
              0,
              IS_IOS ? -width + 0.5 : -100000, // XXX width cache key
              0,
              0,
            ],
          }),
        },
      ],
      opacity: animatedValue.interpolate({
        inputRange: [0, 0.999, 1, 2, 3],
        outputRange: [1, LEFT_OPACITY, 0, 0, 1],
      }),
    };

    const style1 = {
      transform: [
        {
          translateX: animatedValue.interpolate({
            inputRange: [0, 1, 1.999, 2, 3],
            outputRange: [0, 0, 0, IS_IOS ? -width + 0.5 : -100000, 0],
          }),
        },
      ],
      opacity: animatedValue.interpolate({
        inputRange: [0, 1, 1.999, 2, 3],
        outputRange: [0, 1, LEFT_OPACITY, 0, 0],
      }),
    };

    const style2 = {
      transform: [
        {
          translateX: animatedValue.interpolate({
            inputRange: [0, 1, 2, 2.999, 3],
            outputRange: [
              IS_IOS ? -width + 0.5 : -100000,
              0,
              0,
              0,
              IS_IOS ? -width + 0.5 : -100000,
            ],
          }),
        },
      ],
      opacity: animatedValue.interpolate({
        inputRange: [0, 1, 2, 2.999, 3],
        outputRange: [0, 0, 1, LEFT_OPACITY, 0],
      }),
    };

    return [style0, style1, style2];
  },
};

const FadePopup = {
  key: 'FadePopup',
  gesture: 'none',
  transitionSpec: {
    duration: 300,
    // easing: DECELERATE_EASING,
  },
  createStyles(animatedValue, layout, oldStyles) {
    if (oldStyles) {
      return oldStyles;
    }

    const LEFT_OPACITY = 1;

    const style0 = {
      opacity: animatedValue.interpolate({
        inputRange: [0, 1, 2, 3],
        outputRange: [1, LEFT_OPACITY, 0, 1],
      }),
    };

    const style1 = {
      opacity: animatedValue.interpolate({
        inputRange: [0, 1, 2, 3],
        outputRange: [0, 1, LEFT_OPACITY, 0],
      }),
    };

    const style2 = {
      opacity: animatedValue.interpolate({
        inputRange: [0, 1, 2, 3],
        outputRange: [LEFT_OPACITY, 0, 1, LEFT_OPACITY],
      }),
    };

    return [style0, style1, style2];
  },
};

const NoAnimation = {
  gesture: 'none',
  transitionSpec: {
    duration: 0,
  },
  createStyles(animatedValue, layout, oldStyles) {
    if (oldStyles) {
      return oldStyles;
    }
    return [{}, {}, {}];
  },
};

const DefaultSceneConfig =
  !IS_IOS && Platform.Version < 19 ? FadeFromBottom : SlideFromRight;

/**
 * scene 的配置 包括手势 动画
 * 参考: https://github.com/facebook/react-native/blob/v0.36.1/Libraries/CustomComponents/Navigator/NavigatorSceneConfigs.js
 * SceneConfig: {
 *   // 手势配置 'horizontal' 'vertical' 'none' TODO 更详细的配置
 *   gesture,
 *   // 动画基本配置
 *   transitionSpec: {
 *     duration,
 *     easing,
 *   },
 *   // 创建0 1 2 style
 *   createStyles: (animatedValue, layout, oldStyle) => style,
 *   // scene 的额外style
 *   style,
 * }
 */
const SceneConfigs = {
  DefaultSceneConfig,
  SlideFromRight,
  SlideFromBottom,
  FadeFromBottom,
  Fade,
  FadePopup,
  NoAnimation,
};

export default SceneConfigs;
