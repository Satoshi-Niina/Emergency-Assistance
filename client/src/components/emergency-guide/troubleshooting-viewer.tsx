import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, ArrowLeft, ArrowRight, Calendar, Save, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import TroubleshootingEditor from './troubleshooting-editor';
import { useToast } from '@/hooks/use-toast';

interface Step {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
}

interface TroubleshootingData {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  createdAt: string;
  steps: Step[];
}

interface TroubleshootingViewerProps {
  data: TroubleshootingData;
  onSave: (data: TroubleshootingData) => Promise<void>;
  onBack: () => void;
}

const TroubleshootingViewer: React.FC<TroubleshootingViewerProps> = ({ data, onSave, onBack }) => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitleValue, setEditingTitleValue] = useState('');
  const [localData, setLocalData] = useState(data);
  const [isEditingMainTitle, setIsEditingMainTitle] = useState(false);
  const [editingMainTitleValue, setEditingMainTitleValue] = useState('');

  // 前のスライドに移動
  const goToPrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // 次のスライドに移動
  const goToNext = () => {
    if (currentStep < localData.steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  // 編集モードの切り替え
  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
  };

  // 編集した内容を保存
  const handleSave = async (editedData: TroubleshootingData) => {
    try {
      setIsSaving(true);
      await onSave(editedData);

      // ローカルデータを即座に更新
      setLocalData(editedData);

      setIsEditMode(false);
      toast({
        title: "保存成功",
        description: "トラブルシューティングデータが更新されました",
      });

      // 親コンポーネントに変更を通知（一覧更新のため）
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('troubleshootingDataUpdated', {
          detail: { id: editedData.id, data: editedData }
        }));
      }
    } catch (error) {
      toast({
        title: "保存エラー",
        description: "データの保存中にエラーが発生しました",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // 編集モードをキャンセル
  const handleCancel = () => {
    setIsEditMode(false);
  };

  // タイトル編集開始
  const handleStartTitleEdit = () => {
    setEditingTitleValue(localData.steps[currentStep]?.title || '');
    setIsEditingTitle(true);
  };

  // タイトル編集保存
  const handleSaveTitle = async () => {
    if (!editingTitleValue.trim()) {
      toast({
        title: "エラー",
        description: "タイトルを入力してください",
        variant: "destructive",
      });
      return;
    }

    try {
      const updatedData = { ...localData };
      updatedData.steps[currentStep].title = editingTitleValue.trim();
      updatedData.updatedAt = new Date().toISOString();

      setLocalData(updatedData);
      await onSave(updatedData);

      setIsEditingTitle(false);
      toast({
        title: "保存完了",
        description: "スライドタイトルを更新しました",
      });
    } catch (error) {
      toast({
        title: "保存エラー",
        description: "タイトルの保存中にエラーが発生しました",
        variant: "destructive",
      });
    }
  };

  // タイトル編集キャンセル
  const handleCancelTitleEdit = () => {
    setIsEditingTitle(false);
    setEditingTitleValue('');
  };

  // メインタイトル編集開始
  const handleStartMainTitleEdit = () => {
    setEditingMainTitleValue(localData.title);
    setIsEditingMainTitle(true);
  };

  // メインタイトル編集保存
  const handleSaveMainTitle = async () => {
    if (!editingMainTitleValue.trim()) {
      toast({
        title: "エラー",
        description: "タイトルを入力してください",
        variant: "destructive",
      });
      return;
    }

    try {
      const updatedData = { 
        ...localData, 
        title: editingMainTitleValue.trim(),
        updatedAt: new Date().toISOString()
      };

      setLocalData(updatedData);
      await onSave(updatedData);

      setIsEditingMainTitle(false);
      toast({
        title: "保存完了",
        description: "フロータイトルを更新しました",
      });
    } catch (error) {
      toast({
        title: "保存エラー",
        description: "タイトルの保存中にエラーが発生しました",
        variant: "destructive",
      });
    }
  };

  // メインタイトル編集キャンセル
  const handleCancelMainTitleEdit = () => {
    setIsEditingMainTitle(false);
    setEditingMainTitleValue('');
  };

  // 編集モードの場合
  if (isEditMode) {
    return (
      <div className="container py-4 mx-auto">
        <div className="flex items-center justify-between mb-4">
          <Button variant="outline" onClick={handleCancel}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            戻る
          </Button>
          <h2 className="text-xl font-bold">トラブルシューティング編集</h2>
          <div className="w-24" />
        </div>
        <TroubleshootingEditor
          data={data}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>
    );
  }

  // 表示モードの場合
  return (
    <div className="container py-4 mx-auto">
      <div className="flex items-center justify-between mb-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          戻る
        </Button>
        {isEditingMainTitle ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={editingMainTitleValue}
              onChange={(e) => setEditingMainTitleValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveMainTitle();
                if (e.key === 'Escape') handleCancelMainTitleEdit();
              }}
              className="flex-1 px-3 py-1 border rounded text-xl font-bold"
              autoFocus
            />
            <Button size="sm" onClick={handleSaveMainTitle}>
              <Save className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancelMainTitleEdit}>
              ×
            </Button>
          </div>
        ) : (
          <h2 
            className="text-xl font-bold cursor-pointer hover:bg-gray-100 px-2 py-1 rounded flex items-center"
            onClick={handleStartMainTitleEdit}
          >
            {localData.title}
            <Edit className="ml-2 h-4 w-4 opacity-50" />
          </h2>
        )}
        <Button onClick={toggleEditMode}>
          <Edit className="mr-2 h-4 w-4" />
          編集
        </Button>
      </div>

      {/* 基本情報カード */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle>{localData.title}</CardTitle>
            <Badge variant="outline">
              <Calendar className="h-3 w-3 mr-1" />
              {new Date(localData.createdAt).toLocaleDateString()}
            </Badge>
          </div>
          <CardDescription>{localData.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {localData.keywords.map((keyword, i) => (
              <Badge key={i} variant="secondary">{keyword}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* スライド表示 */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {isEditingTitle ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editingTitleValue}
                    onChange={(e) => setEditingTitleValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveTitle();
                      if (e.key === 'Escape') handleCancelTitleEdit();
                    }}
                    className="flex-1 px-2 py-1 border rounded text-lg font-semibold"
                    autoFocus
                  />
                  <Button size="sm" onClick={handleSaveTitle}>
                    <Save className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancelTitleEdit}>
                    ×
                  </Button>
                </div>
              ) : (
                <CardTitle className="text-lg cursor-pointer hover:bg-gray-100 px-2 py-1 rounded" onClick={handleStartTitleEdit}>
                  ステップ {currentStep + 1}/{localData.steps.length}: {localData.steps[currentStep]?.title}
                  <Edit className="inline ml-2 h-4 w-4 opacity-50" />
                </CardTitle>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] rounded-md border p-4">
            <div className="prose prose-sm max-w-none">
              {localData.steps[currentStep]?.content.split("\n").map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
        <CardFooter className="justify-between border-t p-4">
          <Button
            variant="outline"
            onClick={goToPrevious}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            前へ
          </Button>
          <div className="flex items-center">
            {Array.from({ length: localData.steps.length }).map((_, i) => (
              <div
                key={i}
                className={`
                  w-2 h-2 mx-1 rounded-full cursor-pointer transition-colors
                  ${i === currentStep ? 'bg-primary' : 'bg-gray-300'}
                `}
                onClick={() => setCurrentStep(i)}
              />
            ))}
          </div>
          <Button
            variant="outline"
            onClick={goToNext}
            disabled={currentStep === localData.steps.length - 1}
          >
            次へ
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>

      {/* 全スライド一覧 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">全スライド一覧</CardTitle>
          <CardDescription>クリックするとスライドに移動します</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {localData.steps.map((step, i) => (
              <Card
                key={step.id || i}
                className={`cursor-pointer hover:border-primary ${
                  i === currentStep ? 'border-primary bg-primary/5' : ''
                }`}
                onClick={() => setCurrentStep(i)}
              >
                <CardHeader className="p-3 pb-1">
                  <div className="flex items-center">
                    <Badge variant="outline" className="mr-2">
                      {i + 1}
                    </Badge>
                    <CardTitle className="text-sm">{step.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-1">
                  <p className="text-xs text-gray-500 line-clamp-2">
                    {step.content}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TroubleshootingViewer;