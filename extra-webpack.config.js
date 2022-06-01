const webpack = require('webpack');

module.exports = {
    resolve: {
        alias: {
            "crypto": "crypto-browserify"
        },
        fallback: {
            "stream": require.resolve("stream-browserify"),
            "vm": require.resolve("vm-browserify")
        }
    },
    plugins: [
        new webpack.ProvidePlugin({
            // Make a global `process` variable that points to the `process` package,
            // because the `util` package expects there to be a global variable named `process`.
            // Thanks to https://stackoverflow.com/a/65018686/14239942
            process: 'process/browser'
        })
    ],
}
