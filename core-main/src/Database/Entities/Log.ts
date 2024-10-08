import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "logs" })
export class Log
{
    @PrimaryGeneratedColumn("increment")
    logID: number

    @Column("text")
    currentUserEmail: string

    @Column("datetime")
    time: Date

    @Column("integer")
    errorCode: number

    @Column("text")
    message: string

    @Column("text")
    callStack: string;

    constructor() { }
}