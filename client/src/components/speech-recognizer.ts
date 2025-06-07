import {
  AudioConfig,
  ResultReason,
  SpeechConfig,
  SpeechRecognizer,
} from 'microsoft-cognitiveservices-speech-sdk';

export interface ISpeechRecognizer {
  start(): void;
  stop(): void;
  sendToServer?: (text: string) => void;
}

export class AzureSpeechRecognizer implements ISpeechRecognizer {
  private recognizer: SpeechRecognizer | null = null;
  private accumulatedText: string = '';
  private lastSpokenTime: number = 0;
  private silenceCheckInterval: any = null;

  constructor(private azureKey: string, private azureRegion: string) {}

  start() {
    const speechConfig = SpeechConfig.fromSubscription(this.azureKey, this.azureRegion);
    speechConfig.speechRecognitionLanguage = 'ja-JP';
    speechConfig.setProperty('SpeechServiceConnection_InitialSilenceTimeoutMs', '3000');
    speechConfig.setProperty('SpeechServiceConnection_EndSilenceTimeoutMs', '1500');

    const audioConfig = AudioConfig.fromDefaultMicrophoneInput();
    this.recognizer = new SpeechRecognizer(speechConfig, audioConfig);

    this.recognizer.recognizing = (_, e) => {
      this.accumulatedText = e.result.text;
      this.lastSpokenTime = Date.now();
    };

    this.recognizer.recognized = (_, e) => {
      if (e.result.reason === ResultReason.RecognizedSpeech) {
        this.accumulatedText = e.result.text;
        this.lastSpokenTime = Date.now();
      }
    };

    this.recognizer.startContinuousRecognitionAsync();

    this.silenceCheckInterval = setInterval(() => {
      const now = Date.now();
      const silenceDuration = now - this.lastSpokenTime;

      if (silenceDuration > 2000 && this.accumulatedText !== '') {
        this.sendToServer?.(this.accumulatedText);
        this.accumulatedText = '';
      }

      if (silenceDuration > 15000) {
        this.stop();
      }
    }, 500);
  }

  stop() {
    if (this.recognizer) {
      this.recognizer.stopContinuousRecognitionAsync(() => {
        this.recognizer?.close();
        this.recognizer = null;
      });
    }
    clearInterval(this.silenceCheckInterval);
  }

  sendToServer?: (text: string) => void;
}

export class WebSpeechRecognizer implements ISpeechRecognizer {
  private recognition: SpeechRecognition;
  private accumulatedText: string = '';
  private lastSpokenTime: number = 0;
  private silenceCheckInterval: any = null;
  public sendToServer?: (text: string) => void;

  constructor() {
    const SpeechRecognition =
      (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) {
      throw new Error('Web Speech API not supported');
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'ja-JP';
    this.recognition.interimResults = true;
    this.recognition.continuous = true;

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          this.accumulatedText += result[0].transcript + ' ';
        } else {
          interim += result[0].transcript;
        }
      }
      this.lastSpokenTime = Date.now();
    };

    this.recognition.onend = () => {
      this.start();
    };
  }

  start() {
    this.recognition.start();
    this.lastSpokenTime = Date.now();

    this.silenceCheckInterval = setInterval(() => {
      const now = Date.now();
      const silenceDuration = now - this.lastSpokenTime;

      if (silenceDuration > 2000 && this.accumulatedText !== '') {
        this.sendToServer?.(this.accumulatedText);
        this.accumulatedText = '';
      }

      if (silenceDuration > 15000) {
        this.stop();
      }
    }, 500);
  }

  stop() {
    this.recognition.stop();
    clearInterval(this.silenceCheckInterval);
  }
}

export function createSpeechRecognizer(azureKey: string, azureRegion: string): ISpeechRecognizer {
  if (isIOS() && isSafari()) {
    return new WebSpeechRecognizer();
  } else {
    return new AzureSpeechRecognizer(azureKey, azureRegion);
  }
}

function isIOS(): boolean {
  return /iP(hone|od|ad)/.test(navigator.platform);
}

function isSafari(): boolean {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}
