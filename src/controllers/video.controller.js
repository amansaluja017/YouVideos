import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { Video } from "../models/video.models.js";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const publishAVideo = asyncHandler(async(req, res) => {
  const { title, discription } = req.body;

  if(!title) {
    throw new ApiError(401, "Please provide a title")
  }

  if(!discription) {
    throw new ApiError(401, "Please provide a discription")
  }

  if(!(title && discription)) {
    throw new ApiError(401, "Please provide a title and discription")
  }

  const videoFilePath = req.files?.videoFile[0]?.path
  const thumbnailFilePath = req.files?.thumbnail[0]?.path
  

  if(!videoFilePath) {
    throw new ApiError(401, "Please provide a video file")
  }

  if(!thumbnailFilePath) {
    throw new ApiError(401, "Please provide a thumbnail")
  }

  const videoFile = await uploadToCloudinary(videoFilePath) 
  const thumbnail = await uploadToCloudinary(thumbnailFilePath) 

  if(!videoFile) {
    throw new ApiError(401, "Please provide a video")
  }

  if(!thumbnail) {
    throw new ApiError(401, "Please provide a thumbnail")
  }

  const createVideo = await Video.create(
    {
      title,
      discription,
      thumbnail: thumbnail.url,
      videoFile: videoFile.url
    }
  ) 
    
  const createdVideo = await Video.findById(createVideo.id)

  if(!createdVideo) {
    throw new ApiError(500, "internal error: video upload failed")
  }

  return res.status(200).json(new ApiResponse(201, createdVideo, "video uploaded successfully"))
})

export {
  publishAVideo
}