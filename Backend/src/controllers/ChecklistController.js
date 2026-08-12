import Checklist from '../model/Checklist.js';

const USER_FIELDS = 'First_Name Last_Name Email email';

// Normalise incoming items (accepts ["text"] or [{ text, completed }]) into clean rows.
const sanitizeItems = (items) =>
  (Array.isArray(items) ? items : [])
    .map((it) => (typeof it === 'string' ? { text: it } : it))
    .filter((it) => it && typeof it.text === 'string' && it.text.trim())
    .map((it) => ({
      text: it.text.trim(),
      completed: !!it.completed,
      completedAt: it.completed ? new Date() : null,
      note: it.note ? String(it.note).trim() : '',
    }));

// Create/assign a checklist. Assigning to multiple users creates one doc per user
// so each assignee gets independent progress.
export const createChecklist = async (req, res) => {
  try {
    const { brand, assignedTo, items, assignedDate, endDate } = req.body;

    if (!brand) return res.status(400).json({ message: 'Brand is required' });

    const userIds = Array.isArray(assignedTo) ? assignedTo : (assignedTo ? [assignedTo] : []);
    if (userIds.length === 0) {
      return res.status(400).json({ message: 'Assign the checklist to at least one user' });
    }

    const cleanItems = sanitizeItems(items);
    if (cleanItems.length === 0) {
      return res.status(400).json({ message: 'Add at least one checklist item' });
    }

    const created = await Checklist.insertMany(
      userIds.map((uid) => ({
        brand,
        assignedTo: uid,
        items: cleanItems.map((it) => ({ text: it.text, completed: false, completedAt: null })),
        assignedDate: assignedDate ? new Date(assignedDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        createdBy: req.user?._id || null,
      }))
    );

    const checklists = await Checklist.find({ _id: { $in: created.map((c) => c._id) } })
      .populate('brand')
      .populate('assignedTo', USER_FIELDS);

    res.status(201).json({ message: 'Checklist assigned successfully', checklists });
  } catch (error) {
    console.error('Error creating checklist:', error);
    res.status(500).json({ message: 'Error creating checklist', error: error.message });
  }
};

// Admin view — all checklists, optionally filtered by brand.
export const getAllChecklists = async (req, res) => {
  try {
    const filter = {};
    if (req.query.brand) filter.brand = req.query.brand;
    const checklists = await Checklist.find(filter)
      .populate('brand')
      .populate('assignedTo', USER_FIELDS)
      .sort({ createdAt: -1 });
    res.json({ checklists });
  } catch (error) {
    console.error('Error fetching checklists:', error);
    res.status(500).json({ message: 'Error fetching checklists', error: error.message });
  }
};

// User portal — checklists assigned to the logged-in user.
export const getMyChecklists = async (req, res) => {
  try {
    if (!req.user?._id) return res.status(401).json({ message: 'Not authenticated' });
    const checklists = await Checklist.find({ assignedTo: req.user._id })
      .populate('brand')
      .populate('createdBy', USER_FIELDS)
      .sort({ createdAt: -1 });
    res.json({ checklists });
  } catch (error) {
    console.error('Error fetching my checklists:', error);
    res.status(500).json({ message: 'Error fetching checklists', error: error.message });
  }
};

export const getChecklistById = async (req, res) => {
  try {
    const checklist = await Checklist.findById(req.params.id)
      .populate('brand')
      .populate('assignedTo', USER_FIELDS);
    if (!checklist) return res.status(404).json({ message: 'Checklist not found' });
    res.json(checklist);
  } catch (error) {
    console.error('Error fetching checklist:', error);
    res.status(500).json({ message: 'Error fetching checklist', error: error.message });
  }
};

// Admin — replace items and/or reassign.
export const updateChecklist = async (req, res) => {
  try {
    const { items, assignedTo, assignedDate, endDate } = req.body;
    const checklist = await Checklist.findById(req.params.id);
    if (!checklist) return res.status(404).json({ message: 'Checklist not found' });

    if (items !== undefined) checklist.items = sanitizeItems(items);
    if (assignedTo) checklist.assignedTo = assignedTo;
    if (assignedDate !== undefined) checklist.assignedDate = assignedDate ? new Date(assignedDate) : checklist.assignedDate;
    if (endDate !== undefined) checklist.endDate = endDate ? new Date(endDate) : null;

    const allDone = checklist.items.length > 0 && checklist.items.every((i) => i.completed);
    checklist.completedAt = allDone ? (checklist.completedAt || new Date()) : null;

    await checklist.save();
    const populated = await Checklist.findById(checklist._id)
      .populate('brand')
      .populate('assignedTo', USER_FIELDS);
    res.json({ message: 'Checklist updated successfully', checklist: populated });
  } catch (error) {
    console.error('Error updating checklist:', error);
    res.status(500).json({ message: 'Error updating checklist', error: error.message });
  }
};

// Toggle a single item's completed state. Allowed for the assigned user or an admin.
export const toggleChecklistItem = async (req, res) => {
  try {
    const { id, itemId } = req.params;
    const { completed, delayReason, note } = req.body;

    const checklist = await Checklist.findById(id);
    if (!checklist) return res.status(404).json({ message: 'Checklist not found' });

    const isOwner = req.user && checklist.assignedTo.toString() === req.user._id.toString();
    const isAdmin = req.user && req.user.Role === 'Admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'You are not allowed to update this checklist' });
    }

    const item = checklist.items.id(itemId);
    if (!item) return res.status(404).json({ message: 'Checklist item not found' });

    const markingComplete = completed != null ? !!completed : !item.completed;

    // If the checklist is past its end date, a reason for the delay must be supplied
    // before any task can be marked complete.
    const overdue = checklist.endDate && new Date() > new Date(checklist.endDate);
    if (markingComplete && overdue && !checklist.delayReason && !(delayReason && delayReason.trim())) {
      return res.status(400).json({
        message: 'A reason for the delay is required before completing tasks.',
        requiresDelayReason: true,
      });
    }
    if (delayReason && delayReason.trim()) {
      checklist.delayReason = delayReason.trim();
    }

    item.completed = markingComplete;
    item.completedAt = item.completed ? new Date() : null;
    if (note !== undefined) item.note = String(note).trim();

    // Stamp the whole checklist's completion time once every item is done.
    const allDone = checklist.items.length > 0 && checklist.items.every((i) => i.completed);
    checklist.completedAt = allDone ? (checklist.completedAt || new Date()) : null;

    await checklist.save();
    res.json({ message: 'Checklist updated', checklist });
  } catch (error) {
    console.error('Error toggling checklist item:', error);
    res.status(500).json({ message: 'Error updating checklist item', error: error.message });
  }
};

export const deleteChecklist = async (req, res) => {
  try {
    const checklist = await Checklist.findByIdAndDelete(req.params.id);
    if (!checklist) return res.status(404).json({ message: 'Checklist not found' });
    res.json({ message: 'Checklist deleted successfully' });
  } catch (error) {
    console.error('Error deleting checklist:', error);
    res.status(500).json({ message: 'Error deleting checklist', error: error.message });
  }
};
