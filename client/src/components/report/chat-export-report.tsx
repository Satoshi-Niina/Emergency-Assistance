// 仮の型定義（必要に応じて詳細化）
type ReportData = any;
import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import {
  Calendar,
  User,
  MessageSquare,
  Image as ImageIcon,
  Edit,
  Save,
  X,
  Download,
  Printer,
} from 'lucide-react';

// 画像ユーティリティ関数（exportして他のコンポーネントでも使用可能）
const API_BASE = import.meta.env.DEV
  ? ''
  : import.meta.env.VITE_API_BASE_URL || window.location.origin;

export const toAbsUrl = (u?: string | null) => {
  if (!u) return null;
  if (/^data:image\//.test(u)) return u;
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith('/api/')) return API_BASE + u; // DEVは''でプロキシ経由
  return new URL(u, window.location.origin).toString();
};

export const getImageSrc = (data: any): string | null => {
  // 1) JSON 全体から data:image を再帰探索
  const stack = [data];
  while (stack.length) {
    const v = stack.pop();
    if (v == null) continue;
    if (typeof v === 'string' && v.startsWith('data:image/')) return v;
    if (Array.isArray(v)) {
      for (const x of v) stack.push(x);
    } else if (typeof v === 'object') {
      for (const x of Object.values(v)) stack.push(x);
    }
  }
  // 2) savedImages
  const si = data?.savedImages?.[0];
  const s2 = toAbsUrl(si?.url || si?.path);
  if (s2) return s2;
  // 3) imagePath
  const ip = data?.imagePath;
  const s3 = Array.isArray(ip) ? toAbsUrl(ip[0]) : toAbsUrl(ip);
  return s3 || null;
};


interface ChatExportData {
  chatId: string;
  userId: string;
  exportType: string;
  exportTimestamp: string;
  // 必要に応じて他のプロパティを追加
  [key: string]: any;
}

interface ChatExportReportProps {
  data: ChatExportData;
  fileName: string;
  onClose: () => void;
  onSave?: (reportData: ReportData) => void;
  onPrint?: (reportData: ReportData) => void;
}

