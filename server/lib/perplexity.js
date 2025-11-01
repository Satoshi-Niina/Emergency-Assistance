import OpenAI from 'openai';
export class PerplexityService {
    openai = null;
    constructor() {
        const apiKey = process.env.PERPLEXITY_API_KEY;
        if (apiKey && apiKey !== 'pplx-your-perplexity-api-key-here') {
            this.openai = new OpenAI({
                apiKey: apiKey,
                baseURL: 'https://api.perplexity.ai',
            });
        }
        else {
            console.log('[DEV] Perplexity client not initialized - API key not available');
        }
    }
    async search(query) {
        if (!this.openai) {
            throw new Error('Perplexity API key not configured');
        }
        try {
            const response = await this.openai.chat.completions.create({
                model: 'llama-3.1-sonar-small-128k-online',
                messages: [
                    {
                        role: 'system',
                        content: 'あなたは有用なアシスタントです。最新の情報を提供し、正確で詳細な回答をしてください。',
                    },
                    {
                        role: 'user',
                        content: query,
                    },
                ],
                max_tokens: 1000,
                temperature: 0.7,
            });
            return {
                answer: response.choices[0].message.content,
                model: response.model,
                usage: response.usage,
            };
        }
        catch (error) {
            console.error('Perplexity検索エラー:', error);
            throw error;
        }
    }
    async searchWithSources(query) {
        if (!this.openai) {
            throw new Error('Perplexity API key not configured');
        }
        try {
            const response = await this.openai.chat.completions.create({
                model: 'llama-3.1-sonar-small-128k-online',
                messages: [
                    {
                        role: 'system',
                        content: 'あなたは有用なアシスタントです。回答には必ず情報源を含めてください。',
                    },
                    {
                        role: 'user',
                        content: query,
                    },
                ],
                max_tokens: 1500,
                temperature: 0.5,
            });
            return {
                answer: response.choices[0].message.content,
                model: response.model,
                usage: response.usage,
            };
        }
        catch (error) {
            console.error('Perplexity検索エラー（ソース付き）:', error);
            throw error;
        }
    }
}
export const perplexityService = new PerplexityService();
// Process Perplexity request function for routes.ts
export const processPerplexityRequest = async (query) => {
    return await perplexityService.search(query);
};
