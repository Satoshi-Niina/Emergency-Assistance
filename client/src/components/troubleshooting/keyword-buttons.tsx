﻿import React from 'react';
import { Button } from "../../components/ui/button";

interface KeywordButtonsProps {
  onKeywordClick: (keyword: string) => void;
}

/**
 * 莉｣陦ｨ逧・↑讀懃ｴ｢繧ｭ繝ｼ繝ｯ繝ｼ繝峨ｒ陦ｨ遉ｺ縺吶ｋ繧ｳ繝ｳ繝昴・繝阪Φ繝・
 * 縲後お繝ｳ繧ｸ繝ｳ縲阪後ヨ繝ｫ繧ｳ繝ｳ縲阪後ヶ繝ｬ繝ｼ繧ｭ縲阪後お繧｢繝ｼ蝗櫁ｷｯ縲阪・4縺､縺ｮ繧ｭ繝ｼ繝ｯ繝ｼ繝峨ｒ陦ｨ遉ｺ
 */
const KeywordButtons: React.FC<KeywordButtonsProps> = ({ onKeywordClick }) => {
  // 莉｣陦ｨ逧・↑繧ｭ繝ｼ繝ｯ繝ｼ繝・
  const keywords = ['繧ｨ繝ｳ繧ｸ繝ｳ', '繝医Ν繧ｳ繝ｳ', '繝悶Ξ繝ｼ繧ｭ', '繧ｨ繧｢繝ｼ蝗櫁ｷｯ'];

  return (
    <div className="flex flex-wrap gap-2 my-3">
      <span className="text-sm text-gray-600 self-center mr-1">莉｣陦ｨ逧・↑繧ｭ繝ｼ繝ｯ繝ｼ繝・</span>
      {keywords.map((keyword) => (
        <Button
          key={keyword}
          variant="outline"
          size="sm"
          className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
          onClick={() => onKeywordClick(keyword)}
        >
          {keyword}
        </Button>
      ))}
    </div>
  );
};

export default KeywordButtons;