import React, { useState } from 'react';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';

const VoiceAssistant = ({ onRecognized }: { onRecognized: (text: string) => void }) => {
  const [isRecording, setIsRecording] = useState(false);
  const azureKey = process.env.REACT_APP_AZURE_SPEECH_KEY!;
  const azureRegion = process.env.REACT_APP_AZURE_SPEECH_REGION!;

  const isIOS = () => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  };

  const startRecognition = async () => {
    if (isRecording) return;
    setIsRecording(true);

    if (isIOS()) {
      startWebSpeechRecognition();
    } else {
      await startAzureSpeechRecognition();
    }
  };

  const startWebSpeechRecognition = () => {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) {
      alert("このブラウザはWeb Speech APIをサポートしていません。");
      setIsRecording(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ja-JP';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      console.log("WebSpeech認識結果:", transcript);
      onRecognized(transcript);
      setIsRecording(false);
    };

    recognition.onerror = (event: any) => {
      console.error("WebSpeechエラー:", event.error);
      setIsRecording(false);
    };

    recognition.start();
  };

  const startAzureSpeechRecognition = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneStream(stream);
      const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(azureKey, azureRegion);
      speechConfig.speechRecognitionLanguage = 'ja-JP';
      speechConfig.setProperty(SpeechSDK.PropertyId.SpeechServiceConnection_InitialSilenceTimeoutMs, '8000');
      speechConfig.setProperty(SpeechSDK.PropertyId.SpeechServiceConnection_EndSilenceTimeoutMs, '3000');

      const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);

      recognizer.recognized = (s, e) => {
        if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
          console.log("Azure認識結果:", e.result.text);
          onRecognized(e.result.text);
        }
      };

      recognizer.canceled = (s, e) => {
        console.error("Azure認識キャンセル:", e);
        setIsRecording(false);
      };

      recognizer.sessionStopped = () => {
        console.log("Azure認識セッション終了");
        setIsRecording(false);
      };

      recognizer.startContinuousRecognitionAsync();
    } catch (err) {
      console.error("Azure認識開始失敗:", err);
      setIsRecording(false);
    }
  };

  return (
    <div>
      <button onClick={startRecognition} disabled={isRecording}>
        {isRecording ? "録音中..." : "🎙️ マイク開始"}
      </button>
    </div>
  );
};

export default VoiceAssistant;
