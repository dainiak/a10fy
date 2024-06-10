import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
// import typescript from '@rollup/plugin-typescript';

export default {
    input: {
        serviceWorker: 'src/serviceWorker.js',
        contentScript: 'src/contentScript.js',
        sidePanel: 'src/sidePanel.js',
        popup: 'src/popup.ts',
    },
    output: {
        dir: 'dist',
        format: 'es',
    },
    plugins: [
        resolve(),
        commonjs(),
        // terser({
        //     format: {
        //         comments: false
        //     },
        //     sourceMap: true // Generate source maps for the minified code}
        // })
    ]
};