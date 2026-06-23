const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// تحديد مجلد الملفات الثابتة (الواجهة)
app.use(express.static(path.join(__dirname, 'public')));

// تخزين بيانات الغرف
const rooms = {};

io.on('connection', (socket) => {
    console.log('مستخدم متصل:', socket.id);

    // 1. إنشاء غرفة جديدة (3 أرقام)
    socket.on('createRoom', (playerName) => {
        const roomCode = Math.floor(100 + Math.random() * 900).toString();
        rooms[roomCode] = {
            players: [{ id: socket.id, name: playerName, color: 'red' }]
        };
        socket.join(roomCode);
        socket.emit('roomCreated', { roomCode, color: 'red' });
    });

    // 2. الانضمام لغرفة
    socket.on('joinRoom', ({ playerName, roomCode }) => {
        const room = rooms[roomCode];
        if (room && room.players.length === 1) {
            room.players.push({ id: socket.id, name: playerName, color: 'green' });
            socket.join(roomCode);
            socket.emit('roomJoined', { roomCode, color: 'green' });
            
            // إبلاغ اللاعبين ببدء اللعبة
            io.to(roomCode).emit('gameStart', room.players);
        } else {
            socket.emit('errorMsg', 'رقم الغرفة غير صحيح أو الغرفة ممتلئة.');
        }
    });

    // 3. مزامنة الحركات
    socket.on('move', (data) => {
        socket.to(data.room).emit('move', data);
    });

    // 4. طلب جولة جديدة
    socket.on('newRound', (roomCode) => {
        socket.to(roomCode).emit('newRound');
    });

    // 5. إشارات WebRTC للدردشة الصوتية
    socket.on('offer', (data) => {
        socket.to(data.room).emit('offer', data.offer);
    });

    socket.on('answer', (data) => {
        socket.to(data.room).emit('answer', data.answer);
    });

    socket.on('ice-candidate', (data) => {
        socket.to(data.room).emit('ice-candidate', data.candidate);
    });

    // عند قطع الاتصال
    socket.on('disconnect', () => {
        console.log('مستخدم غادر:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`الخادم يعمل على المنفذ http://localhost:${PORT}`);
});