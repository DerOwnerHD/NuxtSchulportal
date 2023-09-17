import express, { Request } from "express";
import dotenv from "dotenv";
dotenv.config();
const app = express();

app.post("/", (req, res) => {
    if (!checkKey(req)) return res.status(401).send({ error: true });
});

app.delete("/", (req, res) => {
    if (!checkKey(req)) return res.status(401).send({ error: true });
});

const checkKey = (req: Request) => req.headers.authorization === process.env.KEY;

app.all("/", (req, res) => {
    res.status(405).send({ error: true });
});
