/**
 * web 不支持
 */
export default class GestureResponder {
  constructor(navigation, animator, onStartShouldSetPanResponderCapture) {}

  isResponding() {
    return false;
  }

  forceReset() {}

  getPanHandlers(enabled) {
    return null;
  }

  setEnabled(enabled) {
    this._isEnabled = enabled;
  }

  isEnabled() {
    return this._isEnabled;
  }
}
