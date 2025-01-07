import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import {uploadToCloudinary} from "../utils/cloudinary.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import jwt from 'jsonwebtoken';
import fs from 'fs';


const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId) 
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return {accessToken, refreshToken}

    }catch(err) {
        throw new ApiError(500, "Token generation failed");
    }
}

const registerUser = asyncHandler(async (req,res) => {
    // get user information from frontend server
    const {userName, email, password, fullName} = req.body;
    //console.log(userName, email, password, fullName);

    // validation information
    if(
        [fullName, email, userName, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "Please fill in all fields");
    }

    // check if user is already registered: username, email, password
    const existedUser = await User.findOne(
        {
            $or: [
                {userName},
                {email}
            ]
        }
    )

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImagePath = req.files?.coverImage[0]?.path;

    if(existedUser) {
        fs.unlinkSync(avatarLocalPath)
        fs.unlinkSync(coverImagePath)
        throw new ApiError(403, "User already registered");
    }
   
    // check for images and avatar
    let coverImageLocalPath;

    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if(!avatarLocalPath) {
        throw new ApiError(400, "Please upload an avatar");
    }

    // upload images to cloudinary server
    const avatar = await uploadToCloudinary(avatarLocalPath);
    const coverImage = await uploadToCloudinary(coverImageLocalPath);

    // console.log('uploading image to cloudinary server', avatar);
    if(!avatar) {
        throw new ApiError(500, "avatar upload failed");
    }

    // create user object - create entry in db
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        userName: userName.toLowerCase()
    })

    // remove password and refresh token from response
    const createdUser = await User.findById(user._id).select("-password -refreshToken")
    
    // check for user creation
    if(!createdUser) {
        throw new ApiError(500, "User creation failed");
    }

    // return response to frontend server
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User created successfully")
    )
})

const loginUser = asyncHandler(async(req, res) => {
    // get user information from frontend server
    const {userName, email, password} = req.body;

    if(!(userName || email)) {
        throw new ApiError(400, "Please provide username or email");
    }

    if(!password) {
        throw new ApiError(400, "Please provide password");
    }

    //validate information
    const user = await User.findOne(
        {
            $or: [
                {userName},
                {email}
            ]
        }
    )

    if(!user) {
        throw new ApiError(401, "Please enter valid email or username");
    }

    // check password
    const checkPassword = await user.isPasswordCorrect(password, user.password);
    
    if(checkPassword === false) {
        throw new ApiError(401, "Invalid password");
    }

    // make access token and refresh token 
    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

    // remove password and refresh token from response
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    // return response to frontend server
    return res.status(200).cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "Logged in successfully"
        )
    )
})

const logOutUser = asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined,
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200).clearCookie("accessToken", options).clearCookie("refreshToken", options)
    .json(
        new ApiResponse(200, {}, "Logged out successfully")
    )
})

const refreshAccessToken = asyncHandler(async(req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request");
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

        const user = await User.findById(decodedToken._id)

        if(!user) {
            throw new ApiError(401, "invalid refresh token");
        }

        if(incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token mismatch");
        } 

        const options = {
            httpOnly: true,
            secure: true
        }

        const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

        return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: user.select("-password -refreshToken"), accessToken, refreshToken
                },
                "Refreshed access token successfully"
            )
        )
    }catch(err) {
        throw new ApiError(401, err?.message || "Invalid refresh token");
    }
})

const changeCurrentPassword = asyncHandler(async(req, res) => {
    const {oldPassword, newPassword, confPassword} = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect) {
        throw new ApiError(401, "Invalid old password");
    }

    if(newPassword !== confPassword) {
        throw new ApiError(400, "Passwords do not match");
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res.status(200).json(
        new ApiResponse(
            200,
            {},
            "Password changed successfully"
        )
    )
})

const getCurrentUser = asyncHandler(async(req, res) => {
    return res.status(200).json(
        200, req.user, "current user fetched successfully"
    )
})

const updateAccountDetails = asyncHandler(async(req, res) => {
    const {fullName, email} = req.body

    if(!(fullName || email)) {
        throw new ApiError(400, "All fields must be required")
    } 

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                fullName,
                email
            }
        },
        {new: true}
    ).select("-password")

    return res.status(200).json(new ApiResponse(200, user, "Account Details updated"))
})

const updateUserAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath) {
        throw new ApiError(400, "Please provide an avatar");
    }

    const avatar = await uploadToCloudinary(avatarLocalPath)

    if(!avatar.url) {
        throw new ApiError(500, "Avatar upload failed");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res.status(200).json(new ApiResponse(200, user, "Avatar updated successfully"))
})

const updateUserCover = asyncHandler(async(req, res) => {
    const coverLocalPath = req.file?.path

    if(!coverLocalPath) {
        throw new ApiError(400, "Please provide a cover image");
    }

    const cover = await uploadToCloudinary(coverLocalPath)

    if(!cover.url) {
        throw new ApiError(500, "Cover image upload failed");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: cover.url
            }
        },
        {new: true}
    ).select("-password")

    return res.status(200).json(new ApiResponse(200, user, "Cover image updated successfully"))
})

const getUserChennelProfile = asyncHandler(async(req, res) => {
    const {userName} = req.params

    if(!userName?.trim()) {
        throw new ApiError(400, "username is missing");

    }

    const chennel = await User.aggregate([
        {
            $match: {
                userName: userName?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "chennel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {$size: "$subscribers"},
                subscribedToCount: {$size: "$subscribedTo"},
                isSubscribed: {
                    $cond: {
                        if: {$in: [request.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                userName: 1,
                avatar: 1,
                email: 1,
                coverImage: 1,
                subscribersCount: 1,
                subscribedToCount: 1,
                isSubscribed: 1,
                createdAt: 1
            }
        }
    ])
    console.log(chennel)

    if(!chennel?.length) {
        throw new ApiError(404, "User not found");
    }

    return res.status(200).json(new ApiResponse(200, chennel[0], "User profile fetched successfully"))
})

const getWatchHistory = asyncHandler(async(req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        userName: 1,
                                        avatar: 1,
                                        fullName: 1
                                    }
                                },
                                {
                                    $addFields: {
                                        owner: {
                                            $first: "$owner"
                                        }
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        }
    ])

    if(!user?.length) {
        throw new ApiError(404, "User not found");
    }

    return res.status(200).json(new ApiResponse(200, user[0].watchHistory, "successfully fetched watch history"))
})

export {
    registerUser,
    loginUser,
    logOutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCover,
    getUserChennelProfile,
    getWatchHistory
};