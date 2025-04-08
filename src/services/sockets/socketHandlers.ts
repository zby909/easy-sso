/*
 * @Description:
 * @Author: zby
 * @Date: 2024-06-18 13:35:20
 * @LastEditors: zby
 * @Reference:
 */
// src/services/socket/socketHandlers.js
import logger from '../../utils/logger.ts';
import { rooms, socks } from './rooms/index.ts';
import guid from '../../utils/guid.js';
import type { Server as SocketIoServer, Socket } from 'socket.io';

const handleEvents = (socket: Socket, io: SocketIoServer) => {
  logger.info('New client connected');

  const handleUserLeave = ({ userName, roomId, sockId }) => {
    const room = rooms[roomId] || [];
    rooms[roomId] = room.filter(item => item.sockId !== sockId);
    !rooms[roomId].length && delete rooms[roomId];
    delete socks[sockId];
    io.in(roomId).emit('userLeave', {
      allUsers: rooms[roomId],
      user: { userName, roomId, sockId },
    });
    console.log(`userName:${userName}, roomId:${roomId}, sockId:${sockId} 离开了房间...`);
    console.log(rooms);
  };

  socket.on('disconnect', reason => {
    //删除离线用户
    const sockId = socket.id;
    const targetRoomId = socks[sockId]?.roomId;
    const targetUser = rooms[targetRoomId]?.find(item => item.sockId === sockId);
    targetUser && handleUserLeave(targetUser);
    console.log('Client disconnected:', reason);
    logger.info('Client disconnected', { reason });
  });

  socket.on('connect_error', error => {
    console.error('connect_error:', error);
    logger.error('connect_error', { error });
  });

  /* work event */

  // 检查房间是否存在
  socket.on('checkRoom', roomId => {
    console.log('checkRoom:', roomId, !!rooms[roomId]);
    socket.emit('checkRoom', !!rooms[roomId]);
  });

  // 创建房间
  socket.on('createRoom', ({ userName }) => {
    const sockId = socket.id;
    const roomId = guid();
    rooms[roomId] = [];
    socket.emit('createRoomSuccess', { roomId, sockId, userName }); // 通知自己
  });

  // 用户加入房间
  socket.on('join', ({ userName, roomId }) => {
    if (!rooms[roomId]) {
      console.log('房间不存在');
      return;
    }
    const sockId = socket.id;
    socks[sockId] = { socket, roomId };
    rooms[roomId].push({ userName, roomId, sockId });
    socket.emit('preJoinRoom', { allUsers: rooms[roomId], user: { userName, roomId, sockId } }); // 通知自己
    socket.join(roomId); // 加入房间组
  });

  // 用户加入房间成功
  socket.on('preJoinRoomSuccess', ({ userName, roomId, sockId }) => {
    // 通知房间内所有人(包括自己)
    // io.in(roomId).emit('joinRoomSuccess', { allUsers: rooms[roomId], user: { userName, roomId, sockId } });
    // 通知房间内所有人(不包括自己)
    socket.to(roomId).emit('joinRoomSuccess', { allUsers: rooms[roomId], user: { userName, roomId, sockId } });
    console.log(`userName:${userName}, roomId:${roomId}, sockId:${sockId} 加入了房间...`);
    console.log(rooms);
  });

  // 用户离开房间
  socket.on('userLeave', handleUserLeave);

  // addIceCandidate
  socket.on('createIceCandidate', ({ candidate, toUser, fromUser }) => {
    socks[toUser.sockId].socket.emit('receiveIceCandidate', { candidate, fromUser });
  });
  socket.on('createOffer', ({ offer, toUser, fromUser }) => {
    socks[toUser.sockId].socket.emit('receiveOffer', { offer, fromUser });
  });
  socket.on('createAnswer', ({ answer, toUser, fromUser }) => {
    socks[toUser.sockId].socket.emit('receiveAnsewer', { answer, fromUser });
  });
};

export default { handleEvents };
