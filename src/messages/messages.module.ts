import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from './entities/message.entity';
import { UsersModule } from '../users/users.module';
import { ThreadsModule } from '../threads/threads.module';

@Module({
  imports: [TypeOrmModule.forFeature([Message]), UsersModule, ThreadsModule],
  controllers: [MessagesController],
  providers: [MessagesService],
})
export class MessagesModule {}

  
