import { app } from '@azure/functions';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
// 繝翫Ξ繝・ず繝吶・繧ｹ繝・・繧ｿ縺ｮ隱ｭ縺ｿ霎ｼ縺ｿ
function loadKnowledgeBase() {
    try {
        const knowledgeBasePath = join(process.cwd(), 'knowledge-base', 'index.json');
        if (existsSync(knowledgeBasePath)) {
            const data = readFileSync(knowledgeBasePath, 'utf-8');
            return JSON.parse(data);
        }
        return { documents: [], qa: [] };
    }
    catch (error) {
        console.error('Knowledge base loading error:', error);
        return { documents: [], qa: [] };
    }
}
export async function knowledgeSearchHandler(request, context) {
    context.log('Knowledge base search request received');
    // CORS handling
    if (request.method === 'OPTIONS') {
        return {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }
        };
    }
    if (request.method !== 'POST') {
        return {
            status: 405,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }
    try {
        const body = await request.text();
        const { query, machineType } = JSON.parse(body);
        context.log(`Knowledge search for: ${query}, machineType: ${machineType}`);
        // 蜈･蜉帶､懆ｨｼ
        if (!query || query.trim().length === 0) {
            return {
                status: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    success: false,
                    error: 'bad_request',
                    message: '讀懃ｴ｢繧ｯ繧ｨ繝ｪ縺悟ｿ・ｦ√〒縺・
                })
            };
        }
        // 繝翫Ξ繝・ず繝吶・繧ｹ隱ｭ縺ｿ霎ｼ縺ｿ
        const knowledgeBase = loadKnowledgeBase();
        // 邁｡譏捺､懃ｴ｢螳溯｣・ｼ亥ｮ滄圀縺ｮ讀懃ｴ｢繝ｭ繧ｸ繝・け・・
        const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
        const results = [];
        // 譁・嶌讀懃ｴ｢
        if (knowledgeBase.documents) {
            for (const doc of knowledgeBase.documents) {
                let score = 0;
                const content = (doc.title + ' ' + doc.content + ' ' + doc.summary).toLowerCase();
                for (const term of searchTerms) {
                    const matches = (content.match(new RegExp(term, 'g')) || []).length;
                    score += matches;
                }
                if (score > 0) {
                    results.push({
                        type: 'document',
                        title: doc.title,
                        content: doc.summary || doc.content?.substring(0, 200),
                        score: score,
                        machineType: doc.machineType,
                        documentId: doc.id
                    });
                }
            }
        }
        // Q&A讀懃ｴ｢
        if (knowledgeBase.qa) {
            for (const item of knowledgeBase.qa) {
                let score = 0;
                const content = (item.question + ' ' + item.answer).toLowerCase();
                for (const term of searchTerms) {
                    const matches = (content.match(new RegExp(term, 'g')) || []).length;
                    score += matches;
                }
                if (score > 0) {
                    results.push({
                        type: 'qa',
                        question: item.question,
                        answer: item.answer,
                        score: score,
                        machineType: item.machineType,
                        category: item.category
                    });
                }
            }
        }
        // 繧ｹ繧ｳ繧｢鬆・↓繧ｽ繝ｼ繝・
        results.sort((a, b) => b.score - a.score);
        // 讖滓｢ｰ繧ｿ繧､繝励ヵ繧｣繝ｫ繧ｿ繝ｪ繝ｳ繧ｰ
        let filteredResults = results;
        if (machineType && machineType !== 'all') {
            filteredResults = results.filter(result => !result.machineType || result.machineType === machineType);
        }
        // 荳贋ｽ・0莉ｶ縺ｫ蛻ｶ髯・
        const limitedResults = filteredResults.slice(0, 20);
        context.log(`Found ${limitedResults.length} knowledge base results`);
        return {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: true,
                results: limitedResults,
                totalFound: limitedResults.length,
                query: query
            })
        };
    }
    catch (error) {
        context.error('Knowledge search error:', error);
        return {
            status: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: false,
                error: 'internal_server_error',
                message: '繧ｵ繝ｼ繝舌・繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆'
            })
        };
    }
}
app.http('knowledge-search', {
    methods: ['POST', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'knowledge/search',
    handler: knowledgeSearchHandler
});
