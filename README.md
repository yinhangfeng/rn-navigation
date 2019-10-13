# rn-navigation

* stack-navigation android 下也支持侧滑
* 兼容 web(无手势 淡入淡出动画)
* 自动根据 stack 改变安排合理动画 不局限于特定的规则(比如 push pop replace)
* 在没有 react-native-gesture-handler react-native-reanimated 的年代尽量做到了足够流畅(内部包括很多非 react 推荐的 hack)