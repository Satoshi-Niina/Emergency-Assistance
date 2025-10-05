/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly NODE_ENV: string;
  readonly MODE: string;
  readonly BASE_URL: string;
  readonly PROD: boolean;
  readonly DEV: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// runtime-config用の型定義
interface RuntimeConfig {
  API_BASE_URL: string;
  CORS_ALLOW_ORIGINS?: string;
}

declare global {
  interface Window {
    runtimeConfig?: RuntimeConfig;
  }
}
