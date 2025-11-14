/**
 * 邨ｱ荳縺輔ｌ縺溘ヵ繝ｭ繝ｼ繝・・繧ｿ菫晏ｭ伜・逅・ * 逕ｻ蜒上ョ繝ｼ繧ｿ縺檎｢ｺ螳溘↓菫晏ｭ倥＆繧後ｋ繧医≧縺ｫ縺吶ｋ
 */

import { buildApiUrl } from './api';

export interface FlowData {
  id: string;
  title: string;
  description: string;
  triggerKeywords: string[];
  steps: Array<{
    id: string;
    title: string;
    description: string;
    message: string;
    type: string;
    images?: Array<{
      url: string;
      fileName: string;
    }>;
    options?: any[];
    conditions?: any[];
  }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface SaveOptions {
  validateImages?: boolean;
  logDetails?: boolean;
}

/**
 * 繝輔Ο繝ｼ繝・・繧ｿ縺ｮ逕ｻ蜒乗ュ蝣ｱ繧呈､懆ｨｼ繝ｻ繧ｯ繝ｪ繝ｼ繝九Φ繧ｰ
 */
export function validateAndCleanFlowData(flowData: FlowData, options: SaveOptions = {}): FlowData {
  const { validateImages = true, logDetails = true } = options;
  
  if (logDetails) {
    console.log('剥 繝輔Ο繝ｼ繝・・繧ｿ讀懆ｨｼ髢句ｧ・', {
      id: flowData.id,
      title: flowData.title,
      stepsCount: flowData.steps?.length || 0,
      stepsWithImages: flowData.steps?.filter(step => step.images && step.images.length > 0).length || 0
    });
  }

  const cleanedSteps = flowData.steps.map(step => {
    if (logDetails) {
      console.log('剥 繧ｹ繝・ャ繝礼判蜒丞・逅・幕蟋・', {
        stepId: step.id,
        stepTitle: step.title,
        originalImages: step.images,
        hasImages: !!step.images,
        imagesLength: step.images?.length || 0,
      });
    }

    // 逕ｻ蜒上ョ繝ｼ繧ｿ縺ｮ讀懆ｨｼ縺ｨ繧ｯ繝ｪ繝ｼ繝九Φ繧ｰ
    let cleanedImages: Array<{ url: string; fileName: string }> = [];
    
    if (step.images && Array.isArray(step.images)) {
      cleanedImages = step.images
        .map(img => {
          if (logDetails) {
            console.log('名・・逕ｻ蜒丞・逅・', {
              originalImg: img,
              url: img.url,
              fileName: img.fileName,
              urlValid: img.url && img.url.trim() !== '',
              fileNameValid: img.fileName && img.fileName.trim() !== '',
            });
          }
          
          // URL縺悟ｭ伜惠縺吶ｋ蝣ｴ蜷医・譛牙柑縺ｪ逕ｻ蜒上→縺励※謇ｱ縺・          if (img.url && img.url.trim() !== '') {
            return {
              url: img.url,
              fileName: img.fileName && img.fileName.trim() !== '' 
                ? img.fileName 
                : img.url.split('/').pop() || '', // URL縺九ｉ繝輔ぃ繧､繝ｫ蜷阪ｒ謚ｽ蜃ｺ
            };
          }
          return null;
        })
        .filter(img => img !== null) as Array<{ url: string; fileName: string }>;
    }

    if (logDetails) {
      if (cleanedImages.length > 0) {
        console.log('笨・譛牙柑縺ｪ逕ｻ蜒乗ュ蝣ｱ:', {
          stepId: step.id,
          stepTitle: step.title,
          imagesCount: cleanedImages.length,
          images: cleanedImages,
        });
      } else {
        console.log('笶・譛牙柑縺ｪ逕ｻ蜒上↑縺・', {
          stepId: step.id,
          stepTitle: step.title,
          originalImages: step.images,
          processedImages: cleanedImages,
        });
      }
    }

    // 繧ｹ繝・ャ繝励ョ繝ｼ繧ｿ繧偵け繝ｪ繝ｼ繝九Φ繧ｰ
    const { imageUrl, imageFileName, ...restOfStep } = step as any;
    
    return {
      ...restOfStep,
      images: cleanedImages,
    };
  });

  const cleanedFlowData = {
    ...flowData,
    steps: cleanedSteps,
    updatedAt: new Date().toISOString(),
  };

