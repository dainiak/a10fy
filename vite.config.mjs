import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [],
    target: 'chrome120',
    build: {
        rollupOptions: {
            input: {
                serviceWorker: 'src/serviceWorker.js',
                contentScript: 'src/contentScript.js',
                popup: 'src/popup.ts',
            },
            output: {
                entryFileNames: '[name].js',
                chunkFileNames: '[name].js',
                assetFileNames: '[name].[ext]'
            }
        },
        outDir: 'dist'
    }
});