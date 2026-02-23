import { Server as SocketServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

let io: SocketServer;

export const initSocket = (server: HTTPServer) => {
  io = new SocketServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });
  console.log('Socket.io inicializado');
  return io;
};

export const getSocketServer = () => {
  if (!io) {
    throw new Error('Socket.io não foi inicializado');
  }
  return io;
};