import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Edit, Save, X, Printer, Image as ImageIcon } from 'lucide-react';

// 逶ｸ蟇ｾURL繧堤ｵｶ蟇ｾURL縺ｫ螟画鋤
const toAbsUrl = (url: string): string => {
  console.log('売 toAbsUrl input:', url);
  if (url.startsWith('data:') || url.startsWith('http')) {
    console.log('売 toAbsUrl output (absolute):', url);
    return url;
  }
  const result = `${window.location.origin}${url.startsWith('/') ? url : `/${url}`}`;
  console.log('売 toAbsUrl output (converted):', result);
  return result;
};

// 逕ｻ蜒上ｒ蜿朱寔・・ase64蜆ｪ蜈医∫┌縺代ｌ縺ｰ驟堺ｿ｡URL縺ｸ繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ・・
const collectImages = (data: any): Array<{ id: string; url: string; fileName: string; description?: string }> => {
  const images: Array<{ id: string; url: string; fileName: string; description?: string }> = [];
  
  // 1) conversationHistory 縺九ｉ base64 逕ｻ蜒上ｒ謗｢縺呻ｼ域怙蜆ｪ蜈茨ｼ・
  if (data?.conversationHistory && Array.isArray(data.conversationHistory)) {
    console.log('剥 conversationHistory 縺九ｉ base64 逕ｻ蜒上ｒ讀懃ｴ｢荳ｭ...');
    data.conversationHistory.forEach((message: any, messageIndex: number) => {
      if (message?.content && typeof message.content === 'string' && message.content.startsWith('data:image/')) {
        // base64譁・ｭ怜・縺ｮ豁｣隕丞喧・域隼陦碁勁蜴ｻ縲∝・隗貞ｼ慕畑隨ｦ髯､蜴ｻ・・
        let normalizedContent = message.content
          .replace(/\r?\n/g, '') // 謾ｹ陦碁勁蜴ｻ
          .replace(/[""]/g, '"') // 蜈ｨ隗貞ｼ慕畑隨ｦ繧貞濠隗偵↓螟画鋤
          .trim();
        
        console.log(`名・・Base64 逕ｻ蜒冗匱隕・(message ${messageIndex}):`, {
          messageId: message.id,
          contentLength: normalizedContent.length,
          startsWithData: normalizedContent.startsWith('data:image/'),
          hasNewlines: normalizedContent.includes('\n'),
          hasFullWidthQuotes: /[""]/.test(normalizedContent)
        });
        
        images.push({
          id: `base64-${messageIndex}`,
          url: normalizedContent,
          fileName: `莨夊ｩｱ逕ｻ蜒・{messageIndex + 1}`,
          description: '謨・囿邂・園逕ｻ蜒擾ｼ・ase64・・
        });
      }
    });
  }
  
  // 2) savedImages 縺九ｉ驟堺ｿ｡URL繧貞叙蠕暦ｼ・ase64縺後↑縺・ｴ蜷医・繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ・・
  if (data?.savedImages && Array.isArray(data.savedImages)) {
    console.log('剥 savedImages found:', data.savedImages);
    data.savedImages.forEach((item: any, index: number) => {
      console.log(`剥 savedImages[${index}] 隧ｳ邏ｰ:`, {
        messageId: item.messageId,
        fileName: item.fileName,
        path: item.path,
        url: item.url,
        hasPath: !!item.path,
        hasUrl: !!item.url
      });
      
      // 蜆ｪ蜈磯・ｽ・ path > url
      let imageUrl: string | null = null;
      
      if (item?.path) {
        // Windows邨ｶ蟇ｾ繝代せ縺ｮ蝣ｴ蜷医・繝輔ぃ繧､繝ｫ蜷阪・縺ｿ繧呈歓蜃ｺ
        if (item.path.includes('\\') && item.path.includes('chat-exports')) {
          const fileName = item.path.split('\\').pop();
          if (fileName) {
            imageUrl = `/api/images/chat-exports/${fileName}`;
            console.log(`売 Windows邨ｶ蟇ｾ繝代せ繧貞､画鋤:`, {
              originalPath: item.path,
              fileName: fileName,
              newUrl: imageUrl
            });
          }
        }
      }
      
      // path 縺九ｉ蜿門ｾ励〒縺阪↑縺・ｴ蜷医・ url 繧剃ｽｿ逕ｨ
      if (!imageUrl && item?.url) {
        imageUrl = item.url;
        console.log(`売 savedImages.url 繧剃ｽｿ逕ｨ:`, imageUrl);
      }
      
      if (imageUrl) {
        const absoluteUrl = toAbsUrl(imageUrl);
        console.log(`名・・Image ${index}:`, {
          originalUrl: item.url,
          originalPath: item.path,
          convertedUrl: imageUrl,
          absoluteUrl: absoluteUrl,
          fileName: item.fileName
        });
        
        images.push({
          id: `saved-${index}`,
          url: absoluteUrl,
          fileName: item.fileName || `菫晏ｭ倡判蜒・{index + 1}`,
          description: '謨・囿邂・園逕ｻ蜒擾ｼ磯・菫｡URL・・
        });
      } else {
        console.log(`笞・・savedImages[${index}] 縺九ｉ逕ｻ蜒酋RL繧貞叙蠕励〒縺阪∪縺帙ｓ縺ｧ縺励◆:`, item);
      }
    });
  }
  
  // 3) imagePath 繧呈爾縺呻ｼ域怙蠕後・繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ・・
  if (data?.imagePath) {
    const imagePaths = Array.isArray(data.imagePath) ? data.imagePath : [data.imagePath];
    imagePaths.forEach((path: string, index: number) => {
      if (path) {
        images.push({
          id: `path-${index}`,
          url: toAbsUrl(path),
          fileName: `逕ｻ蜒・{index + 1}`,
          description: '謨・囿邂・園逕ｻ蜒擾ｼ医ヱ繧ｹ・・
        });
      }
    });
  }
  
  console.log(`投 逕ｻ蜒丞庶髮・ｮ御ｺ・ ${images.length}蛟九・逕ｻ蜒上ｒ逋ｺ隕義, {
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
  // 繧ｨ繧ｯ繧ｹ繝昴・繝・SON繝輔ぃ繧､繝ｫ縺ｮ逕溘ョ繝ｼ繧ｿ繝輔ぅ繝ｼ繝ｫ繝・
  savedImages?: Array<{
    messageId: number;
    fileName: string;
    path: string;
    url: string;
  }>;
  conversationHistory?: any[];
  originalChatData?: any;
  [key: string]: any; // 縺昴・莉悶・繝輔ぅ繝ｼ繝ｫ繝峨ｂ險ｱ蜿ｯ
}

interface MachineFailureReportProps {
  data: MachineFailureReportData;
  onClose: () => void;
  onSave?: (reportData: MachineFailureReportData) => void;
}

// 逕ｻ蜒丞叙蠕励・蜈ｱ騾夐未謨ｰ・育ｷｨ髮・ｯｾ雎｡繝輔ぃ繧､繝ｫ蜀・・縺ｿ縺ｧ螳檎ｵ撰ｼ・
function pickFirstImage(data: any): string | null {
  // 1) 逶ｴ荳・or 繝阪せ繝磯・蛻励↓ dataURL 縺後≠繧後・蜆ｪ蜈・
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

// 蜊ｰ蛻ｷ逕ｨCSS
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
  /* 逕ｻ髱｢繝励Ξ繝薙Η繝ｼ逕ｨ・壼魂蛻ｷ蟆ら畑繧ｦ繧｣繝ｳ繝峨え縺ｧ縺ｯ譛蟆城剞縺ｧOK */
  img.thumb { width: 32px; height: 32px; object-fit: cover; border: 1px solid #ddd; border-radius: 4px; }
  .report-img { max-width: 100%; height: auto; }
</style>
`;

// 蛟狗･ｨ蜊ｰ蛻ｷ逕ｨHTML逕滓・・育樟蝨ｨ縺ｮUI繝輔か繝ｼ繝槭ャ繝医→螳悟・縺ｫ蜷後§・・
const generateReportPrintHTML = (reportData: any, images: Array<{ id: string; url: string; fileName: string; description?: string }>): string => {
  const imageSection = images && images.length > 0 
    ? `<div class="image-section">
         <h3>謨・囿邂・園逕ｻ蜒・/h3>
         ${images.map((image, index) => `
           <div class="image-item" style="margin-bottom: 15px; page-break-inside: avoid;">
             <img class="report-img" src="${image.url}" alt="謨・囿逕ｻ蜒・{index + 1}" style="max-width: 100%; max-height: 150px; border: 1px solid #ccc; border-radius: 3px; object-fit: contain;" />
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
      <title>讖滓｢ｰ謨・囿蝣ｱ蜻頑嶌 - 蜊ｰ蛻ｷ</title>
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
          <h1>讖滓｢ｰ謨・囿蝣ｱ蜻頑嶌</h1>
          <p>蜊ｰ蛻ｷ譌･譎・ ${new Date().toLocaleString('ja-JP')}</p>
        </div>
        
        <div class="section">
          <h2>蝣ｱ蜻頑ｦりｦ・/h2>
          <div class="info-grid">
            <div class="info-item">
              <strong>蝣ｱ蜻頑嶌ID</strong>
              <span>${reportData.reportId || reportData.id || '-'}</span>
            </div>
            <div class="info-item">
              <strong>讖溽ｨｮ</strong>
              <span>${reportData.machineType || reportData.machineTypeName || '-'}</span>
            </div>
            <div class="info-item">
              <strong>讖滓｢ｰ逡ｪ蜿ｷ</strong>
              <span>${reportData.machineNumber || '-'}</span>
            </div>
            <div class="info-item">
              <strong>譌･莉・/strong>
              <span>${reportData.date || reportData.timestamp || reportData.createdAt ? new Date(reportData.createdAt).toLocaleDateString('ja-JP') : '-'}</span>
            </div>
            <div class="info-item">
              <strong>蝣ｴ謇</strong>
              <span>${reportData.location || '-'}</span>
            </div>
          </div>
      </div>

        <div class="section">
          <h2>謨・囿隧ｳ邏ｰ</h2>
          <div class="info-grid">
            <div class="info-item">
              <strong>繧ｹ繝・・繧ｿ繧ｹ</strong>
              <span>${reportData.status || '-'}</span>
            </div>
            <div class="info-item">
              <strong>雋ｬ莉ｻ閠・/strong>
              <span>${reportData.engineer || '-'}</span>
            </div>
      </div>

          <div class="content-box">
            <strong>隱ｬ譏・/strong>
            <p>${reportData.problemDescription || reportData.description || reportData.incidentTitle || reportData.title || '隱ｬ譏弱↑縺・}</p>
          </div>

          <div class="content-box">
            <strong>蛯呵・/strong>
        <p>${reportData.notes || '-'}</p>
          </div>
      </div>

        ${imageSection}
        
        <div class="section">
          <h2>菫ｮ郢穂ｺ亥ｮ・/h2>
          <div class="info-grid">
            <div class="info-item">
              <strong>萓晞ｼ譛域律</strong>
              <span>${reportData.requestDate || '-'}</span>
            </div>
            <div class="info-item">
              <strong>莠亥ｮ壽怦譌･</strong>
              <span>${reportData.repairSchedule || '-'}</span>
            </div>
            <div class="info-item">
              <strong>蝣ｴ謇</strong>
              <span>${reportData.repairLocation || '-'}</span>
            </div>
          </div>
        </div>
        
        <div class="footer">
          <p>ﾂｩ 2025 讖滓｢ｰ謨・囿蝣ｱ蜻頑嶌. All rights reserved.</p>
        </div>
      </div>
      
      <div class="no-print" style="position: fixed; top: 20px; right: 20px; z-index: 1000;">
        <button onclick="window.print()" style="padding: 10px 20px; margin: 5px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">蜊ｰ蛻ｷ</button>
        <button onclick="window.close()" style="padding: 10px 20px; margin: 5px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer;">髢峨§繧・/button>
      </div>
    </body>
    </html>
  `;
};

// 蛟狗･ｨ蜊ｰ蛻ｷ螳溯｡・
const printReport = (reportData: any, images: Array<{ id: string; url: string; fileName: string; description?: string }>) => {
  const w = window.open('', '_blank', 'noopener,noreferrer');
  if (!w) return;
  
  const contentHTML = generateReportPrintHTML(reportData, images);
  w.document.write(contentHTML);
  w.document.close();
  
  // 蜊ｰ蛻ｷ繝繧､繧｢繝ｭ繧ｰ繧定｡ｨ遉ｺ
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

  // 繝・・繧ｿ縺悟､画峩縺輔ｌ縺溷ｴ蜷医∫ｷｨ髮・ョ繝ｼ繧ｿ繧よ峩譁ｰ
  useEffect(() => {
    setEditedData(data);
  }, [data]);

  // isEditing縺ｮ迥ｶ諷句､牙喧繧堤屮隕・
  useEffect(() => {
    console.log('肌 isEditing state changed:', isEditing);
  }, [isEditing]);

  const handleEdit = () => {
    console.log('肌 handleEdit called');
    console.log('肌 Current isEditing state:', isEditing);
    setIsEditing(true);
    console.log('肌 setIsEditing(true) called');
  };

  const handleSave = () => {
    // 邱ｨ髮・＆繧後◆繝・・繧ｿ繧貞・縺ｮ繝・・繧ｿ縺ｫ蜿肴丐
    const updatedData = { ...data, ...editedData };
    
    // 隕ｪ繧ｳ繝ｳ繝昴・繝阪Φ繝医↓譖ｴ譁ｰ縺輔ｌ縺溘ョ繝ｼ繧ｿ繧呈ｸ｡縺・
    if (onSave) {
      onSave(updatedData);
    }
    
    // 繧ｵ繝ｼ繝舌・縺ｫ譖ｴ譁ｰ繝ｪ繧ｯ繧ｨ繧ｹ繝医ｒ騾∽ｿ｡
    updateReportOnServer(updatedData);
    
    // 邱ｨ髮・Δ繝ｼ繝峨ｒ邨ゆｺ・
    setIsEditing(false);
    
    // 謌仙粥繝｡繝・そ繝ｼ繧ｸ繧定｡ｨ遉ｺ
    alert('繝ｬ繝昴・繝医′菫晏ｭ倥＆繧後∪縺励◆縲・);
  };

  // 繧ｵ繝ｼ繝舌・縺ｫ繝ｬ繝昴・繝医ョ繝ｼ繧ｿ繧呈峩譁ｰ
  const updateReportOnServer = async (updatedData: MachineFailureReportData) => {
    try {
      // 蜈・・繝・・繧ｿ縺九ｉID繧貞叙蠕暦ｼ・ata.id縺ｾ縺溘・data.reportId縺九ｉ・・
      const reportId = data.id || data.reportId;
      
      if (!reportId) {
        console.warn('繝ｬ繝昴・繝・D縺瑚ｦ九▽縺九ｉ縺ｪ縺・◆繧√√し繝ｼ繝舌・譖ｴ譁ｰ繧偵せ繧ｭ繝・・縺励∪縺・);
        return;
      }
      
      const response = await fetch(`/api/history/update-item/${reportId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          updatedData: {
            // 繝ｬ繝昴・繝医ョ繝ｼ繧ｿ繧貞・縺ｮJSON繝輔ぃ繧､繝ｫ縺ｮ蠖｢蠑上↓螟画鋤
            machineType: updatedData.machineType,
            machineNumber: updatedData.machineNumber,
            description: updatedData.description,
            status: updatedData.status,
            engineer: updatedData.engineer,
            notes: updatedData.notes,
            repairRequestDate: updatedData.repairRequestDate,
            repairSchedule: updatedData.repairSchedule,
            repairLocation: updatedData.repairLocation,
            // 繝ｬ繝昴・繝亥崋譛峨・繝・・繧ｿ繧ゆｿ晏ｭ・
            reportData: updatedData,
            lastUpdated: new Date().toISOString()
          },
          updatedBy: 'user'
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '繝ｬ繝昴・繝医・譖ｴ譁ｰ縺ｫ螟ｱ謨励＠縺ｾ縺励◆');
      }
      
      const result = await response.json();
      console.log('繝ｬ繝昴・繝域峩譁ｰ螳御ｺ・', result);
      
    } catch (error) {
      console.error('繝ｬ繝昴・繝域峩譁ｰ繧ｨ繝ｩ繝ｼ:', error);
      // 繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｦ繧ゅΘ繝ｼ繧ｶ繝ｼ縺ｫ縺ｯ騾夂衍縺励↑縺・ｼ医Ο繝ｼ繧ｫ繝ｫ菫晏ｭ倥・謌仙粥縺励※縺・ｋ縺溘ａ・・
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
    // 迴ｾ蝨ｨ縺ｮUI繝輔か繝ｼ繝槭ャ繝医→蜷後§繝ｬ繧､繧｢繧ｦ繝医〒蜊ｰ蛻ｷ
    const w = window.open('', '_blank', 'noopener,noreferrer');
    if (!w) return;
    
    // 迴ｾ蝨ｨ縺ｮUI繝輔か繝ｼ繝槭ャ繝医ｒ縺昴・縺ｾ縺ｾ蜊ｰ蛻ｷ逕ｨHTML縺ｫ螟画鋤
    const printHTML = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>讖滓｢ｰ謨・囿蝣ｱ蜻頑嶌 - 蜊ｰ蛻ｷ</title>
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
            <h1>讖滓｢ｰ謨・囿蝣ｱ蜻頑嶌</h1>
            <p>蜊ｰ蛻ｷ譌･譎・ ${new Date().toLocaleString('ja-JP')}</p>
          </div>
          
          <div class="section">
            <h2>蝣ｱ蜻頑ｦりｦ・/h2>
            <div class="info-grid">
              <div class="info-item">
                <strong>蝣ｱ蜻頑嶌ID</strong>
                <span>${currentData.reportId || currentData.id || '-'}</span>
              </div>
              <div class="info-item">
                <strong>讖溽ｨｮ</strong>
                <span>${currentData.machineType || currentData.machineTypeName || '-'}</span>
              </div>
              <div class="info-item">
                <strong>讖滓｢ｰ逡ｪ蜿ｷ</strong>
                <span>${currentData.machineNumber || '-'}</span>
              </div>
              <div class="info-item">
                <strong>譌･莉・/strong>
                <span>${currentData.date || currentData.timestamp || currentData.createdAt ? new Date(currentData.createdAt).toLocaleDateString('ja-JP') : '-'}</span>
              </div>
              <div class="info-item">
                <strong>蝣ｴ謇</strong>
                <span>${currentData.location || '-'}</span>
              </div>
            </div>
          </div>
          
          <div class="section">
            <h2>謨・囿隧ｳ邏ｰ</h2>
            <div class="info-grid">
              <div class="info-item">
                <strong>繧ｹ繝・・繧ｿ繧ｹ</strong>
                <span>${currentData.status || '-'}</span>
              </div>
              <div class="info-item">
                <strong>雋ｬ莉ｻ閠・/strong>
                <span>${currentData.engineer || '-'}</span>
              </div>
            </div>
            
            <div class="content-box">
              <strong>隱ｬ譏・/strong>
              <p>${currentData.problemDescription || currentData.description || currentData.incidentTitle || currentData.title || '隱ｬ譏弱↑縺・}</p>
            </div>
            
            <div class="content-box">
              <strong>蛯呵・/strong>
              <p>${currentData.notes || '-'}</p>
            </div>
          </div>
          
          ${collectedImages && collectedImages.length > 0 ? `
            <div class="image-section">
              <h3>謨・囿邂・園逕ｻ蜒・/h3>
              ${collectedImages.map((image, index) => `
                <div class="image-item" style="margin-bottom: 15px; page-break-inside: avoid;">
                  <img class="report-img" src="${image.url}" alt="謨・囿逕ｻ蜒・{index + 1}" style="max-width: 100%; max-height: 150px; border: 1px solid #ccc; border-radius: 3px; object-fit: contain;" />
                  <p style="text-align: center; margin-top: 5px; font-size: 8pt; color: #666;">${image.fileName}</p>
                </div>
              `).join('')}
            </div>
          ` : ''}
          
          <div class="section">
            <h2>菫ｮ郢穂ｺ亥ｮ・/h2>
            <div class="info-grid">
              <div class="info-item">
                <strong>萓晞ｼ譛域律</strong>
                <span>${currentData.requestDate || '-'}</span>
              </div>
              <div class="info-item">
                <strong>莠亥ｮ壽怦譌･</strong>
                <span>${currentData.repairSchedule || '-'}</span>
              </div>
              <div class="info-item">
                <strong>蝣ｴ謇</strong>
                <span>${currentData.repairLocation || '-'}</span>
              </div>
            </div>
          </div>
          
          <div class="footer">
            <p>ﾂｩ 2025 讖滓｢ｰ謨・囿蝣ｱ蜻頑嶌. All rights reserved.</p>
          </div>
        </div>
        
        <div class="no-print" style="position: fixed; top: 20px; right: 20px; z-index: 1000;">
          <button onclick="window.print()" style="padding: 10px 20px; margin: 5px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">蜊ｰ蛻ｷ</button>
          <button onclick="window.close()" style="padding: 10px 20px; margin: 5px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer;">髢峨§繧・/button>
        </div>
      </body>
      </html>
    `;
    
    w.document.write(printHTML);
    w.document.close();
    
    // 蜊ｰ蛻ｷ繝繧､繧｢繝ｭ繧ｰ繧定｡ｨ遉ｺ
    setTimeout(() => {
      w.print();
    }, 100);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 print:p-0 print:bg-white print:min-h-0 print:fixed print:inset-0 print:z-50">
      {/* 繝ｬ繝昴・繝亥ｰら畑UI - 邱ｨ髮・・蜊ｰ蛻ｷ繝ｻ菫晏ｭ俶ｩ溯・莉倥″ */}
      <div className="max-w-6xl mx-auto bg-white shadow-lg rounded-lg print:shadow-none print:max-w-none print:rounded-none print:bg-transparent print:relative print:top-0 print:left-0 print:w-full print:h-auto">
        {/* 繝倥ャ繝繝ｼ - 繧｢繧ｯ繧ｷ繝ｧ繝ｳ繝懊ち繝ｳ・亥魂蛻ｷ譎ょｮ悟・髱櫁｡ｨ遉ｺ・・*/}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 rounded-t-lg print:hidden">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">讖滓｢ｰ謨・囿蝣ｱ蜻頑嶌</h1>
            <div className="flex gap-3">
              {!isEditing ? (
                <>
                  <Button 
                    onClick={() => {
                      console.log('肌 Edit button clicked!');
                      handleEdit();
                    }} 
                    variant="outline" 
                    className="flex items-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    邱ｨ髮・
                  </Button>
                  <Button onClick={handlePrint} variant="outline" className="flex items-center gap-2">
                    <Printer className="h-4 w-4" />
                    蜊ｰ蛻ｷ
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
                </>
              )}
            </div>
          </div>
        </div>

        {/* 蜊ｰ蛻ｷ遽・峇: 讖滓｢ｰ謨・囿蝣ｱ蜻頑嶌縺ｮ蜀・ｮｹ縺ｮ縺ｿ */}
        <div className="p-8 print:p-6 print:bg-white print:relative print:z-10">
          {/* 蜊ｰ蛻ｷ遽・峇髢句ｧ・ 讖滓｢ｰ謨・囿蝣ｱ蜻頑嶌繧ｿ繧､繝医Ν */}
          <div className="text-center mb-8 print:mb-6 print:relative print:z-20">
            <h2 className="text-3xl font-bold text-gray-900 print:text-2xl">讖滓｢ｰ謨・囿蝣ｱ蜻頑嶌</h2>
          </div>

          {/* 蜊ｰ蛻ｷ遽・峇: 繝｡繧､繝ｳ繧ｳ繝ｳ繝・Φ繝・- 2蛻励Ξ繧､繧｢繧ｦ繝・*/}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8 print:gap-6 print:mb-6">
            {/* 蟾ｦ蛻・ 蝣ｱ蜻頑ｦりｦ・*/}
            <div className="space-y-6 print:space-y-4">
              {/* 蝣ｱ蜻頑ｦりｦ√き繝ｼ繝・*/}
              <Card className="print:shadow-none print:border print:border-gray-300 print:bg-white">
                <CardHeader className="pb-4 print:pb-3">
                  <CardTitle className="text-xl font-semibold text-gray-900 print:text-lg">蝣ｱ蜻頑ｦりｦ・/CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 print:space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">蝣ｱ蜻頑嶌ID:</span>
                    {isEditing ? (
                      <Input
                        value={currentData.reportId}
                        onChange={(e) => handleInputChange('reportId', e.target.value)}
                        className="w-48 text-left font-mono print:hidden"
                        placeholder="蝣ｱ蜻頑嶌ID繧貞・蜉・
                      />
                    ) : (
                      <span className="font-mono text-gray-900">{currentData.reportId}</span>
                    )}
                    {/* 蜊ｰ蛻ｷ譎ら畑縺ｮ陦ｨ遉ｺ・育ｷｨ髮・Δ繝ｼ繝画凾縺ｯ髱櫁｡ｨ遉ｺ・・*/}
                    {isEditing && (
                      <span className="font-mono text-gray-900 print:block hidden">{currentData.reportId}</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">讖溽ｨｮ:</span>
                    {isEditing ? (
                      <Input
                        value={currentData.machineType || currentData.originalChatData?.machineInfo?.machineTypeName || ''}
                        onChange={(e) => handleInputChange('machineType', e.target.value)}
                        className="w-48 text-left print:hidden"
                        placeholder="萓・ MC300"
                      />
                    ) : (
                      <span className="text-gray-900">{currentData.machineType || currentData.originalChatData?.machineInfo?.machineTypeName || '譛ｪ險ｭ螳・}</span>
                    )}
                    {/* 蜊ｰ蛻ｷ譎ら畑縺ｮ陦ｨ遉ｺ・育ｷｨ髮・Δ繝ｼ繝画凾縺ｯ髱櫁｡ｨ遉ｺ・・*/}
                    {isEditing && (
                      <span className="text-gray-900 print:block hidden">{currentData.machineType || currentData.originalChatData?.machineInfo?.machineTypeName || '譛ｪ險ｭ螳・}</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">讖滓｢ｰ逡ｪ蜿ｷ:</span>
                    {isEditing ? (
                      <Input
                        value={currentData.machineNumber || currentData.originalChatData?.machineInfo?.machineNumber || ''}
                        onChange={(e) => handleInputChange('machineNumber', e.target.value)}
                        className="w-48 text-left print:hidden"
                        placeholder="萓・ 200"
                      />
                    ) : (
                      <span className="text-gray-900">{currentData.machineNumber || currentData.originalChatData?.machineInfo?.machineNumber || '譛ｪ險ｭ螳・}</span>
                    )}
                    {/* 蜊ｰ蛻ｷ譎ら畑縺ｮ陦ｨ遉ｺ・育ｷｨ髮・Δ繝ｼ繝画凾縺ｯ髱櫁｡ｨ遉ｺ・・*/}
                    {isEditing && (
                      <span className="text-gray-900 print:block hidden">{currentData.machineNumber || currentData.originalChatData?.machineInfo?.machineNumber || '譛ｪ險ｭ螳・}</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">譌･莉・</span>
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
                    {/* 蜊ｰ蛻ｷ譎ら畑縺ｮ陦ｨ遉ｺ・育ｷｨ髮・Δ繝ｼ繝画凾縺ｯ髱櫁｡ｨ遉ｺ・・*/}
                    {isEditing && (
                      <span className="text-gray-900 print:block hidden">{currentData.date}</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">蝣ｴ謇:</span>
                    {isEditing ? (
                      <Input
                        value={currentData.location}
                        onChange={(e) => handleInputChange('location', e.target.value)}
                        className="w-48 text-left print:hidden"
                        placeholder="謨・囿逋ｺ逕溷ｴ謇"
                      />
                    ) : (
                      <span className="text-gray-900">{currentData.location}</span>
                    )}
                    {/* 蜊ｰ蛻ｷ譎ら畑縺ｮ陦ｨ遉ｺ・育ｷｨ髮・Δ繝ｼ繝画凾縺ｯ髱櫁｡ｨ遉ｺ・・*/}
                    {isEditing && (
                      <span className="text-gray-900 print:block hidden">{currentData.location}</span>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 菫ｮ郢穂ｺ亥ｮ壹き繝ｼ繝・*/}
              <Card className="print:shadow-none print:border print:border-gray-300 print:bg-white">
                <CardHeader className="pb-4 print:pb-3">
                  <CardTitle className="text-xl font-semibold text-gray-900 print:text-lg">菫ｮ郢穂ｺ亥ｮ・/CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 print:space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">萓晞ｼ譛域律:</span>
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
                    {/* 蜊ｰ蛻ｷ譎ら畑縺ｮ陦ｨ遉ｺ・育ｷｨ髮・Δ繝ｼ繝画凾縺ｯ髱櫁｡ｨ遉ｺ・・*/}
                    {isEditing && (
                      <span className="text-gray-900 print:block hidden">{currentData.repairRequestDate}</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">莠亥ｮ壽怦譌･:</span>
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
                    {/* 蜊ｰ蛻ｷ譎ら畑縺ｮ陦ｨ遉ｺ・育ｷｨ髮・Δ繝ｼ繝画凾縺ｯ髱櫁｡ｨ遉ｺ・・*/}
                    {isEditing && (
                      <span className="text-gray-900 print:block hidden">{currentData.repairSchedule}</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">蝣ｴ謇:</span>
                    {isEditing ? (
                      <Input
                        value={currentData.repairLocation}
                        onChange={(e) => handleInputChange('repairLocation', e.target.value)}
                        className="w-48 text-left print:hidden"
                        placeholder="菫ｮ郢穂ｺ亥ｮ壼ｴ謇"
                      />
                    ) : (
                      <span className="text-gray-900">{currentData.repairLocation}</span>
                    )}
                    {/* 蜊ｰ蛻ｷ譎ら畑縺ｮ陦ｨ遉ｺ・育ｷｨ髮・Δ繝ｼ繝画凾縺ｯ髱櫁｡ｨ遉ｺ・・*/}
                    {isEditing && (
                      <span className="text-gray-900 print:block hidden">{currentData.repairLocation}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 蜿ｳ蛻・ 謨・囿隧ｳ邏ｰ */}
            <div className="space-y-6 print:space-y-4">
              {/* 謨・囿隧ｳ邏ｰ繧ｫ繝ｼ繝・*/}
              <Card className="print:shadow-none print:border print:border-gray-300 print:bg-white">
                <CardHeader className="pb-4 print:pb-3">
                  <CardTitle className="text-xl font-semibold text-gray-900 print:text-lg">謨・囿隧ｳ邏ｰ</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 print:space-y-3">
                  <div>
                    <span className="font-medium text-gray-700 block mb-2 print:mb-1">隱ｬ譏・</span>
                    {isEditing ? (
                      <Textarea
                        value={currentData.description || currentData.problemDescription || ''}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        className="w-full h-24 print:hidden"
                        rows={4}
                        placeholder="謨・囿縺ｮ隧ｳ邏ｰ縺ｪ隱ｬ譏弱ｒ蜈･蜉帙＠縺ｦ縺上□縺輔＞"
                      />
                    ) : (
                      <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded border print:bg-white">{currentData.description || currentData.problemDescription || '隱ｬ譏弱↑縺・}</p>
                    )}
                    {/* 蜊ｰ蛻ｷ譎ら畑縺ｮ陦ｨ遉ｺ・育ｷｨ髮・Δ繝ｼ繝画凾縺ｯ髱櫁｡ｨ遉ｺ・・*/}
                    {isEditing && (
                      <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded border print:bg-white print:block hidden">{currentData.description || currentData.problemDescription || '隱ｬ譏弱↑縺・}</p>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">繧ｹ繝・・繧ｿ繧ｹ:</span>
                    {isEditing ? (
                      <Input
                        value={currentData.status}
                        onChange={(e) => handleInputChange('status', e.target.value)}
                        className="w-48 text-left print:hidden"
                        placeholder="萓・ 隱ｿ譟ｻ荳ｭ"
                      />
                    ) : (
                      <span className="text-gray-900">{currentData.status}</span>
                    )}
                    {/* 蜊ｰ蛻ｷ譎ら畑縺ｮ陦ｨ遉ｺ・育ｷｨ髮・Δ繝ｼ繝画凾縺ｯ髱櫁｡ｨ遉ｺ・・*/}
                    {isEditing && (
                      <span className="text-gray-900 print:block hidden">{currentData.status}</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">雋ｬ莉ｻ閠・</span>
                    {isEditing ? (
                      <Input
                        value={currentData.engineer}
                        onChange={(e) => handleInputChange('engineer', e.target.value)}
                        className="w-48 text-left print:hidden"
                        placeholder="雋ｬ莉ｻ閠・錐"
                      />
                    ) : (
                      <span className="text-gray-900">{currentData.engineer}</span>
                    )}
                    {/* 蜊ｰ蛻ｷ譎ら畑縺ｮ陦ｨ遉ｺ・育ｷｨ髮・Δ繝ｼ繝画凾縺ｯ髱櫁｡ｨ遉ｺ・・*/}
                    {isEditing && (
                      <span className="text-gray-900 print:block hidden">{currentData.engineer}</span>
                    )}
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 block mb-2 print:mb-1">蛯呵・</span>
                    {isEditing ? (
                      <Textarea
                        value={currentData.notes}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                        className="w-full h-24 print:hidden"
                        rows={4}
                        placeholder="霑ｽ蜉縺ｮ蛯呵・ｺ矩・ｒ蜈･蜉帙＠縺ｦ縺上□縺輔＞"
                      />
                    ) : (
                      <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded border print:bg-white">{currentData.notes}</p>
                    )}
                    {/* 蜊ｰ蛻ｷ譎ら畑縺ｮ陦ｨ遉ｺ・育ｷｨ髮・Δ繝ｼ繝画凾縺ｯ髱櫁｡ｨ遉ｺ・・*/}
                    {isEditing && (
                      <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded border print:bg-white print:block hidden">{currentData.notes}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* 蜊ｰ蛻ｷ遽・峇邨ゆｺ・ 謨・囿邂・園逕ｻ蜒上き繝ｼ繝・- 繝輔Ν蟷・*/}
          <Card className="print:shadow-none print:border print:border-gray-300 print:bg-white">
            <CardHeader className="pb-4 print:pb-3">
              <CardTitle className="text-xl font-semibold text-gray-900 print:text-lg">謨・囿邂・園逕ｻ蜒・/CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4 print:mb-3">讖滓｢ｰ謨・囿邂・園縺ｮ逕ｻ蜒・/p>
              {collectedImages && collectedImages.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 print:gap-3">
                  {collectedImages.map((image, index) => (
                    <div key={image.id} className="border rounded-lg p-3 print:break-inside-avoid print:p-2 print:bg-white">
                      {console.log(`名・・逕ｻ蜒剰｡ｨ遉ｺ [${index}]:`, {
                        id: image.id,
                        url: image.url.substring(0, 100) + '...',
                        fileName: image.fileName,
                        description: image.description,
                        isBase64: image.url.startsWith('data:image/'),
                        urlLength: image.url.length
                      })}
                      <img
                        src={image.url}
                        alt={`謨・囿邂・園逕ｻ蜒・${index + 1}`}
                        className="w-full h-40 object-cover rounded-lg mb-2 print:h-32 print:mb-1"
                        crossOrigin="anonymous"
                        onError={(e) => {
                          console.log('笶・逕ｻ蜒剰ｪｭ縺ｿ霎ｼ縺ｿ繧ｨ繝ｩ繝ｼ:', {
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
                          console.log('笨・逕ｻ蜒剰ｪｭ縺ｿ霎ｼ縺ｿ謌仙粥:', {
                            imageId: image.id,
                            url: image.url.substring(0, 100) + '...',
                            fileName: image.fileName,
                            isBase64: image.url.startsWith('data:image/')
                          });
                        }}
                      />
                      <div className="hidden text-center text-gray-500 text-sm print:block">
                        逕ｻ蜒剰ｪｭ縺ｿ霎ｼ縺ｿ繧ｨ繝ｩ繝ｼ
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
                    <p className="text-gray-500">逕ｻ蜒上′縺ゅｊ縺ｾ縺帙ｓ</p>
                  </div>
                </div>
              )}
              <p className="text-gray-600 mt-4 print:mt-3">荳願ｨ倥・謨・囿邂・園縺ｮ蜀咏悄縺ｧ縺吶・/p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 蜊ｰ蛻ｷ逕ｨ繧ｹ繧ｿ繧､繝ｫ - 蜊ｰ蛻ｷ遽・峇繧貞宍蟇・↓蛻ｶ蠕｡ */}
      <style>{`
        @media print {
          @page {
            margin: 1cm;
            size: A4 portrait;
          }
          
          /* 蜊ｰ蛻ｷ譎ゅ・繝壹・繧ｸ蜈ｨ菴薙ｒ繝ｪ繧ｻ繝・ヨ */
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
          
          /* 蜊ｰ蛻ｷ譎ゅ・逕ｻ蜒剰｡ｨ遉ｺ繧堤｢ｺ螳溘↓縺吶ｋ */
          img {
            max-width: 100% !important;
            height: auto !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          
          /* 逕ｻ蜒上さ繝ｳ繝・リ縺ｮ蜊ｰ蛻ｷ險ｭ螳・*/
          .print\\:break-inside-avoid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          
          /* 蜊ｰ蛻ｷ遽・峇螟悶・繧ｳ繝ｳ繝・Φ繝・ｒ螳悟・縺ｫ髱櫁｡ｨ遉ｺ */
          .print\\:hidden {
            display: none !important;
          }
          
          /* 蜊ｰ蛻ｷ譎ゅ・縺ｿ陦ｨ遉ｺ */
          .print\\:block {
            display: block !important;
          }
          
          /* 蜊ｰ蛻ｷ遽・峇繧貞宍蟇・↓蛻ｶ蠕｡ - 謨・囿蝣ｱ蜻頑嶌縺ｮ蜀・ｮｹ縺ｮ縺ｿ陦ｨ遉ｺ */
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
          
          /* 蜊ｰ蛻ｷ譎ゅ・繝ｬ繧､繧｢繧ｦ繝域怙驕ｩ蛹・*/
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
          
          /* 蜊ｰ蛻ｷ譎ゅ・繝・く繧ｹ繝域怙驕ｩ蛹・*/
          .print\\:text-2xl {
            font-size: 1.5rem !important;
            line-height: 2rem !important;
          }
          
          .print\\:text-lg {
            font-size: 1.125rem !important;
            line-height: 1.75rem !important;
          }
          
          /* 蜊ｰ蛻ｷ譎ゅ・繝懊・繝繝ｼ譛驕ｩ蛹・*/
          .print\\:border {
            border-width: 1px !important;
            border-color: #d1d5db !important;
          }
          
          /* 蜊ｰ蛻ｷ譎ゅ・蜈･蜉帙ヵ繧｣繝ｼ繝ｫ繝画怙驕ｩ蛹・*/
          input, textarea {
            border: 1px solid #d1d5db !important;
            background: white !important;
          }
          
          /* 蜊ｰ蛻ｷ遽・峇螟悶・隕∫ｴ繧貞ｼｷ蛻ｶ逧・↓髱櫁｡ｨ遉ｺ */
          header, nav, footer, .header, .navigation, .sidebar {
            display: none !important;
          }
          
          /* 蜊ｰ蛻ｷ譎ゅ・謨・囿蝣ｱ蜻頑嶌縺ｮ蜀・ｮｹ縺ｮ縺ｿ陦ｨ遉ｺ */
          .min-h-screen {
            min-height: auto !important;
          }
          
          /* 蜊ｰ蛻ｷ譎ゅ・閭梧勹濶ｲ繧貞ｼｷ蛻ｶ逧・↓逋ｽ縺ｫ */
          .bg-gray-50, .bg-gray-100 {
            background-color: white !important;
          }
          
          /* 蜊ｰ蛻ｷ譎ゅ・繝ｬ繧､繧｢繧ｦ繝域怙驕ｩ蛹・*/
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
          
          /* 蜊ｰ蛻ｷ譎ゅ・繝輔Ξ繝・け繧ｹ繝懊ャ繧ｯ繧ｹ譛驕ｩ蛹・*/
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
          
          /* 蜊ｰ蛻ｷ譎ゅ・繧ｹ繝壹・繧ｷ繝ｳ繧ｰ譛驕ｩ蛹・*/
          .space-y-6 > *:not([hidden]) ~ *:not([hidden]) {
            margin-top: 1.5rem !important;
          }
          
          .space-y-4 > *:not([hidden]) ~ *:not([hidden]) {
            margin-top: 1rem !important;
          }
          
          .space-y-3 > *:not([hidden]) ~ *:not([hidden]) {
            margin-top: 0.75rem !important;
          }
          
          /* 蜊ｰ蛻ｷ譎ゅ・霑ｽ蜉蛻ｶ蠕｡ */
          .print\\:min-h-0 {
            min-height: 0 !important;
          }
          
          .print\\:bg-transparent {
            background-color: transparent !important;
          }
          
          /* 蜊ｰ蛻ｷ譎ゅ↓荳崎ｦ√↑隕∫ｴ繧貞ｮ悟・縺ｫ髱櫁｡ｨ遉ｺ */
          button, .btn, [role="button"] {
            display: none !important;
          }
          
          /* 蜊ｰ蛻ｷ譎ゅ↓謨・囿蝣ｱ蜻頑嶌莉･螟悶・繧ｳ繝ｳ繝・Φ繝・ｒ髱櫁｡ｨ遉ｺ */
          div:not([class*="print"]) {
            background: white !important;
          }
          
          /* 蜊ｰ蛻ｷ譎ゅ↓謨・囿蝣ｱ蜻頑嶌縺ｮ繧ｳ繝ｳ繝・Φ繝・・縺ｿ繧堤｢ｺ螳溘↓陦ｨ遉ｺ */
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
          
          /* 蜊ｰ蛻ｷ譎ゅ・繝壹・繧ｸ蛻・牡蛻ｶ蠕｡ */
          .print\\:break-inside-avoid {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          
          /* 蜊ｰ蛻ｷ譎ゅ・繝輔か繝ｳ繝医し繧､繧ｺ隱ｿ謨ｴ */
          h1, h2, h3, h4, h5, h6 {
            font-size: inherit !important;
            line-height: inherit !important;
            margin: 0.5em 0 !important;
          }
          
          /* 蜊ｰ蛻ｷ譎ゅ・繧ｫ繝ｼ繝峨せ繧ｿ繧､繝ｫ譛驕ｩ蛹・*/
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
