import { IsString, IsNotEmpty, MaxLength, IsInt } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  content: string;

  @IsInt()
  authorId: number;

  @IsInt()
  threadId: number;
}
