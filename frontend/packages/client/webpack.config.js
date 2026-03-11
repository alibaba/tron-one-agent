/*
 * Copyright 2026 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const webpack = require("webpack");

module.exports = (env, argv) => {
  return {
    mode: process.env.NODE_ENV === "production" ? "production" : "development",
    devtool: "eval-source-map",
    entry: "./src/main.tsx",
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: "[name].[contenthash].js",
      clean: true,
    },
    resolve: {
      extensions: [".tsx", ".ts", ".js", ".jsx"],
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    module: {
      rules: [
        {
          test: /\.(ts|tsx)$/,
          use: [
            {
              loader: "babel-loader",
              options: {
                presets: [
                  "@babel/preset-env",
                  "@babel/preset-react",
                  "@babel/preset-typescript",
                ],
              },
            },
          ],
          exclude: /node_modules/,
        },
        // 修复 node_modules中@ant-design/icons的导入问题
        {
          test: /\.js$/,
          include: /node_modules\/@ant-design\/icons/,
          use: [
            {
              loader: "babel-loader",
              options: {
                presets: ["@babel/preset-env", "@babel/preset-react"],
              },
            },
          ],
        },
        {
          test: /\.less$/,
          use: [
            "style-loader",
            {
              loader: "css-loader",
              options: {
                modules: {
                  localIdentName: "[name]__[local]___[hash:base64:5]",
                },
              },
            },
            {
              loader: "less-loader",
              options: {
                lessOptions: {
                  javascriptEnabled: true,
                },
              },
            },
          ],
        },
        {
          test: /\.css$/,
          use: ["style-loader", "css-loader"],
        },
        {
          test: /\.(png|jpe?g|gif|svg)$/i,
          type: "asset/resource",
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: "./index.html",
        inject: "body",
      }),
    ],
    devServer: {
      port: 4010,
      hot: true,
      open: true,
      compress: false,
      historyApiFallback: {
        rewrites: [{ from: /^\/[^.]*$/, to: "/index.html" }],
      },
      proxy: [
        {
          // context: (path, req) => {
          //   return /^\/api\/.*\/events$/.test(path);
          // },
          context: ["/chatApi"],
          // target: "http://0.0.0.0:8000",
          target: "http://0.0.0.0:8080",
          changeOrigin: true,
          cookieDomainRewrite: "localhost",
          secure: false,
          ws: true,
          pathRewrite: {
            "^/chatApi": "",
          },
        },
        {
          context: ["/client"],
          target: "http://0.0.0.0:8080",
          // target: "http://0.0.0.0:8000",
          changeOrigin: true,
          pathRewrite: {
            "^/client": "",
          },
          logLevel: "debug",
          onProxyReq: (proxyReq, req, res) => {
            console.log("代理请求:", req.method, req.url, "->", proxyReq.path);
          },
          onProxyRes: (proxyRes, req, res) => {
            console.log("代理响应:", proxyRes.statusCode, req.url);
          },
          onError: (err, req, res) => {
            console.error("代理错误:", err.message);
          },
        },
      ],
    },
    optimization: {
      splitChunks: {
        chunks: "all",
      },
    },
  };
};
