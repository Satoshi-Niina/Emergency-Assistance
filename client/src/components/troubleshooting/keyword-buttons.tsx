import React from 'react';
import { Button } from "../../components/ui/button";

interface KeywordButtonsProps {
  onKeywordClick: (keyword: string) => void;
}

/**
 * 代表皁E��検索キーワードを表示するコンポ�EネンチE
 * 「エンジン」「トルコン」「ブレーキ」「エアー回路」�E4つのキーワードを表示
 */
const KeywordButtons: React.FC<KeywordButtonsProps> = ({ onKeywordClick }) => {
  // 代表皁E��キーワーチE
  const keywords = ['エンジン', 'トルコン', 'ブレーキ', 'エアー回路'];

  return (
    <div className="flex flex-wrap gap-2 my-3">
      <span className="text-sm text-gray-600 self-center mr-1">代表皁E��キーワーチE</span>
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
