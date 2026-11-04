// Rewrites README.md for the catalog branch: drops everything between
// chat-area markers and uncomments the catalog-only text.
import { readFileSync, writeFileSync } from "node:fs";

const file = new URL("../README.md", import.meta.url);
let text = readFileSync(file, "utf8");
text = text.replace(/<!-- chat-area:begin -->.*?<!-- chat-area:end -->\n/gs, "");
text = text.replace(/<!-- catalog:\s*(.*?)\s*-->/gs, "$1");
writeFileSync(file, text);
