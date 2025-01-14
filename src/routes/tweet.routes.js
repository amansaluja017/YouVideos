import express from "express";
import {
  getUserTweets,
  createTweet,
  updateTweet,
  deleteTweet,
} from "../controllers/tweet.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyJWT);

router.route("/getUserTweet").get(getUserTweets);
router.route("/addTweet").post(createTweet);
router.route("/updateTweet/:tweetId").patch(updateTweet);
router.route("/deleteTweet/:tweetId").delete(deleteTweet);

export default router;
