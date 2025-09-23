import React, { useState, useEffect } from 'react';
import { Upload, Download, Save, FileText, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import FaultClassificationSection from './FaultClassificationSection';
import FaultFactorSection from './FaultFactorSection';
import {
  VehicleMaintenanceRecord,
  FormData,
  FaultClassification,
  FaultFactor,
} from './types';

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
    faultFactors: [{ type: '', content: '' }],
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [successMessage, setSuccessMessage] = useState('');

  // 基本フィールドの更新
  const updateField = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // エラーをクリア
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // 故障分類の管理
  const addFaultClassification = () => {
    setFormData(prev => ({
      ...prev,
      faultClassifications: [
        ...prev.faultClassifications,
        { type: '', custom: '' },
      ],
    }));
  };

  const removeFaultClassification = (index: number) => {
    if (formData.faultClassifications.length > 1) {
      setFormData(prev => ({
        ...prev,
        faultClassifications: prev.faultClassifications.filter(
          (_, i) => i !== index
        ),
      }));
    }
  };

  const updateFaultClassification = (
    index: number,
    field: 'type' | 'custom',
    value: string
  ) => {
    setFormData(prev => ({
      ...prev,
      faultClassifications: prev.faultClassifications.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  // 故障要因の管理
  const addFaultFactor = () => {
    setFormData(prev => ({
      ...prev,
      faultFactors: [...prev.faultFactors, { type: '', content: '' }],
    }));
  };

  const removeFaultFactor = (index: number) => {
    if (formData.faultFactors.length > 1) {
      setFormData(prev => ({
        ...prev,
        faultFactors: prev.faultFactors.filter((_, i) => i !== index),
      }));
    }
  };

  const updateFaultFactor = (
    index: number,
    field: 'type' | 'content',
    value: string
  ) => {
    setFormData(prev => ({
      ...prev,
      faultFactors: prev.faultFactors.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  // バリデーション
  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.occurrenceEvent.trim()) {
      newErrors.occurrenceEvent = '発生事象は必須項目です。';
    }
    if (!formData.vehicleNumber.trim()) {
      newErrors.vehicleNumber = '機種は必須項目です。';
    }
    if (!formData.equipmentCategory.trim()) {
      newErrors.equipmentCategory = '装置カテゴリ・装置名称は必須項目です。';
    }
    if (!formData.phenomenonMemo.trim()) {
      newErrors.phenomenonMemo = '現象メモは必須項目です。';
    }
    if (!formData.recorder.trim()) {
      newErrors.recorder = '記録者は必須項目です。';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // レコードIDの生成
  const generateRecordId = (): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${timestamp}-${random}`;
  };

  // JSONファイルの保存（サーバー経由）
  const saveToServer = async (
    data: VehicleMaintenanceRecord
  ): Promise<void> => {
    try {
      const response = await fetch('/api/maintenance/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('サーバーへの保存に失敗しました');
      }

      const result = await response.json();
      console.log('保存成功:', result);
    } catch (error) {
      console.error('保存エラー:', error);
      throw error;
    }
  };

  // フォーム送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      // 故障分類をフィルター（空のものを除外）
      const validClassifications = formData.faultClassifications.filter(
        item => item.type || item.custom
      );

      // 故障要因をフィルター（空のものを除外）
      const validFactors = formData.faultFactors.filter(
        item => item.type || item.content
      );

      // 構造化JSONデータの作成
      const maintenanceRecord: VehicleMaintenanceRecord = {
        metadata: {
          recordId: generateRecordId(),
          createdAt: new Date().toISOString(),
          version: '1.0',
        },
        occurrence: {
          event: formData.occurrenceEvent,
          recordedAt: new Date().toISOString(),
          vehicle: {
            type: formData.vehicleNumber,
            equipment: {
              category: formData.equipmentCategory,
            },
          },
        },
        fault: {
          classifications: validClassifications,
          phenomenon: formData.phenomenonMemo,
          factors: validFactors,
        },
        response: {
          inspection: {
            procedure: formData.inspectionProcedure
              ? formData.inspectionProcedure
                  .split('\n')
                  .filter(line => line.trim())
              : [],
          },
          measures: {
            emergency: formData.emergencyMeasures
              ? formData.emergencyMeasures
                  .split('\n')
                  .filter(line => line.trim())
              : [],
            permanent: formData.permanentCountermeasures,
          },
        },
        notes: {
          remarks: formData.remarks,
          recorder: formData.recorder,
        },
      };

      // サーバーに保存
      await saveToServer(maintenanceRecord);

      // 成功メッセージを表示
      setSuccessMessage('記録が正常に保存されました。');

      // 3秒後にメッセージを非表示
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);

      // フォームリセットの確認
      setTimeout(() => {
        if (confirm('フォームをリセットして新しい記録を入力しますか？')) {
          resetForm();
        }
      }, 1000);
    } catch (error) {
      console.error('保存エラー:', error);
      alert('保存中にエラーが発生しました。もう一度お試しください。');
    }
  };

  // ファイル読み込み
  const handleFileLoad = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      alert('JSONファイルを選択してください。');
      return;
    }

    const reader = new FileReader();
    reader.onload = e => {
      try {
        const jsonData = JSON.parse(e.target?.result as string);
        loadDataToForm(jsonData);
        setSuccessMessage('ファイルが正常に読み込まれました。');
        setTimeout(() => setSuccessMessage(''), 3000);
      } catch (error) {
        console.error('JSONファイルの読み込みエラー:', error);
        alert('JSONファイルの形式が正しくありません。');
      }
    };
    reader.readAsText(file);
  };

  // JSONデータをフォームに展開
  const loadDataToForm = (jsonData: VehicleMaintenanceRecord) => {
    setFormData({
      occurrenceEvent: jsonData.occurrence?.event || '',
      vehicleNumber: jsonData.occurrence?.vehicle?.type || '',
      equipmentCategory:
        jsonData.occurrence?.vehicle?.equipment?.category || '',
      phenomenonMemo: jsonData.fault?.phenomenon || '',
      inspectionProcedure:
        jsonData.response?.inspection?.procedure?.join('\n') || '',
      emergencyMeasures:
        jsonData.response?.measures?.emergency?.join('\n') || '',
      permanentCountermeasures: jsonData.response?.measures?.permanent || '',
      remarks: jsonData.notes?.remarks || '',
      recorder: jsonData.notes?.recorder || '',
      faultClassifications:
        jsonData.fault?.classifications?.length > 0
          ? jsonData.fault.classifications
          : [{ type: '', custom: '' }],
      faultFactors:
        jsonData.fault?.factors?.length > 0
          ? jsonData.fault.factors
          : [{ type: '', content: '' }],
    });
  };

  // フォームリセット
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
      faultFactors: [{ type: '', content: '' }],
    });
    setErrors({});
  };

  return (
    <div className='max-w-4xl mx-auto p-6 space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle className='text-2xl font-bold text-center text-gray-900'>
            車両保守故障記録システム
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* 成功メッセージ */}
          {successMessage && (
            <div className='mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2'>
              <CheckCircle className='h-5 w-5 text-green-600' />
              <span className='text-green-800'>{successMessage}</span>
            </div>
          )}

          {/* ファイル読み込み */}
          <div className='mb-6 p-4 bg-gray-50 rounded-lg'>
            <Label
              htmlFor='loadFile'
              className='text-sm font-medium text-gray-700'
            >
              既存記録の読み込み
            </Label>
            <div className='mt-2 flex gap-3 items-center'>
              <input
                type='file'
                id='loadFile'
                accept='.json'
                onChange={handleFileLoad}
                className='flex-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100'
              />
              <Button type='button' variant='outline' size='sm'>
                <Upload className='h-4 w-4 mr-2' />
                読み込み
              </Button>
            </div>
            <p className='mt-2 text-xs text-gray-500'>
              JSONファイルを選択して既存の記録を読み込めます
            </p>
          </div>

          <form onSubmit={handleSubmit} className='space-y-6'>
            {/* 基本情報 */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div>
                <Label htmlFor='occurrenceEvent'>
                  発生事象 <span className='text-red-500'>*</span>
                </Label>
                <Input
                  id='occurrenceEvent'
                  value={formData.occurrenceEvent}
                  onChange={e => updateField('occurrenceEvent', e.target.value)}
                  placeholder='例: エンジン停止、冷却水漏れ、異音発生'
                  className={errors.occurrenceEvent ? 'border-red-500' : ''}
                />
                {errors.occurrenceEvent && (
                  <p className='mt-1 text-sm text-red-600'>
                    {errors.occurrenceEvent}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor='vehicleNumber'>
                  機種 <span className='text-red-500'>*</span>
                </Label>
                <Input
                  id='vehicleNumber'
                  value={formData.vehicleNumber}
                  onChange={e => updateField('vehicleNumber', e.target.value)}
                  placeholder='例: フォークリフト、ダンプトラック'
                  className={errors.vehicleNumber ? 'border-red-500' : ''}
                />
                {errors.vehicleNumber && (
                  <p className='mt-1 text-sm text-red-600'>
                    {errors.vehicleNumber}
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor='equipmentCategory'>
                装置カテゴリ・装置名称 <span className='text-red-500'>*</span>
              </Label>
              <Input
                id='equipmentCategory'
                value={formData.equipmentCategory}
                onChange={e => updateField('equipmentCategory', e.target.value)}
                placeholder='例: エンジン系統・冷却装置'
                className={errors.equipmentCategory ? 'border-red-500' : ''}
              />
              {errors.equipmentCategory && (
                <p className='mt-1 text-sm text-red-600'>
                  {errors.equipmentCategory}
                </p>
              )}
            </div>

            {/* 故障分類セクション */}
            <FaultClassificationSection
              faultClassifications={formData.faultClassifications}
              onAdd={addFaultClassification}
              onRemove={removeFaultClassification}
              onUpdate={updateFaultClassification}
            />

            <div>
              <Label htmlFor='phenomenonMemo'>
                現象メモ <span className='text-red-500'>*</span>
              </Label>
              <Textarea
                id='phenomenonMemo'
                value={formData.phenomenonMemo}
                onChange={e => updateField('phenomenonMemo', e.target.value)}
                placeholder='故障の現象について詳しく記述してください'
                rows={4}
                className={errors.phenomenonMemo ? 'border-red-500' : ''}
              />
              {errors.phenomenonMemo && (
                <p className='mt-1 text-sm text-red-600'>
                  {errors.phenomenonMemo}
                </p>
              )}
            </div>

            {/* 故障要因セクション */}
            <FaultFactorSection
              faultFactors={formData.faultFactors}
              onAdd={addFaultFactor}
              onRemove={removeFaultFactor}
              onUpdate={updateFaultFactor}
            />

            {/* 対応情報 */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div>
                <Label htmlFor='inspectionProcedure'>現場確認手順</Label>
                <Textarea
                  id='inspectionProcedure'
                  value={formData.inspectionProcedure}
                  onChange={e =>
                    updateField('inspectionProcedure', e.target.value)
                  }
                  placeholder='現場での確認手順を記述してください（複数行可）'
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor='emergencyMeasures'>応急処置</Label>
                <Textarea
                  id='emergencyMeasures'
                  value={formData.emergencyMeasures}
                  onChange={e =>
                    updateField('emergencyMeasures', e.target.value)
                  }
                  placeholder='実施した応急処置について記述してください（複数行可）'
                  rows={4}
                />
              </div>
            </div>

            <div>
              <Label htmlFor='permanentCountermeasures'>恒久対策</Label>
              <Textarea
                id='permanentCountermeasures'
                value={formData.permanentCountermeasures}
                onChange={e =>
                  updateField('permanentCountermeasures', e.target.value)
                }
                placeholder='恒久的な対策について記述してください'
                rows={3}
              />
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div>
                <Label htmlFor='remarks'>備考</Label>
                <Textarea
                  id='remarks'
                  value={formData.remarks}
                  onChange={e => updateField('remarks', e.target.value)}
                  placeholder='その他の備考があれば記述してください'
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor='recorder'>
                  記録者 <span className='text-red-500'>*</span>
                </Label>
                <Input
                  id='recorder'
                  value={formData.recorder}
                  onChange={e => updateField('recorder', e.target.value)}
                  placeholder='記録者名を入力してください'
                  className={errors.recorder ? 'border-red-500' : ''}
                />
                {errors.recorder && (
                  <p className='mt-1 text-sm text-red-600'>{errors.recorder}</p>
                )}
              </div>
            </div>

            {/* 送信ボタン */}
            <div className='flex justify-center pt-6 border-t'>
              <Button
                type='submit'
                size='lg'
                className='flex items-center gap-2'
              >
                <Save className='h-5 w-5' />
                記録を保存
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
