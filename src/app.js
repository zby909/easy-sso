"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * @Description:
 * @Author: zby
 * @Date: 2024-06-18 11:40:59
 * @LastEditors: zby
 * @Reference:
 */
// src/app.js
var koa_bodyparser_1 = require("koa-bodyparser");
var koa_logger_1 = require("koa-logger");
// import router from './routes/index.ts';
exports.default = (function (app) {
    // 添加中间件
    app.use((0, koa_logger_1.default)());
    app.use((0, koa_bodyparser_1.default)());
    // 加载路由
    // app.use(router.routes()).use(router.allowedMethods());
});
