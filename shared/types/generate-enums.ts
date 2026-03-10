import fs from "fs";
import path from "path";

const schemaPath = path.resolve(__dirname, "../prisma/schema.prisma");
const outputDir = path.resolve(__dirname, "./src/enums");

const schema = fs.readFileSync(schemaPath, "utf-8");
const enumRegex = /enum (\w+) \s*\{([^}]+)\}/g;

if (!fs.existsSync(outputDir)) {
	fs.mkdirSync(outputDir, { recursive: true });
}

const generatedEnums: string[] = [];
let match;

while ((match = enumRegex.exec(schema)) !== null) {
	const enumName = match[1];
	const values = match[2]
		.trim()
		.split("\n")
		.map((v) => v.trim())
		.filter((v) => v && !v.startsWith("//"));

	const content = `// AUTO-GENERATED — do not edit manually
  // Source: shared/prisma/schema.prisma

  export const ${enumName} = {
  ${values.map((v) => `  ${v}: '${v}'`).join(",\n")}
  } as const;

  export type ${enumName} = typeof ${enumName}[keyof typeof ${enumName}];
  `;

	const fileName = `${enumName.toLowerCase()}.enum.ts`;
	fs.writeFileSync(path.join(outputDir, fileName), content);
	generatedEnums.push(enumName);
	console.log(`Generated: ${fileName}`);
}

// Collect custom (non-generated) .enum.ts files already in the folder
const existingFiles = fs
	.readdirSync(outputDir)
	.filter((f) => f.endsWith(".enum.ts"));
const generatedFileNames = generatedEnums.map(
	(e) => `${e.toLowerCase()}.enum.ts`,
);
const customFiles = existingFiles.filter(
	(f) => !generatedFileNames.includes(f),
);

const allExports = [
	...generatedEnums.map((e) => `export * from './${e.toLowerCase()}.enum';`),
	...customFiles.map((f) => `export * from './${f.replace(".ts", "")}';`),
];

// Generate index.ts automatically
const indexContent = `// AUTO-GENERATED — do not edit manually

  ${allExports.join("\n")}
  `;

fs.writeFileSync(path.join(outputDir, "index.ts"), indexContent);
console.log("Generated: index.ts");
console.log(`\n${generatedEnums.length} enums generated from schema.prisma`);
console.log(
	`${customFiles.length} custom enum file(s) included: ${customFiles.join(", ") || "none"}`,
);