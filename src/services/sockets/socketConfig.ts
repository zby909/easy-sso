/*
 * @Description:
 * @Author: zby
 * @Date: 2024-06-18 13:34:55
 * @LastEditors: zby
 * @Reference:
 */
import { Server as socketIo } from 'socket.io';
import { socketAuthMiddleware } from './socketMiddleware.ts';
import socketHandlers from './socketHandlers.ts';

const configureSocket = server => {
  const io = new socketIo(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    // transports: ['websocket'],
  });

  io.use(socketAuthMiddleware);

  io.on('connection', socket => {
    socketHandlers.handleEvents(socket, io); //聊天室 webrtc交换信令
  });

  return io;
};

export default configureSocket;
