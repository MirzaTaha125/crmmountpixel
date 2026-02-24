import mongoose from "mongoose";

const clientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  password: { type: String }, // Optional password for client panel access
  companyName: { type: String },
  clientId: { type: String, unique: true, sparse: true }, // Brand-specific client ID (ADE001, WDI001, MP001)
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  address: { type: String },
  company: { type: String },
  brand: { type: String, trim: true, enum: ['Webdevelopers Inc', 'American Design Eagle', 'Mount Pixels'], default: '' },
  // Amount fields for financial tracking
  totalAmount: { type: Number, default: 0 },
  paidAmount: { type: Number, default: 0 },
  dueAmount: { type: Number, default: 0 },
  status: { type: String, enum: ['Active', 'Processing', 'Completed', 'On Hold'], default: 'Active' }
}, { timestamps: true });

const Client = mongoose.model("Client", clientSchema);
export default Client;
