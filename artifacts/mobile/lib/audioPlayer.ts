import {
  createAudioPlayer,
  type AudioPlayer,
  type AudioSource,
  type AudioStatus,
} from "expo-audio";

/**
 * Kleine Kompatibilitaetsschicht fuer die bisherige SagaTrail-Playback-Logik.
 *
 * expo-audio arbeitet mit synchronen AudioPlayer-Methoden und SharedObject-
 * Events, waehrend der Hike-Flow bewusst mit einer promise-basierten
 * Sound-Oberflaeche arbeitet. Die Schicht uebersetzt nur Lifecycle und
 * Status; Audio-Fokus und Hintergrundmodus werden direkt ueber expo-audio
 * konfiguriert.
 */
export type AudioPlaybackStatus = {
  isLoaded: boolean;
  didJustFinish: boolean;
  isPlaying: boolean;
  isBuffering: boolean;
  positionMillis: number;
};

export type AudioCreateOptions = {
  shouldPlay?: boolean;
  isLooping?: boolean;
  volume?: number;
};

function toPlaybackStatus(status: AudioStatus): AudioPlaybackStatus {
  return {
    isLoaded: status.isLoaded,
    didJustFinish: status.didJustFinish,
    isPlaying: status.playing,
    isBuffering: status.isBuffering,
    positionMillis: Math.round(status.currentTime * 1000),
  };
}

export class AudioSound {
  private readonly player: AudioPlayer;
  private statusSubscription: { remove: () => void } | null = null;
  private removed = false;

  constructor(player: AudioPlayer) {
    this.player = player;
  }

  async stopAsync(): Promise<void> {
    if (this.removed) return;
    this.player.pause();
    try {
      await this.player.seekTo(0);
    } catch {
      // Der Player kann noch laden oder bereits entfernt worden sein.
    }
  }

  async unloadAsync(): Promise<void> {
    if (this.removed) return;
    this.statusSubscription?.remove();
    this.statusSubscription = null;
    this.player.remove();
    this.removed = true;
  }

  async pauseAsync(): Promise<void> {
    if (!this.removed) this.player.pause();
  }

  async playAsync(): Promise<void> {
    if (!this.removed) this.player.play();
  }

  setOnPlaybackStatusUpdate(
    callback: (status: AudioPlaybackStatus) => void,
  ): void {
    this.statusSubscription?.remove();
    this.statusSubscription = this.player.addListener(
      "playbackStatusUpdate",
      (status) => callback(toPlaybackStatus(status)),
    );
  }
}

export async function createAudioSound(
  source: AudioSource,
  options: AudioCreateOptions = {},
): Promise<{ sound: AudioSound }> {
  const player = createAudioPlayer(source, {
    // Keep the session alive between narration clips. The global audio mode
    // still controls whether other apps are mixed or ducked.
    keepAudioSessionActive: true,
  });
  if (options.isLooping !== undefined) player.loop = options.isLooping;
  if (options.volume !== undefined) player.volume = options.volume;

  const sound = new AudioSound(player);
  if (options.shouldPlay) player.play();
  return { sound };
}