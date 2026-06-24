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

    socket.on('setFirstPlayer', (data) => {
        socket.to(data.room).emit('setFirstPlayer', { firstPlayer: data.firstPlayer });
    });

    // إشارات WebRTC للدردشة الصوتية
    socket.on('offer', (data) => socket.to(data.room).emit('offer', data.offer));
    socket.on('answer', (data) => socket.to(data.room).emit('answer', data.answer));
    socket.on('ice-candidate', (data) => socket.to(data.room).emit('ice-candidate', data.candidate));

    socket.on('disconnect', () => {
        console.log('مستخدم غادر:', socket.id);
        
        // البحث عن الغرفة التي ينتمي إليها اللاعب المفقود
        for (const roomCode in rooms) {
            const room = rooms[roomCode];
            const playerIndex = room.players.findIndex(p => p.id === socket.id);
            
            if (playerIndex !== -1) {
                // إزالة اللاعب من الغرفة
                room.players.splice(playerIndex, 1);
                
                // إشعار اللاعب الآخر بالفصل
                io.to(roomCode).emit('playerDisconnected');
                
                // إذا لم يبقَ أحد، حذف الغرفة
                if (room.players.length === 0) {
                    delete rooms[roomCode];
                    console.log(`الغرفة ${roomCode} تم حذفها (لا يوجد لاعبين)`);
                }
                break;
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`الخادم يعمل على المنفذ http://localhost:${PORT}`);
});