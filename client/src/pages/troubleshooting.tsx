import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TroubleshootingFileList from '@/components/troubleshooting/troubleshooting-file-list';

export default function TroubleshootingPage() {
  const [activeTab, setActiveTab] = useState('file-list');
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);

  const handleEdit = (flowId: string) => {
    setSelectedFlowId(flowId);
    setActiveTab('edit');
  };

  const handleNew = () => {
    setSelectedFlowId(null);
    setActiveTab('edit');
  };

  const handleCancel = () => {
    setSelectedFlowId(null);
    setActiveTab('file-list');
  };

  const handleSaved = () => {
    setSelectedFlowId(null);
    setActiveTab('file-list');
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">トラブルシューティング</h1>
        <p className="text-gray-600">テキスト編集によるフローデータ管理</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="file-list">ファイル一覧</TabsTrigger>
          <TabsTrigger value="edit">テキスト編集</TabsTrigger>
        </TabsList>

        <TabsContent value="file-list">
          <TroubleshootingFileList
            onEdit={handleEdit}
            onNew={handleNew}
          />
        </TabsContent>

        <TabsContent value="edit">
          <div className="p-4 text-center text-gray-500">
            <p>テキスト編集機能は開発中です</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}