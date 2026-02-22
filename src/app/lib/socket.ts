import { Server } from 'socket.io';
import { Server as HTTPServer } from 'http';

let io: Server;

export function initSocketServer(server: HTTPServer) {
  io = new Server(server, {
    cors: {
      origin: '*', // ajustar em produção
    },
  });

  io.on('connection', (socket) => {
    console.log('Novo cliente conectado:', socket.id);

    socket.on('entrar-fila', (data) => {
      // O app pode se juntar a uma sala com o ID do motorista
      socket.join(`motorista:${data.motoristaId}`);
    });

    socket.on('disconnect', () => {
      console.log('Cliente desconectado:', socket.id);
    });
  });

  return io;
}

export function getSocketServer() {
  if (!io) throw new Error('Socket.IO não inicializado');
  return io;
}