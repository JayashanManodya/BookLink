import mongoose from 'mongoose';
import { BOOK_TYPES } from '../constants/bookTypes.js';

const bookSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    author: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    location: { type: String, trim: true, default: '' },
    language: { type: String, trim: true, default: '' },
    coverImageUrl: { type: String, default: '' },
    ownerClerkUserId: { type: String, required: true, index: true },
    ownerDisplayName: { type: String, trim: true, default: '' },
    bookType: { type: String, enum: BOOK_TYPES, index: true },
    collectionPointId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CollectionPoint',
      index: true,
    },
    handoffPointLabel: { type: String, trim: true, default: '' },
    condition: { type: String, trim: true, default: 'good' },
    year: { type: Number },
    listingStatus: {
      type: String,
      enum: ['available', 'exchanged'],
      default: 'available',
      index: true,
    },
  },
  { timestamps: true }
);

export const Book = mongoose.model('Book', bookSchema);
