import { Module } from '@nestjs/common';

import { configModule } from './configure.root';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';

@Module({
    imports: [configModule, AuthModule, UserModule],
})
export class AppModule {}
