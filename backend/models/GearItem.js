import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const gearItem = new Schema(
    {
        organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
        name: { type: String },
        category: { type: Number, min: 0 },
        quantity: { type: Number },
        condition: { type: String },
        availabilityStatus: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
        
        dailyLatefeeRate: { type: Number, min: 0, default: 0 },
        minorDamageFee: { type: Number, min: 0, default: 0 },
        moderateDamageFee: { type: Number, min: 0, default: 0 },
        serverDamageFee: { type: Number, min: 0, default: 0 },
        lostItemFee: { type: Number, min: 0, default: 0 },
    },
    { timestamps: true }
);

const GearItem = model('GearItem', gearItem);
export default GearItem;