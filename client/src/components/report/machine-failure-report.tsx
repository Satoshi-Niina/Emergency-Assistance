import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Edit, Save, X, Printer, Image as ImageIcon } from 'lucide-react';

// 相対URLを絶対URLに変換
const toAbsUrl = (url: string): string => {
  console.log('🔄 toAbsUrl input:', url);
  if (url.startsWith('data:') || url.startsWith('http')) {
    console.log('🔄 toAbsUrl output (absolute):', url);
    return url;
  }
  const result = `${window.location.origin}${url.startsWith('/') ? url : `/${url}`}`;
  console.log('🔄 toAbsUrl output (converted):', result);
  return result;
};

// 画像を収集（base64優先、無ければ配信URLへフォールバック）
const collectImages = (data: any): Array<{ id: string; url: string; fileName: string; description?: string }> => {
  const images: Array<{ id: string; url: string; fileName: string; description?: string }> = [];
  
  // 1) conversationHistory から base64 画像を探す（最優先）
  if (data?.conversationHistory && Array.isArray(data.conversationHistory)) {
    console.log('🔍 conversationHistory から base64 画像を検索中...');
    data.conversationHistory.forEach((message: any, messageIndex: number) => {
      if (message?.content && typeof message.content === 'string' && message.content.startsWith('data:image/')) {
        // base64文字列の正規化（改行除去、全角引用符除去）
        let normalizedContent = message.content
          .replace(/\r?\n/g, '') // 改行除去
          .replace(/[""]/g, '"') // 全角引用符を半角に変換
          .trim();
        
        console.log(`🖼️ Base64 画像発見 (message ${messageIndex}):`, {
          messageId: message.id,
          contentLength: normalizedContent.length,
          startsWithData: normalizedContent.startsWith('data:image/'),
          hasNewlines: normalizedContent.includes('\n'),
          hasFullWidthQuotes: /[""]/.test(normalizedContent)
        });
        
        images.push({
          id: `base64-${messageIndex}`,
          url: normalizedContent,
          fileName: `会話画像${messageIndex + 1}`,
          description: '故障箇所画像（Base64）'
        });
      }
    });
  }
  
  // 2) savedImages から配信URLを取得（base64がない場合のフォールバック）
  if (data?.savedImages && Array.isArray(data.savedImages)) {
    console.log('🔍 savedImages found:', data.savedImages);
    data.savedImages.forEach((item: any, index: number) => {
      console.log(`🔍 savedImages[${index}] 詳細:`, {
        messageId: item.messageId,
        fileName: item.fileName,
        path: item.path,
        url: item.url,
        hasPath: !!item.path,
        hasUrl: !!item.url
      });
      
      // 優先順位: path > url
      let imageUrl: string | null = null;
      
      if (item?.path) {
        // Windows絶対パスの場合はファイル名のみを抽出
        if (item.path.includes('\\') && item.path.includes('chat-exports')) {
          const fileName = item.path.split('\\').pop();
          if (fileName) {
            imageUrl = `/api/images/chat-exports/${fileName}`;
            console.log(`🔄 Windows絶対パスを変換:`, {
              originalPath: item.path,
              fileName: fileName,
              newUrl: imageUrl
            });
          }
        }
      }
      
      // path から取得できない場合は url を使用
      if (!imageUrl && item?.url) {
        imageUrl = item.url;
        console.log(`🔄 savedImages.url を使用:`, imageUrl);
      }
      
      if (imageUrl) {
        const absoluteUrl = toAbsUrl(imageUrl);
        console.log(`🖼️ Image ${index}:`, {
          originalUrl: item.url,
          originalPath: item.path,
          convertedUrl: imageUrl,
          absoluteUrl: absoluteUrl,
          fileName: item.fileName
        });
        
        images.push({
          id: `saved-${index}`,
          url: absoluteUrl,
          fileName: item.fileName || `保存画像${index + 1}`,
          description: '故障箇所画像（配信URL）'
        });
      } else {
        console.log(`⚠️ savedImages[${index}] から画像URLを取得できませんでした:`, item);
      }
    });
  }
  
  // 3) imagePath を探す（最後のフォールバック）
  if (data?.imagePath) {
    const imagePaths = Array.isArray(data.imagePath) ? data.imagePath : [data.imagePath];
    imagePaths.forEach((path: string, index: number) => {
      if (path) {
        images.push({
          id: `path-${index}`,
          url: toAbsUrl(path),
          fileName: `画像${index + 1}`,
          description: '故障箇所画像（パス）'
        });
      }
    });
  }
  
  console.log(`📊 画像収集完了: ${images.length}個の画像を発見`, {
    base64Count: images.filter(img => img.url.startsWith('data:image/')).length,
    urlCount: images.filter(img => !img.url.startsWith('data:image/')).length,
    images: images.map(img => ({ id: img.id, type: img.url.startsWith('data:image/') ? 'base64' : 'url', fileName: img.fileName }))
  });
  
  return images;
};

