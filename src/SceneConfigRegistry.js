import SceneConfigs from './SceneConfigs';

const configMap = {};

const SceneConfigRegistry = {
  register(map) {
    Object.assign(configMap, map);
  },

  getByKey(key) {
    return configMap[key];
  },
};

SceneConfigRegistry.register(SceneConfigs);

export default SceneConfigRegistry;
