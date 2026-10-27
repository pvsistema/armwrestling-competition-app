// Записывает отпечатки (SHA-256) файлов интерфейса в код программы: Armsport/WebHashes.g.cs
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "dist-desktop");
const out = join(here, "Armsport", "WebHashes.g.cs");
const files = [];
const walk = (d) => {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) walk(p);
    else files.push(p);
  }
};
walk(root);
files.sort();
const rows = files.map((p) => {
  const rel = relative(root, p).split("\\").join("/");
  const h = createHash("sha256").update(readFileSync(p)).digest("hex");
  return `        [${JSON.stringify(rel)}] = "${h}",`;
});
writeFileSync(
  out,
  `// Создаётся автоматически при сборке (desktop/hash-web.mjs). Не редактировать.
namespace Armsport;

internal static class WebHashes
{
    public static readonly Dictionary<string, string> Files = new(StringComparer.Ordinal)
    {
${rows.join("\n")}
    };
}
`,
);
console.log(`  OK: отпечатки ${files.length} файлов интерфейса`);
