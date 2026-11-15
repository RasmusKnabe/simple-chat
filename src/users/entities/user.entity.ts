import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany, ManyToMany } from 'typeorm';
import { Message } from '../../messages/entities/message.entity';
import { Thread } from '../../threads/entities/thread.entity';

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    username: string;

    @CreateDateColumn()
    createdAt: Date;

    @OneToMany(() => Message, (message) => message.author)
    messages: Message[];

    @ManyToMany(() => Thread, (thread) => thread.participants)
    threads: Thread[];
}
