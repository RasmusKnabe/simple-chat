import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany, ManyToMany, JoinTable } from 'typeorm';
import { Message } from '../../messages/entities/message.entity';
import { User } from '../../users/entities/user.entity';

@Entity()
export class Thread {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    title: string;

    @CreateDateColumn()
    createdAt: Date;

    @OneToMany(() => Message, (message) => message.thread)
    messages: Message[];

    @ManyToMany(() => User, (user) => user.threads)
    @JoinTable()
    participants: User[];
}
