/**
 * 3D Foundation Project
 * Copyright 2019 Smithsonian Institution
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

////////////////////////////////////////////////////////////////////////////////
//
// Environment variables used
//
// NODE_ENV               development | production
// VOYAGER_OFFLINE        True for an offline build (no external dependencies)
// VOYAGER_ANALYTICS_ID   Google Analytics ID
//
////////////////////////////////////////////////////////////////////////////////
"use strict";

require('dotenv').config();

const path = require("path");
const webpack = require("webpack");

const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const HTMLWebpackPlugin = require("html-webpack-plugin");

////////////////////////////////////////////////////////////////////////////////

const project = path.resolve(__dirname, "../../../");

const dirs = {
    project,
    source: path.resolve(project, "source"),
    assets: path.resolve(project, "assets"),
    output: path.resolve(project, "dist"),
    modules: path.resolve(project, "node_modules"),
    libs: path.resolve(project, "libs"),
};


const version = require(path.resolve(project, "package.json")).version;



////////////////////////////////////////////////////////////////////////////////

module.exports = function createAppConfig(env, argv)
{
    const isDevMode = (typeof argv?.mode !== "undefined") ? argv.mode !== "production" : process.env["NODE_ENV"] !== "production";
    const devMode = isDevMode ? "development" : "production";
    
    const hbsParams = {
        version: version,
        isDevelopment: isDevMode,
        isOffline: false,
    };

    const config = {
        mode: devMode,
        entry: {
            "holusion": "source/holusion/client/MV2.ts",
        },

        output: {
            path: dirs.output,
            filename: isDevMode ? "js/[name].dev.js" : "js/[name].min.js",
            publicPath: '/',
        },

        resolve: {
            modules: [
                path.join(dirs.source, "holusion/node_modules"),
                dirs.modules,
            ],
            // Aliases for FF Foundation Library components
            alias: {
                "source": dirs.source,
                "client": path.resolve(dirs.source, "client"),
                "@ff/core": path.resolve(dirs.libs, "ff-core/source"),
                "@ff/graph": path.resolve(dirs.libs, "ff-graph/source"),
                "@ff/ui": path.resolve(dirs.libs, "ff-ui/source"),
                "@ff/react": path.resolve(dirs.libs, "ff-react/source"),
                "@ff/browser": path.resolve(dirs.libs, "ff-browser/source"),
                "@ff/three": path.resolve(dirs.libs, "ff-three/source"),
                "@ff/scene": path.resolve(dirs.libs, "ff-scene/source"),
                "three$": path.resolve(dirs.modules, "three/src/Three"),
            },
            // Resolvable extensions
            extensions: [".ts", ".tsx", ".js", ".json"],
            // Fallbacks
            fallback: {
                "stream": require.resolve("stream-browserify"), // include a polyfill for stream
                "buffer": require.resolve("buffer"), // include a polyfill for buffer
                "path": false,
            },
        },

        optimization: {
            //concatenateModules: false,
            minimize: !isDevMode,
            emitOnErrors: true, //Should be disabled when possible
        },

        plugins: [
            new webpack.DefinePlugin({
                ENV_PRODUCTION: JSON.stringify(!isDevMode),
                ENV_DEVELOPMENT: JSON.stringify(false), //Annoying logs when autorotating
                ENV_OFFLINE: JSON.stringify(false),
                ENV_VERSION: JSON.stringify("e-corpus-"+version+(isDevMode?"-dev":"")),
            }),
            new MiniCssExtractPlugin({
                filename: isDevMode ? "css/[name].dev.css" : "css/[name].min.css",
                //allChunks: true
            }),

            new HTMLWebpackPlugin({
                filename: `voyager-split.html`,
                template: path.join(dirs.source, "holusion/client", "split.hbs"),
                title: "Voyager SplitScreen Viewer",
                templateParameters: {...hbsParams, element: `<voyager-explorer-leak></voyager-explorer-leak>`},
                chunks : ['holusion'],
            }),
        ],

        // loaders execute transforms on a per-file basis
        module: {
            rules: [
                {
                    // Raw text and shader files
                    test: /\.(txt|glsl|hlsl|frag|vert|fs|vs)$/,
                    loader: "raw-loader"
                },
                {
                    // Enforce source maps for all javascript files
                    enforce: "pre",
                    test: /\.js$/,
                    loader: "source-map-loader"
                },
                {
                    // Transpile SCSS to CSS and concatenate (to string)
                    test: /\.scss$/,
                    use: ["raw-loader","sass-loader"],
                    issuer: {
                        //include: /source\/client\/ui\/explorer/     // currently only inlining explorer css
                        and: [/source\/client\/ui\/explorer/]     // currently only inlining explorer css
                    }
                },
                {
                    // Transpile SCSS to CSS and concatenate
                    test: /\.scss$/,
                    use: /*appName === 'voyager-explorer' ? ["raw-loader","sass-loader"] :*/
                        [         
                            MiniCssExtractPlugin.loader,
                            "css-loader",
                            "sass-loader"
                        ],
                    issuer: {
                        not: [/source\/client\/ui\/explorer/]     // currently only inlining explorer css
                    }
                },
                {
                    test: /content\.css$/i,
                    use: ['css-loader'],
                },
                {
                    // Concatenate CSS
                    test: /\.css$/,
                    use: [
                        MiniCssExtractPlugin.loader,
                        //"style-loader",
                        "css-loader",
                    ]
                },
                {
                    // Typescript/JSX files
                    test: /\.tsx?$/,
                    use: "ts-loader",
		            exclude: /node_modules/,
                },
                {
                    test: /\.hbs$/,
                    loader: "handlebars-loader"
                },
            ]
        },

        // When importing a module whose path matches one of the following, just
        // assume a corresponding global variable exists and use that instead.
        externals: {
            //"three": "THREE",
            //"quill": "Quill",
            //"../../../build/three.module.js": "THREE",  // patch to handle three jsm modules until there is a better routing option
        },

        stats: {chunkModules: true, excludeModules: false }
    };

    if (isDevMode) {
        config.devtool = "source-map";
    }

    return config;
}
