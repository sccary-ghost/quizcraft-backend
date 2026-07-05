"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestId = void 0;
const uuid_1 = require("uuid");
const requestId = (req, res, next) => {
    req.requestId = req.headers["x-request-id"] || (0, uuid_1.v4)();
    res.setHeader("X-Request-ID", req.requestId);
    next();
};
exports.requestId = requestId;
