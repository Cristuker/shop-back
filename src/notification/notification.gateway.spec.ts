/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "src/prisma.service";
import { NotificationGateway } from "./notification.gateway";

const buyerPayload = { sub: 2, email: "buyer@example.com", type: "BUYER" };
const sellerPayload = { sub: 1, email: "seller@example.com", type: "SELLER" };

function makeSocket(token?: string, id = "socket-1"): any {
  return {
    id,
    handshake: { auth: { token } },
    data: {} as Record<string, unknown>,
    disconnect: jest.fn(),
  };
}

function makeServer() {
  const emit = jest.fn();
  const to = jest.fn().mockReturnValue({ emit });
  return { to, emit, _emit: emit };
}

describe("NotificationGateway", () => {
  let gateway: NotificationGateway;
  let jwtService: { verifyAsync: jest.Mock };
  let prisma: { interest: { findMany: jest.Mock } };

  beforeEach(async () => {
    jwtService = { verifyAsync: jest.fn() };
    prisma = { interest: { findMany: jest.fn() } };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationGateway,
        { provide: JwtService, useValue: jwtService },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    gateway = module.get<NotificationGateway>(NotificationGateway);
    gateway.server = makeServer() as any;
  });

  describe("handleConnection", () => {
    it("should disconnect client when no token is provided", async () => {
      const client = makeSocket(undefined);

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalled();
      expect(jwtService.verifyAsync).not.toHaveBeenCalled();
    });

    it("should disconnect client when token is invalid", async () => {
      const client = makeSocket("bad-token");
      jwtService.verifyAsync.mockRejectedValue(new Error("invalid"));

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalled();
      expect(gateway.getConnectedClients().size).toBe(0);
    });

    it("should disconnect SELLER connections", async () => {
      const client = makeSocket("seller-token");
      jwtService.verifyAsync.mockResolvedValue(sellerPayload);

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalled();
      expect(gateway.getConnectedClients().size).toBe(0);
    });

    it("should register BUYER connection", async () => {
      const client = makeSocket("buyer-token");
      jwtService.verifyAsync.mockResolvedValue(buyerPayload);

      await gateway.handleConnection(client);

      expect(client.disconnect).not.toHaveBeenCalled();
      expect(client.data.userId).toBe(buyerPayload.sub);
      expect(gateway.getConnectedClients().get(buyerPayload.sub)).toContain(
        client.id,
      );
    });

    it("should support multiple connections for the same buyer", async () => {
      const client1 = makeSocket("token", "socket-1");
      const client2 = makeSocket("token", "socket-2");
      jwtService.verifyAsync.mockResolvedValue(buyerPayload);

      await gateway.handleConnection(client1);
      await gateway.handleConnection(client2);

      const sockets = gateway.getConnectedClients().get(buyerPayload.sub);
      expect(sockets?.size).toBe(2);
    });
  });

  describe("handleDisconnect", () => {
    it("should remove socket from connected clients on disconnect", async () => {
      const client = makeSocket("token");
      jwtService.verifyAsync.mockResolvedValue(buyerPayload);
      await gateway.handleConnection(client);

      gateway.handleDisconnect(client);

      expect(gateway.getConnectedClients().has(buyerPayload.sub)).toBe(false);
    });

    it("should remove only the disconnected socket when buyer has multiple connections", async () => {
      const client1 = makeSocket("token", "socket-1");
      const client2 = makeSocket("token", "socket-2");
      jwtService.verifyAsync.mockResolvedValue(buyerPayload);
      await gateway.handleConnection(client1);
      await gateway.handleConnection(client2);

      gateway.handleDisconnect(client1);

      const sockets = gateway.getConnectedClients().get(buyerPayload.sub);
      expect(sockets?.has("socket-1")).toBe(false);
      expect(sockets?.has("socket-2")).toBe(true);
    });

    it("should do nothing when client has no userId (e.g. rejected connection)", () => {
      const client = makeSocket(undefined);

      expect(() => gateway.handleDisconnect(client)).not.toThrow();
    });
  });

  describe("notifyInterestedBuyers", () => {
    const offer = { id: 5, name: "Oferta Nova", storeId: 10 };

    it("should emit new-offer to connected buyers with interest in the store", async () => {
      const buyer = {
        id: 2,
        email: "buyer@example.com",
        phone: "11999999999",
        type: "BUYER",
      };
      prisma.interest.findMany.mockResolvedValue([{ user: buyer }]);

      gateway.getConnectedClients().set(buyer.id, new Set(["socket-2"]));

      await gateway.notifyInterestedBuyers(offer, "nike");

      expect(gateway.server.to).toHaveBeenCalledWith("socket-2");
      expect((gateway.server.to("socket-2") as any).emit).toHaveBeenCalledWith(
        "new-offer",
        {
          offer,
          buyer: { email: buyer.email, phone: buyer.phone },
          storeName: "nike",
        },
      );
    });

    it("should not emit to sellers even if they appear in interest query results", async () => {
      const seller = {
        id: 1,
        email: "seller@example.com",
        phone: null,
        type: "SELLER",
      };
      prisma.interest.findMany.mockResolvedValue([{ user: seller }]);
      gateway.getConnectedClients().set(seller.id, new Set(["socket-1"]));

      await gateway.notifyInterestedBuyers(offer, "nike");

      expect(gateway.server.to).not.toHaveBeenCalled();
    });

    it("should not emit when interested buyer is not connected", async () => {
      const buyer = {
        id: 2,
        email: "buyer@example.com",
        phone: null,
        type: "BUYER",
      };
      prisma.interest.findMany.mockResolvedValue([{ user: buyer }]);

      await gateway.notifyInterestedBuyers(offer, "nike");

      expect(gateway.server.to).not.toHaveBeenCalled();
    });

    it("should not emit when no one has interest in the store", async () => {
      prisma.interest.findMany.mockResolvedValue([]);

      await gateway.notifyInterestedBuyers(offer, "nike");

      expect(gateway.server.to).not.toHaveBeenCalled();
    });

    it("should deduplicate — notify each buyer only once even with multiple interests", async () => {
      const buyer = {
        id: 2,
        email: "buyer@example.com",
        phone: "11999999999",
        type: "BUYER",
      };

      prisma.interest.findMany.mockResolvedValue([
        { user: buyer },
        { user: buyer },
      ]);
      gateway.getConnectedClients().set(buyer.id, new Set(["socket-2"]));

      const emitSpy = jest.fn();
      (gateway.server.to as jest.Mock).mockReturnValue({ emit: emitSpy });

      await gateway.notifyInterestedBuyers(offer, "nike");

      expect(emitSpy).toHaveBeenCalledTimes(1);
      expect(emitSpy).toHaveBeenCalledWith(
        "new-offer",
        expect.objectContaining({ offer }),
      );
    });

    it("should query interests filtered by storeId", async () => {
      prisma.interest.findMany.mockResolvedValue([]);

      await gateway.notifyInterestedBuyers(offer, "nike");

      expect(prisma.interest.findMany).toHaveBeenCalledWith({
        where: { offer: { storeId: offer.storeId } },
        include: {
          user: { select: { id: true, email: true, phone: true, type: true } },
        },
      });
    });
  });
});
