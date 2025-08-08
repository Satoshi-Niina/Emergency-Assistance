import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Calendar, User, MessageSquare, Image as ImageIcon, Edit, Save, X, Download, Printer, FileText } from 'lucide-react';

interface MachineFailureReportData {
  reportId: string;
  machineType: string; // 機種を追加
  machineNumber: string; // 機械IDを機械番号に変更
  date: string;
  location: string;
  description: string;
  status: string;
  engineer: string;
  notes: string;
  repairSchedule: string;
  repairLocation: string;
  repairRequestDate: string; // 修繕依頼月日を追加
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
  data: MachineFailureReportData | MachineFailureReportData[];
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
  // データが配列かどうかを判定
  const isMultipleReports = Array.isArray(data);
  const reports = isMultipleReports ? data : [data];
  
  console.log('MachineFailureReport - データ確認:', {
    isMultipleReports,
    reportsLength: reports.length,
    dataType: Array.isArray(data) ? 'array' : 'single',
    firstReport: reports[0]?.reportId
  });
  
  const [currentPage, setCurrentPage] = useState(0);
  const [isEditing, setIsEditing] = useState(false); // 初期状態をプレビューモードに設定
  const [reportData, setReportData] = useState<MachineFailureReportData>(reports[0]);
  const [editedData, setEditedData] = useState<MachineFailureReportData>(reports[0]);

  useEffect(() => {
    setEditedData(reportData);
  }, [reportData]);

  // ページ変更時の処理
  useEffect(() => {
    console.log('ページ変更useEffect実行:', {
      currentPage,
      isMultipleReports,
      reportsLength: reports.length,
      hasCurrentReport: !!reports[currentPage]
    });
    
    if (isMultipleReports && reports[currentPage]) {
      console.log('レポートデータを更新:', {
        currentPage,
        reportId: reports[currentPage].reportId,
        description: reports[currentPage].description
      });
      setReportData(reports[currentPage]);
      setEditedData(reports[currentPage]);
    }
  }, [currentPage, isMultipleReports, reports]);

  const handlePageChange = (direction: 'prev' | 'next') => {
    console.log('ページ移動試行:', {
      direction,
      currentPage,
      reportsLength: reports.length,
      canGoPrev: currentPage > 0,
      canGoNext: currentPage < reports.length - 1
    });
    
    if (direction === 'prev' && currentPage > 0) {
      const newPage = currentPage - 1;
      console.log('前のページに移動:', newPage);
      setCurrentPage(newPage);
    } else if (direction === 'next' && currentPage < reports.length - 1) {
      const newPage = currentPage + 1;
      console.log('次のページに移動:', newPage);
      setCurrentPage(newPage);
    } else {
      console.log('ページ移動できません:', {
        direction,
        currentPage,
        reportsLength: reports.length
      });
    }
  };

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
機種: ${reportData.machineType}
機械番号: ${reportData.machineNumber}
日付: ${reportData.date}
場所: ${reportData.location}

 故障詳細:
 説明: ${reportData.description}
 ステータス: ${reportData.status}
 責任者: ${reportData.engineer}
 備考: ${reportData.notes}

修繕予定:
依頼月日: ${reportData.repairRequestDate}
予定月日: ${reportData.repairSchedule}
場所: ${reportData.repairLocation}
    `;

    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
         link.download = `報告書_${reportData.reportId}_${reportData.date}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const currentData = isEditing ? editedData : reportData;
  
  // 現在のレポート情報をログ出力
  console.log('現在のレポートデータ:', {
    currentPage,
    reportId: currentData.reportId,
    description: currentData.description,
    isEditing
  });

