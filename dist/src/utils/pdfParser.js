"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePdf = parsePdf;
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const parseQuestionText_1 = require("./parseQuestionText");
function cleanText(text) {
    return text
        // eslint-disable-next-line no-control-regex
        .replace(/\x00/g, "")
        .replace(/\r/g, "")
        // remove branding / footer
        .replace(/aash education pvt\.?ltd\.?/gi, "")
        .replace(/Download Bigbooster.*$/gim, "")
        .replace(/By:-.*$/gim, "")
        .replace(/Playstore.*$/gim, "")
        // normalize option labels
        .replace(/\(\s*a\s*\)/gi, "(a)")
        .replace(/\(\s*b\s*\)/gi, "(b)")
        .replace(/\(\s*c\s*\)/gi, "(c)")
        .replace(/\(\s*d\s*\)/gi, "(d)")
        // remove isolated page numbers
        .replace(/^\s*\d+\s*$/gm, "")
        // normalize spaces
        .replace(/[ \t]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}
async function parsePdf(buffer) {
    const data = await (0, pdf_parse_1.default)(buffer);
    const cleanedText = cleanText(data.text);
    return (0, parseQuestionText_1.parseQuestionText)(cleanedText);
}
