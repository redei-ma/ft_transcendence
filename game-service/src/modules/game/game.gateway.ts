import { WebSocketGateway, OnGatewayConnection } from "@nestjs/websockets";
import { Socket } from "socket.io";
import { SocketAuthService } from "../auth/socket-auth.service";
import { extractJwtFromCookie } from "../auth/socket-auth.service";

@WebSocketGateway({
  namespace: "/game",
  cors: {
    origin: true,
    credentials: true,
  },
})
export class GameGateway implements OnGatewayConnection {
  constructor(
    private readonly socketAuth: SocketAuthService,
  ) {}

  handleConnection(client: Socket) {
    try {
      //console.log("WS origin:", client.handshake.headers.origin);
      //console.log("WS host:", client.handshake.headers.host);
      //console.log("WS cookies raw:", client.handshake.headers.cookie);

      const cookieHeader = client.handshake.headers.cookie;
      const token = extractJwtFromCookie(cookieHeader);

      if (!token) {
        client.emit("unauthorized");
        client.disconnect();
        return;
      }

      const payload = this.socketAuth.verifyAccessToken(token);

      client.data.user = payload;

      console.log("WS connected user:", payload.sub);
    } catch {
      client.emit("unauthorized");
      client.disconnect();
    }
  }
}
