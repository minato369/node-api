import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import router from "./functions/router.js";
import cookieParser from "cookie-parser";
dotenv.config();

const app = express();
app.use(bodyParser.json());

app.use(cors({
	origin:"http://localhost:8081",
	credentials:true
}));

app.use(cookieParser());
app.use('/api', router); // Use the router here

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
	console.log(`Running on port http://localhost:${PORT}`);
});
