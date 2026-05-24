export default function initInterviewSockets(io) {
  io.on('connection', (socket) => {
    console.log(`[Socket.io] User connected: ${socket.id}`);

    // Join Room
    socket.on('join-room', (roomId, userId) => {
      socket.join(roomId);
      console.log(`[Socket.io] User ${userId} (${socket.id}) joined room ${roomId}`);
      
      // Notify others in the room
      socket.to(roomId).emit('user-connected', userId, socket.id);

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`[Socket.io] User ${userId} (${socket.id}) disconnected from room ${roomId}`);
        socket.to(roomId).emit('user-disconnected', userId, socket.id);
      });
    });

    // WebRTC Signaling
    socket.on('offer', (offer, roomId) => {
      socket.to(roomId).emit('offer', offer, socket.id);
    });

    socket.on('answer', (answer, roomId) => {
      socket.to(roomId).emit('answer', answer, socket.id);
    });

    socket.on('ice-candidate', (candidate, roomId) => {
      socket.to(roomId).emit('ice-candidate', candidate, socket.id);
    });

    // Code Synchronization
    socket.on('code-change', (code, roomId) => {
      socket.to(roomId).emit('code-change', code);
    });

    socket.on('language-change', (language, roomId) => {
      socket.to(roomId).emit('language-change', language);
    });

    // Question Synchronization
    socket.on('question-update', (questionText, roomId) => {
      socket.to(roomId).emit('question-update', questionText);
    });
  });
}
