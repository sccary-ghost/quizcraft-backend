/* eslint-disable */
const fs = require('fs');

function replaceInFile(file, search, replace) {
  const content = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(file, content.replace(search, replace), 'utf8');
}

replaceInFile('src/controllers/auth.controller.ts', 'const updated = await prisma', 'await prisma');
replaceInFile('src/controllers/practice.controller.ts', 'const psq = await prisma.practiceSessionQuestion', 'await prisma.practiceSessionQuestion');
replaceInFile('src/middleware/errorHandler.middleware.ts', 'next: NextFunction', '_next: NextFunction');
replaceInFile('src/server.ts', 'err: any', '_err: any');
replaceInFile('src/server.ts', 'next: NextFunction', '_next: NextFunction');
replaceInFile('src/services/practice.service.ts', 'const candidateQuestionIds = ', '// const candidateQuestionIds = ');
replaceInFile('src/services/practice.service.ts', 'const key = ', '// const key = ');
replaceInFile('src/services/quiz.service.ts', 'catch (e) {', 'catch (_e) {');
replaceInFile('src/services/sessionSync.service.ts', 'req: any', '_req: any');
replaceInFile('src/utils/emailBlacklist.ts', 'import fs from "fs";\n', '');
replaceInFile('src/utils/emailBlacklist.ts', 'import path from "path";\n', '');
replaceInFile('src/utils/logger.ts', 'const redactSensitive =', '// const redactSensitive =');
replaceInFile('src/utils/parseQuestionText.ts', /\\\\-/g, '-');
replaceInFile('src/utils/pdfParser.ts', 'import fs from "fs";', '/* eslint-disable no-control-regex */\nimport fs from "fs";');

console.log("Replacements done");
