import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Printer, 
  Download, 
  Save, 
  Edit, 
  X, 
  ImageIcon,
  FileText,
  Calendar,
  MapPin,
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
    console.log('ReportViewer: reportData螟画峩讀懃衍:', {
      id: reportData?.id,
      hasReportData: !!reportData,
      reportDataKeys: reportData ? Object.keys(reportData) : [],
      imageUrl: reportData?.imageUrl ? '縺ゅｊ' : '縺ｪ縺・,
      conversationHistory: reportData?.conversationHistory?.length || 0,
      chatData: reportData?.chatData?.messages?.length || 0
    });
    
    // 逕ｻ蜒酋RL繧呈歓蜃ｺ
    extractImageUrl();
  }, [reportData]);

  const extractImageUrl = () => {
    let foundImageUrl = null;
    
    console.log('ReportViewer: 逕ｻ蜒乗歓蜃ｺ髢句ｧ・, {
      hasReportData: !!reportData,
      reportDataKeys: reportData ? Object.keys(reportData) : [],
      conversationHistory: reportData?.conversationHistory?.length || 0,
      originalChatData: reportData?.originalChatData?.messages?.length || 0,
      chatData: reportData?.chatData?.messages?.length || 0,
      savedImages: reportData?.savedImages?.length || 0
    });

    // 蜆ｪ蜈磯・ｽ・: 逶ｴ謗･險ｭ螳壹＆繧後◆逕ｻ蜒酋RL
    if (reportData?.imageUrl) {
      foundImageUrl = reportData.imageUrl;
      console.log('ReportViewer: 逶ｴ謗･險ｭ螳壹＆繧後◆逕ｻ蜒酋RL繧剃ｽｿ逕ｨ:', foundImageUrl.substring(0, 100) + '...');
    }

    // 蜆ｪ蜈磯・ｽ・: conversationHistory縺九ｉBase64逕ｻ蜒上ｒ蜿門ｾ・
    if (!foundImageUrl && reportData?.conversationHistory && reportData.conversationHistory.length > 0) {
      const imageMessage = reportData.conversationHistory.find((msg: any) => 
        msg.content && msg.content.startsWith('data:image/')
      );
      if (imageMessage) {
        foundImageUrl = imageMessage.content;
        console.log('ReportViewer: conversationHistory縺九ｉ逕ｻ蜒上ｒ蜿門ｾ・);
      }
    }

    // 蜆ｪ蜈磯・ｽ・: originalChatData.messages縺九ｉBase64逕ｻ蜒上ｒ蜿門ｾ・
    if (!foundImageUrl && reportData?.originalChatData?.messages) {
      const imageMessage = reportData.originalChatData.messages.find((msg: any) => 
        msg.content && msg.content.startsWith('data:image/')
      );
      if (imageMessage) {
        foundImageUrl = imageMessage.content;
        console.log('ReportViewer: originalChatData縺九ｉ逕ｻ蜒上ｒ蜿門ｾ・);
      }
    }

    // 蜆ｪ蜈磯・ｽ・: chatData.messages縺九ｉBase64逕ｻ蜒上ｒ蜿門ｾ・
    if (!foundImageUrl && reportData?.chatData?.messages) {
      const imageMessage = reportData.chatData.messages.find((msg: any) => 
        msg.content && msg.content.startsWith('data:image/')
      );
      if (imageMessage) {
        foundImageUrl = imageMessage.content;
        console.log('ReportViewer: chatData縺九ｉ逕ｻ蜒上ｒ蜿門ｾ・);
      }
    }

    // 蜆ｪ蜈磯・ｽ・: savedImages縺九ｉ逕ｻ蜒上ｒ蜿門ｾ・
    if (!foundImageUrl && reportData?.savedImages && reportData.savedImages.length > 0) {
      foundImageUrl = reportData.savedImages[0].url;
      console.log('ReportViewer: savedImages縺九ｉ逕ｻ蜒上ｒ蜿門ｾ・);
    }

    // 蜆ｪ蜈磯・ｽ・: messages繝輔ぅ繝ｼ繝ｫ繝峨°繧隠ase64逕ｻ蜒上ｒ讀懃ｴ｢
    if (!foundImageUrl && reportData?.messages && Array.isArray(reportData.messages)) {
      const imageMessage = reportData.messages.find((msg: any) => 
        msg.content && msg.content.startsWith('data:image/')
      );
      if (imageMessage) {
        foundImageUrl = imageMessage.content;
        console.log('ReportViewer: messages繝輔ぅ繝ｼ繝ｫ繝峨°繧臥判蜒上ｒ蜿門ｾ・);
      }
    }

    console.log('ReportViewer: 譛邨ら噪縺ｪ逕ｻ蜒酋RL:', foundImageUrl ? foundImageUrl.substring(0, 100) + '...' : '縺ｪ縺・);
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

  // 繝輔ぃ繧､繝ｫ縺ｫ蟾ｮ蛻・〒荳頑嶌縺堺ｿ晏ｭ・
  const handleSaveToFile = async () => {
    try {
      const data = isEditing ? editedData : reportData;
      
      // 菫晏ｭ倡畑縺ｮ繝・・繧ｿ繧呈ｺ門ｙ
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
        // 繝√Ε繝・ヨ螻･豁ｴ繝・・繧ｿ
        conversationHistory: data.conversationHistory,
        originalChatData: data.originalChatData,
        chatData: data.chatData,
        messages: data.messages,
        // 菫晏ｭ倥＆繧後◆逕ｻ蜒・
        savedImages: data.savedImages,
        // 逶ｴ謗･逕ｻ蜒酋RL
        imageUrl: data.imageUrl,
        // 譖ｴ譁ｰ譌･譎・
        updatedAt: new Date().toISOString()
      };

      // 譌｢蟄倥・繝輔ぃ繧､繝ｫ繝・・繧ｿ繧貞叙蠕・
      const existingData = localStorage.getItem(`report_${data.id}`);
      let existingReport = null;
      
      if (existingData) {
        try {
          existingReport = JSON.parse(existingData);
        } catch (e) {
          console.warn('譌｢蟄倥ョ繝ｼ繧ｿ縺ｮ隗｣譫舌↓螟ｱ謨・', e);
        }
      }

      // 蟾ｮ蛻・ｒ讀懷・縺励※荳頑嶌縺・
      const mergedData = existingReport ? { ...existingReport, ...saveData } : saveData;
      
      // 繝ｭ繝ｼ繧ｫ繝ｫ繧ｹ繝医Ξ繝ｼ繧ｸ縺ｫ菫晏ｭ・
      localStorage.setItem(`report_${data.id}`, JSON.stringify(mergedData));
      
      // 繧ｵ繝ｼ繝舌・縺ｫ繧ゆｿ晏ｭ倥ｒ隧ｦ陦鯉ｼ・PI縺悟茜逕ｨ蜿ｯ閭ｽ縺ｪ蝣ｴ蜷茨ｼ・
      try {
        const response = await fetch('/api/reports/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(mergedData),
        });
        
        if (response.ok) {
          console.log('繧ｵ繝ｼ繝舌・縺ｸ縺ｮ菫晏ｭ倥′螳御ｺ・＠縺ｾ縺励◆');
        } else {
          console.warn('繧ｵ繝ｼ繝舌・縺ｸ縺ｮ菫晏ｭ倥↓螟ｱ謨励＠縺ｾ縺励◆縺後√Ο繝ｼ繧ｫ繝ｫ縺ｫ縺ｯ菫晏ｭ倥＆繧後∪縺励◆');
        }
      } catch (error) {
        console.warn('繧ｵ繝ｼ繝舌・縺ｸ縺ｮ菫晏ｭ倥↓螟ｱ謨励＠縺ｾ縺励◆縺後√Ο繝ｼ繧ｫ繝ｫ縺ｫ縺ｯ菫晏ｭ倥＆繧後∪縺励◆:', error);
      }

      alert('繝ｬ繝昴・繝医′菫晏ｭ倥＆繧後∪縺励◆縲・);
      console.log('繝ｬ繝昴・繝井ｿ晏ｭ伜ｮ御ｺ・', mergedData);
      
    } catch (error) {
      console.error('繝ｬ繝昴・繝井ｿ晏ｭ倅ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆:', error);
      alert('繝ｬ繝昴・繝医・菫晏ｭ倥↓螟ｱ謨励＠縺ｾ縺励◆: ' + error.message);
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

    // 蜊ｰ蛻ｷ繝繧､繧｢繝ｭ繧ｰ繧定｡ｨ遉ｺ
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  // 蜊ｰ蛻ｷ逕ｨHTML逕滓・・育樟蝨ｨ縺ｮ繝ｬ繝昴・繝医ョ繝ｼ繧ｿ繧剃ｽｿ逕ｨ・・
  const generatePrintHTML = (): string => {
    const data = isEditing ? editedData : reportData;
    
    return `
      <!DOCTYPE html>
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
            <h1>讖滓｢ｰ謨・囿蝣ｱ蜻頑嶌</h1>
            <p>蜊ｰ蛻ｷ譌･譎・ ${new Date().toLocaleString('ja-JP')}</p>
          </div>
          
          <div class="section">
            <h2>蝣ｱ蜻頑ｦりｦ・/h2>
            <div class="info-grid">
              <div class="info-item">
                <strong>蝣ｱ蜻頑嶌ID</strong>
                <span>${data.reportId || data.id || '-'}</span>
              </div>
              <div class="info-item">
                <strong>讖溽ｨｮ</strong>
                <span>${data.machineType || data.machineTypeName || '-'}</span>
              </div>
              <div class="info-item">
                <strong>讖滓｢ｰ逡ｪ蜿ｷ</strong>
                <span>${data.machineNumber || '-'}</span>
              </div>
              <div class="info-item">
                <strong>譌･莉・/strong>
                <span>${data.date || data.timestamp || data.createdAt ? new Date(data.createdAt).toLocaleDateString('ja-JP') : '-'}</span>
              </div>
              <div class="info-item">
                <strong>蝣ｴ謇</strong>
                <span>${data.location || '-'}</span>
              </div>
            </div>
          </div>
          
          <div class="section">
            <h2>謨・囿隧ｳ邏ｰ</h2>
            <div class="info-grid">
              <div class="info-item">
                <strong>謨・囿繧ｳ繝ｼ繝・/strong>
                <span>${data.failureCode || '-'}</span>
              </div>
              <div class="info-item">
                <strong>繧ｹ繝・・繧ｿ繧ｹ</strong>
                <span>${data.status || '-'}</span>
              </div>
              <div class="info-item">
                <strong>雋ｬ莉ｻ閠・/strong>
                <span>${data.engineer || '-'}</span>
              </div>
            </div>
            
            <div class="content-box">
              <strong>隱ｬ譏・/strong>
              <p>${data.problemDescription || data.description || data.incidentTitle || '-'}</p>
            </div>
            
            <div class="content-box">
              <strong>蛯呵・/strong>
              <p>${data.notes || '-'}</p>
            </div>
          </div>
          
          ${imageUrl ? `
          <div class="section">
            <h2>謨・囿邂・園逕ｻ蜒・/h2>
            <div class="image-section">
              <img src="${imageUrl}" alt="謨・囿邂・園逕ｻ蜒・ />
              <p>荳願ｨ倥・謨・囿邂・園縺ｮ蜀咏悄縺ｧ縺吶・/p>
            </div>
          </div>
          ` : ''}
          
          <div class="section">
            <h2>謚ｽ蜃ｺ諠・ｱ</h2>
            <div class="info-grid">
              <div class="info-item">
                <strong>蠖ｱ髻ｿ繧ｳ繝ｳ繝昴・繝阪Φ繝・/strong>
                <span>${(data.extractedComponents || []).join(', ') || '-'}</span>
              </div>
              <div class="info-item">
                <strong>逞・憾</strong>
                <span>${(data.extractedSymptoms || []).join(', ') || '-'}</span>
              </div>
              <div class="info-item">
                <strong>蜿ｯ閭ｽ諤ｧ縺ｮ縺ゅｋ讖溽ｨｮ</strong>
                <span>${(data.possibleModels || []).join(', ') || '-'}</span>
              </div>
            </div>
          </div>
          
          <div class="section">
            <h2>菫ｮ郢穂ｺ亥ｮ・/h2>
            <div class="info-grid">
              <div class="info-item">
                <strong>萓晞ｼ譛域律</strong>
                <span>${data.requestDate || '-'}</span>
              </div>
              <div class="info-item">
                <strong>莠亥ｮ壽怦譌･</strong>
                <span>${data.repairSchedule || '-'}</span>
              </div>
              <div class="info-item">
                <strong>蝣ｴ謇</strong>
                <span>${data.repairLocation || '-'}</span>
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

  const handleDownload = () => {
    const data = isEditing ? editedData : reportData;
    const content = `
蝣ｱ蜻頑嶌

莠玖ｱ｡讎りｦ・
莠玖ｱ｡繧ｿ繧､繝医Ν: ${data.incidentTitle || data.problemDescription || '-'}
蝣ｱ蜻頑嶌ID: ${data.reportId || data.id || '-'}
讖滓｢ｰID: ${data.machineId || data.machineNumber || '-'}
譌･莉・ ${data.date || data.timestamp || data.createdAt ? new Date(data.createdAt).toLocaleDateString('ja-JP') : '-'}
蝣ｴ謇: ${data.location || '-'}
謨・囿繧ｳ繝ｼ繝・ ${data.failureCode || '-'}

莠玖ｱ｡隧ｳ邏ｰ:
隱ｬ譏・ ${data.problemDescription || data.description || '-'}
繧ｹ繝・・繧ｿ繧ｹ: ${data.status || '-'}
諡・ｽ薙お繝ｳ繧ｸ繝九い: ${data.engineer || '-'}
蛯呵・ ${data.notes || '-'}

謚ｽ蜃ｺ諠・ｱ:
蠖ｱ髻ｿ繧ｳ繝ｳ繝昴・繝阪Φ繝・ ${(data.extractedComponents || []).join(', ')}
逞・憾: ${(data.extractedSymptoms || []).join(', ')}
蜿ｯ閭ｽ諤ｧ縺ｮ縺ゅｋ讖溽ｨｮ: ${(data.possibleModels || []).join(', ')}

菫ｮ郢穂ｺ亥ｮ・
莠亥ｮ壽怦譌･: ${data.repairSchedule || '-'}
蝣ｴ謇: ${data.repairLocation || '-'}

繝√Ε繝・ヨ螻･豁ｴ:
${(data.conversationHistory || data.chatData?.messages || []).map((msg: any) => 
  `${msg.isAiResponse ? 'AI' : '繝ｦ繝ｼ繧ｶ繝ｼ'}: ${msg.content}`
).join('\n')}
    `;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `蝣ｱ蜻頑嶌_${data.incidentTitle || data.id}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const data = isEditing ? editedData : reportData;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* 繝倥ャ繝繝ｼ */}
        <div className="flex justify-between items-center p-6 border-b">
          <h1 className="text-2xl font-bold">蝣ｱ蜻頑嶌繝薙Η繝ｼ繧｢繝ｼ</h1>
          <div className="flex gap-2">
            {!isEditing ? (
              <>
                <Button onClick={handleEdit} variant="outline" className="flex items-center gap-2">
                  <Edit className="h-4 w-4" />
                  邱ｨ髮・
                </Button>
                <Button onClick={handlePrint} variant="outline" className="flex items-center gap-2">
                  <Printer className="h-4 w-4" />
                  蜊ｰ蛻ｷ
                </Button>
                <Button onClick={handleSaveToFile} variant="outline" className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  菫晏ｭ・
                </Button>
              </>
            ) : (
              <>
                <Button onClick={handleSave} className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  菫晏ｭ・
                </Button>
                <Button onClick={handleCancel} variant="outline">
                  繧ｭ繝｣繝ｳ繧ｻ繝ｫ
                </Button>
              </>
            )}
            <Button onClick={onClose} variant="ghost" size="sm">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* 繧ｳ繝ｳ繝・Φ繝・*/}
        <div className="p-6 space-y-6">
          {/* 蝣ｱ蜻頑ｦりｦ・*/}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                蝣ｱ蜻頑ｦりｦ・
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>蝣ｱ蜻頑嶌ID</Label>
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
                  <Label>讖溽ｨｮ</Label>
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
                  <Label>讖滓｢ｰ逡ｪ蜿ｷ</Label>
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
                  <Label>譌･莉・/Label>
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
                  <Label>蝣ｴ謇</Label>
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

          {/* 謨・囿隧ｳ邏ｰ */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                謨・囿隧ｳ邏ｰ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>隱ｬ譏・/Label>
                {isEditing ? (
                  <Textarea
                    value={data.problemDescription || data.description || data.incidentTitle || ''}
                    onChange={(e) => handleInputChange('problemDescription', e.target.value)}
                    rows={3}
                    placeholder="隱ｬ譏弱↑縺・
                  />
                ) : (
                  <p className="text-sm text-gray-600">
                    {data.problemDescription || data.description || data.incidentTitle || '隱ｬ譏弱↑縺・}
                  </p>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>繧ｹ繝・・繧ｿ繧ｹ</Label>
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
                  <Label>雋ｬ莉ｻ閠・/Label>
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
                <Label>蛯呵・/Label>
                {isEditing ? (
                  <Textarea
                    value={data.notes || ''}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    rows={3}
                    placeholder="蛯呵・ｒ蜈･蜉帙＠縺ｦ縺上□縺輔＞"
                  />
                ) : (
                  <p className="text-sm text-gray-600">{data.notes || '-'}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 逕ｻ蜒上そ繧ｯ繧ｷ繝ｧ繝ｳ */}
          {imageUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  謨・囿邂・園逕ｻ蜒・
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">逕ｻ蜒酋RL諠・ｱ:</p>
                    <p className="text-xs text-gray-500 break-all">
                      {imageUrl.startsWith('data:image/') 
                        ? `Base64逕ｻ蜒・(${imageUrl.length}譁・ｭ・`
                        : `URL: ${imageUrl.substring(0, 100)}...`
                      }
                    </p>
                  </div>
                  <img
                    src={imageUrl}
                    alt="謨・囿邂・園逕ｻ蜒・
                    className="max-w-full max-h-96 object-contain border rounded-lg"
                    onError={(e) => {
                      console.error('逕ｻ蜒剰ｪｭ縺ｿ霎ｼ縺ｿ繧ｨ繝ｩ繝ｼ:', e);
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      // 繧ｨ繝ｩ繝ｼ繝｡繝・そ繝ｼ繧ｸ繧定｡ｨ遉ｺ
                      const errorDiv = document.createElement('div');
                      errorDiv.className = 'text-red-500 text-sm mt-2';
                      errorDiv.textContent = '逕ｻ蜒上・隱ｭ縺ｿ霎ｼ縺ｿ縺ｫ螟ｱ謨励＠縺ｾ縺励◆';
                      target.parentNode?.appendChild(errorDiv);
                    }}
                    onLoad={() => {
                      console.log('逕ｻ蜒剰ｪｭ縺ｿ霎ｼ縺ｿ謌仙粥:', {
                        src: imageUrl.substring(0, 100) + '...',
                        naturalWidth: (e.target as HTMLImageElement).naturalWidth,
                        naturalHeight: (e.target as HTMLImageElement).naturalHeight
                      });
                    }}
                  />
                  <p className="text-sm text-gray-500 mt-2">荳願ｨ倥・謨・囿邂・園縺ｮ蜀咏悄縺ｧ縺吶・/p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 謚ｽ蜃ｺ諠・ｱ */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                謚ｽ蜃ｺ諠・ｱ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>蠖ｱ髻ｿ繧ｳ繝ｳ繝昴・繝阪Φ繝・/Label>
                  {isEditing ? (
                    <Input
                      value={(data.extractedComponents || []).join(', ')}
                      onChange={(e) => handleInputChange('extractedComponents', e.target.value.split(',').map(s => s.trim()))}
                      placeholder="繧ｫ繝ｳ繝槫玄蛻・ｊ縺ｧ蜈･蜉・
                    />
                  ) : (
                    <p className="text-sm text-gray-600">
                      {(data.extractedComponents || []).join(', ') || '-'}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>逞・憾</Label>
                  {isEditing ? (
                    <Input
                      value={(data.extractedSymptoms || []).join(', ')}
                      onChange={(e) => handleInputChange('extractedSymptoms', e.target.value.split(',').map(s => s.trim()))}
                      placeholder="繧ｫ繝ｳ繝槫玄蛻・ｊ縺ｧ蜈･蜉・
                    />
                  ) : (
                    <p className="text-sm text-gray-600">
                      {(data.extractedSymptoms || []).join(', ') || '-'}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>蜿ｯ閭ｽ諤ｧ縺ｮ縺ゅｋ讖溽ｨｮ</Label>
                  {isEditing ? (
                    <Input
                      value={(data.possibleModels || []).join(', ')}
                      onChange={(e) => handleInputChange('possibleModels', e.target.value.split(',').map(s => s.trim()))}
                      placeholder="繧ｫ繝ｳ繝槫玄蛻・ｊ縺ｧ蜈･蜉・
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

          {/* 菫ｮ郢穂ｺ亥ｮ・*/}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                菫ｮ郢穂ｺ亥ｮ・
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>萓晞ｼ譛域律</Label>
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
                  <Label>莠亥ｮ壽怦譌･</Label>
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
                  <Label>蝣ｴ謇</Label>
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

          {/* 蛯呵・*/}
          <Card>
            <CardHeader>
              <CardTitle>蛯呵・/CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  value={data.notes || ''}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                  placeholder="蛯呵・ｒ蜈･蜉帙＠縺ｦ縺上□縺輔＞"
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
