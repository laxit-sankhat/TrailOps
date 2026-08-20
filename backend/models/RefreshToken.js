import mongoose from "mongoose";
const { Schema, model } = mongoose;

const refreshTokenSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        tokenHash: {
            type: String,
            required: true
        },
        expiresAt: {
            type: Date,
            required: true,
            index: { expires: 0 }
        },
        revokedAt: {
            type: Date,
            default: null
        }
    },
    { timestamps: true }
);

const RefreshToken = model("RefreshToken", refreshTokenSchema);
export default RefreshToken;