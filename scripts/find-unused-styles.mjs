import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const srcDir = path.join(projectRoot, "src");
const stylesPath = path.join(srcDir, "styles.ts");

function readFile(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function walkFiles(dir, result = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walkFiles(fullPath, result);
      continue;
    }

    if (
      entry.isFile() &&
      /\.(ts|tsx)$/.test(entry.name) &&
      !entry.name.endsWith(".d.ts")
    ) {
      result.push(fullPath);
    }
  }

  return result;
}

function extractStyleKeys(stylesSource) {
  const keys = [];
  const keyRegex = /^\s{0,2}([A-Za-z0-9_]+):\s*\{/gm;

  let match;

  while ((match = keyRegex.exec(stylesSource)) !== null) {
    keys.push(match[1]);
  }

  return [...new Set(keys)];
}

const stylesSource = readFile(stylesPath);
const styleKeys = extractStyleKeys(stylesSource);

const sourceFiles = walkFiles(srcDir).filter(
  (filePath) => path.normalize(filePath) !== path.normalize(stylesPath)
);

const allSource = sourceFiles
  .map((filePath) => {
    const relativePath = path.relative(projectRoot, filePath);
    return `\n/* FILE: ${relativePath} */\n${readFile(filePath)}`;
  })
  .join("\n");

const used = [];
const unused = [];

for (const key of styleKeys) {
  const dotUsage = new RegExp(`\\bstyles\\.${key}\\b`);
  const bracketUsage = new RegExp(`\\bstyles\\[['"\`]${key}['"\`]\\]`);

  if (dotUsage.test(allSource) || bracketUsage.test(allSource)) {
    used.push(key);
  } else {
    unused.push(key);
  }
}

console.log("\n=== STYLE AUDIT ===");
console.log(`Wszystkie style: ${styleKeys.length}`);
console.log(`Używane: ${used.length}`);
console.log(`Prawdopodobnie nieużywane: ${unused.length}`);

console.log("\n=== PRAWDOPODOBNIE NIEUŻYWANE ===");
for (const key of unused) {
  console.log(`- ${key}`);
}

console.log("\nUwaga: sprawdź ręcznie przed usunięciem, jeśli styl jest składany dynamicznie.");