  return (
    <div className="min-h-screen bg-white p-6 print:p-0">
      <div className="max-w-6xl mx-auto bg-white">
                 {/* ヘッダー */}
         <div className="text-center mb-8 print:mb-6">
           <h1 className="text-3xl font-bold text-gray-900 mb-2 print:text-2xl">機械故障報告書</h1>
           {isMultipleReports && reports.length > 1 && (
             <div className="flex justify-center items-center gap-4 mt-4 print:hidden">
               <Button
                 onClick={() => handlePageChange('prev')}
                 disabled={currentPage === 0}
                 variant="outline"
                 size="sm"
                 className="min-w-[120px]"
               >
                 ← 前のページ
               </Button>
               <span className="text-sm text-gray-600 font-medium">
                 ページ {currentPage + 1} / {reports.length}
               </span>
               <Button
                 onClick={() => handlePageChange('next')}
                 disabled={currentPage === reports.length - 1}
                 variant="outline"
                 size="sm"
                 className="min-w-[120px]"
               >
                 次のページ →
               </Button>
             </div>
           )}
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
                      className="w-40 text-left font-mono"
                      disabled={!isEditing}
                    />
                 </div>
                                 <div className="flex justify-between items-center">
                   <span className="font-medium text-gray-700">機種:</span>
                                       <Input
                      value={currentData.machineType}
                      onChange={(e) => handleInputChange('machineType', e.target.value)}
                      className="w-40 text-left"
                      disabled={!isEditing}
                      placeholder="例: MC300"
                    />
                 </div>
                                 <div className="flex justify-between items-center">
                   <span className="font-medium text-gray-700">機械番号:</span>
                                       <Input
                      value={currentData.machineNumber}
                      onChange={(e) => handleInputChange('machineNumber', e.target.value)}
                      className="w-40 text-left font-mono"
                      disabled={!isEditing}
                      placeholder="例: 200"
                    />
                 </div>
                                 <div className="flex justify-between items-center">
                   <span className="font-medium text-gray-700">日付:</span>
                   <div className="relative">
                                           <Input
                        type="date"
                        value={currentData.date}
                        onChange={(e) => handleInputChange('date', e.target.value)}
                        className="w-40 text-left pr-8"
                        disabled={!isEditing}
                      />
                     <Calendar className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-600 pointer-events-none z-20" />
                   </div>
                 </div>
                                 <div className="flex justify-between items-center">
                   <span className="font-medium text-gray-700">場所:</span>
                                       <Input
                      value={currentData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      className="w-40 text-left"
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
                   <span className="font-medium text-gray-700">依頼月日:</span>
                   <div className="relative">
                                           <Input
                        type="date"
                        value={currentData.repairRequestDate}
                        onChange={(e) => handleInputChange('repairRequestDate', e.target.value)}
                        className="w-40 text-left pr-8"
                        disabled={!isEditing}
                      />
                     <Calendar className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-600 pointer-events-none z-20" />
                   </div>
                 </div>
                                 <div className="flex justify-between items-center">
                   <span className="font-medium text-gray-700">予定月日:</span>
                   <div className="relative">
                                           <Input
                        type="date"
                        value={currentData.repairSchedule}
                        onChange={(e) => handleInputChange('repairSchedule', e.target.value)}
                        className="w-40 text-left pr-8"
                        disabled={!isEditing}
                      />
                     <Calendar className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-600 pointer-events-none z-20" />
                   </div>
                 </div>
                                 <div className="flex justify-between items-center">
                   <span className="font-medium text-gray-700">場所:</span>
                                       <Input
                      value={currentData.repairLocation}
                      onChange={(e) => handleInputChange('repairLocation', e.target.value)}
                      className="w-56 text-left"
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
                    rows={10}
                    disabled={!isEditing}
                    placeholder="故障の詳細な説明を入力してください"
                  />
                </div>
                                 <div className="flex justify-between items-center">
                   <span className="font-medium text-gray-700">ステータス:</span>
                                       <Input
                      value={currentData.status}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      className="w-56 text-left"
                      disabled={!isEditing}
                    />
                 </div>
                                 <div className="flex justify-between items-center">
                   <span className="font-medium text-gray-700">責任者:</span>
                                       <Input
                      value={currentData.engineer}
                      onChange={(e) => handleInputChange('engineer', e.target.value)}
                      className="w-40 text-left"
                      disabled={!isEditing}
                    />
                 </div>
                <div>
                  <span className="font-medium text-gray-700 block mb-2">備考:</span>
                  <Textarea
                    value={currentData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    className="w-full"
                    rows={8}
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
                       onError={(e) => {
                         console.log('画像読み込みエラー:', image.url.substring(0, 50) + '...');
                         const target = e.target as HTMLImageElement;
                         target.style.display = 'none';
                         const errorDiv = target.nextElementSibling as HTMLElement;
                         if (errorDiv) {
                           errorDiv.style.display = 'block';
                         }
                       }}
                       onLoad={() => {
                         console.log('画像読み込み成功:', image.url.substring(0, 50) + '...');
                       }}
                     />
                     <div className="hidden text-center text-gray-500 text-sm">
                       画像読み込みエラー
                     </div>
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
             size: A4 portrait;
           }
           body {
             font-size: 12pt;
             line-height: 1.4;
             font-family: 'MS Gothic', 'Yu Gothic', sans-serif;
           }
           .print\\:shadow-none {
             box-shadow: none !important;
           }
           .print\\:border-2 {
             border-width: 2px !important;
           }
           .print\\:h-32 {
             height: 8rem !important;
           }
           .print\\:h-8 {
             height: 2rem !important;
           }
           .print\\:text-2xl {
             font-size: 1.5rem !important;
             line-height: 2rem !important;
           }
           .print\\:mb-6 {
             margin-bottom: 1.5rem !important;
           }
           .print\\:max-h-none {
             max-height: none !important;
           }
           .print\\:break-inside-avoid {
             break-inside: avoid !important;
           }
         }
       `}</style>
    </div>
  );
};

export default MachineFailureReport;
