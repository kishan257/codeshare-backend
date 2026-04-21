import "dotenv/config";
import http from "node:http";
import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import { Server } from "socket.io";
import { createSession, getSession, saveSession } from "./services/sessionStore.js";
import { runCode } from "./services/judge0.js";
import { DEFAULT_TEMPLATES } from "./utils/languageMap.js";
import { sanitizeCode, sanitizeLanguage } from "./utils/sanitize.js";

const app = express();
const server = http.createServer(app);

const PORT = Number(process.env.PORT || 4000);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "*";
const SAVE_DEBOUNCE_MS = Number(process.env.SAVE_DEBOUNCE_MS || 500);

app.use(
  cors({
    origin: CLIENT_ORIGIN === "*" ? true : CLIENT_ORIGIN,
    credentials: true
  })
);
app.use(express.json({ limit: "1mb" }));

const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGIN === "*" ? true : CLIENT_ORIGIN,
    methods: ["GET", "POST"]
  },
  transports: ["websocket", "polling"]
});

const roomUsers = new Map();
const pendingSave = new Map();

function roomSize(sessionId) {
  return roomUsers.get(sessionId)?.size || 0;
}

function scheduleSave(sessionId, payload) {
  const existingTimer = pendingSave.get(sessionId);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const timer = setTimeout(async () => {
    pendingSave.delete(sessionId);
    await saveSession(payload);
  }, SAVE_DEBOUNCE_MS);

  pendingSave.set(sessionId, timer);
}

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/session", async (req, res) => {
  try {
    const session = await createSession({
      sessionId: req.body?.sessionId,
      language: req.body?.language,
      code: req.body?.code
    });
    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ message: "Failed to create session", error: error.message });
  }
});

app.get("/api/session/:id", async (req, res) => {
  try {
    const session = await getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }
    return res.json(session);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch session", error: error.message });
  }
});

app.post("/api/session/:id/save", async (req, res) => {
  try {
    const session = await saveSession({
      sessionId: req.params.id,
      code: req.body?.code,
      language: req.body?.language,
      buffers: req.body?.buffers
    });
    res.json(session);
  } catch (error) {
    res.status(500).json({ message: "Failed to save session", error: error.message });
  }
});

app.post("/api/execute", async (req, res) => {
  try {
    const language = sanitizeLanguage(req.body?.language);
    const code = sanitizeCode(req.body?.code || DEFAULT_TEMPLATES[language]);
    const result = await runCode({ code, language });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Code execution failed", error: error.message });
  }
});

io.on("connection", (socket) => {
  socket.on("join-room", async ({ sessionId }) => {
    if (!sessionId) return;

    socket.join(sessionId);

    if (!roomUsers.has(sessionId)) {
      roomUsers.set(sessionId, new Set());
    }

    roomUsers.get(sessionId).add(socket.id);

    let session = await getSession(sessionId);
    if (!session) {
      session = await createSession({ sessionId });
    }

    socket.emit("sync-code", {
      code: session.code,
      language: session.language,
      buffers: session.buffers
    });

    io.to(sessionId).emit("users-count", { count: roomSize(sessionId) });
  });

  socket.on("code-change", async ({ sessionId, code, language }) => {
    if (!sessionId) return;

    const safeLanguage = sanitizeLanguage(language);
    const safeCode = sanitizeCode(code);
    socket.to(sessionId).emit("code-change", { code: safeCode, language: safeLanguage });

    scheduleSave(sessionId, {
      sessionId,
      code: safeCode,
      language: safeLanguage
    });
  });

  socket.on("sync-code", ({ sessionId, code, language }) => {
    if (!sessionId) return;
    socket.to(sessionId).emit("sync-code", { code, language });
  });

  socket.on("disconnecting", () => {
    socket.rooms.forEach((room) => {
      if (room === socket.id || !roomUsers.has(room)) return;
      const users = roomUsers.get(room);
      users.delete(socket.id);

      if (users.size === 0) {
        roomUsers.delete(room);
      }

      io.to(room).emit("users-count", { count: roomSize(room) });
    });
  });
});

async function bootstrap() {
  const mongoUri = process.env.MONGODB_URI;
  if (mongoUri) {
    try {
      await mongoose.connect(mongoUri);
      // eslint-disable-next-line no-console
      console.log("Connected to MongoDB");
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Mongo connection failed. Falling back to in-memory store.", error.message);
    }
  }

  server.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend listening on http://localhost:${PORT}`);
  });
}

bootstrap();
