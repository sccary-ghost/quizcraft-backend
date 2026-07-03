"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseDocx = parseDocx;
const mammoth_1 = __importDefault(require("mammoth"));
const parseQuestionText_1 = require("./parseQuestionText");
async function parseDocx(buffer) {
    const result = await mammoth_1.default.extractRawText({
        buffer,
    });
    return (0, parseQuestionText_1.parseQuestionText)(result.value);
}
