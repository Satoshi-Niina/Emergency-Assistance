import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import FaultHistoryManager from '../components/fault-history/fault-history-manager';
import { saveFromChatExport, type FaultHistoryItem } from '../lib/api/fault-history-api';

export default function FaultHistoryPage() {
  const [selectedHistory, setSelectedHistory] = useState<FaultHistoryItem | null>(null);
  const [importTestLoading, setImportTestLoading] = useState(false);

  // チャットエクスポートのテストインポート
  const handleTestImport = async () => {
    try {
      setImportTestLoading(true);
      
      // テスト用のダミーデータ
      const testExportData = {
        title: 'テスト故障履歴',
        description: 'システムテスト用の故障履歴データ',
        machineType: 'MT-100',
        machineNumber: 'M001',
        office: 'テスト事業所',
        category: '故障対応',
        conversationHistory: [
          {
            role: 'user',
            content: '機械が異音を立てています。対処方法を教えてください。',
            timestamp: new Date().toISOString(),
          },
          {
            role: 'assistant',
            content: '異音の状況を確認させていただきます。まず、機械の電源をOFFにして安全を確保してください。',
            timestamp: new Date().toISOString(),
          },
          {
            role: 'user',
            content: 'データから見ても確認できませんが、画像を添付します。',
            timestamp: new Date().toISOString(),
          },
        ],
        metadata: {
          exportedAt: new Date().toISOString(),
          version: '1.0',
        },
      };

      const result = await saveFromChatExport(testExportData, {
        title: 'テスト故障履歴 - ' + new Date().toLocaleString(),
        description: 'システムテスト用にインポートされた故障履歴',
      });

      alert(`✅ テストインポート完了: ID=${result.id}, 画像数=${result.imageCount}`);
    } catch (error) {
      console.error('テストインポートエラー:', error);
      alert('❌ テストインポートに失敗しました');
    } finally {
      setImportTestLoading(false);
    }
  };

  const handleHistorySelect = (history: FaultHistoryItem) => {
    setSelectedHistory(history);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">故障履歴データベース</h1>
            <p className="text-gray-600 mt-2">
              故障履歴をデータベースで管理し、GPTのナレッジベースとして活用します
            </p>
          </div>
          <div className="space-x-2">
            <Button
              onClick={handleTestImport}
              disabled={importTestLoading}
              variant="outline"
            >
              {importTestLoading ? 'テスト中...' : 'テストインポート'}
            </Button>
          </div>
        </div>

        {/* システム説明 */}
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">システム概要</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 故障履歴はJSON形式でデータベースに保存されます</li>
            <li>• 添付画像は knowledge-base/images/chat-exports に保存されます</li>
            <li>• 基礎データ管理（GPTのナレッジ）として活用されます</li>
            <li>• 本番環境では環境変数 FAULT_HISTORY_STORAGE_MODE=database で切り替わります</li>
            <li>• ローカル環境では現在ファイルモードで動作中です</li>
          </ul>
        </div>
      </div>

      <Tabs defaultValue="manager" className="w-full">
        <TabsList>
          <TabsTrigger value="manager">故障履歴管理</TabsTrigger>
          <TabsTrigger value="detail">選択中の履歴</TabsTrigger>
        </TabsList>

        <TabsContent value="manager">
          <FaultHistoryManager onHistorySelect={handleHistorySelect} />
        </TabsContent>

        <TabsContent value="detail">
          {selectedHistory ? (
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold">{selectedHistory.title}</h2>
                  <p className="text-gray-600 mt-1">{selectedHistory.description}</p>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    編集
                  </Button>
                  <Button variant="outline" size="sm">
                    エクスポート
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 基本情報 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">基本情報</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">機種</label>
                      <p className="mt-1">{selectedHistory.machineType || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">機械番号</label>
                      <p className="mt-1">{selectedHistory.machineNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">事業所</label>
                      <p className="mt-1">{selectedHistory.office || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">カテゴリ</label>
                      <p className="mt-1">{selectedHistory.category || 'N/A'}</p>
                    </div>
                  </div>

                  {selectedHistory.keywords && selectedHistory.keywords.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">キーワード</label>
                      <div className="flex flex-wrap gap-1">
                        {selectedHistory.keywords.map((keyword, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* メタデータ */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">メタデータ</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">ID:</span> {selectedHistory.id}
                    </div>
                    <div>
                      <span className="font-medium">保存モード:</span> {selectedHistory.storageMode}
                    </div>
                    <div>
                      <span className="font-medium">作成日時:</span> {new Date(selectedHistory.createdAt).toLocaleString()}
                    </div>
                    <div>
                      <span className="font-medium">更新日時:</span> {new Date(selectedHistory.updatedAt).toLocaleString()}
                    </div>
                    {selectedHistory.images && (
                      <div>
                        <span className="font-medium">関連画像:</span> {selectedHistory.images.length}件
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 元のJSONデータ */}
              <div>
                <h3 className="text-lg font-semibold mb-4">元データ (JSON)</h3>
                <div className="bg-gray-100 rounded-lg p-4 max-h-96 overflow-y-auto">
                  <pre className="text-xs">
                    {JSON.stringify(selectedHistory.jsonData, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>故障履歴を選択してください</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}