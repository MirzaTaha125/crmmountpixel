import mongoose from 'mongoose';

const adminAssetSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  assetId: {
    type: String,
    required: true,
    trim: true,
  },
  asstpassword: {
    type: String,
    required: true,
  },
  hasCooldown: {
    type: Boolean,
    default: false,
  },
  cooldownEnd: {
    type: Date,
    default: null,
  },
}, { timestamps: true });

const AdminAsset = mongoose.model('AdminAsset', adminAssetSchema);
export default AdminAsset;
