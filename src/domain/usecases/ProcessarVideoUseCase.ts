import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { pipeline } from "stream/promises";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createWriteStream } from "fs";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import archiver from "archiver";
import { IUseCase } from "../ports/IUseCase.js";

export class ProcessarVideoUseCase implements IUseCase<any, any> {
    constructor() {}

    // 👇 Aqui está o s3
    private s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
    });

    async execute(id: string): Promise<any> { 
        console.log("Processando vídeo dentro do use case com ID:", id);
        // await this.downloadVideo(`uploads/${id}.mp4`, `/tmp/${id}.mp4`);
        const videoPathDownload = path.join(process.env.VIDEO_DOWNLOAD_PATH!,id, `${id}.mp4`);
        await this.downloadVideo(`uploads/${id}`, videoPathDownload);

        if (!fs.existsSync(videoPathDownload)) {
            throw new Error(`Video file not found at ${videoPathDownload}`);
        }
        
        const framesOutputDir = path.join(process.env.VIDEO_FRAMES_PATH!, `${id}`);
        await this.generateFrames(videoPathDownload, framesOutputDir);

        console.log("Vídeo baixado com sucesso para processamento, ID:", id);
        // Lógica para processar o vídeo usando o repositório de banco de dados
        // Exemplo: salvar informações do vídeo, atualizar status, etc.
        return Promise.resolve({ success: true });
    }

    async downloadVideo(key: string, outputPath: string) {
        const command = new GetObjectCommand({
            Bucket: process.env.AWS_BUCKET!,
            Key: key,
        });

        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const response = await this.s3.send(command);

        await pipeline(
            response.Body as any,
            createWriteStream(outputPath)
        );
    }

    async generateFrames(inputPath: string,outputDir: string): Promise<void> {

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const fps = process.env.FRAME_RATE || "1/5"; // Exemplo: 1 frame a cada 5 segundos

        return new Promise((resolve, reject) => {
            const ffmpeg = spawn("ffmpeg", [
                "-i",
                inputPath,
                "-vf",
                `fps=${fps}`,
                path.join(outputDir, "frame_%04d.jpg"),
            ]);

            // Log de saída do ffmpeg para depuração
            // ffmpeg.stderr.on("data", (data) => {
            //  console.log(`ffmpeg: ${data}`);
            // });

            ffmpeg.on("close", (code) => {
                if (code === 0) {
                    this.compactarDiretorio(outputDir, `${outputDir}.zip`)
                        .then(async (res) => {
                            console.log('Frames compactados com sucesso:', `${outputDir}.zip`);
                            const urlToDownload = await this.uploadZipToS3(`${outputDir}.zip`, process.env.AWS_BUCKET!, `frames_to_download/${path.basename(outputDir)}.zip`)
                            console.log('URL para download:', urlToDownload);
                            // Limpar os arquivos de frames após compactar
                            fs.rmSync(outputDir, { recursive: true, force: true });
                            resolve();
                        })
                        .catch(reject);
                } else {
                    reject(new Error(`FFmpeg exited with code ${code}`));
                }
            });
        });
    }

    async compactarDiretorio(inputDir: string, outputPath: string): Promise<void> {

        return new Promise((resolve, reject) => {
            const output = fs.createWriteStream(outputPath);
            const archive = archiver("zip", { zlib: { level: 9 } });

            output.on("close", resolve);
            archive.on("error", reject);

            archive.pipe(output);
            archive.directory(inputDir, false);
            archive.finalize();
        });

    }


    async uploadZipToS3(filePath: string, bucketName: string, key: string) {
        const fileStream = fs.createReadStream(filePath);

        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: key, // Nome que o arquivo terá no S3
            Body: fileStream,
            ContentType: "application/zip",
        });

        await this.s3.send(command);
        console.log(`Arquivo ${key} enviado para o bucket ${bucketName}!`);
         
        // 2️⃣ Gerar link temporário
        const commandget = new GetObjectCommand({
            Bucket: bucketName,
            Key: key,
        });

        const url = await getSignedUrl(this.s3, commandget, { expiresIn: 60 * 60 }); // 1 hora
        return url;
    }

}