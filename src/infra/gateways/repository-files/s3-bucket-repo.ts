import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import { createWriteStream } from "fs";
import path from "path";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { pipeline } from "stream/promises";
import { IRepoFiles } from "@/domain/ports/IRepoFiles";

export class S3BucketRepo implements IRepoFiles {
 
    constructor(private s3: S3Client) {}

    async downloadFile(key: string, outputPath: string) {
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

    async uploadFile(filePath: string, bucketName: string, key: string) {
        const fileStream = fs.createReadStream(filePath);

        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: key, // Nome que o arquivo terá no S3
            Body: fileStream,
            ContentType: "application/zip",
        });

        await this.s3.send(command);
        console.log(`Arquivo ${key} enviado para o bucket ${bucketName}!`);
            
        
    }



    async getLinkToDownload(bucketName: string, key: string, expiresIn: number = 3600): Promise<string> {

        // 2️⃣ Gerar link temporário
        const commandget = new GetObjectCommand({
            Bucket: bucketName,
            Key: key,
        });

        const url = await getSignedUrl(this.s3, commandget, { expiresIn }); // 1 hora
        return url;

    }
    

}