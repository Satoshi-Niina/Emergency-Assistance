// Web Speech APIの実装
class WebSpeechRecognizer {
  private recognition: SpeechRecognition | null = null;
  public sendToServer: ((text: string) => void) | null = null;

  async start() {
    if (
      !('webkitSpeechRecognition' in window) &&
      !('SpeechRecognition' in window)
    ) {
      throw new Error('ブラウザが音声認識をサポートしていません');
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();

    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'ja-JP';

    this.recognition.onresult = event => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal && this.sendToServer) {
          this.sendToServer(event.results[i][0].transcript);
        }
      }
    };

    this.recognition.onerror = event => {
      console.error('Web Speech認識エラー:', event.error);
    };

    this.recognition.start();
  }

  stop() {
    if (this.recognition) {
      this.recognition.stop();
      this.recognition = null;
    }
  }
}

// Azure Speech SDKの実装
class AzureSpeechRecognizer {
  private recognizer: any = null;
  public sendToServer: ((text: string) => void) | null = null;

  constructor(
    private subscriptionKey: string,
    private region: string
  ) {}

  async start() {
    try {
      // Azure Speech SDKを動的にインポート
      const speechSdk = await import('microsoft-cognitiveservices-speech-sdk');

      const speechConfig = speechSdk.SpeechConfig.fromSubscription(
        this.subscriptionKey,
        this.region
      );
      speechConfig.speechRecognitionLanguage = 'ja-JP';

      const audioConfig = speechSdk.AudioConfig.fromDefaultMicrophoneInput();
      this.recognizer = new speechSdk.SpeechRecognizer(
        speechConfig,
        audioConfig
      );

      this.recognizer.recognizing = (_s: any, e: any) => {
        // 中間結果は無視
      };

      this.recognizer.recognized = (_s: any, e: any) => {
        if (
          e.result.reason === speechSdk.ResultReason.RecognizedSpeech &&
          this.sendToServer
        ) {
          this.sendToServer(e.result.text);
        }
      };

      this.recognizer.startContinuousRecognitionAsync();
    } catch (error) {
      console.error('Azure Speech SDK初期化エラー:', error);
      throw error;
    }
  }

  stop() {
    if (this.recognizer) {
      this.recognizer.stopContinuousRecognitionAsync();
      this.recognizer = null;
    }
  }
}

let currentRecognizer: WebSpeechRecognizer | AzureSpeechRecognizer | null =
  null;

// Azure Speech認識を開始する関数
export const startSpeechRecognition = (
  onResult: (text: string) => void,
  onError: (error: string) => void
) => {
  try {
    // 環境変数からAzureの認証情報を取得
    // Azure Speech設定 - デフォルト値を使用（VITE_AZURE_SPEECH_*の参照を削除）
    const azureKey = ''; // デフォルト値
    const azureRegion = 'japaneast'; // デフォルト値

    if (!azureKey) {
      throw new Error('Azure Speech APIキーが設定されていません');
    }

    currentRecognizer = new AzureSpeechRecognizer(azureKey, azureRegion);
    currentRecognizer.sendToServer = onResult;
    currentRecognizer.start();
  } catch (error) {
    console.error('Azure Speech認識エラー:', error);
    onError(
      error instanceof Error ? error.message : '音声認識の開始に失敗しました'
    );
  }
};

// Azure Speech認識を停止する関数
export const stopSpeechRecognition = () => {
  if (currentRecognizer) {
    currentRecognizer.stop();
    currentRecognizer = null;
  }
};

// ブラウザのWeb Speech APIを開始する関数
export const startBrowserSpeechRecognition = (
  onResult: (text: string) => void,
  onError: (error: string) => void
) => {
  try {
    currentRecognizer = new WebSpeechRecognizer();
    currentRecognizer.sendToServer = onResult;
    currentRecognizer.start();
  } catch (error) {
    console.error('Web Speech認識エラー:', error);
    onError(
      error instanceof Error
        ? error.message
        : 'ブラウザ音声認識の開始に失敗しました'
    );
  }
};

// ブラウザのWeb Speech APIを停止する関数
export const stopBrowserSpeechRecognition = () => {
  if (currentRecognizer) {
    currentRecognizer.stop();
    currentRecognizer = null;
  }
};
