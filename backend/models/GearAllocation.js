import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const gearAllocation = new Schema(
    {
        gearItemId: { type: Schema.Types.ObjectId, ref: 'GearItem', required: true },
        participantId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
        allocatedAt: { type: Date, default: Date.now },
        expectedReturnDate: { type: Date },
        returnedAt: { type: Date },
        conditionOnReturn: { type: String },

        fineAmount: { type: Number, default: 0 },
        fineReason: {
            type: String,
            enum: ['None', 'Late', 'MinorDamage', 'ModerateDamage', 'SevereDamage', 'Lost'],
            default: 'None'
        },
    },
    { timestamps: true }
);

const GearAllocation = model('GearAllocation', gearAllocation);
export default GearAllocation;