import fs from "fs";
import path from "path";
import { DownloadVideosUseCase } from "./download-videos-use-case";
import { IRepoFiles } from "../ports/IRepoFiles";

describe("DownloadVideosUseCase", () => {
  const repoFiles: jest.Mocked<IRepoFiles> = {
    downloadFile: jest.fn(),
    uploadFile: jest.fn(),
    getLinkToDownload: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.VIDEO_DOWNLOAD_PATH = "/tmp/videos";
  });

  it("deve baixar e retornar o caminho do video", async () => {
    const useCase = new DownloadVideosUseCase(repoFiles);
    jest.spyOn(fs, "existsSync").mockReturnValue(true);

    const result = await useCase.execute("abc123");

    const expectedPath = path.join("/tmp/videos", "abc123", "abc123.mp4");
    expect(repoFiles.downloadFile).toHaveBeenCalledWith("uploads/abc123", expectedPath);
    expect(result).toBe(expectedPath);
  });

  it("deve lançar erro quando arquivo nao existe", async () => {
    const useCase = new DownloadVideosUseCase(repoFiles);
    jest.spyOn(fs, "existsSync").mockReturnValue(false);

    await expect(useCase.execute("abc123")).rejects.toThrow(
      /Video file not found at .*abc123[\\/]abc123\.mp4/
    );
  });
});
