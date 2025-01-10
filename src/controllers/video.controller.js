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


const publishAVideo = asyncHandler(async(req, res) => {
  const { title, description } = req.body;

  if(!title) {
    throw new ApiError(401, "Please provide a title")
  }

  if(!description) {
    throw new ApiError(401, "Please provide a description")
  }

  if(!(title && description)) {
    throw new ApiError(401, "Please provide a title and description")
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
      description,
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

const getVideoById = asyncHandler(async(req, res) => {
  const { videoId } = req.params

  const video = await Video.findById(videoId)

  if(!video) {
    throw new ApiError(404, "Video not found")
  }

  return res.status(200).json(new ApiResponse(200, video, "video fetched successfully"))
})

const updateVideoDetails = asyncHandler(async(req, res) => {
  const { videoId } = req.params
  const { title, description } = req.body

  if(!title) {
    throw new ApiError(400, "Enter new video title")
  }

  if(!description) {
    throw new ApiError(400, "Enter new video description")
  }

  if(!(title && description)) {
    throw new ApiError(400, "Enter new video title and description")
  }

  const videoDetails = await Video.findById(videoId).select("title description")

  if(videoDetails.title === title) {
    throw new ApiError(400, "Enter new video title")
  }

  if(videoDetails.description === description) {
    throw new ApiError(400, "Enter new video description")
  }

  const thumbnailFilePath = req.file?.path
  
  if(!thumbnailFilePath) {
    throw new ApiError(404, "Thumbnail file not found")
  }

  const thumbnail = await uploadToCloudinary(thumbnailFilePath)

  if(!thumbnail) {
    throw new ApiError(404, "Failed to upload thumbnail")
  }

  const deleteThumbnail = await Video.findById(videoId).select("thumbnail")
  
  if(deleteThumbnail && deleteThumbnail.thumbnail) {
    const videoThumbnail = deleteThumbnail.thumbnail
    const public_id = videoThumbnail.split('/').slice(-1)[0].split('.')[0]
    await deleteFromCloudinary(public_id)
  }

  const video = await Video.findByIdAndUpdate(videoId,
    {
      $set: {
        title,
        description,
        thumbnail: thumbnail.url,
      }
    },
    { new: true }
  )

  return res.status(200).json(new ApiResponse(200, video, "video details updated"))
})

const deleteVideo = asyncHandler(async(req, res) => {
  const { videoId } = req.params

  const video = await Video.findById(videoId)

  if(!video) {
    throw new ApiError(404, "Video not found")
  }else {
    await Video.deleteOne(video)
  }

  return res.status(200).json(new ApiResponse(200, null, "video deleted successfully"))
})

const togglePublishStatus = asyncHandler(async(req, res) => {
  const { videoId } = req.params

  const video = await Video.findById(videoId).select("isPublished")
  const videoStatus = video.isPublished
  console.log(videoStatus)

  await Video.findByIdAndUpdate(videoId,
    {
      $set: {
        isPublished: !videoStatus
      }
    }
  )

  return res.status(200).json(new ApiResponse(200, video, "video status updated"))
})

export {
  publishAVideo,
  getVideoById,
  updateVideoDetails,
  deleteVideo,
  togglePublishStatus
}