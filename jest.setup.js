jest.mock('react-native-reanimated', () => {
  const { Text, View } = require('react-native');

  const NOOP = (value) => value;

  return {
    __esModule: true,
    default: {
      View,
      Text,
      createAnimatedComponent: (Component) => Component,
    },
    useSharedValue: (initial) => ({ value: initial }),
    useAnimatedStyle: (updater) => updater(),
    useAnimatedProps: (updater) => updater(),
    withTiming: NOOP,
    withSpring: NOOP,
    withSequence: (...animations) => animations[animations.length - 1],
    Easing: {
      out: (fn) => fn,
      cubic: NOOP,
    },
  };
});
