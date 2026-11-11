// Lingo Dance multiplayer server.
//
//   bun run dance:server            (or: npx tsx server/dance-server.ts)
//
// Listens on DANCE_PORT (or PORT, default 3001) on every network interface,
// so students on the same Wi-Fi can join the teacher's computer.

import { createServer } from "node:http";
import { networkInterfaces } from "node:os";

import { WebSocket, WebSocketServer } from "ws";

import { randomId } from "../lib/dance/random";
import { RoomRegistry, type Room } from "../lib/dance/room";
import type { ClientMessage, ServerMessage } from "../lib/dance/types";

const PORT = Number(process.env.DANCE_PORT ?? process.env.PORT ?? 3001);
const HEARTBEAT_MS = 15000;

type Connection = { ws: WebSocket; room: Room | null; alive: boolean };
const connections = new Map<string, Connection>();

const registry = new RoomRegistry((playerId, message: ServerMessage) => {
  const conn = connections.get(playerId);
  if (conn && conn.ws.readyState === WebSocket.OPEN) {
    conn.ws.send(JSON.stringify(message));
  }
});

const http = createServer((req, res) => {
  res.writeHead(200, {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
  });
  res.end(
    JSON.stringify({
      ok: true,
      service: "lingo-dance",
      rooms: registry.size,
      players: connections.size,
    })
  );
});

const wss = new WebSocketServer({ server: http, maxPayload: 64 * 1024 });

function send(conn: Connection, message: ServerMessage) {
  if (conn.ws.readyState === WebSocket.OPEN)
    conn.ws.send(JSON.stringify(message));
}

function leaveRoom(playerId: string, conn: Connection) {
  if (!conn.room) return;
  registry.leave(conn.room, playerId);
  conn.room = null;
}

wss.on("connection", (ws) => {
  const playerId = randomId(12);
  const conn: Connection = { ws, room: null, alive: true };
  connections.set(playerId, conn);

  ws.on("pong", () => {
    conn.alive = true;
  });

  ws.on("message", (data) => {
    let message: ClientMessage;
    try {
      message = JSON.parse(String(data)) as ClientMessage;
    } catch {
      return;
    }
    if (
      !message ||
      typeof message !== "object" ||
      typeof message.type !== "string"
    ) {
      return;
    }

    switch (message.type) {
      case "ping":
        send(conn, {
          type: "pong",
          t: Number(message.t) || 0,
          server: Date.now(),
        });
        return;
      case "create": {
        leaveRoom(playerId, conn);
        const room = registry.create();
        conn.room = room;
        room.join(playerId, message.name, message.avatar);
        console.log(`[room ${room.code}] created`);
        return;
      }
      case "join": {
        const room =
          typeof message.code === "string"
            ? registry.get(message.code)
            : undefined;
        if (!room) {
          send(conn, {
            type: "error",
            message: "Không tìm thấy phòng với mã này.",
          });
          return;
        }
        if (conn.room && conn.room !== room) leaveRoom(playerId, conn);
        const error = room.join(playerId, message.name, message.avatar);
        if (error) {
          send(conn, { type: "error", message: error });
          return;
        }
        conn.room = room;
        return;
      }
      case "leave":
        leaveRoom(playerId, conn);
        return;
      default:
        if (conn.room?.has(playerId)) conn.room.handle(playerId, message);
        else conn.room = null;
    }
  });

  ws.on("close", () => {
    leaveRoom(playerId, conn);
    connections.delete(playerId);
  });
});

const heartbeat = setInterval(() => {
  for (const [playerId, conn] of connections) {
    if (!conn.alive) {
      leaveRoom(playerId, conn);
      connections.delete(playerId);
      conn.ws.terminate();
      continue;
    }
    conn.alive = false;
    conn.ws.ping();
  }
}, HEARTBEAT_MS);

wss.on("close", () => clearInterval(heartbeat));

http.listen(PORT, "0.0.0.0", () => {
  console.log(`🪩 Lingo Dance server: ws://localhost:${PORT}`);
  for (const list of Object.values(networkInterfaces())) {
    for (const net of list ?? []) {
      if (net.family === "IPv4" && !net.internal) {
        console.log(
          `   LAN (cho học sinh cùng Wi-Fi): ws://${net.address}:${PORT}`
        );
      }
    }
  }
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    wss.close();
    http.close();
    process.exit(0);
  });
}
