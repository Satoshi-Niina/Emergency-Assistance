import React from 'react';
import { X, Plus } from 'lucide-react';
import { Button } from '../ui/button';
import { FaultClassification } from './types';

interface Props {
  faultClassifications: FaultClassification[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, field: 'type' | 'custom', value: string) => void;
}

const FAULT_CLASSIFICATION_OPTIONS = [
  '機械的故障',
  '電気系故障',
  '空圧系故障',
  '油圧系故障',
  '冷却系故障',
  '燃料系故障',
  '制御系故障',
  'その他'
];

export default function FaultClassificationSection({ 
  faultClassifications, 
  onAdd, 
  onRemove, 
  onUpdate 
}: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">故障分類</h3>
        <Button onClick={onAdd} type="button" variant="outline" size="sm" className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          分類追加
        </Button>
      </div>
      
      <div className="space-y-3">
        {faultClassifications.map((classification, index) => (
          <div key={index} className="flex gap-3 items-start p-4 bg-gray-50 rounded-lg border">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                分類タイプ
              </label>
              <select
                value={classification.type}
                onChange={(e) => onUpdate(index, 'type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">選択してください</option>
                {FAULT_CLASSIFICATION_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                カスタム分類（任意）
              </label>
              <input
                type="text"
                value={classification.custom}
                onChange={(e) => onUpdate(index, 'custom', e.target.value)}
                placeholder="カスタム分類を入力"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {faultClassifications.length > 1 && (
              <Button
                onClick={() => onRemove(index)}
                type="button"
                variant="destructive"
                size="sm"
                className="mt-7"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
