import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose, { isValidObjectId } from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { Tweet } from "../models/tweet.models.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const getUserTweets = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const tweetQuery = await Tweet.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(req.user?._id),
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
        _id: 0,
        updatedAt: 0,
        createdBy: {
          _id: 0,
          updatedAt: 0,
          refreshAccessToken: 0,
          refreshToken: 0,
          coverImage: 0,
          password: 0,
          email: 0,
          watchHistory: 0,
          __v: 0,
        },
      },
    },
    {
      $sort: { createdAt: -1 },
    },
    {
      $skip: (page - 1) * limit,
    },
    {
      $limit: limit,
    },
  ]);

  if (tweetQuery.length < 0) {
    throw new ApiResponse(200, "You do not write any tweets");
  }

  const tweetCount = await Tweet.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $count: "Your tweets",
    },
  ]);

  if (tweetCount === 0) {
    return new ApiResponse(200, null, "you have no tweets");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { tweetQuery, tweetCount },
        "tweet fetched successfully"
      )
    );
});

const createTweet = asyncHandler(async (req, res) => {
  const { content } = req.body;

  if (!content) {
    throw new ApiError(400, "Enter tweet content");
  }

  const user = await User.findById(req.user?._id).select("userName avatar");

  const tweet = await Tweet.create({
    content,
    owner: user,
  });

  if (!tweet) {
    throw new ApiError(400, "Failed to create tweet");
  }

  const createdTweet = await Tweet.findById(tweet._id);

  if (!createdTweet) {
    throw new ApiError(500, "Failed to fetch tweet");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, createdTweet, "tweet added successfully"));
});

const updateTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const { content } = req.body;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet");
  }

  if (!content) {
    throw new ApiError(400, "Enter new tweet content");
  }

  const user = await User.findById(req.user?._id).select("_id");

  const owner = await Tweet.findById(tweetId).select("owner -_id");

  if (user.equals(owner) === false) {
    throw new ApiError(403, "You are not authorized to update this tweet");
  }

  const tweet = await Tweet.findByIdAndUpdate(
    tweetId,
    {
      $set: {
        content,
      },
    },
    { new: true }
  );

  if (!tweet) {
    throw new ApiError(500, "Tweet not updated");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, tweet, "tweet updated successfully"));
});

const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet");
  }

  const user = await User.findById(req.user?._id).select("_id");

  const tweet = await Tweet.findById(tweetId);

  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  if (user.equals(tweet.owner) === false) {
    throw new ApiError(403, "You are not authorized to delete this tweet");
  }

  await Tweet.findByIdAndDelete(tweetId);

  return res
    .status(200)
    .json(new ApiResponse(200, null, "tweet deleted successfully"));
});

export { getUserTweets, createTweet, updateTweet, deleteTweet };
