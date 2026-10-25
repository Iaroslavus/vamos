jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'ru', languageTag: 'ru-RU' }],
}));

jest.mock('expo-linking', () => ({
  createURL: (path) => `vamos://${String(path).replace(/^\//, '')}`,
  getInitialURL: jest.fn(async () => null),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');

  return new Proxy(
    { __esModule: true },
    {
      get(target, prop) {
        if (prop in target) return target[prop];
        function Icon(props) {
          return React.createElement(View, props);
        }
        Icon.displayName = String(prop);
        return Icon;
      },
    },
  );
});

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
    withDelay: (_delay, animation) => animation,
    withRepeat: (animation) => animation,
    withSequence: (...animations) => animations[animations.length - 1],
    Easing: {
      out: (fn) => fn,
      inOut: (fn) => fn,
      cubic: NOOP,
      ease: NOOP,
    },
  };
});

jest.mock('expo-speech-recognition', () => {
  const listeners = new Map();

  function addListener(event, listener) {
    const bucket = listeners.get(event) ?? new Set();
    bucket.add(listener);
    listeners.set(event, bucket);
    return {
      remove() {
        bucket.delete(listener);
      },
    };
  }

  function emit(event, payload) {
    const bucket = listeners.get(event);
    if (!bucket) return;
    for (const listener of bucket) listener(payload);
  }

  const granted = {
    granted: true,
    canAskAgain: true,
    expires: 'never',
    status: 'granted',
  };

  return {
    ExpoSpeechRecognitionModule: {
      requestPermissionsAsync: jest.fn(async () => granted),
      getPermissionsAsync: jest.fn(async () => granted),
      getSupportedLocales: jest.fn(async () => ({
        locales: ['es-ES'],
        installedLocales: ['es-ES'],
      })),
      start: jest.fn(),
      stop: jest.fn(),
      abort: jest.fn(),
      isRecognitionAvailable: jest.fn(() => true),
      supportsOnDeviceRecognition: jest.fn(() => true),
      addListener: jest.fn(addListener),
      __emit: emit,
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
