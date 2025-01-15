import express from "express";
import { healthCheck } from "../controllers/healthCheck.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyJWT);

router.route("/health-check").get(healthCheck);

export default router;
