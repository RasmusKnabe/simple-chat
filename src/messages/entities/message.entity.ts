import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { Thread } from '../../threads/entities/thread.entity';
import { User } from '../../users/entities/user.entity';

@Entity()
export class Message {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    content: string;

    @CreateDateColumn()
    createdAt: Date;

    @ManyToOne(() => Thread, (thread) => thread.messages, { nullable: false})
    thread: Thread;

    @ManyToOne(() => User, (user) => user.messages, { nullable: false})
    author: User;
    
}
