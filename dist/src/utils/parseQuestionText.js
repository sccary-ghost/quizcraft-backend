"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseQuestionText = parseQuestionText;
function isQuestionStart(line) {
    return (/^Q\.?\s*\d+/i.test(line) ||
        /^\d+[.)]\s*/.test(line) ||
        /^\d+\.\d/.test(line) ||
        /^\.\s*[\u0900-\u097F]/.test(line) ||
        /^0\.\s*[\u0900-\u097F]/.test(line));
}
function removeQuestionNumber(line) {
    return line
        .replace(/^Q\.?\s*\d+[.)]?\s*/i, "")
        .replace(/^\d+[.)]\s*/, "")
        .replace(/^\.\s*/, "")
        .trim();
}
function cleanOptionLabel(line) {
    return line
        .replace(/^\(8\)/, "(a)")
        .replace(/^\(०\)/, "(b)")
        .replace(/^\(0\)/, "(b)")
        .replace(/^\(८\)/, "(c)")
        .replace(/^\(५४\)/, "(d)")
        .replace(/^\(५\)/, "(d)");
}
function parseQuestionText(text) {
    const lines = text
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
    const rows = [];
    let current = null;
    let currentOption = "";
    let optionCount = 0;
    let tempAnswerLabel = ""; // Store the a/b/c/d label temporarily
    for (const line of lines) {
        if (isQuestionStart(line)) {
            if (current &&
                (current.optionA ||
                    current.optionB ||
                    current.optionC ||
                    current.optionD)) {
                // Map the extracted a/b/c/d label to the full option text before pushing
                if (tempAnswerLabel === "a")
                    current.correctAnswer = current.optionA;
                else if (tempAnswerLabel === "b")
                    current.correctAnswer = current.optionB;
                else if (tempAnswerLabel === "c")
                    current.correctAnswer = current.optionC;
                else if (tempAnswerLabel === "d")
                    current.correctAnswer = current.optionD;
                rows.push(current);
            }
            current = {
                question: removeQuestionNumber(line),
                optionA: "",
                optionB: "",
                optionC: "",
                optionD: "",
                correctAnswer: "",
            };
            currentOption = "";
            optionCount = 0;
            tempAnswerLabel = ""; // Reset for next question
            continue;
        }
        if (!current)
            continue;
        // --- NEW: Answer Extraction Logic ---
        // Matches "Ans: a", "Answer: (b)", "उत्तर: c", "Ans - d", etc.
        const answerMatch = line.match(/^(?:ans(?:wer)?|उत्तर|हल)[\s.:\-]*(\(?[a-d]\)?)/i);
        if (answerMatch) {
            // Clean the captured label to just 'a', 'b', 'c', or 'd'
            tempAnswerLabel = answerMatch[1].toLowerCase().replace(/[()]/g, "");
            continue; // Skip appending this line to optionD or question
        }
        // ------------------------------------
        // Also check if the correct answer is marked with an asterisk inline e.g. "*(b) Delhi"
        const hasAsterisk = line.startsWith("*");
        const cleanLine = hasAsterisk ? line.replace(/^\*\s*/, "") : line;
        const looksLikeOption = /^\(.+\)/.test(cleanLine);
        if (looksLikeOption) {
            optionCount++;
            const cleaned = cleanOptionLabel(cleanLine);
            if (optionCount === 1) {
                current.optionA = cleaned;
                currentOption = "A";
                if (hasAsterisk)
                    tempAnswerLabel = "a";
            }
            else if (optionCount === 2) {
                current.optionB = cleaned;
                currentOption = "B";
                if (hasAsterisk)
                    tempAnswerLabel = "b";
            }
            else if (optionCount === 3) {
                current.optionC = cleaned;
                currentOption = "C";
                if (hasAsterisk)
                    tempAnswerLabel = "c";
            }
            else if (optionCount === 4) {
                current.optionD = cleaned;
                currentOption = "D";
                if (hasAsterisk)
                    tempAnswerLabel = "d";
            }
            continue;
        }
        if (currentOption === "A") {
            current.optionA += " " + line;
        }
        else if (currentOption === "B") {
            current.optionB += " " + line;
        }
        else if (currentOption === "C") {
            current.optionC += " " + line;
        }
        else if (currentOption === "D") {
            current.optionD += " " + line;
        }
        else {
            current.question += " " + line;
        }
    }
    // Push the final question in the loop
    if (current &&
        (current.optionA || current.optionB || current.optionC || current.optionD)) {
        if (tempAnswerLabel === "a")
            current.correctAnswer = current.optionA;
        else if (tempAnswerLabel === "b")
            current.correctAnswer = current.optionB;
        else if (tempAnswerLabel === "c")
            current.correctAnswer = current.optionC;
        else if (tempAnswerLabel === "d")
            current.correctAnswer = current.optionD;
        rows.push(current);
    }
    return rows;
}
