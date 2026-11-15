import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ThreadsService } from './threads.service';
import { CreateThreadDto } from './dto/create-thread.dto';
import { UpdateThreadDto } from './dto/update-thread.dto';
import { AddParticipantDto } from './dto/add-participant.dto';

@Controller('threads')
export class ThreadsController {
  constructor(private readonly threadsService: ThreadsService) {}

  @Post()
  create(@Body() createThreadDto: CreateThreadDto) {
    return this.threadsService.create(createThreadDto);
  }

  @Get()
  findAll() {
    return this.threadsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.threadsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateThreadDto: UpdateThreadDto) {
    return this.threadsService.update(+id, updateThreadDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.threadsService.remove(+id);
  }

  @Post(':id/participants')
  addParticipant(@Param('id') id: string, @Body() dto: AddParticipantDto) {
    return this.threadsService.addParticipant(+id, dto.userId);
  }

  @Delete(':id/participants/:userId')
  removeParticipant(@Param('id') id: string, @Param('userId') userId: string) {
    return this.threadsService.removeParticipant(+id, +userId);
  }

}
