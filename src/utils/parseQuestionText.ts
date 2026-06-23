function isQuestionStart(line: string) {
  return (
    /^Q\.?\s*\d+/i.test(line) ||
    /^\d+[.)]\s+/.test(line)
  );
}

export function parseQuestionText(
  text: string
) {
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
          /^Q\.?\s*\d+[.)]?\s*/i,
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

    if (
      /^\([aA]\)/.test(line) ||
      /^a[.)]/i.test(line)
    ) {
      current.optionA = line;
      currentOption = "A";
      continue;
    }

    if (
      /^\([bB]\)/.test(line) ||
      /^b[.)]/i.test(line)
    ) {
      current.optionB = line;
      currentOption = "B";
      continue;
    }

    if (
      /^\([cC]\)/.test(line) ||
      /^c[.)]/i.test(line)
    ) {
      current.optionC = line;
      currentOption = "C";
      continue;
    }

    if (
      /^\([dD]\)/.test(line) ||
      /^d[.)]/i.test(line)
    ) {
      current.optionD = line;
      currentOption = "D";
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