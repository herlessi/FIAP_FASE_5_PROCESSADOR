export interface IRepoFiles {
    downloadFile(key: string, outputPath: string): Promise<void>;
    uploadFile(filePath: string, bucketName: string, key: string): Promise<string>;
    getLinkToDownload(bucketName: string, key: string, expiresIn?: number): Promise<string>;
}