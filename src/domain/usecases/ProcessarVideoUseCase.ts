export class ProcessarVideoUseCase implements IUseCase<ProcessarVideoInput, ProcessarVideoOutput> {
    constructor(private processadorRepo: IProcessadorDB) {}

    execute(input: ProcessarVideoInput): Promise<ProcessarVideoOutput> {
        // Lógica para processar o vídeo usando o repositório de banco de dados
        // Exemplo: salvar informações do vídeo, atualizar status, etc.
        return Promise.resolve({ success: true });
    }

}