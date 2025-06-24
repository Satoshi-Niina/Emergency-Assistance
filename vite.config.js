"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var vite_1 = require("vite");
var plugin_react_1 = require("@vitejs/plugin-react");
var path_1 = require("path");
var url_1 = require("url");
// __dirnameの代替定義
var __filename = (0, url_1.fileURLToPath)(import.meta.url);
var __dirname = path_1.default.dirname(__filename);
exports.default = (0, vite_1.defineConfig)({
    plugins: [(0, plugin_react_1.default)()],
    resolve: {
        alias: {
            '@shared': path_1.default.resolve(__dirname, './shared'),
            '@shared/schema': path_1.default.resolve(__dirname, './shared/schema.ts')
        }
    },
    server: {
        host: '0.0.0.0',
        port: 3000,
        allowedHosts: true,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
            'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
        }
    },
    build: {
        outDir: 'client/dist',
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
            input: './client/index.html'
        }
    },
    logLevel: 'warn'
});
