import { User } from "../models/user.models.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { apiResponse } from "../utils/apiResponse.js";


const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        // saving refreshToken in db
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        // console.log(`Inside AccessToken - ${accessToken}, Refresh Token - ${refreshToken}`);
        return { accessToken, refreshToken };
    } catch (error) {
        // Handle the error appropriately, such as logging it or throwing it again
        console.error("Error generating tokens:", error);
        throw new Error("Error generating tokens");
    }
};


const registerUser = asyncHandler( async (req, res) => {
    const {email, password} = req.body;

    if(!email || !password){
        return res
        .status(400)
        .json(
            new apiResponse(
                400,
                "",
                "All fields are required"
            )
        );
    }

    const existedUser = await User.findOne(
        {
            email: email
        }
    );

    if(existedUser){
        return res
        .status(409)
        .json(
            new apiResponse(
                409,
                "",
                "User already exists"
            )
        );
    }


    const user = await User.create({
        email,
        password
    });
    //checking if user is created successfully
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if(!createdUser){
        return res
        .status(500)
        .json(
            new apiResponse(
                500,
                "",
                "Something went wrong while creating user"
            )
        );
    }

    return res
    .status(201)
    .json(new apiResponse(200, createdUser, "User registered successfully"));


});

const loginUser = asyncHandler( async(req, res) => {
    const {password, email} = req.body;

    if(!password || !email){
        return res
        .status(400)
        .json(
            new apiResponse(
                400,
                "",
                "All fields are required"
            )
        );
    }

    const user = await User.findOne({
        email: email
    });

    if (!user) {
        return res
        .status(404)
        .json(
            new apiResponse(
                404,
                "",
                "User does not exists"
            )
        );
    }

    

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        return res
        .status(401)
        .json(
            new apiResponse(
                401,
                "",
                "Invalid User credentials"
            )
        );
    }


    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
        user._id
    );

      //getting logged user details to send back as response and
    //removing password and refreshToken
    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );
  
    //setting options for cookie sending
    const options = {
        httpOnly: true,
        secure: true,
    };


    // console.log(`AccessToken - ${accessToken}, Refresh Token - ${refreshToken}`);
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new apiResponse(
        200,
        {
            user: loggedInUser,
            accessToken,
            refreshToken,
        },
        "User logged in Successfully"
        )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
      req.user._id,
      {
        //   $set: {
        //     refreshToken: undefined,
        //   },
  
        $unset: {
          refreshToken: 1,
        },
      },
      {
        new: true,
      }
    );
  
    //setting options for cookie sending
    const options = {
      httpOnly: true,
      secure: true,
    };
  
    return res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json(new apiResponse(200, {}, "User logged out successfully"));
  });

export {
    registerUser,
    loginUser,
    logoutUser
};