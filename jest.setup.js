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
    withRepeat: NOOP,
    withSequence: (...animations) => animations[animations.length - 1],
    Easing: {
      out: (fn) => fn,
      inOut: (fn) => fn,
      ease: NOOP,
      cubic: NOOP,
    },
  };
});

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

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