interface MachineFailureReportData {
  reportId?: string;
  machineType?: string;
  machineNumber?: string;
  date?: string;
  location?: string;
  description?: string;
  status?: string;
  engineer?: string;
  notes?: string;
  repairSchedule?: string;
  repairLocation?: string;
  repairRequestDate?: string;
  images?: Array<{
    id: string;
    url: string;
    fileName: string;
    description?: string;
  }>;
  // エクスポートJSONファイルの生データフィールド
  savedImages?: Array<{
    messageId: number;
    fileName: string;
    path: string;
    url: string;
  }>;
  conversationHistory?: any[];
  originalChatData?: any;
  [key: string]: any; // その他のフィールドも許可
}

interface MachineFailureReportProps {
  data: MachineFailureReportData;
  onClose: () => void;
  onSave?: (reportData: MachineFailureReportData) => void;
}

// 画像取得の共通関数（編集対象ファイル内のみで完結）
function pickFirstImage(data: any): string | null {
  // 1) 直下 or ネスト配列に dataURL があれば優先
  const dig = (v:any): string | null => {
    if (!v) return null;
    if (typeof v === 'string' && v.startsWith('data:image/')) return v;
    if (Array.isArray(v)) for (const x of v) { const r = dig(x); if (r) return r; }
    if (typeof v === 'object') for (const k of Object.keys(v)) { const r = dig(v[k]); if (r) return r; }
    return null;
  };
  const fromDataUrl = dig(data);
  if (fromDataUrl) return fromDataUrl;

  // 2) savedImages
  const saved = data?.savedImages;
  if (Array.isArray(saved) && saved[0]) return saved[0];

  // 3) imagePath(URL)
  if (typeof data?.imagePath === 'string') return data.imagePath;

  return null;
}

// 印刷用CSS
const PRINT_STYLES = `
<style>
  @page { size: A4 portrait; margin: 10mm; }
  @media print {
    html, body { margin: 0; padding: 0; }
    .no-print, .print:hidden { display: none !important; }
    img, .image-cell, .image-section { page-break-inside: avoid; break-inside: avoid; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th, td { border: 1px solid #ccc; padding: 4px; vertical-align: top; }
  }
  /* 画面プレビュー用：印刷専用ウィンドウでは最小限でOK */
  img.thumb { width: 32px; height: 32px; object-fit: cover; border: 1px solid #ddd; border-radius: 4px; }
  .report-img { max-width: 100%; height: auto; }
</style>
`;

