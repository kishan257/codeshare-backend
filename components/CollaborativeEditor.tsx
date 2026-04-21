"use client";

import Editor from "@monaco-editor/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { io, Socket } from "socket.io-client";
import { BACKEND_URL, DEFAULT_CODE, LANGUAGE_OPTIONS } from "../lib/constants";

type Props = {
  sessionId: string;
  initialCode: string;
  initialLanguage: string;
  initialBuffers?: Record<string, string>;
};

function buildDefaultBuffers(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const opt of LANGUAGE_OPTIONS) {
    out[opt.value] = DEFAULT_CODE[opt.value] || "";
  }
  return out;
}

function mergeInitialBuffers(
  initialBuffers: Record<string, string> | undefined,
  initialLanguage: string,
  initialCode: string
) {
  const base = buildDefaultBuffers();
  if (initialBuffers) {
    for (const opt of LANGUAGE_OPTIONS) {
      const v = initialBuffers[opt.value];
      if (typeof v === "string") {
        base[opt.value] = v;
      }
    }
  }
  const lang = initialLanguage || "javascript";
  base[lang] = initialCode || base[lang] || DEFAULT_CODE[lang] || DEFAULT_CODE.javascript;
  return base;
}

type ExecutionResponse = {
  output: string;
  status: string;
  runtime?: string | null;
  previewHtml?: string | null;
};

/** Split ratio is % of workspace width minus the fixed divider (px). */
const RESIZE_DIVIDER_PX = 8;
const MIN_EDITOR_WIDTH = 10;
const MIN_OUTPUT_WIDTH = 14;
const MAX_EDITOR_WIDTH = 100 - MIN_OUTPUT_WIDTH;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

const FILE_EXTENSION_MAP: Record<string, string> = {
  javascript: "js",
  python: "py",
  cpp: "cpp",
  nodejs: "js",
  html: "html",
  css: "css",
  reactjs: "jsx",
  nextjs: "tsx"
};

