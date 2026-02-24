import ProjectDetail from '../model/ProjectDetail.js';

export const createProjectDetail = async (req, res) => {
  try {
    const detail = await ProjectDetail.create(req.body);
    await detail.populate('packageId');
    res.status(201).json(detail);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const getProjectDetails = async (req, res) => {
  try {
    const { clientId } = req.query;
    const filter = clientId ? { clientId } : {};
    const details = await ProjectDetail.find(filter).populate('packageId');
    res.json(details);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateProjectDetail = async (req, res) => {
  try {
    const detail = await ProjectDetail.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!detail) return res.status(404).json({ error: 'Not found' });
    await detail.populate('packageId');
    res.json(detail);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const deleteProjectDetail = async (req, res) => {
  try {
    const detail = await ProjectDetail.findByIdAndDelete(req.params.id);
    if (!detail) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}; 