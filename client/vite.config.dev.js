"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vite_1 = require("vite");
const plugin_react_1 = __importDefault(require("@vitejs/plugin-react"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
exports.default = (0, vite_1.defineConfig)({
    plugins: [(0, plugin_react_1.default)()],
    resolve: {
        alias: {
            '@': path_1.default.resolve(__dirname, './src'),
            '@shared': path_1.default.resolve(__dirname, '../shared'),
        },
        extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'],
    },
    server: {
        host: '0.0.0.0',
        port: 5002, // 開発専用ポート
        proxy: {
            '/api': {
                target: 'http://localhost:3002', // 開発サーバーのポート
                changeOrigin: true,
                secure: false,
            },
            '/ws': {
                target: 'ws://localhost:3002', // 開発サーバーのポート
                ws: true,
                changeOrigin: true
            }
        },
        fs: {
            allow: [path_1.default.resolve(__dirname, '..')],
        },
        // 開発用の設定
        hmr: {
            port: 5003, // HMR専用ポート
        },
        watch: {
            usePolling: true,
            interval: 1000,
        }
    },
    build: {
        outDir: 'dist-dev', // 開発用ビルドディレクトリ
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
            input: './index.html'
        }
    },
    logLevel: 'info', // 開発時は詳細ログ
    define: {
        __DEV__: true,
    }
});
