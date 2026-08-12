import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema({
  Name: { type: String, required: true },
  Email: { type: String, required: true },
  Pass: { type: String, required: false },
  address: { type: String, required: true },
  cnic: { type: String, required: true },
  joiningDate: { type: Date, required: true },
  salary: { type: Number, required: true },
  accountNumber: { type: String, required: true },
  bankName: { type: String, required: true },
  designation: { type: String, required: true },
}, { timestamps: true });

const Employee = mongoose.model("Employee", employeeSchema);
export default Employee; 