import mongoose from "mongoose";
const { Schema, model } = mongoose;

const batch = new Schema(
    {
        tripId: { type: Schema.Types.ObjectId, ref: 'Trip', required: true },
        batchName: { type: String },
        startDate: { type: Date },
        endDate: { type: Date },
        maxCapacity: { type: Number },
        status: { type: String, enum: ['Open', 'Full', 'Completed', 'Cancelled '], default: 'Open' }
        
    }
);