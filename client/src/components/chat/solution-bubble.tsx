import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, Wrench, Shield } from 'lucide-react';

interface SolutionBubbleProps {
  solution: string;
  problemDescription?: string;
  reasoning?: string;
  isEmergency?: boolean;
}

export default function SolutionBubble({
  solution,
  problemDescription,
  reasoning,
  isEmergency = false
}: SolutionBubbleProps) {
  // 隗｣豎ｺ遲悶ｒ讒矩蛹悶＆繧後◆蠖｢蠑上↓螟画鋤
  const parseSolution = (solutionText: string) => {
    const sections = {
      problem: '',
      cause: '',
      steps: [] as string[],
      safety: '',
      expert: ''
    };

    // 隗｣豎ｺ遲悶ユ繧ｭ繧ｹ繝医°繧画ｧ矩蛹悶＆繧後◆諠・ｱ繧呈歓蜃ｺ
    const lines = solutionText.split('\n');
    let currentSection = '';

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      if (trimmedLine.includes('蝠城｡後・迚ｹ螳・) || trimmedLine.includes('蝠城｡・')) {
        currentSection = 'problem';
        sections.problem = trimmedLine.replace(/^.*?[:・咯\s*/, '');
      } else if (trimmedLine.includes('蜴溷屏蛻・梵') || trimmedLine.includes('蜴溷屏:')) {
        currentSection = 'cause';
        sections.cause = trimmedLine.replace(/^.*?[:・咯\s*/, '');
      } else if (trimmedLine.includes('蜈ｷ菴鍋噪縺ｪ蜃ｦ鄂ｮ謇矩・) || trimmedLine.includes('謇矩・')) {
        currentSection = 'steps';
      } else if (trimmedLine.includes('螳牙・荳翫・豕ｨ諢・) || trimmedLine.includes('豕ｨ諢・')) {
        currentSection = 'safety';
        sections.safety = trimmedLine.replace(/^.*?[:・咯\s*/, '');
      } else if (trimmedLine.includes('蟆る摩螳ｶ縺ｸ縺ｮ逶ｸ隲・) || trimmedLine.includes('逶ｸ隲・')) {
        currentSection = 'expert';
        sections.expert = trimmedLine.replace(/^.*?[:・咯\s*/, '');
      } else if (currentSection === 'steps' && (trimmedLine.startsWith('窶｢') || trimmedLine.startsWith('-') || trimmedLine.match(/^\d+\./))) {
        sections.steps.push(trimmedLine.replace(/^[窶｢\-\d\.\s]+/, ''));
      } else if (currentSection && sections[currentSection as keyof typeof sections] === '') {
        // 譛蛻昴・陦後ｒ繧ｻ繧ｯ繧ｷ繝ｧ繝ｳ縺ｮ蜀・ｮｹ縺ｨ縺励※險ｭ螳・
        if (typeof sections[currentSection as keyof typeof sections] === 'string') {
          (sections as any)[currentSection] = trimmedLine;
        }
      }
    }

    return sections;
  };

  const parsedSolution = parseSolution(solution);

  return (
    <Card className={`w-full max-w-2xl mx-auto ${
      isEmergency 
        ? 'border-red-200 bg-red-50' 
        : 'border-green-200 bg-green-50'
    }`}>
      <CardContent className="p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isEmergency ? 'bg-red-500' : 'bg-green-500'
            }`}>
              {isEmergency ? (
                <AlertTriangle className="w-4 h-4 text-white" />
              ) : (
                <CheckCircle className="w-4 h-4 text-white" />
              )}
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className={
                isEmergency 
                  ? 'bg-red-100 text-red-800' 
                  : 'bg-green-100 text-green-800'
              }>
                {isEmergency ? '邱頑･蟇ｾ蠢・ : '隗｣豎ｺ遲・}
              </Badge>
              {reasoning && (
                <Badge variant="outline" className="text-xs">
                  險ｺ譁ｭ螳御ｺ・
                </Badge>
              )}
            </div>
            
            {problemDescription && (
              <div className="text-sm text-gray-600 mb-3">
                <strong>蝠城｡・</strong> {problemDescription}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {/* 蝠城｡後・迚ｹ螳・*/}
          {parsedSolution.problem && (
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <h4 className="font-medium text-gray-900">蝠城｡後・迚ｹ螳・/h4>
              </div>
              <p className="text-gray-700">{parsedSolution.problem}</p>
            </div>
          )}

          {/* 蜴溷屏蛻・梵 */}
          {parsedSolution.cause && (
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Wrench className="w-4 h-4 text-blue-500" />
                <h4 className="font-medium text-gray-900">蜴溷屏蛻・梵</h4>
              </div>
              <p className="text-gray-700">{parsedSolution.cause}</p>
            </div>
          )}

          {/* 蜈ｷ菴鍋噪縺ｪ蜃ｦ鄂ｮ謇矩・*/}
          {parsedSolution.steps.length > 0 && (
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <h4 className="font-medium text-gray-900">蜈ｷ菴鍋噪縺ｪ蜃ｦ鄂ｮ謇矩・/h4>
              </div>
              <ol className="list-decimal list-inside space-y-2">
                {parsedSolution.steps.map((step, index) => (
                  <li key={index} className="text-gray-700">
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* 螳牙・荳翫・豕ｨ諢・*/}
          {parsedSolution.safety && (
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-yellow-600" />
                <h4 className="font-medium text-yellow-800">螳牙・荳翫・豕ｨ諢・/h4>
              </div>
              <p className="text-yellow-700">{parsedSolution.safety}</p>
            </div>
          )}

          {/* 蟆る摩螳ｶ縺ｸ縺ｮ逶ｸ隲・*/}
          {parsedSolution.expert && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-blue-500" />
                <h4 className="font-medium text-blue-800">蟆る摩螳ｶ縺ｸ縺ｮ逶ｸ隲・/h4>
              </div>
              <p className="text-blue-700">{parsedSolution.expert}</p>
            </div>
          )}

          {/* 逕溘・隗｣豎ｺ遲悶ユ繧ｭ繧ｹ繝茨ｼ域ｧ矩蛹悶〒縺阪↑縺・ｴ蜷医・繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ・・*/}
          {!parsedSolution.problem && !parsedSolution.cause && parsedSolution.steps.length === 0 && (
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <h4 className="font-medium text-gray-900">隗｣豎ｺ遲・/h4>
              </div>
              <div className="text-gray-700 whitespace-pre-line">
                {solution}
              </div>
            </div>
          )}
        </div>

        {reasoning && (
          <div className="mt-4 p-3 bg-gray-100 rounded-lg">
            <div className="text-sm text-gray-600">
              <strong>險ｺ譁ｭ縺ｮ譬ｹ諡:</strong> {reasoning}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
