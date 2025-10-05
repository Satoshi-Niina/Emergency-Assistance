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
  '部品劣化',
  'メンテナンス不備',
  '外的要因',
  '設計不良',
  '操作ミス',
  '環境要因',
  'その他',
];

export default function FaultFactorSection({
  faultFactors,
  onAdd,
  onRemove,
  onUpdate,
}: Props) {
  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <h3 className='text-lg font-semibold text-gray-900'>故障要因</h3>
        <Button
          onClick={onAdd}
          type='button'
          variant='outline'
          size='sm'
          className='flex items-center gap-2'
        >
          <Plus className='h-4 w-4' />
          要因追加
        </Button>
      </div>

      <div className='space-y-3'>
        {faultFactors.map((factor, index) => (
          <div
            key={index}
            className='flex gap-3 items-start p-4 bg-gray-50 rounded-lg border'
          >
            <div className='flex-1'>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                要因タイプ
              </label>
              <select
                value={factor.type}
                onChange={e => onUpdate(index, 'type', e.target.value)}
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              >
                <option value=''>タイプ選択</option>
                {FAULT_FACTOR_OPTIONS.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className='flex-2'>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                詳細内容
              </label>
              <input
                type='text'
                value={factor.content}
                onChange={e => onUpdate(index, 'content', e.target.value)}
                placeholder='故障要因の詳細内容を入力'
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              />
            </div>

            {faultFactors.length > 1 && (
              <Button
                onClick={() => onRemove(index)}
                type='button'
                variant='destructive'
                size='sm'
                className='mt-7'
              >
                <X className='h-4 w-4' />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
