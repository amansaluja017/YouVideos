import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import {uploadToCloudinary} from "../utils/cloudinary.js";
import {ApiResponse} from "../utils/ApiResponse.js";
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

    if(!userName || !email && !password) {
        throw new ApiError(400, "Please provide username or email and password");
    }

    //validate information
    const user = await User.findOne(
        {
            $and: [
                {
                    $or: [
                        {userName},
                        {email}
                    ]

                },
                {password}
            ]
        }
    )

    if(!user) {
        throw new ApiError(401, "Please enter valid details");
    }

    // make access token and refresh token 
    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return response.status(200).cookie("accessToken", accessToken, options)
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


export {
    registerUser,
    loginUser,
    logOutUser
};