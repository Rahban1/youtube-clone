import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async(userId)=>{
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave : false})

        return { accessToken, refreshToken }

    } catch (e) {
        throw new ApiError(500,"something went wrong while generating access and refresh token")
    }
}

export const registerUser = asyncHandler( async (req,res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists : username, email
    // check for images - avatar
    // upload them on cloudinary
    // create user object - entry in db
    // remove password and refresh token field from response
    // check for user creation 
    // return res

    const { fullName, email, userName, password } = req.body;

    if(
        [fullName, email, userName, password].some((field)=> field?.trim() === "")
    ) {
        throw new ApiError(400,"all fields are required")
    }

    const existedUser = await User.findOne({
        $or : [{ email },{ userName }]
    })

    if(existedUser){
        throw new ApiError(409, "user already exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar must be there")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new ApiError(400, "error uploading avatar image");
    }

    const user = await User.create({
        fullName,
        avatar : avatar.url,
        coverImage : coverImage?.url || "",
        email,
        password,
        userName

    })

    const createdUser = User.findById(user.__id).select("-password -refreshToken");
    if(!createdUser){
        throw new ApiError(500,"something went wrong while registring the user")
    }
    return res.status(201).json({
        msg : "user registered successfully"
    })
})

export const loginUser = asyncHandler(async (req,res)=> {
    //todos :-
    // ask for user's username and password
    // validation - check if inputs are empty or not
    // check that the user exists in the db
    // check password match or not
    // if it doesn't exist send error
    // if exist return back the tokens to him and send login successfull
    // send secure cookies

    const {userName,email, password} = req.body;
    console.log(userName);
    console.log(email);
    
    if(!userName && !email){
        throw new ApiError(400,"username or email is required")
    }

    const user = await User.findOne({
        $or : [{userName},{email}]
    });
    if(!user){
        throw new ApiError(400,"user doesn't exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);
    if(!isPasswordValid){
        throw new ApiError(400,"password does not match");
    }

    const {accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

    const loggedinUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly : true,
        secure : true
    }


    return res
    .status(200)
    .cookie("accessToken",accessToken, options)
    .cookie("refreshToken",refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user : loggedinUser, accessToken, refreshToken
            },
            "user logged in successfully"
        )
    )

});

export const logoutUser = asyncHandler(async (req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken : undefined
            }
        },
        {
            new : true
        }
    )

    const options = {
        httpOnly : true,
        secure : true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200 , {}, "User logged out"));
})

export const refreshAccessToken = asyncHandler(async (req,res) =>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorized request");
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET);
        if(!decodedToken){
            throw new ApiError(401, "Unauthorized request");
        }
        const user = await User.findById(decodedToken?._id)
        if(!user){
            throw new ApiError(401, "refresh token invalid")
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "refresh token is expired")
        }
    
        const options = {
            httpOnly : true,
            secure : true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id);
    
        return res
        .status(200)
        .cookie("accessToken", accessToken,options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200,
                {accessToken, refreshToken : newRefreshToken},
                "Access token refreshed successfully"
            )
        )
    } catch (error) {
        throw new ApiError(404, error?.message || "invalid refresh token")
    }
})

export const changeCurrentPassword = asyncHandler(async (req,res) => {
    const {oldPassword, newPassword} = req.body;

    const id = req?.user?._id;
    const user = await User.findById(id);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(401, "invalid old password")
    }
    user.password = newPassword
    await user.save({validateBeforeSave : false})

    res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {},
            "password changed successfully"
        )
    )
})

export const getCurrentUser = asyncHandler(async (req,res)=>{
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            req.user,
            "data sent successfully"
        )
    )
})

export const updateAccountDetails = asyncHandler(async (req,res)=>{
    const {fullName, email, userName} = req.body;

    if(!fullName && !email && !userName){
        throw new ApiError(400, "give some data to update")
    }

    const user = await User.findByIdAndUpdate(req.user?._id,{
        $set : {
            fullName,
            email,
            userName
        }
    },{new : true}).select("-password");

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user,
            "Account details updated successfully"
        )
    )
})

export const updateUserAvatar = asyncHandler(async (req,res) =>{
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400, "avatar file is missing");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if(!avatar.url){
        throw new ApiError(400, "error while uploading avatar");
    }

    const done = await User.findByIdAndUpdate(req.user?._id,{
        $set : {
            avatar : avatar.url
        }
    },{new : true}).select("-password")
    if(!done){
        throw new ApiError(500, "problem while storing in db");
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            done,
            "avatar updated successfully"
        )
    )
})

export const updateUserCoverImage = asyncHandler(async (req,res) =>{
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400, "avatar file is missing");
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!coverImage.url){
        throw new ApiError(400, "error while uploading avatar");
    }

    const done = await User.findByIdAndUpdate(req.user?._id,{
        $set : {
            coverImage : coverImage.url
        }
    },{new : true}).select("-password")
    if(!done){
        throw new ApiError(500, "problem while storing in db");
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            done,
            "cover Image updated successfully"
        )
    )
})