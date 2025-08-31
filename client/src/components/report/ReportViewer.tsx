// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Printer, 
  Save, 
  Edit, 
  X, 
  ImageIcon,
  FileText,
  Calendar,
  Wrench,
  AlertTriangle
} from 'lucide-react';

interface ReportViewerProps {
  reportData: any;
  onClose: () => void;
  onSave?: (data: any) => void;
}

const ReportViewer: React.FC<ReportViewerProps> = ({ 
  reportData, 
  onClose, 
  onSave 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState(reportData);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    console.log('ReportViewer: reportData変更検知:', {
      id: reportData?.id,
      hasReportData: !!reportData,
      reportDataKeys: reportData ? Object.keys(reportData) : [],
      imageUrl: reportData?.imageUrl ? 'あり' : 'なし',
      conversationHistory: reportData?.conversationHistory?.length || 0,
      chatData: reportData?.chatData?.messages?.length || 0
    });
    
    // 画像URLを抽出
    extractImageUrl();
  }, [reportData]);

  const extractImageUrl = () => {
    let foundImageUrl = null;
    
    console.log('ReportViewer: 画像抽出開始', {
      hasReportData: !!reportData,
      reportDataKeys: reportData ? Object.keys(reportData) : [],
      conversationHistory: reportData?.conversationHistory?.length || 0,
      originalChatData: reportData?.originalChatData?.messages?.length || 0,
      chatData: reportData?.chatData?.messages?.length || 0,
      savedImages: reportData?.savedImages?.length || 0
    });

    // 優先順位1: 直接設定された画像URL
    if (reportData?.imageUrl) {
      foundImageUrl = reportData.imageUrl;
      console.log('ReportViewer: 直接設定された画像URLを使用:', foundImageUrl.substring(0, 100) + '...');
    }

    // 優先順位2: conversationHistoryからBase64画像を取得
    if (!foundImageUrl && reportData?.conversationHistory && reportData.conversationHistory.length > 0) {
      const imageMessage = reportData.conversationHistory.find((msg: any) => 
        msg.content && msg.content.startsWith('data:image/')
      );
      if (imageMessage) {
        foundImageUrl = imageMessage.content;
        console.log('ReportViewer: conversationHistoryから画像を取得');
      }
    }

    // 優先順位3: originalChatData.messagesからBase64画像を取得
    if (!foundImageUrl && reportData?.originalChatData?.messages) {
      const imageMessage = reportData.originalChatData.messages.find((msg: any) => 
        msg.content && msg.content.startsWith('data:image/')
      );
      if (imageMessage) {
        foundImageUrl = imageMessage.content;
        console.log('ReportViewer: originalChatDataから画像を取得');
      }
    }

    // 優先順位4: chatData.messagesからBase64画像を取得
    if (!foundImageUrl && reportData?.chatData?.messages) {
      const imageMessage = reportData.chatData.messages.find((msg: any) => 
        msg.content && msg.content.startsWith('data:image/')
      );
      if (imageMessage) {
        foundImageUrl = imageMessage.content;
        console.log('ReportViewer: chatDataから画像を取得');
      }
    }

    // 優先順位5: savedImagesから画像を取得
    if (!foundImageUrl && reportData?.savedImages && reportData.savedImages.length > 0) {
      foundImageUrl = reportData.savedImages[0].url;
      console.log('ReportViewer: savedImagesから画像を取得');
    }

    // 優先順位6: messagesフィールドからBase64画像を検索
    if (!foundImageUrl && reportData?.messages && Array.isArray(reportData.messages)) {
      const imageMessage = reportData.messages.find((msg: any) => 
        msg.content && msg.content.startsWith('data:image/')
      );
      if (imageMessage) {
        foundImageUrl = imageMessage.content;
        console.log('ReportViewer: messagesフィールドから画像を取得');
      }
    }

    console.log('ReportViewer: 最終的な画像URL:', foundImageUrl ? foundImageUrl.substring(0, 100) + '...' : 'なし');
    setImageUrl(foundImageUrl);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    if (onSave) {
      onSave(editedData);
    }
    setIsEditing(false);
  };

  // ファイルに差分で上書き保存
  const handleSaveToFile = async () => {
    try {
      const data = isEditing ? editedData : reportData;
      
      // 保存用のデータを準備
      const saveData = {
        id: data.id,
        reportId: data.reportId,
        machineId: data.machineId,
        machineNumber: data.machineNumber,
        machineType: data.machineType,
        machineTypeName: data.machineTypeName,
        date: data.date,
        timestamp: data.timestamp,
        createdAt: data.createdAt,
        location: data.location,
        failureCode: data.failureCode,
        status: data.status,
        engineer: data.engineer,
        problemDescription: data.problemDescription,
        description: data.description,
        incidentTitle: data.incidentTitle,
        notes: data.notes,
        extractedComponents: data.extractedComponents,
        extractedSymptoms: data.extractedSymptoms,
        possibleModels: data.possibleModels,
        repairSchedule: data.repairSchedule,
        repairLocation: data.repairLocation,
        requestDate: data.requestDate,
        // チャット履歴データ
        conversationHistory: data.conversationHistory,
        originalChatData: data.originalChatData,
        chatData: data.chatData,
        messages: data.messages,
        // 保存された画像
        savedImages: data.savedImages,
        // 直接画像URL
        imageUrl: data.imageUrl,
        // 更新日時
        updatedAt: new Date().toISOString()
      };

      // 既存のファイルデータを取得
      const existingData = localStorage.getItem(`report_${data.id}`);
      let existingReport = null;
      
      if (existingData) {
        try {
          existingReport = JSON.parse(existingData);
        } catch (e) {
          console.warn('既存データの解析に失敗:', e);
        }
      }

      // 差分を検出して上書き
      const mergedData = existingReport ? { ...existingReport, ...saveData } : saveData;
      
      // ローカルストレージに保存
      localStorage.setItem(`report_${data.id}`, JSON.stringify(mergedData));
      
      // サーバーにも保存を試行（APIが利用可能な場合）
      try {
        const response = await fetch('/api/reports/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(mergedData),
        });
        
        if (response.ok) {
          console.log('サーバーへの保存が完了しました');
        } else {
          console.warn('サーバーへの保存に失敗しましたが、ローカルには保存されました');
        }
      } catch (error) {
        console.warn('サーバーへの保存に失敗しましたが、ローカルには保存されました:', error);
      }

      alert('レポートが保存されました。');
      console.log('レポート保存完了:', mergedData);
      
    } catch (error) {
      console.error('レポート保存中にエラーが発生しました:', error);
      alert('レポートの保存に失敗しました: ' + error.message);
    }
  };

  const handleCancel = () => {
    setEditedData(reportData);
    setIsEditing(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setEditedData(prev => ({
      ...prev,
      [field]: value
    }));
  };



  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    const htmlContent = generatePrintHTML();
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // 印刷ダイアログを表示
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  // 印刷用HTML生成（現在のレポートデータを使用）
  const generatePrintHTML = (): string => {
    const data = isEditing ? editedData : reportData;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>機械故障報告書 - 印刷</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 15mm;
          }
          
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          
          body {
            font-family: 'MS Gothic', 'Yu Gothic', 'Hiragino Sans', sans-serif;
            font-size: 10pt;
            line-height: 1.4;
            color: #000;
            background: white;
            max-width: 100%;
            overflow-x: hidden;
          }
          
          .container {
            max-width: 100%;
            padding: 0;
          }
          
          .header {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #333;
          }
          
          .header h1 {
            font-size: 18pt;
            font-weight: bold;
            margin-bottom: 10px;
          }
          
          .header p {
            font-size: 9pt;
            color: #666;
          }
          
          .section {
            margin-bottom: 20px;
            page-break-inside: avoid;
          }
          
          .section h2 {
            font-size: 12pt;
            font-weight: bold;
            color: #333;
            border-bottom: 1px solid #ccc;
            padding-bottom: 5px;
            margin-bottom: 10px;
          }
          
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 15px;
          }
          
          .info-item {
            padding: 8px;
            background-color: #f8f8f8;
            border: 1px solid #ddd;
            border-radius: 3px;
          }
          
          .info-item strong {
            display: block;
            font-size: 9pt;
            color: #333;
            margin-bottom: 3px;
          }
          
          .info-item span {
            font-size: 9pt;
            color: #000;
          }
          
          .content-box {
            background-color: #f8f8f8;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 3px;
            margin-top: 8px;
          }
          
          .content-box p {
            font-size: 9pt;
            line-height: 1.3;
            margin: 0;
          }
          
          .image-section {
            text-align: center;
            margin: 15px 0;
            page-break-inside: avoid;
          }
          
          .image-section img {
            max-width: 100%;
            max-height: 200px;
            border: 1px solid #ccc;
            border-radius: 3px;
            object-fit: contain;
          }
          
          .image-section p {
            font-size: 8pt;
            color: #666;
            margin-top: 5px;
          }
          
          .footer {
            text-align: center;
            margin-top: 20px;
            padding-top: 15px;
            border-top: 1px solid #ccc;
            font-size: 8pt;
            color: #666;
          }
          
          @media print {
            body { margin: 0; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>機械故障報告書</h1>
            <p>印刷日時: ${new Date().toLocaleString('ja-JP')}</p>
          </div>
          
          <div class="section">
            <h2>報告概要</h2>
            <div class="info-grid">
              <div class="info-item">
                <strong>報告書ID</strong>
                <span>${data.reportId || data.id || '-'}</span>
              </div>
              <div class="info-item">
                <strong>機種</strong>
                <span>${data.machineType || data.machineTypeName || '-'}</span>
              </div>
              <div class="info-item">
                <strong>機械番号</strong>
                <span>${data.machineNumber || '-'}</span>
              </div>
              <div class="info-item">
                <strong>日付</strong>
                <span>${data.date || data.timestamp || data.createdAt ? new Date(data.createdAt).toLocaleDateString('ja-JP') : '-'}</span>
              </div>
              <div class="info-item">
                <strong>場所</strong>
                <span>${data.location || '-'}</span>
              </div>
            </div>
          </div>
          
          <div class="section">
            <h2>故障詳細</h2>
            <div class="info-grid">
              <div class="info-item">
                <strong>故障コード</strong>
                <span>${data.failureCode || '-'}</span>
              </div>
              <div class="info-item">
                <strong>ステータス</strong>
                <span>${data.status || '-'}</span>
              </div>
              <div class="info-item">
                <strong>責任者</strong>
                <span>${data.engineer || '-'}</span>
              </div>
            </div>
            
            <div class="content-box">
              <strong>説明</strong>
              <p>${data.problemDescription || data.description || data.incidentTitle || '-'}</p>
            </div>
            
            <div class="content-box">
              <strong>備考</strong>
              <p>${data.notes || '-'}</p>
            </div>
          </div>
          
          ${imageUrl ? `
          <div class="section">
            <h2>故障箇所画像</h2>
            <div class="image-section">
              <img src="${imageUrl}" alt="故障箇所画像" />
              <p>上記は故障箇所の写真です。</p>
            </div>
          </div>
          ` : ''}
          
          <div class="section">
            <h2>抽出情報</h2>
            <div class="info-grid">
              <div class="info-item">
                <strong>影響コンポーネント</strong>
                <span>${(data.extractedComponents || []).join(', ') || '-'}</span>
              </div>
              <div class="info-item">
                <strong>症状</strong>
                <span>${(data.extractedSymptoms || []).join(', ') || '-'}</span>
              </div>
              <div class="info-item">
                <strong>可能性のある機種</strong>
                <span>${(data.possibleModels || []).join(', ') || '-'}</span>
              </div>
            </div>
          </div>
          
          <div class="section">
            <h2>修繕予定</h2>
            <div class="info-grid">
              <div class="info-item">
                <strong>依頼月日</strong>
                <span>${data.requestDate || '-'}</span>
              </div>
              <div class="info-item">
                <strong>予定月日</strong>
                <span>${data.repairSchedule || '-'}</span>
              </div>
              <div class="info-item">
                <strong>場所</strong>
                <span>${data.repairLocation || '-'}</span>
              </div>
            </div>
          </div>
          
          <div class="footer">
            <p>© 2025 機械故障報告書. All rights reserved.</p>
          </div>
        </div>
        
        <div class="no-print" style="position: fixed; top: 20px; right: 20px; z-index: 1000;">
          <button onclick="window.print()" style="padding: 10px 20px; margin: 5px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">印刷</button>
          <button onclick="window.close()" style="padding: 10px 20px; margin: 5px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer;">閉じる</button>
        </div>
      </body>
      </html>
    `;
  };

  const handleDownload = () => {
    const data = isEditing ? editedData : reportData;
    const content = `
報告書

事象概要:
事象タイトル: ${data.incidentTitle || data.problemDescription || '-'}
報告書ID: ${data.reportId || data.id || '-'}
機械ID: ${data.machineId || data.machineNumber || '-'}
日付: ${data.date || data.timestamp || data.createdAt ? new Date(data.createdAt).toLocaleDateString('ja-JP') : '-'}
場所: ${data.location || '-'}
故障コード: ${data.failureCode || '-'}

事象詳細:
説明: ${data.problemDescription || data.description || '-'}
ステータス: ${data.status || '-'}
担当エンジニア: ${data.engineer || '-'}
備考: ${data.notes || '-'}

抽出情報:
影響コンポーネント: ${(data.extractedComponents || []).join(', ')}
症状: ${(data.extractedSymptoms || []).join(', ')}
可能性のある機種: ${(data.possibleModels || []).join(', ')}

修繕予定:
予定月日: ${data.repairSchedule || '-'}
場所: ${data.repairLocation || '-'}

チャット履歴:
${(data.conversationHistory || data.chatData?.messages || []).map((msg: any) => 
  `${msg.isAiResponse ? 'AI' : 'ユーザー'}: ${msg.content}`
).join('\n')}
    `;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `報告書_${data.incidentTitle || data.id}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const data = isEditing ? editedData : reportData;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="flex justify-between items-center p-6 border-b">
          <h1 className="text-2xl font-bold">報告書ビューアー</h1>
          <div className="flex gap-2">
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
                <Button onClick={handleSaveToFile} variant="outline" className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  保存
                </Button>
              </>
            ) : (
              <>
                <Button onClick={handleSave} className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  保存
                </Button>
                <Button onClick={handleCancel} variant="outline">
                  キャンセル
                </Button>
              </>
            )}
            <Button onClick={onClose} variant="ghost" size="sm">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="p-6 space-y-6">
          {/* 報告概要 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                報告概要
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>報告書ID</Label>
                  {isEditing ? (
                    <Input
                      value={data.reportId || data.id || ''}
                      onChange={(e) => handleInputChange('reportId', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm text-gray-600">{data.reportId || data.id || '-'}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>機種</Label>
                  {isEditing ? (
                    <Input
                      value={data.machineType || data.machineTypeName || ''}
                      onChange={(e) => handleInputChange('machineType', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm text-gray-600">{data.machineType || data.machineTypeName || '-'}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>機械番号</Label>
                  {isEditing ? (
                    <Input
                      value={data.machineNumber || ''}
                      onChange={(e) => handleInputChange('machineNumber', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm text-gray-600">{data.machineNumber || '-'}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>日付</Label>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={data.date || data.timestamp || (data.createdAt ? new Date(data.createdAt).toISOString().split('T')[0] : '')}
                      onChange={(e) => handleInputChange('date', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm text-gray-600">
                      {data.date || data.timestamp || (data.createdAt ? new Date(data.createdAt).toLocaleDateString('ja-JP') : '-')}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>場所</Label>
                  {isEditing ? (
                    <Input
                      value={data.location || ''}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm text-gray-600">{data.location || '-'}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 故障詳細 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                故障詳細
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>説明</Label>
                {isEditing ? (
                  <Textarea
                    value={data.problemDescription || data.description || data.incidentTitle || ''}
                    onChange={(e) => handleInputChange('problemDescription', e.target.value)}
                    rows={3}
                    placeholder="説明なし"
                  />
                ) : (
                  <p className="text-sm text-gray-600">
                    {data.problemDescription || data.description || data.incidentTitle || '説明なし'}
                  </p>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ステータス</Label>
                  {isEditing ? (
                    <Input
                      value={data.status || ''}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm text-gray-600">{data.status || '-'}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>責任者</Label>
                  {isEditing ? (
                    <Input
                      value={data.engineer || ''}
                      onChange={(e) => handleInputChange('engineer', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm text-gray-600">{data.engineer || '-'}</p>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>備考</Label>
                {isEditing ? (
                  <Textarea
                    value={data.notes || ''}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    rows={3}
                    placeholder="備考を入力してください"
                  />
                ) : (
                  <p className="text-sm text-gray-600">{data.notes || '-'}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 画像セクション */}
          {imageUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  故障箇所画像
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">画像URL情報:</p>
                    <p className="text-xs text-gray-500 break-all">
                      {imageUrl.startsWith('data:image/') 
                        ? `Base64画像 (${imageUrl.length}文字)`
                        : `URL: ${imageUrl.substring(0, 100)}...`
                      }
                    </p>
                  </div>
                  <img
                    src={imageUrl}
                    alt="故障箇所画像"
                    className="max-w-full max-h-96 object-contain border rounded-lg"
                    onError={(e) => {
                      console.error('画像読み込みエラー:', e);
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      // エラーメッセージを表示
                      const errorDiv = document.createElement('div');
                      errorDiv.className = 'text-red-500 text-sm mt-2';
                      errorDiv.textContent = '画像の読み込みに失敗しました';
                      target.parentNode?.appendChild(errorDiv);
                    }}
                    onLoad={() => {
                      console.log('画像読み込み成功:', {
                        src: imageUrl.substring(0, 100) + '...',
                        naturalWidth: (e.target as HTMLImageElement).naturalWidth,
                        naturalHeight: (e.target as HTMLImageElement).naturalHeight
                      });
                    }}
                  />
                  <p className="text-sm text-gray-500 mt-2">上記は故障箇所の写真です。</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 抽出情報 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                抽出情報
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>影響コンポーネント</Label>
                  {isEditing ? (
                    <Input
                      value={(data.extractedComponents || []).join(', ')}
                      onChange={(e) => handleInputChange('extractedComponents', e.target.value.split(',').map(s => s.trim()))}
                      placeholder="カンマ区切りで入力"
                    />
                  ) : (
                    <p className="text-sm text-gray-600">
                      {(data.extractedComponents || []).join(', ') || '-'}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>症状</Label>
                  {isEditing ? (
                    <Input
                      value={(data.extractedSymptoms || []).join(', ')}
                      onChange={(e) => handleInputChange('extractedSymptoms', e.target.value.split(',').map(s => s.trim()))}
                      placeholder="カンマ区切りで入力"
                    />
                  ) : (
                    <p className="text-sm text-gray-600">
                      {(data.extractedSymptoms || []).join(', ') || '-'}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>可能性のある機種</Label>
                  {isEditing ? (
                    <Input
                      value={(data.possibleModels || []).join(', ')}
                      onChange={(e) => handleInputChange('possibleModels', e.target.value.split(',').map(s => s.trim()))}
                      placeholder="カンマ区切りで入力"
                    />
                  ) : (
                    <p className="text-sm text-gray-600">
                      {(data.possibleModels || []).join(', ') || '-'}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 修繕予定 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                修繕予定
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>依頼月日</Label>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={data.requestDate || ''}
                      onChange={(e) => handleInputChange('requestDate', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm text-gray-600">{data.requestDate || '-'}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>予定月日</Label>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={data.repairSchedule || ''}
                      onChange={(e) => handleInputChange('repairSchedule', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm text-gray-600">{data.repairSchedule || '-'}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>場所</Label>
                  {isEditing ? (
                    <Input
                      value={data.repairLocation || ''}
                      onChange={(e) => handleInputChange('repairLocation', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm text-gray-600">{data.repairLocation || '-'}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 備考 */}
          <Card>
            <CardHeader>
              <CardTitle>備考</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  value={data.notes || ''}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                  placeholder="備考を入力してください"
                />
              ) : (
                <p className="text-sm text-gray-600">{data.notes || '-'}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ReportViewer;
