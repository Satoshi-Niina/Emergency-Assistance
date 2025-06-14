import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TroubleshootingCharacterEditor from '@/components/troubleshooting/troubleshooting-character-editor';

export default function TroubleshootingPage() {
  const [activeTab, setActiveTab] = useState('editor');

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">トラブルシューティング</h1>
        <p className="text-gray-600">応急処置フローの管理</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="editor">フロー編集</TabsTrigger>
        </TabsList>

        <TabsContent value="editor">
          <TroubleshootingCharacterEditor />
        </TabsContent>
      </Tabs>
    </div>
  );
}