  if (logDetails) {
    console.log('笨・繝輔Ο繝ｼ繝・・繧ｿ讀懆ｨｼ螳御ｺ・', {
      id: cleanedFlowData.id,
      title: cleanedFlowData.title,
      stepsCount: cleanedFlowData.steps.length,
      stepsWithImages: cleanedFlowData.steps.filter(step => step.images && step.images.length > 0).length,
      allStepsImages: cleanedFlowData.steps.map(step => ({
        stepId: step.id,
        stepTitle: step.title,
        imagesCount: step.images?.length || 0,
        images: step.images?.map(img => ({
          fileName: img.fileName,
          url: img.url?.substring(0, 100) + '...'
        })) || []
      }))
    });
  }

  return cleanedFlowData;
}

/**
 * 邨ｱ荳縺輔ｌ縺溘ヵ繝ｭ繝ｼ繝・・繧ｿ菫晏ｭ伜・逅・ */
export async function saveFlowData(
  flowData: FlowData, 
  options: SaveOptions = {}
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    console.log('沈 邨ｱ荳繝輔Ο繝ｼ菫晏ｭ伜・逅・幕蟋・', {
      id: flowData.id,
      title: flowData.title,
      stepsCount: flowData.steps?.length || 0,
    });

    // 繝輔Ο繝ｼ繝・・繧ｿ縺ｮ讀懆ｨｼ縺ｨ繧ｯ繝ｪ繝ｼ繝九Φ繧ｰ
    const cleanedFlowData = validateAndCleanFlowData(flowData, options);

    // API繧ｨ繝ｳ繝峨・繧､繝ｳ繝医・讒狗ｯ・    const url = cleanedFlowData.id
      ? buildApiUrl(`/emergency-flow/${cleanedFlowData.id}`)
      : buildApiUrl('/emergency-flow');
    const method = cleanedFlowData.id ? 'PUT' : 'POST';

    console.log('沈 菫晏ｭ倥Μ繧ｯ繧ｨ繧ｹ繝磯∽ｿ｡:', {
      url,
      method,
      flowId: cleanedFlowData.id,
      stepsCount: cleanedFlowData.steps.length,
      stepsWithImages: cleanedFlowData.steps.filter(step => step.images && step.images.length > 0).length,
      allStepsImages: cleanedFlowData.steps.map(step => ({
        stepId: step.id,
        stepTitle: step.title,
        imagesCount: step.images?.length || 0,
        images: step.images?.map(img => ({
          fileName: img.fileName,
          url: img.url?.substring(0, 100) + '...'
        })) || []
      }))
    });

    // API繝ｪ繧ｯ繧ｨ繧ｹ繝医・騾∽ｿ｡
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cleanedFlowData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `菫晏ｭ倥↓螟ｱ謨励＠縺ｾ縺励◆ (${response.status}: ${response.statusText})`);
    }

    const result = await response.json();
    
    console.log('笨・邨ｱ荳繝輔Ο繝ｼ菫晏ｭ俶・蜉・', {
      id: result.data?.id || cleanedFlowData.id,
      title: result.data?.title || cleanedFlowData.title,
      stepsCount: result.data?.steps?.length || cleanedFlowData.steps.length,
      stepsWithImages: result.data?.steps?.filter((step: any) => step.images && step.images.length > 0).length || 0,
    });

    return {
      success: true,
      data: result.data || cleanedFlowData,
    };

  } catch (error) {
    console.error('笶・邨ｱ荳繝輔Ο繝ｼ菫晏ｭ倥お繝ｩ繝ｼ:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '菫晏ｭ倥↓螟ｱ謨励＠縺ｾ縺励◆',
    };
  }
}

/**
 * 繝輔Ο繝ｼ繝・・繧ｿ縺ｮ逕ｻ蜒乗ュ蝣ｱ繧貞叙蠕・ */
export function getFlowImageInfo(flowData: FlowData): {
  totalSteps: number;
  stepsWithImages: number;
  totalImages: number;
  imageDetails: Array<{
    stepId: string;
    stepTitle: string;
    imagesCount: number;
    images: Array<{ fileName: string; url: string }>;
  }>;
} {
  const totalSteps = flowData.steps?.length || 0;
  const stepsWithImages = flowData.steps?.filter(step => step.images && step.images.length > 0).length || 0;
  const totalImages = flowData.steps?.reduce((sum, step) => sum + (step.images?.length || 0), 0) || 0;
  
  const imageDetails = flowData.steps?.map(step => ({
    stepId: step.id,
    stepTitle: step.title,
    imagesCount: step.images?.length || 0,
    images: step.images?.map(img => ({
      fileName: img.fileName,
      url: img.url
    })) || []
  })) || [];

  return {
    totalSteps,
    stepsWithImages,
    totalImages,
    imageDetails,
  };
}
