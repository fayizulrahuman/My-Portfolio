import path from "node:path";
import { fileURLToPath } from "node:url";
import { refreshAllAssets } from "./generators.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const demo = process.argv.includes("--demo");

refreshAllAssets(ROOT, { demo })
  .then((result) => {
    console.log("Updated assets:", result);
  })
  .catch((err) => {
    console.error("Failed to update assets:", err);
    process.exit(1);
  });
