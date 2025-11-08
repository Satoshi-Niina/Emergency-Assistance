/**
 * 統一されたフローデータ保存処理
 * 画像データが確実に保存されるようにする
 */

import { buildApiUrl } from './api-unified';

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
 * フローデータの画像情報を検証・クリーニング
 */
export function validateAndCleanFlowData(flowData: FlowData, options: SaveOptions = {}): FlowData {
  const { validateImages = true, logDetails = true } = options;
  
  if (logDetails) {
    console.log('🔍 フローデータ検証開始:', {
      id: flowData.id,
      title: flowData.title,
      stepsCount: flowData.steps?.length || 0,
      stepsWithImages: flowData.steps?.filter(step => step.images && step.images.length > 0).length || 0
    });
  }

  const cleanedSteps = flowData.steps.map(step => {
    if (logDetails) {
      console.log('🔍 ステップ画像処理開始:', {
        stepId: step.id,
        stepTitle: step.title,
        originalImages: step.images,
        hasImages: !!step.images,
        imagesLength: step.images?.length || 0,
      });
    }

    // 画像データの検証とクリーニング
    let cleanedImages: Array<{ url: string; fileName: string }> = [];
    
    if (step.images && Array.isArray(step.images)) {
      cleanedImages = step.images
        .map(img => {
          if (logDetails) {
            console.log('🖼️ 画像処理:', {
              originalImg: img,
              url: img.url,
              fileName: img.fileName,
              urlValid: img.url && img.url.trim() !== '',
              fileNameValid: img.fileName && img.fileName.trim() !== '',
            });
          }
          
          // URLが存在する場合は有効な画像として扱う
          if (img.url && img.url.trim() !== '') {
            return {
              url: img.url,
              fileName: img.fileName && img.fileName.trim() !== '' 
                ? img.fileName 
                : img.url.split('/').pop() || '', // URLからファイル名を抽出
            };
          }
          return null;
        })
        .filter(img => img !== null) as Array<{ url: string; fileName: string }>;
    }

    if (logDetails) {
      if (cleanedImages.length > 0) {
        console.log('✅ 有効な画像情報:', {
          stepId: step.id,
          stepTitle: step.title,
          imagesCount: cleanedImages.length,
          images: cleanedImages,
        });
      } else {
        console.log('❌ 有効な画像なし:', {
          stepId: step.id,
          stepTitle: step.title,
          originalImages: step.images,
          processedImages: cleanedImages,
        });
      }
    }

    // ステップデータをクリーニング
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
    console.log('✅ フローデータ検証完了:', {
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
 * 統一されたフローデータ保存処理
 */
export async function saveFlowData(
  flowData: FlowData, 
  options: SaveOptions = {}
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    console.log('💾 統一フロー保存処理開始:', {
      id: flowData.id,
      title: flowData.title,
      stepsCount: flowData.steps?.length || 0,
    });

    // フローデータの検証とクリーニング
    const cleanedFlowData = validateAndCleanFlowData(flowData, options);

    // APIエンドポイントの構築
    const url = cleanedFlowData.id
      ? buildApiUrl(`/emergency-flow/${cleanedFlowData.id}`)
      : buildApiUrl('/emergency-flow');
    const method = cleanedFlowData.id ? 'PUT' : 'POST';

    console.log('💾 保存リクエスト送信:', {
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

    // APIリクエストの送信
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cleanedFlowData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `保存に失敗しました (${response.status}: ${response.statusText})`);
    }

    const result = await response.json();
    
    console.log('✅ 統一フロー保存成功:', {
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
    console.error('❌ 統一フロー保存エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '保存に失敗しました',
    };
  }
}

/**
 * フローデータの画像情報を取得
 */
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
