import {
    BadRequestException,
    CACHE_MANAGER,
    Inject,
    Injectable,
    Logger,
} from '@nestjs/common';
import { Cache } from 'cache-manager';
import { CryptPasswordDto } from './dto/crypt-password.dto';
import { GenerateTokensDto } from './dto/generate-token.dto';
import { VerifyByAccessTokenDto } from './dto/verify-by-access-token.dto';
import { CryptedPasswordImpl } from './interfaces/crypted-password.interface';
import { TokensImpl } from './interfaces/tokens.interface';
import { UserIdImpl } from './interfaces/user-id.interface';
import * as bcrypt from 'bcrypt';
import { ClientGrpc } from '@nestjs/microservices';
import { UserServiceImpl } from './interfaces/user-service.interface';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RegenerateTokensDto } from './dto/regenerate-tokens.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class TokenService {
    private readonly logger = new Logger(TokenService.name);

    private userService: UserServiceImpl;

    constructor(
        @Inject(CACHE_MANAGER) private refreshTokensManager: Cache,
        @Inject('USER_PACKAGE') private client: ClientGrpc,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) {}

    onModuleInit() {
        this.userService = this.client.getService<UserServiceImpl>(
            'UserService',
        );
    }

    async generateTokens(
        generateTokensDto: GenerateTokensDto,
    ): Promise<TokensImpl> {
        const { email, password } = generateTokensDto;

        const user = await this.userService
            .getUserByEmail({ email })
            .toPromise();

        this.logger.log(`Got user from user-service: ${JSON.stringify(user)}`);

        if (!user) {
            throw new BadRequestException('Invalid email or password');
        }

        const isValidPassword = await bcrypt.compare(
            password,
            user.hashedPassword,
        );
        if (!isValidPassword) {
            throw new BadRequestException('Invalid email or password');
        }

        const payload = { id: Number.parseInt(user.id) };
        const { accessToken, refreshToken } = this.generateTokensByPayload(
            payload,
        );

        this.saveRefreshToken(Number.parseInt(user.id), refreshToken);

        return { accessToken, refreshToken };
    }

    async regenerateTokens(
        regenerateTokensDto: RegenerateTokensDto,
    ): Promise<TokensImpl> {
        const payload: JwtPayload = this.jwtService.verify(
            regenerateTokensDto.refreshToken,
            {
                secret: this.configService.get<string>('REFRESH_JWT_SECRET'),
            },
        );

        return this.generateTokensByPayload(payload);
    }

    verifyByAccessToken(
        verifyByAccessTokenDto: VerifyByAccessTokenDto,
    ): UserIdImpl {
        const payload: JwtPayload = this.jwtService.verify(
            verifyByAccessTokenDto.accessToken,
            {
                secret: this.configService.get<string>('ACCESS_JWT_SECRET'),
            }
        );
        
        return {
            id: payload.id.toString(),
        };
    }

    async cryptPassword(
        cryptPasswordDto: CryptPasswordDto,
    ): Promise<CryptedPasswordImpl> {
        const saltRounds = this.configService.get<string>('PASSWORD_SALT_ROUNDS');
        const salt = await bcrypt.genSalt(
            Number.parseInt(saltRounds)
        );
        const hashedPassword = await bcrypt.hash(
            cryptPasswordDto.password,
            salt,
        );

        return { hashedPassword, salt };
    }

    private saveRefreshToken(id: number, refreshToken: string): void {
        this.refreshTokensManager.set(id.toString(), refreshToken, {
            ttl: this.configService.get<number>('TOKENSDB_TTL'),
        });
    }

    private generateTokensByPayload(payload: JwtPayload): TokensImpl {
        const accessToken = this.jwtService.sign(payload, {
            secret: this.configService.get<string>('ACCESS_JWT_SECRET'),
            expiresIn: this.configService.get<string>('ACCESS_JWT_EXPIRES_IN'),
        });

        const refreshToken = this.jwtService.sign(payload, {
            secret: this.configService.get<string>('REFRESH_JWT_SECRET'),
            expiresIn: this.configService.get<string>('REFRESH_JWT_EXPIRES_IN'),
        });

        return { accessToken, refreshToken };
    }
}
