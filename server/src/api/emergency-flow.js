import { app } from '@azure/functions';
// 邱頑･蟇ｾ蠢懊ヵ繝ｭ繝ｼ縺ｮ繝・Φ繝励Ξ繝ｼ繝・
const emergencyFlowTemplates = {
    '讖滓｢ｰ蛛懈ｭ｢': {
        steps: [
            '1. 螳牙・遒ｺ菫晢ｼ壻ｽ懈･ｭ蜩｡縺ｮ螳牙・繧呈怙蜆ｪ蜈医↓縲∵ｩ滓｢ｰ蜻ｨ霎ｺ縺九ｉ騾驕ｿ',
            '2. 髮ｻ貅千｢ｺ隱搾ｼ壻ｸｻ髮ｻ貅舌せ繧､繝・メ縺ｮ遒ｺ隱阪→蠢・ｦ√↓蠢懊§縺ｦ蛛懈ｭ｢',
            '3. 迥ｶ豕∬ｨ倬鹸・壼●豁｢譎ょ綾縲∵ｩ滓｢ｰ縺ｮ迥ｶ諷九∫焚蟶ｸ髻ｳ繧・↓縺翫＞縺ｮ譛臥┌繧定ｨ倬鹸',
            '4. 蛻晄悄險ｺ譁ｭ・夊ｭｦ蜻顔・縲∬｡ｨ遉ｺ繝代ロ繝ｫ縺ｮ繧ｨ繝ｩ繝ｼ繧ｳ繝ｼ繝峨ｒ遒ｺ隱・,,
            '5. 荳企聞蝣ｱ蜻奇ｼ壽球蠖楢・∪縺溘・邂｡逅・・↓逶ｴ縺｡縺ｫ騾｣邨｡',
            '6. 菫晏ｮ医メ繝ｼ繝騾｣邨｡・壼ｿ・ｦ√↓蠢懊§縺ｦ蟆る摩菫晏ｮ医メ繝ｼ繝縺ｫ騾｣邨｡'
        ],
        priority: 'high',
        estimatedTime: '15-30蛻・
    },
    '逡ｰ蟶ｸ髻ｳ': {
        steps: [
            '1. 邯咏ｶ夂屮隕厄ｼ夂焚蟶ｸ髻ｳ縺ｮ遞ｮ鬘槭∫匱逕溽ｮ・園縲・ｻ蠎ｦ繧定ｦｳ蟇・,,
            '2. 螳牙・遒ｺ隱搾ｼ壼捉霎ｺ菴懈･ｭ蜩｡縺ｫ豕ｨ諢丞繭襍ｷ',
            '3. 驕玖ｻ｢迥ｶ豕∫｢ｺ隱搾ｼ夂樟蝨ｨ縺ｮ驕玖ｻ｢繝代Λ繝｡繝ｼ繧ｿ繧偵メ繧ｧ繝・け',
            '4. 髻ｳ縺ｮ險倬鹸・壼庄閭ｽ縺ｧ縺ゅｌ縺ｰ髻ｳ繧帝鹸髻ｳ縺ｾ縺溘・隧ｳ邏ｰ繧定ｨ倬鹸',
            '5. 蛻､譁ｭ・夂ｷ頑･蛛懈ｭ｢縺悟ｿ・ｦ√°縺ｩ縺・°縺ｮ蛻､譁ｭ',
            '6. 蝣ｱ蜻奇ｼ夂憾豕√↓蠢懊§縺ｦ荳企聞縺ｾ縺溘・菫晏ｮ医メ繝ｼ繝縺ｸ騾｣邨｡'
        ],
        priority: 'medium',
        estimatedTime: '10-20蛻・
    },
    '貂ｩ蠎ｦ逡ｰ蟶ｸ': {
        steps: [
            '1. 蜊ｳ蠎ｧ遒ｺ隱搾ｼ壽ｸｩ蠎ｦ險医√そ繝ｳ繧ｵ繝ｼ蛟､縺ｮ隧ｳ邏ｰ遒ｺ隱・,,
            '2. 蜀ｷ蜊ｴ繧ｷ繧ｹ繝・Β轤ｹ讀懶ｼ壼・蜊ｴ繝輔ぃ繝ｳ縲√け繝ｼ繝ｩ繝ｳ繝域ｮ矩㍼遒ｺ隱・,,
            '3. 雋闕ｷ遒ｺ隱搾ｼ夂樟蝨ｨ縺ｮ讖滓｢ｰ雋闕ｷ迥ｶ豕√ｒ繝√ぉ繝・け',
            '4. 迺ｰ蠅・｢ｺ隱搾ｼ壼捉霎ｺ迺ｰ蠅・ｸｩ蠎ｦ縲∵鋤豌礼憾豕√ｒ遒ｺ隱・,,
            '5. 邱頑･蟇ｾ蠢懶ｼ夊ｨｭ螳壼､繧貞､ｧ蟷・↓雜・∴繧句ｴ蜷医・讖滓｢ｰ蛛懈ｭ｢',
            '6. 蟆る摩螳ｶ騾｣邨｡・壽ｸｩ蠎ｦ邂｡逅・ｰる摩閠・∪縺溘・菫晏ｮ医メ繝ｼ繝縺ｫ騾｣邨｡'
        ],
        priority: 'high',
        estimatedTime: '5-15蛻・
    },
    '謖ｯ蜍慕焚蟶ｸ': {
        steps: [
            '1. 謖ｯ蜍墓ｸｬ螳夲ｼ壼庄閭ｽ縺ｧ縺ゅｌ縺ｰ謖ｯ蜍輔Ξ繝吶Ν繧呈ｸｬ螳・,,
            '2. 逋ｺ逕滓ｺ千音螳夲ｼ壽険蜍輔・逋ｺ逕溽ｮ・園繧堤音螳・,,
            '3. 蝗ｺ螳夐Κ遒ｺ隱搾ｼ壹・繝ｫ繝医∝崋螳壼・縺ｮ邱ｩ縺ｿ繧偵メ繧ｧ繝・け',
            '4. 繝舌Λ繝ｳ繧ｹ遒ｺ隱搾ｼ壼屓霆｢驛ｨ蜩√・繝舌Λ繝ｳ繧ｹ迥ｶ諷九ｒ逶ｮ隕也｢ｺ隱・,,
            '5. 蜻ｨ霎ｺ蠖ｱ髻ｿ遒ｺ隱搾ｼ壻ｻ悶・讖滓｢ｰ繧・ｧ矩迚ｩ縺ｸ縺ｮ蠖ｱ髻ｿ繧堤｢ｺ隱・,,
            '6. 蟇ｾ遲門ｮ滓命・夊ｻｽ蠕ｮ縺ｪ蝣ｴ蜷医・蠢懈･蜃ｦ鄂ｮ縲・㍾螟ｧ縺ｪ蝣ｴ蜷医・蛛懈ｭ｢'
        ],
        priority: 'medium',
        estimatedTime: '20-40蛻・
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
        const { problemType, machineType, description, severity } = JSON.parse(body);
        context.log(`Emergency flow generation for: ${problemType}, machine: ${machineType}`);
        // 蜈･蜉帶､懆ｨｼ
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
                    message: '蝠城｡後ち繧､繝励′蠢・ｦ√〒縺・
                })
            };
        }
        // 蝓ｺ譛ｬ繝輔Ο繝ｼ縺ｮ蜿門ｾ・
        let baseFlow = emergencyFlowTemplates[problemType];
        // 繝槭ャ繝√＠縺ｪ縺・ｴ蜷医・鬘樔ｼｼ縺ｮ繝輔Ο繝ｼ繧呈､懃ｴ｢
        if (!baseFlow) {
            const problemLower = problemType.toLowerCase();
            if (problemLower.includes('蛛懈ｭ｢') || problemLower.includes('豁｢縺ｾ繧・)) {, baseFlow = emergencyFlowTemplates['讖滓｢ｰ蛛懈ｭ｢']))
                ;
        }
        else if (problemLower.includes('髻ｳ') || problemLower.includes('鬨帝浹')) {
            baseFlow = emergencyFlowTemplates['逡ｰ蟶ｸ髻ｳ'];
        }
        else if (problemLower.includes('貂ｩ蠎ｦ') || problemLower.includes('辭ｱ')) {
            baseFlow = emergencyFlowTemplates['貂ｩ蠎ｦ逡ｰ蟶ｸ'];
        }
        else if (problemLower.includes('謖ｯ蜍・) || problemLower.includes(', 謠ｺ繧・)) {
            baseFlow = emergencyFlowTemplates['謖ｯ蜍慕焚蟶ｸ'];
        }
        else {
            // 繝・ヵ繧ｩ繝ｫ繝医・邱頑･蟇ｾ蠢懊ヵ繝ｭ繝ｼ
            baseFlow = {
                steps: [
                    '1. 螳牙・遒ｺ菫晢ｼ壹∪縺壼捉霎ｺ縺ｮ螳牙・繧堤｢ｺ隱・,,
                    '2. 迥ｶ豕∵滑謠｡・壼撫鬘後・隧ｳ邏ｰ繧定ｨ倬鹸',
                    '3. 蛻晄悄蟇ｾ蠢懶ｼ壼庄閭ｽ縺ｪ蠢懈･蜃ｦ鄂ｮ繧貞ｮ滓命',
                    '4. 蝣ｱ蜻奇ｼ壻ｸ企聞縺ｾ縺溘・諡・ｽ楢・↓騾｣邨｡',
                    '5. 蟆る摩螳ｶ蟇ｾ蠢懶ｼ壼ｿ・ｦ√↓蠢懊§縺ｦ蟆る摩繝√・繝縺ｫ萓晞ｼ'
                ],
                priority: 'medium',
                estimatedTime: '15-30蛻・
            };
        }
    }
    // 讖滓｢ｰ繧ｿ繧､繝励↓蠢懊§縺ｦ繝輔Ο繝ｼ繧偵き繧ｹ繧ｿ繝槭う繧ｺ
    finally {
    }
    // 讖滓｢ｰ繧ｿ繧､繝励↓蠢懊§縺ｦ繝輔Ο繝ｼ繧偵き繧ｹ繧ｿ繝槭う繧ｺ
    let customizedSteps = [...baseFlow.steps];
    if (machineType) {
        // 讖滓｢ｰ繧ｿ繧､繝怜崋譛峨・豕ｨ諢丈ｺ矩・ｒ霑ｽ蜉
        const machineSpecificSteps = {
            '菫晏ｮ育畑霆・: [: '繝ｬ繝ｼ繝ｫ荳翫・菴咲ｽｮ遒ｺ隱阪→蝗ｺ螳・,,
            '菴懈･ｭ轣ｯ繝ｻ隴ｦ蜻顔・縺ｮ轤ｹ讀・: 
        };
        '蟒ｺ險ｭ讖滓｢ｰ';
        [
            '豐ｹ蝨ｧ繧ｷ繧ｹ繝・Β縺ｮ蝨ｧ蜉帷｢ｺ隱・,,
            '繧ｨ繝ｳ繧ｸ繝ｳ邉ｻ邨ｱ縺ｮ轤ｹ讀・
        ],
            '蟾･菴懈ｩ滓｢ｰ';
        [
            '蛻・炎蟾･蜈ｷ縺ｮ迥ｶ諷狗｢ｺ隱・,,
            '貎､貊第ｲｹ縺ｮ陬懃ｵｦ迥ｶ豕∫｢ｺ隱・
        ];
    }
    ;
    if (machineSpecificSteps[machineType]) {
        customizedSteps.push(...machineSpecificSteps[machineType].map((step, index) => `${customizedSteps.length + index + 1}. ${step}`));
    }
}
// 驥崎ｦ∝ｺｦ縺ｫ蠢懊§縺ｦ蜆ｪ蜈亥ｺｦ繧定ｪｿ謨ｴ
let adjustedPriority = baseFlow.priority;
if (severity === 'critical' || severity === '邱頑･') {
    adjustedPriority = 'critical';
    customizedSteps.unshift('0. 邱頑･莠区・・夂峩縺｡縺ｫ讖滓｢ｰ繧貞●豁｢縺励∝ｮ牙・繧堤｢ｺ菫・););
}
const emergencyFlow = {
    problemType: problemType,
    machineType: machineType || '豎守畑',
    priority: adjustedPriority,
    estimatedTime: baseFlow.estimatedTime,
    steps: customizedSteps,
    additionalNotes: description ? `霑ｽ蜉諠・ｱ: ${description}` : null,
    generatedAt: new Date().toISOString(),
    contacts: {
        emergency: '邱頑･譎る｣邨｡蜈・ 蜀・ｷ唸XX',
        maintenance: '菫晏ｮ医メ繝ｼ繝: 蜀・ｷ唸XX',
        management: '邂｡逅・・ 蜀・ｷ唸XX'
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
try { }
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
            message: '繧ｵ繝ｼ繝舌・繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆'
        })
    };
}
app.http('emergency-flow', {
    methods: ['POST', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'emergency/flow',
    handler: emergencyFlowHandler
});
