// import express from "express";
// import processadorRouter from "./infra/routes/processador.ts";

// import dotenv from "dotenv";
// dotenv.config();


// const app = express();
// const port = process.env.PORT || 3000;

// app.use(express.json());

// app.get("/", (req, res) => {
// 	res.json({ message: "Servidor Express rodando" });
// });

// app.use("/processador", processadorRouter);

// app.listen(port, () => {
// 	console.log(`Servidor iniciado na porta ${port}`);
// });

// import { ProcessadorController } from "./infra/controllers/ProcessadorController";
import { ProcessadorControllerAux } from "./infra/controllers/ProcessadorControllerAux.js";
import { ProcessadorRepo } from "./infra/gateways/PrismaPostgres/ProcessadorRepo.js";
import { RabbitMQ } from "./infra/gateways/message-queue/rabbitmq.js";
import { S3BucketRepo } from "./infra/gateways/repository-files/s3-bucket-repo.js";
import { S3Client } from "@aws-sdk/client-s3";

const messageQueue = new RabbitMQ();
const repo = new ProcessadorRepo();

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});
const s3repo = new S3BucketRepo(s3);
// const processadorController = new ProcessadorController(repo, messageQueue);
const processadorController = new ProcessadorControllerAux(repo, messageQueue, s3repo);
processadorController.conectarFila("video_to_process_queue");
