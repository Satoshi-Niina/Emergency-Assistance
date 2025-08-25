import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * 繧ｯ繝ｩ繧ｹ蜷阪ｒ邨仙粋縺吶ｋ繝ｦ繝ｼ繝・ぅ繝ｪ繝・ぅ髢｢謨ｰ
 * clsx縺ｨtwMerge繧剃ｽｿ逕ｨ縺励※縲√ユ繝ｼ繝ｫ繧ｦ繧｣繝ｳ繝韻SS縺ｮ繧ｯ繝ｩ繧ｹ繧貞柑邇・噪縺ｫ繝槭・繧ｸ縺励∪縺・
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 驕ｸ謚槭＆繧後◆繝輔ぅ繝ｼ繝ｫ繝峨ｒ鬆・ｺ丈ｻ倥￠繧九Θ繝ｼ繝・ぅ繝ｪ繝・ぅ髢｢謨ｰ
 * 繝・・繧ｿ繝吶・繧ｹ繧ｯ繧ｨ繝ｪ縺ｮ邨先棡繧呈紛蠖｢縺吶ｋ縺ｮ縺ｫ菴ｿ逕ｨ縺励∪縺・
 */
export function orderSelectedFields(fields: Record<string, any> | undefined | null): Record<string, any> {
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
    console.warn("Invalid fields argument:", fields);
    return {};
  }

  return Object.entries(fields).reduce((acc, [key, value]) => {
    acc[key] = value;
    return acc;
  }, {} as Record<string, any>);
}

/**
 * 逕ｻ蜒酋RL繧呈ｭ｣縺励＞API繧ｨ繝ｳ繝峨・繧､繝ｳ繝医↓螟画鋤縺吶ｋ髢｢謨ｰ
 */
export function convertImageUrl(url: string | undefined | null): string {
  if (!url) return '';
  
  // API險ｭ螳・- VITE_API_BASE_URL縺ｮ縺ｿ繧剃ｽｿ逕ｨ
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

  console.log('肌 API險ｭ螳・', {
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    apiBaseUrl
  });
  
  // 譌｢縺ｫ螳悟・縺ｪURL縺ｮ蝣ｴ蜷医・縺昴・縺ｾ縺ｾ霑斐☆
  if (url.startsWith('http://') || url.startsWith('https://')) {
    console.log('螳悟・縺ｪURL繧偵◎縺ｮ縺ｾ縺ｾ霑斐☆:', url);
    return url;
  }
  
  // 譌｢縺ｫAPI繧ｨ繝ｳ繝峨・繧､繝ｳ繝亥ｽ｢蠑上・蝣ｴ蜷医・繝吶・繧ｹURL繧定ｿｽ蜉
  if (url.startsWith('/api/emergency-flow/image/')) {
    const finalUrl = `${apiBaseUrl}${url}`;
    console.log('API繧ｨ繝ｳ繝峨・繧､繝ｳ繝亥ｽ｢蠑上ｒ螟画鋤:', { original: url, final: finalUrl });
    return finalUrl;
  }
  
  // 繝輔ぃ繧､繝ｫ蜷阪ｒ謚ｽ蜃ｺ・医ヱ繧ｹ繧ｻ繝代Ξ繝ｼ繧ｿ繧定・・・・
  let fileName = url;
  if (url.includes('/')) {
    fileName = url.split('/').pop() || url;
  } else if (url.includes('\\')) {
    fileName = url.split('\\').pop() || url;
  }
  
  // 繝輔ぃ繧､繝ｫ蜷阪′遨ｺ縺ｮ蝣ｴ蜷医・蜈・・URL繧定ｿ斐☆
  if (!fileName || fileName === url) {
    console.log('繝輔ぃ繧､繝ｫ蜷肴歓蜃ｺ螟ｱ謨励∝・縺ｮURL繧定ｿ斐☆:', url);
    return url;
  }
  
  // 譁ｰ縺励＞API繧ｨ繝ｳ繝峨・繧､繝ｳ繝亥ｽ｢蠑上↓螟画鋤縺励※霑斐☆
  const finalUrl = `${apiBaseUrl}/api/emergency-flow/image/${fileName}`;
  console.log('逕ｻ蜒酋RL螟画鋤螳御ｺ・', { original: url, fileName: fileName, final: finalUrl });
  return finalUrl;
}



