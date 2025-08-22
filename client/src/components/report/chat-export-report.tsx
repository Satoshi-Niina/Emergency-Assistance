import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Calendar, User, MessageSquare, Image as ImageIcon, Edit, Save, X, Download, Printer } from 'lucide-react';

// 画像ユーチE��リチE��関数�E�Exportして他�Eコンポ�Eネントでも使用可能�E�E
const API_BASE = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_BASE_URL || window.location.origin);

export const toAbsUrl = (u?: string | null) => {
  if (!u) return null;
  if (/^data:image\//.test(u)) return u;
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith('/api/')) return API_BASE + u; // DEVは''でプロキシ経由
  return new URL(u, window.location.origin).toString();
};

export const getImageSrc = (data: any): string | null => {
  // 1) JSON 全体かめEdata:image を�E帰探索
  const stack = [data];
  while (stack.length) {
    const v = stack.pop();
    if (v == null) continue;
    if (typeof v === 'string' && v.startsWith('data:image/')) return v;
    if (Array.isArray(v)) { for (const x of v) stack.push(x); }
    else if (typeof v === 'object') { for (const x of Object.values(v)) stack.push(x); }
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
  // 新しいフォーマッチE
  title?: string;
  problemDescription?: string;
  machineType?: string;
  machineNumber?: string;
  extractedComponents?: string[];
  extractedSymptoms?: string[];
  possibleModels?: string[];
  conversationHistory?: any[];
  metadata?: {
    total_messages?: number;
    user_messages?: number;
    ai_messages?: number;
    total_media?: number;
    export_format_version?: string;
    fileName?: string;
  };
  // 従来のフォーマット（後方互換性�E�E
  chatData?: {
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
  // 追加の画像ソース用フィールチE
  messages?: Array<{
    id: number;
    content: string;
    isAiResponse: boolean;
    timestamp: string;
    media: any[];
  }>;
  imagePath?: string;
  originalChatData?: {
    messages: Array<{
      id: number;
      content: string;
      isAiResponse: boolean;
      timestamp: string;
      media: any[];
    }>;
  };
}

interface ReportData {
  reportId: string;
  machineId: string;
  machineType: string; // 機種を追加
  machineNumber: string; // 機械番号を追加
  date: string;
  location: string;
  failureCode: string;
  description: string;
  status: string;
  engineer: string;
  notes: string;
  repairSchedule: string;
  repairLocation: string;
  // 新しいフィールチE
  incidentTitle: string;
  problemDescription: string;
  extractedComponents: string[];
  extractedSymptoms: string[];
  possibleModels: string[];
}

interface ChatExportReportProps {
  data: ChatExportData;
  fileName: string;
  onClose: () => void;
  onSave?: (reportData: ReportData) => void;
  onPrint?: (reportData: ReportData) => void;
}

const ChatExportReport: React.FC<ChatExportReportProps> = ({ data, fileName, onClose, onSave, onPrint }) => {
  const [isEditing, setIsEditing] = useState(false); // 初期状態をプレビューモードに設宁E
  const [showDiff, setShowDiff] = useState(false); // 差刁E��示の状慁E
  const [reportData, setReportData] = useState<ReportData>({
    reportId: `R${data.chatId.slice(-5).toUpperCase()}`,
    machineId: data.machineNumber || data.chatData?.machineInfo?.machineNumber || 'M98765',
    machineType: data.machineType || data.chatData?.machineInfo?.machineTypeName || '',
    machineNumber: data.machineNumber || data.chatData?.machineInfo?.machineNumber || '',
    date: new Date(data.exportTimestamp).toISOString().split('T')[0],
    location: '○○緁E,
    failureCode: 'FC01',
    description: data.problemDescription || 'チャチE��による敁E��相諁E�E応急処置',
    status: '応急処置完亁E,
    engineer: data.userId || '拁E��老E,
    notes: `チャチE��ID: ${data.chatId}\nメチE��ージ数: ${data.metadata?.total_messages || data.chatData?.messages?.length || 0}件\nエクスポ�Eト種別: ${data.exportType}`,
    repairSchedule: '2025年9朁E,
    repairLocation: '工場冁E��琁E��ペ�Eス',
    // 新しいフィールチE
    incidentTitle: data.title || 'タイトルなぁE,
    problemDescription: data.problemDescription || '説明なぁE,
    extractedComponents: data.extractedComponents || [],
    extractedSymptoms: data.extractedSymptoms || [],
    possibleModels: data.possibleModels || []
  });

  const [editedData, setEditedData] = useState<ReportData>(reportData);

  useEffect(() => {
    setEditedData(reportData);
  }, [reportData]);

  // 差刁E��計算する関数
  const calculateDiff = () => {
    const diff: { field: string; oldValue: string; newValue: string }[] = [];
    
    // フィールド名の日本語�EチE��ング
    const fieldNames: Record<string, string> = {
      reportId: '報告書ID',
      machineId: '機械ID',
      machineType: '機種',
      machineNumber: '機械番号',
      date: '日仁E,
      location: '場所',
      failureCode: '敁E��コーチE,
      description: '説昁E,
      status: 'スチE�Eタス',
      engineer: '拁E��エンジニア',
      notes: '備老E,
      repairSchedule: '修繕予宁E,
      repairLocation: '修繕場所',
      incidentTitle: '事象タイトル',
      problemDescription: '事象説昁E,
      extractedComponents: '影響コンポ�EネンチE,
      extractedSymptoms: '痁E��',
      possibleModels: '可能性のある機種'
    };
    
    Object.keys(reportData).forEach(key => {
      const oldVal = reportData[key as keyof ReportData];
      const newVal = editedData[key as keyof ReportData];
      
      if (oldVal !== newVal) {
        diff.push({
          field: fieldNames[key] || key,
          oldValue: String(oldVal || '未設宁E),
          newValue: String(newVal || '未設宁E)
        });
      }
    });
    
    return diff;
  };

  const diff = calculateDiff();

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    setReportData(editedData);
    setIsEditing(false);
    setShowDiff(false); // 差刁E��示を非表示にする
    
    // サーバ�Eに更新リクエストを送信
    if (data.chatId) {
      updateReportOnServer(editedData);
    }
    
    if (onSave) {
      onSave(editedData);
    }
    
    // 更新された�E容を確誁E
    const updatedFields = [];
    if (data.machineType !== editedData.machineType) {
      updatedFields.push(`機種: ${data.machineType || '未設宁E} ↁE${editedData.machineType || '未設宁E}`);
    }
    if (data.machineNumber !== editedData.machineNumber) {
      updatedFields.push(`機械番号: ${data.machineNumber || '未設宁E} ↁE${editedData.machineNumber || '未設宁E}`);
    }
    
    // 保存完亁E�E通知
    if (updatedFields.length > 0) {
      alert(`レポ�Eトが保存されました、En\n更新された�E容:\n${updatedFields.join('\n')}`);
    } else {
      alert('レポ�Eトが保存されました、E);
    }
  };

  // サーバ�Eにレポ�Eトデータを更新
  const updateReportOnServer = async (updatedData: ReportData) => {
    try {
      const updatePayload = {
        updatedData: {
          // レポ�Eトデータを�EのJSONファイルの形式に変換
          title: updatedData.incidentTitle,
          problemDescription: updatedData.problemDescription,
          machineType: updatedData.machineType || data.machineType || '',
          machineNumber: updatedData.machineNumber || data.machineNumber || '',
          extractedComponents: updatedData.extractedComponents,
          extractedSymptoms: updatedData.extractedSymptoms,
          possibleModels: updatedData.possibleModels,
          // レポ�Eト固有�EチE�Eタも保孁E
          reportData: updatedData,
          lastUpdated: new Date().toISOString()
        },
        updatedBy: 'user'
      };

      console.log('📤 サーバ�Eに送信する更新チE�Eタ:', updatePayload);
      console.log('🔍 機種・機械番号の更新確誁E', {
        machineType: `${data.machineType || '未設宁E} ↁE${updatedData.machineType || '未設宁E}`,
        machineNumber: `${data.machineNumber || '未設宁E} ↁE${updatedData.machineNumber || '未設宁E}`
      });

      const response = await fetch(`/api/history/update-item/${data.chatId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'レポ�Eト�E更新に失敗しました');
      }
      
      const result = await response.json();
      console.log('✁Eレポ�Eト更新完亁E', result);
      
      // 更新成功後、�EのチE�Eタも更新
      if (data.machineType !== updatedData.machineType || data.machineNumber !== updatedData.machineNumber) {
        console.log('🔄 機種・機械番号が更新されました:', {
          machineType: `${data.machineType || '未設宁E} ↁE${updatedData.machineType || '未設宁E}`,
          machineNumber: `${data.machineNumber || '未設宁E} ↁE${updatedData.machineNumber || '未設宁E}`
        });
      }
      
    } catch (error) {
      console.error('❁Eレポ�Eト更新エラー:', error);
      // エラーが発生してもユーザーには通知しなぁE��ローカル保存�E成功してぁE��ため�E�E
    }
  };

  const handleCancel = () => {
    if (window.confirm('編雁E�E容を破棁E��ますか�E�E)) {
      setEditedData(reportData);
      setIsEditing(false);
      setShowDiff(false); // 差刁E��示を非表示にする
    }
  };

  const handleInputChange = (field: keyof ReportData, value: string | string[]) => {
    setEditedData(prev => ({
      ...prev,
      [field]: value
    }));
  };



  // pickFirstImage の優先頁E��を修正�E�EataURLを最優先！E
  function pickFirstImage(data: any): string | null {
    // 1) JSON冁E�E "data:image/..." を最優先で検索
    const dig = (v:any): string | null => {
      if (!v) return null;
      if (typeof v === 'string' && v.startsWith('data:image/')) return v;
      if (Array.isArray(v)) for (const x of v) { const r = dig(x); if (r) return r; }
      if (typeof v === 'object') for (const k of Object.keys(v)) { const r = dig(v[k]); if (r) return r; }
      return null;
    };
    const fromDataUrl = dig(data);
    if (fromDataUrl) return fromDataUrl;

    // 2) savedImages�E��E列�E {url|path} を優先！E
    const saved = data?.savedImages;
    if (Array.isArray(saved) && saved.length > 0) {
      const first = saved.find((s:any) => typeof s?.url === 'string' || typeof s?.path === 'string');
      if (first?.url) return toAbsUrl(first.url);
      if (first?.path) return toAbsUrl(first.path);
    }

    // 3) imagePath�E�文字�E or 配�E�E�E
    if (typeof data?.imagePath === 'string') return toAbsUrl(data.imagePath);
    if (Array.isArray(data?.imagePath) && data.imagePath.length > 0) {
      const firstPath = data.imagePath.find((p:string) => typeof p === 'string');
      if (firstPath) return toAbsUrl(firstPath);
    }
    return null;
  }

  // 個票印刷用HTML生�E
  const generateReportPrintHTML = (reportData: any, imageUrl: string | null): string => {
    const imageSection = imageUrl
      ? `<div class="image-section">
           <h3>敁E��箁E��画僁E/h3>
           <img class="report-img" src="${imageUrl}" alt="敁E��画僁E />
         </div>`
      : '';

    return `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>チャチE��エクスポ�Eト報告書印刷</title>
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
        <h1>チャチE��エクスポ�Eト報告書</h1>

        <div class="report-section">
          <h3>基本惁E��</h3>
          <table>
            <tr><th>報告書ID</th><td>${reportData.reportId || '-'}</td></tr>
            <tr><th>機械ID</th><td>${reportData.machineId || '-'}</td></tr>
            <tr><th>機種</th><td>${reportData.machineType || '-'}</td></tr>
            <tr><th>機械番号</th><td>${reportData.machineNumber || '-'}</td></tr>
            <tr><th>日仁E/th><td>${reportData.date || '-'}</td></tr>
            <tr><th>場所</th><td>${reportData.location || '-'}</td></tr>
          </table>
        </div>

        <div class="report-section">
          <h3>事象詳細</h3>
          <table>
            <tr><th>事象タイトル</th><td>${reportData.incidentTitle || '-'}</td></tr>
            <tr><th>事象説昁E/th><td>${reportData.problemDescription || '-'}</td></tr>
            <tr><th>敁E��コーチE/th><td>${reportData.failureCode || '-'}</td></tr>
            <tr><th>スチE�Eタス</th><td>${reportData.status || '-'}</td></tr>
            <tr><th>拁E��エンジニア</th><td>${reportData.engineer || '-'}</td></tr>
          </table>
        </div>

        <div class="report-section">
          <h3>抽出惁E��</h3>
          <table>
            <tr><th>影響コンポ�EネンチE/th><td>${Array.isArray(reportData.extractedComponents) ? reportData.extractedComponents.join(', ') : '-'}</td></tr>
            <tr><th>痁E��</th><td>${Array.isArray(reportData.extractedSymptoms) ? reportData.extractedSymptoms.join(', ') : '-'}</td></tr>
            <tr><th>可能性のある機種</th><td>${Array.isArray(reportData.possibleModels) ? reportData.possibleModels.join(', ') : '-'}</td></tr>
          </table>
        </div>

        ${imageSection}

        <div class="report-section">
          <h3>備老E/h3>
          <p>${reportData.notes || '-'}</p>
        </div>

        <div class="report-section">
          <h3>修繕予宁E/h3>
          <table>
            <tr><th>予定月日</th><td>${reportData.repairSchedule || '-'}</td></tr>
            <tr><th>場所</th><td>${reportData.repairLocation || '-'}</td></tr>
          </table>
        </div>
      </body>
      </html>
    `;
  };

  // 個票印刷実衁E
  const printReport = (reportData: any, imageUrl: string | null) => {
    const w = window.open('', '_blank', 'noopener,noreferrer');
    if (!w) return;

    const contentHTML = generateReportPrintHTML(reportData, imageUrl);
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

事象概要E
事象タイトル: ${reportData.incidentTitle}
報告書ID: ${reportData.reportId}
機械ID: ${reportData.machineId}
日仁E ${reportData.date}
場所: ${reportData.location}
敁E��コーチE ${reportData.failureCode}

事象詳細:
説昁E ${reportData.problemDescription}
スチE�Eタス: ${reportData.status}
拁E��エンジニア: ${reportData.engineer}
備老E ${reportData.notes}

抽出惁E��:
影響コンポ�EネンチE ${reportData.extractedComponents.join(', ')}
痁E��: ${reportData.extractedSymptoms.join(', ')}
可能性のある機種: ${reportData.possibleModels.join(', ')}

修繕予宁E
予定月日: ${reportData.repairSchedule}
場所: ${reportData.repairLocation}

チャチE��履歴:
${(data.conversationHistory || data.chatData?.messages || []).map((msg: any) => 
  `${msg.isAiResponse ? 'AI' : 'ユーザー'}: ${msg.content}`
).join('\n')}
    `;

    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `報告書_${reportData.incidentTitle}_${reportData.date}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const currentData = editedData; // 常に編雁E��ータを使用



  // return()の直前に追加
  const imgSrc = getImageSrc(data);
  console.log('[chat-export] final imgSrc:', imgSrc && imgSrc.slice(0, 60));

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="flex justify-between items-center mb-6">
                      <h1 className="text-3xl font-bold text-center flex-1">報告書</h1>
          <div className="flex gap-2">
            {!isEditing ? (
              <>
                <Button onClick={handleEdit} variant="outline" className="flex items-center gap-2">
                  <Edit className="h-4 w-4" />
                  レポ�Eト編雁E
                </Button>
                {diff.length > 0 && (
                  <Button 
                    onClick={() => setShowDiff(!showDiff)} 
                    variant="outline" 
                    className="flex items-center gap-2"
                  >
                    <span className="text-sm">差刁E��示 ({diff.length})</span>
                  </Button>
                )}
                <Button onClick={() => {
                  printReport(currentData, imgSrc);
                }} variant="outline" className="flex items-center gap-2">
                  <Printer className="h-4 w-4" />
                  印刷
                </Button>
                <Button onClick={downloadReport} variant="outline" className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  ダウンローチE
                </Button>
                <Button onClick={onClose} variant="outline">
                  閉じめE
                </Button>
              </>
            ) : (
              <>
                <Button onClick={handleSave} className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  保孁E
                </Button>
                <Button onClick={handleCancel} variant="outline" className="flex items-center gap-2">
                  <X className="h-4 w-4" />
                  キャンセル
                </Button>
                <Button onClick={onClose} variant="outline">
                  閉じめE
                </Button>
              </>
            )}
          </div>
        </div>

        {/* 差刁E��示 */}
        {showDiff && diff.length > 0 && (
          <Card className="mb-6 border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-orange-800 flex items-center gap-2">
                <span>📝 編雁E�E容の差刁E({diff.length}件)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {diff.map((change, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 bg-white rounded-lg border">
                    <div className="flex-1">
                      <span className="font-medium text-gray-700">{change.field}:</span>
                    </div>
                    <div className="flex-1 text-right">
                      <div className="text-sm text-red-600 line-through">
                        {change.oldValue}
                      </div>
                      <div className="text-sm text-green-600 font-medium">
                        {change.newValue}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                <p className="text-sm text-blue-800">
                  💡 上記�E変更冁E��は保存�Eタンを押すまで確定されません、E
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 事象概要E*/}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">事象概要E/CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="font-medium">事象タイトル:</span>
              <Input
                value={currentData.incidentTitle}
                onChange={(e) => handleInputChange('incidentTitle', e.target.value)}
                className="mt-1"
                disabled={!isEditing}
                placeholder="発生した事象のタイトル"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <span className="font-medium">機種:</span>
                <Input
                  value={currentData.machineType}
                  onChange={(e) => handleInputChange('machineType', e.target.value)}
                  className="w-32"
                  disabled={!isEditing}
                  placeholder="機種吁E
                />
              </div>
              <div className="flex justify-between">
                <span className="font-medium">機械番号:</span>
                <Input
                  value={currentData.machineNumber}
                  onChange={(e) => handleInputChange('machineNumber', e.target.value)}
                  className="w-32"
                  disabled={!isEditing}
                  placeholder="機械番号"
                />
              </div>
              <div className="flex justify-between">
                <span className="font-medium">日仁E</span>
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
            </div>
          </CardContent>
        </Card>

        {/* 事象詳細 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">事象詳細</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="font-medium">事象説昁E</span>
              <Textarea
                value={currentData.problemDescription}
                onChange={(e) => handleInputChange('problemDescription', e.target.value)}
                className="mt-1"
                rows={3}
                disabled={!isEditing}
                placeholder="事象の詳細な説昁E
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex justify-between">
                <span className="font-medium">スチE�Eタス:</span>
                <Input
                  value={currentData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-48"
                  disabled={!isEditing}
                />
              </div>
              <div className="flex justify-between">
                <span className="font-medium">拁E��エンジニア:</span>
                <Input
                  value={currentData.engineer}
                  onChange={(e) => handleInputChange('engineer', e.target.value)}
                  className="w-32"
                  disabled={!isEditing}
                />
              </div>
            </div>
            <div>
              <span className="font-medium">備老E</span>
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

        {/* 抽出惁E�� */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">抽出惁E��</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="font-medium">影響コンポ�EネンチE</span>
              <Input
                value={currentData.extractedComponents.join(', ')}
                onChange={(e) => handleInputChange('extractedComponents', e.target.value.split(', ').filter(s => s.trim()))}
                className="mt-1"
                disabled={!isEditing}
                placeholder="エンジン, ブレーキ, 油圧系統"
              />
            </div>
            <div>
              <span className="font-medium">痁E��:</span>
              <Input
                value={currentData.extractedSymptoms.join(', ')}
                onChange={(e) => handleInputChange('extractedSymptoms', e.target.value.split(', ').filter(s => s.trim()))}
                className="mt-1"
                disabled={!isEditing}
                placeholder="エンジン停止, 異音, 油圧漏れ"
              />
            </div>
            <div>
              <span className="font-medium">可能性のある機種:</span>
              <Input
                value={currentData.possibleModels.join(', ')}
                onChange={(e) => handleInputChange('possibleModels', e.target.value.split(', ').filter(s => s.trim()))}
                className="mt-1"
                disabled={!isEditing}
                placeholder="MT-100垁E MR-400シリーズ"
              />
            </div>
          </CardContent>
        </Card>

        {/* 修繕予宁E*/}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">修繕予宁E/CardTitle>
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

        {/* 敁E��箁E��画僁E*/}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">敁E��箁E��画僁E/CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">機械敁E��箁E��の画僁E/p>
            {imgSrc ? (
              <img
                key={imgSrc.slice(0, 64)}
                src={imgSrc}
                alt="敁E��箁E��画僁E
                style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div className="text-center text-gray-500">画像がありません</div>
            )}
            <p className="text-sm text-gray-600 mt-4">上記�E敁E��箁E��の写真です、E/p>
          </CardContent>
        </Card>

        {/* チャチE��履歴サマリー */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">チャチE��履歴サマリー</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span>エクスポ�Eト日晁E {formatDate(data.exportTimestamp)}</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-gray-500" />
                <span>メチE��ージ数: {data.metadata?.total_messages || data.chatData?.messages?.length || 0}件</span>
              </div>
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-gray-500" />
                <span>画像数: {data.savedImages?.length || 0}件</span>
              </div>
            </div>
            
            {/* 機種・機械番号惁E�� */}
            {(data.machineType || data.machineNumber) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-3 bg-blue-50 rounded-lg">
                {data.machineType && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">機種:</span>
                    <span>{data.machineType}</span>
                  </div>
                )}
                {data.machineNumber && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">機械番号:</span>
                    <span>{data.machineNumber}</span>
                  </div>
                )}
              </div>
            )}

            <div className="max-h-96 overflow-y-auto border rounded-lg p-4 bg-gray-50">
              {(data.conversationHistory || data.chatData?.messages || []).map((message: any, index: number) => (
                <div key={message.id || index} className={`mb-4 p-3 rounded-lg ${message.isAiResponse ? 'bg-blue-50 ml-4' : 'bg-gray-100 mr-4'}`}>
                  <div className="flex items-start gap-2 mb-2">
                    <Badge variant={message.isAiResponse ? 'default' : 'secondary'} className="text-xs">
                      {message.isAiResponse ? 'AI' : 'ユーザー'}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {formatDate(message.timestamp || message.createdAt)}
                    </span>
                  </div>
                  <div className="mt-1">
                    {isImageMessage(message.content) ? (
                      <div className="flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">画像メチE��ージ</span>
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
          © 2025 報告書. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default ChatExportReport;
