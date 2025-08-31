import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, HelpCircle, ArrowRight } from 'lucide-react';

interface TroubleshootingQABubbleProps {
  question: string;
  options?: string[];
  reasoning?: string;
  onAnswer: (answer: string) => void;
  isLoading?: boolean;
}

export default function TroubleshootingQABubble({
  question,
  options = [],
  reasoning,
  onAnswer,
  isLoading = false
}: TroubleshootingQABubbleProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const handleOptionSelect = (option: string) => {
    setSelectedOption(option);
    onAnswer(option);
  };

  const handleCustomAnswer = () => {
    const customAnswer = prompt('詳細な状況を教えてください:');
    if (customAnswer && customAnswer.trim()) {
      onAnswer(customAnswer.trim());
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto border-blue-200 bg-blue-50">
      <CardContent className="p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <HelpCircle className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                トラブルシューティング
              </Badge>
              {reasoning && (
                <Badge variant="outline" className="text-xs">
                  診断中
                </Badge>
              )}
            </div>
            
            <div className="text-gray-900 font-medium mb-3">
              {question}
            </div>
            
            {reasoning && (
              <div className="text-sm text-gray-600 mb-4 p-3 bg-blue-100 rounded-lg">
                <strong>診断の目的:</strong> {reasoning}
              </div>
            )}
          </div>
        </div>

        {options && options.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700 mb-3">
              以下の選択肢から選んでください：
            </div>
            
            <div className="grid gap-2">
              {options.map((option, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className={`h-auto p-4 text-left justify-start border-2 transition-all ${
                    selectedOption === option
                      ? 'border-blue-500 bg-blue-50 text-blue-900'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                  onClick={() => handleOptionSelect(option)}
                  disabled={isLoading}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center">
                      {selectedOption === option && (
                        <CheckCircle className="w-4 h-4 text-blue-500" />
                      )}
                    </div>
                    <span className="font-medium">{option}</span>
                  </div>
                </Button>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-200">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCustomAnswer}
                disabled={isLoading}
                className="text-blue-600 hover:text-blue-700"
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                その他の状況を入力
              </Button>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="mt-4 flex items-center gap-2 text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm">診断中...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
