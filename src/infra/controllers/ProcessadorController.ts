import { IProcessadorDB } from "../../domain/ports/IProcessadorDB.js";
import { ProcessarVideoUseCase } from "../../domain/usecases/ProcessarVideoUseCase.js";
import { IMessageQueue } from "@/domain/ports/IMessageQueue.js";

export class ProcessadorController {

    constructor(private processadorRepo: IProcessadorDB,
                private messageQueue: IMessageQueue
    ) {}

    processadorVideoUseCase = new ProcessarVideoUseCase(this.processadorRepo)

    async conectarFila(fila: string) {
        // await this.messageQueue.receiveMessage(this.processarVideo.bind(this), fila);    
        await this.messageQueue.receiveMessage(this.processadorVideoUseCase.execute.bind(this.processadorVideoUseCase), fila);
    }

}