import { useState } from 'react';

interface DebugErrorProps {
  enabled?: boolean;
}

export function DebugError({ enabled = false }: DebugErrorProps) {
  const [shouldError, setShouldError] = useState(false);

  if (enabled && shouldError) {
    throw new Error('デバッグ用の強制エラー');
  }

  if (!enabled) {
    return null;
  }

  return (
    <div className='fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded'>
      <button
        onClick={() => setShouldError(true)}
        className='bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded'
      >
        エラーを発生させる（テスト用）
      </button>
    </div>
  );
}
