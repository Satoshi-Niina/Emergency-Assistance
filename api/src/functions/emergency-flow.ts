import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// 緊急対応フローのテンプレート
const emergencyFlowTemplates = {
    '機械停止': {
        steps: [
            '1. 安全確保：作業員の安全を最優先に、機械周辺から退避',
            '2. 電源確認：主電源スイッチの確認と必要に応じて停止',
            '3. 状況記録：停止時刻、機械の状態、異常音やにおいの有無を記録',
            '4. 初期診断：警告灯、表示パネルのエラーコードを確認',
            '5. 上長報告：担当者または管理者に直ちに連絡',
            '6. 保守チーム連絡：必要に応じて専門保守チームに連絡'
        ],
        priority: 'high',
        estimatedTime: '15-30分'
    },
    '異常音': {
        steps: [
            '1. 継続監視：異常音の種類、発生箇所、頻度を観察',
            '2. 安全確認：周辺作業員に注意喚起',
            '3. 運転状況確認：現在の運転パラメータをチェック',
            '4. 音の記録：可能であれば音を録音または詳細を記録',
            '5. 判断：緊急停止が必要かどうかの判断',
            '6. 報告：状況に応じて上長または保守チームへ連絡'
        ],
        priority: 'medium',
        estimatedTime: '10-20分'
    },
    '温度異常': {
        steps: [
            '1. 即座確認：温度計、センサー値の詳細確認',
            '2. 冷却システム点検：冷却ファン、クーラント残量確認',
            '3. 負荷確認：現在の機械負荷状況をチェック',
            '4. 環境確認：周辺環境温度、換気状況を確認',
            '5. 緊急対応：設定値を大幅に超える場合は機械停止',
            '6. 専門家連絡：温度管理専門者または保守チームに連絡'
        ],
        priority: 'high',
        estimatedTime: '5-15分'
    },
    '振動異常': {
        steps: [
            '1. 振動測定：可能であれば振動レベルを測定',
            '2. 発生源特定：振動の発生箇所を特定',
            '3. 固定部確認：ボルト、固定具の緩みをチェック',
            '4. バランス確認：回転部品のバランス状態を目視確認',
            '5. 周辺影響確認：他の機械や構造物への影響を確認',
            '6. 対策実施：軽微な場合は応急処置、重大な場合は停止'
        ],
        priority: 'medium',
        estimatedTime: '20-40分'
    }
};

export async function emergencyFlowHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
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
        const { problemType, machineType, description, severity } = JSON.parse(body);

        context.log(`Emergency flow generation for: ${problemType}, machine: ${machineType}`);

        // 入力検証
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
                    message: '問題タイプが必要です'
                })
            };
        }

        // 基本フローの取得
        let baseFlow = emergencyFlowTemplates[problemType];
        
        // マッチしない場合は類似のフローを検索
        if (!baseFlow) {
            const problemLower = problemType.toLowerCase();
            if (problemLower.includes('停止') || problemLower.includes('止まら')) {
                baseFlow = emergencyFlowTemplates['機械停止'];
            } else if (problemLower.includes('音') || problemLower.includes('騒音')) {
                baseFlow = emergencyFlowTemplates['異常音'];
            } else if (problemLower.includes('温度') || problemLower.includes('熱')) {
                baseFlow = emergencyFlowTemplates['温度異常'];
            } else if (problemLower.includes('振動') || problemLower.includes('揺れ')) {
                baseFlow = emergencyFlowTemplates['振動異常'];
            } else {
                // デフォルトの緊急対応フロー
                baseFlow = {
                    steps: [
                        '1. 安全確保：まず周辺の安全を確認',
                        '2. 状況把握：問題の詳細を記録',
                        '3. 初期対応：可能な応急処置を実施',
                        '4. 報告：上長または担当者に連絡',
                        '5. 専門家対応：必要に応じて専門チームに依頼'
                    ],
                    priority: 'medium',
                    estimatedTime: '15-30分'
                };
            }
        }

        // 機械タイプに応じてフローをカスタマイズ
        let customizedSteps = [...baseFlow.steps];
        if (machineType) {
            // 機械タイプ固有の注意事項を追加
            const machineSpecificSteps = {
                '保守用車': [
                    'レール上の位置確認と固定',
                    '作業灯・警告灯の点検'
                ],
                '建設機械': [
                    '油圧システムの圧力確認',
                    'エンジン系統の点検'
                ],
                '工作機械': [
                    '切削工具の状態確認',
                    '潤滑油の補給状況確認'
                ]
            };

            if (machineSpecificSteps[machineType]) {
                customizedSteps.push(...machineSpecificSteps[machineType].map((step, index) => 
                    `${customizedSteps.length + index + 1}. ${step}`
                ));
            }
        }

        // 重要度に応じて優先度を調整
        let adjustedPriority = baseFlow.priority;
        if (severity === 'critical' || severity === '緊急') {
            adjustedPriority = 'critical';
            customizedSteps.unshift('0. 緊急事態：直ちに機械を停止し、安全を確保');
        }

        const emergencyFlow = {
            problemType: problemType,
            machineType: machineType || '汎用',
            priority: adjustedPriority,
            estimatedTime: baseFlow.estimatedTime,
            steps: customizedSteps,
            additionalNotes: description ? `追加情報: ${description}` : null,
            generatedAt: new Date().toISOString(),
            contacts: {
                emergency: '緊急時連絡先: 内線XXX',
                maintenance: '保守チーム: 内線XXX',
                management: '管理者: 内線XXX'
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

    } catch (error) {
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
                message: 'サーバーエラーが発生しました'
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