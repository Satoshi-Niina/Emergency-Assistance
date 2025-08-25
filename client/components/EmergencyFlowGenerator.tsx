import React, { useState } from 'react';

interface EmergencyFlow {
  title: string;
  steps: {
    description: string;
    imageUrl?: string;
  }[];
}

export function EmergencyFlowGenerator() {
  const [keyword, setKeyword] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedFlow, setGeneratedFlow] = useState<EmergencyFlow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateFlow = async () => {
    if (!keyword.trim()) {
      setError('繧ｭ繝ｼ繝ｯ繝ｼ繝峨ｒ蜈･蜉帙＠縺ｦ縺上□縺輔＞');
      return;
    }

    setIsGenerating(true);
    setError(null);
    
    try {
      const response = await fetch('/api/generate-emergency-flow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keyword }),
      });

      if (!response.ok) {
        throw new Error('繝輔Ο繝ｼ縺ｮ逕滓・縺ｫ螟ｱ謨励＠縺ｾ縺励◆');
      }

      const data = await response.json();
      setGeneratedFlow(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : '莠域悄縺帙〓繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      {/* 繧ｿ繝悶Γ繝九Η繝ｼ */}
      <div style={{ marginBottom: '24px', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', gap: '16px' }}>
          <button style={{ padding: '8px 16px', fontWeight: 'bold' }}>譁ｰ隕丈ｽ懈・・医い繝・・繝ｭ繝ｼ繝会ｼ・/button>
          <button style={{ padding: '8px 16px' }}>繝・く繧ｹ繝育ｷｨ髮・/button>
          <button style={{ padding: '8px 16px' }}>繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ邱ｨ髮・/button>
        </div>
      </div>

      {/* 蜈･蜉帙そ繧ｯ繧ｷ繝ｧ繝ｳ */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ 
          fontSize: '1.25rem', 
          fontWeight: 'bold', 
          marginBottom: '8px' 
        }}>
          莠玖ｱ｡蜈･蜉・
        </h2>
        <div style={{ 
          backgroundColor: '#f9fafb', 
          padding: '16px', 
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          <textarea
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="蜈ｷ菴鍋噪縺ｪ逋ｺ逕滉ｺ玖ｱ｡縺ｨ迥ｶ豕√ｒ蜈･蜉帙＠縺ｦ縺上□縺輔＞・√％繧後ｒ繧ｭ繝ｼ繝ｯ繝ｼ繝峨→縺励※繝輔Ο繝ｼ繧堤函謌舌＠縺ｾ縺吶・
            style={{
              width: '100%',
              minHeight: '120px',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #e5e7eb'
            }}
          />
        </div>
        <button
          onClick={generateFlow}
          disabled={isGenerating}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#2563eb',
            color: 'white',
            borderRadius: '4px',
            fontWeight: 'bold',
            cursor: isGenerating ? 'not-allowed' : 'pointer',
            opacity: isGenerating ? 0.7 : 1
          }}
        >
          {isGenerating ? '逕滓・荳ｭ...' : '繝輔Ο繝ｼ繧堤函謌・}
        </button>
        {error && (
          <div style={{ color: 'red', marginTop: '8px' }}>{error}</div>
        )}
      </div>

      {/* 逕滓・縺輔ｌ縺溘ヵ繝ｭ繝ｼ */}
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px' }}>
        蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ逕滓・
      </h1>

      {generatedFlow && (
        <div style={{ 
          border: '1px solid #e5e7eb', 
          borderRadius: '8px', 
          padding: '16px' 
        }}>
          <h2 style={{ 
            fontSize: '1.25rem', 
            fontWeight: 'bold', 
            marginBottom: '16px' 
          }}>
            {generatedFlow.title}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {generatedFlow.steps.map((step, index) => (
              <div 
                key={index} 
                style={{ 
                  borderLeft: '4px solid #2563eb',
                  paddingLeft: '16px'
                }}
              >
                <p style={{ marginBottom: '8px' }}>{step.description}</p>
                {step.imageUrl && (
                  <img
                    src={step.imageUrl}
                    alt={`Step ${index + 1}`}
                    style={{ 
                      maxWidth: '100%', 
                      borderRadius: '8px' 
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 