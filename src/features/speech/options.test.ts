import {
  accessFromPermission,
  shouldRequireOnDevice,
  speechStartOptions,
  speechVolumeLevel,
} from './options';

describe('speechStartOptions', () => {
  it('asks for on-device es-ES and does not persist audio', () => {
    const options = speechStartOptions(true, ['buenos días', 'buenos', 'días']);

    expect(options.lang).toBe('es-ES');
    expect(options.requiresOnDeviceRecognition).toBe(true);
    expect(options.addsPunctuation).toBe(false);
    expect(options.continuous).toBe(false);
    expect(options.contextualStrings).toEqual(['buenos días', 'buenos', 'días']);
    expect(options).not.toHaveProperty('recordingOptions');
    expect(options).not.toHaveProperty('audioSource');
    expect(JSON.stringify(options)).not.toContain('persist');
  });

  it('can run without the on-device model', () => {
    expect(speechStartOptions(false, ['hola']).requiresOnDeviceRecognition).toBe(false);
  });
});

describe('shouldRequireOnDevice', () => {
  it('requires on-device recognition only when an es locale is installed', () => {
    expect(shouldRequireOnDevice(true, ['es-ES'])).toBe(true);
    expect(shouldRequireOnDevice(true, ['en-US'])).toBe(false);
    expect(shouldRequireOnDevice(false, ['es-ES'])).toBe(false);
  });
});

describe('accessFromPermission', () => {
  it('distinguishes granted, denied, and blocked', () => {
    expect(accessFromPermission({ granted: true, status: 'granted' })).toBe('granted');
    expect(accessFromPermission({ granted: false, status: 'denied', canAskAgain: true })).toBe(
      'denied',
    );
    expect(accessFromPermission({ granted: false, status: 'denied', canAskAgain: false })).toBe(
      'blocked',
    );
    expect(accessFromPermission({ granted: false, status: 'undetermined' })).toBe('unknown');
  });
});

describe('speechVolumeLevel', () => {
  it('maps silence and the native meter onto 0…1', () => {
    expect(speechVolumeLevel(-2)).toBe(0);
    expect(speechVolumeLevel(0)).toBe(0);
    expect(speechVolumeLevel(5)).toBe(0.5);
    expect(speechVolumeLevel(10)).toBe(1);
    expect(speechVolumeLevel(20)).toBe(1);
    expect(speechVolumeLevel(Number.NaN)).toBe(0);
  });
});
