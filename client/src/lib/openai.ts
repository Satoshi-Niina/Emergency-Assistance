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
      throw new Error('APIキーが無効です。シスチE��管琁E��E��連絡してください、E);
    } else if (error.status === 429) {
      throw new Error('APIの利用制限に達しました。しばらくしてからもう一度お試しください、E);
    } else if (error.status === 500) {
      throw new Error('サーバ�Eエラーが発生しました。管琁E��E��連絡してください、E);
    }
    
    throw new Error('ChatGPTでの処琁E��失敗しました');
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
      throw new Error('APIキーが無効です。シスチE��管琁E��E��連絡してください、E);
    } else if (error.status === 429) {
      throw new Error('APIの利用制限に達しました。しばらくしてからもう一度お試しください、E);
    } else if (error.status === 500) {
      throw new Error('サーバ�Eエラーが発生しました。管琁E��E��連絡してください、E);
    }
    
    throw new Error('画像�E析に失敗しました');
  }
};
