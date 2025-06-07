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
  private textBuffer: string[] = [];

  // 共通パラメータ
  private readonly SILENCE_DETECTION_TIME = 1000; // 無音検知: 1秒
  private readonly AUTO_STOP_TIME = 10000; // 自動停止: 10秒
  private readonly CHECK_INTERVAL = 200; // チェック間隔: 200ms

  constructor(private azureKey: string, private azureRegion: string) {}

  start() {
    const speechConfig = SpeechConfig.fromSubscription(this.azureKey, this.azureRegion);
    speechConfig.speechRecognitionLanguage = 'ja-JP';
    speechConfig.setProperty('SpeechServiceConnection_InitialSilenceTimeoutMs', '3000');
    speechConfig.setProperty('SpeechServiceConnection_EndSilenceTimeoutMs', '1000');

    const audioConfig = AudioConfig.fromDefaultMicrophoneInput();
    this.recognizer = new SpeechRecognizer(speechConfig, audioConfig);

    this.recognizer.recognizing = (_, e) => {
      if (e.result.text.trim()) {
        this.accumulatedText = e.result.text;
        this.lastSpokenTime = Date.now();
      }
    };

    this.recognizer.recognized = (_, e) => {
      if (e.result.reason === ResultReason.RecognizedSpeech && e.result.text.trim()) {
        this.textBuffer.push(e.result.text.trim());
        this.lastSpokenTime = Date.now();
      }
    };

    this.recognizer.startContinuousRecognitionAsync();

    this.silenceCheckInterval = setInterval(() => {
      const now = Date.now();
      const silenceDuration = now - this.lastSpokenTime;

      // 1秒の無音検知でバッファ内容を送信
      if (silenceDuration > this.SILENCE_DETECTION_TIME && this.textBuffer.length > 0) {
        const combinedText = this.textBuffer.join(' ').trim();
        if (combinedText) {
          this.sendToServer?.(combinedText);
        }
        this.textBuffer = [];
        this.accumulatedText = '';
      }

      // 10秒で自動停止
      if (silenceDuration > this.AUTO_STOP_TIME) {
        this.stop();
      }
    }, this.CHECK_INTERVAL);
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
  private textBuffer: string[] = [];
  public sendToServer?: (text: string) => void;

  // 共通パラメータ
  private readonly SILENCE_DETECTION_TIME = 1000; // 無音検知: 1秒
  private readonly AUTO_STOP_TIME = 10000; // 自動停止: 10秒
  private readonly CHECK_INTERVAL = 200; // チェック間隔: 200ms

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
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal && result[0].transcript.trim()) {
          this.textBuffer.push(result[0].transcript.trim());
          this.lastSpokenTime = Date.now();
        }
      }
    };

    this.recognition.onend = () => {
      if (this.silenceCheckInterval) {
        this.start();
      }
    };
  }

  start() {
    this.recognition.start();
    this.lastSpokenTime = Date.now();

    this.silenceCheckInterval = setInterval(() => {
      const now = Date.now();
      const silenceDuration = now - this.lastSpokenTime;

      // 1秒の無音検知でバッファ内容を送信
      if (silenceDuration > this.SILENCE_DETECTION_TIME && this.textBuffer.length > 0) {
        const combinedText = this.textBuffer.join(' ').trim();
        if (combinedText) {
          this.sendToServer?.(combinedText);
        }
        this.textBuffer = [];
        this.accumulatedText = '';
      }

      // 10秒で自動停止
      if (silenceDuration > this.AUTO_STOP_TIME) {
        this.stop();
      }
    }, this.CHECK_INTERVAL);
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