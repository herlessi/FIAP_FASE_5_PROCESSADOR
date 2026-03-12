import fs from "fs";
import { pipeline } from "stream/promises";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3BucketRepo } from "./s3-bucket-repo";

jest.mock("stream/promises", () => ({
  pipeline: jest.fn(),
}));

jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: jest.fn(),
}));

describe("S3BucketRepo", () => {
  const s3 = {
    send: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AWS_BUCKET = "bucket-01";
  });

  it("deve baixar arquivo do S3", async () => {
    const repo = new S3BucketRepo(s3);
    const writeStream = {} as fs.WriteStream;

    jest.spyOn(fs, "existsSync").mockReturnValue(false);
    const mkdirSpy = jest.spyOn(fs, "mkdirSync").mockImplementation(() => undefined);
    jest.spyOn(fs, "createWriteStream").mockReturnValue(writeStream);

    s3.send.mockResolvedValue({ Body: "body-stream" });
    (pipeline as jest.Mock).mockResolvedValue(undefined);

    await repo.downloadFile("uploads/a", "/tmp/a/video.mp4");

    expect(mkdirSpy).toHaveBeenCalledWith("/tmp/a", { recursive: true });
    expect(s3.send).toHaveBeenCalledTimes(1);
    expect(pipeline).toHaveBeenCalledWith("body-stream", writeStream);
  });

  it("deve subir arquivo zip para o bucket", async () => {
    const repo = new S3BucketRepo(s3);
    const readStream = {} as fs.ReadStream;

    jest.spyOn(fs, "createReadStream").mockReturnValue(readStream);
    s3.send.mockResolvedValue({});

    const result = await repo.uploadFile("/tmp/frames.zip", "bucket-01", "frames/abc.zip");

    expect(fs.createReadStream).toHaveBeenCalledWith("/tmp/frames.zip");
    expect(s3.send).toHaveBeenCalledTimes(1);
    expect(result).toBe("uploaded");
  });

  it("deve gerar link de download assinado", async () => {
    const repo = new S3BucketRepo(s3);
    (getSignedUrl as jest.Mock).mockResolvedValue("https://signed-url");

    const result = await repo.getLinkToDownload("bucket-01", "frames/abc.zip", 120);

    expect(getSignedUrl).toHaveBeenCalledWith(s3, expect.anything(), { expiresIn: 120 });
    expect(result).toBe("https://signed-url");
  });
});
