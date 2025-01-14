import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose, { isValidObjectId } from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { Playlist } from "../models/playlist.models.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  if (!(name || description)) {
    throw new ApiError(400, "Enter a name or description of a playlist");
  }

  const user = await User.findById(req.user?._id).select("userName avatar");

  const playlist = await Playlist.create({
    name,
    description,
    owner: user,
  });

  const createdPlaylist = await Playlist.findById(playlist._id);

  if (!createdPlaylist) {
    throw new ApiError(500, "internal error: playlist cannot be created");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, createdPlaylist, "playlist successfully created")
    );
});

const getUserPlaylist = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user id");
  }

  const playlist = await Playlist.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "createdBy",
      },
    },
    {
      $unwind: "$createdBy",
    },
    {
      $project: {
        _id: 1,
        name: 1,
        description: 1,
        createdAt: 1,
        updatedAt: 1,
        owner: {
          _id: "$createdBy._id",
          userName: "$createdBy.userName",
          avatar: "$createdBy.avatar",
        },
      },
    },
  ]);

  if (!playlist?.length) {
    throw new ApiError(404, "No playlists found for this user");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "playlist fetched successfully"));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  if (!(isValidObjectId(playlistId) || isValidObjectId(videoId))) {
    throw new ApiError(400, "Invalid playlist or video id");
  }

  const user = await User.findById(req.user?._id);
  const userId = user._id;

  const playlist = await Playlist.findById(playlistId).select("owner -_id");
  console.log(userId, playlist.owner);

  if (!userId.equals(playlist.owner)) {
    throw new ApiError(
      403,
      "You are not authorized to add videos to this playlist"
    );
  }

  const updatePlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $push: {
        videos: new mongoose.Types.ObjectId(videoId),
      },
    },
    { new: true }
  );

  if (!updatePlaylist) {
    throw new ApiError(
      500,
      "internal error: video cannot be added to the playlist"
    );
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatePlaylist,
        "video added successfully to the playlist"
      )
    );
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist id");
  }

  const playlist = await Playlist.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(playlistId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "createdBy",
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
      },
    },
    {
      $unwind: "$createdBy",
    },
    {
      $addFields: {
        totalVideos: { $size: "$videos" },
      },
    },
    {
      $project: {
        createdBy: {
          refreshAccessToken: 0,
          refreshToken: 0,
          coverImage: 0,
          password: 0,
          watchHistory: 0,
          email: 0,
          updatedAt: 0,
          __v: 0,
        },
        videos: {
          isPublished: 0,
          owner: 0,
          updatedAt: 0,
          __v: 0,
          refreshAccessToken: 0,
          refreshToken: 0,
        },
        owner: 0,
      },
    },
  ]);

  if (!playlist?.length) {
    throw new ApiError(404, "Playlist not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "playlist fetched successfully"));
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;

  if (isValidObjectId(playlistId) === false) {
    throw new ApiError(400, "Invalid playlist id");
  }

  if (!(name || description)) {
    throw new ApiError(400, "Enter a name or description of the playlist");
  }

  const playlist =
    await Playlist.findById(playlistId).select("name description");
  const playlistName = playlist.name;
  const playlistDescription = playlist.description;

  if (playlistName === name) {
    throw new ApiError(400, "Enter new playlist name");
  }

  if (playlistDescription === description) {
    throw new ApiError(400, "Enter new playlist description");
  }

  const playlistUser = await Playlist.findById(playlistId).select("owner");
  const playlistOwner = playlistUser.owner;

  if (!playlistOwner.equals(req.user?._id)) {
    throw new ApiError(403, "You are not authorized to update this playlist");
  }

  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      name,
      description,
    },
    { new: true }
  );

  if (!updatedPlaylist) {
    throw new ApiError(500, "internal error: playlist cannot be updated");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedPlaylist, "playlist updated successfully")
    );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  if (!playlistId) {
    throw new ApiError(400, "Invalid playlist id");
  }

  if (!videoId) {
    throw new ApiError(400, "Invalid video id");
  }

  const playlistOwner =
    await Playlist.findById(playlistId).select("owner -_id");

  if (!req.user?._id.equals(playlistOwner.owner)) {
    throw new ApiError(
      403,
      "You are not authorized to remove videos to this playlist"
    );
  }

  const playlistVideo = await Playlist.findById(playlistId).select("videos");
  const playlistVideos = playlistVideo.videos;

  if (!playlistVideos.includes(videoId)) {
    throw new ApiError(404, "Video not found in the playlist");
  }

  const playlist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $pull: {
        videos: videoId,
      },
    },
    { new: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "video removed successfully"));
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist id");
  }

  const playlistOwner =
    await Playlist.findById(playlistId).select("owner -_id");

  if (!req.user?._id.equals(playlistOwner.owner)) {
    throw new ApiError(403, "You are not authorized to delete this playlist");
  }

  const playlist = await Playlist.findByIdAndDelete(playlistId);

  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "playlist deleted successfully"));
});

export {
  createPlaylist,
  getUserPlaylist,
  getPlaylistById,
  addVideoToPlaylist,
  updatePlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
};
