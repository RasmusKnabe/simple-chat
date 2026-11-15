import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  username: string;
}