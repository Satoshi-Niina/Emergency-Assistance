
// Web Speech APIの実裁E
class WebSpeechRecognizer {
  private recognition: SpeechRecognition | null = null;
  public sendToServer: ((text: string) => void) | null = null;

  async start() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      throw new Error('ブラウザが音声認識をサポ�EトしてぁE��せん');
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'ja-JP';

    this.recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal && this.sendToServer) {
          this.sendToServer(event.results[i][0].transcript);
        }
      }
    };

    this.recognition.onerror = (event) => {
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

// Azure Speech SDKの実裁E
class AzureSpeechRecognizer {
  private recognizer: any = null;
  public sendToServer: ((text: string) => void) | null = null;

  constructor(private subscriptionKey: string, private region: string) {}

  async start() {
    try {
      // Azure Speech SDKを動皁E��インポ�EチE
      const speechSdk = await import('microsoft-cognitiveservices-speech-sdk');
      
      const speechConfig = speechSdk.SpeechConfig.fromSubscription(this.subscriptionKey, this.region);
      speechConfig.speechRecognitionLanguage = 'ja-JP';
      
      const audioConfig = speechSdk.AudioConfig.fromDefaultMicrophoneInput();
      this.recognizer = new speechSdk.SpeechRecognizer(speechConfig, audioConfig);

      this.recognizer.recognizing = (_s: any, e: any) => {
        // 中間結果は無要E
      };

      this.recognizer.recognized = (_s: any, e: any) => {
        if (e.result.reason === speechSdk.ResultReason.RecognizedSpeech && this.sendToServer) {
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

let currentRecognizer: WebSpeechRecognizer | AzureSpeechRecognizer | null = null;

// Azure Speech認識を開始する関数
export const startSpeechRecognition = (
  onResult: (text: string) => void,
  onError: (error: string) => void
) => {
  try {
    // 環墁E��数からAzureの認証惁E��を取征E
    // Azure Speech設宁E- チE��ォルト値を使用�E�EITE_AZURE_SPEECH_*の参�Eを削除�E�E
    const azureKey = ''; // チE��ォルト値
    const azureRegion = 'japaneast'; // チE��ォルト値
    
    if (!azureKey) {
      throw new Error('Azure Speech APIキーが設定されてぁE��せん');
    }

    currentRecognizer = new AzureSpeechRecognizer(azureKey, azureRegion);
    currentRecognizer.sendToServer = onResult;
    currentRecognizer.start();
  } catch (error) {
    console.error('Azure Speech認識エラー:', error);
    onError(error instanceof Error ? error.message : '音声認識�E開始に失敗しました');
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
    onError(error instanceof Error ? error.message : 'ブラウザ音声認識�E開始に失敗しました');
  }
};

// ブラウザのWeb Speech APIを停止する関数
export const stopBrowserSpeechRecognition = () => {
  if (currentRecognizer) {
    currentRecognizer.stop();
    currentRecognizer = null;
  }
};
