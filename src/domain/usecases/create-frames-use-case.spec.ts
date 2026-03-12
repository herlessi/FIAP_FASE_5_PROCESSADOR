import { EventEmitter } from "events";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { CreateFramesUseCase } from "./create-frames-use-case";
import { IRepoFiles } from "../ports/IRepoFiles";

jest.mock("child_process", () => ({
  spawn: jest.fn(),
}));

describe("CreateFramesUseCase", () => {
  const repoFiles: jest.Mocked<IRepoFiles> = {
    downloadFile: jest.fn(),
    uploadFile: jest.fn().mockResolvedValue("uploaded"),
    getLinkToDownload: jest.fn().mockResolvedValue("https://download/url"),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AWS_BUCKET = "bucket-test";
    process.env.FRAME_RATE = "1/2";
  });

  it("deve gerar frames, compactar, enviar para S3 e retornar URL", async () => {
    const useCase = new CreateFramesUseCase(repoFiles);
    jest.spyOn(fs, "existsSync").mockReturnValue(false);
    const mkdirSpy = jest.spyOn(fs, "mkdirSync").mockImplementation(() => undefined);
    const rmSpy = jest.spyOn(fs, "rmSync").mockImplementation(() => undefined);

    const compactarSpy = jest
      .spyOn(useCase, "compactarDiretorio")
      .mockResolvedValue(undefined);
    const uploadSpy = jest
      .spyOn(useCase, "uploadZipToS3")
      .mockResolvedValue("https://download/url");

    const proc = new EventEmitter() as EventEmitter & { on: (event: string, cb: (code: number) => void) => EventEmitter };
    (spawn as jest.Mock).mockReturnValue(proc);

    const promise = useCase.execute({ inputPath: "/tmp/in.mp4", outputDir: "/tmp/frames/123" });
    proc.emit("close", 0);

    const result = await promise;

    expect(mkdirSpy).toHaveBeenCalledWith("/tmp/frames/123", { recursive: true });
    expect(spawn).toHaveBeenCalledWith("ffmpeg", [
      "-i",
      "/tmp/in.mp4",
      "-vf",
      "fps=1/2",
      path.join("/tmp/frames/123", "frame_%04d.jpg"),
    ]);
    expect(compactarSpy).toHaveBeenCalledWith("/tmp/frames/123", "/tmp/frames/123.zip");
    expect(uploadSpy).toHaveBeenCalledWith(
      "/tmp/frames/123.zip",
      "bucket-test",
      "frames_to_download/123.zip"
    );
    expect(rmSpy).toHaveBeenCalledWith("/tmp/frames/123", { recursive: true, force: true });
    expect(result).toBe("https://download/url");
  });

  it("deve rejeitar quando ffmpeg falha", async () => {
    const useCase = new CreateFramesUseCase(repoFiles);
    jest.spyOn(fs, "existsSync").mockReturnValue(true);

    const proc = new EventEmitter() as EventEmitter & { on: (event: string, cb: (code: number) => void) => EventEmitter };
    (spawn as jest.Mock).mockReturnValue(proc);

    const promise = useCase.execute({ inputPath: "/tmp/in.mp4", outputDir: "/tmp/frames/123" });
    proc.emit("close", 1);

    await expect(promise).rejects.toThrow("FFmpeg exited with code 1");
  });

  it("deve delegar upload e assinatura para o repositorio de arquivos", async () => {
    const useCase = new CreateFramesUseCase(repoFiles);

    const result = await useCase.uploadZipToS3("/tmp/frames.zip", "bucket", "frames_to_download/abc.zip");

    expect(repoFiles.uploadFile).toHaveBeenCalledWith("/tmp/frames.zip", "bucket", "frames_to_download/abc.zip");
    expect(repoFiles.getLinkToDownload).toHaveBeenCalledWith(
      "bucket",
      "frames_to_download/abc.zip",
      60 * 60
    );
    expect(result).toBe("https://download/url");
  });
});
