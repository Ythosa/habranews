import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Module } from '@nestjs/common';
import { QueueModule } from 'src/queue/queue.module';

import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';

@Module({
    imports: [QueueModule],
    controllers: [TagsController],
    providers: [TagsService, AmqpConnection],
    exports: [TagsService],
})
export class TagsModule {}
