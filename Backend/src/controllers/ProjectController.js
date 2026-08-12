import Project from '../model/Project.js';
import Client from '../model/Client.js';
import Assignment from '../model/Assignment.js';

// Get projects for a specific client
export async function getClientProjects(req, res) {
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

    const projects = await Project.find({ clientId })
      .populate('userId', 'First_Name Last_Name Role')
      .populate('teamMembers.userId', 'First_Name Last_Name Role')
      .sort({ createdAt: -1 });

    res.status(200).json(projects);
  } catch (error) {
    console.error('Error fetching client projects:', error);
    res.status(500).json({ message: 'Error fetching projects', error });
  }
}

// Get all projects for user's assigned clients
export async function getUserProjects(req, res) {
  try {
    const userId = req.user._id;
    let projects;

    if (req.user.Role === 'Admin') {
      // Admin can see all projects
      projects = await Project.find()
        .populate('clientId', 'name email')
        .populate('userId', 'First_Name Last_Name Role')
        .populate('teamMembers.userId', 'First_Name Last_Name Role')
        .sort({ createdAt: -1 });
    } else {
      // Get projects for user's assigned clients only
      const assignments = await Assignment.find({ userId });
      const clientIds = assignments.map(a => a.clientId);
      
      projects = await Project.find({ clientId: { $in: clientIds } })
        .populate('clientId', 'name email')
        .populate('userId', 'First_Name Last_Name Role')
        .populate('teamMembers.userId', 'First_Name Last_Name Role')
        .sort({ createdAt: -1 });
    }

    res.status(200).json(projects);
  } catch (error) {
    console.error('Error fetching user projects:', error);
    res.status(500).json({ message: 'Error fetching projects', error });
  }
}

// Add new project
export async function addProject(req, res) {
  try {
    const { clientId, name, description, status, priority, startDate, endDate, estimatedHours, budget, tags, deliverables, teamMembers, notes } = req.body;
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

    const projectData = {
      clientId,
      userId,
      name,
      description,
      status: status || 'Planning',
      priority: priority || 'Medium',
      startDate,
      endDate,
      estimatedHours,
      budget,
      tags: tags || [],
      deliverables: deliverables || [],
      teamMembers: teamMembers || [],
      notes
    };

    const project = await Project.create(projectData);
    const populatedProject = await Project.findById(project._id)
      .populate('clientId', 'name email')
      .populate('userId', 'First_Name Last_Name Role')
      .populate('teamMembers.userId', 'First_Name Last_Name Role');

    res.status(201).json({ message: 'Project created successfully', project: populatedProject });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ message: 'Error creating project', error });
  }
}

// Update project
export async function updateProject(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const updateData = req.body;

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user has access to this project
    if (req.user.Role !== 'Admin' && project.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Access denied to this project' });
    }

    const updatedProject = await Project.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('clientId', 'name email')
     .populate('userId', 'First_Name Last_Name Role')
     .populate('teamMembers.userId', 'First_Name Last_Name Role');

    res.status(200).json({ message: 'Project updated successfully', project: updatedProject });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ message: 'Error updating project', error });
  }
}

// Delete project
export async function deleteProject(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user has access to this project
    if (req.user.Role !== 'Admin' && project.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Access denied to this project' });
    }

    await Project.findByIdAndDelete(id);
    res.status(200).json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ message: 'Error deleting project', error });
  }
}

// Get project statistics
export async function getProjectStatistics(req, res) {
  try {
    const userId = req.user._id;
    let matchQuery = {};

    if (req.user.Role !== 'Admin') {
      const assignments = await Assignment.find({ userId });
      const clientIds = assignments.map(a => a.clientId);
      matchQuery.clientId = { $in: clientIds };
    }

    const stats = await Project.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalProjects: { $sum: 1 },
          completedProjects: {
            $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] }
          },
          inProgressProjects: {
            $sum: { $cond: [{ $eq: ['$status', 'In Progress'] }, 1, 0] }
          },
          planningProjects: {
            $sum: { $cond: [{ $eq: ['$status', 'Planning'] }, 1, 0] }
          },
          onHoldProjects: {
            $sum: { $cond: [{ $eq: ['$status', 'On Hold'] }, 1, 0] }
          },
          totalBudget: { $sum: '$budget' },
          totalActualCost: { $sum: '$actualCost' },
          averageProgress: { $avg: '$progress' }
        }
      }
    ]);

    res.status(200).json(stats[0] || {
      totalProjects: 0,
      completedProjects: 0,
      inProgressProjects: 0,
      planningProjects: 0,
      onHoldProjects: 0,
      totalBudget: 0,
      totalActualCost: 0,
      averageProgress: 0
    });
  } catch (error) {
    console.error('Error fetching project statistics:', error);
    res.status(500).json({ message: 'Error fetching project statistics', error });
  }
}




