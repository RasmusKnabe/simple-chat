import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { UsersService } from '../users/users.service';
import { ThreadsService } from '../threads/threads.service';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly messagesRepository: Repository<Message>,
    private readonly usersService: UsersService,
    private readonly threadsService: ThreadsService,
  ) {}

  async create(createMessageDto: CreateMessageDto) {
    const author = await this.usersService.findOne(createMessageDto.authorId);
    const thread = await this.threadsService.findOne(createMessageDto.threadId);

    const message = this.messagesRepository.create({
      content: createMessageDto.content,
      author,
      thread,
    });
    return await this.messagesRepository.save(message);
  }

  async findAll() {
    return await this.messagesRepository.find({
      relations: { author: true, thread: true }
    });
  }

  async findOne(id: number) {
    const message = await this.messagesRepository.findOne({
      where: { id },
      relations: { author: true, thread: true },
    });
    if (!message) {
      throw new NotFoundException(`Message with ID ${id} not found`);
    }
    return message;
  }

  async update(id: number, updateMessageDto: UpdateMessageDto) {
    const message = await this.findOne(id);
    if (updateMessageDto.content !== undefined) {
      message.content = updateMessageDto.content;
    }
    return await this.messagesRepository.save(message);
  }

  async remove(id: number) {
    const message = await this.findOne(id);
    return await this.messagesRepository.remove(message);
  }

}
