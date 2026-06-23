import { fromBuffer } from "pdf2pic";
import Tesseract from "tesseract.js";

export async function extractPdfWithOCR(
  buffer: Buffer
) {
  const convert = fromBuffer(buffer, {
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

      const result =
        await Tesseract.recognize(
          Buffer.from(image.base64, "base64"),
          "eng+hin"
        );

      finalText += "\n" + result.data.text;

      page++;

    } catch {

      break;

    }

  }

  return finalText;
}