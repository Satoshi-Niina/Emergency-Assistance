import { app } from '@azure/functions';
// 応急処置フローのテンプレート定義
const emergencyFlowTemplates = {
    'エンジン始動不良': {
        steps: [
            '1. エンジンキーを回してエンジンが始動するか確認',
            '2. バッテリー電圧を確認し、必要に応じて充電',
            '3. 燃料タンクの残量を確認し、必要に応じて給油',
            '4. エンジンオイルのレベルと状態を確認',
            '5. 問題が解決しない場合は専門家に連絡',
            '6. 必要に応じてメンテナンスチームに連絡'
        ],
        priority: 'high',
        estimatedTime: '15-30分',
    },
    '油圧不足': {
        steps: [
            '1. 油圧計の読み取り値を確認し、正常範囲内か確認',
            '2. エンジンキーを回してエンジンが始動するか確認',
            '3. 油圧システムの漏れがないか確認',
            '4. 油のレベルを確認し、必要に応じて給油',
            '5. システムを再起動し、問題が解決したか確認',
            '6. 問題が解決しない場合は専門家に連絡'
        ],
        priority: 'medium',
        estimatedTime: '10-20分',
    },
    '過熱警告': {
        steps: [
            '1. 温度計の読み取り値を確認し、正常範囲内か確認',
            '2. 冷却システムの漏れがないか確認',
            '3. 冷却水のレベルを確認し、必要に応じて給水',
            '4. エンジンを停止し、冷却するまで待機',
            '5. 問題が解決しない場合は専門家に連絡',
            '6. 必要に応じてメンテナンスチームに連絡'
        ],
        priority: 'high',
        estimatedTime: '5-15分',
    },
    '異常音発生': {
        steps: [
            '1. 異常音の発生箇所を特定し、原因を確認',
            '2. エンジンを停止し、安全を確認',
            '3. 機械部品の緩みや損傷がないか確認',
            '4. 必要に応じて部品を交換または修理',
            '5. 問題が解決しない場合は専門家に連絡',
            '6. 緊急時は安全を最優先に行動'
        ],
        priority: 'medium',
        estimatedTime: '20-40分',
    }
};
export async function emergencyFlowHandler(request, context) {
    context.log('Emergency flow generation request received');
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
        const { problemType, machineType, description, severity } = parsedBody;
        context.log(`Emergency flow generation for: ${problemType}, machine: ${machineType}`);
        // バリデーション
        if (!problemType) {
            return {
                status: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    success: false,
                    error: 'bad_request',
                    message: '問題タイプが指定されていません'
                })
            };
        }
        // テンプレートの選択
        let baseFlow = emergencyFlowTemplates[problemType];
        // テンプレートが見つからない場合のフォールバック
        if (!baseFlow) {
            const problemLower = problemType.toLowerCase();
            if (problemLower.includes('始動') || problemLower.includes('エンジン')) {
                baseFlow = emergencyFlowTemplates['エンジン始動不良'];
            }
            else if (problemLower.includes('油') || problemLower.includes('油圧')) {
                baseFlow = emergencyFlowTemplates['油圧不足'];
            }
            else if (problemLower.includes('過熱') || problemLower.includes('温度')) {
                baseFlow = emergencyFlowTemplates['過熱警告'];
            }
            else if (problemLower.includes('音') || problemLower.includes('異常')) {
                baseFlow = emergencyFlowTemplates['異常音発生'];
            }
            else {
                // デフォルトの応急処置フロー
                baseFlow = {
                    steps: [
                        '1. エンジンキーを回してエンジンが始動するか確認',
                        '2. システムの状態を確認し、異常がないか確認',
                        '3. 必要に応じて専門家に連絡',
                        '4. 問題が解決しない場合はメンテナンスチームに連絡',
                        '5. 緊急時は安全を最優先に行動'
                    ],
                    priority: 'medium',
                    estimatedTime: '15-30分',
                };
            }
        }
        // 問題タイプに基づいてフローをカスタマイズ
        let customizedSteps = [...baseFlow.steps];
        if (machineType) {
            // 問題タイプに応じて機械固有のステップを追加
            const machineSpecificSteps = {
                '建設機械': [
                    '建設機械固有の確認事項を実行',
                    '建設現場の安全確認を実施'
                ],
                '農業機械': [
                    '農業機械の油圧システムを確認',
                    '農業機械の冷却システムを確認'
                ],
                '産業機械': [
                    '産業機械の電源を確認',
                    '産業機械の安全装置を確認'
                ]
            };
            if (machineSpecificSteps[machineType]) {
                customizedSteps.push(...machineSpecificSteps[machineType].map((step, index) => `${customizedSteps.length + index + 1}. ${step}`));
            }
        }
        // 重要度に基づいて優先度を調整
        let adjustedPriority = baseFlow.priority;
        if (severity === 'critical' || severity === '緊急') {
            adjustedPriority = 'critical';
            customizedSteps.unshift('0. 緊急事態です。すぐに専門家に連絡してください');
        }
        const emergencyFlow = {
            problemType: problemType,
            machineType: machineType || '一般',
            priority: adjustedPriority,
            estimatedTime: baseFlow.estimatedTime,
            steps: customizedSteps,
            additionalNotes: description ? `追加情報: ${description}` : null,
            generatedAt: new Date().toISOString(),
            contacts: {
                emergency: '緊急連絡先: 電話番号XX',
                maintenance: 'メンテナンス: 電話番号XX',
                management: '管理部門: 電話番号XX'
            }
        };
        context.log(`Generated emergency flow with ${customizedSteps.length} steps`);
        return {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: true,
                emergencyFlow: emergencyFlow
            })
        };
    }
    catch (error) {
        context.error('Emergency flow generation error:', error);
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
app.http('emergency-flow', {
    methods: ['POST', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'emergency/flow',
    handler: emergencyFlowHandler
});
