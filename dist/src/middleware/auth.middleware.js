"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeCandidate = exports.authorizeAdmin = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({
                message: "No token provided",
            });
        }
        const token = authHeader.split(" ")[1];
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch {
        res.status(401).json({
            message: "Invalid token",
        });
    }
};
exports.authenticate = authenticate;
const authorizeAdmin = (req, res, next) => {
    if (req.user && req.user.role === "ADMIN") {
        return next();
    }
    return res.status(403).json({
        message: "Forbidden: Admin access only",
    });
};
exports.authorizeAdmin = authorizeAdmin;
const authorizeCandidate = (req, res, next) => {
    if (req.user && req.user.role === "CANDIDATE") {
        return next();
    }
    return res.status(403).json({
        message: "Forbidden: Candidate access only",
    });
};
exports.authorizeCandidate = authorizeCandidate;
