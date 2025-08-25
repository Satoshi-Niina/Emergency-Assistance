import React, { useState, useRef, useEffect } from 'react';
import { createSpeechRecognizer, ISpeechRecognizer } from '../speech-recognizer';

const VoiceAssistant = ({ onRecognized }: { onRecognized: (text: string) => void }) => {
  const [isRecording, setIsRecording] = useState(false);
  const recognizerRef = useRef<ISpeechRecognizer | null>(null);
  const speechBufferRef = useRef<string[]>([]);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSpeechTimeRef = useRef<number>(0);

  // Azure Speech險ｭ螳・- 繝・ヵ繧ｩ繝ｫ繝亥､繧剃ｽｿ逕ｨ・・EACT_APP_AZURE_SPEECH_*縺ｮ蜿ら・繧貞炎髯､・・
  const azureKey = ''; // 繝・ヵ繧ｩ繝ｫ繝亥､
  const azureRegion = 'japaneast'; // 繝・ヵ繧ｩ繝ｫ繝亥､

  // 險ｭ螳・
  const SILENCE_TIMEOUT = 3000; // 3遘偵・辟｡髻ｳ縺ｧ邨ゆｺ・
  const MIN_SPEECH_LENGTH = 3; // 譛蟆乗枚蟄玲焚

  const isIOS = () => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  };

  // 繝舌ャ繝輔ぃ蜃ｦ逅・
  const addToBuffer = (text: string) => {
    if (!text.trim()) return;

    console.log('売 髻ｳ螢ｰ繝舌ャ繝輔ぃ縺ｫ霑ｽ蜉:', text);
    speechBufferRef.current.push(text.trim());
    lastSpeechTimeRef.current = Date.now();

    // 辟｡髻ｳ繧ｿ繧､繝槭・繧偵Μ繧ｻ繝・ヨ
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }

    // 譁ｰ縺励＞辟｡髻ｳ繧ｿ繧､繝槭・繧帝幕蟋・
    silenceTimeoutRef.current = setTimeout(() => {
      finalizeSpeech();
    }, SILENCE_TIMEOUT);
  };

  // 逋ｺ隧ｱ邨ゆｺ・・逅・
  const finalizeSpeech = () => {
    if (speechBufferRef.current.length === 0) return;

    const combinedText = speechBufferRef.current.join(' ').trim();
    console.log('笨・逋ｺ隧ｱ邨ｱ蜷亥ｮ御ｺ・', combinedText);

    if (combinedText.length >= MIN_SPEECH_LENGTH) {
      // 逕ｻ蜒乗､懃ｴ｢縺ｮ繧ｭ繝ｼ繝ｯ繝ｼ繝峨°縺ｩ縺・°繝√ぉ繝・け・医さ繝ｳ繝・く繧ｹ繝医→蜷後§繧ｭ繝ｼ繝ｯ繝ｼ繝峨Μ繧ｹ繝医ｒ菴ｿ逕ｨ・・
      const imageSearchKeywords = [
        '繝悶Ξ繝ｼ繧ｭ', 'brake', '繧ｨ繝ｳ繧ｸ繝ｳ', 'engine', '蜀ｷ蜊ｴ', 'cooling', '繝ｩ繧ｸ繧ｨ繝ｼ繧ｿ繝ｼ', 'radiator',
        '繝帙う繝ｼ繝ｫ', 'wheel', '霆願ｼｪ', '繧ｿ繧､繝､', 'tire', '驛ｨ蜩・, 'parts', '險ｭ蛯・, 'equipment',
        '讖滓｢ｰ', 'machine', '菫晏ｮ・, 'maintenance', '轤ｹ讀・, 'inspection', '菫ｮ逅・, 'repair',
        '謨・囿', 'failure', '逡ｰ蟶ｸ', 'abnormal', '髻ｳ', 'sound', '謖ｯ蜍・, 'vibration'
      ];
      const hasImageKeyword = imageSearchKeywords.some(keyword => 
        combinedText.toLowerCase().includes(keyword.toLowerCase())
      );

      onRecognized(combinedText);
    } else {
      console.log('笞・・逋ｺ隧ｱ縺檎洒縺吶℃縺ｾ縺・', combinedText);
    }

    // 繝舌ャ繝輔ぃ繧偵け繝ｪ繧｢
    speechBufferRef.current = [];

    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
  };

  // 隱崎ｭ倬幕蟋・
  const startRecognition = async () => {
    if (isRecording) return;

    try {
      setIsRecording(true);
      speechBufferRef.current = [];
      lastSpeechTimeRef.current = Date.now();

      console.log('痔 髻ｳ螢ｰ隱崎ｭ倬幕蟋・-', isIOS() ? 'Web Speech API' : 'Azure Speech SDK');

      // speech-recognizer.ts縺ｮ繝輔ぃ繧ｯ繝医Μ髢｢謨ｰ繧剃ｽｿ逕ｨ
      recognizerRef.current = createSpeechRecognizer(azureKey, azureRegion);

      // 隱崎ｭ倡ｵ先棡繧貞女菫｡縺吶ｋ蜃ｦ逅・ｒ險ｭ螳・
      recognizerRef.current.sendToServer = (text: string) => {
        console.log('矧 髻ｳ螢ｰ隱崎ｭ倡ｵ先棡蜿嶺ｿ｡:', text);
        addToBuffer(text);
      };

      // 隱崎ｭ倬幕蟋・
      await recognizerRef.current.start();

    } catch (error) {
      console.error('笶・髻ｳ螢ｰ隱崎ｭ倬幕蟋九お繝ｩ繝ｼ:', error);
      setIsRecording(false);
      alert('髻ｳ螢ｰ隱崎ｭ倥・髢句ｧ九↓螟ｱ謨励＠縺ｾ縺励◆: ' + (error as Error).message);
    }
  };

  // 隱崎ｭ伜●豁｢
  const stopRecognition = () => {
    if (!isRecording) return;

    console.log('尅 髻ｳ螢ｰ隱崎ｭ伜●豁｢');

    if (recognizerRef.current) {
      recognizerRef.current.stop();
      recognizerRef.current = null;
    }

    // 谿九▲縺ｦ縺・ｋ繝舌ャ繝輔ぃ繧貞・逅・
    finalizeSpeech();

    setIsRecording(false);
  };

  // 繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・
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

  // 閾ｪ蜍募●豁｢逶｣隕厄ｼ・0遘貞ｾ後↓閾ｪ蜍募●豁｢・・
  useEffect(() => {
    if (!isRecording) return;

    const autoStopTimeout = setTimeout(() => {
      console.log('竢ｰ 閾ｪ蜍募●豁｢・・0遘堤ｵ碁℃・・);
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
            閥 骭ｲ髻ｳ荳ｭ... 
            <small style={{ display: 'block', fontSize: '0.8em' }}>
              ({speechBufferRef.current.length}莉ｶ隱崎ｭ俶ｸ医∩)
            </small>
          </span>
        ) : (
          '児・・繝槭う繧ｯ髢句ｧ・
        )}
      </button>

      {isRecording && (
        <div className="recording-status">
          <div className="pulse-animation"></div>
          <span>逋ｺ隧ｱ繧定◇縺・※縺・∪縺・..</span>
          {speechBufferRef.current.length > 0 && (
            <div className="buffer-preview">
              譛譁ｰ: "{speechBufferRef.current[speechBufferRef.current.length - 1]}"
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