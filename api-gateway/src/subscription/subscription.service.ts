import {Inject, Injectable, Logger, OnModuleInit} from '@nestjs/common';

import {SubscribeDto} from './dto/subscribe.dto';
import {ClientGrpc} from '@nestjs/microservices';
import {IUserService} from './interfaces/user-service.interface';
import {AddUserDto} from './interfaces/add-user.dto';
import { IUser } from './interfaces/user.interface';

@Injectable()
export class SubscriptionService implements OnModuleInit {
    private logger = new Logger(SubscriptionService.name);

    private userService: any;

    constructor(@Inject('USER_PACKAGE') private client: ClientGrpc) {}

    onModuleInit() {
        this.userService = this.client.getService<IUserService>('UserService');
    }

    async subscribe(subscribeDto: SubscribeDto): Promise<void> {
        this.logger.log(
            `Subscribing with data: ${JSON.stringify(subscribeDto)}`,
        );
        await this.addUser(subscribeDto as AddUserDto);
    }

    // private async makeTagCheckable(): Promise<void> {}

    private async addUser(addUserDto: AddUserDto): Promise<IUser> {
        this.logger.log(`Adding user with data: ${JSON.stringify(addUserDto)}`);
        return this.userService.addUser(addUserDto).toPromise();
    }
}
