export interface FlowNode {
    id: string;
    type: 'start' | 'decision' | 'action' | 'end';
    title: string;
    description?: string;
    connections?: string[];
    position?: { x: number; y: number };
}

export interface FlowValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

export class FlowValidator {
    validateFlow(nodes: FlowNode[]): FlowValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        // 髢句ｧ九ヮ繝ｼ繝峨・遒ｺ隱・
        const startNodes = nodes.filter(node => node.type === 'start');
        if (startNodes.length === 0) {
            errors.push('髢句ｧ九ヮ繝ｼ繝峨′蟄伜惠縺励∪縺帙ｓ');
        } else if (startNodes.length > 1) {
            errors.push('髢句ｧ九ヮ繝ｼ繝峨・1縺､縺縺代〒縺ゅｋ蠢・ｦ√′縺ゅｊ縺ｾ縺・);
        }

        // 邨ゆｺ・ヮ繝ｼ繝峨・遒ｺ隱・
        const endNodes = nodes.filter(node => node.type === 'end');
        if (endNodes.length === 0) {
            errors.push('邨ゆｺ・ヮ繝ｼ繝峨′蟄伜惠縺励∪縺帙ｓ');
        }

        // 蟄､遶九ヮ繝ｼ繝峨・遒ｺ隱・
        const connectedNodes = new Set<string>();
        nodes.forEach(node => {
            if (node.connections) {
                node.connections.forEach(connectionId => {
                    connectedNodes.add(connectionId);
                });
            }
        });

        nodes.forEach(node => {
            if (node.type !== 'start' && !connectedNodes.has(node.id)) {
                warnings.push(`繝弱・繝・"${node.title}" 縺御ｻ悶・繝弱・繝峨°繧画磁邯壹＆繧後※縺・∪縺帙ｓ`);
            }
        });

        // 蠕ｪ迺ｰ蜿ら・縺ｮ遒ｺ隱・
        const hasCycle = this.detectCycle(nodes);
        if (hasCycle) {
            errors.push('繝輔Ο繝ｼ縺ｫ蠕ｪ迺ｰ蜿ら・縺梧､懷・縺輔ｌ縺ｾ縺励◆');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    private detectCycle(nodes: FlowNode[]): boolean {
        const visited = new Set<string>();
        const recursionStack = new Set<string>();

        const dfs = (nodeId: string): boolean => {
            if (recursionStack.has(nodeId)) {
                return true; // 蠕ｪ迺ｰ讀懷・
            }
            if (visited.has(nodeId)) {
                return false;
            }

            visited.add(nodeId);
            recursionStack.add(nodeId);

            const node = nodes.find(n => n.id === nodeId);
            if (node && node.connections) {
                for (const connectionId of node.connections) {
                    if (dfs(connectionId)) {
                        return true;
                    }
                }
            }

            recursionStack.delete(nodeId);
            return false;
        };

        for (const node of nodes) {
            if (!visited.has(node.id)) {
                if (dfs(node.id)) {
                    return true;
                }
            }
        }

        return false;
    }
}

export const flowValidator = new FlowValidator();

// Validate flow data function for emergency-flow.ts
export const validateFlowData = (flowData: any) => {
    return flowValidator.validateFlow(flowData.steps || []);
};

// Auto fix flow data function for emergency-flow.ts
export const autoFixFlowData = (flowData: any) => {
    // 蝓ｺ譛ｬ逧・↑閾ｪ蜍穂ｿｮ豁｣繝ｭ繧ｸ繝・け
    const result = validateFlowData(flowData);
    if (result.isValid) {
        return flowData;
    }
    
    // 繧ｨ繝ｩ繝ｼ縺後≠繧句ｴ蜷医・蝓ｺ譛ｬ逧・↑菫ｮ豁｣繧定ｩｦ陦・
    const fixedData = { ...flowData };
    if (!fixedData.steps) {
        fixedData.steps = [];
    }
    
    return fixedData;
}; 