/*
 * @Description:
 * @Author: zby
 * @Date: 2024-06-18 17:34:53
 * @LastEditors: zby
 * @Reference:
 */
// import type { Server as SocketIoServer, Socket } from 'socket.io';
import type { Socket } from 'socket.io';
type SocksType = {
  [key: string]: {
    socket: Socket;
    roomId: string;
  };
};
type RoomsType = {
  [key: string]: {
    userName: string;
    roomId: string;
    sockId: string;
  }[];
};

const rooms: RoomsType = {};
const socks: SocksType = {};
export { rooms, socks };
