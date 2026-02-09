import express from "express";
import processadorRouter from "./infra/routes/processador.ts";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (req, res) => {
	res.json({ message: "Servidor Express rodando" });
});

app.use("/processador", processadorRouter);

app.listen(port, () => {
	console.log(`Servidor iniciado na porta ${port}`);
});
