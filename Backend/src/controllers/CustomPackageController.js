import CustomPackage from '../model/CustomPackage.js';

export const createCustomPackage = async (req, res) => {
  try {
    const { name, price, description, category } = req.body;
    const createdBy = req.user ? req.user._id : null;
    const customPackage = new CustomPackage({ name, price, description, category, createdBy });
    await customPackage.save();
    res.status(201).json(customPackage);
  } catch (err) {
    res.status(500).json({ message: 'Error creating custom package', error: err.message });
  }
};

export const getAllCustomPackages = async (req, res) => {
  try {
    const customPackages = await CustomPackage.find().sort({ createdAt: -1 });
    res.json(customPackages);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching custom packages', error: err.message });
  }
};

export const getCustomPackageById = async (req, res) => {
  try {
    const customPackage = await CustomPackage.findById(req.params.id);
    if (!customPackage) return res.status(404).json({ message: 'Custom package not found' });
    res.json(customPackage);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching custom package', error: err.message });
  }
};

export const updateCustomPackage = async (req, res) => {
  try {
    const { name, price, description, category } = req.body;
    const customPackage = await CustomPackage.findByIdAndUpdate(
      req.params.id,
      { name, price, description, category },
      { new: true }
    );
    if (!customPackage) return res.status(404).json({ message: 'Custom package not found' });
    res.json(customPackage);
  } catch (err) {
    res.status(500).json({ message: 'Error updating custom package', error: err.message });
  }
};

export const deleteCustomPackage = async (req, res) => {
  try {
    const customPackage = await CustomPackage.findByIdAndDelete(req.params.id);
    if (!customPackage) return res.status(404).json({ message: 'Custom package not found' });
    res.json({ message: 'Custom package deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting custom package', error: err.message });
  }
}; 