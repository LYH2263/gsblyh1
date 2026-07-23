import {
  BadRequestException,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { User } from '../users/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService
  ) {}

  async register(registerDto: RegisterDto): Promise<{
    token: string;
    user: { id: number; username: string };
  }> {
    const existingUser = await this.userRepository.findOne({
      where: { username: registerDto.username }
    });

    if (existingUser) {
      throw new BadRequestException('用户名已存在');
    }

    const passwordHash = await bcrypt.hash(registerDto.password, 10);
    const user = await this.userRepository.save({
      username: registerDto.username,
      passwordHash
    });

    return this.createLoginResult(user);
  }

  async login(loginDto: LoginDto): Promise<{
    token: string;
    user: { id: number; username: string };
  }> {
    const user = await this.userRepository.findOne({
      where: { username: loginDto.username }
    });

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const isMatch = await bcrypt.compare(loginDto.password, user.passwordHash);

    if (!isMatch) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    return this.createLoginResult(user);
  }

  async getProfile(userId: number): Promise<{ id: number; username: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    return { id: user.id, username: user.username };
  }

  private createLoginResult(user: User): {
    token: string;
    user: { id: number; username: string };
  } {
    const token = this.jwtService.sign({
      sub: user.id,
      username: user.username
    });

    return {
      token,
      user: { id: user.id, username: user.username }
    };
  }
}
