import mongoose from "mongoose";

const { Schema, model } = mongoose;

const refreshTokenSchema = new Schema(
    {
        // User to whom this refresh token belongs
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        // Hashed refresh token
        // Raw token is NOT stored in the database
        tokenHash: {
            type: String,
            required: true
        },

        // Time after which this refresh token becomes invalid
        expiresAt: {
            type: Date,
            required: true,

            // MongoDB TTL index:
            // Automatically removes the document after expiresAt
            index: { expires: 0 }
        },

        // Used when token is manually invalidated
        // null = not revoked
        revokedAt: {
            type: Date,
            default: null
        }
    },

    // Adds createdAt and updatedAt
    { timestamps: true }
);

const RefreshToken = model("RefreshToken", refreshTokenSchema);

export default RefreshToken;