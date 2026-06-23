import mammoth from "mammoth";
import { parseQuestionText } from "./parseQuestionText";

export async function parseDocx(
  buffer: Buffer
) {

  const result =
    await mammoth.extractRawText({
      buffer,
    });

  return parseQuestionText(
    result.value
  );

}