import mongoose from 'mongoose';

const clientAssetSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  link: {
    type: String,
    required: true,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
clientAssetSchema.index({ clientId: 1, createdAt: -1 });
clientAssetSchema.index({ category: 1 });

const ClientAsset = mongoose.model('ClientAsset', clientAssetSchema);
export default ClientAsset;