const ChatExportReport: React.FC<ChatExportReportProps> = ({
  data,
  fileName,
  onClose,
  onSave,
  onPrint,
}) => {
  const [isEditing, setIsEditing] = useState(false); // 初期状態をプレビューモードに設定
  const [showDiff, setShowDiff] = useState(false); // 差分表示の状態
  const [reportData, setReportData] = useState<ReportData>({
    reportId: `R${data.chatId.slice(-5).toUpperCase()}`,
    machineId:
      data.machineNumber ||
      data.chatData?.machineInfo?.machineNumber ||
      'M98765',
    machineType:
      data.machineType || data.chatData?.machineInfo?.machineTypeName || '',
    machineNumber:
      data.machineNumber || data.chatData?.machineInfo?.machineNumber || '',
    date: new Date(data.exportTimestamp).toISOString().split('T')[0],
    location: '○○線',
    failureCode: 'FC01',
    description: data.problemDescription || 'チャットによる故障相談・応急処置',
    status: '応急処置完了',
    engineer: data.userId || '担当者',
    notes: `チャットID: ${data.chatId}\nメッセージ数: ${data.metadata?.total_messages || data.chatData?.messages?.length || 0}件\nエクスポート種別: ${data.exportType}`,
    repairSchedule: '2025年9月',
    repairLocation: '工場内修理スペース',
    // 新しいフィールド
    incidentTitle: data.title || 'タイトルなし',
    problemDescription: data.problemDescription || '説明なし',
    extractedComponents: data.extractedComponents || [],
    extractedSymptoms: data.extractedSymptoms || [],
    possibleModels: data.possibleModels || [],
  });

  const [editedData, setEditedData] = useState<ReportData>(reportData);

  useEffect(() => {
    setEditedData(reportData);
  }, [reportData]);

  // 差分を計算する関数
  const calculateDiff = () => {
    const diff: { field: string; oldValue: string; newValue: string }[] = [];

    // フィールド名の日本語マッピング
    const fieldNames: Record<string, string> = {
      reportId: '報告書ID',
      machineId: '機械ID',
      machineType: '機種',
      machineNumber: '機械番号',
      date: '日付',
      location: '場所',
      failureCode: '故障コード',
      status: 'ステータス',
      engineer: '担当エンジニア',
      notes: '備考',
      repairSchedule: '修繕予定',
      repairLocation: '修繕場所',
      incidentTitle: '事象タイトル',
      problemDescription: '事象説明',
      extractedComponents: '影響コンポーネント',
      extractedSymptoms: '症状',
      possibleModels: '可能性のある機種',
    };

    Object.keys(reportData).forEach(key => {
      const oldVal = reportData[key as keyof ReportData];
      const newVal = editedData[key as keyof ReportData];

      if (oldVal !== newVal) {
        diff.push({
          field: fieldNames[key] || key,
          oldValue: String(oldVal || '未設定'),
          newValue: String(newVal || '未設定'),
        });
      }
    });

    return diff;
  };


  // サーバーにレポートデータを更新
  const updateReportOnServer = async (updatedData: ReportData) => {
    try {
      const updatePayload = {
        updatedData: {
          // レポートデータを元のJSONファイルの形式に変換
          title: updatedData.incidentTitle,
          problemDescription: updatedData.problemDescription,
          machineType: updatedData.machineType || data.machineType || '',
          machineNumber: updatedData.machineNumber || data.machineNumber || '',
          extractedComponents: updatedData.extractedComponents,
          extractedSymptoms: updatedData.extractedSymptoms,
          possibleModels: updatedData.possibleModels,
          // レポート固有のデータも保存
          reportData: updatedData,
          lastUpdated: new Date().toISOString(),
        },
        updatedBy: 'user',
      };

      console.log('📤 サーバーに送信する更新データ:', updatePayload);
      console.log('🔍 機種・機械番号の更新確認:', {
        machineType: `${data.machineType || '未設定'} → ${updatedData.machineType || '未設定'}`,
        machineNumber: `${data.machineNumber || '未設定'} → ${updatedData.machineNumber || '未設定'}`,
      });

      const response = await fetch(`/api/history/update-item/${data.chatId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'レポートの更新に失敗しました');
      }

      const result = await response.json();
      console.log('✅ レポート更新完了:', result);

      // 更新成功後、元のデータも更新
      if (
        data.machineType !== updatedData.machineType ||
        data.machineNumber !== updatedData.machineNumber
      ) {
        console.log('🔄 機種・機械番号が更新されました:', {
          machineType: `${data.machineType || '未設定'} → ${updatedData.machineType || '未設定'}`,
          machineNumber: `${data.machineNumber || '未設定'} → ${updatedData.machineNumber || '未設定'}`,
        });
      }
    } catch (error) {
      console.error('❌ レポート更新エラー:', error);
      // エラーが発生してもユーザーには通知しない（ローカル保存は成功しているため）
    }
  };

  const handleCancel = () => {
    if (window.confirm('編集内容を破棄しますか？')) {
      setEditedData(reportData);
      setIsEditing(false);
      setShowDiff(false); // 差分表示を非表示にする
    }
  };

  const handleInputChange = (
    field: keyof ReportData,
    value: string | string[]
  ) => {
    setEditedData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // pickFirstImage の優先順位を修正（dataURLを最優先）
  function pickFirstImage(data: any): string | null {
    // 1) JSON内の "data:image/..." を最優先で検索
    const dig = (v: any): string | null => {
      if (!v) return null;
      if (typeof v === 'string' && v.startsWith('data:image/')) return v;
      if (Array.isArray(v))
        for (const x of v) {
          const r = dig(x);
          if (r) return r;
        }
      if (typeof v === 'object')
        for (const k of Object.keys(v)) {
          const r = dig(v[k]);
          if (r) return r;
        }
      return null;
    };
    const fromDataUrl = dig(data);
    if (fromDataUrl) return fromDataUrl;

    // 2) savedImages（配列の {url|path} を優先）
    const saved = data?.savedImages;
    if (Array.isArray(saved) && saved.length > 0) {
      const first = saved.find(
        (s: any) => typeof s?.url === 'string' || typeof s?.path === 'string'
      );
      if (first?.url) return toAbsUrl(first.url);
      if (first?.path) return toAbsUrl(first.path);
    }

    // 3) imagePath（文字列 or 配列）
    if (typeof data?.imagePath === 'string') return toAbsUrl(data.imagePath);
    if (Array.isArray(data?.imagePath) && data.imagePath.length > 0) {
      const firstPath = data.imagePath.find(
        (p: string) => typeof p === 'string'
      );
      if (firstPath) return toAbsUrl(firstPath);
    }
    return null;
  }

  // 個票印刷用HTML生成
  const generateReportPrintHTML = (
    reportData: any,
    imageUrl: string | null
  ): string => {
    const imageSection = imageUrl
      ? `<div class="image-section">
           <h3>故障箇所画像</h3>
           <img class="report-img" src="${imageUrl}" alt="故障画像" />
         </div>`
      : '';

    return `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>チャットエクスポート報告書印刷</title>
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          @media print {
            html, body { margin: 0; padding: 0; }
            .no-print, .print:hidden { display: none !important; }
            img, .image-cell, .image-section { page-break-inside: avoid; break-inside: avoid; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            th, td { border: 1px solid #ccc; padding: 4px; vertical-align: top; }
          }
          img.thumb { width: 32px; height: 32px; object-fit: cover; border: 1px solid #ddd; border-radius: 4px; }
          .report-img { max-width: 100%; height: auto; }
        </style>
      </head>
      <body>
        <h1>チャットエクスポート報告書</h1>

        <div class="report-section">
          <h3>基本情報</h3>
          <table>
            <tr><th>報告書ID</th><td>${reportData.reportId || '-'}</td></tr>
            <tr><th>機械ID</th><td>${reportData.machineId || '-'}</td></tr>
            <tr><th>機種</th><td>${reportData.machineType || '-'}</td></tr>
            <tr><th>機械番号</th><td>${reportData.machineNumber || '-'}</td></tr>
            <tr><th>日付</th><td>${reportData.date || '-'}</td></tr>
            <tr><th>場所</th><td>${reportData.location || '-'}</td></tr>
          </table>
        </div>

        <div class="report-section">
          <h3>事象詳細</h3>
          <table>
            <tr><th>事象タイトル</th><td>${reportData.incidentTitle || '-'}</td></tr>
            <tr><th>事象説明</th><td>${reportData.problemDescription || '-'}</td></tr>
            <tr><th>故障コード</th><td>${reportData.failureCode || '-'}</td></tr>
            <tr><th>ステータス</th><td>${reportData.status || '-'}</td></tr>
            <tr><th>担当エンジニア</th><td>${reportData.engineer || '-'}</td></tr>
          </table>
        </div>

        <div class="report-section">
          <h3>抽出情報</h3>
          <table>
            <tr><th>影響コンポーネント</th><td>${Array.isArray(reportData.extractedComponents) ? reportData.extractedComponents.join(', ') : '-'}</td></tr>
            <tr><th>症状</th><td>${Array.isArray(reportData.extractedSymptoms) ? reportData.extractedSymptoms.join(', ') : '-'}</td></tr>
            <tr><th>可能性のある機種</th><td>${Array.isArray(reportData.possibleModels) ? reportData.possibleModels.join(', ') : '-'}</td></tr>
          </table>
        </div>

        ${imageSection}

        <div class="report-section">
          <h3>備考</h3>
          <p>${reportData.notes || '-'}</p>
        </div>

        <div class="report-section">
          <h3>修繕予定</h3>
          <table>
            <tr><th>予定月日</th><td>${reportData.repairSchedule || '-'}</td></tr>
            <tr><th>場所</th><td>${reportData.repairLocation || '-'}</td></tr>
          </table>
        </div>
      </body>
      </html>
    `;
  };

  // 個票印刷実行
  const printReport = (reportData: any, imageUrl: string | null) => {
    const w = window.open('', '_blank', 'noopener,noreferrer');
    if (!w) return;

    const contentHTML = generateReportPrintHTML(reportData, imageUrls);
    w.document.write(contentHTML);
    w.document.close();

    // 印刷ダイアログを表示
    setTimeout(() => {
      w.print();
    }, 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP');
  };

  const isImageMessage = (content: string) => {
    return content && content.startsWith('data:image/');
  };

  const downloadReport = () => {
    const reportContent = `
 報告書

事象概要:
事象タイトル: ${reportData.incidentTitle}
報告書ID: ${reportData.reportId}
機械ID: ${reportData.machineId}
日付: ${reportData.date}
場所: ${reportData.location}
故障コード: ${reportData.failureCode}

事象詳細:
説明: ${reportData.problemDescription}
ステータス: ${reportData.status}
担当エンジニア: ${reportData.engineer}
備考: ${reportData.notes}

抽出情報:
影響コンポーネント: ${reportData.extractedComponents.join(', ')}
症状: ${reportData.extractedSymptoms.join(', ')}
可能性のある機種: ${reportData.possibleModels.join(', ')}

修繕予定:
予定月日: ${reportData.repairSchedule}
場所: ${reportData.repairLocation}

チャット履歴:
${(data.conversationHistory || data.chatData?.messages || [])
  .map((msg: any) => `${msg.isAiResponse ? 'AI' : 'ユーザー'}: ${msg.content}`)
  .join('\n')}
    `;

    const blob = new Blob([reportContent], {
      type: 'text/plain;charset=utf-8',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `報告書_${reportData.incidentTitle}_${reportData.date}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };


  const currentData = editedData; // 常に編集データを使用


  // より多様な画像ソースを再帰的に収集

  const collectImages = (data: any): string[] => {
    const urls: string[] = [];
    const seen = new Set<string>();

    // 1) images, savedImages, imagePath
    if (Array.isArray(data?.images)) {
      data.images.forEach((img: any) => {
        const u = img?.url || img?.path;
        if (u && !seen.has(u)) { urls.push(u); seen.add(u); }
      });
    }
    if (Array.isArray(data?.savedImages)) {
      data.savedImages.forEach((img: any) => {
        const u = img?.url || img?.path;
        if (u && !seen.has(u)) { urls.push(u); seen.add(u); }
      });
    }
    if (Array.isArray(data?.imagePath)) {
      data.imagePath.forEach((u: any) => {
        if (u && !seen.has(u)) { urls.push(u); seen.add(u); }
      });
    } else if (typeof data?.imagePath === 'string' && !seen.has(data.imagePath)) {
      urls.push(data.imagePath);
      seen.add(data.imagePath);
    }

    // 2) chatData.messages, conversationHistory, originalChatData.messages, messages
    const scanMessages = (messages: any[]) => {
      messages.forEach((msg: any) => {
        // media配列内の画像も抽出
        if (Array.isArray(msg?.media)) {
          msg.media.forEach((mediaItem: any) => {
            if (mediaItem?.type === 'image' && mediaItem?.url && !seen.has(mediaItem.url)) {
              urls.push(mediaItem.url);
              seen.add(mediaItem.url);
            }
          });
        }
        // 旧来のcontentがbase64画像の場合（今は使わないが念のため）
        if (msg?.content && typeof msg.content === 'string' && msg.content.startsWith('data:image/')) {
          if (!seen.has(msg.content)) { urls.push(msg.content); seen.add(msg.content); }
        }
      });
    };
    if (Array.isArray(data?.chatData?.messages)) scanMessages(data.chatData.messages);
    if (Array.isArray(data?.conversationHistory)) scanMessages(data.conversationHistory);
    if (Array.isArray(data?.originalChatData?.messages)) scanMessages(data.originalChatData.messages);
    if (Array.isArray(data?.messages)) scanMessages(data.messages);

    // 3) jsonData.images
    if (Array.isArray(data?.jsonData?.images)) {
      data.jsonData.images.forEach((img: any) => {
        const u = img?.url || img?.path;
        if (u && !seen.has(u)) { urls.push(u); seen.add(u); }
      });
    }

    // 4) 再帰的に子要素も探索（深い構造のため）
    Object.values(data || {}).forEach((v: any) => {
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        try {
          urls.push(...collectImages(v));
        } catch {}
      }
    });

    // 5) URL正規化
    return urls
      .map(u => (typeof u === 'string' && u.startsWith('data:image/') ? u : toAbsUrl(u)))
      .filter(Boolean);
  };

  // Base64画像（data:image/）は一切使わず、API画像やパス画像のみを使用
  const allImageUrls: string[] = collectImages(data);
  const imageUrls: string[] = allImageUrls
    .filter(url =>
      typeof url === 'string' &&
      !url.startsWith('data:image/') &&
      (url.startsWith('http') || url.startsWith('/api/') || url.startsWith('/images/') || url.startsWith('/public/'))
    )
    .map(url => toAbsUrl(url))
    .filter(Boolean);
  // デバッグ用: 画像URLリストを出力
  if (typeof window !== 'undefined') {
    console.log('[chat-export-report] print用画像URLリスト:', imageUrls);
  }

  // 差分データ
  const diff = calculateDiff();

                <Button onClick={onClose} variant='outline'>
                  閉じる
                </Button>
              {/* フラグメント閉じタグ削除（構文エラー修正） */}


        {/* 差分表示 */}
        {showDiff && diff.length > 0 && (
          <Card className='mb-6 border-orange-200 bg-orange-50'>
            <CardHeader>
              <CardTitle className='text-lg font-semibold text-orange-800 flex items-center gap-2'>
                <span>📝 編集内容の差分 ({diff.length}件)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='space-y-3'>
                {diff.map((change, index) => (
                  <div
                    key={index}
                    className='flex items-center gap-4 p-3 bg-white rounded-lg border'
                  >
                    <div className='flex-1'>
                      <span className='font-medium text-gray-700'>
                        {change.field}:
                      </span>
                    </div>
                    <div className='flex-1 text-right'>
                      <div className='text-sm text-red-600 line-through'>
                        {change.oldValue}
                      </div>
                      <div className='text-sm text-green-600 font-medium'>
                        {change.newValue}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className='mt-4 p-3 bg-blue-100 rounded-lg'>
                <p className='text-sm text-blue-800'>
                  💡 上記の変更内容は保存ボタンを押すまで確定されません。
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 事象概要 */}
        <Card className='mb-6'>
          <CardHeader>
            <CardTitle className='text-lg font-semibold'>事象概要</CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            <div>
              <span className='font-medium'>事象タイトル:</span>
              <Input
                value={currentData.incidentTitle}
                onChange={e =>
                  handleInputChange('incidentTitle', e.target.value)
                }
                className='mt-1'
                disabled={!isEditing}
                placeholder='発生した事象のタイトル'
              />
            </div>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div className='flex justify-between'>
                <span className='font-medium'>報告書ID:</span>
                <Input
                  value={currentData.reportId}
                  onChange={e => handleInputChange('reportId', e.target.value)}
                  className='w-32'
                  disabled={!isEditing}
                />
              </div>
              <div className='flex justify-between'>
                <span className='font-medium'>機械ID:</span>
                <Input
                  value={currentData.machineId}
                  onChange={e => handleInputChange('machineId', e.target.value)}
                  className='w-32'
                  disabled={!isEditing}
                />
              </div>
              <div className='flex justify-between'>
                <span className='font-medium'>機種:</span>
                <Input
                  value={currentData.machineType}
                  onChange={e =>
                    handleInputChange('machineType', e.target.value)
                  }
                  className='w-32'
                  disabled={!isEditing}
                  placeholder='機種名'
                />
              </div>
              <div className='flex justify-between'>
                <span className='font-medium'>機械番号:</span>
                <Input
                  value={currentData.machineNumber}
                  onChange={e =>
                    handleInputChange('machineNumber', e.target.value)
                  }
                  className='w-32'
                  disabled={!isEditing}
                  placeholder='機械番号'
                />
              </div>
              <div className='flex justify-between'>
                <span className='font-medium'>日付:</span>
                <Input
                  type='date'
                  value={currentData.date}
                  onChange={e => handleInputChange('date', e.target.value)}
                  className='w-32'
                  disabled={!isEditing}
                />
              </div>
              <div className='flex justify-between'>
                <span className='font-medium'>場所:</span>
                <Input
                  value={currentData.location}
                  onChange={e => handleInputChange('location', e.target.value)}
                  className='w-32'
                  disabled={!isEditing}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 事象詳細 */}
        <Card className='mb-6'>
          <CardHeader>
            <CardTitle className='text-lg font-semibold'>事象詳細</CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            <div>
              <span className='font-medium'>事象説明:</span>
              <Textarea
                value={currentData.problemDescription}
                onChange={e =>
                  handleInputChange('problemDescription', e.target.value)
                }
                className='mt-1'
                rows={3}
                disabled={!isEditing}
                placeholder='事象の詳細な説明'
              />
            </div>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div className='flex justify-between'>
                <span className='font-medium'>ステータス:</span>
                <Input
                  value={currentData.status}
                  onChange={e => handleInputChange('status', e.target.value)}
                  className='w-48'
                  disabled={!isEditing}
                />
              </div>
              <div className='flex justify-between'>
                <span className='font-medium'>担当エンジニア:</span>
                <Input
                  value={currentData.engineer}
                  onChange={e => handleInputChange('engineer', e.target.value)}
                  className='w-32'
                  disabled={!isEditing}
                />
              </div>
            </div>
            <div>
              <span className='font-medium'>備考:</span>
              <Textarea
                value={currentData.notes}
                onChange={e => handleInputChange('notes', e.target.value)}
                className='mt-1'
                rows={3}
                disabled={!isEditing}
              />
            </div>
          </CardContent>
        </Card>

        {/* 抽出情報 */}
        <Card className='mb-6'>
          <CardHeader>
            <CardTitle className='text-lg font-semibold'>抽出情報</CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            <div>
              <span className='font-medium'>影響コンポーネント:</span>
              <Input
                value={currentData.extractedComponents.join(', ')}
                onChange={e =>
                  handleInputChange(
                    'extractedComponents',
                    e.target.value.split(', ').filter(s => s.trim())
                  )
                }
                className='mt-1'
                disabled={!isEditing}
                placeholder='エンジン, ブレーキ, 油圧系統'
              />
            </div>
            <div>
              <span className='font-medium'>症状:</span>
              <Input
                value={currentData.extractedSymptoms.join(', ')}
                onChange={e =>
                  handleInputChange(
                    'extractedSymptoms',
                    e.target.value.split(', ').filter(s => s.trim())
                  )
                }
                className='mt-1'
                disabled={!isEditing}
                placeholder='エンジン停止, 異音, 油圧漏れ'
              />
            </div>
            <div>
              <span className='font-medium'>可能性のある機種:</span>
              <Input
                value={currentData.possibleModels.join(', ')}
                onChange={e =>
                  handleInputChange(
                    'possibleModels',
                    e.target.value.split(', ').filter(s => s.trim())
                  )
                }
                className='mt-1'
                disabled={!isEditing}
                placeholder='MT-100型, MR-400シリーズ'
              />
            </div>
          </CardContent>
        </Card>

        {/* 修繕予定 */}
        <Card className='mb-6'>
          <CardHeader>
            <CardTitle className='text-lg font-semibold'>修繕予定</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div className='flex justify-between'>
                <span className='font-medium'>予定月日:</span>
                <Input
                  value={currentData.repairSchedule}
                  onChange={e =>
                    handleInputChange('repairSchedule', e.target.value)
                  }
                  className='w-32'
                  disabled={!isEditing}
                />
              </div>
              <div className='flex justify-between'>
                <span className='font-medium'>場所:</span>
                <Input
                  value={currentData.repairLocation}
                  onChange={e =>
                    handleInputChange('repairLocation', e.target.value)
                  }
                  className='w-48'
                  disabled={!isEditing}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 故障箇所画像 */}
        <Card className='mb-6'>
          <CardHeader>
            <CardTitle className='text-lg font-semibold'>
              故障箇所画像
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-sm text-gray-600 mb-4'>機械故障箇所の画像</p>
            {/* images配列があれば3列グリッドで全画像を表示 */}
            {imageUrls.length > 0 ? (
              <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4'>
                {imageUrls.map((url, idx) => (
                  <div key={url + '-' + idx} className='text-center'>
                    {/* デバッグ用: URLを小さく表示 */}
                    <div style={{ fontSize: '10px', wordBreak: 'break-all', color: '#888', marginBottom: 2 }}>{url}</div>
                    <img
                      src={url}
                      alt={`故障画像${idx+1}`}
                      style={{ maxWidth: '100%', maxHeight: '240px', display: 'block', margin: '0 auto' }}
                      onError={e => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className='text-center text-gray-500'>画像がありません</div>
            )}
            <p className='text-sm text-gray-600 mt-4'>
              上記は故障箇所の写真です。
            </p>
          </CardContent>
        </Card>

        {/* チャット履歴サマリー */}
        <Card className='mb-6'>
          <CardHeader>
            <CardTitle className='text-lg font-semibold'>
              チャット履歴サマリー
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-4'>
              <div className='flex items-center gap-2'>
                <Calendar className='h-4 w-4 text-gray-500' />
                <span>
                  エクスポート日時: {formatDate(data.exportTimestamp)}
                </span>
              </div>
              <div className='flex items-center gap-2'>
                <MessageSquare className='h-4 w-4 text-gray-500' />
                <span>
                  メッセージ数:{' '}
                  {data.metadata?.total_messages ||
                    data.chatData?.messages?.length ||
                    0}
                  件
                </span>
              </div>
              <div className='flex items-center gap-2'>
                <ImageIcon className='h-4 w-4 text-gray-500' />
                <span>画像数: {data.savedImages?.length || 0}件</span>
              </div>
            </div>

            {/* 機種・機械番号情報 */}
            {(data.machineType || data.machineNumber) && (
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-3 bg-blue-50 rounded-lg'>
                {data.machineType && (
                  <div className='flex items-center gap-2'>
                    <span className='font-medium'>機種:</span>
                    <span>{data.machineType}</span>
                  </div>
                )}
                {data.machineNumber && (
                  <div className='flex items-center gap-2'>
                    <span className='font-medium'>機械番号:</span>
                    <span>{data.machineNumber}</span>
                  </div>
                )}
              </div>
            )}

            <div className='max-h-96 overflow-y-auto border rounded-lg p-4 bg-gray-50'>
              {(data.conversationHistory || data.chatData?.messages || []).map(
                (message: any, index: number) => (
                  <div
                    key={message.id || index}
                    className={`mb-4 p-3 rounded-lg ${message.isAiResponse ? 'bg-blue-50 ml-4' : 'bg-gray-100 mr-4'}`}
                  >
                    <div className='flex items-start gap-2 mb-2'>
                      <Badge
                        variant={message.isAiResponse ? 'default' : 'secondary'}
                        className='text-xs'
                      >
                        {message.isAiResponse ? 'AI' : 'ユーザー'}
                      </Badge>
                      <span className='text-xs text-gray-500'>
                        {formatDate(message.timestamp || message.createdAt)}
                      </span>
                    </div>
                    <div className='mt-1'>
                      {isImageMessage(message.content) ? (
                        <div className='flex items-center gap-2'>
                          <ImageIcon className='h-4 w-4 text-gray-500' />
                          <span className='text-sm text-gray-600'>
                            画像メッセージ
                          </span>
                        </div>
                      ) : (
                        <p className='text-sm whitespace-pre-wrap leading-relaxed'>
                          {message.content}
                        </p>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>

        {/* フッター */}
        <div className='text-center text-sm text-gray-500 py-4'>
          © 2025 報告書. All rights reserved.
        </div>


}
export default ChatExportReport;
