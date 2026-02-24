import Role from '../model/Role.js';
import User from '../model/User.js';
import Permission from '../model/Permission.js';
import RolePermission from '../model/RolePermission.js';
import mongoose from 'mongoose';

// Get all roles
export const getAllRoles = async (req, res) => {
  try {
    const roles = await Role.find({ isActive: true })
      .populate('createdBy', 'First_Name Last_Name')
      .sort({ createdAt: -1 });
    
    res.status(200).json({ roles });
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get single role
export const getRoleById = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id)
      .populate('createdBy', 'First_Name Last_Name');
    
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }
    
    res.status(200).json({ role });
  } catch (error) {
    console.error('Error fetching role:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Create new role
export const createRole = async (req, res) => {
  try {
    const { name, description, permissions } = req.body;
    
    // Validate required fields
    if (!name || !description) {
      return res.status(400).json({ message: 'Name and description are required' });
    }
    
    // Check if role name already exists
    const existingRole = await Role.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existingRole) {
      return res.status(400).json({ message: 'Role with this name already exists' });
    }
    
    // Validate permissions exist
    if (permissions && permissions.length > 0) {
      const validPermissions = await Permission.find({ name: { $in: permissions } });
      if (validPermissions.length !== permissions.length) {
        return res.status(400).json({ message: 'Some permissions are invalid' });
      }
    }
    
    const roleData = {
      name,
      description,
      permissions: permissions || [],
      createdBy: req.user._id
    };
    
    const role = await Role.create(roleData);
    await role.populate('createdBy', 'First_Name Last_Name');
    
    res.status(201).json({ message: 'Role created successfully', role });
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update role
export const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, permissions } = req.body;
    
    const role = await Role.findById(id);
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }
    
    // Check if new name conflicts with existing roles (excluding current role)
    if (name && name !== role.name) {
      const existingRole = await Role.findOne({ 
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        _id: { $ne: id }
      });
      if (existingRole) {
        return res.status(400).json({ message: 'Role with this name already exists' });
      }
    }
    
    // Validate permissions exist
    if (permissions && permissions.length > 0) {
      const validPermissions = await Permission.find({ name: { $in: permissions } });
      if (validPermissions.length !== permissions.length) {
        return res.status(400).json({ message: 'Some permissions are invalid' });
      }
    }
    
    const updateData = {};
    if (name) updateData.name = name;
    if (description) updateData.description = description;
    if (permissions) updateData.permissions = permissions;
    
    const updatedRole = await Role.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'First_Name Last_Name');
    
    res.status(200).json({ message: 'Role updated successfully', role: updatedRole });
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Delete role
export const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;
    
    const role = await Role.findById(id);
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }
    
    // Check if any users are assigned to this role
    const usersWithRole = await User.find({ roleId: id });
    if (usersWithRole.length > 0) {
      return res.status(400).json({ 
        message: `Cannot delete role. ${usersWithRole.length} user(s) are assigned to this role. Please reassign them first.` 
      });
    }
    
    // Soft delete by setting isActive to false
    await Role.findByIdAndUpdate(id, { isActive: false });
    
    res.status(200).json({ message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Error deleting role:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Assign role to user
export const assignRoleToUser = async (req, res) => {
  try {
    const { userId, roleId } = req.body;
    
    if (!userId || !roleId) {
      return res.status(400).json({ message: 'User ID and Role ID are required' });
    }
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if role exists and is active
    const role = await Role.findOne({ _id: roleId, isActive: true });
    if (!role) {
      return res.status(404).json({ message: 'Role not found or inactive' });
    }
    
    // Update user's role
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { 
        roleId: roleId,
        Role: role.name // Keep the Role field for backward compatibility
      },
      { new: true }
    ).select('-Password -Confirm_Password');
    
    res.status(200).json({ 
      message: 'Role assigned successfully', 
      user: updatedUser,
      role: role
    });
  } catch (error) {
    console.error('Error assigning role:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get users with their roles
export const getUsersWithRoles = async (req, res) => {
  try {
    const users = await User.find()
      .populate('roleId', 'name description permissions')
      .select('-Password -Confirm_Password')
      .sort({ createdAt: -1 });
    
    res.status(200).json({ users });
  } catch (error) {
    console.error('Error fetching users with roles:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get user permissions based on individual user permissions
export const getUserPermissions = async (req, res) => {
  try {
    // Since this route requires authentication, req.user should always be available
    // Users can only request their own permissions, so we'll use req.user directly
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    // Get the actual user ID from the authenticated user
    const actualUserId = user._id?.toString() || user.id?.toString();
    
    // If user is admin, return all permissions
    if (user.Role === 'Admin') {
      const allPermissions = await Permission.find();
      return res.status(200).json({ permissions: allPermissions.map(p => p.name) });
    }
    
    // Get individual user permissions from UserPermission collection
    const UserPermission = (await import('../model/UserPermission.js')).default;
    
    // Convert userId to ObjectId for query - use the actual user ID
    let userIdForQuery;
    if (actualUserId && mongoose.Types.ObjectId.isValid(actualUserId)) {
      userIdForQuery = new mongoose.Types.ObjectId(actualUserId);
    } else if (actualUserId) {
      userIdForQuery = actualUserId;
    } else {
      // Fallback to user._id directly
      userIdForQuery = user._id;
    }
    
    // Try multiple query formats to find permissions
    let userPermissions = await UserPermission.find({ 
      userId: userIdForQuery, 
      granted: true 
    });
    
    // If no results, try with string format
    if (userPermissions.length === 0 && actualUserId) {
      userPermissions = await UserPermission.find({ 
        userId: actualUserId, 
        granted: true 
      });
    }
    
    // If still no results, try with user._id directly
    if (userPermissions.length === 0 && user._id) {
      userPermissions = await UserPermission.find({ 
        userId: user._id, 
        granted: true 
      });
    }
    
    if (userPermissions.length > 0) {
      const permissionNames = userPermissions.map(up => up.permissionName);
      return res.status(200).json({ permissions: permissionNames });
    }
    
    // Default: no permissions
    res.status(200).json({ permissions: [] });
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};
