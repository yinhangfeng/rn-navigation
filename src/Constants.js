const TRANSITION_STATE_IDLE = 0; // transition 空闲
const TRANSITION_STATE1 = 1; // 状态1 动画未开始 等待 scenes 更新
const TRANSITION_STATE2 = 2; // 状态2 动画过程中
const TRANSITION_STATE3 = 3; // 状态3 动画结束 等待scenes更新
const TRANSITION_STATE4 = 4; // 状态4 pendingTransition 动画未开始 等待 scenes 更新

const DEBUG = __DEV__ && false;

export {
  TRANSITION_STATE_IDLE,
  TRANSITION_STATE1,
  TRANSITION_STATE2,
  TRANSITION_STATE3,
  TRANSITION_STATE4,
  DEBUG,
};
