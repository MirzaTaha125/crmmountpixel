import mongoose from "mongoose";

const salarySchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  month: { type: Number, required: true }, // 1-12
  year: { type: Number, required: true },
  totalWorkingDays: { type: Number, required: true },
  presentDays: { type: Number, required: true },
  salaryAmount: { type: Number, required: true },
  additionalAmount: { type: Number },
}, { timestamps: true });

const Salary = mongoose.model("Salary", salarySchema);
export default Salary; 