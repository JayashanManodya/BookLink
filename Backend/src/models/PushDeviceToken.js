import mongoose from 'mongoose';

const pushDeviceTokenSchema = new mongoose.Schema(
  {
    clerkUserId: { type: String, required: true, index: true },
    expoPushToken: { type: String, required: true },
    platform: {
      type: String,
      enum: ['android', 'ios', 'unknown'],
      default: 'unknown',
    },
  },
  { timestamps: true }
);

pushDeviceTokenSchema.index({ clerkUserId: 1, expoPushToken: 1 }, { unique: true });

export const PushDeviceToken = mongoose.model('PushDeviceToken', pushDeviceTokenSchema);
