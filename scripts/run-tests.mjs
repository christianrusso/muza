import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

const files = readdirSync("tests")
  .filter((file) => file.endsWith(".test.ts"))
  .map((file) => `tests/${file}`);

if (files.length === 0) {
  console.error("No se encontraron tests en tests/*.test.ts");
  process.exit(1);
}

const result = spawnSync(process.execPath, ["--import", "tsx", "--test", ...files], {
  stdio: "inherit",
});

process.exit(result.status ?? 1);
