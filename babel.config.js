require('dotenv').config();

const defaultPresets = ['@babel/preset-react', '@babel/preset-env', '@babel/preset-flow', '@babel/preset-typescript'];
const defaultPlugins = [
    // Adding the commonjs: true option to react-native-web plugin can cause styling conflicts
    ['react-native-web'],

    '@babel/transform-runtime',
    '@babel/plugin-proposal-class-properties',

    // We use `transform-class-properties` for transforming ReactNative libraries and do not use it for our own
    // source code transformation as we do not use class property assignment.
    'transform-class-properties',

    // Keep it last
    'react-native-reanimated/plugin',
];

const webpack = {
    presets: defaultPresets,
    plugins: defaultPlugins,
};

const metro = {
    presets: [require('@react-native/babel-preset')],
    plugins: [
        // This is needed due to a react-native bug: https://github.com/facebook/react-native/issues/29084#issuecomment-1030732709
        // It is included in metro-react-native-babel-preset but needs to be before plugin-proposal-class-properties or FlatList will break
        '@babel/plugin-transform-flow-strip-types',

        ['@babel/plugin-proposal-class-properties', {loose: true}],
        ['@babel/plugin-proposal-private-methods', {loose: true}],
        ['@babel/plugin-proposal-private-property-in-object', {loose: true}],
        // The reanimated babel plugin needs to be last, as stated here: https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/installation
        'react-native-reanimated/plugin',
        // Import alias for native devices
        [
            'module-resolver',
            {
                extensions: [
                    '.native.js',
                    '.native.jsx',
                    '.native.ts',
                    '.native.tsx',
                    '.js',
                    '.jsx',
                    '.ts',
                    '.tsx',
                    '.ios.js',
                    '.ios.jsx',
                    '.ios.ts',
                    '.ios.tsx',
                    '.android.js',
                    '.android.jsx',
                    '.android.ts',
                    '.android.tx',
                ],
                alias: {
                    '@assets': './assets',
                    '@components': './src/components',
                    '@hooks': './src/hooks',
                    '@libs': './src/libs',
                    '@navigation': './src/libs/Navigation',
                    '@pages': './src/pages',
                    '@styles': './src/styles',
                    // This path is provide alias for files like `ONYXKEYS` and `CONST`.
                    '@src': './src',
                    '@userActions': './src/libs/actions',
                },
            },
        ],
    ],
    env: {
        production: {
            plugins: [['transform-remove-console', {exclude: ['error', 'warn']}]],
        },
    },
};

/*
 * We use Flipper, <React.Profiler> and react-native-performance to capture/monitor stats
 * By default <React.Profiler> is disabled in production as it adds small overhead
 * When CAPTURE_METRICS is set we're explicitly saying that we want to capture metrics
 * To enable the <Profiler> for release builds we add these aliases */
if (process.env.CAPTURE_METRICS === 'true') {
    const path = require('path');
    const profilingRenderer = path.resolve(__dirname, './node_modules/react-native/Libraries/Renderer/implementations/ReactNativeRenderer-profiling');

    metro.plugins.push([
        'module-resolver',
        {
            root: ['./'],
            alias: {
                'ReactNativeRenderer-prod': profilingRenderer,
                'scheduler/tracing': 'scheduler/tracing-profiling',
            },
        },
        'extra-alias',
    ]);
}

module.exports = (api) => {
    console.debug('babel.config.js');
    console.debug('  - api.version:', api.version);
    console.debug('  - api.env:', api.env());
    console.debug('  - process.env.NODE_ENV:', process.env.NODE_ENV);
    console.debug('  - process.env.BABEL_ENV:', process.env.BABEL_ENV);

    // For `react-native` (iOS/Android) caller will be "metro"
    // For `webpack` (Web) caller will be "@babel-loader"
    // For jest, it will be babel-jest
    // For `storybook` there won't be any config at all so we must give default argument of an empty object
    const runningIn = api.caller((args = {}) => args.name);
    console.debug('  - running in: ', runningIn);

    return ['metro', 'babel-jest'].includes(runningIn) ? metro : webpack;
};
