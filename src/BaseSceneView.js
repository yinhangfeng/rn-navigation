import PropTypes from 'prop-types';
import { VisibleManagerProvider } from '../VisibleManager';
import { shallowEqualEx, shallowEqualStyle } from '../../utils';
import { DEBUG } from './Constants';

function propEqualsFunc(prop1, prop2, key) {
  switch (key) {
    case 'scene':
      // 优化 只关心 scene.route
      return prop1.route === prop2.route;
    case 'style':
      return shallowEqualStyle(prop1, prop2);
    default:
      return Object.is(prop1, prop2);
  }
}

export default class BaseSceneView extends VisibleManagerProvider {
  static propTypes = {
    ...VisibleManagerProvider.propTypes,
    navigation: PropTypes.object,
    scene: PropTypes.object,
    animationProp: PropTypes.any,
    render: PropTypes.func,
  };

  // static childContextTypes = {
  //   ...VisibleManagerProvider.childContextTypes,
  // };

  constructor(props, context) {
    super(props, context);
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (__DEV__ && DEBUG) {
      return !shallowEqualEx(this.props, nextProps, (prop1, prop2, key) => {
        const ret = propEqualsFunc(prop1, prop2, key);
        if (!ret) {
          // eslint-disable-next-line
          console.log(
            'SceneView shouldComponentUpdate',
            true,
            key,
            nextProps.scene.route
          );
        }
        return ret;
      });
    }
    return !shallowEqualEx(this.props, nextProps, propEqualsFunc);
  }
}
