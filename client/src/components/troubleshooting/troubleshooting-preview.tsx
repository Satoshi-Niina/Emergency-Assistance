import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Check, ArrowRight } from 'lucide-react';

// 繧ｵ繝ｳ繝励Ν繝・・繧ｿ繧ｿ繧､繝励→蜷後§蝙九ｒ菴ｿ逕ｨ
interface TroubleshootingStep {
  id: string;
  message: string;
  image?: string;
  options?: {
    label: string;
    next: string;
  }[];
  next?: string;
  checklist?: string[];
  end?: boolean;
}

interface TroubleshootingPreviewProps {
  steps: TroubleshootingStep[];
  initialStepId?: string;
}

const TroubleshootingPreview: React.FC<TroubleshootingPreviewProps> = ({ 
  steps, 
  initialStepId = 'start' 
}) => {
  const [currentStepId, setCurrentStepId] = useState<string>(initialStepId);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [history, setHistory] = useState<string[]>([initialStepId]);

  // 迴ｾ蝨ｨ縺ｮ繧ｹ繝・ャ繝励ｒ蜿門ｾ・
  const currentStep = steps.find(step => step.id === currentStepId);
  
  // 谺｡縺ｮ繧ｹ繝・ャ繝励↓騾ｲ繧蜃ｦ逅・
  const handleNext = () => {
    if (currentStep?.next) {
      const nextStep = currentStep.next;
      setCurrentStepId(nextStep);
      setHistory([...history, nextStep]);
    }
  };
  
  // 繧ｪ繝励す繝ｧ繝ｳ繧帝∈謚槭＠縺溘→縺阪・蜃ｦ逅・
  const handleOptionSelect = (nextStepId: string) => {
    setCurrentStepId(nextStepId);
    setHistory([...history, nextStepId]);
  };
  
  // 繝√ぉ繝・け繝ｪ繧ｹ繝医・鬆・岼繧偵ヨ繧ｰ繝ｫ
  const toggleChecklist = (index: number) => {
    const itemKey = `${currentStepId}-${index}`;
    setCheckedItems({
      ...checkedItems,
      [itemKey]: !checkedItems[itemKey]
    });
  };
  
  // 謌ｻ繧九・繧ｿ繝ｳ縺ｮ蜃ｦ逅・
  const handleBack = () => {
    if (history.length > 1) {
      const newHistory = [...history];
      newHistory.pop(); // 迴ｾ蝨ｨ縺ｮ繧ｹ繝・ャ繝励ｒ蜑企勁
      const previousStepId = newHistory[newHistory.length - 1];
      setCurrentStepId(previousStepId);
      setHistory(newHistory);
    }
  };
  
  // 繝輔Ο繝ｼ繧偵Μ繧ｻ繝・ヨ
  const handleReset = () => {
    setCurrentStepId(initialStepId);
    setCheckedItems({});
    setHistory([initialStepId]);
  };
  
  // 迴ｾ蝨ｨ縺ｮ繧ｹ繝・ャ繝励′繝√ぉ繝・け繝ｪ繧ｹ繝医ｒ謖√▲縺ｦ縺・ｋ縺九←縺・°
  const hasChecklist = currentStep?.checklist && currentStep.checklist.length > 0;
  
  // 迴ｾ蝨ｨ縺ｮ繧ｹ繝・ャ繝励′驕ｸ謚櫁い繧呈戟縺｣縺ｦ縺・ｋ縺九←縺・°
  const hasOptions = currentStep?.options && currentStep.options.length > 0;
  
  // 谺｡縺ｸ繝懊ち繝ｳ縺梧怏蜉ｹ縺九←縺・°・医メ繧ｧ繝・け繝ｪ繧ｹ繝医′縺吶∋縺ｦ繝√ぉ繝・け縺輔ｌ縺ｦ縺・ｋ縺具ｼ・
  const isNextButtonEnabled = !hasChecklist || 
    (currentStep?.checklist?.every((_, index) => 
      checkedItems[`${currentStepId}-${index}`]));
  
  // 邨ゆｺ・せ繝・ャ繝励°縺ｩ縺・°
  const isEndStep = currentStep?.end;
  
  if (!currentStep) {
    return <div className="text-center p-4">繧ｹ繝・ャ繝・"{currentStepId}" 縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ</div>;
  }
  
  return (
    <Card className="max-w-xl mx-auto shadow-lg">
      <CardHeader className="bg-blue-50">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝励Ξ繝薙Η繝ｼ</CardTitle>
          <Badge variant="outline" className="font-mono">
            {currentStepId}
          </Badge>
        </div>
        <CardDescription>
          迴ｾ蝨ｨ邱ｨ髮・ｸｭ縺ｮ蜀・ｮｹ繧偵Μ繧｢繝ｫ繧ｿ繧､繝縺ｧ繝励Ξ繝薙Η繝ｼ縺励∪縺吶らｷｨ髮・・螳ｹ縺後☆縺舌↓蜿肴丐縺輔ｌ縺ｾ縺吶・
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-6 pb-4">
        <div className="space-y-6">
          {/* 繧ｹ繝・ャ繝励・繝｡繝・そ繝ｼ繧ｸ陦ｨ遉ｺ */}
          <div className="prose">
            {currentStep.message.split('\n').map((line, idx) => (
              <p key={idx} className={idx === 0 ? "font-medium text-lg" : "text-gray-700"}>
                {line}
              </p>
            ))}
          </div>
          
          {/* 繝√ぉ繝・け繝ｪ繧ｹ繝郁｡ｨ遉ｺ */}
          {hasChecklist && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-md font-medium mb-3">遒ｺ隱堺ｺ矩・</h3>
              <div className="space-y-2">
                {currentStep.checklist?.map((item, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-md cursor-pointer"
                    onClick={() => toggleChecklist(index)}
                  >
                    <div className={`w-5 h-5 flex items-center justify-center border rounded-sm 
                      ${checkedItems[`${currentStepId}-${index}`] ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                      {checkedItems[`${currentStepId}-${index}`] && <Check className="h-4 w-4 text-white" />}
                    </div>
                    <span className={checkedItems[`${currentStepId}-${index}`] ? 'line-through text-gray-500' : ''}>
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* 驕ｸ謚櫁い陦ｨ遉ｺ */}
          {hasOptions && (
            <div className="space-y-2">
              {currentStep.options?.map((option, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="w-full justify-start text-left h-auto py-3 px-4"
                  onClick={() => handleOptionSelect(option.next)}
                >
                  <div className="flex gap-2 items-start">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      {index + 1}
                    </div>
                    <span>{option.label}</span>
                  </div>
                </Button>
              ))}
            </div>
          )}
          
          {/* 谺｡縺ｸ繝懊ち繝ｳ・磯∈謚櫁い縺後↑縺・ｴ蜷医・縺ｿ陦ｨ遉ｺ・・*/}
          {!hasOptions && !isEndStep && currentStep.next && (
            <div className="pt-4">
              <Button 
                className="w-full"
                onClick={handleNext}
                disabled={!isNextButtonEnabled}
              >
                谺｡縺ｸ騾ｲ繧
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
          
          {/* 邨ゆｺ・Γ繝・そ繝ｼ繧ｸ */}
          {isEndStep && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <h3 className="text-green-800 font-medium mb-2">繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ縺悟ｮ御ｺ・＠縺ｾ縺励◆</h3>
              <p className="text-green-700 text-sm">縺顔夢繧梧ｧ倥〒縺励◆縲ょ撫鬘後・隗｣豎ｺ縺励∪縺励◆縺具ｼ・/p>
            </div>
          )}
          
          {/* 繝翫ン繧ｲ繝ｼ繧ｷ繝ｧ繝ｳ繧ｳ繝ｳ繝医Ο繝ｼ繝ｫ */}
          <div className="flex justify-between pt-6 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              disabled={history.length <= 1}
            >
              謌ｻ繧・
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
            >
              譛蛻昴°繧峨ｄ繧顔峩縺・
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TroubleshootingPreview;