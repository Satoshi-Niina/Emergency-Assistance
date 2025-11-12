import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    base: '/',
    plugins: [react()],
    server: {
        port: 5173,
        host: true,
        proxy: {
            '/api': {
                target: 'http://localhost:8080',
                changeOrigin: true,
                secure: false,
            }
        }
    },
    resolve: {
        alias: {
            '@': '/src'
        }
    },
    build: {
        outDir: 'dist',
        sourcemap: false,
        minify: 'terser',
        cssCodeSplit: false,
        emptyOutDir: true,
        chunkSizeWarningLimit: 10000,
        target: 'es2015',
        assetsInlineLimit: 8192,
        rollupOptions: {
            output: {
                entryFileNames: 'main.mjs',
                chunkFileNames: 'chunk.[hash].mjs',
                assetFileNames: (assetInfo) => {
                    if (assetInfo.name?.endsWith('.css')) {
                        return 'style.css';
                    }
                    return 'assets/[name].[hash].[ext]';
                },
                inlineDynamicImports: true,
                // 小さなアセットはインライン化
                manualChunks: undefined
            }
        }
    }
});