function downloadCodeFile({
  code,
  language,
  sessionId
}: {
  code: string;
  language: string;
  sessionId: string;
}) {
  const extension = FILE_EXTENSION_MAP[language] || "txt";
  const fileName = `codeshare-${sessionId}.${extension}`;
  const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function CollaborativeEditor({
  sessionId,
  initialCode,
  initialLanguage,
  initialBuffers
}: Props) {
  const [buffers, setBuffers] = useState<Record<string, string>>(() =>
    mergeInitialBuffers(initialBuffers, initialLanguage || "javascript", initialCode)
  );
  const [language, setLanguage] = useState(initialLanguage || "javascript");
  const [output, setOutput] = useState("Output will appear here.");
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [editorWidthPercent, setEditorWidthPercent] = useState(56);
  const [connectionState, setConnectionState] = useState<"connected" | "disconnected">(
    "disconnected"
  );
  const [failedLogos, setFailedLogos] = useState<Record<string, boolean>>({});

  const workspaceRef = useRef<HTMLElement | null>(null);
  const resizeBoundsRef = useRef<{ left: number; width: number } | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const pendingClientXRef = useRef<number | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const emitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buffersRef = useRef(buffers);
  const languageRef = useRef(language);

  const code =
    buffers[language] ?? DEFAULT_CODE[language] ?? DEFAULT_CODE.javascript ?? "";

  const monacoLanguage = useMemo(() => {
    return LANGUAGE_OPTIONS.find((option) => option.value === language)?.monaco || "javascript";
  }, [language]);
  const activeLanguage = LANGUAGE_OPTIONS.find((option) => option.value === language);
  const isRunnableLanguage = activeLanguage?.runnable ?? false;

  const emitCodeChange = useCallback(
    (nextCode: string, nextLanguage: string) => {
      if (emitTimerRef.current) {
        clearTimeout(emitTimerRef.current);
      }

      // Debounce typing events to reduce network chatter and latency spikes.
      emitTimerRef.current = setTimeout(() => {
        socketRef.current?.emit("code-change", {
          sessionId,
          code: nextCode,
          language: nextLanguage
        });
      }, 120);
    },
    [sessionId]
  );

  const persistSession = useCallback(
    async (buf: Record<string, string>, activeLanguage: string) => {
      const safeLang = activeLanguage || "javascript";
      const payloadCode = buf[safeLang] ?? "";
      await fetch(`${BACKEND_URL}/api/session/${sessionId}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: payloadCode,
          language: safeLang,
          buffers: buf
        })
      });
    },
    [sessionId]
  );

  const scheduleAutoSave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      void persistSession(buffersRef.current, languageRef.current);
    }, 800);
  }, [persistSession]);

  const flushSaveNow = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    return persistSession(buffersRef.current, languageRef.current);
  }, [persistSession]);

  buffersRef.current = buffers;
  languageRef.current = language;

  useEffect(() => {
    const socket = io(BACKEND_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      timeout: 5000
    });
    socketRef.current = socket;

    const joinRoom = () => {
      socket.emit("join-room", { sessionId });
    };

    socket.on("connect", () => {
      setConnectionState("connected");
      joinRoom();
    });

    socket.on("disconnect", () => {
      setConnectionState("disconnected");
    });

    socket.on(
      "sync-code",
      (payload: { code: string; language: string; buffers?: Record<string, string> }) => {
        if (payload.buffers && typeof payload.buffers === "object") {
          const next = buildDefaultBuffers();
          for (const opt of LANGUAGE_OPTIONS) {
            const v = payload.buffers[opt.value];
            if (typeof v === "string") {
              next[opt.value] = v;
            }
          }
          setBuffers(next);
          setLanguage(payload.language || "javascript");
          return;
        }

        setBuffers((prev) => ({
          ...prev,
          [payload.language || "javascript"]: payload.code || ""
        }));
        setLanguage(payload.language || "javascript");
      }
    );

    socket.on("code-change", (payload: { code: string; language: string }) => {
      const lang = payload.language || "javascript";
      setBuffers((prev) => ({ ...prev, [lang]: payload.code || "" }));
    });

    socket.io.on("reconnect", () => {
      joinRoom();
    });

    return () => {
      if (emitTimerRef.current) clearTimeout(emitTimerRef.current);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      socket.disconnect();
    };
  }, [sessionId]);

  useEffect(() => {
    const updateResize = () => {
      animationFrameRef.current = null;
      const bounds = resizeBoundsRef.current;
      const clientX = pendingClientXRef.current;

      if (!bounds || clientX === null) {
        return;
      }

      const usable = Math.max(bounds.width - RESIZE_DIVIDER_PX, 1);
      const pos = clamp(clientX - bounds.left, 0, usable);
      const nextWidth = (pos / usable) * 100;
      setEditorWidthPercent(clamp(nextWidth, MIN_EDITOR_WIDTH, MAX_EDITOR_WIDTH));
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!isResizing) {
        return;
      }

      pendingClientXRef.current = event.clientX;
      if (animationFrameRef.current === null) {
        animationFrameRef.current = window.requestAnimationFrame(updateResize);
      }
    };

    const stopResizing = () => {
      if (!isResizing) {
        return;
      }

      setIsResizing(false);
      resizeBoundsRef.current = null;
      pendingClientXRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResizing);

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResizing);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing]);

  const handleCodeChange = (value: string | undefined) => {
    const nextCode = value || "";

    setBuffers((prev) => ({ ...prev, [language]: nextCode }));
    emitCodeChange(nextCode, language);
    scheduleAutoSave();
  };

  const handleLanguageChange = (nextLanguage: string) => {
    const safeLanguage = nextLanguage || "javascript";
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    void persistSession(buffers, language);
    const nextCode =
      buffers[safeLanguage] ??
      DEFAULT_CODE[safeLanguage] ??
      DEFAULT_CODE.javascript ??
      "";
    setLanguage(safeLanguage);
    emitCodeChange(nextCode, safeLanguage);
    scheduleAutoSave();
  };

  const runCode = async () => {
    if (!isRunnableLanguage) {
      setOutput(
        `Execution is not available for ${activeLanguage?.label || "this language"} in this version.\nUse one of the currently supported runnable languages.`
      );
      return;
    }

    try {
      setIsRunning(true);
      setOutput("Running...");
      setPreviewHtml(null);

      const response = await fetch(`${BACKEND_URL}/api/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          language
        })
      });

      const data = (await response.json()) as ExecutionResponse;
      const runtime = data.runtime ? `\nRuntime: ${data.runtime}s` : "";
      setOutput(`${data.output}\nStatus: ${data.status}${runtime}`.trim());
      setPreviewHtml(data.previewHtml || null);
    } catch (_error) {
      setOutput("Execution failed. Check backend availability and Judge0 settings.");
      setPreviewHtml(null);
    } finally {
      setIsRunning(false);
    }
  };

  const copyShareLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
  };

  const clearOutput = () => {
    setOutput("");
    setPreviewHtml(null);
  };

  const startResizing = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!workspaceRef.current) {
      return;
    }

    const bounds = workspaceRef.current.getBoundingClientRect();
    resizeBoundsRef.current = { left: bounds.left, width: bounds.width };
    pendingClientXRef.current = event.clientX;
    setIsResizing(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  return (
    <main className="h-screen bg-[#111315] p-1 text-slate-100">
      <section className="flex h-full min-h-0 gap-1">
        <aside className="flex flex-col items-center gap-1 border border-slate-800 bg-[#1a1d22] p-1">
          {LANGUAGE_OPTIONS.map((option) => {
            const isActive = option.value === language;
            const showFallback = failedLogos[option.value];

            return (
              <button
                key={option.value}
                type="button"
                title={option.label}
                onClick={() => handleLanguageChange(option.value)}
                className={`flex h-8 w-8 items-center justify-center rounded-sm border text-[10px] font-bold transition ${
                  isActive
                    ? "border-cyan-400 bg-[#2a2f36] shadow-[0_0_0_1px_rgba(34,211,238,0.25)]"
                    : "border-slate-700 bg-[#22262c] text-slate-400 hover:border-slate-500"
                }`}
              >
                {showFallback ? (
                  <span className="text-[10px] text-slate-200">{option.icon}</span>
                ) : (
                  <img
                    src={option.logo}
                    alt={option.label}
                    className="h-4 w-4"
                    loading="lazy"
                    onError={() => {
                      setFailedLogos((prev) => ({ ...prev, [option.value]: true }));
                    }}
                  />
                )}
              </button>
            );
          })}
        </aside>

        <section
          ref={workspaceRef}
          className="grid min-h-0 min-w-0 flex-1 overflow-hidden"
          style={{
            gridTemplateColumns: `minmax(0, ${editorWidthPercent}%) ${RESIZE_DIVIDER_PX}px minmax(0, 1fr)`
          }}
        >
          <section
            className="grid min-h-0 min-w-0 grid-rows-[38px_1fr] overflow-hidden border border-slate-800 bg-[#191c21]"
          >
            <header className="flex min-w-0 items-center justify-between gap-2 border-b border-slate-800 bg-[#22252b] px-3">
              <div className="flex min-w-0 shrink items-center gap-2 text-xs">
                <span className="font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Editor
                </span>
                <span className="rounded bg-[#2f3540] px-2 py-0.5 text-[11px] text-slate-200">
                  index.{FILE_EXTENSION_MAP[activeLanguage?.value || "javascript"] || "txt"}
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => downloadCodeFile({ code, language, sessionId })}
                  type="button"
                  className="rounded bg-[#2f3540] px-2 py-1 text-[11px] text-slate-200 hover:bg-[#3a4250]"
                >
                  Download
                </button>
                <button
                  onClick={copyShareLink}
                  type="button"
                  className="rounded bg-[#2f3540] px-2 py-1 text-[11px] text-slate-200 hover:bg-[#3a4250]"
                >
                  Share
                </button>
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    connectionState === "connected" ? "bg-emerald-400" : "bg-rose-400"
                  }`}
                  title={connectionState}
                />
              </div>
            </header>

            <div className="relative min-h-0 min-w-0 overflow-hidden">
              <Editor
                height="100%"
                defaultLanguage={monacoLanguage}
                language={monacoLanguage}
                value={code}
                onChange={handleCodeChange}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbersMinChars: 3,
                  scrollBeyondLastLine: false,
                  smoothScrolling: true,
                  wordWrap: "on",
                  automaticLayout: true,
                  padding: { top: 10 }
                }}
                theme="vs-dark"
              />
            </div>
          </section>

          <button
            aria-label="Resize editor and output panels"
            aria-orientation="vertical"
            className={`h-full w-full shrink-0 cursor-col-resize border-y border-slate-800 bg-slate-800 touch-none ${
              isResizing ? "bg-cyan-400" : "hover:bg-cyan-500/70 active:bg-cyan-400"
            }`}
            onPointerDown={startResizing}
            type="button"
          />

          <section className="grid min-h-0 min-w-0 grid-rows-[38px_1fr] overflow-hidden border border-slate-800 bg-white">
            <header className="flex min-w-0 items-center justify-between gap-2 border-b border-slate-700 bg-[#1f2228] px-2">
              <p className="min-w-0 truncate text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
                Output
              </p>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-1 sm:gap-2">
                <button
                  onClick={runCode}
                  disabled={isRunning || !isRunnableLanguage}
                  className="rounded bg-fuchsia-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-60"
                  type="button"
                  title={
                    isRunnableLanguage
                      ? "Run current code"
                      : "Use one of the currently supported runnable languages"
                  }
                >
                  {isRunning ? "Running..." : "Run"}
                </button>
                <button
                  onClick={clearOutput}
                  className="rounded bg-[#2f3540] px-2.5 py-1 text-[11px] text-slate-200 hover:bg-[#3a4250]"
                  type="button"
                >
                  Clear output
                </button>
              </div>
            </header>

            <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto] bg-white">
              {previewHtml ? (
                <iframe
                  title="Code preview"
                  sandbox="allow-scripts"
                  srcDoc={previewHtml}
                  className="h-full w-full border-0"
                />
              ) : <></>}
              <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap border-t border-slate-200 bg-white p-4 font-mono text-sm text-slate-900">
                {output}
              </pre>
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}
