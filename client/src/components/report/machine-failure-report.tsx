import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Calendar, User, MessageSquare, Image as ImageIcon, Edit, Save, X, Download, Printer, FileText } from 'lucide-react';

interface MachineFailureReportData {
  reportId: string;
  machineId: string;
  date: string;
  location: string;
  failureCode: string;
  description: string;
  status: string;
  engineer: string;
  notes: string;
  repairSchedule: string;
  repairLocation: string;
  images?: Array<{
    id: string;
    url: string;
    fileName: string;
    description?: string;
  }>;
  chatHistory?: Array<{
    id: number;
    content: string;
    isAiResponse: boolean;
    timestamp: string;
  }>;
}

interface MachineFailureReportProps {
  data: MachineFailureReportData;
  onClose: () => void;
  onSave?: (reportData: MachineFailureReportData) => void;
  onPrint?: (reportData: MachineFailureReportData) => void;
}

const MachineFailureReport: React.FC<MachineFailureReportProps> = ({ 
  data, 
  onClose, 
  onSave,
  onPrint 
}) => {
  const [isEditing, setIsEditing] = useState(false); // 初期状態をプレビューモードに設定
  const [reportData, setReportData] = useState<MachineFailureReportData>(data);
  const [editedData, setEditedData] = useState<MachineFailureReportData>(data);

  useEffect(() => {
    setEditedData(reportData);
  }, [reportData]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    setReportData(editedData);
    setIsEditing(false);
    if (onSave) {
      onSave(editedData);
    }
  };

  const handleCancel = () => {
    if (window.confirm('編集内容を破棄しますか？')) {
      setEditedData(reportData);
      setIsEditing(false);
    }
  };

  const handleInputChange = (field: keyof MachineFailureReportData, value: string) => {
    setEditedData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePrint = () => {
    if (onPrint) {
      onPrint(reportData);
    } else {
      window.print();
    }
  };

  const downloadReport = () => {
    const reportContent = `
機械故障報告書

報告概要:
報告書ID: ${reportData.reportId}
機械ID: ${reportData.machineId}
日付: ${reportData.date}
場所: ${reportData.location}
故障コード: ${reportData.failureCode}

故障詳細:
説明: ${reportData.description}
ステータス: ${reportData.status}
担当エンジニア: ${reportData.engineer}
備考: ${reportData.notes}

修繕予定:
予定月日: ${reportData.repairSchedule}
場所: ${reportData.repairLocation}
    `;

    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `機械故障報告書_${reportData.reportId}_${reportData.date}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const currentData = isEditing ? editedData : reportData;

  return (
    <div className="min-h-screen bg-white p-6 print:p-0">
      <div className="max-w-6xl mx-auto bg-white">
        {/* ヘッダー */}
        <div className="text-center mb-8 print:mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 print:text-2xl">機械故障報告書</h1>
        </div>

        {/* アクションボタン */}
        <div className="flex justify-end gap-2 mb-6 print:hidden">
          {!isEditing ? (
            <>
              <Button onClick={handleEdit} variant="outline" className="flex items-center gap-2">
                <Edit className="h-4 w-4" />
                編集
              </Button>
              <Button onClick={handlePrint} variant="outline" className="flex items-center gap-2">
                <Printer className="h-4 w-4" />
                印刷
              </Button>
              <Button onClick={downloadReport} variant="outline" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                ダウンロード
              </Button>
              <Button onClick={onClose} variant="outline">
                閉じる
              </Button>
            </>
          ) : (
            <>
              <Button onClick={handleSave} className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                保存
              </Button>
              <Button onClick={handleCancel} variant="outline" className="flex items-center gap-2">
                <X className="h-4 w-4" />
                キャンセル
              </Button>
            </>
          )}
        </div>

        {/* メインコンテンツ - 2列レイアウト */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* 左列: 報告概要 */}
          <div className="space-y-6">
            {/* 報告概要 */}
            <Card className="print:shadow-none print:border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-gray-900">報告概要</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700">報告書ID:</span>
                  <Input
                    value={currentData.reportId}
                    onChange={(e) => handleInputChange('reportId', e.target.value)}
                    className="w-32 text-right font-mono"
                    disabled={!isEditing}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700">機械ID:</span>
                  <Input
                    value={currentData.machineId}
                    onChange={(e) => handleInputChange('machineId', e.target.value)}
                    className="w-32 text-right font-mono"
                    disabled={!isEditing}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700">日付:</span>
                  <Input
                    type="date"
                    value={currentData.date}
                    onChange={(e) => handleInputChange('date', e.target.value)}
                    className="w-32 text-right"
                    disabled={!isEditing}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700">場所:</span>
                  <Input
                    value={currentData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    className="w-32 text-right"
                    disabled={!isEditing}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700">故障コード:</span>
                  <Input
                    value={currentData.failureCode}
                    onChange={(e) => handleInputChange('failureCode', e.target.value)}
                    className="w-32 text-right font-mono"
                    disabled={!isEditing}
                  />
                </div>
              </CardContent>
            </Card>

            {/* 修繕予定 */}
            <Card className="print:shadow-none print:border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-gray-900">修繕予定</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700">予定月日:</span>
                  <Input
                    value={currentData.repairSchedule}
                    onChange={(e) => handleInputChange('repairSchedule', e.target.value)}
                    className="w-32 text-right"
                    disabled={!isEditing}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700">場所:</span>
                  <Input
                    value={currentData.repairLocation}
                    onChange={(e) => handleInputChange('repairLocation', e.target.value)}
                    className="w-48 text-right"
                    disabled={!isEditing}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 右列: 故障詳細 */}
          <div>
            <Card className="print:shadow-none print:border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-gray-900">故障詳細</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="font-medium text-gray-700 block mb-2">説明:</span>
                  <Textarea
                    value={currentData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className="w-full"
                    rows={3}
                    disabled={!isEditing}
                    placeholder="故障の詳細な説明を入力してください"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700">ステータス:</span>
                  <Input
                    value={currentData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="w-48 text-right"
                    disabled={!isEditing}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700">担当エンジニア:</span>
                  <Input
                    value={currentData.engineer}
                    onChange={(e) => handleInputChange('engineer', e.target.value)}
                    className="w-32 text-right"
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <span className="font-medium text-gray-700 block mb-2">備考:</span>
                  <Textarea
                    value={currentData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    className="w-full"
                    rows={4}
                    disabled={!isEditing}
                    placeholder="追加の備考事項を入力してください"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 故障箇所画像 */}
        <Card className="mb-8 print:shadow-none print:border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-gray-900">故障箇所画像</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">機械故障箇所の画像</p>
            {currentData.images && currentData.images.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentData.images.map((image, index) => (
                  <div key={image.id} className="border rounded-lg p-3 print:break-inside-avoid">
                    <img
                      src={image.url}
                      alt={`故障箇所画像 ${index + 1}`}
                      className="w-full h-48 object-cover rounded-lg mb-2 print:h-32"
                    />
                    <p className="text-xs text-gray-500 text-center">{image.fileName}</p>
                    {image.description && (
                      <p className="text-xs text-gray-600 text-center mt-1">{image.description}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 bg-gray-100 rounded-lg print:h-32">
                <div className="text-center">
                  <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-2 print:h-8" />
                  <p className="text-gray-500 text-sm">画像がありません</p>
                </div>
              </div>
            )}
            <p className="text-sm text-gray-600 mt-4">上記は故障箇所の写真です。</p>
          </CardContent>
        </Card>

        {/* チャット履歴（オプション） */}
        {currentData.chatHistory && currentData.chatHistory.length > 0 && (
          <Card className="mb-8 print:shadow-none print:border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-gray-900">チャット履歴</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto border rounded-lg p-4 bg-gray-50 print:max-h-none">
                {currentData.chatHistory.map((message, index) => (
                  <div key={message.id} className={`mb-4 p-3 rounded-lg ${message.isAiResponse ? 'bg-blue-50 ml-4' : 'bg-gray-100 mr-4'}`}>
                    <div className="flex items-start gap-2 mb-2">
                      <Badge variant={message.isAiResponse ? 'default' : 'secondary'} className="text-xs">
                        {message.isAiResponse ? 'AI' : 'ユーザー'}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {new Date(message.timestamp).toLocaleString('ja-JP')}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* フッター */}
        <div className="text-center text-sm text-gray-500 py-4 border-t print:border-t-2">
          © 2025 機械故障報告書. All rights reserved.
        </div>
      </div>

      {/* 印刷用スタイル */}
      <style jsx>{`
        @media print {
          @page {
            margin: 1cm;
            size: A4;
          }
          body {
            font-size: 12pt;
            line-height: 1.4;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:border-2 {
            border-width: 2px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default MachineFailureReport;
