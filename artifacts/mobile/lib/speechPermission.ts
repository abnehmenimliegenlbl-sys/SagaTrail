type SpeechPermissionResponse = {
  granted?: boolean;
  status?: string;
} | null | undefined;

/**
 * expo-speech-recognition returns `status` on iOS, while some platforms and
 * wrappers also expose the convenience boolean `granted`.
 */
export function isSpeechPermissionGranted(
  response: SpeechPermissionResponse,
): boolean {
  return response?.granted === true || response?.status === "granted";
}