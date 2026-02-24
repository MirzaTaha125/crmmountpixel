// middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import User from "../model/User.js";
import Client from "../model/Client.js";

export const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if it's a client token
    if (decoded.type === 'Client') {
      const client = await Client.findById(decoded.id).select("-password");
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      req.client = client;
      req.user = null; // Clear user if it's a client
      return next();
    }
    
    // Otherwise, it's a user token
    const user = await User.findById(decoded.id).select("-Password -Confirm_Password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    req.user = user;
    req.client = null; // Clear client if it's a user
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// Client-specific middleware (only allows clients)
export const clientAuthMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.type !== 'Client') {
      return res.status(403).json({ message: "Client access required" });
    }
    
    const client = await Client.findById(decoded.id).select("-password");
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }
    
    req.client = client;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export default authMiddleware;
