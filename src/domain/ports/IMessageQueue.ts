export interface IMessageQueue {

    sendMessage(message: string, queue: string): Promise<boolean>; 
    receiveMessage(callback: (message: string, channel: any, msg: any) => void, queue: string): Promise<void>;
}