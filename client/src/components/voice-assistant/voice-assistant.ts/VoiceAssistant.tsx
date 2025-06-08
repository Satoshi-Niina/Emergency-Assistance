
import React, { useState, useRef, useEffect } from 'react';
import { createSpeechRecognizer, ISpeechRecognizer } from '../speech-recognizer';

const VoiceAssistant = ({ onRecognized }: { onRecognized: (text: string) => void }) => {
  const [isRecording, setIsRecording] = useState(false);
  const recognizerRef = useRef<ISpeechRecognizer | null>(null);
  const speechBufferRef = useRef<string[]>([]);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSpeechTimeRef = useRef<number>(0);
  
  const azureKey = process.env.REACT_APP_AZURE_SPEECH_KEY!;
  const azureRegion = process.env.REACT_APP_AZURE_SPEECH_REGION!;

  // 設定
  const SILENCE_TIMEOUT = 3000; // 3秒の無音で終了
  const MIN_SPEECH_LENGTH = 3; // 最小文字数

  const isIOS = () => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  };

  // バッファ処理
  const addToBuffer = (text: string) => {
    if (!text.trim()) return;
    
    console.log('🔄 音声バッファに追加:', text);
    speechBufferRef.current.push(text.trim());
    lastSpeechTimeRef.current = Date.now();
    
    // 無音タイマーをリセット
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
    
    // 新しい無音タイマーを開始
    silenceTimeoutRef.current = setTimeout(() => {
      finalizeSpeech();
    }, SILENCE_TIMEOUT);
  };

  // 発話終了処理
  const finalizeSpeech = () => {
    if (speechBufferRef.current.length === 0) return;
    
    const combinedText = speechBufferRef.current.join(' ').trim();
    console.log('✅ 発話統合完了:', combinedText);
    
    if (combinedText.length >= MIN_SPEECH_LENGTH) {
      onRecognized(combinedText);
      
      // 画像検索のキーワードかどうかチェック
      const imageSearchKeywords = ['ブレーキ', 'エンジン', '冷却', 'ホイール', '車輪', '部品', '設備', '機械', '保守', '点検'];
      const hasImageKeyword = imageSearchKeywords.some(keyword => 
        combinedText.includes(keyword)
      );
      
      if (hasImageKeyword) {
        console.log('🔍 音声から画像検索キーワードを検出:', combinedText);
        // 画像検索を実行
        window.dispatchEvent(new CustomEvent('voice-search-request', {
          detail: { query: combinedText }
        }));
      }
    } else {
      console.log('⚠️ 発話が短すぎます:', combinedText);
    }
    
    // バッファをクリア
    speechBufferRef.current = [];
    
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
  };

  // 認識開始
  const startRecognition = async () => {
    if (isRecording) return;
    
    try {
      setIsRecording(true);
      speechBufferRef.current = [];
      lastSpeechTimeRef.current = Date.now();
      
      console.log('🎤 音声認識開始 -', isIOS() ? 'Web Speech API' : 'Azure Speech SDK');
      
      // speech-recognizer.tsのファクトリ関数を使用
      recognizerRef.current = createSpeechRecognizer(azureKey, azureRegion);
      
      // 認識結果を受信する処理を設定
      recognizerRef.current.sendToServer = (text: string) => {
        console.log('🔊 音声認識結果受信:', text);
        addToBuffer(text);
      };
      
      // 認識開始
      await recognizerRef.current.start();
      
    } catch (error) {
      console.error('❌ 音声認識開始エラー:', error);
      setIsRecording(false);
      alert('音声認識の開始に失敗しました: ' + (error as Error).message);
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
    
    // 残っているバッファを処理
    finalizeSpeech();
    
    setIsRecording(false);
  };

  // クリーンアップ
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

  // 自動停止監視（10秒後に自動停止）
  useEffect(() => {
    if (!isRecording) return;
    
    const autoStopTimeout = setTimeout(() => {
      console.log('⏰ 自動停止（10秒経過）');
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
          '🎙️ マイク開始'
        )}
      </button>
      
      {isRecording && (
        <div className="recording-status">
          <div className="pulse-animation"></div>
          <span>発話を聞いています...</span>
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
