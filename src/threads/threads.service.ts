import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Thread } from './entities/thread.entity';
import { CreateThreadDto } from './dto/create-thread.dto';
import { UpdateThreadDto } from './dto/update-thread.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class ThreadsService {
  constructor(
    @InjectRepository(Thread)
    private readonly threadsRepository: Repository<Thread>,
    private readonly usersService: UsersService,
  ) {}

  async create(createThreadDto: CreateThreadDto) {
    const thread = this.threadsRepository.create(createThreadDto);
    return await this.threadsRepository.save(thread);
  }

  async findAll() {
    return await this.threadsRepository.find();
  }

  async findOne(id: number) {
    const thread = await this.threadsRepository.findOne({
      where: { id },
      relations: { participants: true },
    });
    if (!thread) {
      throw new NotFoundException(`Thread with ID ${id} not found`);
    }
    return thread;
  }

  async update(id: number, updateThreadDto: UpdateThreadDto) {
    const thread = await this.findOne(id);
    Object.assign(thread, updateThreadDto);
    return await this.threadsRepository.save(thread);
  }

  async remove(id: number) {
    const thread = await this.findOne(id);
    return await this.threadsRepository.remove(thread);
  }

  async addParticipant(threadId: number, userId: number) {
    const thread = await this.findOne(threadId);
    const user = await this.usersService.findOne(userId);

    const alreadyIn = thread.participants.some((p) => p.id === user.id);
    if (!alreadyIn) {
      thread.participants.push(user);
    }
    return await this.threadsRepository.save(thread);
  }

  async removeParticipant(threadId: number, userId: number) {
    const thread = await this.findOne(threadId);
    thread.participants = thread.participants.filter((p) => p.id !== userId);
    return await this.threadsRepository.save(thread);
  }

}
