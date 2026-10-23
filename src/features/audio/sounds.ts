import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

export type UiSound = 'correct' | 'wrong' | 'complete';

const SOUND_SOURCES = {
  correct: require('../../../assets/sounds/correct.wav'),
  wrong: require('../../../assets/sounds/wrong.wav'),
  complete: require('../../../assets/sounds/complete.wav'),
} as const;

let activeUiPlayer: AudioPlayer | null = null;

async function playSource(source: number): Promise<void> {
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
    });
    if (activeUiPlayer) {
      try {
        activeUiPlayer.pause();
        activeUiPlayer.remove();
      } catch {
        // ignore
      }
      activeUiPlayer = null;
    }
    const player = createAudioPlayer(source);
    activeUiPlayer = player;
    player.play();
  } catch {
    // UI sounds are best-effort (simulator / missing native module).
  }
}

export async function playUiSound(sound: UiSound): Promise<void> {
  await playSource(SOUND_SOURCES[sound]);
}

export function playGradeSound(status: 'correct' | 'almost' | 'wrong'): void {
  if (status === 'wrong') {
    void playUiSound('wrong');
    return;
  }
  void playUiSound('correct');
}
