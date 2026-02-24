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

	const content = `// AUTO-GENERATED — non modificare a mano
// Sorgente: shared/prisma/schema.prisma

export const ${enumName} = {
${values.map((v) => `  ${v}: '${v}'`).join(",\n")}
} as const;

export type ${enumName} = typeof ${enumName}[keyof typeof ${enumName}];
`;

	const fileName = `${enumName.toLowerCase()}.enum.ts`;
	fs.writeFileSync(path.join(outputDir, fileName), content);
	generatedEnums.push(enumName);
	console.log(`Generato: ${fileName}`);
}

// Genera index.ts automaticamente
const indexContent = `// AUTO-GENERATED — non modificare a mano

${generatedEnums.map((e) => `export * from './${e.toLowerCase()}.enum';`).join("\n")}
`;

fs.writeFileSync(path.join(outputDir, "index.ts"), indexContent);
console.log("Generato: index.ts");
console.log(`\n${generatedEnums.length} enum generati da schema.prisma`);
