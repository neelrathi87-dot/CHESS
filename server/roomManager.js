const { Chess } = require('chess.js');

class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  // Generate a random 6-character room code
  generateRoomId() {
    let result = '';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Ensure uniqueness
    if (this.rooms.has(result)) {
      return this.generateRoomId();
    }
    return result;
  }

  createRoom(hostId, socketId, hostColor, username, timeLimitMinutes) {
    const roomId = this.generateRoomId();
    const timeLimitMs = timeLimitMinutes * 60 * 1000;

    // Determine starting color
    let whitePlayer = null;
    let blackPlayer = null;

    const hostPlayer = {
      id: hostId,
      socketId,
      username: username || 'Host',
      connected: true,
      reconnectTimeout: null
    };

    if (hostColor === 'white') {
      whitePlayer = hostPlayer;
    } else if (hostColor === 'black') {
      blackPlayer = hostPlayer;
    } else {
      // Random choice
      if (Math.random() < 0.5) {
        whitePlayer = hostPlayer;
      } else {
        blackPlayer = hostPlayer;
      }
    }

    const room = {
      id: roomId,
      players: {
        white: whitePlayer,
        black: blackPlayer
      },
      game: new Chess(),
      status: 'waiting', // waiting, playing, checkmate, stalemate, draw, resigned, timeout
      timeLimit: timeLimitMs,
      clocks: {
        white: timeLimitMs,
        black: timeLimitMs
      },
      lastMoveTimestamp: null,
      drawOfferFrom: null,
      chat: [],
      winner: null,
      reason: null // checkmate, stalemate, resign, draw, timeout
    };

    this.rooms.set(roomId, room);
    return room;
  }

  joinRoom(roomId, guestId, socketId, username) {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { error: 'Room not found.' };
    }

    if (room.status !== 'waiting') {
      // Check if it's a reconnection attempt for an existing player
      const isWhite = room.players.white && room.players.white.id === guestId;
      const isBlack = room.players.black && room.players.black.id === guestId;

      if (isWhite || isBlack) {
        return this.reconnectPlayer(roomId, guestId, socketId);
      }
      return { error: 'Game has already started in this room.' };
    }

    // Determine guest's color
    const guestPlayer = {
      id: guestId,
      socketId,
      username: username || 'Guest',
      connected: true,
      reconnectTimeout: null
    };

    if (!room.players.white) {
      room.players.white = guestPlayer;
    } else if (!room.players.black) {
      room.players.black = guestPlayer;
    } else {
      return { error: 'Room is full.' };
    }

    // Start game since both players have joined
    room.status = 'playing';
    room.lastMoveTimestamp = Date.now();

    return { room, success: true };
  }

  reconnectPlayer(roomId, playerId, socketId) {
    const room = this.rooms.get(roomId);
    if (!room) return { error: 'Room not found.' };

    let player = null;
    let color = null;

    if (room.players.white && room.players.white.id === playerId) {
      player = room.players.white;
      color = 'white';
    } else if (room.players.black && room.players.black.id === playerId) {
      player = room.players.black;
      color = 'black';
    }

    if (!player) {
      return { error: 'Player not found in this room.' };
    }

    // Clear reconnect timeout if running
    if (player.reconnectTimeout) {
      clearTimeout(player.reconnectTimeout);
      player.reconnectTimeout = null;
    }

    player.connected = true;
    player.socketId = socketId;

    // Adjust the clocks based on elapsed time if game was actively playing
    if (room.status === 'playing' && room.lastMoveTimestamp) {
      const elapsed = Date.now() - room.lastMoveTimestamp;
      const activeColor = room.game.turn() === 'w' ? 'white' : 'black';
      room.clocks[activeColor] = Math.max(0, room.clocks[activeColor] - elapsed);
      room.lastMoveTimestamp = Date.now();
    }

    return { room, success: true, color };
  }

  handleDisconnect(socketId, callback) {
    // Find room where socket is a player
    for (const [roomId, room] of this.rooms.entries()) {
      let player = null;
      let color = null;
      let opponent = null;

      if (room.players.white && room.players.white.socketId === socketId) {
        player = room.players.white;
        color = 'white';
        opponent = room.players.black;
      } else if (room.players.black && room.players.black.socketId === socketId) {
        player = room.players.black;
        color = 'black';
        opponent = room.players.white;
      }

      if (player && player.connected) {
        player.connected = false;

        // If game was still in waiting phase, just delete the room or remove player
        if (room.status === 'waiting') {
          // If host leaves, delete room. If guest leaves, vacate slot
          if (room.players.white === player) {
            this.rooms.delete(roomId);
            callback(roomId, 'room_closed', null);
          } else {
            room.players.black = null;
            callback(roomId, 'opponent_left_lobby', null);
          }
          return;
        }

        // If game is active, update clock for disconnect and start 30 second timer
        if (room.status === 'playing') {
          const elapsed = Date.now() - room.lastMoveTimestamp;
          const activeColor = room.game.turn() === 'w' ? 'white' : 'black';
          room.clocks[activeColor] = Math.max(0, room.clocks[activeColor] - elapsed);
          room.lastMoveTimestamp = Date.now();
        }

        // Start 30-second reconnection window
        player.reconnectTimeout = setTimeout(() => {
          if (!player.connected && this.rooms.has(roomId)) {
            // Reconnection window expired, opponent wins
            room.status = 'resigned';
            room.winner = color === 'white' ? 'black' : 'white';
            room.reason = 'disconnection_timeout';
            callback(roomId, 'game_over', room);
          }
        }, 30000); // 30 seconds

        callback(roomId, 'player_disconnected', { color, username: player.username });
        return;
      }
    }
  }

  // Update clocks based on current turn
  updateClocks(room) {
    if (room.status !== 'playing' || !room.lastMoveTimestamp) return;

    const now = Date.now();
    const elapsed = now - room.lastMoveTimestamp;
    const activeColor = room.game.turn() === 'w' ? 'white' : 'black';

    room.clocks[activeColor] = Math.max(0, room.clocks[activeColor] - elapsed);
    room.lastMoveTimestamp = now;

    if (room.clocks[activeColor] <= 0) {
      room.status = 'timeout';
      room.winner = activeColor === 'white' ? 'black' : 'white';
      room.reason = 'timeout';
    }
  }

  makeMove(roomId, playerId, moveData) {
    const room = this.rooms.get(roomId);
    if (!room) return { error: 'Room not found.' };
    if (room.status !== 'playing') return { error: 'Game is not in progress.' };

    // Identify player color
    let playerColor = null;
    if (room.players.white && room.players.white.id === playerId) {
      playerColor = 'w';
    } else if (room.players.black && room.players.black.id === playerId) {
      playerColor = 'b';
    }

    if (!playerColor) {
      return { error: 'You are not a player in this room.' };
    }

    if (room.game.turn() !== playerColor) {
      return { error: 'It is not your turn.' };
    }

    // Update active player's clock first
    this.updateClocks(room);

    if (room.status === 'timeout') {
      return { room, gameOver: true };
    }

    try {
      // Validate and make move with chess.js
      // moveData can be string "e4" or object { from: "e2", to: "e4", promotion: "q" }
      const move = room.game.move(moveData);

      if (!move) {
        return { error: 'Invalid move.' };
      }

      // Record last move timestamp
      room.lastMoveTimestamp = Date.now();
      // Clear any pending draw offer on move
      room.drawOfferFrom = null;

      // Check game end states
      let gameOver = false;
      if (room.game.isCheckmate()) {
        room.status = 'checkmate';
        room.winner = playerColor === 'w' ? 'white' : 'black';
        room.reason = 'checkmate';
        gameOver = true;
      } else if (room.game.isDraw()) {
        room.status = 'draw';
        gameOver = true;
        if (room.game.isStalemate()) {
          room.reason = 'stalemate';
        } else if (room.game.isThreefoldRepetition()) {
          room.reason = 'threefold_repetition';
        } else if (room.game.isInsufficientMaterial()) {
          room.reason = 'insufficient_material';
        } else {
          room.reason = 'draw';
        }
      }

      return { room, move, gameOver };
    } catch (e) {
      return { error: 'Invalid move: ' + e.message };
    }
  }

  offerDraw(roomId, playerId) {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'playing') return { error: 'Cannot offer draw.' };

    if (room.drawOfferFrom) {
      return { error: 'Draw already offered.' };
    }

    room.drawOfferFrom = playerId;
    return { success: true, room };
  }

  handleDrawResponse(roomId, playerId, accept) {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'playing' || !room.drawOfferFrom) {
      return { error: 'No active draw offer.' };
    }

    if (room.drawOfferFrom === playerId) {
      return { error: 'You cannot respond to your own draw offer.' };
    }

    if (accept) {
      this.updateClocks(room);
      room.status = 'draw';
      room.reason = 'mutual_agreement';
      room.drawOfferFrom = null;
      return { success: true, room, gameOver: true };
    } else {
      room.drawOfferFrom = null;
      return { success: true, room, gameOver: false, declined: true };
    }
  }

  resign(roomId, playerId) {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'playing') return { error: 'Cannot resign.' };

    this.updateClocks(room);

    let loserColor = null;
    if (room.players.white && room.players.white.id === playerId) {
      loserColor = 'white';
    } else if (room.players.black && room.players.black.id === playerId) {
      loserColor = 'black';
    }

    if (!loserColor) return { error: 'Player not found.' };

    room.status = 'resigned';
    room.winner = loserColor === 'white' ? 'black' : 'white';
    room.reason = 'resignation';

    return { room, gameOver: true };
  }

  addChatMessage(roomId, playerId, text) {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    let sender = 'Spectator';
    if (room.players.white && room.players.white.id === playerId) {
      sender = room.players.white.username;
    } else if (room.players.black && room.players.black.id === playerId) {
      sender = room.players.black.username;
    }

    const message = {
      sender,
      text,
      timestamp: Date.now()
    };

    room.chat.push(message);
    // Keep last 100 messages
    if (room.chat.length > 100) {
      room.chat.shift();
    }

    return message;
  }

  getRoomState(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    // Return serializable client-friendly structure
    return {
      id: room.id,
      status: room.status,
      fen: room.game.fen(),
      turn: room.game.turn(),
      isCheck: room.game.inCheck(),
      history: room.game.history({ verbose: true }),
      clocks: { ...room.clocks },
      drawOfferFrom: room.drawOfferFrom,
      winner: room.winner,
      reason: room.reason,
      chat: room.chat,
      players: {
        white: room.players.white ? {
          id: room.players.white.id,
          username: room.players.white.username,
          connected: room.players.white.connected
        } : null,
        black: room.players.black ? {
          id: room.players.black.id,
          username: room.players.black.username,
          connected: room.players.black.connected
        } : null
      }
    };
  }

  deleteRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (room) {
      if (room.players.white?.reconnectTimeout) clearTimeout(room.players.white.reconnectTimeout);
      if (room.players.black?.reconnectTimeout) clearTimeout(room.players.black.reconnectTimeout);
      this.rooms.delete(roomId);
    }
  }
}

module.exports = new RoomManager();
