import UserPermission from "../model/UserPermission.js";

// Enforce a permission on the server, not just in the UI.
//
// Until now `canDo()` in React decided what a user could do, which only ever
// hid buttons — the API itself accepted any request from any signed-in staff
// member. Someone without `delete_salary` could still delete payroll by calling
// the endpoint directly.
//
// The rule here is deliberately the same one the frontend applies (see
// getUserPermissions in RoleController): an Admin has everything, anyone else
// needs the named permission granted to them. So a page the UI lets a user open
// is a page the API will serve them — this closes the hole without locking
// anybody out of work they were already doing.
export function requirePermission(permissionName) {
  return async (req, res, next) => {
    try {
      // Customer tokens never carry staff permissions.
      if (!req.user) return res.status(403).json({ message: "Staff access only" });

      if (req.user.Role === 'Admin') return next();

      const granted = await UserPermission.findOne({
        userId: req.user._id,
        permissionName,
        granted: true,
      }).lean();

      if (!granted) {
        return res.status(403).json({
          message: `You don't have permission to do this (${permissionName}).`,
        });
      }
      next();
    } catch (err) {
      console.error('Permission check failed:', err.message);
      // Fail closed: an error checking access is not a reason to allow it.
      res.status(500).json({ message: "Could not verify permissions" });
    }
  };
}
