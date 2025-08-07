import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Calendar, User, MessageSquare, Image as ImageIcon, Edit, Save, X, Download } from 'lucide-react';

interface ChatExportData {
  chatId: string;
  userId: string;
  exportType: string;
  exportTimestamp: string;
  chatData: {
    chatId: string;
    timestamp: string;
    machineInfo: {
      selectedMachineType: string;
      selectedMachineNumber: string;
      machineTypeName: string;
      machineNumber: string;
    };
    messages: Array<{
      id: number;
      content: string;
      isAiResponse: boolean;
      timestamp: string;
      media: any[];
    }>;
  };
  savedImages?: Array<{
    messageId: number;
    fileName: string;
    path: string;
    url: string;
  }>;
}

interface ReportData {
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
}

interface ChatExportReportProps {
  data: ChatExportData;
  fileName: string;
  onClose: () => void;
  onSave?: (reportData: ReportData) => void;
}

const ChatExportReport: React.FC<ChatExportReportProps> = ({ data, fileName, onClose, onSave }) => {
  const [isEditing, setIsEditing] = useState(false); // 初期状態をプレビューモードに設定
  const [reportData, setReportData] = useState<ReportData>({
    reportId: `R${data.chatId.slice(-5).toUpperCase()}`,
    machineId: data.chatData.machineInfo?.machineNumber || 'M98765',
    date: new Date(data.exportTimestamp).toISOString().split('T')[0],
    location: '○○線',
    failureCode: 'FC01',
    description: 'チャットによる故障相談・応急処置',
    status: '応急処置完了',
    engineer: data.userId || '担当者',
    notes: `チャットID: ${data.chatId}\nメッセージ数: ${data.chatData.messages.length}件\nエクスポート種別: ${data.exportType}`,
    repairSchedule: '2025年9月',
    repairLocation: '工場内修理スペース'
  });

  const [editedData, setEditedData] = useState<ReportData>(reportData);

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
    // 保存完了の通知
    alert('レポートが保存されました。');
  };

  const handleCancel = () => {
    if (window.confirm('編集内容を破棄しますか？')) {
      setEditedData(reportData);
      setIsEditing(false);
    }
  };

  const handleInputChange = (field: keyof ReportData, value: string) => {
    setEditedData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP');
  };

  const isImageMessage = (content: string) => {
    return content && content.startsWith('data:image/');
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

チャット履歴:
${data.chatData.messages.map(msg => 
  `${msg.isAiResponse ? 'AI' : 'ユーザー'}: ${msg.content}`
).join('\n')}
    `;

    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `故障報告書_${reportData.reportId}_${reportData.date}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const currentData = editedData; // 常に編集データを使用

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-center flex-1">機械故障報告書</h1>
                                           <div className="flex gap-2">
              {!isEditing ? (
                <>
                  <Button onClick={handleEdit} variant="outline" className="flex items-center gap-2">
                    <Edit className="h-4 w-4" />
                    レポート生成
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
                  <Button onClick={onClose} variant="outline">
                    閉じる
                  </Button>
                </>
              )}
            </div>
        </div>

        {/* メインコンテンツ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* 報告概要 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">報告概要</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                             <div className="flex justify-between">
                 <span className="font-medium">報告書ID:</span>
                 <Input
                   value={currentData.reportId}
                   onChange={(e) => handleInputChange('reportId', e.target.value)}
                   className="w-32"
                   disabled={!isEditing}
                 />
               </div>
                             <div className="flex justify-between">
                 <span className="font-medium">機械ID:</span>
                 <Input
                   value={currentData.machineId}
                   onChange={(e) => handleInputChange('machineId', e.target.value)}
                   className="w-32"
                   disabled={!isEditing}
                 />
               </div>
                             <div className="flex justify-between">
                 <span className="font-medium">日付:</span>
                 <Input
                   type="date"
                   value={currentData.date}
                   onChange={(e) => handleInputChange('date', e.target.value)}
                   className="w-32"
                   disabled={!isEditing}
                 />
               </div>
                             <div className="flex justify-between">
                 <span className="font-medium">場所:</span>
                 <Input
                   value={currentData.location}
                   onChange={(e) => handleInputChange('location', e.target.value)}
                   className="w-32"
                   disabled={!isEditing}
                 />
               </div>
                             <div className="flex justify-between">
                 <span className="font-medium">故障コード:</span>
                 <Input
                   value={currentData.failureCode}
                   onChange={(e) => handleInputChange('failureCode', e.target.value)}
                   className="w-32"
                   disabled={!isEditing}
                 />
               </div>
            </CardContent>
          </Card>

          {/* 故障詳細 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">故障詳細</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                             <div>
                 <span className="font-medium">説明:</span>
                 <Textarea
                   value={currentData.description}
                   onChange={(e) => handleInputChange('description', e.target.value)}
                   className="mt-1"
                   rows={2}
                   disabled={!isEditing}
                 />
               </div>
                             <div className="flex justify-between">
                 <span className="font-medium">ステータス:</span>
                 <Input
                   value={currentData.status}
                   onChange={(e) => handleInputChange('status', e.target.value)}
                   className="w-48"
                   disabled={!isEditing}
                 />
               </div>
                             <div className="flex justify-between">
                 <span className="font-medium">担当エンジニア:</span>
                 <Input
                   value={currentData.engineer}
                   onChange={(e) => handleInputChange('engineer', e.target.value)}
                   className="w-32"
                   disabled={!isEditing}
                 />
               </div>
                             <div>
                 <span className="font-medium">備考:</span>
                 <Textarea
                   value={currentData.notes}
                   onChange={(e) => handleInputChange('notes', e.target.value)}
                   className="mt-1"
                   rows={3}
                   disabled={!isEditing}
                 />
               </div>
            </CardContent>
          </Card>
        </div>

        {/* 修繕予定 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">修繕予定</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div className="flex justify-between">
                 <span className="font-medium">予定月日:</span>
                 <Input
                   value={currentData.repairSchedule}
                   onChange={(e) => handleInputChange('repairSchedule', e.target.value)}
                   className="w-32"
                   disabled={!isEditing}
                 />
               </div>
                             <div className="flex justify-between">
                 <span className="font-medium">場所:</span>
                 <Input
                   value={currentData.repairLocation}
                   onChange={(e) => handleInputChange('repairLocation', e.target.value)}
                   className="w-48"
                   disabled={!isEditing}
                 />
               </div>
            </div>
          </CardContent>
        </Card>

        {/* 故障箇所画像 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">故障箇所画像</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">機械故障箇所の画像</p>
            {data.savedImages && data.savedImages.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.savedImages.map((image, index) => (
                  <div key={index} className="border rounded-lg p-3">
                    <img
                      src={image.url}
                      alt={`故障箇所画像 ${index + 1}`}
                      className="w-full h-48 object-cover rounded-lg mb-2"
                    />
                    <p className="text-xs text-gray-500 text-center">{image.fileName}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 bg-gray-100 rounded-lg">
                <div className="text-center">
                  <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">画像がありません</p>
                </div>
              </div>
            )}
            <p className="text-sm text-gray-600 mt-4">上記は故障箇所の写真です。</p>
          </CardContent>
        </Card>

                 {/* チャット履歴サマリー */}
         <Card className="mb-6">
           <CardHeader>
             <CardTitle className="text-lg font-semibold">チャット履歴サマリー</CardTitle>
           </CardHeader>
           <CardContent>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
               <div className="flex items-center gap-2">
                 <Calendar className="h-4 w-4 text-gray-500" />
                 <span>エクスポート日時: {formatDate(data.exportTimestamp)}</span>
               </div>
               <div className="flex items-center gap-2">
                 <MessageSquare className="h-4 w-4 text-gray-500" />
                 <span>メッセージ数: {data.chatData.messages.length}件</span>
               </div>
               <div className="flex items-center gap-2">
                 <ImageIcon className="h-4 w-4 text-gray-500" />
                 <span>画像数: {data.savedImages?.length || 0}件</span>
               </div>
             </div>
             
             <div className="max-h-96 overflow-y-auto border rounded-lg p-4 bg-gray-50">
               {data.chatData.messages.map((message, index) => (
                 <div key={message.id} className={`mb-4 p-3 rounded-lg ${message.isAiResponse ? 'bg-blue-50 ml-4' : 'bg-gray-100 mr-4'}`}>
                   <div className="flex items-start gap-2 mb-2">
                     <Badge variant={message.isAiResponse ? 'default' : 'secondary'} className="text-xs">
                       {message.isAiResponse ? 'AI' : 'ユーザー'}
                     </Badge>
                     <span className="text-xs text-gray-500">
                       {formatDate(message.timestamp)}
                     </span>
                   </div>
                   <div className="mt-1">
                     {isImageMessage(message.content) ? (
                       <div className="flex items-center gap-2">
                         <ImageIcon className="h-4 w-4 text-gray-500" />
                         <span className="text-sm text-gray-600">画像メッセージ</span>
                       </div>
                     ) : (
                       <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                     )}
                   </div>
                 </div>
               ))}
             </div>
           </CardContent>
         </Card>

        {/* フッター */}
        <div className="text-center text-sm text-gray-500 py-4">
          © 2025 機械故障報告書. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default ChatExportReport;
