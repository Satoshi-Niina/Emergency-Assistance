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
  // 解決策を構造化された形式に変換
  const parseSolution = (solutionText: string) => {
    const sections = {
      problem: '',
      cause: '',
      steps: [] as string[],
      safety: '',
      expert: ''
    };

    // 解決策テキストから構造化された惁E��を抽出
    const lines = solutionText.split('\n');
    let currentSection = '';

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      if (trimmedLine.includes('問題�E特宁E) || trimmedLine.includes('問顁E')) {
        currentSection = 'problem';
        sections.problem = trimmedLine.replace(/^.*?[:�E�]\s*/, '');
      } else if (trimmedLine.includes('原因刁E��') || trimmedLine.includes('原因:')) {
        currentSection = 'cause';
        sections.cause = trimmedLine.replace(/^.*?[:�E�]\s*/, '');
      } else if (trimmedLine.includes('具体的な処置手頁E) || trimmedLine.includes('手頁E')) {
        currentSection = 'steps';
      } else if (trimmedLine.includes('安�E上�E注愁E) || trimmedLine.includes('注愁E')) {
        currentSection = 'safety';
        sections.safety = trimmedLine.replace(/^.*?[:�E�]\s*/, '');
      } else if (trimmedLine.includes('専門家への相諁E) || trimmedLine.includes('相諁E')) {
        currentSection = 'expert';
        sections.expert = trimmedLine.replace(/^.*?[:�E�]\s*/, '');
      } else if (currentSection === 'steps' && (trimmedLine.startsWith('•') || trimmedLine.startsWith('-') || trimmedLine.match(/^\d+\./))) {
        sections.steps.push(trimmedLine.replace(/^[•\-\d\.\s]+/, ''));
      } else if (currentSection && sections[currentSection as keyof typeof sections] === '') {
        // 最初�E行をセクションの冁E��として設宁E
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
                {isEmergency ? '緊急対忁E : '解決筁E}
              </Badge>
              {reasoning && (
                <Badge variant="outline" className="text-xs">
                  診断完亁E
                </Badge>
              )}
            </div>
            
            {problemDescription && (
              <div className="text-sm text-gray-600 mb-3">
                <strong>問顁E</strong> {problemDescription}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {/* 問題�E特宁E*/}
          {parsedSolution.problem && (
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <h4 className="font-medium text-gray-900">問題�E特宁E/h4>
              </div>
              <p className="text-gray-700">{parsedSolution.problem}</p>
            </div>
          )}

          {/* 原因刁E�� */}
          {parsedSolution.cause && (
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Wrench className="w-4 h-4 text-blue-500" />
                <h4 className="font-medium text-gray-900">原因刁E��</h4>
              </div>
              <p className="text-gray-700">{parsedSolution.cause}</p>
            </div>
          )}

          {/* 具体的な処置手頁E*/}
          {parsedSolution.steps.length > 0 && (
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <h4 className="font-medium text-gray-900">具体的な処置手頁E/h4>
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

          {/* 安�E上�E注愁E*/}
          {parsedSolution.safety && (
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-yellow-600" />
                <h4 className="font-medium text-yellow-800">安�E上�E注愁E/h4>
              </div>
              <p className="text-yellow-700">{parsedSolution.safety}</p>
            </div>
          )}

          {/* 専門家への相諁E*/}
          {parsedSolution.expert && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-blue-500" />
                <h4 className="font-medium text-blue-800">専門家への相諁E/h4>
              </div>
              <p className="text-blue-700">{parsedSolution.expert}</p>
            </div>
          )}

          {/* 生�E解決策テキスト（構造化できなぁE��合�Eフォールバック�E�E*/}
          {!parsedSolution.problem && !parsedSolution.cause && parsedSolution.steps.length === 0 && (
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <h4 className="font-medium text-gray-900">解決筁E/h4>
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
              <strong>診断の根拠:</strong> {reasoning}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
