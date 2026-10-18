jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');

  const NOOP = (value) => value;

  return {
    __esModule: true,
    default: {
      View,
      createAnimatedComponent: (Component) => Component,
    },
    useSharedValue: (initial) => ({ value: initial }),
    useAnimatedStyle: (updater) => updater(),
    useAnimatedProps: (updater) => updater(),
    withTiming: NOOP,
    withSequence: (...animations) => animations[animations.length - 1],
    Easing: {
      out: (fn) => fn,
      cubic: NOOP,
    },
  };
});

jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');

  const Mock = (props) => React.createElement(View, props);

  return {
    __esModule: true,
    default: Mock,
    Svg: Mock,
    Circle: Mock,
  };
});
