/** Experiment: a named research context grouping source images and processing runs. */
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';

const experimentSchema = new mongoose.Schema(
  {
    publicId: { type: String, default: randomUUID, unique: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    tags: {
      type: [{ type: String, trim: true, maxlength: 30 }],
      validate: [(tags) => tags.length <= 10, 'At most 10 tags'],
      default: [],
    },
  },
  { timestamps: true, versionKey: false },
);

export const Experiment = mongoose.model('Experiment', experimentSchema);
