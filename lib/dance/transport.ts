import { Room } from "./room";
import type { ClientMessage, ServerMessage } from "./types";

export type Transport = {
  kind: "online" | "solo";
  send(message: ClientMessage): void;
  onMessage(listener: (message: ServerMessage) => void): () => void;
  /** Fires when the connection drops unexpectedly (not after close()). */
  onClose(listener: () => void): () => void;
  close(): void;
};

export const DEFAULT_DANCE_PORT = 3001;

/** ws://<same host>:3001 unless NEXT_PUBLIC_DANCE_SERVER_URL is set. */
export function defaultServerUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_DANCE_SERVER_URL;
  if (fromEnv) return fromEnv;
  if (typeof window === "undefined")
    return `ws://localhost:${DEFAULT_DANCE_PORT}`;
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.hostname}:${DEFAULT_DANCE_PORT}`;
}

export function connectOnline(
  url: string,
  timeoutMs = 6000
): Promise<Transport> {
  return new Promise((resolve, reject) => {
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch (error) {
      reject(error);
      return;
    }
    const messageListeners = new Set<(m: ServerMessage) => void>();
    const closeListeners = new Set<() => void>();
    let opened = false;

    const timer = setTimeout(() => {
      if (opened) return;
      ws.close();
      reject(new Error("timeout"));
    }, timeoutMs);

    const transport: Transport = {
      kind: "online",
      send(message) {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
      },
      onMessage(listener) {
        messageListeners.add(listener);
        return () => messageListeners.delete(listener);
      },
      onClose(listener) {
        closeListeners.add(listener);
        return () => closeListeners.delete(listener);
      },
      close() {
        closeListeners.clear();
        messageListeners.clear();
        ws.close();
      },
    };

    ws.onopen = () => {
      opened = true;
      clearTimeout(timer);
      resolve(transport);
    };
    ws.onerror = () => {
      if (opened) return;
      clearTimeout(timer);
      reject(new Error("connect failed"));
    };
    ws.onclose = () => {
      if (opened) closeListeners.forEach((l) => l());
    };
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(String(event.data)) as ServerMessage;
        messageListeners.forEach((l) => l(message));
      } catch {
        // ignore malformed frames
      }
    };
  });
}

/**
 * Practice mode: runs the exact same Room logic inside the browser, with bots,
 * so the game can be tried without starting the multiplayer server.
 */
export function createSoloTransport(botCount = 3): Transport {
  const me = "you";
  const messageListeners = new Set<(m: ServerMessage) => void>();
  let closed = false;

  const deliver = (message: ServerMessage) =>
    setTimeout(() => {
      if (!closed) messageListeners.forEach((l) => l(message));
    }, 0);

  const room = new Room("SOLO", (to, message) => {
    if (to === me) deliver(message);
  });

  return {
    kind: "solo",
    send(message) {
      if (closed) return;
      switch (message.type) {
        case "ping":
          deliver({ type: "pong", t: message.t, server: Date.now() });
          return;
        case "create":
        case "join": {
          const error = room.join(me, message.name, message.avatar);
          if (error) {
            deliver({ type: "error", message: error });
            return;
          }
          for (let i = 0; i < botCount; i++)
            room.handle(me, { type: "add-bot" });
          return;
        }
        case "leave":
          room.dispose();
          return;
        default:
          room.handle(me, message);
      }
    },
    onMessage(listener) {
      messageListeners.add(listener);
      return () => messageListeners.delete(listener);
    },
    onClose() {
      return () => undefined;
    },
    close() {
      closed = true;
      messageListeners.clear();
      room.dispose();
    },
  };
}
