import { BACKEND_URL } from "./constants";

type Session = {
  id: string;
  code: string;
  language: string;
  buffers?: Record<string, string>;
};

export async function createSession(sessionId?: string) {
  const response = await fetch(`${BACKEND_URL}/api/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sessionId ? { sessionId } : {}),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Failed to create session");
  }

  return (await response.json()) as Session;
}

export async function getSession(id: string) {
  const response = await fetch(`${BACKEND_URL}/api/session/${id}`, {
    cache: "no-store"
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Failed to fetch session");
  }

  return (await response.json()) as Session;
}
