
import { createSpeechRecognizer, ISpeechRecognizer } from '../components/speech-recognizer';

let currentRecognizer: ISpeechRecognizer | null = null;

// Azure Speech認識を開始する関数
export const startSpeechRecognition = (
  onResult: (text: string) => void,
  onError: (error: string) => void
) => {
  try {
    // 環境変数からAzureの認証情報を取得
    const azureKey = process.env.VITE_AZURE_SPEECH_KEY || '';
    const azureRegion = process.env.VITE_AZURE_SPEECH_REGION || 'japaneast';
    
    if (!azureKey) {
      throw new Error('Azure Speech APIキーが設定されていません');
    }

    currentRecognizer = createSpeechRecognizer(azureKey, azureRegion);
    currentRecognizer.sendToServer = onResult;
    currentRecognizer.start();
  } catch (error) {
    console.error('Azure Speech認識エラー:', error);
    onError(error instanceof Error ? error.message : '音声認識の開始に失敗しました');
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
    // WebSpeechRecognizerを直接使用
    const { WebSpeechRecognizer } = require('../components/speech-recognizer');
    currentRecognizer = new WebSpeechRecognizer();
    currentRecognizer.sendToServer = onResult;
    currentRecognizer.start();
  } catch (error) {
    console.error('Web Speech認識エラー:', error);
    onError(error instanceof Error ? error.message : 'ブラウザ音声認識の開始に失敗しました');
  }
};

// ブラウザのWeb Speech APIを停止する関数
export const stopBrowserSpeechRecognition = () => {
  if (currentRecognizer) {
    currentRecognizer.stop();
    currentRecognizer = null;
  }
};
