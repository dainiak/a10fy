import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import copy from "rollup-plugin-copy";
import terser from '@rollup/plugin-terser';

// import typescript from '@rollup/plugin-typescript';
// contentScript: 'src/contentScript.js',
//     sidePanel: 'src/sidePanel.js',
//     popup: 'src/popup.ts',
//     constants: 'src/helpers/constants.js',

const enableTerser = false;

const jsPlugins = [
    resolve(
        {
            main: true,
            browser: true,
            preferBuiltins: true
        }
    ),
    commonjs()
];

if(enableTerser) {
    jsPlugins.push(
        terser({
            format: {
                comments: false
            },
            sourceMap: true // Generate source maps for the minified code}
        })
    );
}


export default [
    {
        input: {
            serviceWorker: 'src/serviceWorker.js',
        },
        output: {
            dir: 'dist/js',
            format: 'iife',
            inlineDynamicImports: true
        },
        plugins: jsPlugins
    },
    {
        input: {
            contentScript: 'src/contentScript.js',
        },
        output: {
            dir: 'dist/js',
            format: 'iife',
            inlineDynamicImports: true
        },
        plugins: jsPlugins
    },
    {
        input: {
            sidePanel: 'src/sidePanel.js',
        },
        output: {
            dir: 'dist/js',
            format: 'es',
            inlineDynamicImports: true
        },
        plugins: jsPlugins
    },
    {
        input: {
            offscreen: 'src/offscreen.js',
        },
        output: {
            dir: 'dist/js',
            format: 'es',
            inlineDynamicImports: true
        },
        plugins: jsPlugins
    },
    {
        input: {
            welcome: 'src/welcome.js',
        },
        output: {
            dir: 'dist/js',
            format: 'es',
            inlineDynamicImports: true
        },
        plugins: jsPlugins
    },
    {
        input: {
            popup: 'src/popup.ts',
        },
        output: {
            dir: 'dist/js',
            format: 'es',
            inlineDynamicImports: true
        },
        plugins: [copy({
            targets: [
                { src: 'src/assets/*', dest: 'dist' }
            ]
        })]
    }
];