/*
 * @Description:
 * @Author: zby
 * @Date: 2024-06-18 13:41:16
 * @LastEditors: zby
 * @Reference:
 */
const socketAuthMiddleware = (socket, next) => {
  const token = socket.handshake.auth.token;
  console.log('token:', token);
  if (token === '123456') {
    // jwt.verify(token, secretKey, (err, decoded) => {
    //   if (err) {
    //     return next(new Error('Authentication error'));
    //   }
    //   socket.user = decoded;
    //   next();
    // });
    next();
  } else {
    next(new Error('Authentication error'));
  }
};

export { socketAuthMiddleware };
