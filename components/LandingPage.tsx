"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const FEATURES = [
  {
    title: "Realtime Sync",
    description: "Instant collaborative editing with low-latency room broadcasts."
  },
  {
    title: "Multi Language",
    description: "Code in JavaScript, Python, C++, Node.js, HTML, CSS, React, and Next.js."
  },
  {
    title: "Run In One Click",
    description: "Execute supported languages with Judge0 and see clean console output."
  },
  {
    title: "Auto Save",
    description: "Session code is persisted automatically so progress is not lost."
  },
  {
    title: "Shareable Rooms",
    description: "Each room has a unique URL. Share once and everyone joins the same editor."
  },
  {
    title: "Reconnect Friendly",
    description: "Socket reconnect logic helps users continue quickly after network drops."
  }
];

const USE_CASES = [
  {
    title: "Technical Interviews",
    description: "Run live coding rounds with a shared editor and instant output."
  },
  {
    title: "Pair Programming",
    description: "Debug together in real-time without passing files back and forth."
  },
  {
    title: "Teaching And Demos",
    description: "Explain syntax and algorithms while students follow live updates."
  }
];

function generateSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 10);
  }

  return Math.random().toString(36).slice(2, 12);
}

export default function LandingPage() {
  const router = useRouter();
  const [previewId, setPreviewId] = useState("");

  useEffect(() => {
    setPreviewId(generateSessionId());
  }, []);

  const startSession = () => {
    router.push(`/code/${generateSessionId()}`);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-140px] top-[-120px] h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute bottom-[-150px] right-[-140px] h-[420px] w-[420px] rounded-full bg-fuchsia-600/20 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-10">
        <header className="mb-16 flex items-center justify-between">
          <p className="text-xl font-semibold tracking-wide text-cyan-300">CodeShare Studio</p>
          <button
            type="button"
            onClick={startSession}
            className="rounded-md border border-cyan-400/50 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-500/20"
          >
            New Session
          </button>
        </header>

        <section className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="mb-3 inline-block rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
              Realtime Collaborative Coding Platform
            </p>
            <h1 className="text-4xl font-bold leading-tight text-white md:text-6xl">
              Build, debug, and run code together in one shared workspace.
            </h1>
            <p className="mt-5 max-w-2xl text-base text-slate-300 md:text-lg">
              CodeShare Studio is built for modern teams. Start a room instantly, invite with one
              URL, and watch every keystroke sync in real-time with execution-ready workflows.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={startSession}
                className="rounded-md bg-fuchsia-600 px-5 py-3 text-sm font-semibold text-white hover:bg-fuchsia-500"
              >
                Start Coding Now
              </button>
              <button
                type="button"
                onClick={() => router.push(`/code/${previewId || generateSessionId()}`)}
                className="rounded-md border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-medium text-slate-200 hover:bg-slate-800"
              >
                Open Sample Room
              </button>
            </div>

            <div className="mt-6 text-sm text-slate-400">
              Example share link:{" "}
              <span className="text-slate-200">/code/{previewId || "..."}</span>
            </div>

            <div className="mt-7 grid max-w-2xl grid-cols-3 gap-3 text-xs text-slate-300">
              <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                <p className="text-lg font-semibold text-white">8+</p>
                <p>Language modes</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                <p className="text-lg font-semibold text-white">Live</p>
                <p>Socket sync</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                <p className="text-lg font-semibold text-white">1 Click</p>
                <p>Code execution</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-cyan-900/20">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.12em] text-cyan-300">
              Product Snapshot
            </p>
            <div className="space-y-3 text-sm text-slate-200">
              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                Room-based collaboration with shareable URLs.
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                Monaco editor experience with language switching icons.
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                Backend persistence for session restore and continuity.
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                Execution safeguards: payload limits and runtime limits.
              </div>
            </div>
          </div>
        </section>

        <section className="mt-16">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-cyan-300">
                Core Features
              </p>
              <h2 className="mt-1 text-2xl font-bold text-white">Everything needed for live coding</h2>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <article
                key={feature.title}
                className="rounded-xl border border-slate-800 bg-slate-900/55 p-5"
              >
                <h3 className="text-base font-semibold text-slate-100">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-14 grid gap-5 md:grid-cols-3">
          {USE_CASES.map((item) => (
            <article key={item.title} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <p className="mb-2 text-sm font-semibold text-slate-100">{item.title}</p>
              <p className="text-sm text-slate-400">{item.description}</p>
            </article>
          ))}
        </section>

        <section className="mt-14 rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 to-slate-900/70 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-cyan-300">
            How It Works
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs font-semibold text-cyan-300">STEP 1</p>
              <p className="mt-2 text-sm font-medium text-slate-100">Create room</p>
              <p className="mt-1 text-xs text-slate-400">Generate a unique session route.</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs font-semibold text-cyan-300">STEP 2</p>
              <p className="mt-2 text-sm font-medium text-slate-100">Invite team</p>
              <p className="mt-1 text-xs text-slate-400">Share URL and join together instantly.</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs font-semibold text-cyan-300">STEP 3</p>
              <p className="mt-2 text-sm font-medium text-slate-100">Code live</p>
              <p className="mt-1 text-xs text-slate-400">Every keystroke syncs in real-time.</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs font-semibold text-cyan-300">STEP 4</p>
              <p className="mt-2 text-sm font-medium text-slate-100">Run and review</p>
              <p className="mt-1 text-xs text-slate-400">Execute code and inspect output together.</p>
            </div>
          </div>
        </section>

        <section className="mt-14 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-7 text-center">
          <h3 className="text-2xl font-bold text-white">Ready to collaborate with your team?</h3>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-cyan-100/90">
            Start a session in seconds and share one link for coding interviews, mentoring, pair
            programming, and fast bug fixes.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={startSession}
              className="rounded-md bg-fuchsia-600 px-5 py-3 text-sm font-semibold text-white hover:bg-fuchsia-500"
            >
              Launch New Session
            </button>
            <button
              type="button"
              onClick={() => router.push(`/code/${previewId || generateSessionId()}`)}
              className="rounded-md border border-cyan-300/40 bg-transparent px-5 py-3 text-sm font-medium text-cyan-100 hover:bg-cyan-300/10"
            >
              Open Demo Session
            </button>
          </div>
        </section>

        <footer className="mt-10 pb-3 text-center text-xs text-slate-500">
          Built with Next.js, Monaco, Socket.IO, and Judge0
        </footer>
      </div>
    </main>
  );
}
