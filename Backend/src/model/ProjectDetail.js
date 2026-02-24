import mongoose from 'mongoose';

const projectDetailSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true },
  description: { type: String },
  deliveryDate: { type: Date },
  amount: { type: Number, min: 0 },
  status: { 
    type: String, 
    enum: ['In Development', 'Out For Review', 'All Done'],
    default: 'In Development'
  },
}, { timestamps: true });

const ProjectDetail = mongoose.model('ProjectDetail', projectDetailSchema);
export default ProjectDetail; 