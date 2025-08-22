import React, { useState, useRef, useEffect } from 'react';
import { createSpeechRecognizer, ISpeechRecognizer } from '../speech-recognizer';

const VoiceAssistant = ({ onRecognized }: { onRecognized: (text: string) => void }) => {
  const [isRecording, setIsRecording] = useState(false);
  const recognizerRef = useRef<ISpeechRecognizer | null>(null);
  const speechBufferRef = useRef<string[]>([]);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSpeechTimeRef = useRef<number>(0);

  // Azure Speech設宁E- チE��ォルト値を使用�E�EEACT_APP_AZURE_SPEECH_*の参�Eを削除�E�E
  const azureKey = ''; // チE��ォルト値
  const azureRegion = 'japaneast'; // チE��ォルト値

  // 設宁E
  const SILENCE_TIMEOUT = 3000; // 3秒�E無音で終亁E
  const MIN_SPEECH_LENGTH = 3; // 最小文字数

  const isIOS = () => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  };

  // バッファ処琁E
  const addToBuffer = (text: string) => {
    if (!text.trim()) return;

    console.log('🔄 音声バッファに追加:', text);
    speechBufferRef.current.push(text.trim());
    lastSpeechTimeRef.current = Date.now();

    // 無音タイマ�EをリセチE��
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }

    // 新しい無音タイマ�Eを開姁E
    silenceTimeoutRef.current = setTimeout(() => {
      finalizeSpeech();
    }, SILENCE_TIMEOUT);
  };

  // 発話終亁E�E琁E
  const finalizeSpeech = () => {
    if (speechBufferRef.current.length === 0) return;

    const combinedText = speechBufferRef.current.join(' ').trim();
    console.log('✁E発話統合完亁E', combinedText);

    if (combinedText.length >= MIN_SPEECH_LENGTH) {
      // 画像検索のキーワードかどぁE��チェチE���E�コンチE��ストと同じキーワードリストを使用�E�E
      const imageSearchKeywords = [
        'ブレーキ', 'brake', 'エンジン', 'engine', '冷却', 'cooling', 'ラジエーター', 'radiator',
        'ホイール', 'wheel', '車輪', 'タイヤ', 'tire', '部品E, 'parts', '設傁E, 'equipment',
        '機械', 'machine', '保宁E, 'maintenance', '点椁E, 'inspection', '修琁E, 'repair',
        '敁E��', 'failure', '異常', 'abnormal', '音', 'sound', '振勁E, 'vibration'
      ];
      const hasImageKeyword = imageSearchKeywords.some(keyword => 
        combinedText.toLowerCase().includes(keyword.toLowerCase())
      );

      onRecognized(combinedText);
    } else {
      console.log('⚠�E�E発話が短すぎまぁE', combinedText);
    }

    // バッファをクリア
    speechBufferRef.current = [];

    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
  };

  // 認識開姁E
  const startRecognition = async () => {
    if (isRecording) return;

    try {
      setIsRecording(true);
      speechBufferRef.current = [];
      lastSpeechTimeRef.current = Date.now();

      console.log('🎤 音声認識開姁E-', isIOS() ? 'Web Speech API' : 'Azure Speech SDK');

      // speech-recognizer.tsのファクトリ関数を使用
      recognizerRef.current = createSpeechRecognizer(azureKey, azureRegion);

      // 認識結果を受信する処琁E��設宁E
      recognizerRef.current.sendToServer = (text: string) => {
        console.log('🔊 音声認識結果受信:', text);
        addToBuffer(text);
      };

      // 認識開姁E
      await recognizerRef.current.start();

    } catch (error) {
      console.error('❁E音声認識開始エラー:', error);
      setIsRecording(false);
      alert('音声認識�E開始に失敗しました: ' + (error as Error).message);
    }
  };

  // 認識停止
  const stopRecognition = () => {
    if (!isRecording) return;

    console.log('🛑 音声認識停止');

    if (recognizerRef.current) {
      recognizerRef.current.stop();
      recognizerRef.current = null;
    }

    // 残ってぁE��バッファを�E琁E
    finalizeSpeech();

    setIsRecording(false);
  };

  // クリーンアチE�E
  useEffect(() => {
    return () => {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      if (recognizerRef.current) {
        recognizerRef.current.stop();
      }
    };
  }, []);

  // 自動停止監視！E0秒後に自動停止�E�E
  useEffect(() => {
    if (!isRecording) return;

    const autoStopTimeout = setTimeout(() => {
      console.log('⏰ 自動停止�E�E0秒経過�E�E);
      stopRecognition();
    }, 10000);

    return () => clearTimeout(autoStopTimeout);
  }, [isRecording]);

  return (
    <div className="voice-assistant">
      <button 
        onClick={isRecording ? stopRecognition : startRecognition}
        className={`voice-button ${isRecording ? 'recording' : ''}`}
        disabled={!azureKey && !isIOS()}
      >
        {isRecording ? (
          <span>
            🔴 録音中... 
            <small style={{ display: 'block', fontSize: '0.8em' }}>
              ({speechBufferRef.current.length}件認識済み)
            </small>
          </span>
        ) : (
          '🎙�E�Eマイク開姁E
        )}
      </button>

      {isRecording && (
        <div className="recording-status">
          <div className="pulse-animation"></div>
          <span>発話を聞ぁE��ぁE��ぁE..</span>
          {speechBufferRef.current.length > 0 && (
            <div className="buffer-preview">
              最新: "{speechBufferRef.current[speechBufferRef.current.length - 1]}"
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .voice-assistant {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }

        .voice-button {
          padding: 12px 24px;
          font-size: 16px;
          border: 2px solid #4CAF50;
          background: white;
          border-radius: 25px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .voice-button:hover {
          background: #f0f8f0;
        }

        .voice-button.recording {
          background: #ffebee;
          border-color: #f44336;
          animation: pulse 2s infinite;
        }

        .recording-status {
          text-align: center;
          color: #666;
          font-size: 14px;
        }

        .buffer-preview {
          margin-top: 5px;
          font-style: italic;
          color: #888;
          max-width: 300px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .pulse-animation {
          display: inline-block;
          width: 8px;
          height: 8px;
          background: #f44336;
          border-radius: 50%;
          margin-right: 8px;
          animation: pulse 1s infinite;
        }

        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.7; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default VoiceAssistant;
