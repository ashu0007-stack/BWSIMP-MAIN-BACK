import express from "express";
import { auth } from "../middleware/authMiddleware.js";
//import { getAllWUAs } from "../controllers/wrd/wuaController.js"

const router = express.Router();

//router.get("/wuaDetails", auth, getAllWUAs);

export default router;