// 個票印刷用HTML生成（現在のUIフォーマットと完全に同じ）
const generateReportPrintHTML = (reportData: any, images: Array<{ id: string; url: string; fileName: string; description?: string }>): string => {
  const imageSection = images && images.length > 0 
    ? `<div class="image-section">
         <h3>故障箇所画像</h3>
         ${images.map((image, index) => `
           <div class="image-item" style="margin-bottom: 15px; page-break-inside: avoid;">
             <img class="report-img" src="${image.url}" alt="故障画像${index + 1}" style="max-width: 100%; max-height: 150px; border: 1px solid #ccc; border-radius: 3px; object-fit: contain;" />
             <p style="text-align: center; margin-top: 5px; font-size: 8pt; color: #666;">${image.fileName}</p>
           </div>
         `).join('')}
       </div>`
    : '';

  return `
    <!doctype html>
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
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 2px solid #333;
        }
        
        .header h1 {
          font-size: 16pt;
          font-weight: bold;
          margin-bottom: 8px;
        }
        
        .header p {
          font-size: 8pt;
          color: #666;
        }
        
        .section {
          margin-bottom: 15px;
          page-break-inside: avoid;
        }
        
        .section h2 {
          font-size: 11pt;
          font-weight: bold;
          color: #333;
          border-bottom: 1px solid #ccc;
          padding-bottom: 4px;
          margin-bottom: 8px;
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 10px;
        }
        
        .info-item {
          padding: 6px;
          background-color: #f8f8f8;
          border: 1px solid #ddd;
          border-radius: 3px;
        }
        
        .info-item strong {
          display: block;
          font-size: 8pt;
          color: #333;
          margin-bottom: 2px;
        }
        
        .info-item span {
          font-size: 8pt;
          color: #000;
        }
        
        .content-box {
          background-color: #f8f8f8;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 3px;
          margin-top: 6px;
        }
        
        .content-box p {
          font-size: 8pt;
          line-height: 1.3;
          margin: 0;
        }
        
        .image-section {
          text-align: center;
          margin: 12px 0;
          page-break-inside: avoid;
        }
        
        .image-section h3 {
          font-size: 10pt;
          margin-bottom: 8px;
        }
        
        .footer {
          text-align: center;
          margin-top: 15px;
          padding-top: 10px;
          border-top: 1px solid #ccc;
          font-size: 7pt;
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
              <span>${reportData.reportId || reportData.id || '-'}</span>
            </div>
            <div class="info-item">
              <strong>機種</strong>
              <span>${reportData.machineType || reportData.machineTypeName || '-'}</span>
            </div>
            <div class="info-item">
              <strong>機械番号</strong>
              <span>${reportData.machineNumber || '-'}</span>
            </div>
            <div class="info-item">
              <strong>日付</strong>
              <span>${reportData.date || reportData.timestamp || reportData.createdAt ? new Date(reportData.createdAt).toLocaleDateString('ja-JP') : '-'}</span>
            </div>
            <div class="info-item">
              <strong>場所</strong>
              <span>${reportData.location || '-'}</span>
            </div>
          </div>
      </div>

        <div class="section">
          <h2>故障詳細</h2>
          <div class="info-grid">
            <div class="info-item">
              <strong>ステータス</strong>
              <span>${reportData.status || '-'}</span>
            </div>
            <div class="info-item">
              <strong>責任者</strong>
              <span>${reportData.engineer || '-'}</span>
            </div>
      </div>

          <div class="content-box">
            <strong>説明</strong>
            <p>${reportData.problemDescription || reportData.description || reportData.incidentTitle || reportData.title || '説明なし'}</p>
          </div>

          <div class="content-box">
            <strong>備考</strong>
        <p>${reportData.notes || '-'}</p>
          </div>
      </div>

        ${imageSection}
        
        <div class="section">
          <h2>修繕予定</h2>
          <div class="info-grid">
            <div class="info-item">
              <strong>依頼月日</strong>
              <span>${reportData.requestDate || '-'}</span>
            </div>
            <div class="info-item">
              <strong>予定月日</strong>
              <span>${reportData.repairSchedule || '-'}</span>
            </div>
            <div class="info-item">
              <strong>場所</strong>
              <span>${reportData.repairLocation || '-'}</span>
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

// 個票印刷実行
const printReport = (reportData: any, images: Array<{ id: string; url: string; fileName: string; description?: string }>) => {
  const w = window.open('', '_blank', 'noopener,noreferrer');
  if (!w) return;
  
  const contentHTML = generateReportPrintHTML(reportData, images);
  w.document.write(contentHTML);
  w.document.close();
  
  // 印刷ダイアログを表示
  setTimeout(() => {
    w.print();
  }, 100);
};

const MachineFailureReport: React.FC<MachineFailureReportProps> = ({ 
  data, 
  onClose, 
  onSave
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<MachineFailureReportData>(data);

  // データが変更された場合、編集データも更新
  useEffect(() => {
    setEditedData(data);
  }, [data]);

  // isEditingの状態変化を監視
  useEffect(() => {
    console.log('🔧 isEditing state changed:', isEditing);
  }, [isEditing]);

  const handleEdit = () => {
    console.log('🔧 handleEdit called');
    console.log('🔧 Current isEditing state:', isEditing);
    setIsEditing(true);
    console.log('🔧 setIsEditing(true) called');
  };

  const handleSave = () => {
    // 編集されたデータを元のデータに反映
    const updatedData = { ...data, ...editedData };
    
    // 親コンポーネントに更新されたデータを渡す
    if (onSave) {
      onSave(updatedData);
    }
    
    // サーバーに更新リクエストを送信
    updateReportOnServer(updatedData);
    
    // 編集モードを終了
    setIsEditing(false);
    
    // 成功メッセージを表示
    alert('レポートが保存されました。');
  };

  // サーバーにレポートデータを更新
  const updateReportOnServer = async (updatedData: MachineFailureReportData) => {
    try {
      // 元のデータからIDを取得（data.idまたはdata.reportIdから）
      const reportId = data.id || data.reportId;
      
      if (!reportId) {
        console.warn('レポートIDが見つからないため、サーバー更新をスキップします');
        return;
      }
      
      const response = await fetch(`/api/history/update-item/${reportId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          updatedData: {
            // レポートデータを元のJSONファイルの形式に変換
            machineType: updatedData.machineType,
            machineNumber: updatedData.machineNumber,
            description: updatedData.description,
            status: updatedData.status,
            engineer: updatedData.engineer,
            notes: updatedData.notes,
            repairRequestDate: updatedData.repairRequestDate,
            repairSchedule: updatedData.repairSchedule,
            repairLocation: updatedData.repairLocation,
            // レポート固有のデータも保存
            reportData: updatedData,
            lastUpdated: new Date().toISOString()
          },
          updatedBy: 'user'
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'レポートの更新に失敗しました');
      }
      
      const result = await response.json();
      console.log('レポート更新完了:', result);
      
    } catch (error) {
      console.error('レポート更新エラー:', error);
      // エラーが発生してもユーザーには通知しない（ローカル保存は成功しているため）
    }
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

  const currentData = isEditing ? editedData : data;
  const collectedImages = collectImages(currentData);

  const handlePrint = () => {
    // 現在のUIフォーマットと同じレイアウトで印刷
    const w = window.open('', '_blank', 'noopener,noreferrer');
    if (!w) return;
    
    // 現在のUIフォーマットをそのまま印刷用HTMLに変換
    const printHTML = `
      <!doctype html>
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
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #333;
          }
          
          .header h1 {
            font-size: 16pt;
            font-weight: bold;
            margin-bottom: 8px;
          }
          
          .header p {
            font-size: 8pt;
            color: #666;
          }
          
          .section {
            margin-bottom: 15px;
            page-break-inside: avoid;
          }
          
          .section h2 {
            font-size: 11pt;
            font-weight: bold;
            color: #333;
            border-bottom: 1px solid #ccc;
            padding-bottom: 4px;
            margin-bottom: 8px;
          }
          
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 10px;
          }
          
          .info-item {
            padding: 6px;
            background-color: #f8f8f8;
            border: 1px solid #ddd;
            border-radius: 3px;
          }
          
          .info-item strong {
            display: block;
            font-size: 8pt;
            color: #333;
            margin-bottom: 2px;
          }
          
          .info-item span {
            font-size: 8pt;
            color: #000;
          }
          
          .content-box {
            background-color: #f8f8f8;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 3px;
            margin-top: 6px;
          }
          
          .content-box p {
            font-size: 8pt;
            line-height: 1.3;
            margin: 0;
          }
          
          .image-section {
            text-align: center;
            margin: 12px 0;
            page-break-inside: avoid;
          }
          
          .image-section h3 {
            font-size: 10pt;
            margin-bottom: 8px;
          }
          
          .footer {
            text-align: center;
            margin-top: 15px;
            padding-top: 10px;
            border-top: 1px solid #ccc;
            font-size: 7pt;
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
                <span>${currentData.reportId || currentData.id || '-'}</span>
              </div>
              <div class="info-item">
                <strong>機種</strong>
                <span>${currentData.machineType || currentData.machineTypeName || '-'}</span>
              </div>
              <div class="info-item">
                <strong>機械番号</strong>
                <span>${currentData.machineNumber || '-'}</span>
              </div>
              <div class="info-item">
                <strong>日付</strong>
                <span>${currentData.date || currentData.timestamp || currentData.createdAt ? new Date(currentData.createdAt).toLocaleDateString('ja-JP') : '-'}</span>
              </div>
              <div class="info-item">
                <strong>場所</strong>
                <span>${currentData.location || '-'}</span>
              </div>
            </div>
          </div>
          
          <div class="section">
            <h2>故障詳細</h2>
            <div class="info-grid">
              <div class="info-item">
                <strong>ステータス</strong>
                <span>${currentData.status || '-'}</span>
              </div>
              <div class="info-item">
                <strong>責任者</strong>
                <span>${currentData.engineer || '-'}</span>
              </div>
            </div>
            
            <div class="content-box">
              <strong>説明</strong>
              <p>${currentData.problemDescription || currentData.description || currentData.incidentTitle || currentData.title || '説明なし'}</p>
            </div>
            
            <div class="content-box">
              <strong>備考</strong>
              <p>${currentData.notes || '-'}</p>
            </div>
          </div>
          
          ${collectedImages && collectedImages.length > 0 ? `
            <div class="image-section">
              <h3>故障箇所画像</h3>
              ${collectedImages.map((image, index) => `
                <div class="image-item" style="margin-bottom: 15px; page-break-inside: avoid;">
                  <img class="report-img" src="${image.url}" alt="故障画像${index + 1}" style="max-width: 100%; max-height: 150px; border: 1px solid #ccc; border-radius: 3px; object-fit: contain;" />
                  <p style="text-align: center; margin-top: 5px; font-size: 8pt; color: #666;">${image.fileName}</p>
                </div>
              `).join('')}
            </div>
          ` : ''}
          
          <div class="section">
            <h2>修繕予定</h2>
            <div class="info-grid">
              <div class="info-item">
                <strong>依頼月日</strong>
                <span>${currentData.requestDate || '-'}</span>
              </div>
              <div class="info-item">
                <strong>予定月日</strong>
                <span>${currentData.repairSchedule || '-'}</span>
              </div>
              <div class="info-item">
                <strong>場所</strong>
                <span>${currentData.repairLocation || '-'}</span>
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
    
    w.document.write(printHTML);
    w.document.close();
    
    // 印刷ダイアログを表示
    setTimeout(() => {
      w.print();
    }, 100);
  };

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
                  <Button 
                    onClick={() => {
                      console.log('🔧 Edit button clicked!');
                      handleEdit();
                    }} 
                    variant="outline" 
                    className="flex items-center gap-2"
                  >
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
                        value={currentData.machineType || currentData.originalChatData?.machineInfo?.machineTypeName || ''}
                        onChange={(e) => handleInputChange('machineType', e.target.value)}
                        className="w-48 text-left print:hidden"
                        placeholder="例: MC300"
                      />
                    ) : (
                      <span className="text-gray-900">{currentData.machineType || currentData.originalChatData?.machineInfo?.machineTypeName || '未設定'}</span>
                    )}
                    {/* 印刷時用の表示（編集モード時は非表示） */}
                    {isEditing && (
                      <span className="text-gray-900 print:block hidden">{currentData.machineType || currentData.originalChatData?.machineInfo?.machineTypeName || '未設定'}</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">機械番号:</span>
                    {isEditing ? (
                      <Input
                        value={currentData.machineNumber || currentData.originalChatData?.machineInfo?.machineNumber || ''}
                        onChange={(e) => handleInputChange('machineNumber', e.target.value)}
                        className="w-48 text-left print:hidden"
                        placeholder="例: 200"
                      />
                    ) : (
                      <span className="text-gray-900">{currentData.machineNumber || currentData.originalChatData?.machineInfo?.machineNumber || '未設定'}</span>
                    )}
                    {/* 印刷時用の表示（編集モード時は非表示） */}
                    {isEditing && (
                      <span className="text-gray-900 print:block hidden">{currentData.machineNumber || currentData.originalChatData?.machineInfo?.machineNumber || '未設定'}</span>
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
                        value={currentData.description || currentData.problemDescription || ''}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        className="w-full h-24 print:hidden"
                        rows={4}
                        placeholder="故障の詳細な説明を入力してください"
                      />
                    ) : (
                      <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded border print:bg-white">{currentData.description || currentData.problemDescription || '説明なし'}</p>
                    )}
                    {/* 印刷時用の表示（編集モード時は非表示） */}
                    {isEditing && (
                      <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded border print:bg-white print:block hidden">{currentData.description || currentData.problemDescription || '説明なし'}</p>
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
              {collectedImages && collectedImages.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 print:gap-3">
                  {collectedImages.map((image, index) => (
                    <div key={image.id} className="border rounded-lg p-3 print:break-inside-avoid print:p-2 print:bg-white">
                      {console.log(`🖼️ 画像表示 [${index}]:`, {
                        id: image.id,
                        url: image.url.substring(0, 100) + '...',
                        fileName: image.fileName,
                        description: image.description,
                        isBase64: image.url.startsWith('data:image/'),
                        urlLength: image.url.length
                      })}
                      <img
                        src={image.url}
                        alt={`故障箇所画像 ${index + 1}`}
                        className="w-full h-40 object-cover rounded-lg mb-2 print:h-32 print:mb-1"
                        crossOrigin="anonymous"
                        onError={(e) => {
                          console.log('❌ 画像読み込みエラー:', {
                            imageId: image.id,
                            url: image.url.substring(0, 100) + '...',
                            fileName: image.fileName,
                            error: e
                          });
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const errorDiv = target.nextElementSibling as HTMLElement;
                          if (errorDiv) {
                            errorDiv.style.display = 'block';
                          }
                        }}
                        onLoad={() => {
                          console.log('✅ 画像読み込み成功:', {
                            imageId: image.id,
                            url: image.url.substring(0, 100) + '...',
                            fileName: image.fileName,
                            isBase64: image.url.startsWith('data:image/')
                          });
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
      <style>{`
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
