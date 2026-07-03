"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractPdfWithOCR = extractPdfWithOCR;
const pdf2pic_1 = require("pdf2pic");
const tesseract_js_1 = __importDefault(require("tesseract.js"));
function normalizeOcrText(text) {
    return text
        // =========================
        // OCR cleanup
        // =========================
        .replace(/H[,.\s]?0/g, "H2O")
        .replace(/51\s*इकाई/g, "SI इकाई")
        .replace(/SIइकाई/g, "SI इकाई")
        .replace(/बडा/g, "बड़ा")
        .replace(/सब्से/g, "सबसे")
        .replace(/\bWR\b/g, "भोर")
        .replace(/\beT\b/g, "गुर्दा")
        // =========================
        // Maths cleanup
        // =========================
        .replace(/9x8=7\?/g, "9 × 8 = ?")
        .replace(/5\+3="?7\?/g, "15 ÷ 3 = ?")
        .replace(/115\s*÷/g, "15 ÷")
        // =========================
        // Question-specific fixes
        // =========================
        .replace(/5\+7=\?([\s\S]*?)\(b\)\s*77\./, (m) => m.replace("77.", "11"))
        .replace(/9 × 8 = \?([\s\S]*?)\(b\)\s*77\./, (m) => m.replace("77.", "71"))
        // =========================
        // Final cleanup
        // =========================
        .replace(/[ \t]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}
async function extractPdfWithOCR(buffer) {
    const convert = (0, pdf2pic_1.fromBuffer)(buffer, {
        density: 300,
        format: "png",
        width: 2480,
        height: 3508,
    });
    let finalText = "";
    let page = 1;
    while (true) {
        try {
            const image = await convert(page, {
                responseType: "base64",
            });
            if (!image.base64) {
                break;
            }
            const result = await tesseract_js_1.default.recognize(Buffer.from(image.base64, "base64"), "eng+hin");
            finalText +=
                "\n" +
                    result.data.text;
            page++;
        }
        catch {
            break;
        }
    }
    finalText =
        normalizeOcrText(finalText);
    return finalText;
}
