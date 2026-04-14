import mongoose from 'mongoose';

const collectionPointSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true, index: true },
    address: { type: String, required: true, trim: true },
    association: { type: String, trim: true, default: '' },
    locationPhoto: { type: String, trim: true, default: '' },
    addedByClerkUserId: { type: String, required: true, index: true },
    operatingHours: { type: String, trim: true, default: '' },
    contactNumber: { type: String, trim: true, default: '' },
    latitude: { type: Number },
    longitude: { type: Number },
  },
  { timestamps: true }
);

export const CollectionPoint = mongoose.model('CollectionPoint', collectionPointSchema);
