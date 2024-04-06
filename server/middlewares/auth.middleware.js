import { User } from "../models/user.models.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

export const verifyJWT = asyncHandler(async (req, res, next) => {
    try {

        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

        // console.log(`Token ${token}`);

        if (!token) {
            return res.status(401).json({ error: "Unauthorized request" });
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        // console.log(`DECODE TOKEN - ${decodedToken}`);

        const user = await User.findById(decodedToken?._id).select("-password -refreshToken");

        if (!user) {
            return res.status(401).json({ error: "Invalid Access Token" });
        }

        req.user = user;
        next();

    } catch (error) {
        return res.status(401).json({ error: "Invalid Access Token" });
    }
});
