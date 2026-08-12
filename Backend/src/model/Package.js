import mongoose from "mongoose";

const packageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  description: { type: String },
  category: {
    type: String,
    required: true,
    enum: [
      'Website Development',
      'E-commerce',
      'Logo Design',
      'Branding',
      'SEO',
      'Animation',
      'Print',
      'Web Portal',
      'Copy Writing',
      'Digital Marketing',
      'App Development',
      'Illustration'
    ]
  }
});

const Package = mongoose.model("Package", packageSchema);
export default Package;