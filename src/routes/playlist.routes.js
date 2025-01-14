import express from "express";
import {
  createPlaylist,
  getUserPlaylist,
  getPlaylistById,
  addVideoToPlaylist,
  updatePlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
} from "../controllers/playlist.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyJWT);

router.route("/createPlaylist").post(createPlaylist);
router.route("/UserPlaylist/:userId").get(getUserPlaylist);
router.route("/getPlaylist/:playlistId").get(getPlaylistById);
router.route("/addVideo/:videoId/:playlistId").patch(addVideoToPlaylist);
router.route("/updatePlaylist/:playlistId").patch(updatePlaylist);
router
  .route("/removeVideo/:videoId/:playlistId")
  .patch(removeVideoFromPlaylist);
router.route("/deletePlaylist/:playlistId").delete(deletePlaylist);

export default router;
