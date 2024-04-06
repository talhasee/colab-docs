import mongoose from "mongoose";
import { Schema } from "mongoose";

const documentSchema = new Schema(
    {
        canvasId: {
            type: String,
            required: true,
            unique: true,
        },
        data: {
            type: Object
        }
    },
    {
        timestamps: true
    }
);

export const Document = mongoose.model("Document", documentSchema);