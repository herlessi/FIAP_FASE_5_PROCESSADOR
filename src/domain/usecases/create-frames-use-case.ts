import fs from "fs";
import { spawn } from "child_process";
import { IUseCase } from "../ports/IUseCase.js";
import path from "path";
import archiver from "archiver";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { IRepoFiles } from "../ports/IRepoFiles.js";

export class CreateFramesUseCase implements IUseCase<{ inputPath: string , outputDir: string }, string> {

    constructor(private repoFiles: IRepoFiles) {}

    async execute({ inputPath, outputDir }: { inputPath: string, outputDir: string }): Promise<string> {
        // Lógica para criar frames a partir do vídeo
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
                            const urlToDownload = await this.uploadZipToS3(`${outputDir}.zip`, process.env.AWS_BUCKET!, `frames_to_download/${path.basename(outputDir)}.zip`)
                            // Limpar os arquivos de frames após compactar
                            fs.rmSync(outputDir, { recursive: true, force: true });
                            resolve(urlToDownload);
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
        this.repoFiles.uploadFile(filePath, bucketName, key);
        // 2️⃣ Gerar link temporário
        const urlToDownload = await this.repoFiles.getLinkToDownload(bucketName, key, 60 * 60); // 1 hora
        return urlToDownload;
    }
        // const fileStream = fs.createReadStream(filePath);

        // const command = new PutObjectCommand({
        //     Bucket: bucketName,
        //     Key: key, // Nome que o arquivo terá no S3
        //     Body: fileStream,
        //     ContentType: "application/zip",
        // });

        // await this.s3.send(command);
        // console.log(`Arquivo ${key} enviado para o bucket ${bucketName}!`);
            
        // // 2️⃣ Gerar link temporário
        // const commandget = new GetObjectCommand({
        //     Bucket: bucketName,
        //     Key: key,
        // });

        // const url = await getSignedUrl(this.s3, commandget, { expiresIn: 60 * 60 }); // 1 hora
        // return url;
   // }

}