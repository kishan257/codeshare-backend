import mongoose from "mongoose";
import { nanoid } from "nanoid";
import { Session } from "../models/Session.js";
import { DEFAULT_TEMPLATES } from "../utils/languageMap.js";
import { sanitizeBuffers, sanitizeCode, sanitizeLanguage } from "../utils/sanitize.js";

const memorySessions = new Map();

const hasMongo = () => mongoose.connection.readyState === 1;

function defaultBuffers() {
  return { ...DEFAULT_TEMPLATES };
}

function mergeBuffersFromSession(session) {
  const base = defaultBuffers();
  const raw = session?.buffers;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    for (const key of Object.keys(DEFAULT_TEMPLATES)) {
      if (typeof raw[key] === "string") {
        base[key] = raw[key];
      }
    }
  }
  const lang = sanitizeLanguage(session?.language);
  const code = typeof session?.code === "string" ? session.code : null;
  if (code) {
    base[lang] = code;
  }
  return base;
}

function normalizeSession(session) {
  if (!session) return null;
  const language = sanitizeLanguage(session.language);
  const buffers = mergeBuffersFromSession(session);
  const code = typeof session.code === "string" ? session.code : buffers[language];
  return {
    id: session.sessionId,
    language,
    code: code || buffers[language] || DEFAULT_TEMPLATES.javascript,
    buffers
  };
}

export async function createSession({
  sessionId,
  code = DEFAULT_TEMPLATES.javascript,
  language = "javascript",
  buffers: incomingBuffers
} = {}) {
  const safeLanguage = sanitizeLanguage(language);
  const safeCode = sanitizeCode(code) || DEFAULT_TEMPLATES[safeLanguage];
  const id = sessionId || nanoid(10);
  const mergedIncoming = sanitizeBuffers(incomingBuffers || {});
  const buffers = { ...defaultBuffers(), ...mergedIncoming, [safeLanguage]: safeCode };

  if (hasMongo()) {
    const existing = await Session.findOne({ sessionId: id }).lean();
    if (existing) {
      return normalizeSession(existing);
    }

    const created = await Session.create({
      sessionId: id,
      language: safeLanguage,
      code: safeCode,
      buffers
    });
    return normalizeSession(created);
  }

  if (!memorySessions.has(id)) {
    memorySessions.set(id, { sessionId: id, language: safeLanguage, code: safeCode, buffers });
  }

  return normalizeSession(memorySessions.get(id));
}

export async function getSession(sessionId) {
  if (!sessionId) return null;

  if (hasMongo()) {
    const session = await Session.findOne({ sessionId }).lean();
    return normalizeSession(session);
  }

  return normalizeSession(memorySessions.get(sessionId));
}

export async function saveSession({ sessionId, code, language, buffers: clientBuffers }) {
  if (!sessionId) return null;

  const safeLanguage = sanitizeLanguage(language);
  const safeCode = sanitizeCode(code) || DEFAULT_TEMPLATES[safeLanguage];

  let mergedBuffers = defaultBuffers();
  if (hasMongo()) {
    const existing = await Session.findOne({ sessionId }).lean();
    if (existing) {
      mergedBuffers = mergeBuffersFromSession(existing);
    }
  } else if (memorySessions.has(sessionId)) {
    mergedBuffers = mergeBuffersFromSession(memorySessions.get(sessionId));
  }

  const sanitizedClient = sanitizeBuffers(clientBuffers || {});
  mergedBuffers = { ...mergedBuffers, ...sanitizedClient, [safeLanguage]: safeCode };

  if (hasMongo()) {
    const session = await Session.findOneAndUpdate(
      { sessionId },
      { language: safeLanguage, code: safeCode, buffers: mergedBuffers },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
    return normalizeSession(session);
  }

  memorySessions.set(sessionId, {
    sessionId,
    language: safeLanguage,
    code: safeCode,
    buffers: mergedBuffers
  });

  return normalizeSession(memorySessions.get(sessionId));
}
