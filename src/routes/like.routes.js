import express from "express";
import {
  toggleVideoLike,
  toggleVideoCommentLike,
  toggleTweetLike,
  getLikedVideos,
} from "../controllers/like.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyJWT);

router.route("/toggle-like/:videoId").post(toggleVideoLike);
router.route("/toggle-comment/:commentId").post(toggleVideoCommentLike);
router.route("/toggle-tweet/:tweetId").post(toggleTweetLike);
router.route("/getLikedVideos").get(getLikedVideos);

export default router;
