import Permission from '../model/Permission.js';
import RolePermission from '../model/RolePermission.js';
import UserPermission from '../model/UserPermission.js';
import User from '../model/User.js';

// Get all permissions
export const getAllPermissions = async (req, res) => {
  try {
    const permissions = await Permission.find().sort({ category: 1, name: 1 });
    res.status(200).json({ permissions });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get permissions for a specific role
export const getRolePermissions = async (req, res) => {
  try {
    const { role } = req.params;
    
    // Get all permissions
    const allPermissions = await Permission.find().sort({ category: 1, name: 1 });
    
    // Get role permissions
    const rolePermissions = await RolePermission.find({ role });
    
    // Create a map of granted permissions
    const grantedPermissions = new Set(
      rolePermissions.filter(rp => rp.granted).map(rp => rp.permissionName)
    );
    
    // Combine with permission details
    const permissionsWithStatus = allPermissions.map(permission => ({
      ...permission.toObject(),
      granted: grantedPermissions.has(permission.name)
    }));
    
    res.status(200).json({ permissions: permissionsWithStatus });
  } catch (error) {
    console.error('Error fetching role permissions:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update role permissions
export const updateRolePermissions = async (req, res) => {
  try {
    const { role } = req.params;
    const { permissions } = req.body; // Array of { permissionName, granted }
    
    if (!permissions || !Array.isArray(permissions)) {
      return res.status(400).json({ message: 'Invalid permissions data' });
    }
    
    // Update each permission
    for (const { permissionName, granted } of permissions) {
      await RolePermission.findOneAndUpdate(
        { role, permissionName },
        { granted },
        { upsert: true, new: true }
      );
    }
    
    res.status(200).json({ message: 'Permissions updated successfully' });
  } catch (error) {
    console.error('Error updating role permissions:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get permissions for a specific user
export const getUserPermissions = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get all permissions
    const allPermissions = await Permission.find().sort({ category: 1, name: 1 });
    
    // Get user permissions
    const userPermissions = await UserPermission.find({ userId });
    
    // Create a map of granted permissions
    const grantedPermissions = new Set(
      userPermissions.filter(up => up.granted).map(up => up.permissionName)
    );
    
    // Combine with permission details
    const permissionsWithStatus = allPermissions.map(permission => ({
      ...permission.toObject(),
      granted: grantedPermissions.has(permission.name)
    }));
    
    res.status(200).json({ permissions: permissionsWithStatus });
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update user permissions
export const updateUserPermissions = async (req, res) => {
  try {
    const { userId } = req.params;
    const { permissions } = req.body; // Array of { permissionName, granted }
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Admins cannot have their permissions modified
    if (user.Role === 'Admin') {
      return res.status(400).json({ message: 'Cannot modify Admin permissions' });
    }
    
    if (!permissions || !Array.isArray(permissions)) {
      return res.status(400).json({ message: 'Invalid permissions data' });
    }
    
    // Update each permission
    for (const { permissionName, granted } of permissions) {
      await UserPermission.findOneAndUpdate(
        { userId, permissionName },
        { granted },
        { upsert: true, new: true }
      );
    }
    
    res.status(200).json({ message: 'User permissions updated successfully' });
  } catch (error) {
    console.error('Error updating user permissions:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


