import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Edit, Save, X, Printer, Image as ImageIcon } from 'lucide-react';

interface MachineFailureReportData {
  reportId: string;
  machineType: string;
  machineNumber: string;
  date: string;
  location: string;
  description: string;
  status: string;
  engineer: string;
  notes: string;
  repairSchedule: string;
  repairLocation: string;
  repairRequestDate: string;
  images?: Array<{
    id: string;
    url: string;
    fileName: string;
    description?: string;
  }>;
}

interface MachineFailureReportProps {
  data: MachineFailureReportData;
  onClose: () => void;
  onSave?: (reportData: MachineFailureReportData) => void;
}

const MachineFailureReport: React.FC<MachineFailureReportProps> = ({ 
  data, 
  onClose, 
  onSave
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<MachineFailureReportData>(data);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    if (onSave) {
      onSave(editedData);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedData(data);
    setIsEditing(false);
  };

  const handleInputChange = (field: keyof MachineFailureReportData, value: string) => {
    setEditedData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePrint = () => {
    // 印刷前に編集モードを終了
    if (isEditing) {
      setIsEditing(false);
    }
    // 印刷実行
    window.print();
  };

  const currentData = isEditing ? editedData : data;

  return (
    <div className="min-h-screen bg-gray-50 p-4 print:p-0 print:bg-white print:min-h-0 print:fixed print:inset-0 print:z-50">
      {/* レポート専用UI - 編集・印刷・保存機能付き */}
      <div className="max-w-6xl mx-auto bg-white shadow-lg rounded-lg print:shadow-none print:max-w-none print:rounded-none print:bg-transparent print:relative print:top-0 print:left-0 print:w-full print:h-auto">
        {/* ヘッダー - アクションボタン（印刷時完全非表示） */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 rounded-t-lg print:hidden">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">機械故障報告書</h1>
            <div className="flex gap-3">
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
          </div>
        </div>

        {/* 印刷範囲: 機械故障報告書の内容のみ */}
        <div className="p-8 print:p-6 print:bg-white print:relative print:z-10">
          {/* 印刷範囲開始: 機械故障報告書タイトル */}
          <div className="text-center mb-8 print:mb-6 print:relative print:z-20">
            <h2 className="text-3xl font-bold text-gray-900 print:text-2xl">機械故障報告書</h2>
          </div>

          {/* 印刷範囲: メインコンテンツ - 2列レイアウト */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8 print:gap-6 print:mb-6">
            {/* 左列: 報告概要 */}
            <div className="space-y-6 print:space-y-4">
              {/* 報告概要カード */}
              <Card className="print:shadow-none print:border print:border-gray-300 print:bg-white">
                <CardHeader className="pb-4 print:pb-3">
                  <CardTitle className="text-xl font-semibold text-gray-900 print:text-lg">報告概要</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 print:space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">報告書ID:</span>
                    {isEditing ? (
                      <Input
                        value={currentData.reportId}
                        onChange={(e) => handleInputChange('reportId', e.target.value)}
                        className="w-48 text-left font-mono print:hidden"
                        placeholder="報告書IDを入力"
                      />
                    ) : (
                      <span className="font-mono text-gray-900">{currentData.reportId}</span>
                    )}
                    {/* 印刷時用の表示（編集モード時は非表示） */}
                    {isEditing && (
                      <span className="font-mono text-gray-900 print:block hidden">{currentData.reportId}</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">機種:</span>
                    {isEditing ? (
                      <Input
                        value={currentData.machineType}
                        onChange={(e) => handleInputChange('machineType', e.target.value)}
                        className="w-48 text-left print:hidden"
                        placeholder="例: MC300"
                      />
                    ) : (
                      <span className="text-gray-900">{currentData.machineType}</span>
                    )}
                    {/* 印刷時用の表示（編集モード時は非表示） */}
                    {isEditing && (
                      <span className="text-gray-900 print:block hidden">{currentData.machineType}</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">機械番号:</span>
                    {isEditing ? (
                      <Input
                        value={currentData.machineNumber}
                        onChange={(e) => handleInputChange('machineNumber', e.target.value)}
                        className="w-48 text-left print:hidden"
                        placeholder="例: 200"
                      />
                    ) : (
                      <span className="text-gray-900">{currentData.machineNumber}</span>
                    )}
                    {/* 印刷時用の表示（編集モード時は非表示） */}
                    {isEditing && (
                      <span className="text-gray-900 print:block hidden">{currentData.machineNumber}</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">日付:</span>
                    {isEditing ? (
                      <Input
                        value={currentData.date}
                        onChange={(e) => handleInputChange('date', e.target.value)}
                        className="w-48 text-left print:hidden"
                        type="date"
                      />
                    ) : (
                      <span className="text-gray-900">{currentData.date}</span>
                    )}
                    {/* 印刷時用の表示（編集モード時は非表示） */}
                    {isEditing && (
                      <span className="text-gray-900 print:block hidden">{currentData.date}</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">場所:</span>
                    {isEditing ? (
                      <Input
                        value={currentData.location}
                        onChange={(e) => handleInputChange('location', e.target.value)}
                        className="w-48 text-left print:hidden"
                        placeholder="故障発生場所"
                      />
                    ) : (
                      <span className="text-gray-900">{currentData.location}</span>
                    )}
                    {/* 印刷時用の表示（編集モード時は非表示） */}
                    {isEditing && (
                      <span className="text-gray-900 print:block hidden">{currentData.location}</span>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 修繕予定カード */}
              <Card className="print:shadow-none print:border print:border-gray-300 print:bg-white">
                <CardHeader className="pb-4 print:pb-3">
                  <CardTitle className="text-xl font-semibold text-gray-900 print:text-lg">修繕予定</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 print:space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">依頼月日:</span>
                    {isEditing ? (
                      <Input
                        value={currentData.repairRequestDate}
                        onChange={(e) => handleInputChange('repairRequestDate', e.target.value)}
                        className="w-48 text-left print:hidden"
                        type="date"
                      />
                    ) : (
                      <span className="text-gray-900">{currentData.repairRequestDate}</span>
                    )}
                    {/* 印刷時用の表示（編集モード時は非表示） */}
                    {isEditing && (
                      <span className="text-gray-900 print:block hidden">{currentData.repairRequestDate}</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">予定月日:</span>
                    {isEditing ? (
                      <Input
                        value={currentData.repairSchedule}
                        onChange={(e) => handleInputChange('repairSchedule', e.target.value)}
                        className="w-48 text-left print:hidden"
                        type="date"
                      />
                    ) : (
                      <span className="text-gray-900">{currentData.repairSchedule}</span>
                    )}
                    {/* 印刷時用の表示（編集モード時は非表示） */}
                    {isEditing && (
                      <span className="text-gray-900 print:block hidden">{currentData.repairSchedule}</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">場所:</span>
                    {isEditing ? (
                      <Input
                        value={currentData.repairLocation}
                        onChange={(e) => handleInputChange('repairLocation', e.target.value)}
                        className="w-48 text-left print:hidden"
                        placeholder="修繕予定場所"
                      />
                    ) : (
                      <span className="text-gray-900">{currentData.repairLocation}</span>
                    )}
                    {/* 印刷時用の表示（編集モード時は非表示） */}
                    {isEditing && (
                      <span className="text-gray-900 print:block hidden">{currentData.repairLocation}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 右列: 故障詳細 */}
            <div className="space-y-6 print:space-y-4">
              {/* 故障詳細カード */}
              <Card className="print:shadow-none print:border print:border-gray-300 print:bg-white">
                <CardHeader className="pb-4 print:pb-3">
                  <CardTitle className="text-xl font-semibold text-gray-900 print:text-lg">故障詳細</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 print:space-y-3">
                  <div>
                    <span className="font-medium text-gray-700 block mb-2 print:mb-1">説明:</span>
                    {isEditing ? (
                      <Textarea
                        value={currentData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        className="w-full h-24 print:hidden"
                        rows={4}
                        placeholder="故障の詳細な説明を入力してください"
                      />
                    ) : (
                      <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded border print:bg-white">{currentData.description}</p>
                    )}
                    {/* 印刷時用の表示（編集モード時は非表示） */}
                    {isEditing && (
                      <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded border print:bg-white print:block hidden">{currentData.description}</p>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">ステータス:</span>
                    {isEditing ? (
                      <Input
                        value={currentData.status}
                        onChange={(e) => handleInputChange('status', e.target.value)}
                        className="w-48 text-left print:hidden"
                        placeholder="例: 調査中"
                      />
                    ) : (
                      <span className="text-gray-900">{currentData.status}</span>
                    )}
                    {/* 印刷時用の表示（編集モード時は非表示） */}
                    {isEditing && (
                      <span className="text-gray-900 print:block hidden">{currentData.status}</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">責任者:</span>
                    {isEditing ? (
                      <Input
                        value={currentData.engineer}
                        onChange={(e) => handleInputChange('engineer', e.target.value)}
                        className="w-48 text-left print:hidden"
                        placeholder="責任者名"
                      />
                    ) : (
                      <span className="text-gray-900">{currentData.engineer}</span>
                    )}
                    {/* 印刷時用の表示（編集モード時は非表示） */}
                    {isEditing && (
                      <span className="text-gray-900 print:block hidden">{currentData.engineer}</span>
                    )}
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 block mb-2 print:mb-1">備考:</span>
                    {isEditing ? (
                      <Textarea
                        value={currentData.notes}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                        className="w-full h-24 print:hidden"
                        rows={4}
                        placeholder="追加の備考事項を入力してください"
                      />
                    ) : (
                      <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded border print:bg-white">{currentData.notes}</p>
                    )}
                    {/* 印刷時用の表示（編集モード時は非表示） */}
                    {isEditing && (
                      <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded border print:bg-white print:block hidden">{currentData.notes}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* 印刷範囲終了: 故障箇所画像カード - フル幅 */}
          <Card className="print:shadow-none print:border print:border-gray-300 print:bg-white">
            <CardHeader className="pb-4 print:pb-3">
              <CardTitle className="text-xl font-semibold text-gray-900 print:text-lg">故障箇所画像</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4 print:mb-3">機械故障箇所の画像</p>
              {currentData.images && currentData.images.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 print:gap-3">
                  {currentData.images.map((image, index) => (
                    <div key={image.id} className="border rounded-lg p-3 print:break-inside-avoid print:p-2 print:bg-white">
                      <img
                        src={image.url}
                        alt={`故障箇所画像 ${index + 1}`}
                        className="w-full h-40 object-cover rounded-lg mb-2 print:h-32 print:mb-1"
                        crossOrigin="anonymous"
                        onError={(e) => {
                          console.log('画像読み込みエラー:', image.url.substring(0, 100) + '...');
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const errorDiv = target.nextElementSibling as HTMLElement;
                          if (errorDiv) {
                            errorDiv.style.display = 'block';
                          }
                        }}
                        onLoad={() => {
                          console.log('画像読み込み成功:', image.url.substring(0, 100) + '...');
                        }}
                      />
                      <div className="hidden text-center text-gray-500 text-sm print:block">
                        画像読み込みエラー
                      </div>
                      <p className="text-sm text-gray-500 text-center">{image.fileName}</p>
                      {image.description && (
                        <p className="text-sm text-gray-600 text-center mt-1">{image.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-40 bg-gray-100 rounded-lg print:h-32 print:bg-white">
                  <div className="text-center">
                    <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">画像がありません</p>
                  </div>
                </div>
              )}
              <p className="text-gray-600 mt-4 print:mt-3">上記は故障箇所の写真です。</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 印刷用スタイル - 印刷範囲を厳密に制御 */}
      <style jsx>{`
        @media print {
          @page {
            margin: 1cm;
            size: A4 portrait;
          }
          
          /* 印刷時はページ全体をリセット */
          * {
            box-sizing: border-box;
          }
          
          body {
            font-size: 12pt;
            line-height: 1.3;
            font-family: 'MS Gothic', 'Yu Gothic', sans-serif;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            min-height: auto !important;
            height: auto !important;
          }
          
          /* 印刷時の画像表示を確実にする */
          img {
            max-width: 100% !important;
            height: auto !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          
          /* 画像コンテナの印刷設定 */
          .print\\:break-inside-avoid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          
          /* 印刷範囲外のコンテンツを完全に非表示 */
          .print\\:hidden {
            display: none !important;
          }
          
          /* 印刷時のみ表示 */
          .print\\:block {
            display: block !important;
          }
          
          /* 印刷範囲を厳密に制御 - 故障報告書の内容のみ表示 */
          .print\\:p-0 {
            padding: 0 !important;
          }
          
          .print\\:bg-white {
            background-color: white !important;
          }
          
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          
          .print\\:max-w-none {
            max-width: none !important;
          }
          
          .print\\:rounded-none {
            border-radius: 0 !important;
          }
          
          .print\\:min-h-0 {
            min-height: 0 !important;
          }
          
          .print\\:bg-transparent {
            background-color: transparent !important;
          }
          
          /* 印刷時のレイアウト最適化 */
          .print\\:p-6 {
            padding: 1.5rem !important;
          }
          
          .print\\:gap-6 {
            gap: 1.5rem !important;
          }
          
          .print\\:gap-3 {
            gap: 0.75rem !important;
          }
          
          .print\\:mb-6 {
            margin-bottom: 1.5rem !important;
          }
          
          .print\\:mb-3 {
            margin-bottom: 0.75rem !important;
          }
          
          .print\\:pb-3 {
            padding-bottom: 0.75rem !important;
          }
          
          .print\\:space-y-4 {
            --tw-space-y-reverse: 0;
            margin-top: calc(1rem * calc(1 - var(--tw-space-y-reverse)));
            margin-bottom: calc(1rem * var(--tw-space-y-reverse));
          }
          
          .print\\:space-y-3 {
            --tw-space-y-reverse: 0;
            margin-top: calc(0.75rem * calc(1 - var(--tw-space-y-reverse)));
            margin-bottom: calc(0.75rem * var(--tw-space-y-reverse));
          }
          
          .print\\:mt-3 {
            margin-top: 0.75rem !important;
          }
          
          .print\\:h-32 {
            height: 8rem !important;
          }
          
          .print\\:break-inside-avoid {
            break-inside: avoid !important;
          }
          
          /* 印刷時のテキスト最適化 */
          .print\\:text-2xl {
            font-size: 1.5rem !important;
            line-height: 2rem !important;
          }
          
          .print\\:text-lg {
            font-size: 1.125rem !important;
            line-height: 1.75rem !important;
          }
          
          /* 印刷時のボーダー最適化 */
          .print\\:border {
            border-width: 1px !important;
            border-color: #d1d5db !important;
          }
          
          /* 印刷時の入力フィールド最適化 */
          input, textarea {
            border: 1px solid #d1d5db !important;
            background: white !important;
          }
          
          /* 印刷範囲外の要素を強制的に非表示 */
          header, nav, footer, .header, .navigation, .sidebar {
            display: none !important;
          }
          
          /* 印刷時は故障報告書の内容のみ表示 */
          .min-h-screen {
            min-height: auto !important;
          }
          
          /* 印刷時の背景色を強制的に白に */
          .bg-gray-50, .bg-gray-100 {
            background-color: white !important;
          }
          
          /* 印刷時のレイアウト最適化 */
          .grid {
            display: grid !important;
          }
          
          .grid-cols-1 {
            grid-template-columns: repeat(1, minmax(0, 1fr)) !important;
          }
          
          .lg\\:grid-cols-2 {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
          
          .md\\:grid-cols-2 {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
          
          .lg\\:grid-cols-3 {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }
          
          /* 印刷時のフレックスボックス最適化 */
          .flex {
            display: flex !important;
          }
          
          .items-center {
            align-items: center !important;
          }
          
          .justify-center {
            justify-content: center !important;
          }
          
          .justify-between {
            justify-content: space-between !important;
          }
          
          .text-center {
            text-align: center !important;
          }
          
          /* 印刷時のスペーシング最適化 */
          .space-y-6 > *:not([hidden]) ~ *:not([hidden]) {
            margin-top: 1.5rem !important;
          }
          
          .space-y-4 > *:not([hidden]) ~ *:not([hidden]) {
            margin-top: 1rem !important;
          }
          
          .space-y-3 > *:not([hidden]) ~ *:not([hidden]) {
            margin-top: 0.75rem !important;
          }
          
          /* 印刷時の追加制御 */
          .print\\:min-h-0 {
            min-height: 0 !important;
          }
          
          .print\\:bg-transparent {
            background-color: transparent !important;
          }
          
          /* 印刷時に不要な要素を完全に非表示 */
          button, .btn, [role="button"] {
            display: none !important;
          }
          
          /* 印刷時に故障報告書以外のコンテンツを非表示 */
          div:not([class*="print"]) {
            background: white !important;
          }
          
          /* 印刷時に故障報告書のコンテンツのみを確実に表示 */
          .print\\:relative {
            position: relative !important;
          }
          
          .print\\:z-10 {
            z-index: 10 !important;
          }
          
          .print\\:z-20 {
            z-index: 20 !important;
          }
          
          .print\\:fixed {
            position: fixed !important;
          }
          
          .print\\:inset-0 {
            top: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            left: 0 !important;
          }
          
          .print\\:top-0 {
            top: 0 !important;
          }
          
          .print\\:left-0 {
            left: 0 !important;
          }
          
          .print\\:w-full {
            width: 100% !important;
          }
          
          .print\\:h-auto {
            height: auto !important;
          }
          
          /* 印刷時のページ分割制御 */
          .print\\:break-inside-avoid {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          
          /* 印刷時のフォントサイズ調整 */
          h1, h2, h3, h4, h5, h6 {
            font-size: inherit !important;
            line-height: inherit !important;
            margin: 0.5em 0 !important;
          }
          
          /* 印刷時のカードスタイル最適化 */
          .card, [class*="Card"] {
            border: 1px solid #d1d5db !important;
            background: white !important;
            box-shadow: none !important;
            margin: 0.5em 0 !important;
            padding: 0.5em !important;
          }
        }
      `}</style>
    </div>
  );
};

export default MachineFailureReport;
