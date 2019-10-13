// import PropTypes from 'prop-types';
import React from 'react';
import { Animated } from 'react-native';
import BaseSceneView from './BaseSceneView';

export default class SceneView extends BaseSceneView {
  constructor(props, context) {
    super(props, context);
  }

  render() {
    const props = this.props;
    // 当没有backgroundColor 时 View可能被优化掉 导致动画异常
    // 所以需要加 collapsable
    return (
      <Animated.View
        collapsable={false}
        style={[props.style, props.animationProp]}
      >
        {props.render(props.scene, props.navigation)}
      </Animated.View>
    );
    // <ReactNative.Text style={{position: 'absolute', bottom: 10, fontSize: 20}}>animationStyleIndex: {props.scene._animationPropIndex}</ReactNative.Text>
  }
}
