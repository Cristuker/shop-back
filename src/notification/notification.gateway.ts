/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Logger } from "@nestjs/common";
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { JwtService } from "@nestjs/jwt";
import { Server, Socket } from "socket.io";
import type { JwtPayload } from "src/auth/guards/jwt-auth.guard";
import { PrismaService } from "src/prisma.service";

@WebSocketGateway({ cors: { origin: "*" } })
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  private readonly clients = new Map<number, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.auth.token as string | undefined;

    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);

      if (payload.type !== "BUYER") {
        client.disconnect();
        return;
      }

      client.data.userId = payload.sub;

      if (!this.clients.has(payload.sub)) {
        this.clients.set(payload.sub, new Set());
      }
      this.clients.get(payload.sub)!.add(client.id);

      this.logger.log(`Buyer ${payload.sub} connected (${client.id})`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data?.userId as number | undefined;
    if (userId === undefined) return;

    const sockets = this.clients.get(userId);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) this.clients.delete(userId);
    }

    this.logger.log(`Buyer ${userId} disconnected (${client.id})`);
  }

  async notifyInterestedBuyers(
    offer: {
      id: number;
      name: string;
      storeId: number;
      [key: string]: unknown;
    },
    storeName: string,
  ) {
    const interests = await this.prisma.interest.findMany({
      where: { offer: { storeId: offer.storeId } },
      include: {
        user: { select: { id: true, email: true, phone: true, type: true } },
      },
    });

    const notified = new Set<number>();

    for (const { user } of interests) {
      if (user.type !== "BUYER" || notified.has(user.id)) continue;
      notified.add(user.id);

      const sockets = this.clients.get(user.id);
      if (!sockets) continue;

      for (const socketId of sockets) {
        this.server.to(socketId).emit("new-offer", {
          offer,
          buyer: { email: user.email, phone: user.phone },
          storeName,
        });
      }
    }
  }

  getConnectedClients(): Map<number, Set<string>> {
    return this.clients;
  }
}
