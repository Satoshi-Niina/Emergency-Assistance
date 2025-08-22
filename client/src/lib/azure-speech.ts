
// Web Speech API縺ｮ螳溯｣・
class WebSpeechRecognizer {
  private recognition: SpeechRecognition | null = null;
  public sendToServer: ((text: string) => void) | null = null;

  async start() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      throw new Error('繝悶Λ繧ｦ繧ｶ縺碁浹螢ｰ隱崎ｭ倥ｒ繧ｵ繝昴・繝医＠縺ｦ縺・∪縺帙ｓ');
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
      console.error('Web Speech隱崎ｭ倥お繝ｩ繝ｼ:', event.error);
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

// Azure Speech SDK縺ｮ螳溯｣・
class AzureSpeechRecognizer {
  private recognizer: any = null;
  public sendToServer: ((text: string) => void) | null = null;

  constructor(private subscriptionKey: string, private region: string) {}

  async start() {
    try {
      // Azure Speech SDK繧貞虚逧・↓繧､繝ｳ繝昴・繝・
      const speechSdk = await import('microsoft-cognitiveservices-speech-sdk');
      
      const speechConfig = speechSdk.SpeechConfig.fromSubscription(this.subscriptionKey, this.region);
      speechConfig.speechRecognitionLanguage = 'ja-JP';
      
      const audioConfig = speechSdk.AudioConfig.fromDefaultMicrophoneInput();
      this.recognizer = new speechSdk.SpeechRecognizer(speechConfig, audioConfig);

      this.recognizer.recognizing = (_s: any, e: any) => {
        // 荳ｭ髢鍋ｵ先棡縺ｯ辟｡隕・
      };

      this.recognizer.recognized = (_s: any, e: any) => {
        if (e.result.reason === speechSdk.ResultReason.RecognizedSpeech && this.sendToServer) {
          this.sendToServer(e.result.text);
        }
      };

      this.recognizer.startContinuousRecognitionAsync();
    } catch (error) {
      console.error('Azure Speech SDK蛻晄悄蛹悶お繝ｩ繝ｼ:', error);
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

// Azure Speech隱崎ｭ倥ｒ髢句ｧ九☆繧矩未謨ｰ
export const startSpeechRecognition = (
  onResult: (text: string) => void,
  onError: (error: string) => void
) => {
  try {
    // 迺ｰ蠅・､画焚縺九ｉAzure縺ｮ隱崎ｨｼ諠・ｱ繧貞叙蠕・
    // Azure Speech險ｭ螳・- 繝・ヵ繧ｩ繝ｫ繝亥､繧剃ｽｿ逕ｨ・・ITE_AZURE_SPEECH_*縺ｮ蜿ら・繧貞炎髯､・・
    const azureKey = ''; // 繝・ヵ繧ｩ繝ｫ繝亥､
    const azureRegion = 'japaneast'; // 繝・ヵ繧ｩ繝ｫ繝亥､
    
    if (!azureKey) {
      throw new Error('Azure Speech API繧ｭ繝ｼ縺瑚ｨｭ螳壹＆繧後※縺・∪縺帙ｓ');
    }

    currentRecognizer = new AzureSpeechRecognizer(azureKey, azureRegion);
    currentRecognizer.sendToServer = onResult;
    currentRecognizer.start();
  } catch (error) {
    console.error('Azure Speech隱崎ｭ倥お繝ｩ繝ｼ:', error);
    onError(error instanceof Error ? error.message : '髻ｳ螢ｰ隱崎ｭ倥・髢句ｧ九↓螟ｱ謨励＠縺ｾ縺励◆');
  }
};

// Azure Speech隱崎ｭ倥ｒ蛛懈ｭ｢縺吶ｋ髢｢謨ｰ
export const stopSpeechRecognition = () => {
  if (currentRecognizer) {
    currentRecognizer.stop();
    currentRecognizer = null;
  }
};

// 繝悶Λ繧ｦ繧ｶ縺ｮWeb Speech API繧帝幕蟋九☆繧矩未謨ｰ
export const startBrowserSpeechRecognition = (
  onResult: (text: string) => void,
  onError: (error: string) => void
) => {
  try {
    currentRecognizer = new WebSpeechRecognizer();
    currentRecognizer.sendToServer = onResult;
    currentRecognizer.start();
  } catch (error) {
    console.error('Web Speech隱崎ｭ倥お繝ｩ繝ｼ:', error);
    onError(error instanceof Error ? error.message : '繝悶Λ繧ｦ繧ｶ髻ｳ螢ｰ隱崎ｭ倥・髢句ｧ九↓螟ｱ謨励＠縺ｾ縺励◆');
  }
};

// 繝悶Λ繧ｦ繧ｶ縺ｮWeb Speech API繧貞●豁｢縺吶ｋ髢｢謨ｰ
export const stopBrowserSpeechRecognition = () => {
  if (currentRecognizer) {
    currentRecognizer.stop();
    currentRecognizer = null;
  }
};
