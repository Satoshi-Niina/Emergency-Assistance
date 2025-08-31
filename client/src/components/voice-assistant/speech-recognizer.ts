// Minimal speech recognizer shim used by the VoiceAssistant component.
// Purpose: provide a small, well-typed fallback implementation so imports resolve
// and runtime doesn't break when no platform-specific recognizer is available.

export interface ISpeechRecognizer {
  start(): Promise<void>;
  stop(): void;
  // assigned by caller to receive recognized text
  sendToServer: (text: string) => void;
}

export function createSpeechRecognizer(_key: string, _region: string): ISpeechRecognizer {
  let running = false;

  const recognizer: ISpeechRecognizer = {
    sendToServer: () => {},
    async start() {
      // Minimal stub: does not perform real recognition.
      // Calling code assigns `sendToServer` and may call start/stop.
      running = true;
      return Promise.resolve();
    },
    stop() {
      running = false;
    },
  };

  return recognizer;
}
