import mongoose from "mongoose";
import { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema(
    {
        email: {
            type: String,
            required: true, 
            unique: true,
            lowercase: true,
            trim: true,
            index: true, //for enabling indexing in database
        },
        password: {
            type: String,
            required: [true, "Password is required"], //custom error message
        },
        refreshToken: {
            type: String, 
        }
    },
    {
        timestamps: true
    }
);

//Mongoose hook to execute provided code just before database query
userSchema.pre("save", async function (next) {
    
    //Execute password encryption only if password is changed
    if(!this.isModified("password"))
        return next();

    this.password = await bcrypt.hash(this.password, 10) //10 is salt 
    next();
})


userSchema.methods.isPasswordCorrect = async function(password){
    //comparing passwords 
    // console.log(`new passowrd - ${password}, old password - ${this.password}`);
    return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        //payload
        {
            _id: this.id,
            email: this.email,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    );
}
userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        //payload
        {
            _id: this.id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model("User", userSchema);