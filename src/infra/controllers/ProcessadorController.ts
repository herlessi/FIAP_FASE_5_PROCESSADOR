import { IProcessadorDB } from "../../domain/ports/IProcessadorDB.js";
import { ProcessarVideoUseCase } from "../../domain/usecases/ProcessarVideoUseCase.js";

export class ProcessadorController {
    constructor(private processadorRepo: IProcessadorDB) {}

    async processarVideo(req: Request, res: Response) {  
        const processarVideoUseCase = new ProcessarVideoUseCase(this.processadorRepo);
        processarVideoUseCase.execute(req.body)
    }
}