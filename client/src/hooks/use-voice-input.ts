import { useEffect, useRef, useState } from 'react';

interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type VoiceWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};

export function useVoiceInput(onText: (text: string) => void) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const callback = useRef(onText);
  callback.current = onText;
  const recognition = useRef<Recognition | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const request = useRef<AbortController | null>(null);
  const active = useRef(false);
  const mounted = useRef(false);
  const endpoint = import.meta.env.VITE_SPEECH_TRANSCRIPTION_URL?.trim();

  const releaseMicrophone = () => {
    stream.current?.getTracks().forEach(track => track.stop());
    stream.current = null;
  };

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      active.current = false;
      recognition.current?.abort();
      if (recorder.current?.state === 'recording') recorder.current.stop();
      releaseMicrophone();
      request.current?.abort();
    };
  }, []);

  const stop = () => {
    recognition.current?.stop();
    if (recorder.current?.state === 'recording') recorder.current.stop();
    releaseMicrophone();
    active.current = false;
    setRecording(false);
  };

  const start = async () => {
    if (active.current) return;
    active.current = true;
    setError('');
    try {
      if (!window.isSecureContext) throw new Error('音声入力はHTTPSまたはlocalhostで利用してください。');
      if (endpoint) {
        if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
          throw new Error('このブラウザーはマイク録音に対応していません。');
        }
        setProcessing(true);
        const input = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!mounted.current) {
          input.getTracks().forEach(track => track.stop());
          return;
        }
        stream.current = input;
        const audio = new MediaRecorder(input);
        recorder.current = audio;
        const chunks: Blob[] = [];
        audio.ondataavailable = event => {
          if (event.data.size) chunks.push(event.data);
        };
        audio.onstop = async () => {
          releaseMicrophone();
          if (!mounted.current) return;
          active.current = false;
          setRecording(false);
          setProcessing(true);
          const controller = new AbortController();
          request.current = controller;
          const timeout = window.setTimeout(() => controller.abort(), 30_000);
          try {
            const body = new FormData();
            const extension = audio.mimeType.includes('ogg') ? 'ogg' : audio.mimeType.includes('mp4') ? 'm4a' : 'webm';
            body.append('audio', new Blob(chunks, { type: audio.mimeType }), `voice.${extension}`);
            body.append('language', 'ja-JP');
            const token = localStorage.getItem('authToken');
            const response = await fetch(endpoint, {
              method: 'POST',
              headers: token && new URL(endpoint, location.href).origin === location.origin
                ? { Authorization: `Bearer ${token}` } : {},
              body,
              signal: controller.signal,
            });
            if (!response.ok) throw new Error(`音声認識APIに接続できませんでした（${response.status}）。`);
            const result: { text?: unknown } = await response.json();
            if (typeof result.text !== 'string' || !result.text.trim()) throw new Error('音声を認識できませんでした。もう一度お試しください。');
            if (mounted.current) callback.current(result.text.trim());
          } catch (failure) {
            if (mounted.current) setError(failure instanceof Error ? failure.message : '文字起こしに失敗しました。');
          } finally {
            window.clearTimeout(timeout);
            if (mounted.current) setProcessing(false);
            request.current = null;
          }
        };
        audio.onerror = () => {
          setError('録音に失敗しました。マイクの接続と権限を確認してください。');
          stop();
        };
        audio.start();
        setProcessing(false);
      } else {
        const voiceWindow = window as VoiceWindow;
        const Constructor = voiceWindow.SpeechRecognition || voiceWindow.webkitSpeechRecognition;
        if (!Constructor) throw new Error('音声入力に対応したEdgeまたはChromeを利用するか、音声認識APIを設定してください。');
        const speech = new Constructor();
        recognition.current = speech;
        speech.lang = 'ja-JP';
        speech.continuous = true;
        speech.interimResults = false;
        speech.onresult = event => {
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) callback.current(event.results[i][0].transcript);
          }
        };
        speech.onerror = event => {
          if (event.error !== 'aborted') {
            setError(event.error === 'not-allowed'
              ? 'マイクの使用を許可してください。'
              : `音声認識に失敗しました（${event.error}）。再度マイクを押してください。`);
          }
          active.current = false;
          setRecording(false);
        };
        speech.onend = () => {
          active.current = false;
          if (mounted.current) setRecording(false);
        };
        speech.start();
      }
      setRecording(true);
    } catch (failure) {
      releaseMicrophone();
      active.current = false;
      if (mounted.current) {
        setProcessing(false);
        setRecording(false);
        setError(failure instanceof Error ? failure.message : '音声入力を開始できませんでした。');
      }
    }
  };

  return { recording, processing, error, start, stop };
}
