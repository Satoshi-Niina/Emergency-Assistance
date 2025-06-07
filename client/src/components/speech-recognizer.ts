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
    console.log('🎤 Azure音声認識開始');
    console.log('🔑 Azure設定確認:', { 
      key: this.azureKey ? `${this.azureKey.substring(0, 10)}...` : 'なし',
      region: this.azureRegion 
    });

    const speechConfig = SpeechConfig.fromSubscription(this.azureKey, this.azureRegion);
    speechConfig.speechRecognitionLanguage = 'ja-JP';
    speechConfig.setProperty('SpeechServiceConnection_InitialSilenceTimeoutMs', '3000');
    speechConfig.setProperty('SpeechServiceConnection_EndSilenceTimeoutMs', '1000');

    console.log('🎙️ マイクロフォンアクセスを要求中...');
    const audioConfig = AudioConfig.fromDefaultMicrophoneInput();
    this.recognizer = new SpeechRecognizer(speechConfig, audioConfig);
    console.log('🎯 SpeechRecognizer作成完了');

    this.recognizer.recognizing = (_, e) => {
      console.log('🎯 Azure認識中:', e.result.text);
      if (e.result.text.trim()) {
        this.accumulatedText = e.result.text;
        this.lastSpokenTime = Date.now();
      }
    };

    this.recognizer.recognized = (_, e) => {
      console.log('✅ Azure認識完了:', e.result.text, 'Reason:', e.result.reason);
      if (e.result.reason === ResultReason.RecognizedSpeech && e.result.text.trim()) {
        this.textBuffer.push(e.result.text.trim());
        this.lastSpokenTime = Date.now();
        console.log('📋 バッファに追加:', e.result.text.trim());
      }
    };

    this.recognizer.startContinuousRecognitionAsync(
      () => console.log('✅ Azure認識開始成功'),
      (error) => console.error('❌ Azure認識開始エラー:', error)
    );

    this.silenceCheckInterval = setInterval(() => {
      const now = Date.now();
      const silenceDuration = now - this.lastSpokenTime;

      // 1秒の無音検知でバッファ内容を送信
      if (silenceDuration > this.SILENCE_DETECTION_TIME && this.textBuffer.length > 0) {
        const combinedText = this.textBuffer.join(' ').trim();
        if (combinedText) {
          console.log('📤 Azure送信:', combinedText);
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

  private getReasonText(reason: ResultReason): string {
    switch (reason) {
      case ResultReason.RecognizedSpeech:
        return 'RecognizedSpeech (音声認識成功)';
      case ResultReason.NoMatch:
        return 'NoMatch (音声検出なし)';
      case ResultReason.Canceled:
        return 'Canceled (キャンセル)';
      default:
        return `Unknown (${reason})`;
    }
  }
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
    console.log('🌐 WebSpeech初期化開始');
    const SpeechRecognition =
      (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;

    console.log('🔍 WebSpeech API サポート確認:', {
      webkitSpeechRecognition: !!(window as any).webkitSpeechRecognition,
      SpeechRecognition: !!(window as any).SpeechRecognition,
      userAgent: navigator.userAgent
    });

    if (!SpeechRecognition) {
      console.error('❌ Web Speech API not supported');
      throw new Error('Web Speech API not supported');
    }

    this.recognition = new SpeechRecognition();
    console.log('✅ WebSpeech認識エンジン作成完了');
    this.recognition.lang = 'ja-JP';
    this.recognition.interimResults = true;
    this.recognition.continuous = true;

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      console.log('🎯 WebSpeech結果受信:', event.results.length, '件');
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        console.log(`📝 結果${i}:`, result[0].transcript, 'isFinal:', result.isFinal);
        if (result.isFinal && result[0].transcript.trim()) {
          this.textBuffer.push(result[0].transcript.trim());
          this.lastSpokenTime = Date.now();
          console.log('📋 WebSpeechバッファに追加:', result[0].transcript.trim());
        }
      }
    };

    this.recognition.onend = () => {
      console.log('🔄 WebSpeech認識終了 - 再開始します');
      if (this.silenceCheckInterval) {
        this.start();
      }
    };

    this.recognition.onerror = (event) => {
      console.error('❌ WebSpeech認識エラー:', event.error);
    };

    this.recognition.onstart = () => {
      console.log('🟢 WebSpeech認識開始イベント');
    };

    this.recognition.onstop = () => {
      console.log('🔴 WebSpeech認識停止イベント');
    };
  }

  start() {
    console.log('🎤 WebSpeech音声認識開始');

    // マイクアクセス許可を明示的に確認
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => {
          console.log('✅ マイクアクセス許可済み');
          this.recognition.start();
          this.lastSpokenTime = Date.now();
        })
        .catch((error) => {
          console.error('❌ マイクアクセス拒否:', error);
        });
    } else {
      console.log('⚠️ getUserMediaが利用できません - 直接開始します');
      this.recognition.start();
      this.lastSpokenTime = Date.now();
    }

    this.silenceCheckInterval = setInterval(() => {
      const now = Date.now();
      const silenceDuration = now - this.lastSpokenTime;

      // 1秒の無音検知でバッファ内容を送信
      if (silenceDuration > this.SILENCE_DETECTION_TIME && this.textBuffer.length > 0) {
        const combinedText = this.textBuffer.join(' ').trim();
        if (combinedText) {
          console.log('📤 WebSpeech送信:', combinedText);
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