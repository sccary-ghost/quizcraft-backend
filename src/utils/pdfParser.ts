import pdf from "pdf-parse";
import { parseQuestionText } from "./parseQuestionText";

function cleanText(text: string) {
  return text
    .replace(/\u0000/g, "")
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

export async function parsePdf(
  buffer: Buffer
) {
  const data = await pdf(buffer);

  const cleanedText = cleanText(
    data.text
  );

  return parseQuestionText(
    cleanedText
  );
}