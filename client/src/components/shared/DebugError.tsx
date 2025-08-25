import { useState } from 'react';

interface DebugErrorProps {
  enabled?: boolean;
}

export function DebugError({ enabled = false }: DebugErrorProps) {
  const [shouldError, setShouldError] = useState(false);

  if (enabled && shouldError) {
    throw new Error('繝・ヰ繝・げ逕ｨ縺ｮ蠑ｷ蛻ｶ繧ｨ繝ｩ繝ｼ');
  }

  if (!enabled) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
      <button
        onClick={() => setShouldError(true)}
        className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
      >
        繧ｨ繝ｩ繝ｼ繧堤匱逕溘＆縺帙ｋ・医ユ繧ｹ繝育畑・・
      </button>
    </div>
  );
} 