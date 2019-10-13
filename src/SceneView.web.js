// import PropTypes from 'prop-types';
import React from 'react';
import { View } from 'react-native';
import BaseSceneView from './BaseSceneView';

export default class SceneView extends BaseSceneView {
  constructor(props, context) {
    super(props, context);
  }

  render() {
    const props = this.props;
    const animationProp = props.animationProp;
    if (animationProp) {
      animationProp.sceneView = this;
    }
    return (
      <View style={[props.style, animationProp && animationProp.style]}>
        {props.render(props.scene, props.navigation)}
      </View>
    );
  }
}
