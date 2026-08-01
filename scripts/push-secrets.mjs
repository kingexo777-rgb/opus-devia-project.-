/**
 * Push .env.local to Supabase Edge secrets via Management API.
 * Requires SUPABASE_ACCESS_TOKEN in .env.local (Dashboard → Account → Access Tokens)
 * Run with: node scripts/push-secrets.mjs
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const envPath = join(root, ".env.local");
const projectRef = "fcewxusbwcynwpgkaunt";

function parseEnv(content) {
  const vars = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    vars[key] = val;
  }
  return vars;
}

function getVar(vars, names) {
  for (const n of names) {
    if (vars[n]) return vars[n];
  }
  return null;
}

const canonical = {
  MENTOR_API_KEY: ["MENTOR_API_KEY"],
  MENTOR_BASE_URL: ["MENTOR_BASE_URL", "MENTOR_API_BASE_URL"],
  MENTOR_MODEL: ["MENTOR_MODEL"],
  ASSISTANT_API_KEY: ["ASSISTANT_API_KEY"],
  ASSISTANT_BASE_URL: ["ASSISTANT_BASE_URL", "ASSISTANT_API_BASE_URL"],
  ASSISTANT_MODEL: ["ASSISTANT_MODEL"],
  GEMINI_API_KEY: ["GEMINI_API_KEY"],
  GEMINI_BASE_URL: ["GEMINI_BASE_URL", "GEMINI_API_BASE_URL"],
  GEMINI_MODEL: ["GEMINI_MODEL"],
  DEEPSEEK_API_KEY: ["DEEPSEEK_API_KEY"],
  DEEPSEEK_BASE_URL: ["DEEPSEEK_BASE_URL", "DEEPSEEK_API_BASE_URL"],
  DEEPSEEK_MODEL: ["DEEPSEEK_MODEL"],
  OPENAI_API_KEY: ["OPENAI_API_KEY"],
  OPENAI_BASE_URL: ["OPENAI_BASE_URL", "OPENAI_API_BASE_URL"],
  OPENAI_2_API_KEY: ["OPENAI_2_API_KEY"],
  OPENAI_2_BASE_URL: [
    "OPENAI_2_BASE_URL",
    "OPENAI_2_API_BASE_URL",
    "OPENAI_API_BASE_URL",
  ],
};

const vars = parseEnv(readFileSync(envPath, "utf8"));
const token =
  vars.SUPABASE_ACCESS_TOKEN ||
  process.env.SUPABASE_ACCESS_TOKEN;

if (!token) {
  console.error(
    "Missing SUPABASE_ACCESS_TOKEN. Add to .env.local from https://supabase.com/dashboard/account/tokens",
  );
  process.exit(1);
}

const secrets = [];
const missing = [];

for (const [name, aliases] of Object.entries(canonical)) {
  const value = getVar(vars, aliases);
  if (!value) {
    if (name === "OPENAI_BASE_URL" || name === "OPENAI_2_BASE_URL") continue;
    missing.push(name);
    continue;
  }
  secrets.push({ name, value });
}

if (missing.length) {
  console.error("Missing in .env.local:", missing.join(", "));
  process.exit(1);
}

console.log(`Pushing ${secrets.length} secrets to ${projectRef}...`);

const res = await fetch(
  `https://api.supabase.com/v1/projects/${projectRef}/secrets`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(secrets),
  },
);

if (!res.ok) {
  const body = await res.text();
  console.error(`Push failed (${res.status}):`, body);
  process.exit(1);
}

console.log("Secrets pushed successfully.");
