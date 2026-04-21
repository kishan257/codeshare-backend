const MAX_CODE_SIZE = 20000;

export function sanitizeCode(input) {
  if (typeof input !== "string") {
    return "";
  }

  const clipped = input.slice(0, MAX_CODE_SIZE);
  return clipped.replace(/\0/g, "").replace(/\u2028|\u2029/g, "\n");
}

export function sanitizeLanguage(input) {
  const allowed = ["javascript", "python", "cpp", "nodejs", "html", "css", "reactjs", "nextjs"];
  if (!allowed.includes(input)) {
    return "javascript";
  }
  return input;
}

const ALLOWED_LANGUAGES = ["javascript", "python", "cpp", "nodejs", "html", "css", "reactjs", "nextjs"];

export function sanitizeBuffers(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }

  const out = {};
  for (const key of ALLOWED_LANGUAGES) {
    if (typeof input[key] === "string") {
      out[key] = sanitizeCode(input[key]);
    }
  }
  return out;
}

export { MAX_CODE_SIZE };
