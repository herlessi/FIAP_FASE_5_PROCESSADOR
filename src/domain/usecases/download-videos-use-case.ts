import { IRepoFiles } from "../ports/IRepoFiles.js";
import { IUseCase } from "../ports/IUseCase.js";
import path from "path";
import fs from "fs";

export class DownloadVideosUseCase  implements IUseCase<string, string> {

    constructor(private repoFiles: IRepoFiles) {}   

    async execute(id: string): Promise<string> { 
        const videoPathDownload = path.join(process.env.VIDEO_DOWNLOAD_PATH!, id, `${id}.mp4`);
        await this.repoFiles.downloadFile(`uploads/${id}`, videoPathDownload);
        if (!fs.existsSync(videoPathDownload)) {
            throw new Error(`Video file not found at ${videoPathDownload}`);
        }
        return videoPathDownload
    }

}