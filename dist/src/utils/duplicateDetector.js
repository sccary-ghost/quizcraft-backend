"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanText = cleanText;
exports.getSimilarity = getSimilarity;
exports.findDuplicates = findDuplicates;
function cleanText(text) {
    if (!text)
        return "";
    // Strip HTML tags, convert to lowercase, and strip all non-alphanumeric characters
    return text
        .replace(/<[^>]*>/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
}
function getSimilarity(str1, str2) {
    const s1 = cleanText(str1);
    const s2 = cleanText(str2);
    if (s1 === s2)
        return 1.0;
    if (s1.length < 2 || s2.length < 2)
        return 0.0;
    const getBigrams = (str) => {
        const bigrams = new Set();
        for (let i = 0; i < str.length - 1; i++) {
            bigrams.add(str.substring(i, i + 2));
        }
        return bigrams;
    };
    const b1 = getBigrams(s1);
    const b2 = getBigrams(s2);
    let intersection = 0;
    b1.forEach((bg) => {
        if (b2.has(bg)) {
            intersection++;
        }
    });
    return (2.0 * intersection) / (b1.size + b2.size);
}
function findDuplicates(questions, threshold = 0.85) {
    const visited = new Set();
    const groups = [];
    for (let i = 0; i < questions.length; i++) {
        const q1 = questions[i];
        if (visited.has(q1.id))
            continue;
        const groupQuestions = [q1];
        let maxSimilarity = 0;
        for (let j = i + 1; j < questions.length; j++) {
            const q2 = questions[j];
            if (visited.has(q2.id))
                continue;
            const sim = getSimilarity(q1.question, q2.question);
            if (sim >= threshold) {
                groupQuestions.push(q2);
                maxSimilarity = Math.max(maxSimilarity, sim);
                visited.add(q2.id);
            }
        }
        if (groupQuestions.length > 1) {
            visited.add(q1.id);
            groups.push({
                id: `group-${q1.id}`,
                similarity: maxSimilarity,
                questions: groupQuestions,
            });
        }
    }
    return groups;
}
