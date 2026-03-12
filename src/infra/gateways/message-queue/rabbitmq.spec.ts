import amqp from "amqplib";
import { RabbitMQ } from "./rabbitmq";

jest.mock("amqplib", () => ({
  __esModule: true,
  default: {
    connect: jest.fn(),
  },
}));

describe("RabbitMQ", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deve enviar mensagem com sucesso", async () => {
    const channel = {
      assertQueue: jest.fn().mockResolvedValue(undefined),
      sendToQueue: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    };
    const connection = {
      createChannel: jest.fn().mockResolvedValue(channel),
      close: jest.fn().mockResolvedValue(undefined),
    };

    (amqp.connect as jest.Mock).mockResolvedValue(connection);

    const rabbit = new RabbitMQ();
    const result = await rabbit.sendMessage("hello", "fila-a");

    expect(amqp.connect).toHaveBeenCalled();
    expect(channel.assertQueue).toHaveBeenCalledWith("fila-a", { durable: true });
    expect(channel.sendToQueue).toHaveBeenCalledWith("fila-a", Buffer.from("hello"), {
      persistent: true,
    });
    expect(channel.close).toHaveBeenCalled();
    expect(connection.close).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it("deve retornar false ao falhar no envio", async () => {
    (amqp.connect as jest.Mock).mockRejectedValue(new Error("erro"));

    const rabbit = new RabbitMQ();
    const result = await rabbit.sendMessage("hello", "fila-a");

    expect(result).toBe(false);
  });

  it("deve consumir mensagem e repassar para callback", async () => {
    const fakeMsg = { content: Buffer.from("payload") };
    let consumeHandler: ((msg: any) => void) | undefined;

    const channel = {
      assertQueue: jest.fn().mockResolvedValue(undefined),
      prefetch: jest.fn(),
      consume: jest.fn((_: string, cb: (msg: any) => void) => {
        consumeHandler = cb;
      }),
    };
    const connection = {
      createChannel: jest.fn().mockResolvedValue(channel),
    };

    (amqp.connect as jest.Mock).mockResolvedValue(connection);

    const callback = jest.fn();
    const rabbit = new RabbitMQ();

    await rabbit.receiveMessage(callback, "fila-b");

    expect(channel.assertQueue).toHaveBeenCalledWith("fila-b", { durable: true });
    expect(channel.prefetch).toHaveBeenCalledWith(1);
    expect(channel.consume).toHaveBeenCalled();

    consumeHandler?.(fakeMsg);

    expect(callback).toHaveBeenCalledWith("payload", channel, fakeMsg);
  });
});
