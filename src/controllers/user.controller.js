import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";

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

export const loginUser = asyncHandler(async (req,res)=>{
    //todos :-
    // ask for user's username and password
    // validation - check if inputs are empty or not
    // check that the user exists in the db
    // check password match or not
    // if it doesn't exist send error
    // if exist return back the tokens to him and send login successfull
    // send secure cookies

    const {username,email, password} = req.body;

    if(!username || !email){
        throw new ApiError(400,"username or email is required")
    }

    const user = await User.findOne({
        $or : [{username},{email}]
    });
    if(!user){
        throw new ApiError(400,"user doesn't exist");
    }

    const isPasswordValid = await user.isPasswordValid(password);
    if(!isPasswordValid){
        throw new ApiError(400,"password does not match");
    }

    const {accessToken, refreshToken } = generateAccessAndRefreshTokens(user._id)

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