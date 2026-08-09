import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import * as msgpackParser from 'socket.io-msgpack-parser';
import { INestApplicationContext } from '@nestjs/common';

export class MsgpackIoAdapter extends IoAdapter{
    constructor(app: INestApplicationContext) {
        super(app);
    }
    createIOServer(port: number, options?: ServerOptions){
        const server = super.createIOServer(port, {
            ...options,
            parser: msgpackParser,
        });
        return server;
    }
}