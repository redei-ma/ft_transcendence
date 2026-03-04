import { WebSocketGateway, OnGatewayConnection } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import {
  parseCookieHeader,
  verifyJwtToken,
  AUTH_COOKIE_NAME,
} from '@transcendence/auth';

@WebSocketGateway({
  namespace: '/game',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class GameGateway implements OnGatewayConnection {
  handleConnection(client: Socket) {
    try {
      const token = parseCookieHeader(client.handshake.headers.cookie, AUTH_COOKIE_NAME);

      if (!token) {
        client.emit('unauthorized');
        client.disconnect();
        return;
      }

      client.data.user = verifyJwtToken(token);
      console.log('WS connected user:', client.data.user.sub);
    } catch {
      client.emit('unauthorized');
      client.disconnect();
    }
  }
}
