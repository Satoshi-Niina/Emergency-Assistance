import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TroubleshootingFileList from '@/components/troubleshooting/troubleshooting-file-list';
import TroubleshootingTextEditor from '@/components/troubleshooting/troubleshooting-text-editor';

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
        <p className="text-gray-600">応急処置フローの管理</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="file-list">ファイル一覧</TabsTrigger>
          <TabsTrigger value="edit" disabled={!selectedFlowId}>編集</TabsTrigger>
        </TabsList>

        <TabsContent value="file-list">
          <TroubleshootingFileList
            onEdit={handleEdit}
            onNew={handleNew}
          />
        </TabsContent>

        <TabsContent value="edit">
          {selectedFlowId && (
            <TroubleshootingTextEditor
              flowId={selectedFlowId}
              onSave={handleSaved}
              onCancel={handleCancel}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}