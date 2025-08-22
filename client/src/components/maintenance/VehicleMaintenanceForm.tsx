import React, { useState, useEffect } from 'react';
import { Upload, Download, Save, FileText, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import FaultClassificationSection from './FaultClassificationSection';
import FaultFactorSection from './FaultFactorSection';
import { VehicleMaintenanceRecord, FormData, FaultClassification, FaultFactor } from './types';

export default function VehicleMaintenanceForm() {
  const [formData, setFormData] = useState<FormData>({
    occurrenceEvent: '',
    vehicleNumber: '',
    equipmentCategory: '',
    phenomenonMemo: '',
    inspectionProcedure: '',
    emergencyMeasures: '',
    permanentCountermeasures: '',
    remarks: '',
    recorder: '',
    faultClassifications: [{ type: '', custom: '' }],
    faultFactors: [{ type: '', content: '' }]
  });

  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [successMessage, setSuccessMessage] = useState('');

  // 蝓ｺ譛ｬ繝輔ぅ繝ｼ繝ｫ繝峨・譖ｴ譁ｰ
  const updateField = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // 繧ｨ繝ｩ繝ｼ繧偵け繝ｪ繧｢
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // 謨・囿蛻・｡槭・邂｡逅・
  const addFaultClassification = () => {
    setFormData(prev => ({
      ...prev,
      faultClassifications: [...prev.faultClassifications, { type: '', custom: '' }]
    }));
  };

  const removeFaultClassification = (index: number) => {
    if (formData.faultClassifications.length > 1) {
      setFormData(prev => ({
        ...prev,
        faultClassifications: prev.faultClassifications.filter((_, i) => i !== index)
      }));
    }
  };

  const updateFaultClassification = (index: number, field: 'type' | 'custom', value: string) => {
    setFormData(prev => ({
      ...prev,
      faultClassifications: prev.faultClassifications.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  // 謨・囿隕∝屏縺ｮ邂｡逅・
  const addFaultFactor = () => {
    setFormData(prev => ({
      ...prev,
      faultFactors: [...prev.faultFactors, { type: '', content: '' }]
    }));
  };

  const removeFaultFactor = (index: number) => {
    if (formData.faultFactors.length > 1) {
      setFormData(prev => ({
        ...prev,
        faultFactors: prev.faultFactors.filter((_, i) => i !== index)
      }));
    }
  };

  const updateFaultFactor = (index: number, field: 'type' | 'content', value: string) => {
    setFormData(prev => ({
      ...prev,
      faultFactors: prev.faultFactors.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  // 繝舌Μ繝・・繧ｷ繝ｧ繝ｳ
  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};
    
    if (!formData.occurrenceEvent.trim()) {
      newErrors.occurrenceEvent = '逋ｺ逕滉ｺ玖ｱ｡縺ｯ蠢・磯・岼縺ｧ縺吶・;
    }
    if (!formData.vehicleNumber.trim()) {
      newErrors.vehicleNumber = '讖溽ｨｮ縺ｯ蠢・磯・岼縺ｧ縺吶・;
    }
    if (!formData.equipmentCategory.trim()) {
      newErrors.equipmentCategory = '陬・ｽｮ繧ｫ繝・ざ繝ｪ繝ｻ陬・ｽｮ蜷咲ｧｰ縺ｯ蠢・磯・岼縺ｧ縺吶・;
    }
    if (!formData.phenomenonMemo.trim()) {
      newErrors.phenomenonMemo = '迴ｾ雎｡繝｡繝｢縺ｯ蠢・磯・岼縺ｧ縺吶・;
    }
    if (!formData.recorder.trim()) {
      newErrors.recorder = '險倬鹸閠・・蠢・磯・岼縺ｧ縺吶・;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 繝ｬ繧ｳ繝ｼ繝迂D縺ｮ逕滓・
  const generateRecordId = (): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${timestamp}-${random}`;
  };

  // JSON繝輔ぃ繧､繝ｫ縺ｮ菫晏ｭ假ｼ医し繝ｼ繝舌・邨檎罰・・
  const saveToServer = async (data: VehicleMaintenanceRecord): Promise<void> => {
    try {
      const response = await fetch('/api/maintenance/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('繧ｵ繝ｼ繝舌・縺ｸ縺ｮ菫晏ｭ倥↓螟ｱ謨励＠縺ｾ縺励◆');
      }

      const result = await response.json();
      console.log('菫晏ｭ俶・蜉・', result);
    } catch (error) {
      console.error('菫晏ｭ倥お繝ｩ繝ｼ:', error);
      throw error;
    }
  };

  // 繝輔か繝ｼ繝騾∽ｿ｡
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      // 謨・囿蛻・｡槭ｒ繝輔ぅ繝ｫ繧ｿ繝ｼ・育ｩｺ縺ｮ繧ゅ・繧帝勁螟厄ｼ・
      const validClassifications = formData.faultClassifications.filter(
        item => item.type || item.custom
      );

      // 謨・囿隕∝屏繧偵ヵ繧｣繝ｫ繧ｿ繝ｼ・育ｩｺ縺ｮ繧ゅ・繧帝勁螟厄ｼ・
      const validFactors = formData.faultFactors.filter(
        item => item.type || item.content
      );

      // 讒矩蛹褒SON繝・・繧ｿ縺ｮ菴懈・
      const maintenanceRecord: VehicleMaintenanceRecord = {
        metadata: {
          recordId: generateRecordId(),
          createdAt: new Date().toISOString(),
          version: "1.0"
        },
        occurrence: {
          event: formData.occurrenceEvent,
          recordedAt: new Date().toISOString(),
          vehicle: {
            type: formData.vehicleNumber,
            equipment: {
              category: formData.equipmentCategory
            }
          }
        },
        fault: {
          classifications: validClassifications,
          phenomenon: formData.phenomenonMemo,
          factors: validFactors
        },
        response: {
          inspection: {
            procedure: formData.inspectionProcedure ? 
              formData.inspectionProcedure.split('\n').filter(line => line.trim()) : []
          },
          measures: {
            emergency: formData.emergencyMeasures ? 
              formData.emergencyMeasures.split('\n').filter(line => line.trim()) : [],
            permanent: formData.permanentCountermeasures
          }
        },
        notes: {
          remarks: formData.remarks,
          recorder: formData.recorder
        }
      };

      // 繧ｵ繝ｼ繝舌・縺ｫ菫晏ｭ・
      await saveToServer(maintenanceRecord);

      // 謌仙粥繝｡繝・そ繝ｼ繧ｸ繧定｡ｨ遉ｺ
      setSuccessMessage('險倬鹸縺梧ｭ｣蟶ｸ縺ｫ菫晏ｭ倥＆繧後∪縺励◆縲・);
      
      // 3遘貞ｾ後↓繝｡繝・そ繝ｼ繧ｸ繧帝撼陦ｨ遉ｺ
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);

      // 繝輔か繝ｼ繝繝ｪ繧ｻ繝・ヨ縺ｮ遒ｺ隱・
      setTimeout(() => {
        if (confirm('繝輔か繝ｼ繝繧偵Μ繧ｻ繝・ヨ縺励※譁ｰ縺励＞險倬鹸繧貞・蜉帙＠縺ｾ縺吶°・・)) {
          resetForm();
        }
      }, 1000);

    } catch (error) {
      console.error('菫晏ｭ倥お繝ｩ繝ｼ:', error);
      alert('菫晏ｭ倅ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆縲ゅｂ縺・ｸ蠎ｦ縺願ｩｦ縺励￥縺縺輔＞縲・);
    }
  };

  // 繝輔ぃ繧､繝ｫ隱ｭ縺ｿ霎ｼ縺ｿ
  const handleFileLoad = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      alert('JSON繝輔ぃ繧､繝ｫ繧帝∈謚槭＠縺ｦ縺上□縺輔＞縲・);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(e.target?.result as string);
        loadDataToForm(jsonData);
        setSuccessMessage('繝輔ぃ繧､繝ｫ縺梧ｭ｣蟶ｸ縺ｫ隱ｭ縺ｿ霎ｼ縺ｾ繧後∪縺励◆縲・);
        setTimeout(() => setSuccessMessage(''), 3000);
      } catch (error) {
        console.error('JSON繝輔ぃ繧､繝ｫ縺ｮ隱ｭ縺ｿ霎ｼ縺ｿ繧ｨ繝ｩ繝ｼ:', error);
        alert('JSON繝輔ぃ繧､繝ｫ縺ｮ蠖｢蠑上′豁｣縺励￥縺ゅｊ縺ｾ縺帙ｓ縲・);
      }
    };
    reader.readAsText(file);
  };

  // JSON繝・・繧ｿ繧偵ヵ繧ｩ繝ｼ繝縺ｫ螻暮幕
  const loadDataToForm = (jsonData: VehicleMaintenanceRecord) => {
    setFormData({
      occurrenceEvent: jsonData.occurrence?.event || '',
      vehicleNumber: jsonData.occurrence?.vehicle?.type || '',
      equipmentCategory: jsonData.occurrence?.vehicle?.equipment?.category || '',
      phenomenonMemo: jsonData.fault?.phenomenon || '',
      inspectionProcedure: jsonData.response?.inspection?.procedure?.join('\n') || '',
      emergencyMeasures: jsonData.response?.measures?.emergency?.join('\n') || '',
      permanentCountermeasures: jsonData.response?.measures?.permanent || '',
      remarks: jsonData.notes?.remarks || '',
      recorder: jsonData.notes?.recorder || '',
      faultClassifications: jsonData.fault?.classifications?.length > 0 ? 
        jsonData.fault.classifications : [{ type: '', custom: '' }],
      faultFactors: jsonData.fault?.factors?.length > 0 ? 
        jsonData.fault.factors : [{ type: '', content: '' }]
    });
  };

  // 繝輔か繝ｼ繝繝ｪ繧ｻ繝・ヨ
  const resetForm = () => {
    setFormData({
      occurrenceEvent: '',
      vehicleNumber: '',
      equipmentCategory: '',
      phenomenonMemo: '',
      inspectionProcedure: '',
      emergencyMeasures: '',
      permanentCountermeasures: '',
      remarks: '',
      recorder: '',
      faultClassifications: [{ type: '', custom: '' }],
      faultFactors: [{ type: '', content: '' }]
    });
    setErrors({});
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-gray-900">
            霆贋ｸ｡菫晏ｮ域腐髫懆ｨ倬鹸繧ｷ繧ｹ繝・Β
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* 謌仙粥繝｡繝・そ繝ｼ繧ｸ */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-green-800">{successMessage}</span>
            </div>
          )}

          {/* 繝輔ぃ繧､繝ｫ隱ｭ縺ｿ霎ｼ縺ｿ */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <Label htmlFor="loadFile" className="text-sm font-medium text-gray-700">
              譌｢蟄倩ｨ倬鹸縺ｮ隱ｭ縺ｿ霎ｼ縺ｿ
            </Label>
            <div className="mt-2 flex gap-3 items-center">
              <input
                type="file"
                id="loadFile"
                accept=".json"
                onChange={handleFileLoad}
                className="flex-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <Button type="button" variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                隱ｭ縺ｿ霎ｼ縺ｿ
              </Button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              JSON繝輔ぃ繧､繝ｫ繧帝∈謚槭＠縺ｦ譌｢蟄倥・險倬鹸繧定ｪｭ縺ｿ霎ｼ繧√∪縺・
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 蝓ｺ譛ｬ諠・ｱ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="occurrenceEvent">
                  逋ｺ逕滉ｺ玖ｱ｡ <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="occurrenceEvent"
                  value={formData.occurrenceEvent}
                  onChange={(e) => updateField('occurrenceEvent', e.target.value)}
                  placeholder="萓・ 繧ｨ繝ｳ繧ｸ繝ｳ蛛懈ｭ｢縲∝・蜊ｴ豌ｴ貍上ｌ縲∫焚髻ｳ逋ｺ逕・
                  className={errors.occurrenceEvent ? 'border-red-500' : ''}
                />
                {errors.occurrenceEvent && (
                  <p className="mt-1 text-sm text-red-600">{errors.occurrenceEvent}</p>
                )}
              </div>

              <div>
                <Label htmlFor="vehicleNumber">
                  讖溽ｨｮ <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="vehicleNumber"
                  value={formData.vehicleNumber}
                  onChange={(e) => updateField('vehicleNumber', e.target.value)}
                  placeholder="萓・ 繝輔か繝ｼ繧ｯ繝ｪ繝輔ヨ縲√ム繝ｳ繝励ヨ繝ｩ繝・け"
                  className={errors.vehicleNumber ? 'border-red-500' : ''}
                />
                {errors.vehicleNumber && (
                  <p className="mt-1 text-sm text-red-600">{errors.vehicleNumber}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="equipmentCategory">
                陬・ｽｮ繧ｫ繝・ざ繝ｪ繝ｻ陬・ｽｮ蜷咲ｧｰ <span className="text-red-500">*</span>
              </Label>
              <Input
                id="equipmentCategory"
                value={formData.equipmentCategory}
                onChange={(e) => updateField('equipmentCategory', e.target.value)}
                placeholder="萓・ 繧ｨ繝ｳ繧ｸ繝ｳ邉ｻ邨ｱ繝ｻ蜀ｷ蜊ｴ陬・ｽｮ"
                className={errors.equipmentCategory ? 'border-red-500' : ''}
              />
              {errors.equipmentCategory && (
                <p className="mt-1 text-sm text-red-600">{errors.equipmentCategory}</p>
              )}
            </div>

            {/* 謨・囿蛻・｡槭そ繧ｯ繧ｷ繝ｧ繝ｳ */}
            <FaultClassificationSection
              faultClassifications={formData.faultClassifications}
              onAdd={addFaultClassification}
              onRemove={removeFaultClassification}
              onUpdate={updateFaultClassification}
            />

            <div>
              <Label htmlFor="phenomenonMemo">
                迴ｾ雎｡繝｡繝｢ <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="phenomenonMemo"
                value={formData.phenomenonMemo}
                onChange={(e) => updateField('phenomenonMemo', e.target.value)}
                placeholder="謨・囿縺ｮ迴ｾ雎｡縺ｫ縺､縺・※隧ｳ縺励￥險倩ｿｰ縺励※縺上□縺輔＞"
                rows={4}
                className={errors.phenomenonMemo ? 'border-red-500' : ''}
              />
              {errors.phenomenonMemo && (
                <p className="mt-1 text-sm text-red-600">{errors.phenomenonMemo}</p>
              )}
            </div>

            {/* 謨・囿隕∝屏繧ｻ繧ｯ繧ｷ繝ｧ繝ｳ */}
            <FaultFactorSection
              faultFactors={formData.faultFactors}
              onAdd={addFaultFactor}
              onRemove={removeFaultFactor}
              onUpdate={updateFaultFactor}
            />

            {/* 蟇ｾ蠢懈ュ蝣ｱ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="inspectionProcedure">迴ｾ蝣ｴ遒ｺ隱肴焔鬆・/Label>
                <Textarea
                  id="inspectionProcedure"
                  value={formData.inspectionProcedure}
                  onChange={(e) => updateField('inspectionProcedure', e.target.value)}
                  placeholder="迴ｾ蝣ｴ縺ｧ縺ｮ遒ｺ隱肴焔鬆・ｒ險倩ｿｰ縺励※縺上□縺輔＞・郁､・焚陦悟庄・・
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="emergencyMeasures">蠢懈･蜃ｦ鄂ｮ</Label>
                <Textarea
                  id="emergencyMeasures"
                  value={formData.emergencyMeasures}
                  onChange={(e) => updateField('emergencyMeasures', e.target.value)}
                  placeholder="螳滓命縺励◆蠢懈･蜃ｦ鄂ｮ縺ｫ縺､縺・※險倩ｿｰ縺励※縺上□縺輔＞・郁､・焚陦悟庄・・
                  rows={4}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="permanentCountermeasures">諱剃ｹ・ｯｾ遲・/Label>
              <Textarea
                id="permanentCountermeasures"
                value={formData.permanentCountermeasures}
                onChange={(e) => updateField('permanentCountermeasures', e.target.value)}
                placeholder="諱剃ｹ・噪縺ｪ蟇ｾ遲悶↓縺､縺・※險倩ｿｰ縺励※縺上□縺輔＞"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="remarks">蛯呵・/Label>
                <Textarea
                  id="remarks"
                  value={formData.remarks}
                  onChange={(e) => updateField('remarks', e.target.value)}
                  placeholder="縺昴・莉悶・蛯呵・′縺ゅｌ縺ｰ險倩ｿｰ縺励※縺上□縺輔＞"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="recorder">
                  險倬鹸閠・<span className="text-red-500">*</span>
                </Label>
                <Input
                  id="recorder"
                  value={formData.recorder}
                  onChange={(e) => updateField('recorder', e.target.value)}
                  placeholder="險倬鹸閠・錐繧貞・蜉帙＠縺ｦ縺上□縺輔＞"
                  className={errors.recorder ? 'border-red-500' : ''}
                />
                {errors.recorder && (
                  <p className="mt-1 text-sm text-red-600">{errors.recorder}</p>
                )}
              </div>
            </div>

            {/* 騾∽ｿ｡繝懊ち繝ｳ */}
            <div className="flex justify-center pt-6 border-t">
              <Button type="submit" size="lg" className="flex items-center gap-2">
                <Save className="h-5 w-5" />
                險倬鹸繧剃ｿ晏ｭ・
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
