import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConnectedSocket, MessageBody, OnGatewayConnection, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma.service';

@Injectable()
@WebSocketGateway({ cors: { origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000', credentials: true } })
export class TaskflowGateway implements OnGatewayConnection {
  @WebSocketServer() server!: Server;

  constructor(private readonly jwt: JwtService, private readonly prisma: PrismaService) {}

  async handleConnection(socket: Socket) {
    const token = socket.handshake.auth?.token;
    try {
      const payload: any = await this.jwt.verifyAsync(token, { secret: process.env.ACCESS_TOKEN_SECRET });
      if (payload.type !== 'access') throw new Error('Wrong token type');
      socket.data.user = { id: payload.sub, email: payload.email, name: payload.name };
      await socket.join(`user:${payload.sub}`);
    } catch {
      socket.emit('auth:error', { message: 'Socket authentication failed' });
      socket.disconnect(true);
    }
  }

  @SubscribeMessage('project:join')
  async joinProject(@ConnectedSocket() socket: Socket, @MessageBody() body: { projectId: string }) {
    const userId = socket.data.user?.id;
    const membership = await this.prisma.membership.findUnique({ where: { projectId_userId: { projectId: body.projectId, userId } } });
    if (!membership) return { ok: false, error: 'You are not a member of this project' };
    await socket.join(`project:${body.projectId}`);
    return { ok: true };
  }

  @SubscribeMessage('project:leave')
  async leaveProject(@ConnectedSocket() socket: Socket, @MessageBody() body: { projectId: string }) {
    await socket.leave(`project:${body.projectId}`);
    return { ok: true };
  }

  evictUserFromProject(userId: string, projectId: string) {
    this.server?.in(`user:${userId}`).socketsLeave(`project:${projectId}`);
  }

  emitProject(projectId: string, event: string, payload: unknown) {
    this.server?.to(`project:${projectId}`).emit(event, payload);
  }

  emitUser(userId: string, event: string, payload: unknown) {
    this.server?.to(`user:${userId}`).emit(event, payload);
  }
}
