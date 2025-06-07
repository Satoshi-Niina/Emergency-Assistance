
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';

export interface ISpeechRecognizer {
  start(): void;
  stop(): void;
  sendToServer?: (text: string) => void;
}

export class AzureSpeechRecognizer implements ISpeechRecognizer {
  private recognizer: SpeechSDK.SpeechRecognizer | null = null;
  private audioConfig: SpeechSDK.AudioConfig | null = null;
  public sendToServer?: (text: string) => void;

  constructor(private apiKey: string, private region: string) {}

  async start(): Promise<void> {
    try {
      console.log('🎤 Azure音声認識開始');
      console.log('🔑 Azure設定確認:', {
        key: this.apiKey.substring(0, 10) + '...',
        region: this.region
      });

      // マイクアクセス許可確認
      console.log('🎙️ マイクロフォンアクセス許可を確認中...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        } 
      });
      console.log('✅ マイクロフォンアクセス許可済み');

      // マイクテスト
      await this.testMicrophone(stream);

      // Azure Speech設定
      const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(this.apiKey, this.region);
      speechConfig.speechRecognitionLanguage = 'ja-JP';
      speechConfig.setProperty(SpeechSDK.PropertyId.SpeechServiceConnection_InitialSilenceTimeoutMs, '8000');
      speechConfig.setProperty(SpeechSDK.PropertyId.SpeechServiceConnection_EndSilenceTimeoutMs, '3000');
      speechConfig.setProperty(SpeechSDK.PropertyId.Speech_SegmentationSilenceTimeoutMs, '3000');

      console.log('🎚️ Azure音声設定完了:', {
        language: 'ja-JP',
        initialSilence: '8000ms',
        endSilence: '3000ms',
        mode: 'Interactive'
      });

      // AudioConfig作成 - より互換性の高い方法を使用
      console.log('🎯 AudioConfig作成中...');
      try {
        // まずdefaultMicrophoneInputを試行
        this.audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
        console.log('🔧 AudioConfig設定:', {
          type: 'DefaultMicrophoneInput',
          status: 'success'
        });
      } catch (error) {
        console.log('⚠️ DefaultMicrophoneInput失敗、StreamInputを試行');
        // フォールバックとしてStreamInputを使用
        this.audioConfig = SpeechSDK.AudioConfig.fromStreamInput(
          SpeechSDK.AudioInputStream.createPushStream(
            SpeechSDK.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1)
          )
        );
        console.log('🔧 AudioConfig設定:', {
          type: 'StreamInput',
          sampleRate: '16000Hz',
          channels: 1
        });
      }

