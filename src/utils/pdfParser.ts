import pdf from "pdf-parse";

function isQuestionStart(line: string) {
  return (
    /^Q\s*\d+/i.test(line) ||
    /^\d+[.)]\s+/.test(line)
  );
}

export async function parsePdf(
  buffer: Buffer
) {
  const data = await pdf(buffer);

  const text = data.text
    .replace(/\u0000/g, "")
    .replace(/\r/g, "");

  const lines = text
    .split("\n")
    .map((line: string) => line.trim())
    .filter(Boolean);

  const rows: any[] = [];

  let current: any = null;
  let currentOption = "";

  for (const line of lines) {

    if (
      isQuestionStart(line) &&
      (
        !current ||
        (
          current.optionA &&
          current.optionB &&
          current.optionC &&
          current.optionD
        )
      )
    ) {

      if (current) {
        rows.push(current);
      }

      current = {
        question: line.replace(
          /^Q?\d+[.)]\s*/,
          ""
        ),
        optionA: "",
        optionB: "",
        optionC: "",
        optionD: "",
        correctAnswer: "",
      };

      currentOption = "";

      continue;
    }

    if (!current) continue;

    // OPTION A
    if (
      /^\([aA]\)/.test(line) ||
      /^a[.)]/.test(line) ||
      /^A[.)]/.test(line)
    ) {
      current.optionA = line;
      currentOption = "A";
      continue;
    }

    // OPTION B
    if (
      /^\([bB]\)/.test(line) ||
      /^b[.)]/.test(line) ||
      /^B[.)]/.test(line)
    ) {
      current.optionB = line;
      currentOption = "B";
      continue;
    }

    // OPTION C
    if (
      /^\([cC]\)/.test(line) ||
      /^c[.)]/.test(line) ||
      /^C[.)]/.test(line)
    ) {
      current.optionC = line;
      currentOption = "C";
      continue;
    }

    // OPTION D
    if (
      /^\([dD]\)/.test(line) ||
      /^d[.)]/.test(line) ||
      /^D[.)]/.test(line)
    ) {
      current.optionD = line;
      currentOption = "D";
      continue;
    }

    // Multiline options
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

    // Question formatting
    else {

      if (
        /^\d+\./.test(line) ||
        /^[ivxlcdm]+\./i.test(line)
      ) {
        current.question += "\n" + line;
      }

      else if (
        /^Which /i.test(line) ||
        /^Who /i.test(line) ||
        /^Select /i.test(line) ||
        /^Choose /i.test(line)
      ) {
        current.question += "\n\n" + line;
      }

      else {
        current.question += " " + line;
      }

    }

  }

  if (current) {
    rows.push(current);
  }

  return rows;
}