import { IRepoFiles } from "../../domain/ports/IRepoFiles.js";
import { IProcessadorDB } from "../../domain/ports/IProcessadorDB.js";
import { ProcessarVideoUseCase } from "../../domain/usecases/ProcessarVideoUseCase.js";
import { IMessageQueue } from "../../domain/ports/IMessageQueue.js";
import { DownloadVideosUseCase } from "../../domain/usecases/download-videos-use-case.js";
import { CreateFramesUseCase } from "../../domain/usecases/create-frames-use-case.js";
import path from "path";
import {
    videoMessagesReceivedTotal,
    videoProcessDurationSeconds,
    videoProcessFailureTotal,
    videoProcessSuccessTotal,
} from "../observability/metrics.js";

export class ProcessadorControllerAux {

    constructor(private processadorRepo: IProcessadorDB,
                private messageQueue: IMessageQueue,
                private repoFiles: IRepoFiles
    ) {}

    processadorVideoUseCase = new ProcessarVideoUseCase()

    

    async conectarFila(fila: string) {
        await this.messageQueue.receiveMessage(this.processarVideo.bind(this), fila);
    }

    async processarVideo(id: string, channel: any, msg: any) {
        const stopTimer = videoProcessDurationSeconds.startTimer();
        videoMessagesReceivedTotal.inc({ queue: "video_to_process_queue" });

        //novos
        const downloadVideosUseCase = new DownloadVideosUseCase(this.repoFiles);
        const createFramesUseCase = new CreateFramesUseCase(this.repoFiles);
       
        //baixando o video usando o use case de download
        downloadVideosUseCase.execute(id)
            .then((videoPath) => {
                // Criando frames a partir do vídeo baixado
                const framesOutputDir = path.join(process.env.VIDEO_FRAMES_PATH!, `${id}`);
                createFramesUseCase.execute({ inputPath: videoPath, outputDir: framesOutputDir })
                    .then(async (urlToDownload) => {
                        channel.ack(msg); // confirma que a mensagem foi processada
                        await this.messageQueue.sendMessage(JSON.stringify({ id, urlToDownload }), "frames_ready_to_download_queue");
                        videoProcessSuccessTotal.inc();
                        stopTimer();
                        console.log("Frames criados e URL para download gerada, ID:", id, "URL:", urlToDownload);
                    })
                    .catch((error) => {
                        videoProcessFailureTotal.inc({ stage: "create_frames" });
                        stopTimer();
                        console.error("Erro ao criar frames, ID:", id, "Erro:", error);
                    });
            })
            .catch((error) => {
                videoProcessFailureTotal.inc({ stage: "download_video" });
                stopTimer();
                console.error("Erro ao baixar o vídeo, ID:", id, "Erro:", error);
            });

        
    }

}