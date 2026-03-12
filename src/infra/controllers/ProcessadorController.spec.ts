import { ProcessadorController } from "./ProcessadorController";
import { IMessageQueue } from "../../domain/ports/IMessageQueue";

describe("ProcessadorController", () => {
  it("deve conectar fila com callback do use case", async () => {
    const messageQueue: jest.Mocked<IMessageQueue> = {
      sendMessage: jest.fn(),
      receiveMessage: jest.fn().mockResolvedValue(undefined),
    };

    const controller = new ProcessadorController(messageQueue);
    const executeSpy = jest
      .spyOn(controller.processadorVideoUseCase, "execute")
      .mockResolvedValue({ success: true });

    await controller.conectarFila("video_to_process_queue");

    expect(messageQueue.receiveMessage).toHaveBeenCalledTimes(1);
    const [callback, queue] = messageQueue.receiveMessage.mock.calls[0];
    expect(queue).toBe("video_to_process_queue");

    await callback("video-id", {} as any, {} as any);
    expect(executeSpy).toHaveBeenCalledWith("video-id", expect.anything(), expect.anything());
  });
});
