import Assignment from '../model/Assignment.js';

export const createAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.create(req.body);
    // Populate userId after creation to include user details
    const populatedAssignment = await Assignment.findById(assignment._id)
      .populate('userId', 'First_Name Last_Name Email Role workEmailName');
    res.status(201).json(populatedAssignment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const getAssignments = async (req, res) => {
  try {
    const { clientId, role } = req.query;
    const filter = {};
    if (clientId) filter.clientId = clientId;
    if (role) filter.role = role;
    const assignments = await Assignment.find(filter)
      .populate('userId', 'First_Name Last_Name Email Role workEmailName');
    res.json(assignments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('userId', 'First_Name Last_Name Email Role workEmailName');
    if (!assignment) return res.status(404).json({ error: 'Not found' });
    res.json(assignment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const deleteAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findByIdAndDelete(req.params.id);
    if (!assignment) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}; 