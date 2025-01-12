import { asyncHandler } from "../utils/asyncHandler.js";
import { isValidObjectId } from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { Video } from "../models/video.models.js";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
  deleteResourcesFromCloudinary,
} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

  try {
    if (!userId) {
      throw new ApiError(401, "User not authenticated");
    }

    if (!isValidObjectId(userId)) {
      throw new ApiError(400, "Invalid user ID");
    }

    const user = await User.findById(req.user?._id);

    if (!user) {
      throw new ApiError(401, "login first");
    }

    const aggregateQuery = Video.aggregate([
      {
        $match: {
          $or: [
            {
              title: { $regex: query, $options: "i" },
            },
            {
              description: { $regex: query, $options: "i" },
            },
          ],
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
          isPublished: 0,
          owner: 0,
          updatedAt: 0,
          __v: 0,
          createdBy: {
            _id: 0,
            updatedAt: 0,
            refreshAccessToken: 0,
            refreshToken: 0,
            coverImage: 0,
            password: 0,
            watchHistory: 0,
            __v: 0,
          },
        },
      },
    ]);

    const options = {
      page: { page },
      limit: { limit },
      sortBy: { sortBy },
      sortType: { sortType },
      select: "title description createdAt owner views duration",
    };

    Video.aggregatePaginate(aggregateQuery, options).then(function (result) {
      return res
        .status(200)
        .json(new ApiResponse(200, result, "videos fetched successfully"));
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json(new ApiResponse(500, {}, "Error processing request"));
  }
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if (!title) {
    throw new ApiError(401, "Please provide a title");
  }

  if (!description) {
    throw new ApiError(401, "Please provide a description");
  }

  if (!(title && description)) {
    throw new ApiError(401, "Please provide a title and description");
  }

  const owner = await User.findById(req.user._id).select("userName fullName");

  const videoFilePath = req.files?.videoFile[0]?.path;
  const thumbnailFilePath = req.files?.thumbnail[0]?.path;

  if (!videoFilePath) {
    throw new ApiError(401, "Please provide a video file");
  }

  if (!thumbnailFilePath) {
    throw new ApiError(401, "Please provide a thumbnail");
  }

  const videoFile = await uploadToCloudinary(videoFilePath);
  const thumbnail = await uploadToCloudinary(thumbnailFilePath);

  if (!videoFile) {
    throw new ApiError(401, "Please provide a video");
  }

  if (!thumbnail) {
    throw new ApiError(401, "Please provide a thumbnail");
  }

  const duration = videoFile.duration;

  const createVideo = await Video.create({
    title,
    description,
    thumbnail: thumbnail.url,
    videoFile: videoFile.url,
    owner,
    duration,
  });

  const createdVideo = await Video.findById(createVideo._id);

  return res
    .status(200)
    .json(new ApiResponse(201, createdVideo, "video uploaded successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "video fetched successfully"));
});

const updateVideoDetails = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;

  const user = await User.findById(req.user._id).select("_id");
  const userId = user._id;

  const video = await Video.findById(videoId).select("owner");
  const ownerId = video.owner;

  if (ownerId.equals(userId) === false) {
    throw new ApiError(403, "You are not authorized to update this video");
  }

  if (title) {
    if (!title) {
      throw new ApiError(400, "Enter video title");
    }

    const videoTitle = await Video.findById(videoId).select("title");
    const existedTitle = videoTitle.title;

    if (existedTitle === title) {
      throw new ApiError(400, "Enter new video title");
    }

    await Video.findByIdAndUpdate(videoId, {
      $set: {
        title,
      },
    });
  }

  if (description) {
    if (!description) {
      throw new ApiError(400, "Enter video description");
    }

    const videodescription =
      await Video.findById(videoId).select("description");
    const existeddescription = videodescription.description;

    if (existeddescription === description) {
      throw new ApiError(400, "Enter new video description");
    }

    await Video.findByIdAndUpdate(videoId, {
      $set: {
        description,
      },
    });
  }

  if (req.file?.path) {
    const thumbnailFilePath = req.file?.path;
    const thumbnail = await uploadToCloudinary(thumbnailFilePath);

    if (!thumbnail) {
      throw new ApiError(500, "Thumbnail upload failed");
    }

    const video = await Video.findById(videoId).select("thumbnail");
    const url = video.thumbnail;
    const public_id = url.split("/").slice(-1)[0].split(".")[0];
    await deleteFromCloudinary(public_id);

    await Video.findByIdAndUpdate(videoId, {
      $set: {
        thumbnail: thumbnail.url,
      },
    });
  }

  const data = await Video.findById(videoId);

  return res
    .status(200)
    .json(new ApiResponse(200, data, "video details updated"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const user = await User.findById(req.user._id).select("_id");
  const userId = user._id;

  const video = await Video.findById(videoId).select("owner");
  const ownerId = video.owner;

  if (ownerId.equals(userId) === false) {
    throw new ApiError(403, "You are not authorized to update this video");
  }

  try {
    const thumbnail = await Video.findById(videoId).select("thumbnail");
    const thumbnalUrl = thumbnail.thumbnail;

    const videoFile = await Video.findById(videoId).select("videoFile");
    const videoFileUrl = videoFile.videoFile;

    const thumbnailPublic_id = thumbnalUrl
      .split("/")
      .slice(-1)[0]
      .split(".")[0];
    const videoFilePublic_id = videoFileUrl
      .split("/")
      .slice(-1)[0]
      .split(".")[0];

    await deleteResourcesFromCloudinary(videoFilePublic_id);
    await deleteResourcesFromCloudinary(thumbnailPublic_id);
  } catch (err) {
    throw new ApiError(404, "Video not found");
  }

  const deleteVideo = await Video.findById(videoId);

  if (!deleteVideo) {
    throw new ApiError(404, "Video not found");
  } else {
    await Video.deleteOne(deleteVideo);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, deleteVideo._id, "video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const video = await Video.findById(videoId).select("isPublished");
  const videoStatus = video.isPublished;

  await Video.findByIdAndUpdate(videoId, {
    $set: {
      isPublished: !videoStatus,
    },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, video, "video status updated"));
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideoDetails,
  deleteVideo,
  togglePublishStatus,
};