      // SpeechRecognizer作成
      this.recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, this.audioConfig);
      console.log('🎯 SpeechRecognizer作成完了');

      // イベントハンドラ設定
      this.setupEventHandlers();

      // 連続認識開始
      console.log('🚀 Azure連続音声認識を開始します...');
      this.recognizer.startContinuousRecognitionAsync(
        () => {
          console.log('✅ Azure認識開始成功 - 日本語で話してください（大きめの声で）');
          console.log('💡 ヒント: 「こんにちは」「テスト」など短い言葉から試してください');
        },
        (error) => {
          console.error('❌ Azure認識開始失敗:', error);
          this.cleanup();
        }
      );

    } catch (error) {
      console.error('❌ Azure音声認識初期化エラー:', error);
      throw error;
    }
  }

  private async testMicrophone(stream: MediaStream): Promise<void> {
    return new Promise((resolve) => {
      console.log('🔊 マイクロフォン音声レベルテスト開始（5秒間）- 話してみてください');
      
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let maxLevel = 0;
      let totalLevel = 0;
      let samples = 0;
      let speechDetected = false;

      const checkAudio = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        const level = Math.round(average * 100) / 100;
        
        if (level > 15) speechDetected = true;
        if (level > maxLevel) maxLevel = level;
        totalLevel += level;
        samples++;

        if (samples % 5 === 0) {
          console.log(`🎵 音声レベル: ${level} (最大: ${maxLevel.toFixed(1)}, 平均: ${(totalLevel/samples).toFixed(1)})`);
        }
      };

      const interval = setInterval(checkAudio, 100);
      
      setTimeout(() => {
        clearInterval(interval);
        audioContext.close();
        
        const result = {
          maxLevel: maxLevel.toFixed(2),
          avgLevel: (totalLevel / samples).toFixed(2),
          samples,
          speechDetected,
          recommendation: speechDetected ? '✅ 音声検出良好' : '⚠️ 音声レベルが低い - より大きな声で話してください'
        };
        
        console.log('📊 マイクテスト結果:', result);
        resolve();
      }, 5000);
    });
  }

  private setupEventHandlers(): void {
    if (!this.recognizer) return;

    this.recognizer.sessionStarted = (s, e) => {
      console.log('🟢 Azure音声認識セッション開始:', e.sessionId);
    };

    this.recognizer.sessionStopped = (s, e) => {
      console.log('🔴 Azure音声認識セッション停止:', e.sessionId);
    };

    this.recognizer.speechStartDetected = (s, e) => {
      console.log('🎵 音声検出開始 - 話し始めました');
    };

    this.recognizer.speechEndDetected = (s, e) => {
      console.log('🔇 音声検出終了 - 話し終わりました');
    };

    this.recognizer.recognizing = (s, e) => {
      if (e.result.text) {
        console.log('🔄 認識中:', e.result.text);
      }
    };

    this.recognizer.recognized = (s, e) => {
      const result = {
        text: e.result.text,
        reason: this.getReasonString(e.result.reason),
        duration: e.result.duration,
        offset: e.result.offset
      };
      
      console.log('✅ Azure認識完了:', result);

      if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech && e.result.text.trim()) {
        console.log('📝 音声認識成功:', e.result.text);
        if (this.sendToServer) {
          this.sendToServer(e.result.text);
        }
      } else {
        console.log('🔍 音声が検出されませんでした - マイクが正常に動作しているか確認してください');
      }
    };

    this.recognizer.canceled = (s, e) => {
      const errorInfo = {
        reason: e.reason,
        errorCode: e.errorCode,
        errorDetails: e.errorDetails,
        sessionId: e.sessionId,
        offset: e.offset || 'なし'
      };
      
      console.error('❌ Azure認識キャンセル:', errorInfo);
      
      const suggestion = this.getErrorSuggestion(e.errorCode);
      console.log('💡 エラー対処法:', suggestion);
      
      this.cleanup();
    };
  }

  private getReasonString(reason: SpeechSDK.ResultReason): string {
    switch (reason) {
      case SpeechSDK.ResultReason.RecognizedSpeech:
        return 'RecognizedSpeech (音声認識成功)';
      case SpeechSDK.ResultReason.NoMatch:
        return 'NoMatch (音声検出なし)';
      case SpeechSDK.ResultReason.Canceled:
        return 'Canceled (認識キャンセル)';
      default:
        return `Unknown (${reason})`;
    }
  }

  private getErrorSuggestion(errorCode: SpeechSDK.CancellationErrorCode): string {
    switch (errorCode) {
      case SpeechSDK.CancellationErrorCode.NoError:
        return 'エラーなし';
      case SpeechSDK.CancellationErrorCode.AuthenticationFailure:
        return 'APIキーまたはリージョンを確認してください';
      case SpeechSDK.CancellationErrorCode.BadRequest:
        return 'リクエスト形式を確認してください';
      case SpeechSDK.CancellationErrorCode.TooManyRequests:
        return 'リクエスト制限に達しました。しばらく待ってから再試行してください';
      case SpeechSDK.CancellationErrorCode.Forbidden:
        return 'APIキーの権限を確認してください';
      case SpeechSDK.CancellationErrorCode.ConnectionFailure:
        return 'ネットワーク接続を確認してください';
      case SpeechSDK.CancellationErrorCode.ServiceTimeout:
        return 'サービスタイムアウト - 再試行してください';
      default:
        return `エラーコード: ${errorCode} - Azure Speechサポートに問い合わせてください`;
    }
  }

  stop(): void {
    this.cleanup();
  }

  private cleanup(): void {
    if (this.recognizer) {
      try {
        this.recognizer.stopContinuousRecognitionAsync(
          () => {
            console.log('🛑 Azure音声認識停止完了');
            if (this.recognizer) {
              try {
                this.recognizer.close();
              } catch (error) {
                console.warn('⚠️ Recognizer close警告:', error);
              }
              this.recognizer = null;
            }
          },
          (error) => {
            console.error('❌ Azure音声認識停止エラー:', error);
            if (this.recognizer) {
              try {
                this.recognizer.close();
              } catch (closeError) {
                console.warn('⚠️ Recognizer close警告:', closeError);
              }
              this.recognizer = null;
            }
          }
        );
      } catch (error) {
        console.error('❌ 停止処理エラー:', error);
        // 強制的にリセット
        this.recognizer = null;
      }
    }

    if (this.audioConfig) {
      try {
        // closeメソッドが存在し、かつfunctionであることを確認
        if (this.audioConfig && typeof this.audioConfig.close === 'function') {
          this.audioConfig.close();
          console.log('✅ AudioConfig正常終了');
        } else {
          console.warn('⚠️ AudioConfig.closeメソッドが利用できません');
        }
      } catch (error) {
        console.warn('⚠️ AudioConfig終了警告:', error);
      } finally {
        this.audioConfig = null;
      }
    }
  }
}

export class WebSpeechRecognizer implements ISpeechRecognizer {
  private recognition: any = null;
  public sendToServer?: (text: string) => void;

  start(): void {
    console.log('🌐 Web Speech API開始');
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      throw new Error('このブラウザはWeb Speech APIをサポートしていません');
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'ja-JP';
    this.recognition.continuous = true;
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
      console.log('✅ Web Speech認識開始');
    };

    this.recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      if (result.isFinal) {
        const transcript = result[0].transcript.trim();
        console.log('📝 Web Speech認識結果:', transcript);
        if (this.sendToServer && transcript) {
          this.sendToServer(transcript);
        }
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('❌ Web Speech認識エラー:', event.error);
    };

    this.recognition.onend = () => {
      console.log('🔴 Web Speech認識終了');
    };

    this.recognition.start();
  }

  stop(): void {
    if (this.recognition) {
      this.recognition.stop();
      this.recognition = null;
      console.log('🛑 Web Speech認識停止');
    }
  }
}

// ファクトリ関数
export function createSpeechRecognizer(apiKey: string, region: string): ISpeechRecognizer {
  // iOSまたはSafariの場合はWeb Speech APIを使用
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  
  if (isIOS || isSafari) {
    console.log('🍎 iOS/Safari検出 - Web Speech APIを使用');
    return new WebSpeechRecognizer();
  } else {
    console.log('🖥️ デスクトップブラウザ検出 - Azure Speech SDKを使用');
    return new AzureSpeechRecognizer(apiKey, region);
  }
}
