import { app } from '@azure/functions';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
// ナレッジベースデータの読み込み
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
        let parsedBody;
        try {
            parsedBody = JSON.parse(body);
        }
        catch (parseError) {
            context.error('JSON parse error:', parseError);
            return {
                status: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    success: false,
                    error: 'bad_request',
                    message: 'リクエストボディの解析に失敗しました'
                })
            };
        }
        const { query, machineType } = parsedBody;
        context.log(`Knowledge search for: ${query}, machineType: ${machineType}`);
        // バリデーション
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
                    message: '検索クエリが指定されていません'
                })
            };
        }
        // ナレッジベース読み込み
        const knowledgeBase = loadKnowledgeBase();
        // 検索クエリを単語に分割して検索を実行
        const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
        const results = [];
        // ドキュメント検索
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
        // Q&A検索
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
        // スコア順でソート
        results.sort((a, b) => b.score - a.score);
        // 機械タイプフィルタリング
        let filteredResults = results;
        if (machineType && machineType !== 'all') {
            filteredResults = results.filter(result => !result.machineType || result.machineType === machineType);
        }
        // 最大20件に制限
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
                message: 'サーバー内部でエラーが発生しました'
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
