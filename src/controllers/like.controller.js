import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose, { isValidObjectId } from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { Video } from "../models/video.models.js";
import { User } from "../models/user.models.js";
import { Comment } from "../models/comment.models.js";
import { Tweet } from "../models/tweet.models.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Like } from "../models/like.models.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video");
  }

  try {
    const videoLikes = await Video.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(videoId),
        },
      },
      {
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "video",
          as: "likes",
        },
      },
      {
        $addFields: {
          likesCount: {
            $size: "$likes",
          },
          likes: {
            $last: "$likes",
          },
        },
      },
    ]);
    const user = await User.findById(req.user?._id).select("userName");

    const like = await Like.create({
      likedBy: user._id,
      video: videoId,
    });

    const likeCreated = await Like.findById(like._id);

    if (!likeCreated) {
      throw new ApiError(400, "Failed to like video");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, videoLikes, "liked successfully"));
  } catch (err) {
    throw new ApiError(500, "internal error");
  }
});

const toggleVideoCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment");
  }

  try {
    const commentLikes = await Comment.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(commentId),
        },
      },
      {
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "comment",
          as: "likes",
        },
      },
      {
        $addFields: {
          likesCount: {
            $size: "$likes",
          },
          likes: {
            $last: "$likes",
          },
        },
      },
    ]);
    const user = await User.findById(req.user?._id).select("userName");

    const like = await Like.create({
      likedBy: user._id,
      comment: commentId,
    });

    const likeCreated = await Like.findById(like._id);

    if (!likeCreated) {
      throw new ApiError(400, "Failed to like video");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, commentLikes, "liked successfully"));
  } catch (err) {
    throw new ApiError(500, "internal error");
  }
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet");
  }

  try {
    const tweetLikes = await Tweet.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(tweetId),
        },
      },
      {
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "tweet",
          as: "likes",
        },
      },
      {
        $addFields: {
          likesCount: {
            $size: "$likes",
          },
          likes: {
            $last: "$likes",
          },
        },
      },
    ]);
    const user = await User.findById(req.user?._id).select("userName");

    const like = await Like.create({
      likedBy: user._id,
      tweet: tweetId,
    });

    const likeCreated = await Like.findById(like._id);

    if (!likeCreated) {
      throw new ApiError(400, "Failed to like tweet");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, tweetLikes, "liked successfully"));
  } catch (err) {
    throw new ApiError(500, "internal error");
  }
});

const getLikedVideos = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id);

  const likedVideo = await Like.aggregate([
    {
      $match: {
        likedBy: user._id,
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "video",
      },
    },
    {
      $addFields: {
        video: {
          $arrayElemAt: ["$video", 0],
        },
      },
    },
    {
      $project: {
        video: {
          _id: 1,
          title: 1,
          description: 1,
          videoFile: 1,
          thumbnail: 1,
          createdAt: 1,
        },
      },
    },
  ]);
  return res
    .status(200)
    .json(
      new ApiResponse(200, likedVideo, "liked videos fetched successfully")
    );
});

export {
  toggleVideoLike,
  toggleVideoCommentLike,
  toggleTweetLike,
  getLikedVideos,
};
