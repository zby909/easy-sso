"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * @Description:
 * @Author: zby
 * @Date: 2024-06-17 11:33:04
 * @LastEditors: zby
 * @Reference:
 */
var koa_1 = require("koa");
var http_1 = require("http");
var https_1 = require("https");
// import configureSocket from './services/sockets/socketConfig.ts';
var app_ts_1 = require("./app.ts");
var fs_1 = require("fs");
var path_1 = require("path");
var dotenv_1 = require("dotenv");
// 加载环境变量
var NODE_ENV = (_a = process.env.NODE_ENV) === null || _a === void 0 ? void 0 : _a.trim();
var envPath = path_1.default.resolve(".env.".concat(NODE_ENV));
dotenv_1.default.config({ path: envPath });
var isDev = NODE_ENV === 'development';
// 创建 Koa 实例
var app = new koa_1.default();
var httpServer;
if (isDev) {
    console.log('isDev https');
    httpServer = https_1.default.createServer({
        key: fs_1.default.readFileSync(path_1.default.resolve('crt/server.key')),
        cert: fs_1.default.readFileSync(path_1.default.resolve('crt/server.crt')),
    }, app.callback());
}
else {
    httpServer = http_1.default.createServer(app.callback());
}
// 加载 Koa 中间件和路由配置
(0, app_ts_1.default)(app);
var PORT = process.env.PORT || 3002;
httpServer.listen(PORT, function () {
    console.log("Server is running on port ".concat(PORT));
});
