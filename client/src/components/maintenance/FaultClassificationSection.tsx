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
  '讖滓｢ｰ逧・腐髫・,
  '髮ｻ豌礼ｳｻ謨・囿',
  '遨ｺ蝨ｧ邉ｻ謨・囿',
  '豐ｹ蝨ｧ邉ｻ謨・囿',
  '蜀ｷ蜊ｴ邉ｻ謨・囿',
  '辯・侭邉ｻ謨・囿',
  '蛻ｶ蠕｡邉ｻ謨・囿',
  '縺昴・莉・
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
        <h3 className="text-lg font-semibold text-gray-900">謨・囿蛻・｡・/h3>
        <Button onClick={onAdd} type="button" variant="outline" size="sm" className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          蛻・｡櫁ｿｽ蜉
        </Button>
      </div>
      
      <div className="space-y-3">
        {faultClassifications.map((classification, index) => (
          <div key={index} className="flex gap-3 items-start p-4 bg-gray-50 rounded-lg border">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                蛻・｡槭ち繧､繝・
              </label>
              <select
                value={classification.type}
                onChange={(e) => onUpdate(index, 'type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">驕ｸ謚槭＠縺ｦ縺上□縺輔＞</option>
                {FAULT_CLASSIFICATION_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                繧ｫ繧ｹ繧ｿ繝蛻・｡橸ｼ井ｻｻ諢擾ｼ・
              </label>
              <input
                type="text"
                value={classification.custom}
                onChange={(e) => onUpdate(index, 'custom', e.target.value)}
                placeholder="繧ｫ繧ｹ繧ｿ繝蛻・｡槭ｒ蜈･蜉・
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
