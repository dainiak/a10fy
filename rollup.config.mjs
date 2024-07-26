import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import copy from "rollup-plugin-copy";
import terser from '@rollup/plugin-terser';
import scss from 'rollup-plugin-scss';
import replace from '@rollup/plugin-replace';

const enableTerser = false;

const jsPluginConfigs = [
    commonjs(),
    resolve(
        {
            main: true,
            browser: true,
            preferBuiltins: true
        }
    )
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
        plugins: pluginsList,
        external: ['chrome-types']
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

const replaceSessionStorageString = replace({
    'typeof sessionStorage=="object"': 'true',
    delimiters: ['', ''],
    preventAssignment: false
});


export default [
    // constructScssConfig('tour'),
    constructJsConfig('background', [...jsPluginConfigs, copyPluginConfig]),
    constructJsConfig('contentScript', jsPluginConfigs),
    constructJsConfig('customPlayerSandbox', jsPluginConfigs),
    constructJsConfig('contentScriptTour', jsPluginConfigs),
    constructJsConfig('offscreen', jsPluginConfigs),
    constructJsConfig('popup', jsPluginConfigs),
    constructJsConfig('sandbox', [...jsPluginConfigs, replaceSessionStorageString],),
    constructJsConfig('settings', jsPluginConfigs),
    constructJsConfig('sidePanel', jsPluginConfigs),
];