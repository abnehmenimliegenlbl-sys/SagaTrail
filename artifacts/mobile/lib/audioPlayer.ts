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
  durationMillis: number;
  error: string | null;
};

export type AudioCreateOptions = {
  shouldPlay?: boolean;
  isLooping?: boolean;
  volume?: number;
  debugId?: string;
  debug?: (event: AudioPlayerDebugEvent) => void;
};

export type AudioPlayerDebugEvent = {
  action:
    | "created"
    | "play_requested"
    | "play_called"
    | "pause_requested"
    | "pause_called"
    | "stop_requested"
    | "stop_called"
    | "unload_requested"
    | "unload_called"
    | "status";
  playerId: string;
  status?: AudioPlaybackStatus;
  error?: string;
};

let audioPlayerSequence = 0;

function toPlaybackStatus(status: AudioStatus): AudioPlaybackStatus {
  return {
    isLoaded: status.isLoaded,
    didJustFinish: status.didJustFinish,
    isPlaying: status.playing,
    isBuffering: status.isBuffering,
    positionMillis: Math.round(status.currentTime * 1000),
    durationMillis: Math.round(status.duration * 1000),
    error: status.error,
  };
}

/**
 * expo-audio normally reports `didJustFinish`, but on some native playback
 * paths it only emits a final paused status at the end of the file. Treat
 * that end position as completion too, otherwise the hike flow can remain
 * stuck in `speaking=true` and never release a decision point.
 */
export function isAudioPlaybackFinished(status: AudioPlaybackStatus): boolean {
  if (status.didJustFinish) return true;
  if (
    !status.isLoaded ||
    status.isPlaying ||
    status.isBuffering ||
    status.positionMillis <= 0 ||
    status.durationMillis <= 0
  ) {
    return false;
  }
  const endTolerance = Math.max(
    750,
    Math.min(1_500, Math.round(status.durationMillis * 0.05)),
  );
  return status.durationMillis - status.positionMillis <= endTolerance;
}

export class AudioSound {
  private readonly player: AudioPlayer;
  private readonly playerId: string;
  private readonly debug?: (event: AudioPlayerDebugEvent) => void;
  private statusSubscription: { remove: () => void } | null = null;
  private removed = false;
  private lastDebugStatus: string | null = null;

  constructor(
    player: AudioPlayer,
    playerId: string,
    debug?: (event: AudioPlayerDebugEvent) => void,
  ) {
    this.player = player;
    this.playerId = playerId;
    this.debug = debug;
  }

  private emit(
    action: AudioPlayerDebugEvent["action"],
    details: Omit<AudioPlayerDebugEvent, "action" | "playerId"> = {},
  ): void {
    this.debug?.({
      action,
      playerId: this.playerId,
      ...details,
    });
  }

  async stopAsync(): Promise<void> {
    if (this.removed) return;
    this.emit("stop_requested");
    this.player.pause();
    this.emit("stop_called");
    try {
      await this.player.seekTo(0);
    } catch {
      // Der Player kann noch laden oder bereits entfernt worden sein.
    }
  }

  async unloadAsync(): Promise<void> {
    if (this.removed) return;
    this.emit("unload_requested");
    this.statusSubscription?.remove();
    this.statusSubscription = null;
    this.player.remove();
    this.removed = true;
    this.emit("unload_called");
  }

  async pauseAsync(): Promise<void> {
    if (!this.removed) {
      this.emit("pause_requested");
      this.player.pause();
      this.emit("pause_called");
    }
  }

  async playAsync(): Promise<void> {
    if (!this.removed) {
      this.emit("play_requested");
      this.player.play();
      this.emit("play_called");
    }
  }

  setOnPlaybackStatusUpdate(
    callback: (status: AudioPlaybackStatus) => void,
  ): void {
    this.statusSubscription?.remove();
    this.statusSubscription = this.player.addListener(
      "playbackStatusUpdate",
      (status) => {
        const playbackStatus = toPlaybackStatus(status);
        const statusKey = JSON.stringify(playbackStatus);
        if (statusKey !== this.lastDebugStatus) {
          this.lastDebugStatus = statusKey;
          this.emit("status", { status: playbackStatus });
        }
        callback(playbackStatus);
      },
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
    // A final paused status can be the only end signal on native playback.
    // Keep the update interval short enough to catch it reliably.
    updateInterval: 250,
  });
  if (options.isLooping !== undefined) player.loop = options.isLooping;
  if (options.volume !== undefined) player.volume = options.volume;

  const playerId = options.debugId ?? `audio_player_${++audioPlayerSequence}`;
  const sound = new AudioSound(player, playerId, options.debug);
  options.debug?.({ action: "created", playerId });
  if (options.shouldPlay) {
    options.debug?.({ action: "play_requested", playerId });
    player.play();
    options.debug?.({ action: "play_called", playerId });
  }
  return { sound };
}