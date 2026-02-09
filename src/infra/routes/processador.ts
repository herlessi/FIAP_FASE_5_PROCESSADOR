import express from "express";
import { ProcessadorRepo } from "../gateways/PrismaPostgres/ProcessadorRepo.js";
import { ProcessadorController } from "../controllers/ProcessadorController.js";

const repo = new ProcessadorRepo();
const processadorController = new ProcessadorController(repo);


const router = express.Router();

router.get("/", (req, res) => {
  res.json({ message: "Rota processador ativa" });
});

router.post("/processar", (req, res) => {
  processadorController.processarVideo(req, res);
})
  

export default router;
