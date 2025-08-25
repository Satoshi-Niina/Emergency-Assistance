import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertTriangle, Info, Play, Download } from 'lucide-react';

interface FlowStep {
  id: string;
  title: string;
  description: string;
}

interface FlowGenerationResultProps {
  flowData: {
    id: string;
    title: string;
    description: string;
    steps: FlowStep[];
    triggerKeywords: string[];
    createdAt: string;
    updatedAt: string;
  };
  generatedContent?: string;
  extractedSteps?: FlowStep[];
  summary?: {
    totalSteps: number;
    hasSpecificActions: boolean;
    safetyNotes: boolean;
  };
  onExecuteFlow?: () => void;
  onDownloadFlow?: () => void;
}

export default function FlowGenerationResult({
  flowData,
  generatedContent,
  extractedSteps,
  summary,
  onExecuteFlow,
  onDownloadFlow
}: FlowGenerationResultProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP');
  };

  return (
    <div className="space-y-4">
      {/* 繝輔Ο繝ｼ讎りｦ・*/}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ逕滓・螳御ｺ・
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{flowData.title}</h3>
            <p className="text-gray-600 mt-1">{flowData.description}</p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {flowData.triggerKeywords.map((keyword, index) => (
              <Badge key={index} variant="secondary">
                {keyword}
              </Badge>
            ))}
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <span className="font-medium">菴懈・譌･譎・</span> {formatDate(flowData.createdAt)}
            </div>
            <div>
              <span className="font-medium">譖ｴ譁ｰ譌･譎・</span> {formatDate(flowData.updatedAt)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 逕滓・縺輔ｌ縺滓焔鬆・*/}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-blue-600" />
            逕滓・縺輔ｌ縺滓焔鬆・({flowData.steps.length}繧ｹ繝・ャ繝・
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {flowData.steps.map((step, index) => (
              <div key={step.id} className="border-l-4 border-blue-200 pl-4 py-2">
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-1">
                    {index + 1}
                  </Badge>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{step.title}</h4>
                    <p className="text-gray-600 text-sm mt-1 whitespace-pre-line">
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 逕滓・蜩∬ｳｪ繧ｵ繝槭Μ繝ｼ */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-600" />
              逕滓・蜩∬ｳｪ繧ｵ繝槭Μ繝ｼ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{summary.totalSteps}</div>
                <div className="text-sm text-gray-600">邱上せ繝・ャ繝玲焚</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {summary.hasSpecificActions ? '笨・ : '笨・}
                </div>
                <div className="text-sm text-gray-600">蜈ｷ菴鍋噪縺ｪ謇矩・/div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {summary.safetyNotes ? '笨・ : '笨・}
                </div>
                <div className="text-sm text-gray-600">螳牙・豕ｨ諢丈ｺ矩・/div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 繧｢繧ｯ繧ｷ繝ｧ繝ｳ繝懊ち繝ｳ */}
      <div className="flex gap-3">
        {onExecuteFlow && (
          <Button onClick={onExecuteFlow} className="flex-1">
            <Play className="h-4 w-4 mr-2" />
            繝輔Ο繝ｼ繧貞ｮ溯｡・
          </Button>
        )}
        {onDownloadFlow && (
          <Button onClick={onDownloadFlow} variant="outline" className="flex-1">
            <Download className="h-4 w-4 mr-2" />
            繝輔Ο繝ｼ繧偵ム繧ｦ繝ｳ繝ｭ繝ｼ繝・
          </Button>
        )}
      </div>

      {/* GPT縺ｮ逕溘・繝ｬ繧ｹ繝昴Φ繧ｹ・磯幕逋ｺ逕ｨ・・*/}
      {generatedContent && process.env.NODE_ENV === 'development' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              GPT逕溘Ξ繧ｹ繝昴Φ繧ｹ・磯幕逋ｺ逕ｨ・・
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-4 rounded-lg">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                {generatedContent}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
