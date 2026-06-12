const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const roomManager = require('./roomManager');

const app = express();
app.use(cors({ origin: '*' }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Basic check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', activeRooms: roomManager.rooms.size });
});

// Socket connection
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Helper to process matchmaking
  const handleMatchmakingResults = (results) => {
    if (!results) return;

    // 1. Matches
    results.matches.forEach(({ room, player1, player2 }) => {
      const p1Socket = io.sockets.sockets.get(player1.socketId);
      const p2Socket = io.sockets.sockets.get(player2.socketId);
      if (p1Socket && p2Socket) {
        p1Socket.join(room.id);
        p2Socket.join(room.id);
        const state = roomManager.getRoomState(room.id);
        p1Socket.emit('matchFound', { state, color: player1.color });
        p2Socket.emit('matchFound', { state, color: player2.color });
      }
    });

    // 2. Proposals
    results.proposals.forEach((proposal) => {
      const p1Socket = io.sockets.sockets.get(proposal.p1.socketId);
      const p2Socket = io.sockets.sockets.get(proposal.p2.socketId);
      if (p1Socket && p2Socket) {
        p1Socket.emit('proposeMismatch', { proposalId: proposal.id, myTime: proposal.p1.timeLimit, opponentTime: proposal.p2.timeLimit });
        p2Socket.emit('proposeMismatch', { proposalId: proposal.id, myTime: proposal.p2.timeLimit, opponentTime: proposal.p1.timeLimit });
      }
    });

    // 3. Waiting on Match
    results.waitingOnMatch.forEach(({ player, room }) => {
      const pSocket = io.sockets.sockets.get(player.socketId);
      if (pSocket) {
        pSocket.emit('waitingOnMatch', { roomId: room.id });
      }
    });
  };
  
  // Broadcast updated total online players count
  io.emit('onlinePlayersCount', io.engine.clientsCount);

  // 1. Create Room
  socket.on('createRoom', ({ hostId, hostColor, username, timeLimit }) => {
    try {
      const room = roomManager.createRoom(hostId, socket.id, hostColor, username, timeLimit || 10);
      socket.join(room.id);
      
      const state = roomManager.getRoomState(room.id);
      socket.emit('roomCreated', state);
      console.log(`Room created: ${room.id} by player ${hostId}`);
    } catch (err) {
      socket.emit('errorMsg', { message: 'Failed to create room.' });
    }
  });

  // 2. Join Room
  socket.on('joinRoom', ({ roomId, playerId, username }) => {
    try {
      const upperRoomId = roomId.trim().toUpperCase();
      const result = roomManager.joinRoom(upperRoomId, playerId, socket.id, username);

      if (result.error) {
        socket.emit('errorMsg', { message: result.error });
        return;
      }

      socket.join(upperRoomId);
      
      // Update room state for everyone in the room
      const state = roomManager.getRoomState(upperRoomId);
      io.to(upperRoomId).emit('gameState', state);
      
      // Notify client specific connection color details (in case of reconnection)
      socket.emit('joinedSuccess', { color: result.color || null });

      console.log(`Player ${playerId} joined Room ${upperRoomId}`);
    } catch (err) {
      socket.emit('errorMsg', { message: 'Failed to join room.' });
    }
  });

  // 3. Make Move
  socket.on('makeMove', ({ roomId, playerId, move }) => {
    try {
      const upperRoomId = roomId.trim().toUpperCase();
      const result = roomManager.makeMove(upperRoomId, playerId, move);

      if (result.error) {
        socket.emit('errorMsg', { message: result.error });
        return;
      }

      const state = roomManager.getRoomState(upperRoomId);
      io.to(upperRoomId).emit('gameState', state);

      if (result.gameOver) {
        io.to(upperRoomId).emit('gameOver', state);
        if (result.room.winnerStaysOnTrigger) {
          result.room.winnerStaysOnTrigger = false;
          handleMatchmakingResults(roomManager.processQueue());
        }
      }
    } catch (err) {
      socket.emit('errorMsg', { message: 'Failed to complete move.' });
    }
  });

  // 4. Offer Draw
  socket.on('offerDraw', ({ roomId, playerId }) => {
    try {
      const upperRoomId = roomId.trim().toUpperCase();
      const result = roomManager.offerDraw(upperRoomId, playerId);

      if (result.error) {
        socket.emit('errorMsg', { message: result.error });
        return;
      }

      const state = roomManager.getRoomState(upperRoomId);
      io.to(upperRoomId).emit('gameState', state);
      // Explicitly notify players of the draw offer
      socket.to(upperRoomId).emit('drawOffered', { from: playerId });
    } catch (err) {
      socket.emit('errorMsg', { message: 'Failed to offer draw.' });
    }
  });

  // 5. Respond Draw
  socket.on('respondDraw', ({ roomId, playerId, accept }) => {
    try {
      const upperRoomId = roomId.trim().toUpperCase();
      const result = roomManager.handleDrawResponse(upperRoomId, playerId, accept);

      if (result.error) {
        socket.emit('errorMsg', { message: result.error });
        return;
      }

      const state = roomManager.getRoomState(upperRoomId);
      io.to(upperRoomId).emit('gameState', state);

      if (result.gameOver) {
        io.to(upperRoomId).emit('gameOver', state);
      } else if (result.declined) {
        socket.to(upperRoomId).emit('drawDeclined', { from: playerId });
      }
    } catch (err) {
      socket.emit('errorMsg', { message: 'Failed to process draw response.' });
    }
  });

  // 6. Resign
  socket.on('resign', ({ roomId, playerId }) => {
    try {
      const upperRoomId = roomId.trim().toUpperCase();
      const result = roomManager.resign(upperRoomId, playerId);

      if (result.error) {
        socket.emit('errorMsg', { message: result.error });
        return;
      }

      const state = roomManager.getRoomState(upperRoomId);
      io.to(upperRoomId).emit('gameState', state);
      io.to(upperRoomId).emit('gameOver', state);
      
      if (result.room.winnerStaysOnTrigger) {
        result.room.winnerStaysOnTrigger = false;
        handleMatchmakingResults(roomManager.processQueue());
      }
    } catch (err) {
      socket.emit('errorMsg', { message: 'Failed to resign.' });
    }
  });

  // 7. Send Chat Message
  socket.on('sendChat', ({ roomId, playerId, text }) => {
    try {
      const upperRoomId = roomId.trim().toUpperCase();
      const message = roomManager.addChatMessage(upperRoomId, playerId, text);

      if (message) {
        io.to(upperRoomId).emit('chatMessage', message);
      }
    } catch (err) {
      console.error('Chat error:', err);
    }
  });

  // 8. Find Random Match (Matchmaking)
  socket.on('findMatch', ({ playerId, username, timeLimit }) => {
    try {
      // Add player to matchmaking queue
      roomManager.joinQueue(playerId, socket.id, username, timeLimit || 10);

      // Send queue position update
      socket.emit('queueUpdate', { position: roomManager.getQueueSize(), searching: true });

      // Process queue to check for exact matches, proposals, or waiting logic
      handleMatchmakingResults(roomManager.processQueue());
    } catch (err) {
      console.error('Matchmaking error:', err);
      socket.emit('errorMsg', { message: 'Failed to join matchmaking queue.' });
    }
  });

  // 9. Cancel Match Search
  socket.on('cancelSearch', ({ playerId }) => {
    try {
      roomManager.leaveQueue(playerId);
      socket.emit('searchCancelled');
      
      // Since queue size changed, process queue again for waiting players
      handleMatchmakingResults(roomManager.processQueue());
    } catch (err) {
      console.error('Cancel search error:', err);
    }
  });

  // 9.5 Respond to Time Odds Proposal
  socket.on('respondMismatch', ({ proposalId, playerId, accept }) => {
    try {
      const matchResult = roomManager.handleProposalResponse(proposalId, playerId, accept);
      if (matchResult) {
        // Both players responded, and a match was created
        handleMatchmakingResults({ matches: [matchResult], proposals: [], waitingOnMatch: [] });
      } else {
        // Just waiting for the other player
      }
    } catch (err) {
      console.error('Proposal response error:', err);
    }
  });

  // 10. Disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    // Broadcast updated total online players count (delayed slightly so the disconnect registers)
    setTimeout(() => {
      io.emit('onlinePlayersCount', io.engine.clientsCount);
    }, 0);
    
    // Remove from matchmaking queue
    roomManager.removeFromQueueBySocket(socket.id);

    roomManager.handleDisconnect(socket.id, (roomId, action, data) => {
      if (action === 'room_closed') {
        io.to(roomId).emit('errorMsg', { message: 'Host left the lobby. Room closed.' });
      } else if (action === 'opponent_left_lobby') {
        const state = roomManager.getRoomState(roomId);
        io.to(roomId).emit('gameState', state);
      } else if (action === 'player_disconnected') {
        io.to(roomId).emit('playerDisconnected', data);
      } else if (action === 'game_over') {
        io.to(roomId).emit('gameState', data);
        io.to(roomId).emit('gameOver', data);
        roomManager.deleteRoom(roomId);
      }
    });
  });
});

