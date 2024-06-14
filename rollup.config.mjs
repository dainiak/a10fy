import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import copy from "rollup-plugin-copy";
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';

// contentScript: 'src/contentScript.ts',
//     sidePanel: 'src/sidePanel.ts',
//     popup: 'src/popup.ts',
//     constants: 'src/helpers/constants.ts',

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

const tsPlugins = [
    resolve(
        {
            main: true,
            browser: true,
            preferBuiltins: true
        }
    ),
    typescript()
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
            serviceWorker: 'src/serviceWorker.ts',
        },
        output: {
            dir: 'dist/js',
            format: 'iife',
            inlineDynamicImports: true
        },
        plugins: tsPlugins
    },
    {
        input: {
            contentScript: 'src/contentScript.ts',
        },
        output: {
            dir: 'dist/js',
            format: 'iife',
            inlineDynamicImports: true
        },
        plugins: tsPlugins
    },
    {
        input: {
            sidePanel: 'src/sidePanel.ts',
        },
        output: {
            dir: 'dist/js',
            format: 'es',
            inlineDynamicImports: true
        },
        plugins: tsPlugins
    },
    {
        input: {
            offscreen: 'src/offscreen.ts',
        },
        output: {
            dir: 'dist/js',
            format: 'es',
            inlineDynamicImports: true
        },
        plugins: tsPlugins
    },
    {
        input: {
            welcome: 'src/welcome.ts',
        },
        output: {
            dir: 'dist/js',
            format: 'es',
            inlineDynamicImports: true
        },
        plugins: tsPlugins
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
        plugins: [...tsPlugins, copy({
            targets: [
                { src: 'src/assets/*', dest: 'dist' }
            ]
        })]
    }
];