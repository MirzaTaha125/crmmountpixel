import User from "../model/User.js";
import Client from "../model/Client.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { encrypt } from "../utils/encryption.js";
import { logUserAction, logActivity } from "../services/activityLogService.js";

export async function getUsers(req, res) {
  try {
    const users = await User.find().select('-Password -Confirm_Password').sort({ createdAt: -1 });
    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      message: "Error fetching users",
      error: error.message || "An unexpected error occurred"
    });
  }
}

export async function getUser(req, res) {
  try {
    const user = await User.findById(req.params.id).select('-Password -Confirm_Password -workPassword');
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json({ message: "User found", user });
  } catch (error) {
    res.status(500).json({ message: "Error fetching user", error: error.message || "An unexpected error occurred" });
  }
}

export async function createUser(req, res) {
  try {
    const { First_Name, Last_Name, Email, Password, Confirm_Password, Role, workEmail, workEmailName, workPassword } = req.body;

    // Validate required fields
    if (!First_Name || !Last_Name || !Email || !Password || !Confirm_Password) {
      return res.status(400).json({
        message: "Validation error",
        error: "All fields are required"
      });
    }

    // Validate password match
    if (Password !== Confirm_Password) {
      return res.status(400).json({
        message: "Validation error",
        error: "Passwords do not match"
      });
    }

    // Validate work email format if provided
    if (workEmail && !/^\S+@\S+\.\S+$/.test(workEmail)) {
      return res.status(400).json({
        message: "Validation error",
        error: "Invalid work email format"
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ Email: Email.trim() });
    if (existingUser) {
      return res.status(400).json({
        message: "Duplicate entry",
        error: "User with this email already exists"
      });
    }

    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(Password, 10);
    const hashedConfirmPassword = await bcrypt.hash(Confirm_Password, 10);

    // Prepare user data
    const userData = {
      First_Name: First_Name.trim(),
      Last_Name: Last_Name.trim(),
      Email: Email.trim().toLowerCase(),
      Password: hashedPassword,
      Confirm_Password: hashedConfirmPassword,
      Role: Role || 'Employee'
    };

    // Add work email if provided
    if (workEmail) {
      userData.workEmail = workEmail.trim().toLowerCase();
    }

    // Add work email name if provided
    if (workEmailName !== undefined) {
      userData.workEmailName = workEmailName.trim();
    }

    // Encrypt and add work password if provided
    if (workPassword) {
      userData.workPassword = encrypt(workPassword);
    }

    const user = await User.create(userData);

    // Log activity (only for admin actions)
    if (req.user && req.user.Role === 'Admin') {
      await logUserAction(
        req.user._id,
        'user_created',
        `Created user: ${user.First_Name} ${user.Last_Name} (${user.Email}) with role ${user.Role}`,
        { userId: user._id, email: user.Email, role: user.Role },
        req
      );
    }

    // Don't send password in response
    const userResponse = user.toObject();
    delete userResponse.Password;
    delete userResponse.Confirm_Password;
    delete userResponse.workPassword;

    res.status(201).json({ message: "User created successfully", user: userResponse });
  } catch (error) {
    console.error('Error creating user:', error);

    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        message: "Validation error",
        error: validationErrors.join(', ')
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        message: "Duplicate entry",
        error: "User with this email already exists"
      });
    }

    res.status(500).json({
      message: "Error creating user",
      error: error.message || "An unexpected error occurred"
    });
  }
}

export async function updateUser(req, res) {
  try {
    const { First_Name, Last_Name, Email, Password, Confirm_Password, Role, workEmail, workEmailName, workPassword } = req.body;

    // Prepare update fields
    let updateFields = {};

    if (First_Name !== undefined) updateFields.First_Name = First_Name.trim();
    if (Last_Name !== undefined) updateFields.Last_Name = Last_Name.trim();
    if (Email !== undefined) updateFields.Email = Email.trim().toLowerCase();
    if (Role !== undefined) updateFields.Role = Role;

    // Hash passwords if provided
    if (Password) {
      updateFields.Password = await bcrypt.hash(Password, 10);
    }
    if (Confirm_Password) {
      updateFields.Confirm_Password = await bcrypt.hash(Confirm_Password, 10);
    }

    // Handle work email
    if (workEmail !== undefined) {
      if (workEmail && !/^\S+@\S+\.\S+$/.test(workEmail)) {
        return res.status(400).json({
          message: "Validation error",
          error: "Invalid work email format"
        });
      }
      updateFields.workEmail = workEmail ? workEmail.trim().toLowerCase() : '';
    }

    // Handle work email name
    if (workEmailName !== undefined) {
      updateFields.workEmailName = workEmailName ? workEmailName.trim() : '';
    }

    // Encrypt and handle work password if provided
    if (workPassword !== undefined) {
      updateFields.workPassword = workPassword ? encrypt(workPassword) : '';
    }

    const user = await User.findByIdAndUpdate(req.params.id, updateFields, { new: true });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Log activity (only for admin actions)
    if (req.user && req.user.Role === 'Admin') {
      await logUserAction(
        req.user._id,
        'user_updated',
        `Updated user: ${user.First_Name} ${user.Last_Name} (${user.Email})`,
        { userId: user._id, email: user.Email, changes: updateFields },
        req
      );
    }

    // Don't send password in response
    const userResponse = user.toObject();
    delete userResponse.Password;
    delete userResponse.Confirm_Password;
    delete userResponse.workPassword;

    res.status(200).json({ message: "User updated successfully", user: userResponse });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: "Error updating user", error: error.message || "An unexpected error occurred" });
  }
}

