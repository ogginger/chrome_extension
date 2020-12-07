//webpack.config.js: Webpack configuration file for the application.

var path = require("path");
var _ = require('lodash');
var webpack = require("webpack");

function template() {
    return {
        entry: undefined,
        mode: "development",  
        output: undefined,
        optimization: {
            "minimize": true
        },
        devtool: "inline-source-map",
        module: {
            rules: [{
                test: /\.html$/,
                exclude: /node_modules/,
                use: ['html-loader']
            },
            { 
                test: /\.tsx?$/,
                loader: 'ts-loader',
                options: { 
                    projectReferences: true
                }
            }]
        },
        resolve: {
            modules: ['node_modules','../lib'],
            extensions: ['.js','.ts', '.html', ".css"],
            alias: {}
        },
        plugins: []
    };
}

function customizer(objValue, srcValue) {
    if (_.isArray(objValue)) {
      return objValue.concat(srcValue);
    }
}
var merge = function(dst, src) {
    return _.mergeWith(dst,src,customizer);
}

function createWebpackExport(outDir, config) {
    if ( config.entry == undefined ) {
        throw new Error("Webpack config entry point was not defined!");
    } else if ( config.output == undefined ) {
        throw new Error("Webpack config output was not defined!");
    } else {
        var ex = template();
        ex.entry = path.resolve(__dirname, config.entry),
        ex.output = {
            path: path.resolve(__dirname, outDir),
            filename: config.output
        };

        if ( config.options ) {
            ex = merge(ex, config.options)
        }

        return ex;
    }
}

function _export( outDir, configs ) {
    var outConfigs=[];
    for(var config of configs) {
        outConfigs.push(createWebpackExport(outDir, config));
    }
    return outConfigs;
}

module.exports = _export( "builds", [{
    entry: "src/app.ts",
    output: "app.js",
    options: {}
}]);