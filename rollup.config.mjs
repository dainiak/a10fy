import {nodeResolve} from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import copy from "rollup-plugin-copy";
import terser from '@rollup/plugin-terser';
import scss from 'rollup-plugin-scss';
import replace from '@rollup/plugin-replace';
import typescript from '@rollup/plugin-typescript';


const enableTerser = true;

const jsPluginConfigs = [
    commonjs(),
    nodeResolve(
        {
            preferBuiltins: true,
            browser: true,
            extensions: ['.js', '.ts']
        }
    ),
    typescript({
        compilerOptions: {
            target: "es2022",
            module: "es2022",
            lib: ["dom", "es2022"],
            moduleResolution: "node",
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true,
            forceConsistentCasingInFileNames: true,
            rootDir: "src",
            outDir: "dist/js"
        }
    }),
    // resolve(
    //     {
    //         main: true,
    //         browser: true,
    //         preferBuiltins: true
    //     }
    // ),
];


if(enableTerser) {
    jsPluginConfigs.push(
        terser({
            format: {
                comments: false
            },
            sourceMap: false // Generate source maps for the minified code}
        })
    );
}

function constructJsConfig(input, pluginsList) {
    return {
        input: {
            [input]: `src/${input}.ts`,
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
    // constructJsConfig('contentScriptTour', jsPluginConfigs),

    constructJsConfig('background', [...jsPluginConfigs, copyPluginConfig]),
    constructJsConfig('contentScript', jsPluginConfigs),
    constructJsConfig('offscreen', jsPluginConfigs),
    constructJsConfig('popup', jsPluginConfigs),
    //
    constructJsConfig('customPlayerSandbox', jsPluginConfigs),
    constructJsConfig('sandbox', [...jsPluginConfigs, replaceSessionStorageString],),
    //
    constructJsConfig('settings', jsPluginConfigs),
    constructJsConfig('sidePanel', jsPluginConfigs),
];