// Background task: Server clock validation interval (every 1 second)
setInterval(() => {
  for (const [roomId, room] of roomManager.rooms.entries()) {
    if (room.status === 'playing') {
      const oldStatus = room.status;
      roomManager.updateClocks(room);

      // If state changed to timeout
      if (room.status === 'timeout') {
        const state = roomManager.getRoomState(roomId);
        io.to(roomId).emit('gameState', state);
        io.to(roomId).emit('gameOver', state);
        
        if (room.winnerStaysOnTrigger) {
          room.winnerStaysOnTrigger = false;
          // Note: handleMatchmakingResults is not accessible here, so we manually call it or move the setInterval inside connection.
          // Wait, setInterval is outside connection, so we can't easily emit to specific sockets without repeating logic.
          // Let's just process the queue and if there are matches, we handle them.
          const results = roomManager.processQueue();
          if (results) {
            results.matches.forEach(({ room: matchRoom, player1, player2 }) => {
              const p1Socket = io.sockets.sockets.get(player1.socketId);
              const p2Socket = io.sockets.sockets.get(player2.socketId);
              if (p1Socket && p2Socket) {
                p1Socket.join(matchRoom.id);
                p2Socket.join(matchRoom.id);
                const matchState = roomManager.getRoomState(matchRoom.id);
                p1Socket.emit('matchFound', { state: matchState, color: player1.color });
                p2Socket.emit('matchFound', { state: matchState, color: player2.color });
              }
            });
            // (Proposals and Waiting are unlikely here since queue length is >=2 for matches)
          }
        }
        
        roomManager.deleteRoom(roomId);
      }
    }
  }
}, 1000);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Chess server running on port ${PORT}`);
});
