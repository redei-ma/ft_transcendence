//import { IoAdapter } from '@nestjs/platform-socket.io';
//import { ServerOptions } from 'socket.io';
//import * as msgpackParser from 'socket.io-msgpack-parser';

//classe per abilitare il parser nel server verra' usata una volta che anche il frontend sara' allineato
//export class MsgpackIoAdapter extends IoAdapter{
//    createIOserver(port: number, options?: ServerOptions){
//        const server = super.createIOserver(port, {
//            ...options,
//            parser: msgpackParser,
//        });
//        return server;
//    }
//}