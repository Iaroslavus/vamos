jest.mock('lottie-react-native', () => 'LottieView');

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
    runOnJS: (fn) => fn,
    interpolate: (value) => value,
    Extrapolation: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
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
      abort: jest.fn(() => {
        emit('end', {});
      }),
      isRecognitionAvailable: jest.fn(() => true),
      supportsOnDeviceRecognition: jest.fn(() => true),
      addListener: jest.fn(addListener),
      __emit: emit,
    },
  };
});

globalThis.__VAMOS_AUDIO__ = {
  granted: true,
  inputs: [{ name: 'Microphone', type: 'MicrophoneBuiltIn', uid: 'mic' }],
  current: { name: 'Microphone', type: 'MicrophoneBuiltIn', uid: 'mic' },
  isRecording: false,
  metering: undefined,
  failPrepare: false,
  uri: 'file:///cache/take.wav',
};

globalThis.__resetAudio__ = () => {
  globalThis.__VAMOS_AUDIO__ = {
    granted: true,
    inputs: [{ name: 'Microphone', type: 'MicrophoneBuiltIn', uid: 'mic' }],
    current: { name: 'Microphone', type: 'MicrophoneBuiltIn', uid: 'mic' },
    isRecording: false,
    metering: undefined,
    failPrepare: false,
    uri: 'file:///cache/take.wav',
  };
};

jest.mock('expo-audio', () => {
  const audio = () => globalThis.__VAMOS_AUDIO__;
  const permission = () => ({
    granted: audio().granted,
    canAskAgain: true,
    expires: 'never',
    status: audio().granted ? 'granted' : 'denied',
  });
  const recorder = {
    prepareToRecordAsync: jest.fn(async () => {
      if (audio().failPrepare) throw new Error('prepare failed');
    }),
    getAvailableInputs: jest.fn(() => audio().inputs),
    getCurrentInput: jest.fn(async () => {
      const current = audio().current;
      if (!current) throw new Error('no input');
      return current;
    }),
    record: jest.fn(() => {
      audio().isRecording = true;
    }),
    stop: jest.fn(async () => {
      audio().isRecording = false;
    }),
    getStatus: jest.fn(() => ({
      canRecord: true,
      isRecording: audio().isRecording,
      durationMillis: 0,
      fileSize: 0,
      mediaServicesDidReset: false,
      url: audio().uri,
      metering: audio().metering,
    })),
    get uri() {
      return audio().uri;
    },
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    id: 'recorder-test',
  };

  return {
    useAudioRecorder: () => recorder,
    setAudioModeAsync: jest.fn(async () => undefined),
    requestRecordingPermissionsAsync: jest.fn(async () => permission()),
    getRecordingPermissionsAsync: jest.fn(async () => permission()),
    createAudioPlayer: jest.fn(() => ({
      play: jest.fn(),
      pause: jest.fn(),
      remove: jest.fn(),
      seekTo: jest.fn(async () => undefined),
      setPlaybackRate: jest.fn(),
      addListener: jest.fn(() => ({ remove: jest.fn() })),
      shouldCorrectPitch: false,
    })),
  };
});

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');

  function chain() {
    const api = {
      enabled() {
        return api;
      },
      activeOffsetX() {
        return api;
      },
      failOffsetY() {
        return api;
      },
      onUpdate() {
        return api;
      },
      onEnd() {
        return api;
      },
    };
    return api;
  }

  return {
    GestureHandlerRootView: ({ children, ...props }) => React.createElement(View, props, children),
    GestureDetector: ({ children }) => children,
    Gesture: {
      Pan: chain,
      Tap: chain,
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
