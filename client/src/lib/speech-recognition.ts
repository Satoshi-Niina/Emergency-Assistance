class BrowserSpeechRecognizer {
  private recognition: SpeechRecognition | null = null;
  public sendToServer: ((text: string) => void) | null = null;

  start() {
    if (
      !('webkitSpeechRecognition' in window) &&
      !('SpeechRecognition' in window)
    ) {
      throw new Error('ブラウザが音声認識をサポートしていません');
    }

    const SpeechRecognitionImpl =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognitionImpl();

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

let currentRecognizer: BrowserSpeechRecognizer | null = null;

export const startSpeechRecognition = (
  onResult: (text: string) => void,
  onError: (error: string) => void
) => {
  try {
    currentRecognizer = new BrowserSpeechRecognizer();
    currentRecognizer.sendToServer = onResult;
    currentRecognizer.start();
  } catch (error) {
    console.error('Web Speech認識エラー:', error);
    onError(
      error instanceof Error ? error.message : '音声認識の開始に失敗しました'
    );
  }
};

export const stopSpeechRecognition = () => {
  if (currentRecognizer) {
    currentRecognizer.stop();
    currentRecognizer = null;
  }
};
