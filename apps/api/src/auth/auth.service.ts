import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { LoginDto, SignupDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  async signup(dto: SignupDto) {
    const email = dto.email.trim().toLowerCase();
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Name cannot be empty');
    if (await this.prisma.user.findUnique({ where: { email } })) throw new BadRequestException('Email is already registered');
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({ data: { name, email, passwordHash } });
    return this.issueSession(user);
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) throw new UnauthorizedException('Invalid email or password');
    return this.issueSession(user);
  }

  async refresh(rawToken?: string) {
    if (!rawToken) throw new UnauthorizedException('Refresh token required');
    let payload: any;
    try {
      payload = await this.jwt.verifyAsync(rawToken, { secret: process.env.REFRESH_TOKEN_SECRET });
      if (payload.type !== 'refresh' || !payload.jti) throw new Error('Invalid refresh token');
    } catch {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    const saved = await this.prisma.refreshToken.findUnique({ where: { id: payload.jti }, include: { user: true } });
    const tokenHash = this.hashToken(rawToken);
    if (!saved || saved.revokedAt || saved.expiresAt <= new Date() || saved.tokenHash !== tokenHash) {
      throw new UnauthorizedException('Refresh token is invalid or revoked');
    }

    return this.prisma.$transaction(async (tx) => {
      const consumed = await tx.refreshToken.updateMany({
        where: { id: saved.id, revokedAt: null, expiresAt: { gt: new Date() }, tokenHash },
        data: { revokedAt: new Date() },
      });
      if (consumed.count !== 1) throw new UnauthorizedException('Refresh token is invalid or revoked');
      return this.issueSession(saved.user, tx);
    });
  }

  async logout(rawToken?: string) {
    if (!rawToken) return;
    try {
      const payload: any = await this.jwt.verifyAsync(rawToken, { secret: process.env.REFRESH_TOKEN_SECRET, ignoreExpiration: true });
      if (payload.jti) await this.prisma.refreshToken.updateMany({ where: { id: payload.jti }, data: { revokedAt: new Date() } });
    } catch {
      // Cookie is cleared even when token is malformed.
    }
  }

  private async issueSession(
    user: { id: string; email: string; name: string },
    db: Pick<Prisma.TransactionClient, 'refreshToken'> = this.prisma,
  ) {
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email, name: user.name, type: 'access' },
      { secret: process.env.ACCESS_TOKEN_SECRET, expiresIn: (process.env.ACCESS_TOKEN_TTL ?? '15m') as any },
    );

    const tokenId = randomUUID();
    const days = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 7);
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, jti: tokenId, type: 'refresh' },
      { secret: process.env.REFRESH_TOKEN_SECRET, expiresIn: `${days}d` as any },
    );
    await db.refreshToken.create({
      data: { id: tokenId, userId: user.id, tokenHash: this.hashToken(refreshToken), expiresAt: new Date(Date.now() + days * 86400000) },
    });

    return { accessToken, refreshToken, user: { id: user.id, email: user.email, name: user.name } };
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
