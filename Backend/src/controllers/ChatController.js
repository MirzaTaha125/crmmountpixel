import Chat from '../model/Chat.js';
import Message from '../model/Message.js';
import User from '../model/User.js';
import Client from '../model/Client.js';
import Assignment from '../model/Assignment.js';
import UserPermission from '../model/UserPermission.js';
import RolePermission from '../model/RolePermission.js';
import mongoose from 'mongoose';
import { getIO } from '../socket.js';

// Helper function to check if user has a permission
const hasPermission = async (user, permissionName) => {
  // Admins have all permissions
  if (user?.Role === 'Admin') {
    return true;
  }

  if (!user || !permissionName) {
    return false;
  }

  const userId = user._id?.toString() || user.id?.toString() || user._id;

  // Check user-specific permissions
  let userIdForQuery;
  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    userIdForQuery = new mongoose.Types.ObjectId(userId);
  } else if (userId) {
    userIdForQuery = userId;
  } else {
    userIdForQuery = user._id;
  }

  // Check UserPermission
  const userPermission = await UserPermission.findOne({
    userId: userIdForQuery,
    permissionName: permissionName,
    granted: true
  });

  if (userPermission) {
    return true;
  }

  // Check RolePermission
  const rolePermission = await RolePermission.findOne({
    role: user.Role,
    permissionName: permissionName,
    granted: true
  });

  return !!rolePermission;
};

