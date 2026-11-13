import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    base: '/',
    cacheDir: '.vite-cache',
    plugins: [react()],
    publicDir: 'public', // publicフォルダを明示的に指定
    server: {
        port: Number(process.env.CLIENT_PORT || 3006),
        host: true,
        strictPort: true,
        proxy: {
            '/api': {
                target: `http://127.0.0.1:${process.env.EMERGENCY_API_PORT || 3003}`,
                changeOrigin: true,
                secure: false,
                configure: (proxy, options) => {
                    proxy.on('proxyReq', (proxyReq, req, res) => {
                        console.log('Proxying request:', req.method, req.url, '->', options.target);
                    });
                    proxy.on('error', (err, req, res) => {
                        console.error('Proxy error:', err);
                    });
                }
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
        emptyOutDir: true, // 古いファイルを確実に削除
        chunkSizeWarningLimit: 10000,
        target: 'es2015',
        assetsInlineLimit: 8192,
        rollupOptions: {
            output: {
                // ハッシュを追加してキャッシュ問題を回避
                entryFileNames: 'main.[hash].mjs',
                chunkFileNames: 'chunk.[hash].mjs',
                assetFileNames: (assetInfo) => {
                    if (assetInfo.name?.endsWith('.css')) {
                        // CSSファイルにもハッシュを追加
                        return 'style.[hash].css';
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
