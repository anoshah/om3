const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

const rooms = {};

io.on('connection', (socket) => {
    console.log('مستخدم متصل:', socket.id);

    socket.on('createRoom', (playerName) => {
        const roomCode = Math.floor(100 + Math.random() * 900).toString();
        rooms[roomCode] = {
            players: [{ id: socket.id, name: playerName, color: 'red' }]
        };
        socket.join(roomCode);
        socket.emit('roomCreated', { roomCode, color: 'red' });
    });

    socket.on('joinRoom', ({ playerName, roomCode }) => {
        const room = rooms[roomCode];
        if (room && room.players.length === 1) {
            room.players.push({ id: socket.id, name: playerName, color: 'green' });
            socket.join(roomCode);
            socket.emit('roomJoined', { roomCode, color: 'green' });
            
            // إرسال بيانات اللاعبين (بما فيها الأسماء) للجميع في الغرفة لبدء اللعبة
            io.to(roomCode).emit('gameStart', room.players);
        } else {
            socket.emit('errorMsg', 'رقم الغرفة غير صحيح أو الغرفة ممتلئة.');
        }
    });

    socket.on('move', (data) => {
        socket.to(data.room).emit('move', data);
    });

    socket.on('newRound', (roomCode) => {
        socket.to(roomCode).emit('newRound');
    });

    // إشارات WebRTC للدردشة الصوتية
    socket.on('offer', (data) => socket.to(data.room).emit('offer', data.offer));
    socket.on('answer', (data) => socket.to(data.room).emit('answer', data.answer));
    socket.on('ice-candidate', (data) => socket.to(data.room).emit('ice-candidate', data.candidate));

    socket.on('disconnect', () => {
        console.log('مستخدم غادر:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`الخادم يعمل على المنفذ http://localhost:${PORT}`);
});