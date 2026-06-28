/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createHttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";

interface Player {
  id: string;
  name: string;
  color: 'blue' | 'rose';
}

interface GuessEntry {
  id: string;
  value: number;
  direction: 'up' | 'down' | 'correct';
  timestamp: number;
}

interface RoomState {
  roomId: string;
  maxNumber: number;
  player1: Player | null;
  player2: Player | null;
  player1Ws?: WebSocket;
  player2Ws?: WebSocket;
  secrets: { player1: number | null; player2: number | null };
  guesses: { player1: GuessEntry[]; player2: GuessEntry[] };
  currentTurn: 1 | 2;
  winner: 1 | 2 | null;
  status: 'waiting' | 'setup' | 'secret_selection' | 'playing' | 'game_over';
  soundEnabled: boolean;
  hapticsEnabled: boolean;
}

const rooms = new Map<string, RoomState>();

async function startServer() {
  const app = express();
  const server = createHttpServer(app);
  const wss = new WebSocketServer({ noServer: true });

  const PORT = 3000;

  // Serve static files in production, use Vite in development
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite dev middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Handle Upgrade to WebSocket
  server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  // Helper function to broadcast state to a room
  function broadcastState(roomId: string) {
    const room = rooms.get(roomId);
    if (!room) return;

    const payloadBase = {
      type: 'room_state',
      roomId: room.roomId,
      player1: room.player1,
      player2: room.player2,
      status: room.status,
      currentTurn: room.currentTurn,
      maxNumber: room.maxNumber,
      soundEnabled: room.soundEnabled,
      hapticsEnabled: room.hapticsEnabled,
      winner: room.winner,
      player1SecretSet: room.secrets.player1 !== null,
      player2SecretSet: room.secrets.player2 !== null,
      player1Guesses: room.guesses.player1,
      player2Guesses: room.guesses.player2,
    };

    // Send personalized payloads to prevent cheating (hiding the opponent's secret)
    if (room.player1Ws && room.player1Ws.readyState === WebSocket.OPEN) {
      room.player1Ws.send(JSON.stringify({
        ...payloadBase,
        yourRole: 1,
        yourSecret: room.secrets.player1,
        opponentSecretSet: room.secrets.player2 !== null,
        secretsRevealed: room.status === 'game_over' ? room.secrets : null,
      }));
    }

    if (room.player2Ws && room.player2Ws.readyState === WebSocket.OPEN) {
      room.player2Ws.send(JSON.stringify({
        ...payloadBase,
        yourRole: 2,
        yourSecret: room.secrets.player2,
        opponentSecretSet: room.secrets.player1 !== null,
        secretsRevealed: room.status === 'game_over' ? room.secrets : null,
      }));
    }
  }

  // Handle WebSocket Connection
  wss.on('connection', (ws: WebSocket) => {
    let currentRoomId: string | null = null;
    let currentPlayerId: string | null = null;

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message);
        
        switch (data.type) {
          case 'join': {
            const { roomId, playerId, playerName } = data;
            if (!roomId || !playerId || !playerName) return;

            currentRoomId = roomId;
            currentPlayerId = playerId;

            let room = rooms.get(roomId);
            if (!room) {
              // Create room if it doesn't exist
              room = {
                roomId,
                maxNumber: 100,
                player1: { id: playerId, name: playerName, color: 'blue' },
                player2: null,
                player1Ws: ws,
                secrets: { player1: null, player2: null },
                guesses: { player1: [], player2: [] },
                currentTurn: 1,
                winner: null,
                status: 'waiting',
                soundEnabled: true,
                hapticsEnabled: true,
              };
              rooms.set(roomId, room);
            } else {
              // Reconnect or join as player 2
              if (room.player1 && room.player1.id === playerId) {
                room.player1Ws = ws;
                room.player1.name = playerName; // update name if needed
              } else if (room.player2 && room.player2.id === playerId) {
                room.player2Ws = ws;
                room.player2.name = playerName;
              } else if (!room.player2) {
                room.player2 = { id: playerId, name: playerName, color: 'rose' };
                room.player2Ws = ws;
                room.status = 'setup'; // transition to setup screen when both connected
              } else {
                // Room full
                ws.send(JSON.stringify({ type: 'error', message: 'Room is full!' }));
                return;
              }
            }

            broadcastState(roomId);
            break;
          }

          case 'update_config': {
            if (!currentRoomId) return;
            const room = rooms.get(currentRoomId);
            if (!room) return;

            const { maxNumber, soundEnabled, hapticsEnabled } = data;
            room.maxNumber = maxNumber ?? room.maxNumber;
            room.soundEnabled = soundEnabled ?? room.soundEnabled;
            room.hapticsEnabled = hapticsEnabled ?? room.hapticsEnabled;
            room.status = 'secret_selection';

            broadcastState(currentRoomId);
            break;
          }

          case 'set_secret': {
            if (!currentRoomId || !currentPlayerId) return;
            const room = rooms.get(currentRoomId);
            if (!room) return;

            const { secret } = data;
            const isP1 = room.player1?.id === currentPlayerId;
            const isP2 = room.player2?.id === currentPlayerId;

            if (isP1) {
              room.secrets.player1 = secret;
            } else if (isP2) {
              room.secrets.player2 = secret;
            }

            // If both secrets are set, start the game
            if (room.secrets.player1 !== null && room.secrets.player2 !== null) {
              room.status = 'playing';
              room.currentTurn = 1;
            }

            broadcastState(currentRoomId);
            break;
          }

          case 'submit_guess': {
            if (!currentRoomId || !currentPlayerId) return;
            const room = rooms.get(currentRoomId);
            if (!room) return;

            const { value } = data;
            const isP1 = room.player1?.id === currentPlayerId;
            const isP2 = room.player2?.id === currentPlayerId;

            if (room.status !== 'playing') return;

            // Enforce turn-based gameplay
            if (isP1 && room.currentTurn !== 1) return;
            if (isP2 && room.currentTurn !== 2) return;

            const opponentSecret = isP1 ? room.secrets.player2 : room.secrets.player1;
            if (opponentSecret === null) return;

            const entryId = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

            if (value === opponentSecret) {
              // Correct guess!
              const newEntry: GuessEntry = {
                id: entryId,
                value,
                direction: 'correct',
                timestamp: Date.now(),
              };

              if (isP1) {
                room.guesses.player1.push(newEntry);
                room.winner = 1;
              } else {
                room.guesses.player2.push(newEntry);
                room.winner = 2;
              }

              room.status = 'game_over';
            } else {
              // Incorrect guess
              const direction = opponentSecret > value ? 'up' : 'down';
              const newEntry: GuessEntry = {
                id: entryId,
                value,
                direction,
                timestamp: Date.now(),
              };

              if (isP1) {
                room.guesses.player1.push(newEntry);
                room.currentTurn = 2;
              } else {
                room.guesses.player2.push(newEntry);
                room.currentTurn = 1;
              }
            }

            broadcastState(currentRoomId);
            break;
          }

          case 'play_again': {
            if (!currentRoomId) return;
            const room = rooms.get(currentRoomId);
            if (!room) return;

            // Reset secrets and guesses, go back to secret selection
            room.secrets = { player1: null, player2: null };
            room.guesses = { player1: [], player2: [] };
            room.winner = null;
            room.status = 'secret_selection';
            room.currentTurn = 1;

            broadcastState(currentRoomId);
            break;
          }

          case 'change_settings': {
            if (!currentRoomId) return;
            const room = rooms.get(currentRoomId);
            if (!room) return;

            room.secrets = { player1: null, player2: null };
            room.guesses = { player1: [], player2: [] };
            room.winner = null;
            room.status = 'setup';
            room.currentTurn = 1;

            broadcastState(currentRoomId);
            break;
          }
        }
      } catch (e) {
        console.error("Error processing message:", e);
      }
    });

    ws.on('close', () => {
      if (currentRoomId && currentPlayerId) {
        const room = rooms.get(currentRoomId);
        if (room) {
          if (room.player1?.id === currentPlayerId) {
            room.player1Ws = undefined;
          } else if (room.player2?.id === currentPlayerId) {
            room.player2Ws = undefined;
          }

          // Clean up empty rooms after 5 minutes of total inactivity
          if (!room.player1Ws && !room.player2Ws) {
            setTimeout(() => {
              const checkRoom = rooms.get(room.roomId);
              if (checkRoom && !checkRoom.player1Ws && !checkRoom.player2Ws) {
                rooms.delete(room.roomId);
                console.log(`Cleaned up empty room: ${room.roomId}`);
              }
            }, 300000);
          }
        }
      }
    });
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Express server running on http://localhost:${PORT}`);
  });
}

startServer();
