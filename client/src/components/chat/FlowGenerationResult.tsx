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
      {/* フロー概要E*/}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            応急処置フロー生�E完亁E
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
              <span className="font-medium">作�E日晁E</span> {formatDate(flowData.createdAt)}
            </div>
            <div>
              <span className="font-medium">更新日晁E</span> {formatDate(flowData.updatedAt)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 生�Eされた手頁E*/}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-blue-600" />
            生�Eされた手頁E({flowData.steps.length}スチE��チE
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

      {/* 生�E品質サマリー */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-600" />
              生�E品質サマリー
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{summary.totalSteps}</div>
                <div className="text-sm text-gray-600">総スチE��プ数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {summary.hasSpecificActions ? '✁E : '✁E}
                </div>
                <div className="text-sm text-gray-600">具体的な手頁E/div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {summary.safetyNotes ? '✁E : '✁E}
                </div>
                <div className="text-sm text-gray-600">安�E注意事頁E/div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* アクションボタン */}
      <div className="flex gap-3">
        {onExecuteFlow && (
          <Button onClick={onExecuteFlow} className="flex-1">
            <Play className="h-4 w-4 mr-2" />
            フローを実衁E
          </Button>
        )}
        {onDownloadFlow && (
          <Button onClick={onDownloadFlow} variant="outline" className="flex-1">
            <Download className="h-4 w-4 mr-2" />
            フローをダウンローチE
          </Button>
        )}
      </div>

      {/* GPTの生�Eレスポンス�E�開発用�E�E*/}
      {generatedContent && process.env.NODE_ENV === 'development' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              GPT生レスポンス�E�開発用�E�E
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
