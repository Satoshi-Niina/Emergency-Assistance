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
    // SpeechSynthesis API縺悟茜逕ｨ蜿ｯ閭ｽ縺狗｢ｺ隱・
    if (!('speechSynthesis' in window)) {
      reject(new Error('縺薙・繝悶Λ繧ｦ繧ｶ縺ｯ髻ｳ螢ｰ蜷域・繧偵し繝昴・繝医＠縺ｦ縺・∪縺帙ｓ'));
      return;
    }

    // SpeechSynthesisUtterance繧､繝ｳ繧ｹ繧ｿ繝ｳ繧ｹ繧剃ｽ懈・
    const utterance = new SpeechSynthesisUtterance(text);

    // 繧ｪ繝励す繝ｧ繝ｳ縺ｮ險ｭ螳・
    utterance.rate = options.rate || 1.0; // 騾溷ｺｦ (0.1-10)
    utterance.pitch = options.pitch || 1.0; // 繝斐ャ繝・(0-2)
    utterance.volume = options.volume || 1.0; // 髻ｳ驥・(0-1)
    utterance.lang = options.lang || 'ja-JP'; // 險隱・

    // 繧､繝吶Φ繝医ワ繝ｳ繝峨Λ繝ｼ
    utterance.onend = () => {
      resolve();
    };
    
    utterance.onerror = (event) => {
      reject(new Error(`髻ｳ螢ｰ蜷域・繧ｨ繝ｩ繝ｼ: ${event.error}`));
    };

    // 螳溯｡御ｸｭ縺ｮ逋ｺ螢ｰ繧偵く繝｣繝ｳ繧ｻ繝ｫ
    window.speechSynthesis.cancel();

    // 逋ｺ隧ｱ髢句ｧ・
    window.speechSynthesis.speak(utterance);
  });
};

/**
 * 髻ｳ螢ｰ蜷域・繧貞●豁｢縺吶ｋ
 */
export const stopSpeaking = (): void => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
};

/**
 * 蛻ｩ逕ｨ蜿ｯ閭ｽ縺ｪ髻ｳ螢ｰ縺ｮ繝ｪ繧ｹ繝医ｒ蜿門ｾ・
 * @returns 蛻ｩ逕ｨ蜿ｯ閭ｽ縺ｪ髻ｳ螢ｰ縺ｮ驟榊・
 */
export const getAvailableVoices = (): Promise<SpeechSynthesisVoice[]> => {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      resolve([]);
      return;
    }

    // 髻ｳ螢ｰ縺梧里縺ｫ繝ｭ繝ｼ繝峨＆繧後※縺・ｋ蝣ｴ蜷・
    let voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
      return;
    }

    // 髻ｳ螢ｰ縺後∪縺繝ｭ繝ｼ繝峨＆繧後※縺・↑縺・ｴ蜷医・縲√う繝吶Φ繝医ｒ蠕・ｩ・
    window.speechSynthesis.onvoiceschanged = () => {
      voices = window.speechSynthesis.getVoices();
      resolve(voices);
    };
  });
};

/**
 * 謖・ｮ壹＆繧後◆險隱槭↓譛驕ｩ縺ｪ髻ｳ螢ｰ繧帝∈謚槭☆繧・
 * @param lang 險隱槭さ繝ｼ繝会ｼ井ｾ・ 'ja-JP'・・
 * @returns 驕ｸ謚槭＆繧後◆髻ｳ螢ｰ縲√∪縺溘・蛻ｩ逕ｨ蜿ｯ閭ｽ縺ｪ髻ｳ螢ｰ縺後↑縺・ｴ蜷医・null
 */
export const selectVoiceForLanguage = async (
  lang: string
): Promise<SpeechSynthesisVoice | null> => {
  const voices = await getAvailableVoices();
  
  // 謖・ｮ壹＆繧後◆險隱槭↓螳悟・縺ｫ荳閾ｴ縺吶ｋ髻ｳ螢ｰ繧呈､懃ｴ｢
  const exactMatch = voices.find(
    (voice) => voice.lang.toLowerCase() === lang.toLowerCase()
  );
  if (exactMatch) return exactMatch;
  
  // 險隱槭さ繝ｼ繝峨・蜈磯ｭ驛ｨ蛻・′荳閾ｴ縺吶ｋ髻ｳ螢ｰ繧呈､懃ｴ｢・井ｾ・ 'ja-JP' 竊・'ja'・・
  const langPrefix = lang.split('-')[0].toLowerCase();
  const prefixMatch = voices.find(
    (voice) => voice.lang.toLowerCase().startsWith(langPrefix)
  );
  if (prefixMatch) return prefixMatch;
  
  // 繝・ヵ繧ｩ繝ｫ繝磯浹螢ｰ・域怙蛻昴・髻ｳ螢ｰ・峨ｒ霑斐☆縲√∪縺溘・髻ｳ螢ｰ縺後↑縺・ｴ蜷医・null
  return voices.length > 0 ? voices[0] : null;
};


