import axios from "axios";
import vm from "node:vm";
import { transform } from "sucrase";
import { JUDGE0_LANGUAGE_IDS } from "../utils/languageMap.js";
import { sanitizeCode, sanitizeLanguage } from "../utils/sanitize.js";

const RAPIDAPI_DEFAULT_URL = "https://judge0-ce.p.rapidapi.com/submissions";
const PUBLIC_DEFAULT_URL = "https://ce.judge0.com/submissions";
const JUDGE0_BASE_URL = process.env.JUDGE0_API_URL || RAPIDAPI_DEFAULT_URL;

const REQUEST_TIMEOUT_MS = Number(process.env.JUDGE0_REQUEST_TIMEOUT_MS || 7000);

function wrapPreviewDocument(bodyHtml, css = "") {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body {
        margin: 0;
        padding: 16px;
        font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      }
      ${css}
    </style>
  </head>
  <body>
    ${bodyHtml}
  </body>
</html>`;
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeAttributeName(key) {
  if (key === "className") {
    return "class";
  }
  if (key === "htmlFor") {
    return "for";
  }
  return key;
}

function toKebabCase(value) {
  return value.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

function renderElementToHtml(element) {
  if (element === null || element === undefined || typeof element === "boolean") {
    return "";
  }

  if (typeof element === "string" || typeof element === "number") {
    return escapeHtml(String(element));
  }

  if (Array.isArray(element)) {
    return element.map((item) => renderElementToHtml(item)).join("");
  }

  if (typeof element?.type === "function") {
    const child = element.type({ ...(element.props || {}), children: element.children || [] });
    return renderElementToHtml(child);
  }

  if (typeof element?.type === "string") {
    const props = element.props || {};
    const attr = Object.entries(props)
      .filter(
        ([key]) =>
          key !== "children" &&
          key !== "dangerouslySetInnerHTML" &&
          key !== "key" &&
          key !== "ref" &&
          !key.startsWith("__")
      )
      .map(([key, value]) => {
        if (value === false || value === null || value === undefined) {
          return "";
        }

        const attrName = normalizeAttributeName(key);

        if (value === true) {
          return ` ${attrName}`;
        }

        if (key === "style" && typeof value === "object") {
          const inlineStyle = Object.entries(value)
            .map(([styleKey, styleValue]) => `${toKebabCase(styleKey)}:${String(styleValue)}`)
            .join(";");
          return ` style="${escapeHtml(inlineStyle)}"`;
        }

        return ` ${attrName}="${escapeHtml(String(value))}"`;
      })
      .join("");

    if (props.dangerouslySetInnerHTML && props.dangerouslySetInnerHTML.__html) {
      return `<${element.type}${attr}>${props.dangerouslySetInnerHTML.__html}</${element.type}>`;
    }

    const children = element.children || props.children || [];
    const normalizedChildren = Array.isArray(children) ? children : [children];
    const innerHtml = normalizedChildren.map((item) => renderElementToHtml(item)).join("");
    return `<${element.type}${attr}>${innerHtml}</${element.type}>`;
  }

  return "";
}

function executeJsxComponent(sourceCode) {
  const codeWithoutImports = sourceCode.replace(/^\s*import[\s\S]*?from\s+["'][^"']+["'];?\s*$/gm, "");
  const codeWithoutBareImports = codeWithoutImports.replace(
    /^\s*import\s+["'][^"']+["'];?\s*$/gm,
    ""
  );

  let executableCode = codeWithoutBareImports;
  let exportName = "__defaultComponent";

  if (/export\s+default\s+function\s+([A-Za-z_$][\w$]*)/m.test(executableCode)) {
    executableCode = executableCode.replace(
      /export\s+default\s+function\s+([A-Za-z_$][\w$]*)/m,
      "function $1"
    );
    const match = executableCode.match(/function\s+([A-Za-z_$][\w$]*)\s*\(/);
    exportName = match?.[1] || exportName;
  } else if (/export\s+default\s+function\s*\(/m.test(executableCode)) {
    executableCode = executableCode.replace(
      /export\s+default\s+function\s*\(/m,
      "const __defaultComponent = function ("
    );
  } else if (/export\s+default\s+/m.test(executableCode)) {
    executableCode = executableCode.replace(/export\s+default\s+/m, "const __defaultComponent = ");
  }

  if (!exportName) {
    return {
      output:
        "No default component export found. Use `export default function Component() { ... }`.",
      status: "error"
    };
  }

  const transformed = transform(executableCode, { transforms: ["jsx"] }).code;
  const logs = [];
  const fakeReact = {
    createElement(type, props, ...children) {
      return { type, props: props || {}, children };
    }
  };

  const sandbox = {
    React: fakeReact,
    console: {
      log: (...args) => logs.push(args.map((arg) => String(arg)).join(" "))
    },
    __component: null
  };

  try {
    vm.runInNewContext(`${transformed}\n__component = ${exportName};`, sandbox, {
      timeout: 1000
    });

    if (typeof sandbox.__component !== "function") {
      return { output: "Default export is not a component function.", status: "error" };
    }

    const tree = sandbox.__component({});
    const html = renderElementToHtml(tree);
    const output = [
      "Component rendered successfully.",
      logs.length ? `\nConsole:\n${logs.join("\n")}` : ""
    ].join("");

    return {
      output,
      status: "Completed",
      previewHtml: wrapPreviewDocument(
        html || "<p style='color:#64748b'>Rendered HTML is empty.</p>"
      )
    };
  } catch (error) {
    return {
      output: `Component execution failed: ${error.message}`,
      status: "error"
    };
  }
}

function runFrontendLanguage(sourceCode, language) {
  if (language === "html") {
    const hasDocumentTag = /<\s*html[\s>]/i.test(sourceCode);
    return {
      output: "HTML rendered successfully.",
      status: "Completed",
      previewHtml: hasDocumentTag ? sourceCode : wrapPreviewDocument(sourceCode)
    };
  }

  if (language === "css") {
    const previewBody = `
      <div class="preview-card">
        <h1>CSS Preview</h1>
        <p>Edit CSS to style this preview content.</p>
        <button type="button">Primary button</button>
      </div>
    `;
    return {
      output: "CSS processed successfully.",
      status: "Completed",
      previewHtml: wrapPreviewDocument(previewBody, sourceCode)
    };
  }

  if (language === "reactjs" || language === "nextjs") {
    return executeJsxComponent(sourceCode);
  }

  return null;
}

export async function runCode({ code, language }) {
  const safeLanguage = sanitizeLanguage(language);
  const sourceCode = sanitizeCode(code);
  const languageId = JUDGE0_LANGUAGE_IDS[safeLanguage];

  if (!sourceCode) {
    return { output: "No code to run.", status: "error" };
  }

  const frontendLanguageResult = runFrontendLanguage(sourceCode, safeLanguage);
  if (frontendLanguageResult) {
    return frontendLanguageResult;
  }

  if (!languageId) {
    return { output: "Unsupported language.", status: "error" };
  }

  const payload = {
    source_code: sourceCode,
    language_id: languageId,
    stdin: "",
    cpu_time_limit: 2,
    wall_time_limit: 5,
    memory_limit: 128000
  };

  async function executeAgainstEndpoint(baseUrl, headers) {
    const createResponse = await axios.post(`${baseUrl}?base64_encoded=false`, payload, {
      headers,
      timeout: REQUEST_TIMEOUT_MS
    });

    const token = createResponse.data?.token;
    if (!token) {
      return { output: "Execution token not received from Judge0.", status: "error" };
    }

    // Polling keeps latency low while still waiting for a completed result.
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const resultResponse = await axios.get(
        `${baseUrl}/${token}?base64_encoded=false&fields=status,stdout,stderr,compile_output,message,time`,
        { headers, timeout: REQUEST_TIMEOUT_MS }
      );

      const result = resultResponse.data;
      const statusId = result?.status?.id;

      if (statusId && statusId <= 2) {
        await new Promise((resolve) => setTimeout(resolve, 150));
        continue;
      }

      const output =
        result?.stdout || result?.stderr || result?.compile_output || result?.message || "No output.";

      return {
        output,
        status: result?.status?.description || "Completed",
        runtime: result?.time || null
      };
    }

    return {
      output: "Execution timed out while waiting for Judge0 result.",
      status: "timeout"
    };
  }

  const apiKey = process.env.JUDGE0_API_KEY;

  if (apiKey) {
    const rapidHeaders = {
      "Content-Type": "application/json",
      "X-RapidAPI-Key": apiKey
    };

    if (process.env.JUDGE0_API_HOST) {
      rapidHeaders["X-RapidAPI-Host"] = process.env.JUDGE0_API_HOST;
    }

    try {
      return await executeAgainstEndpoint(JUDGE0_BASE_URL, rapidHeaders);
    } catch (_error) {
      // Fall through to public CE endpoint when RapidAPI credentials/config fail.
    }
  }

  try {
    return await executeAgainstEndpoint(PUBLIC_DEFAULT_URL, {
      "Content-Type": "application/json"
    });
  } catch (_error) {
    // Fallback can still fail due to provider outages or network restrictions.
  }

  return {
    output:
      "Code execution is temporarily unavailable. Configure JUDGE0_API_KEY for RapidAPI or ensure access to https://ce.judge0.com.",
    status: "error"
  };
}
