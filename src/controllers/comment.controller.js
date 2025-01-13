import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose, { isValidObjectId } from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { Comment } from "../models/comment.models.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const getVideoComments  = asyncHandler(async(req, res) => {
    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if(!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video");
    }

    try {
        const videoComments = await Comment.aggregate([
            {
                $match: {
                    video: new mongoose.Types.ObjectId(videoId),
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "ownerInfo",
                }
            },
            {
                $unwind: "$ownerInfo",
            },
            {
                $project: {
                    _id: 0,
                    owner: "$ownerInfo.userName",
                    avatar: "$ownerInfo.avatar",
                    fullName: "$ownerInfo.fullName",
                    content: 1,
                    createdAt: 1,
                }
            },
            {
                $sort: {
                    createdAt: -1,
                }
            },
            {
                $limit: 10
            }
        ])

        return res.status(200).json(new ApiResponse(200, videoComments, "Video comments fetched successfully"));
    }catch (err) {
        throw new ApiError(500, "Failed to get video comments");
    }

    
})

const addComment = asyncHandler(async(req, res) => {
    const { videoId } = req.params;
    const { content } = req.body;

    if(!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video");
    }

    const user = await User.findById(req.user?._id).select("userName")

    const addComment = await Comment.create(
        {
            content,
            video: videoId,
            owner: user
        }
    )

    if(!addComment) {
        throw new ApiError(400, "Failed to add comment");
    }

    const commentCreated = await Comment.findById(addComment._id)
    console.log(commentCreated)

    return res.status(200).json(new ApiResponse(200, commentCreated, "Comment added successfully"));
})

const updateComment = asyncHandler(async(req, res) => {
    const { commentId } = req.params
    const {content} = req.body

    if(!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment");
    }

    if(!content) {
        throw new ApiError(400, "Enter new comment");
    }

    const comment = await Comment.findById(commentId).select("owner")
    const commentOwner = comment.owner

    const user = await User.findById(req.user?._id)

    if(commentOwner.equals(user._id) === false) {
        throw new ApiError(403, "You are not authorized to update this comment");
    }

    const updatedComment = await Comment.findByIdAndUpdate(commentId,
        {
            $set: {
                content,
            }
        },
        { new: true }
    )

    return res.status(200).json(new ApiResponse(200, updatedComment, "Comment updated successfully"))
})

const deleteComment = asyncHandler(async(req, res) => {
    const { commentId } = req.params

    const user = await User.findById(req.user?._id)
    const userId = user._id

    const comment = await Comment.findById(commentId).select("owner")
    const commentOwner = comment.owner

    if(commentOwner.equals(userId) === false) {
        throw new ApiError(403, "You are not authorized to delete this comment");
    }

    const deleteComment = await Comment.findByIdAndDelete(commentId)

    return res.status(200).json(new ApiResponse(200, deleteComment, "Comment deleted successfully"));
})

export { getVideoComments, addComment, updateComment, deleteComment }
