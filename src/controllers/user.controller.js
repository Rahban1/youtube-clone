import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";

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

    const { fullname, email, username, password } = req.body;

    if(
        [fullname, email, username, password].some((field)=> field?.trim() === "")
    ) {
        throw new ApiError(400,"all fields are required")
    }

    const existedUser = User.findOne({
        $or : [{ email },{ username }]
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
        fullname,
        avatar : avatar.url,
        coverImage : coverImage?.url || "",
        email,
        password,
        username : username.toLowerCase()

    })

    const createdUser = User.findById(user.__id).select("-password -refreshToken");
    if(!createdUser){
        throw new ApiError(500,"something went wrong while registring the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "user registered successfully")
    )
})