export async function deleteUser(req, res) {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Log activity (only for admin actions)
    if (req.user && req.user.Role === 'Admin') {
      await logUserAction(
        req.user._id,
        'user_deleted',
        `Deleted user: ${user.First_Name} ${user.Last_Name} (${user.Email})`,
        { userId: user._id, email: user.Email, role: user.Role },
        req
      );
    }

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting user", error });
  }
}

export async function loginUser(req, res) {
  try {
    const { Email, Password } = req.body;

    // Validate input
    if (!Email || !Password) {
      return res.status(400).json({
        message: "Validation error",
        error: "Email and password are required"
      });
    }

    const email = Email.trim().toLowerCase();

    // First check if it's a client
    const client = await Client.findOne({ email });
    if (client && client.password) {
      const isMatch = await bcrypt.compare(Password, client.password);
      if (isMatch) {
        // Generate JWT token for client
        const token = jwt.sign(
          { id: client._id, type: 'Client', email: client.email },
          process.env.JWT_SECRET,
          { expiresIn: "7d" }
        );

        // Log client login
        await logActivity({
          userId: client._id,
          action: 'client_login',
          entityType: 'Client',
          entityId: client._id,
          description: `Client logged in: ${client.name} (${client.email})`,
          details: { clientId: client._id, email: client.email, name: client.name },
          module: 'Authentication',
          req
        });

        return res.status(200).json({
          message: "Login successful",
          client: {
            id: client._id,
            name: client.name,
            email: client.email,
            phone: client.phone,
            companyName: client.companyName,
            brand: client.brand || '',
            type: 'Client',
            token
          }
        });
      } else {
        // Log failed client login attempt
        await logActivity({
          userId: null,
          action: 'client_login_failed',
          entityType: 'Client',
          description: `Failed login attempt for client email: ${email}`,
          details: { email, reason: 'Invalid password' },
          module: 'Authentication',
          req
        });
      }
    }

    // If not a client or client password doesn't match, check for user
    const user = await User.findOne({ Email: email });
    if (!user) {
      // Log failed login attempt (user not found)
      await logActivity({
        userId: null,
        action: 'user_login_failed',
        entityType: 'User',
        description: `Failed login attempt for email: ${email} (User not found)`,
        details: { email, reason: 'User not found' },
        module: 'Authentication',
        req
      });

      return res.status(401).json({
        message: "Authentication failed",
        error: "Invalid email or password"
      });
    }

    // Compare the provided password with the hashed password
    const isMatch = await bcrypt.compare(Password, user.Password);
    if (!isMatch) {
      // Log failed login attempt (wrong password)
      await logActivity({
        userId: user._id,
        action: 'user_login_failed',
        entityType: 'User',
        entityId: user._id,
        description: `Failed login attempt for user: ${user.First_Name} ${user.Last_Name} (${user.Email})`,
        details: { userId: user._id, email: user.Email, reason: 'Invalid password' },
        module: 'Authentication',
        req
      });

      return res.status(401).json({
        message: "Authentication failed",
        error: "Invalid email or password"
      });
    }

    // Check for 2FA enabled
    const userWith2FA = await User.findById(user._id).select('+twoFactorSecret');
    const requires2FA = userWith2FA.twoFactorEnabled && userWith2FA.twoFactorVerified;

    if (requires2FA) {
      // Generate temporary session token (expires in 5 minutes) for 2FA verification
      const tempToken = jwt.sign(
        { id: user._id, Role: user.Role, temp: true, purpose: '2fa_verification' },
        process.env.JWT_SECRET,
        { expiresIn: "5m" }
      );

      // Log password verification success (2FA pending)
      await logActivity({
        userId: user._id,
        action: 'user_login_password_verified',
        entityType: 'User',
        entityId: user._id,
        description: `Password verified for ${user.First_Name} ${user.Last_Name}, 2FA required`,
        details: { userId: user._id, email: user.Email, role: user.Role },
        module: 'Authentication',
        req
      });

      // Return temporary token and indicate 2FA is required
      return res.status(200).json({
        message: "Password verified. 2FA required.",
        requires2FA: true,
        userId: user._id,
        tempToken: tempToken
      });
    }

    // Generate JWT token (normal login, no 2FA)
    const token = jwt.sign(
      { id: user._id, Role: user.Role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Log successful user login
    await logUserAction(
      user._id,
      'user_login',
      `User logged in: ${user.First_Name} ${user.Last_Name} (${user.Email})`,
      { userId: user._id, email: user.Email, role: user.Role },
      req
    );

    // Only return necessary user info
    res.status(200).json({
      message: "Login successful",
      requires2FA: false,
      user: {
        id: user._id,
        First_Name: user.First_Name,
        Last_Name: user.Last_Name,
        Email: user.Email,
        Role: user.Role,
        token
      }
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({
      message: "Server error",
      error: error.message || "An unexpected error occurred"
    });
  }
}

// Logout endpoint for users
export async function logoutUser(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Not authenticated",
        error: "User not authenticated"
      });
    }

    // Log user logout
    await logUserAction(
      req.user._id,
      'user_logout',
      `User logged out: ${req.user.First_Name} ${req.user.Last_Name} (${req.user.Email})`,
      { userId: req.user._id, email: req.user.Email, role: req.user.Role },
      req
    );

    res.status(200).json({
      message: "Logout successful"
    });
  } catch (error) {
    console.error('Error during logout:', error);
    res.status(500).json({
      message: "Server error",
      error: error.message || "An unexpected error occurred"
    });
  }
}
