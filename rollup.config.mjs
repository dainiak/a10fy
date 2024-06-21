import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import copy from "rollup-plugin-copy";
import terser from '@rollup/plugin-terser';
import scss from 'rollup-plugin-scss';

const enableTerser = false;

const jsPluginConfigs = [
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
    jsPluginConfigs.push(
        terser({
            format: {
                comments: false
            },
            sourceMap: true // Generate source maps for the minified code}
        })
    );
}

function constructJsConfig(input, pluginsList) {
    return {
        input: {
            [input]: `tmp/${input}.js`,
        },
        output: {
            dir: 'dist/js',
            format: 'iife',
            inlineDynamicImports: true
        },
        plugins: pluginsList
    };
}

function constructScssConfig(input) {
    return {
        input: `src/styles/${input}.scss`,
        output: {
            dir: 'dist/css',
        },
        plugins: [
            scss({
                fileName: `${input}.css`,
                outputStyle: 'compressed'
            })
        ]
    };

}

const copyPluginConfig = copy({
    targets: [
        { src: 'src/assets/*', dest: 'dist' }
    ]
});


export default [
    // constructScssConfig('tour'),
    constructJsConfig('background', jsPluginConfigs),
    constructJsConfig('contentScript', jsPluginConfigs),
    constructJsConfig('contentScriptTour', jsPluginConfigs),
    constructJsConfig('sidePanel', jsPluginConfigs),
    constructJsConfig('offscreen', jsPluginConfigs),
    constructJsConfig('settings', jsPluginConfigs),
    constructJsConfig('popup', [...jsPluginConfigs, copyPluginConfig]),
];