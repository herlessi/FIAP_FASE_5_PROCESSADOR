import { IMessageQueue } from "../../../domain/ports/IMessageQueue";
import amqp from 'amqplib';

export class RabbitMQ implements IMessageQueue {

    async sendMessage(message: string, queue: string): Promise<boolean> {

        try {

            // URL do RabbitMQ (padrão: guest/guest em localhost)
            const connection = await amqp.connect('amqp://guest:guest@localhost:5672');
            const channel = await connection.createChannel();

            await channel.assertQueue(queue, { durable: true }); // garante persistência
            channel.sendToQueue(queue, Buffer.from(message), { persistent: true });

            console.log("Mensagem enviada:", message);

            await channel.close();
            await connection.close();
            
            return true;

        } catch (error) {
            console.error("Erro ao enviar mensagem:", error);
            return false;
        }
    }


    async receiveMessage(callback: (message: string, channel: amqp.Channel, msg: amqp.ConsumeMessage) => void, queue: string): Promise<void> {
        const connection = await amqp.connect('amqp://guest:guest@localhost:5672');
        const channel = await connection.createChannel();

        await channel.assertQueue(queue, { durable: true });

        channel.prefetch(1); // processa uma mensagem por vez

        console.log("Aguardando mensagens na fila", queue);

        channel.consume(queue, msg => {
            if (msg !== null) {
            const content = msg.content.toString();
            callback(content, channel, msg); // passa o canal e a mensagem para o callback

            // // Simula processamento
            // setTimeout(() => {
            //     channel.ack(msg); // confirma que a mensagem foi processada
            // }, 1000);
            }
        });
    }

}