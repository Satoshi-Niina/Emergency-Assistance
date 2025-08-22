import { apiRequest } from './queryClient';

/**
 * Process text with ChatGPT
 * @param text The text to process
 * @returns The AI response
 */
export const processWithChatGPT = async (text: string): Promise<string> => {
  try {
    const response = await apiRequest('POST', '/api/chatgpt', { text });
    const data = await response.json();
    return data.response;
  } catch (error: any) {
    console.error('ChatGPT error:', error);
    
    // Check if we have a specific error message from the server
    if (error.response && typeof error.response.json === 'function') {
      try {
        const errorData = await error.response.json();
        if (errorData.message) {
          throw new Error(errorData.message);
        }
      } catch (jsonError) {
        // If JSON parsing fails, continue with generic error
      }
    }
    
    // Handle specific HTTP status codes
    if (error.status === 401) {
      throw new Error('API繧ｭ繝ｼ縺檎┌蜉ｹ縺ｧ縺吶ゅす繧ｹ繝・Β邂｡逅・・↓騾｣邨｡縺励※縺上□縺輔＞縲・);
    } else if (error.status === 429) {
      throw new Error('API縺ｮ蛻ｩ逕ｨ蛻ｶ髯舌↓驕斐＠縺ｾ縺励◆縲ゅ＠縺ｰ繧峨￥縺励※縺九ｉ繧ゅ≧荳蠎ｦ縺願ｩｦ縺励￥縺縺輔＞縲・);
    } else if (error.status === 500) {
      throw new Error('繧ｵ繝ｼ繝舌・繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆縲らｮ｡逅・・↓騾｣邨｡縺励※縺上□縺輔＞縲・);
    }
    
    throw new Error('ChatGPT縺ｧ縺ｮ蜃ｦ逅・↓螟ｱ謨励＠縺ｾ縺励◆');
  }
};

/**
 * Optimize a search query using ChatGPT
 * @param text The original search text
 * @returns The optimized search query
 */
export const optimizeSearchQuery = async (text: string): Promise<string> => {
  try {
    const response = await apiRequest('POST', '/api/optimize-search-query', { text });
    const data = await response.json();
    return data.optimizedQuery;
  } catch (error) {
    console.error('Search query optimization error:', error);
    // Return the original text if optimization fails
    return text;
  }
};

/**
 * Analyze an image with ChatGPT Vision
 * @param imageBase64 The base64-encoded image data
 * @returns The analysis result
 */
export const analyzeImage = async (imageBase64: string): Promise<{ analysis: string, suggestedActions: string[] }> => {
  try {
    const response = await apiRequest('POST', '/api/analyze-image', { image: imageBase64 });
    const data = await response.json();
    return {
      analysis: data.analysis,
      suggestedActions: data.suggestedActions
    };
  } catch (error: any) {
    console.error('Image analysis error:', error);
    
    // Check if we have a specific error message from the server
    if (error.response && typeof error.response.json === 'function') {
      try {
        const errorData = await error.response.json();
        if (errorData.message) {
          throw new Error(errorData.message);
        }
      } catch (jsonError) {
        // If JSON parsing fails, continue with generic error
      }
    }
    
    // Handle specific HTTP status codes
    if (error.status === 401) {
      throw new Error('API繧ｭ繝ｼ縺檎┌蜉ｹ縺ｧ縺吶ゅす繧ｹ繝・Β邂｡逅・・↓騾｣邨｡縺励※縺上□縺輔＞縲・);
    } else if (error.status === 429) {
      throw new Error('API縺ｮ蛻ｩ逕ｨ蛻ｶ髯舌↓驕斐＠縺ｾ縺励◆縲ゅ＠縺ｰ繧峨￥縺励※縺九ｉ繧ゅ≧荳蠎ｦ縺願ｩｦ縺励￥縺縺輔＞縲・);
    } else if (error.status === 500) {
      throw new Error('繧ｵ繝ｼ繝舌・繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆縲らｮ｡逅・・↓騾｣邨｡縺励※縺上□縺輔＞縲・);
    }
    
    throw new Error('逕ｻ蜒丞・譫舌↓螟ｱ謨励＠縺ｾ縺励◆');
  }
};