// Get or create a chat between users
export const getOrCreateChat = async (req, res) => {
  try {
    const { userId, clientId } = req.body;

    // Determine if current user is a client or regular user
    const isClient = !!req.client;
    const currentUserId = isClient ? req.client._id : req.user?._id;

    if (!currentUserId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Check messaging permissions for users (clients don't need permission checks)
    if (!isClient && req.user) {
      // Check general messaging permission
      const canMessage = await hasPermission(req.user, 'allow_message');
      if (!canMessage) {
        return res.status(403).json({ message: 'You do not have permission to use messaging' });
      }

      // Check specific permissions based on chat type
      if (clientId) {
        // Chatting with a client
        const canMessageClient = await hasPermission(req.user, 'allow_message_with_client');
        if (!canMessageClient) {
          return res.status(403).json({ message: 'You do not have permission to message clients' });
        }
      } else if (userId) {
        // Chatting with a user
        const canMessageUser = await hasPermission(req.user, 'allow_message_with_users');
        if (!canMessageUser) {
          return res.status(403).json({ message: 'You do not have permission to message users' });
        }
      }
    }

    if (!userId && !clientId) {
      return res.status(400).json({ message: 'Either userId or clientId is required' });
    }

    let chat;

    if (isClient) {
      // Current user is a client
      if (userId) {
        // Client wants to chat with a user
        // Create/find chat where clientId is current client and participants include the user
        chat = await Chat.findOne({
          clientId: currentUserId,
          participants: userId,
          type: 'client'
        }).populate('participants', 'First_Name Last_Name Email Role workEmailName')
          .populate('clientId', 'name email');

        if (!chat) {
          chat = await Chat.create({
            participants: [userId],
            clientId: currentUserId,
            type: 'client',
            createdBy: currentUserId
          });
          chat = await Chat.findById(chat._id)
            .populate('participants', 'First_Name Last_Name Email Role workEmailName')
            .populate('clientId', 'name email');
        }
      } else if (clientId) {
        // Client trying to chat with another client - not allowed
        return res.status(400).json({ message: 'Clients cannot chat with other clients' });
      }
    } else {
      // Current user is a regular user/admin
      if (clientId) {
        // User is chatting with a client
        chat = await Chat.findOne({
          clientId: clientId,
          participants: currentUserId,
          type: 'client'
        }).populate('participants', 'First_Name Last_Name Email Role workEmailName')
          .populate('clientId', 'name email');

        if (!chat) {
          chat = await Chat.create({
            participants: [currentUserId],
            clientId: clientId,
            type: 'client',
            createdBy: currentUserId
          });
          chat = await Chat.findById(chat._id)
            .populate('participants', 'First_Name Last_Name Email Role workEmailName')
            .populate('clientId', 'name email');
        }
      } else if (userId) {
        // Chat between users (not clients)
        const participants = [currentUserId, userId].sort();
        chat = await Chat.findOne({
          participants: { $all: participants, $size: 2 },
          type: 'user',
          clientId: null
        }).populate('participants', 'First_Name Last_Name Email Role workEmailName');

        if (!chat) {
          chat = await Chat.create({
            participants: participants,
            type: 'user',
            createdBy: currentUserId
          });
          chat = await Chat.findById(chat._id)
            .populate('participants', 'First_Name Last_Name Email Role workEmailName');
        }
      }
    }

    if (!chat) {
      return res.status(400).json({ message: 'Invalid chat parameters' });
    }

    res.status(200).json({ chat });
  } catch (error) {
    res.status(500).json({ message: 'Error getting or creating chat', error: error.message });
  }
};

// Get all chats for current user
export const getUserChats = async (req, res) => {
  try {
    // Check if current user is a client
    const isClient = !!req.client;
    const userId = isClient ? req.client._id : req.user?._id;
    const userRole = req.user?.Role;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Check messaging permission for users (clients don't need permission checks)
    if (!isClient && req.user) {
      const canMessage = await hasPermission(req.user, 'allow_message');
      if (!canMessage) {
        return res.status(403).json({ message: 'You do not have permission to use messaging' });
      }
    }

    let chats;

    if (isClient) {
      // Client can see all chats where they are the clientId
      chats = await Chat.find({
        clientId: userId,
        type: 'client'
      })
        .populate('participants', 'First_Name Last_Name Email Role workEmailName')
        .populate('clientId', 'name email')
        .sort({ lastMessageAt: -1 });

    } else if (userRole === 'Admin') {
      // Admin can see:
      // 1. Chats where they're a participant (user chats, group chats, client chats where they're a participant)
      // 2. Chats they created
      chats = await Chat.find({
        $or: [
          { participants: userId }, // User is a participant (user chats, group chats, client chats)
          { createdBy: userId } // User created the chat
        ]
      })
        .populate('participants', 'First_Name Last_Name Email Role workEmailName')
        .populate('clientId', 'name email')
        .sort({ lastMessageAt: -1 });
    } else {
      // Regular users see only chats where they are a participant
      // They can see:
      // 1. User-to-user chats where they are a participant
      // 2. Group chats where they are a participant
      // 3. Client chats where they are a participant (and the client is assigned to them)
      const assignments = await Assignment.find({ userId });
      const assignedClientIds = assignments.map(a => {
        // Ensure we get the ObjectId, not a string
        const clientId = a.clientId?._id || a.clientId;
        return clientId;
      });

      // Only show chats where user is a participant
      // For client chats, also verify the client is assigned to the user
      chats = await Chat.find({
        $and: [
          { participants: userId }, // User must be a participant
          {
            $or: [
              { type: 'user' }, // User-to-user chats
              { type: 'group' }, // Group chats
              {
                type: 'client',
                clientId: { $in: assignedClientIds } // Client chats only if client is assigned to user
              }
            ]
          }
        ]
      })
        .populate('participants', 'First_Name Last_Name Email Role workEmailName')
        .populate('clientId', 'name email')
        .sort({ lastMessageAt: -1 });

    }

    // Filter out chats with deleted clients and check permissions
    const validChats = await Promise.all(
      chats.map(async (chat) => {
        // If it's a client chat, make sure the client still exists
        if (chat.type === 'client') {
          // If clientId is null or undefined, the client was deleted
          if (!chat.clientId || chat.clientId === null || chat.clientId === undefined) {
            return null;
          }

          // For users (not clients), check if they have permission to message clients
          if (!isClient && req.user) {
            const canMessageClient = await hasPermission(req.user, 'allow_message_with_client');
            if (!canMessageClient) {
              return null; // Filter out client chats if user doesn't have permission
            }
          }
        } else if (chat.type === 'user' || chat.type === 'group') {
          // For user and group chats, check if user has permission to message users
          if (!isClient && req.user) {
            const canMessageUsers = await hasPermission(req.user, 'allow_message_with_users');
            if (!canMessageUsers) {
              return null; // Filter out user chats if user doesn't have permission
            }
          }
        }

        return chat;
      })
    );

    // Remove null values (filtered out chats)
    const filteredChats = validChats.filter(chat => chat !== null);

    // Get unread counts for each chat
    const chatsWithUnread = await Promise.all(
      filteredChats.map(async (chat) => {
        let unreadCount = 0;

        if (isClient) {
          // For clients, count unread messages from users (similar to user logic)
          const clientIdObjectId = mongoose.Types.ObjectId.isValid(userId)
            ? new mongoose.Types.ObjectId(userId)
            : userId;

          // Get all messages and check manually
          const allMessages = await Message.find({ chatId: chat._id });
          unreadCount = 0;

          for (const message of allMessages) {
            // Skip messages from the client (client's own messages)
            if (!message.senderId && message.clientId && message.clientId.toString() === clientIdObjectId.toString()) {
              continue;
            }

            // Count as unread if it's from a user (senderId is not null)
            if (message.senderId) {
              // Check if this client has read this message
              const clientIdString = clientIdObjectId.toString();
              let isRead = false;
              if (message.readBy && Array.isArray(message.readBy)) {
                for (const read of message.readBy) {
                  if (!read || !read.clientId) continue;
                  const readClientId = read.clientId.toString ? read.clientId.toString() : String(read.clientId);
                  if (readClientId === clientIdString) {
                    isRead = true;
                    break;
                  }
                }
              }

              if (!isRead) {
                unreadCount++;
              }
            }
          }
        } else {
          // For regular users, count unread messages manually for accuracy
          // Convert userId to ObjectId for proper comparison
          const userIdObjectId = mongoose.Types.ObjectId.isValid(userId)
            ? new mongoose.Types.ObjectId(userId)
            : userId;

          // Get all messages and check manually
          const allMessages = await Message.find({ chatId: chat._id });
          unreadCount = 0;

          for (const message of allMessages) {
            // Skip messages from the current user
            const messageSenderId = message.senderId?.toString() || message.senderId;
            if (messageSenderId && messageSenderId === userIdObjectId.toString()) {
              continue;
            }

            // Count as unread if it's from another user or a client
            const isFromOtherUser = message.senderId && messageSenderId !== userIdObjectId.toString();
            const isFromClient = !message.senderId && message.clientId;

            if (isFromOtherUser || isFromClient) {
              // Check if this user has read this message
              // Convert userIdObjectId to string for comparison
              const userIdString = userIdObjectId.toString();
              let isRead = false;
              if (message.readBy && Array.isArray(message.readBy)) {
                for (const read of message.readBy) {
                  if (!read || !read.userId) continue;
                  const readUserId = read.userId.toString ? read.userId.toString() : String(read.userId);
                  if (readUserId === userIdString) {
                    isRead = true;
                    break;
                  }
                }
              }

              if (!isRead) {
                unreadCount++;
              }
            }
          }
        }

        return {
          ...chat.toObject(),
          unreadCount
        };
      })
    );


    res.status(200).json({ chats: chatsWithUnread });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching chats', error: error.message });
  }
};

// Get messages for a chat
export const getChatMessages = async (req, res) => {
  try {
    const { chatId } = req.params;

    // Check if current user is a client
    const isClient = !!req.client;
    const userId = isClient ? req.client._id : req.user?._id;
    const userRole = req.user?.Role;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Check messaging permission for users (clients don't need permission checks)
    if (!isClient && req.user) {
      const canMessage = await hasPermission(req.user, 'allow_message');
      if (!canMessage) {
        return res.status(403).json({ message: 'You do not have permission to use messaging' });
      }
    }

    // Verify user has access to this chat
    const chat = await Chat.findById(chatId)
      .populate('participants', 'First_Name Last_Name Email Role workEmailName')
      .populate('clientId', 'name email');

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Check if user has access to this chat
    if (isClient) {
      // Client can only access chats where they are the clientId
      const chatClientId = chat.clientId?._id?.toString() || chat.clientId?.toString();
      if (chatClientId !== userId.toString()) {
        return res.status(403).json({ message: 'Access denied to this chat' });
      }
    } else {
      // Regular user - check if they're a participant
      const isParticipant = chat.participants.some(p => {
        const pId = p._id?.toString() || p.toString();
        return pId === userId.toString();
      });

      if (!isParticipant && userRole !== 'Admin') {
        // Check if it's a client chat and user has assignment
        if (chat.clientId) {
          const chatClientId = chat.clientId?._id?.toString() || chat.clientId?.toString();
          const assignment = await Assignment.findOne({
            userId: userId,
            clientId: chatClientId
          });
          if (!assignment) {
            return res.status(403).json({ message: 'Access denied' });
          }
        } else {
          return res.status(403).json({ message: 'Access denied' });
        }
      }
    }

    // Mark messages as read FIRST (for both users and clients)
    // This ensures they're marked before we return them
    // Check if we should mark as read (default: true)
    const shouldMarkAsRead = req.query.markAsRead !== 'false';

    if (shouldMarkAsRead) {
      if (isClient) {
        // For clients, mark messages from users as read
        const clientIdObjectId = mongoose.Types.ObjectId.isValid(userId)
          ? new mongoose.Types.ObjectId(userId)
          : userId;

        // Find all messages in this chat that need to be marked as read
        const messages = await Message.find({ chatId: chatId });

        // Update each message individually to ensure proper saving
        const updatePromises = [];
        for (const message of messages) {
          // Skip messages from the client (client's own messages)
          if (!message.senderId && message.clientId && message.clientId.toString() === clientIdObjectId.toString()) {
            continue;
          }

          // Only mark messages from users (senderId is not null) as read
          if (message.senderId) {
            // Check if already read by this client
            const clientIdString = clientIdObjectId.toString();
            let isRead = false;
            if (message.readBy && Array.isArray(message.readBy)) {
              isRead = message.readBy.some(
                read => {
                  if (!read || !read.clientId) return false;
                  const readClientId = read.clientId.toString ? read.clientId.toString() : String(read.clientId);
                  return readClientId === clientIdString;
                }
              );
            }

            // If not read, add this client to readBy
            if (!isRead) {
              updatePromises.push(
                Message.updateOne(
                  { _id: message._id },
                  {
                    $pull: {
                      readBy: { clientId: clientIdObjectId }
                    }
                  }
                ).then(() => {
                  return Message.updateOne(
                    { _id: message._id },
                    {
                      $push: {
                        readBy: {
                          clientId: clientIdObjectId,
                          readAt: new Date()
                        }
                      }
                    }
                  );
                })
              );
            }
          }
        }

        // Wait for all updates to complete
        if (updatePromises.length > 0) {
          await Promise.all(updatePromises);
        }
      } else {
        // Convert userId to ObjectId for consistent comparison
        const userIdObjectId = mongoose.Types.ObjectId.isValid(userId)
          ? new mongoose.Types.ObjectId(userId)
          : userId;

        // Find all messages in this chat that need to be marked as read
        const messages = await Message.find({ chatId: chatId });

        // Update each message individually to ensure proper saving
        const updatePromises = [];
        for (const message of messages) {
          // Skip messages from the current user
          if (message.senderId && message.senderId.toString() === userIdObjectId.toString()) {
            continue;
          }

          // Check if already read by this user
          // Convert userIdObjectId to string for comparison
          const userIdString = userIdObjectId.toString();
          let isRead = false;
          if (message.readBy && Array.isArray(message.readBy)) {
            isRead = message.readBy.some(
              read => {
                if (!read || !read.userId) return false;
                const readUserId = read.userId.toString ? read.userId.toString() : String(read.userId);
                return readUserId === userIdString;
              }
            );
          }

          // If not read, add this user to readBy
          if (!isRead) {
            // Use a two-step update: first remove any existing entry, then add new one
            // This ensures no duplicates and proper saving
            updatePromises.push(
              Message.updateOne(
                { _id: message._id },
                {
                  $pull: {
                    readBy: { userId: userIdObjectId }
                  }
                }
              ).then(() => {
                return Message.updateOne(
                  { _id: message._id },
                  {
                    $push: {
                      readBy: {
                        userId: userIdObjectId,
                        readAt: new Date()
                      }
                    }
                  }
                );
              })
            );
          }
        }

        // Wait for all updates to complete
        if (updatePromises.length > 0) {
          await Promise.all(updatePromises);

          // Emit Socket event that messages were read
          try {
            const io = getIO();
            // User read the messages
            io.to(chatId).emit('messages_read', {
              chatId,
              readBy: { userId: userIdObjectId }
            });
          } catch (err) {
            console.error('Socket emit error:', err);
          }
        }
      }
    }

    // Get messages AFTER marking as read
    const messages = await Message.find({ chatId })
      .populate('senderId', 'First_Name Last_Name Email Role workEmailName')
      .sort({ createdAt: 1 });

    res.status(200).json({ messages });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching messages', error: error.message });
  }
};

// Send a message
export const sendMessage = async (req, res) => {
  try {
    const { chatId, message, clientId } = req.body;

    // Check if current user is a client
    const isClient = !!req.client;
    const userId = isClient ? req.client._id : req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Check messaging permissions for users (clients don't need permission checks)
    if (!isClient && req.user) {
      // Check general messaging permission
      const canMessage = await hasPermission(req.user, 'allow_message');
      if (!canMessage) {
        return res.status(403).json({ message: 'You do not have permission to use messaging' });
      }

      // Check specific permissions based on chat type
      if (clientId) {
        // Sending to a client
        const canMessageClient = await hasPermission(req.user, 'allow_message_with_client');
        if (!canMessageClient) {
          return res.status(403).json({ message: 'You do not have permission to message clients' });
        }
      } else if (chatId) {
        // Check chat type to determine permission needed
        const chat = await Chat.findById(chatId);
        if (chat) {
          if (chat.type === 'client' && chat.clientId) {
            // Chat with client
            const canMessageClient = await hasPermission(req.user, 'allow_message_with_client');
            if (!canMessageClient) {
              return res.status(403).json({ message: 'You do not have permission to message clients' });
            }
          } else if (chat.type === 'user' || chat.type === 'group') {
            // Chat with users
            const canMessageUser = await hasPermission(req.user, 'allow_message_with_users');
            if (!canMessageUser) {
              return res.status(403).json({ message: 'You do not have permission to message users' });
            }
          }
        }
      }
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message is required' });
    }

    let chat;

    if (chatId) {
      chat = await Chat.findById(chatId)
        .populate('participants', 'First_Name Last_Name Email Role workEmailName')
        .populate('clientId', 'name email');
      if (!chat) {
        return res.status(404).json({ message: 'Chat not found' });
      }

      // Verify access
      if (isClient) {
        // Client can only send to chats where they are the clientId
        const chatClientId = chat.clientId?._id?.toString() || chat.clientId?.toString();
        if (chatClientId !== userId.toString()) {
          return res.status(403).json({ message: 'Access denied to this chat' });
        }
      } else {
        // User must be a participant
        const isParticipant = chat.participants.some(p => {
          const pId = p._id?.toString() || p.toString();
          return pId === userId.toString();
        });
        if (!isParticipant && req.user?.Role !== 'Admin') {
          return res.status(403).json({ message: 'Access denied to this chat' });
        }
      }
    } else if (clientId && !isClient) {
      // User is creating/using a chat with a client
      chat = await Chat.findOne({
        clientId: clientId,
        participants: userId,
        type: 'client'
      });

      if (!chat) {
        chat = await Chat.create({
          participants: [userId],
          clientId: clientId,
          type: 'client',
          createdBy: userId
        });
      }
    } else {
      return res.status(400).json({ message: 'Either chatId or clientId is required' });
    }

    // Create message
    // For clients, senderId is null and we use clientId to identify the sender
    // For users, senderId is the userId
    const messageData = {
      chatId: chat._id,
      message: message.trim(),
      clientId: chat.clientId || null
    };

    if (isClient) {
      // Client sending message - senderId is null, clientId identifies the sender
      messageData.senderId = null; // Clients don't have userId in User collection
    } else {
      // User sending message
      messageData.senderId = userId;
    }

    const newMessage = await Message.create(messageData);

    // Update chat last message
    await Chat.findByIdAndUpdate(chat._id, {
      lastMessage: message.trim(),
      lastMessageAt: new Date()
    });

    // Populate message for response
    let populatedMessage;
    if (isClient) {
      // For client messages, we don't populate senderId since it's null
      populatedMessage = await Message.findById(newMessage._id);
      // Add client info manually
      populatedMessage = {
        ...populatedMessage.toObject(),
        senderId: null,
        clientSenderId: req.client._id,
        clientSenderName: req.client.name
      };
    } else {
      populatedMessage = await Message.findById(newMessage._id)
        .populate('senderId', 'First_Name Last_Name Email Role workEmailName');
    }

    // SOCKET.IO EMIT
    try {
      const io = getIO();

      // 1. Emit the new message to the chat room (for open chats)
      io.to(chat._id.toString()).emit('receive_message', populatedMessage);

      // 2. Emit notification to update chat list for all participants
      // This ensures unread counts and last message update in the sidebar

      // Notify user participants
      if (chat.participants && chat.participants.length > 0) {
        chat.participants.forEach(participant => {
          const pId = participant._id ? participant._id.toString() : participant.toString();
          io.to(pId).emit('update_chat_list', {
            chatId: chat._id,
            lastMessage: message.trim(),
            lastMessageAt: new Date()
          });
        });
      }

      // Notify client if involved
      if (chat.clientId) {
        const cId = chat.clientId._id ? chat.clientId._id.toString() : chat.clientId.toString();
        io.to(cId).emit('update_chat_list', {
          chatId: chat._id,
          lastMessage: message.trim(),
          lastMessageAt: new Date()
        });
      }

    } catch (socketError) {
      console.error('Socket emit error:', socketError);
    }

    res.status(201).json({ message: populatedMessage });
  } catch (error) {
    res.status(500).json({ message: 'Error sending message', error: error.message });
  }
};

// Get users and clients for chat
export const getChatContacts = async (req, res) => {
  try {
    let users = [];
    let clients = [];

    // Check messaging permission for users (clients don't need permission checks)
    if (!req.client && req.user) {
      const canMessage = await hasPermission(req.user, 'allow_message');
      if (!canMessage) {
        return res.status(403).json({ message: 'You do not have permission to use messaging' });
      }
    }

    // Check if the current user is a client (req.client is set by authMiddleware for clients)
    if (req.client) {
      const clientId = req.client._id;
      // Client can see all users assigned to them
      const assignments = await Assignment.find({ clientId });

      const assignedUserIds = assignments.map(a => {
        // Handle both populated and unpopulated userId
        const assignedUserId = a.userId?._id || a.userId;
        return assignedUserId;
      });

      if (assignedUserIds.length > 0) {
        users = await User.find({ _id: { $in: assignedUserIds } })
          .select('First_Name Last_Name Email Role workEmailName')
          .sort({ First_Name: 1, Last_Name: 1 });
      } else {
        users = [];
      }

      // Clients don't see other clients
      clients = [];
    } else if (req.user && req.user.Role === 'Admin') {
      const userId = req.user._id;

      // Admin should see ALL users
      // Check if admin can message users (though usually admins can do everything, let's respect the permission check if it exists, or default to true for Admin)
      let canMessageUsers = await hasPermission(req.user, 'allow_message_with_users');
      // Force allow for Admin if permission check fails or returns false (as backup, though hasPermission handles Admin check)
      if (req.user.Role === 'Admin') canMessageUsers = true;

      if (canMessageUsers) {
        users = await User.find({ _id: { $ne: userId } })
          .select('First_Name Last_Name Email Role workEmailName')
          .sort({ First_Name: 1, Last_Name: 1 });
      }

      // Admin should see ALL clients
      let canMessageClients = await hasPermission(req.user, 'allow_message_with_client');
      if (req.user.Role === 'Admin') canMessageClients = true;

      if (canMessageClients) {
        // Admin can see ALL clients in contact list
        clients = await Client.find()
          .select('name email phone')
          .sort({ name: 1 });
      }
    } else if (req.user) {
      // Regular users can chat with all users/admins and their assigned clients
      const userId = req.user._id;

      // Check if user can message other users
      const canMessageUsers = await hasPermission(req.user, 'allow_message_with_users');
      if (canMessageUsers) {
        users = await User.find({ _id: { $ne: userId } })
          .select('First_Name Last_Name Email Role workEmailName')
          .sort({ First_Name: 1, Last_Name: 1 });
      }

      // Check if user can message clients
      const canMessageClients = await hasPermission(req.user, 'allow_message_with_client');
      if (canMessageClients) {
        const assignments = await Assignment.find({ userId });

        const assignedClientIds = assignments.map(a => {
          // Handle both populated and unpopulated clientId
          const clientId = a.clientId?._id || a.clientId;
          return clientId;
        });

        if (assignedClientIds.length > 0) {
          clients = await Client.find({ _id: { $in: assignedClientIds } })
            .select('name email phone')
            .sort({ name: 1 });
        }
      }
    }

    res.status(200).json({ users, clients });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching contacts', error: error.message });
  }
};

// Create a group chat
export const createGroup = async (req, res) => {
  try {
    const { groupName, participantIds } = req.body;
    const currentUserId = req.user._id;

    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Check messaging permissions
    const canMessage = await hasPermission(req.user, 'allow_message');
    if (!canMessage) {
      return res.status(403).json({ message: 'You do not have permission to use messaging' });
    }

    const canMessageUsers = await hasPermission(req.user, 'allow_message_with_users');
    if (!canMessageUsers) {
      return res.status(403).json({ message: 'You do not have permission to message users' });
    }

    if (!groupName || !groupName.trim()) {
      return res.status(400).json({ message: 'Group name is required' });
    }

    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return res.status(400).json({ message: 'At least one participant is required' });
    }

    // Include current user in participants
    const allParticipants = [...new Set([currentUserId.toString(), ...participantIds.map(id => id.toString())])];

    // Create group chat
    const groupChat = await Chat.create({
      participants: allParticipants,
      type: 'group',
      groupName: groupName.trim(),
      createdBy: currentUserId
    });

    const populatedChat = await Chat.findById(groupChat._id)
      .populate('participants', 'First_Name Last_Name Email Role workEmailName')
      .populate('clientId', 'name email');

    res.status(201).json({ chat: populatedChat });
  } catch (error) {
    res.status(500).json({ message: 'Error creating group', error: error.message });
  }
};


