/**
 * Text-to-speech functionality using Web Speech API
 */

/**
 * Speak text using the browser's native speech synthesis
 * @param text The text to speak
 * @param options Voice options
 * @returns Promise that resolves when speech is finished or rejects if there's an error
 */
export const speakText = (
  text: string,
  options: {
    rate?: number;
    pitch?: number;
    volume?: number;
    lang?: string;
  } = {}
): Promise<void> => {
  return new Promise((resolve, reject) => {
    // SpeechSynthesis APIが利用可能か確誁E
    if (!('speechSynthesis' in window)) {
      reject(new Error('こ�Eブラウザは音声合�Eをサポ�EトしてぁE��せん'));
      return;
    }

    // SpeechSynthesisUtteranceインスタンスを作�E
    const utterance = new SpeechSynthesisUtterance(text);

    // オプションの設宁E
    utterance.rate = options.rate || 1.0; // 速度 (0.1-10)
    utterance.pitch = options.pitch || 1.0; // ピッチE(0-2)
    utterance.volume = options.volume || 1.0; // 音釁E(0-1)
    utterance.lang = options.lang || 'ja-JP'; // 言誁E

    // イベントハンドラー
    utterance.onend = () => {
      resolve();
    };
    
    utterance.onerror = (event) => {
      reject(new Error(`音声合�Eエラー: ${event.error}`));
    };

    // 実行中の発声をキャンセル
    window.speechSynthesis.cancel();

    // 発話開姁E
    window.speechSynthesis.speak(utterance);
  });
};

/**
 * 音声合�Eを停止する
 */
export const stopSpeaking = (): void => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
};

/**
 * 利用可能な音声のリストを取征E
 * @returns 利用可能な音声の配�E
 */
export const getAvailableVoices = (): Promise<SpeechSynthesisVoice[]> => {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      resolve([]);
      return;
    }

    // 音声が既にロードされてぁE��場吁E
    let voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
      return;
    }

    // 音声がまだロードされてぁE��ぁE��合�E、イベントを征E��E
    window.speechSynthesis.onvoiceschanged = () => {
      voices = window.speechSynthesis.getVoices();
      resolve(voices);
    };
  });
};

/**
 * 持E��された言語に最適な音声を選択すめE
 * @param lang 言語コード（侁E 'ja-JP'�E�E
 * @returns 選択された音声、また�E利用可能な音声がなぁE��合�Enull
 */
export const selectVoiceForLanguage = async (
  lang: string
): Promise<SpeechSynthesisVoice | null> => {
  const voices = await getAvailableVoices();
  
  // 持E��された言語に完�Eに一致する音声を検索
  const exactMatch = voices.find(
    (voice) => voice.lang.toLowerCase() === lang.toLowerCase()
  );
  if (exactMatch) return exactMatch;
  
  // 言語コード�E先頭部刁E��一致する音声を検索�E�侁E 'ja-JP' ↁE'ja'�E�E
  const langPrefix = lang.split('-')[0].toLowerCase();
  const prefixMatch = voices.find(
    (voice) => voice.lang.toLowerCase().startsWith(langPrefix)
  );
  if (prefixMatch) return prefixMatch;
  
  // チE��ォルト音声�E�最初�E音声�E�を返す、また�E音声がなぁE��合�Enull
  return voices.length > 0 ? voices[0] : null;
};
