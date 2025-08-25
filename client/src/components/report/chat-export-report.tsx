import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Calendar, User, MessageSquare, Image as ImageIcon, Edit, Save, X, Download, Printer } from 'lucide-react';

// 逕ｻ蜒上Θ繝ｼ繝・ぅ繝ｪ繝・ぅ髢｢謨ｰ・・xport縺励※莉悶・繧ｳ繝ｳ繝昴・繝阪Φ繝医〒繧ゆｽｿ逕ｨ蜿ｯ閭ｽ・・
const API_BASE = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_BASE_URL || window.location.origin);

export const toAbsUrl = (u?: string | null) => {
  if (!u) return null;
  if (/^data:image\//.test(u)) return u;
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith('/api/')) return API_BASE + u; // DEV縺ｯ''縺ｧ繝励Ο繧ｭ繧ｷ邨檎罰
  return new URL(u, window.location.origin).toString();
};

export const getImageSrc = (data: any): string | null => {
  // 1) JSON 蜈ｨ菴薙°繧・data:image 繧貞・蟶ｰ謗｢邏｢
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
  // 譁ｰ縺励＞繝輔か繝ｼ繝槭ャ繝・
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
  // 蠕捺擂縺ｮ繝輔か繝ｼ繝槭ャ繝茨ｼ亥ｾ梧婿莠呈鋤諤ｧ・・
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
  // 霑ｽ蜉縺ｮ逕ｻ蜒上た繝ｼ繧ｹ逕ｨ繝輔ぅ繝ｼ繝ｫ繝・
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
  machineType: string; // 讖溽ｨｮ繧定ｿｽ蜉
  machineNumber: string; // 讖滓｢ｰ逡ｪ蜿ｷ繧定ｿｽ蜉
  date: string;
  location: string;
  failureCode: string;
  description: string;
  status: string;
  engineer: string;
  notes: string;
  repairSchedule: string;
  repairLocation: string;
  // 譁ｰ縺励＞繝輔ぅ繝ｼ繝ｫ繝・
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
  const [isEditing, setIsEditing] = useState(false); // 蛻晄悄迥ｶ諷九ｒ繝励Ξ繝薙Η繝ｼ繝｢繝ｼ繝峨↓險ｭ螳・
  const [showDiff, setShowDiff] = useState(false); // 蟾ｮ蛻・｡ｨ遉ｺ縺ｮ迥ｶ諷・
  const [reportData, setReportData] = useState<ReportData>({
    reportId: `R${data.chatId.slice(-5).toUpperCase()}`,
    machineId: data.machineNumber || data.chatData?.machineInfo?.machineNumber || 'M98765',
    machineType: data.machineType || data.chatData?.machineInfo?.machineTypeName || '',
    machineNumber: data.machineNumber || data.chatData?.machineInfo?.machineNumber || '',
    date: new Date(data.exportTimestamp).toISOString().split('T')[0],
    location: '笳銀雷邱・,
    failureCode: 'FC01',
    description: data.problemDescription || '繝√Ε繝・ヨ縺ｫ繧医ｋ謨・囿逶ｸ隲・・蠢懈･蜃ｦ鄂ｮ',
    status: '蠢懈･蜃ｦ鄂ｮ螳御ｺ・,
    engineer: data.userId || '諡・ｽ楢・,
    notes: `繝√Ε繝・ヨID: ${data.chatId}\n繝｡繝・そ繝ｼ繧ｸ謨ｰ: ${data.metadata?.total_messages || data.chatData?.messages?.length || 0}莉ｶ\n繧ｨ繧ｯ繧ｹ繝昴・繝育ｨｮ蛻･: ${data.exportType}`,
    repairSchedule: '2025蟷ｴ9譛・,
    repairLocation: '蟾･蝣ｴ蜀・ｿｮ逅・せ繝壹・繧ｹ',
    // 譁ｰ縺励＞繝輔ぅ繝ｼ繝ｫ繝・
    incidentTitle: data.title || '繧ｿ繧､繝医Ν縺ｪ縺・,
    problemDescription: data.problemDescription || '隱ｬ譏弱↑縺・,
    extractedComponents: data.extractedComponents || [],
    extractedSymptoms: data.extractedSymptoms || [],
    possibleModels: data.possibleModels || []
  });

  const [editedData, setEditedData] = useState<ReportData>(reportData);

  useEffect(() => {
    setEditedData(reportData);
  }, [reportData]);

  // 蟾ｮ蛻・ｒ險育ｮ励☆繧矩未謨ｰ
  const calculateDiff = () => {
    const diff: { field: string; oldValue: string; newValue: string }[] = [];
    
    // 繝輔ぅ繝ｼ繝ｫ繝牙錐縺ｮ譌･譛ｬ隱槭・繝・ヴ繝ｳ繧ｰ
    const fieldNames: Record<string, string> = {
      reportId: '蝣ｱ蜻頑嶌ID',
      machineId: '讖滓｢ｰID',
      machineType: '讖溽ｨｮ',
      machineNumber: '讖滓｢ｰ逡ｪ蜿ｷ',
      date: '譌･莉・,
      location: '蝣ｴ謇',
      failureCode: '謨・囿繧ｳ繝ｼ繝・,
      description: '隱ｬ譏・,
      status: '繧ｹ繝・・繧ｿ繧ｹ',
      engineer: '諡・ｽ薙お繝ｳ繧ｸ繝九い',
      notes: '蛯呵・,
      repairSchedule: '菫ｮ郢穂ｺ亥ｮ・,
      repairLocation: '菫ｮ郢募ｴ謇',
      incidentTitle: '莠玖ｱ｡繧ｿ繧､繝医Ν',
      problemDescription: '莠玖ｱ｡隱ｬ譏・,
      extractedComponents: '蠖ｱ髻ｿ繧ｳ繝ｳ繝昴・繝阪Φ繝・,
      extractedSymptoms: '逞・憾',
      possibleModels: '蜿ｯ閭ｽ諤ｧ縺ｮ縺ゅｋ讖溽ｨｮ'
    };
    
    Object.keys(reportData).forEach(key => {
      const oldVal = reportData[key as keyof ReportData];
      const newVal = editedData[key as keyof ReportData];
      
      if (oldVal !== newVal) {
        diff.push({
          field: fieldNames[key] || key,
          oldValue: String(oldVal || '譛ｪ險ｭ螳・),
          newValue: String(newVal || '譛ｪ險ｭ螳・)
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
    setShowDiff(false); // 蟾ｮ蛻・｡ｨ遉ｺ繧帝撼陦ｨ遉ｺ縺ｫ縺吶ｋ
    
    // 繧ｵ繝ｼ繝舌・縺ｫ譖ｴ譁ｰ繝ｪ繧ｯ繧ｨ繧ｹ繝医ｒ騾∽ｿ｡
    if (data.chatId) {
      updateReportOnServer(editedData);
    }
    
    if (onSave) {
      onSave(editedData);
    }
    
    // 譖ｴ譁ｰ縺輔ｌ縺溷・螳ｹ繧堤｢ｺ隱・
    const updatedFields = [];
    if (data.machineType !== editedData.machineType) {
      updatedFields.push(`讖溽ｨｮ: ${data.machineType || '譛ｪ險ｭ螳・} 竊・${editedData.machineType || '譛ｪ險ｭ螳・}`);
    }
    if (data.machineNumber !== editedData.machineNumber) {
      updatedFields.push(`讖滓｢ｰ逡ｪ蜿ｷ: ${data.machineNumber || '譛ｪ險ｭ螳・} 竊・${editedData.machineNumber || '譛ｪ險ｭ螳・}`);
    }
    
    // 菫晏ｭ伜ｮ御ｺ・・騾夂衍
    if (updatedFields.length > 0) {
      alert(`繝ｬ繝昴・繝医′菫晏ｭ倥＆繧後∪縺励◆縲・n\n譖ｴ譁ｰ縺輔ｌ縺溷・螳ｹ:\n${updatedFields.join('\n')}`);
    } else {
      alert('繝ｬ繝昴・繝医′菫晏ｭ倥＆繧後∪縺励◆縲・);
    }
  };

  // 繧ｵ繝ｼ繝舌・縺ｫ繝ｬ繝昴・繝医ョ繝ｼ繧ｿ繧呈峩譁ｰ
  const updateReportOnServer = async (updatedData: ReportData) => {
    try {
      const updatePayload = {
        updatedData: {
          // 繝ｬ繝昴・繝医ョ繝ｼ繧ｿ繧貞・縺ｮJSON繝輔ぃ繧､繝ｫ縺ｮ蠖｢蠑上↓螟画鋤
          title: updatedData.incidentTitle,
          problemDescription: updatedData.problemDescription,
          machineType: updatedData.machineType || data.machineType || '',
          machineNumber: updatedData.machineNumber || data.machineNumber || '',
          extractedComponents: updatedData.extractedComponents,
          extractedSymptoms: updatedData.extractedSymptoms,
          possibleModels: updatedData.possibleModels,
          // 繝ｬ繝昴・繝亥崋譛峨・繝・・繧ｿ繧ゆｿ晏ｭ・
          reportData: updatedData,
          lastUpdated: new Date().toISOString()
        },
        updatedBy: 'user'
      };

      console.log('豆 繧ｵ繝ｼ繝舌・縺ｫ騾∽ｿ｡縺吶ｋ譖ｴ譁ｰ繝・・繧ｿ:', updatePayload);
      console.log('剥 讖溽ｨｮ繝ｻ讖滓｢ｰ逡ｪ蜿ｷ縺ｮ譖ｴ譁ｰ遒ｺ隱・', {
        machineType: `${data.machineType || '譛ｪ險ｭ螳・} 竊・${updatedData.machineType || '譛ｪ險ｭ螳・}`,
        machineNumber: `${data.machineNumber || '譛ｪ險ｭ螳・} 竊・${updatedData.machineNumber || '譛ｪ險ｭ螳・}`
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
        throw new Error(errorData.error || '繝ｬ繝昴・繝医・譖ｴ譁ｰ縺ｫ螟ｱ謨励＠縺ｾ縺励◆');
      }
      
      const result = await response.json();
      console.log('笨・繝ｬ繝昴・繝域峩譁ｰ螳御ｺ・', result);
      
      // 譖ｴ譁ｰ謌仙粥蠕後∝・縺ｮ繝・・繧ｿ繧よ峩譁ｰ
      if (data.machineType !== updatedData.machineType || data.machineNumber !== updatedData.machineNumber) {
        console.log('売 讖溽ｨｮ繝ｻ讖滓｢ｰ逡ｪ蜿ｷ縺梧峩譁ｰ縺輔ｌ縺ｾ縺励◆:', {
          machineType: `${data.machineType || '譛ｪ險ｭ螳・} 竊・${updatedData.machineType || '譛ｪ險ｭ螳・}`,
          machineNumber: `${data.machineNumber || '譛ｪ險ｭ螳・} 竊・${updatedData.machineNumber || '譛ｪ險ｭ螳・}`
        });
      }
      
    } catch (error) {
      console.error('笶・繝ｬ繝昴・繝域峩譁ｰ繧ｨ繝ｩ繝ｼ:', error);
      // 繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｦ繧ゅΘ繝ｼ繧ｶ繝ｼ縺ｫ縺ｯ騾夂衍縺励↑縺・ｼ医Ο繝ｼ繧ｫ繝ｫ菫晏ｭ倥・謌仙粥縺励※縺・ｋ縺溘ａ・・
    }
  };

  const handleCancel = () => {
    if (window.confirm('邱ｨ髮・・螳ｹ繧堤ｴ譽・＠縺ｾ縺吶°・・)) {
      setEditedData(reportData);
      setIsEditing(false);
      setShowDiff(false); // 蟾ｮ蛻・｡ｨ遉ｺ繧帝撼陦ｨ遉ｺ縺ｫ縺吶ｋ
    }
  };

  const handleInputChange = (field: keyof ReportData, value: string | string[]) => {
    setEditedData(prev => ({
      ...prev,
      [field]: value
    }));
  };



  // pickFirstImage 縺ｮ蜆ｪ蜈磯・ｽ阪ｒ菫ｮ豁｣・・ataURL繧呈怙蜆ｪ蜈茨ｼ・
  function pickFirstImage(data: any): string | null {
    // 1) JSON蜀・・ "data:image/..." 繧呈怙蜆ｪ蜈医〒讀懃ｴ｢
    const dig = (v:any): string | null => {
      if (!v) return null;
      if (typeof v === 'string' && v.startsWith('data:image/')) return v;
      if (Array.isArray(v)) for (const x of v) { const r = dig(x); if (r) return r; }
      if (typeof v === 'object') for (const k of Object.keys(v)) { const r = dig(v[k]); if (r) return r; }
      return null;
    };
    const fromDataUrl = dig(data);
    if (fromDataUrl) return fromDataUrl;

    // 2) savedImages・磯・蛻励・ {url|path} 繧貞━蜈茨ｼ・
    const saved = data?.savedImages;
    if (Array.isArray(saved) && saved.length > 0) {
      const first = saved.find((s:any) => typeof s?.url === 'string' || typeof s?.path === 'string');
      if (first?.url) return toAbsUrl(first.url);
      if (first?.path) return toAbsUrl(first.path);
    }

    // 3) imagePath・域枚蟄怜・ or 驟榊・・・
    if (typeof data?.imagePath === 'string') return toAbsUrl(data.imagePath);
    if (Array.isArray(data?.imagePath) && data.imagePath.length > 0) {
      const firstPath = data.imagePath.find((p:string) => typeof p === 'string');
      if (firstPath) return toAbsUrl(firstPath);
    }
    return null;
  }

  // 蛟狗･ｨ蜊ｰ蛻ｷ逕ｨHTML逕滓・
  const generateReportPrintHTML = (reportData: any, imageUrl: string | null): string => {
    const imageSection = imageUrl
      ? `<div class="image-section">
           <h3>謨・囿邂・園逕ｻ蜒・/h3>
           <img class="report-img" src="${imageUrl}" alt="謨・囿逕ｻ蜒・ />
         </div>`
      : '';

    return `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>繝√Ε繝・ヨ繧ｨ繧ｯ繧ｹ繝昴・繝亥ｱ蜻頑嶌蜊ｰ蛻ｷ</title>
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
        <h1>繝√Ε繝・ヨ繧ｨ繧ｯ繧ｹ繝昴・繝亥ｱ蜻頑嶌</h1>

        <div class="report-section">
          <h3>蝓ｺ譛ｬ諠・ｱ</h3>
          <table>
            <tr><th>蝣ｱ蜻頑嶌ID</th><td>${reportData.reportId || '-'}</td></tr>
            <tr><th>讖滓｢ｰID</th><td>${reportData.machineId || '-'}</td></tr>
            <tr><th>讖溽ｨｮ</th><td>${reportData.machineType || '-'}</td></tr>
            <tr><th>讖滓｢ｰ逡ｪ蜿ｷ</th><td>${reportData.machineNumber || '-'}</td></tr>
            <tr><th>譌･莉・/th><td>${reportData.date || '-'}</td></tr>
            <tr><th>蝣ｴ謇</th><td>${reportData.location || '-'}</td></tr>
          </table>
        </div>

        <div class="report-section">
          <h3>莠玖ｱ｡隧ｳ邏ｰ</h3>
          <table>
            <tr><th>莠玖ｱ｡繧ｿ繧､繝医Ν</th><td>${reportData.incidentTitle || '-'}</td></tr>
            <tr><th>莠玖ｱ｡隱ｬ譏・/th><td>${reportData.problemDescription || '-'}</td></tr>
            <tr><th>謨・囿繧ｳ繝ｼ繝・/th><td>${reportData.failureCode || '-'}</td></tr>
            <tr><th>繧ｹ繝・・繧ｿ繧ｹ</th><td>${reportData.status || '-'}</td></tr>
            <tr><th>諡・ｽ薙お繝ｳ繧ｸ繝九い</th><td>${reportData.engineer || '-'}</td></tr>
          </table>
        </div>

        <div class="report-section">
          <h3>謚ｽ蜃ｺ諠・ｱ</h3>
          <table>
            <tr><th>蠖ｱ髻ｿ繧ｳ繝ｳ繝昴・繝阪Φ繝・/th><td>${Array.isArray(reportData.extractedComponents) ? reportData.extractedComponents.join(', ') : '-'}</td></tr>
            <tr><th>逞・憾</th><td>${Array.isArray(reportData.extractedSymptoms) ? reportData.extractedSymptoms.join(', ') : '-'}</td></tr>
            <tr><th>蜿ｯ閭ｽ諤ｧ縺ｮ縺ゅｋ讖溽ｨｮ</th><td>${Array.isArray(reportData.possibleModels) ? reportData.possibleModels.join(', ') : '-'}</td></tr>
          </table>
        </div>

        ${imageSection}

        <div class="report-section">
          <h3>蛯呵・/h3>
          <p>${reportData.notes || '-'}</p>
        </div>

        <div class="report-section">
          <h3>菫ｮ郢穂ｺ亥ｮ・/h3>
          <table>
            <tr><th>莠亥ｮ壽怦譌･</th><td>${reportData.repairSchedule || '-'}</td></tr>
            <tr><th>蝣ｴ謇</th><td>${reportData.repairLocation || '-'}</td></tr>
          </table>
        </div>
      </body>
      </html>
    `;
  };

  // 蛟狗･ｨ蜊ｰ蛻ｷ螳溯｡・
  const printReport = (reportData: any, imageUrl: string | null) => {
    const w = window.open('', '_blank', 'noopener,noreferrer');
    if (!w) return;

    const contentHTML = generateReportPrintHTML(reportData, imageUrl);
    w.document.write(contentHTML);
    w.document.close();

    // 蜊ｰ蛻ｷ繝繧､繧｢繝ｭ繧ｰ繧定｡ｨ遉ｺ
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
 蝣ｱ蜻頑嶌

莠玖ｱ｡讎りｦ・
莠玖ｱ｡繧ｿ繧､繝医Ν: ${reportData.incidentTitle}
蝣ｱ蜻頑嶌ID: ${reportData.reportId}
讖滓｢ｰID: ${reportData.machineId}
譌･莉・ ${reportData.date}
蝣ｴ謇: ${reportData.location}
謨・囿繧ｳ繝ｼ繝・ ${reportData.failureCode}

莠玖ｱ｡隧ｳ邏ｰ:
隱ｬ譏・ ${reportData.problemDescription}
繧ｹ繝・・繧ｿ繧ｹ: ${reportData.status}
諡・ｽ薙お繝ｳ繧ｸ繝九い: ${reportData.engineer}
蛯呵・ ${reportData.notes}

謚ｽ蜃ｺ諠・ｱ:
蠖ｱ髻ｿ繧ｳ繝ｳ繝昴・繝阪Φ繝・ ${reportData.extractedComponents.join(', ')}
逞・憾: ${reportData.extractedSymptoms.join(', ')}
蜿ｯ閭ｽ諤ｧ縺ｮ縺ゅｋ讖溽ｨｮ: ${reportData.possibleModels.join(', ')}

菫ｮ郢穂ｺ亥ｮ・
莠亥ｮ壽怦譌･: ${reportData.repairSchedule}
蝣ｴ謇: ${reportData.repairLocation}

繝√Ε繝・ヨ螻･豁ｴ:
${(data.conversationHistory || data.chatData?.messages || []).map((msg: any) => 
  `${msg.isAiResponse ? 'AI' : '繝ｦ繝ｼ繧ｶ繝ｼ'}: ${msg.content}`
).join('\n')}
    `;

    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `蝣ｱ蜻頑嶌_${reportData.incidentTitle}_${reportData.date}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const currentData = editedData; // 蟶ｸ縺ｫ邱ｨ髮・ョ繝ｼ繧ｿ繧剃ｽｿ逕ｨ



  // return()縺ｮ逶ｴ蜑阪↓霑ｽ蜉
  const imgSrc = getImageSrc(data);
  console.log('[chat-export] final imgSrc:', imgSrc && imgSrc.slice(0, 60));

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* 繝倥ャ繝繝ｼ */}
        <div className="flex justify-between items-center mb-6">
                      <h1 className="text-3xl font-bold text-center flex-1">蝣ｱ蜻頑嶌</h1>
          <div className="flex gap-2">
            {!isEditing ? (
              <>
                <Button onClick={handleEdit} variant="outline" className="flex items-center gap-2">
                  <Edit className="h-4 w-4" />
                  繝ｬ繝昴・繝育ｷｨ髮・
                </Button>
                {diff.length > 0 && (
                  <Button 
                    onClick={() => setShowDiff(!showDiff)} 
                    variant="outline" 
                    className="flex items-center gap-2"
                  >
                    <span className="text-sm">蟾ｮ蛻・｡ｨ遉ｺ ({diff.length})</span>
                  </Button>
                )}
                <Button onClick={() => {
                  printReport(currentData, imgSrc);
                }} variant="outline" className="flex items-center gap-2">
                  <Printer className="h-4 w-4" />
                  蜊ｰ蛻ｷ
                </Button>
                <Button onClick={downloadReport} variant="outline" className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  繝繧ｦ繝ｳ繝ｭ繝ｼ繝・
                </Button>
                <Button onClick={onClose} variant="outline">
                  髢峨§繧・
                </Button>
              </>
            ) : (
              <>
                <Button onClick={handleSave} className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  菫晏ｭ・
                </Button>
                <Button onClick={handleCancel} variant="outline" className="flex items-center gap-2">
                  <X className="h-4 w-4" />
                  繧ｭ繝｣繝ｳ繧ｻ繝ｫ
                </Button>
                <Button onClick={onClose} variant="outline">
                  髢峨§繧・
                </Button>
              </>
            )}
          </div>
        </div>

        {/* 蟾ｮ蛻・｡ｨ遉ｺ */}
        {showDiff && diff.length > 0 && (
          <Card className="mb-6 border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-orange-800 flex items-center gap-2">
                <span>統 邱ｨ髮・・螳ｹ縺ｮ蟾ｮ蛻・({diff.length}莉ｶ)</span>
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
                  庁 荳願ｨ倥・螟画峩蜀・ｮｹ縺ｯ菫晏ｭ倥・繧ｿ繝ｳ繧呈款縺吶∪縺ｧ遒ｺ螳壹＆繧後∪縺帙ｓ縲・
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 莠玖ｱ｡讎りｦ・*/}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">莠玖ｱ｡讎りｦ・/CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="font-medium">莠玖ｱ｡繧ｿ繧､繝医Ν:</span>
              <Input
                value={currentData.incidentTitle}
                onChange={(e) => handleInputChange('incidentTitle', e.target.value)}
                className="mt-1"
                disabled={!isEditing}
                placeholder="逋ｺ逕溘＠縺滉ｺ玖ｱ｡縺ｮ繧ｿ繧､繝医Ν"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex justify-between">
                <span className="font-medium">蝣ｱ蜻頑嶌ID:</span>
                <Input
                  value={currentData.reportId}
                  onChange={(e) => handleInputChange('reportId', e.target.value)}
                  className="w-32"
                  disabled={!isEditing}
                />
              </div>
              <div className="flex justify-between">
                <span className="font-medium">讖滓｢ｰID:</span>
                <Input
                  value={currentData.machineId}
                  onChange={(e) => handleInputChange('machineId', e.target.value)}
                  className="w-32"
                  disabled={!isEditing}
                />
              </div>
              <div className="flex justify-between">
                <span className="font-medium">讖溽ｨｮ:</span>
                <Input
                  value={currentData.machineType}
                  onChange={(e) => handleInputChange('machineType', e.target.value)}
                  className="w-32"
                  disabled={!isEditing}
                  placeholder="讖溽ｨｮ蜷・
                />
              </div>
              <div className="flex justify-between">
                <span className="font-medium">讖滓｢ｰ逡ｪ蜿ｷ:</span>
                <Input
                  value={currentData.machineNumber}
                  onChange={(e) => handleInputChange('machineNumber', e.target.value)}
                  className="w-32"
                  disabled={!isEditing}
                  placeholder="讖滓｢ｰ逡ｪ蜿ｷ"
                />
              </div>
              <div className="flex justify-between">
                <span className="font-medium">譌･莉・</span>
                <Input
                  type="date"
                  value={currentData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  className="w-32"
                  disabled={!isEditing}
                />
              </div>
              <div className="flex justify-between">
                <span className="font-medium">蝣ｴ謇:</span>
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

        {/* 莠玖ｱ｡隧ｳ邏ｰ */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">莠玖ｱ｡隧ｳ邏ｰ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="font-medium">莠玖ｱ｡隱ｬ譏・</span>
              <Textarea
                value={currentData.problemDescription}
                onChange={(e) => handleInputChange('problemDescription', e.target.value)}
                className="mt-1"
                rows={3}
                disabled={!isEditing}
                placeholder="莠玖ｱ｡縺ｮ隧ｳ邏ｰ縺ｪ隱ｬ譏・
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex justify-between">
                <span className="font-medium">繧ｹ繝・・繧ｿ繧ｹ:</span>
                <Input
                  value={currentData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-48"
                  disabled={!isEditing}
                />
              </div>
              <div className="flex justify-between">
                <span className="font-medium">諡・ｽ薙お繝ｳ繧ｸ繝九い:</span>
                <Input
                  value={currentData.engineer}
                  onChange={(e) => handleInputChange('engineer', e.target.value)}
                  className="w-32"
                  disabled={!isEditing}
                />
              </div>
            </div>
            <div>
              <span className="font-medium">蛯呵・</span>
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

        {/* 謚ｽ蜃ｺ諠・ｱ */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">謚ｽ蜃ｺ諠・ｱ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="font-medium">蠖ｱ髻ｿ繧ｳ繝ｳ繝昴・繝阪Φ繝・</span>
              <Input
                value={currentData.extractedComponents.join(', ')}
                onChange={(e) => handleInputChange('extractedComponents', e.target.value.split(', ').filter(s => s.trim()))}
                className="mt-1"
                disabled={!isEditing}
                placeholder="繧ｨ繝ｳ繧ｸ繝ｳ, 繝悶Ξ繝ｼ繧ｭ, 豐ｹ蝨ｧ邉ｻ邨ｱ"
              />
            </div>
            <div>
              <span className="font-medium">逞・憾:</span>
              <Input
                value={currentData.extractedSymptoms.join(', ')}
                onChange={(e) => handleInputChange('extractedSymptoms', e.target.value.split(', ').filter(s => s.trim()))}
                className="mt-1"
                disabled={!isEditing}
                placeholder="繧ｨ繝ｳ繧ｸ繝ｳ蛛懈ｭ｢, 逡ｰ髻ｳ, 豐ｹ蝨ｧ貍上ｌ"
              />
            </div>
            <div>
              <span className="font-medium">蜿ｯ閭ｽ諤ｧ縺ｮ縺ゅｋ讖溽ｨｮ:</span>
              <Input
                value={currentData.possibleModels.join(', ')}
                onChange={(e) => handleInputChange('possibleModels', e.target.value.split(', ').filter(s => s.trim()))}
                className="mt-1"
                disabled={!isEditing}
                placeholder="MT-100蝙・ MR-400繧ｷ繝ｪ繝ｼ繧ｺ"
              />
            </div>
          </CardContent>
        </Card>

        {/* 菫ｮ郢穂ｺ亥ｮ・*/}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">菫ｮ郢穂ｺ亥ｮ・/CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex justify-between">
                <span className="font-medium">莠亥ｮ壽怦譌･:</span>
                <Input
                  value={currentData.repairSchedule}
                  onChange={(e) => handleInputChange('repairSchedule', e.target.value)}
                  className="w-32"
                  disabled={!isEditing}
                />
              </div>
              <div className="flex justify-between">
                <span className="font-medium">蝣ｴ謇:</span>
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

        {/* 謨・囿邂・園逕ｻ蜒・*/}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">謨・囿邂・園逕ｻ蜒・/CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">讖滓｢ｰ謨・囿邂・園縺ｮ逕ｻ蜒・/p>
            {imgSrc ? (
              <img
                key={imgSrc.slice(0, 64)}
                src={imgSrc}
                alt="謨・囿邂・園逕ｻ蜒・
                style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div className="text-center text-gray-500">逕ｻ蜒上′縺ゅｊ縺ｾ縺帙ｓ</div>
            )}
            <p className="text-sm text-gray-600 mt-4">荳願ｨ倥・謨・囿邂・園縺ｮ蜀咏悄縺ｧ縺吶・/p>
          </CardContent>
        </Card>

        {/* 繝√Ε繝・ヨ螻･豁ｴ繧ｵ繝槭Μ繝ｼ */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">繝√Ε繝・ヨ螻･豁ｴ繧ｵ繝槭Μ繝ｼ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span>繧ｨ繧ｯ繧ｹ繝昴・繝域律譎・ {formatDate(data.exportTimestamp)}</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-gray-500" />
                <span>繝｡繝・そ繝ｼ繧ｸ謨ｰ: {data.metadata?.total_messages || data.chatData?.messages?.length || 0}莉ｶ</span>
              </div>
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-gray-500" />
                <span>逕ｻ蜒乗焚: {data.savedImages?.length || 0}莉ｶ</span>
              </div>
            </div>
            
            {/* 讖溽ｨｮ繝ｻ讖滓｢ｰ逡ｪ蜿ｷ諠・ｱ */}
            {(data.machineType || data.machineNumber) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-3 bg-blue-50 rounded-lg">
                {data.machineType && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">讖溽ｨｮ:</span>
                    <span>{data.machineType}</span>
                  </div>
                )}
                {data.machineNumber && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">讖滓｢ｰ逡ｪ蜿ｷ:</span>
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
                      {message.isAiResponse ? 'AI' : '繝ｦ繝ｼ繧ｶ繝ｼ'}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {formatDate(message.timestamp || message.createdAt)}
                    </span>
                  </div>
                  <div className="mt-1">
                    {isImageMessage(message.content) ? (
                      <div className="flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">逕ｻ蜒上Γ繝・そ繝ｼ繧ｸ</span>
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

        {/* 繝輔ャ繧ｿ繝ｼ */}
        <div className="text-center text-sm text-gray-500 py-4">
          ﾂｩ 2025 蝣ｱ蜻頑嶌. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default ChatExportReport;
