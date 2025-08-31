// Minimal type declarations to satisfy imports from use-toast
export type ToastActionElement = HTMLElement;
export interface ToastProps {
  title?: string;
  description?: string;
  duration?: number;
}
