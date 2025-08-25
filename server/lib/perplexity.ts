import OpenAI from 'openai';

export class PerplexityService {
    private openai: OpenAI | null = null;

    constructor() {
        const apiKey = process.env.PERPLEXITY_API_KEY;
        if (apiKey && apiKey !== 'pplx-your-perplexity-api-key-here') {
            this.openai = new OpenAI({
                apiKey: apiKey,
                baseURL: 'https://api.perplexity.ai'
            });
        } else {
            console.log('[DEV] Perplexity client not initialized - API key not available');
        }
    }

    async search(query: string): Promise<any> {
        if (!this.openai) {
            throw new Error('Perplexity API key not configured');
        }
        
        try {
            const response = await this.openai.chat.completions.create({
                model: 'llama-3.1-sonar-small-128k-online',
                messages: [
                    {
                        role: 'system',
                        content: '縺ゅ↑縺溘・譛臥畑縺ｪ繧｢繧ｷ繧ｹ繧ｿ繝ｳ繝医〒縺吶よ怙譁ｰ縺ｮ諠・ｱ繧呈署萓帙＠縲∵ｭ｣遒ｺ縺ｧ隧ｳ邏ｰ縺ｪ蝗樒ｭ斐ｒ縺励※縺上□縺輔＞縲・
                    },
                    {
                        role: 'user',
                        content: query
                    }
                ],
                max_tokens: 1000,
                temperature: 0.7
            });

            return {
                answer: response.choices[0].message.content,
                model: response.model,
                usage: response.usage
            };
        } catch (error) {
            console.error('Perplexity讀懃ｴ｢繧ｨ繝ｩ繝ｼ:', error);
            throw error;
        }
    }

    async searchWithSources(query: string): Promise<any> {
        if (!this.openai) {
            throw new Error('Perplexity API key not configured');
        }
        
        try {
            const response = await this.openai.chat.completions.create({
                model: 'llama-3.1-sonar-small-128k-online',
                messages: [
                    {
                        role: 'system',
                        content: '縺ゅ↑縺溘・譛臥畑縺ｪ繧｢繧ｷ繧ｹ繧ｿ繝ｳ繝医〒縺吶ょ屓遲斐↓縺ｯ蠢・★諠・ｱ貅舌ｒ蜷ｫ繧√※縺上□縺輔＞縲・
                    },
                    {
                        role: 'user',
                        content: query
                    }
                ],
                max_tokens: 1500,
                temperature: 0.5
            });

            return {
                answer: response.choices[0].message.content,
                model: response.model,
                usage: response.usage
            };
        } catch (error) {
            console.error('Perplexity讀懃ｴ｢繧ｨ繝ｩ繝ｼ・医た繝ｼ繧ｹ莉倥″・・', error);
            throw error;
        }
    }
}

export const perplexityService = new PerplexityService();

// Process Perplexity request function for routes.ts
export const processPerplexityRequest = async (query: string) => {
    return await perplexityService.search(query);
}; 