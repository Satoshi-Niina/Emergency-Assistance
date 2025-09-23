// Emergency Guide Types
export interface EmergencyGuide {
  id: string;
  title: string;
  description?: string;
  steps: EmergencyStep[];
  createdAt: Date;
  updatedAt: Date;
}

export interface EmergencyStep {
  id: string;
  order: number;
  title: string;
  description: string;
  action?: string;
  decision?: DecisionNode;
}

export interface DecisionNode {
  question: string;
  options: DecisionOption[];
}

export interface DecisionOption {
  text: string;
  nextStepId: string;
  condition?: string;
}
