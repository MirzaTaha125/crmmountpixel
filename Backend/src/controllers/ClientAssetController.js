import ClientAsset from '../model/ClientAsset.js';
import Client from '../model/Client.js';
import Assignment from '../model/Assignment.js';

// Get all assets for the authenticated client (client panel)
export const getMyAssets = async (req, res) => {
  try {
    // For clients, use their own ID from req.client
    const clientId = req.client._id || req.client.id;
    
    if (!clientId) {
      return res.status(400).json({ message: 'Client ID not found' });
    }

    const assets = await ClientAsset.find({ clientId }).sort({ createdAt: -1 });
    res.status(200).json(assets);
  } catch (error) {
    console.error('Error fetching client assets:', error);
    res.status(500).json({ message: 'Error fetching client assets', error: error.message });
  }
};

// Get all assets for a specific client
export const getClientAssets = async (req, res) => {
  try {
    const { clientId } = req.params;
    const userId = req.user._id;

    // Check if user has access to this client
    if (req.user.Role !== 'Admin') {
      const assignment = await Assignment.findOne({ userId, clientId });
      if (!assignment) {
        return res.status(403).json({ message: 'Access denied to this client' });
      }
    }

    // Verify client exists
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    const assets = await ClientAsset.find({ clientId }).sort({ createdAt: -1 });
    res.status(200).json(assets);
  } catch (error) {
    console.error('Error fetching client assets:', error);
    res.status(500).json({ message: 'Error fetching client assets', error: error.message });
  }
};

// Create new asset
export const createClientAsset = async (req, res) => {
  try {
    const { clientId, category, name, link } = req.body;
    const userId = req.user._id;

    // Check if user has access to this client
    if (req.user.Role !== 'Admin') {
      const assignment = await Assignment.findOne({ userId, clientId });
      if (!assignment) {
        return res.status(403).json({ message: 'Access denied to this client' });
      }
    }

    // Verify client exists
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    if (!category || !name || !link) {
      return res.status(400).json({ message: 'Category, name, and link are required' });
    }

    const asset = await ClientAsset.create({
      clientId,
      category: category.trim(),
      name: name.trim(),
      link: link.trim()
    });

    res.status(201).json(asset);
  } catch (error) {
    console.error('Error creating client asset:', error);
    res.status(500).json({ message: 'Error creating client asset', error: error.message });
  }
};

// Update asset
export const updateClientAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const { category, name, link } = req.body;
    const userId = req.user._id;

    const asset = await ClientAsset.findById(id);
    if (!asset) {
      return res.status(404).json({ message: 'Asset not found' });
    }

    // Check if user has access to this client
    if (req.user.Role !== 'Admin') {
      const assignment = await Assignment.findOne({ userId, clientId: asset.clientId });
      if (!assignment) {
        return res.status(403).json({ message: 'Access denied to this asset' });
      }
    }

    if (!category || !name || !link) {
      return res.status(400).json({ message: 'Category, name, and link are required' });
    }

    const updatedAsset = await ClientAsset.findByIdAndUpdate(
      id,
      {
        category: category.trim(),
        name: name.trim(),
        link: link.trim()
      },
      { new: true, runValidators: true }
    );

    res.status(200).json(updatedAsset);
  } catch (error) {
    console.error('Error updating client asset:', error);
    res.status(500).json({ message: 'Error updating client asset', error: error.message });
  }
};

// Delete asset
export const deleteClientAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const asset = await ClientAsset.findById(id);
    if (!asset) {
      return res.status(404).json({ message: 'Asset not found' });
    }

    // Check if user has access to this client
    if (req.user.Role !== 'Admin') {
      const assignment = await Assignment.findOne({ userId, clientId: asset.clientId });
      if (!assignment) {
        return res.status(403).json({ message: 'Access denied to this asset' });
      }
    }

    await ClientAsset.findByIdAndDelete(id);
    res.status(200).json({ message: 'Asset deleted successfully' });
  } catch (error) {
    console.error('Error deleting client asset:', error);
    res.status(500).json({ message: 'Error deleting client asset', error: error.message });
  }
};

