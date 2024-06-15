import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import copy from "rollup-plugin-copy";
import terser from '@rollup/plugin-terser';

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

const copyPluginConfig = copy({
    targets: [
        { src: 'src/assets/*', dest: 'dist' }
    ]
});


export default [
    constructJsConfig('background', jsPluginConfigs),
    constructJsConfig('contentScript', jsPluginConfigs),
    constructJsConfig('sidePanel', jsPluginConfigs),
    constructJsConfig('offscreen', jsPluginConfigs),
    constructJsConfig('welcome', jsPluginConfigs),
    constructJsConfig('popup', [...jsPluginConfigs, copyPluginConfig])
];