function isQuestionStart(
  line: string
) {
  return (
    /^Q\.?\s*\d+/i.test(line) ||
    /^\d+[.)]\s*/.test(line) ||
    /^\d+\.\d/.test(line) ||
    /^\.\s*[\u0900-\u097F]/.test(line) ||
    /^0\.\s*[\u0900-\u097F]/.test(line)
  );
}

function removeQuestionNumber(
  line: string
) {
  return line
    .replace(
      /^Q\.?\s*\d+[.)]?\s*/i,
      ""
    )
    .replace(
      /^\d+[.)]\s*/,
      ""
    )
    .replace(
      /^\.\s*/,
      ""
    )
    .trim();
}

function cleanOptionLabel(
  line: string
) {
  return line
    .replace(/^\(8\)/, "(a)")
    .replace(/^\(०\)/, "(b)")
    .replace(/^\(0\)/, "(b)")
    .replace(/^\(८\)/, "(c)")
    .replace(/^\(५४\)/, "(d)")
    .replace(/^\(५\)/, "(d)");
}

export function parseQuestionText(
  text: string
) {

  const lines = text
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);

  const rows: any[] = [];

  let current: any = null;
  let currentOption = "";
  let optionCount = 0;

  for (const line of lines) {

    if (isQuestionStart(line)) {

      if (
        current &&
        (
          current.optionA ||
          current.optionB ||
          current.optionC ||
          current.optionD
        )
      ) {
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

      continue;
    }

    if (!current) continue;

    const looksLikeOption =
      /^\(.+\)/.test(line);

    if (looksLikeOption) {

      optionCount++;

      const cleaned =
        cleanOptionLabel(line);

      if (optionCount === 1) {
        current.optionA = cleaned;
        currentOption = "A";
      }

      else if (optionCount === 2) {
        current.optionB = cleaned;
        currentOption = "B";
      }

      else if (optionCount === 3) {
        current.optionC = cleaned;
        currentOption = "C";
      }

      else if (optionCount === 4) {
        current.optionD = cleaned;
        currentOption = "D";
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

  if (
    current &&
    (
      current.optionA ||
      current.optionB ||
      current.optionC ||
      current.optionD
    )
  ) {
    rows.push(current);
  }

  return rows;
}