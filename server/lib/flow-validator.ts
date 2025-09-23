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

    // 開始ノードの確認
    const startNodes = nodes.filter(node => node.type === 'start');
    if (startNodes.length === 0) {
      errors.push('開始ノードが存在しません');
    } else if (startNodes.length > 1) {
      errors.push('開始ノードは1つだけである必要があります');
    }

    // 終了ノードの確認
    const endNodes = nodes.filter(node => node.type === 'end');
    if (endNodes.length === 0) {
      errors.push('終了ノードが存在しません');
    }

    // 孤立ノードの確認
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
        warnings.push(
          `ノード "${node.title}" が他のノードから接続されていません`
        );
      }
    });

    // 循環参照の確認
    const hasCycle = this.detectCycle(nodes);
    if (hasCycle) {
      errors.push('フローに循環参照が検出されました');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private detectCycle(nodes: FlowNode[]): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (nodeId: string): boolean => {
      if (recursionStack.has(nodeId)) {
        return true; // 循環検出
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
  // 基本的な自動修正ロジック
  const result = validateFlowData(flowData);
  if (result.isValid) {
    return flowData;
  }

  // エラーがある場合は基本的な修正を試行
  const fixedData = { ...flowData };
  if (!fixedData.steps) {
    fixedData.steps = [];
  }

  return fixedData;
};
