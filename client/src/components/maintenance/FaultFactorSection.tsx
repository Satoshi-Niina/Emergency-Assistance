import React from 'react';
import { X, Plus } from 'lucide-react';
import { Button } from '../ui/button';
import { FaultFactor } from './types';

interface Props {
  faultFactors: FaultFactor[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, field: 'type' | 'content', value: string) => void;
}

const FAULT_FACTOR_OPTIONS = [
  '驛ｨ蜩∝乾蛹・,
  '繝｡繝ｳ繝・リ繝ｳ繧ｹ荳榊ｙ',
  '螟也噪隕∝屏',
  '險ｭ險井ｸ崎憶',
  '謫堺ｽ懊Α繧ｹ',
  '迺ｰ蠅・ｦ∝屏',
  '縺昴・莉・
];

export default function FaultFactorSection({ 
  faultFactors, 
  onAdd, 
  onRemove, 
  onUpdate 
}: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">謨・囿隕∝屏</h3>
        <Button onClick={onAdd} type="button" variant="outline" size="sm" className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          隕∝屏霑ｽ蜉
        </Button>
      </div>
      
      <div className="space-y-3">
        {faultFactors.map((factor, index) => (
          <div key={index} className="flex gap-3 items-start p-4 bg-gray-50 rounded-lg border">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                隕∝屏繧ｿ繧､繝・
              </label>
              <select
                value={factor.type}
                onChange={(e) => onUpdate(index, 'type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">繧ｿ繧､繝鈴∈謚・/option>
                {FAULT_FACTOR_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            
            <div className="flex-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                隧ｳ邏ｰ蜀・ｮｹ
              </label>
              <input
                type="text"
                value={factor.content}
                onChange={(e) => onUpdate(index, 'content', e.target.value)}
                placeholder="謨・囿隕∝屏縺ｮ隧ｳ邏ｰ蜀・ｮｹ繧貞・蜉・
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {faultFactors.length > 1 && (
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
