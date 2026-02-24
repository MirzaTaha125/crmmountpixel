import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import getApiBaseUrl from '../apiBase';
import { useSession } from '../session';
import { usePermissions } from '../contexts/PermissionContext';
import { FaSearch, FaPhone, FaVideo, FaEllipsisV, FaSmile, FaMicrophone, FaCheck, FaCheckDouble, FaPlus, FaTimes, FaArrowLeft, FaPaperPlane, FaStop, FaSync } from 'react-icons/fa';
import { theme, getColors } from '../theme';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import EmojiPicker from 'emoji-picker-react';

const API_URL = getApiBaseUrl();

function ChatPage({ colors: propColors, onBack, hideGroups = false, onMessagesViewed }) {
  const colors = propColors || getColors();
  const { user } = useSession();
  const { canDo } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [chats, setChats] = useState([]);
  const [contacts, setContacts] = useState({ users: [], clients: [] });
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const [groups, setGroups] = useState([]);
  const [people, setPeople] = useState([]);
  const [activeTab, setActiveTab] = useState('people'); // 'groups' or 'people'
  const [unreadCounts, setUnreadCounts] = useState({});
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef(null);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [showSidebar, setShowSidebar] = useState(true);
  const [newChatModalTab, setNewChatModalTab] = useState('clients'); // 'clients' or 'users'
  
  // Calculate responsive breakpoints
  const isMobile = windowWidth <= 768;
  const isTablet = windowWidth > 768 && windowWidth <= 1024;
  
  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const voiceMessageRef = useRef(''); // Store voice message text
  const shouldAutoSendRef = useRef(false); // Flag to auto-send after voice recognition
  const selectedChatRef = useRef(selectedChat); // Keep track of selected chat
  const sendingRef = useRef(sending); // Keep track of sending state
  const fetchChatsRef = useRef(null); // Keep track of fetchChats function
  
  // Socket ref
  const socketRef = useRef(null);

  // Update refs when state changes
  useEffect(() => {
    selectedChatRef.current = selectedChat;
    
    // Join chat room when selectedChat changes
    if (socketRef.current && selectedChat) {
      socketRef.current.emit('join_chat', selectedChat._id);
    }
  }, [selectedChat]);
  
  useEffect(() => {
    sendingRef.current = sending;
  }, [sending]);
  
  // Refs to prevent unnecessary updates
  const manuallyClearedChatsRef = useRef(new Set()); // Track chats manually cleared

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Fetch chats
  const fetchChats = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      
      const res = await axios.get(`${API_URL}/api/chat/user/chats`, {
        headers: getAuthHeaders()
      });
      const chatsData = res.data.chats || [];
      
      setChats(chatsData);

      // Separate into groups and people
      const groupsList = chatsData.filter(chat => chat.type === 'group');
      const peopleList = chatsData.filter(chat => chat.type !== 'group');
      
      setGroups(groupsList);
      setPeople(peopleList);

      // Calculate unread counts
      const counts = {};
      chatsData.forEach(chat => {
        counts[chat._id] = chat.unreadCount || 0;
      });
      setUnreadCounts(prevCounts => {
        const merged = { ...prevCounts };
        Object.keys(counts).forEach(id => {
          if (manuallyClearedChatsRef.current.has(id)) {
            merged[id] = 0;
            if (counts[id] === 0) {
                manuallyClearedChatsRef.current.delete(id);
            }
          } else {
            merged[id] = counts[id];
          }
        });
        return merged;
      });
    } catch (error) {
      // Error fetching chats
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  // Fetch messages for selected chat
  const fetchMessages = useCallback(async (chatId, silent = false, markAsRead = true) => {
    if (!chatId) {
      setMessages([]);
      return;
    }
    
    try {
      if (!silent) {
        setMessagesLoading(true);
      }
      
      const res = await axios.get(`${API_URL}/api/chat/${chatId}/messages?markAsRead=${markAsRead}`, {
        headers: getAuthHeaders()
      });
      const newMessages = res.data.messages || [];
      
      setMessages(newMessages);
      
      if (!silent && markAsRead) {
        // Mark as manually cleared for UI
        manuallyClearedChatsRef.current.add(chatId);
        setUnreadCounts(prev => ({
          ...prev,
          [chatId]: 0
        }));
        // Notify parent
        if (onMessagesViewed) {
          onMessagesViewed();
        }
      }
    } catch (error) {
      // Error fetching messages
    } finally {
      if (!silent) {
        setMessagesLoading(false);
      }
    }
  }, [onMessagesViewed]);

  // Initialize Socket.IO
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Connect to Socket.IO server
    socketRef.current = io(API_URL, {
      auth: { token }
    });

    socketRef.current.on('connect', () => {
      console.log('Connected to socket server');
    });

    socketRef.current.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
    });

    // Listen for new messages
    socketRef.current.on('receive_message', (message) => {
      if (selectedChatRef.current && message.chatId === selectedChatRef.current._id) {
        setMessages(prev => {
            // Deduplicate logic just in case
            if (prev.some(m => m._id === message._id)) return prev;
            return [...prev, message];
        });
        
        // Mark as read immediately if chat is open
        // (Optional: You might want to debounce this or do it on focus)
      } else {
        // Increment unread count if chat is not open? 
        // Actually update_chat_list handles the sidebar update, this is just for open chat
      }
    });

    // Listen for chat list updates (new messages in other chats, etc)
    socketRef.current.on('update_chat_list', (data) => {
      // Re-fetch chats to get updated order and unread counts
      // Or we could optimistically update if we want to be fancy
      fetchChats();
    });

    // Listen for read receipts
    socketRef.current.on('messages_read', ({ chatId, readBy }) => {
        if (selectedChatRef.current && selectedChatRef.current._id === chatId) {
            // Update messages in current view to show read status
            // This is complex because we need to know WHICH messages were read
            // For simplicity, we can just re-fetch messages or update mostly recent ones
            // Or just ignore it if we don't show detailed read receipts per message
             fetchMessages(chatId, true);
        }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Poll for new messages (fallback/sync)
  useEffect(() => {
    let intervalId;
    
    // Poll every 5 seconds to ensure data consistency
    const poll = async () => {
      // Don't poll if we're sending or loading initial data
      // But do poll to keep in sync
      
      // 1. Fetch chats list (updates sidebar unread counts, last message)
      await fetchChats(true);
      
      // 2. If chat is selected, fetch messages
      if (selectedChatRef.current) {
         // Only mark as read if the document is visible
         const isVisible = !document.hidden;
         await fetchMessages(selectedChatRef.current._id, true, isVisible);
      }
    };
    
    // Initial delay
    const timeoutId = setTimeout(() => {
        intervalId = setInterval(poll, 5000);
    }, 2000);
    
    return () => {
        clearTimeout(timeoutId);
        if (intervalId) {
            clearInterval(intervalId);
        }
    };
  }, [fetchChats, fetchMessages]);

  // Fetch contacts
  const fetchContacts = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/chat/contacts`, {
        headers: getAuthHeaders()
      });
      setContacts(res.data);
    } catch (error) {
      // Error fetching contacts
    }
  };


  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      const payload = selectedChat?._id 
        ? { chatId: selectedChat._id, message: newMessage }
        : { clientId: selectedChat?.clientId?._id, message: newMessage };

      await axios.post(`${API_URL}/api/chat/send`, payload, {
        headers: getAuthHeaders()
      });

      // Don't add message here - socket will handle it via receive_message event
      setNewMessage('');
      await fetchChats(true); // Refresh chats silently to update last message
      
      // Scroll to bottom after a brief delay
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    } catch (error) {
      // Error sending message
    } finally {
      setSending(false);
    }
  };

  // Handle back to chats
  const handleBackToChats = () => {
    if (isMobile) {
      setShowSidebar(true);
      setSelectedChat(null);
    } else {
      // On desktop, show sidebar and deselect chat
      setShowSidebar(true);
      setSelectedChat(null);
    }
  };

  // Create or select chat
  const handleSelectChat = async (chat) => {
    
    setSelectedChat(chat);
    // On mobile, hide sidebar when chat is selected
    if (isMobile) {
      setShowSidebar(false);
    }
    // Clear messages first to show loading state
    setMessages([]);
    setMessagesLoading(true);
    // Mark this chat as manually cleared
    manuallyClearedChatsRef.current.add(chat._id);
    // Immediately set unread count to 0 for this chat when selected
    setUnreadCounts(prev => ({
      ...prev,
      [chat._id]: 0
    }));
    // Fetch messages immediately
    await fetchMessages(chat._id, false);
  };

  // Start new chat with user or client
  const handleStartChat = async (contact) => {
    try {
      // Check if current user is a client
      const isCurrentUserClient = user?.type === 'Client';
      
      // Check if it's a client contact - clients have 'name' and 'email' but no 'First_Name' or 'workEmailName'
      const isClientContact = contact.name && !contact.First_Name && !contact.workEmailName;
      
      let payload;
      if (isCurrentUserClient) {
        // If current user is a client, they're chatting with a user
        // So we pass userId (the user they want to chat with)
        payload = { userId: contact._id };
      } else {
        // If current user is a user/admin, they can chat with clients or users
        payload = isClientContact
          ? { clientId: contact._id }
          : { userId: contact._id };
      }

      const res = await axios.post(`${API_URL}/api/chat/create`, payload, {
        headers: getAuthHeaders()
      });

      const chat = res.data.chat;
      if (chat) {
        setSelectedChat(chat);
        await fetchMessages(chat._id);
        await fetchChats();
        // Close modal if open
        setShowNewChatModal(false);
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create chat');
    }
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return `Today, ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
    } else if (days === 1) {
      return `Yesterday, ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
    } else if (days < 7) {
      return d.toLocaleDateString('en-US', { weekday: 'long', hour: '2-digit', minute: '2-digit', hour12: true });
    } else {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
    }
  };

  // Get chat name - use workEmailName if available, otherwise fallback
  const getChatName = (chat) => {
    // Check if current user is a client
    const isCurrentUserClient = user?.type === 'Client';
    const currentUserId = user?.id?.toString() || user?._id?.toString();
    
    // Check if it's a client chat - check type first, then clientId
    if (chat.type === 'client' || chat.clientId) {
      // If current user is a client, show the participant's name (the user they're chatting with)
      if (isCurrentUserClient) {
        // Get the participant (user) they're chatting with
        const participant = chat.participants?.find(p => {
          const pId = p._id?.toString() || p.toString();
          return pId !== currentUserId;
        });
        
        if (participant) {
          const participantObj = typeof participant === 'object' ? participant : contacts.users?.find(u => {
            const uId = u._id?.toString() || u._id;
            const pId = participant._id?.toString() || participant.toString();
            return uId === pId;
          });
          if (participantObj) {
            return participantObj.workEmailName || `${participantObj.First_Name || ''} ${participantObj.Last_Name || ''}`.trim() || participantObj.Email || 'User';
          }
        }
        return 'User';
      } else {
        // Current user is a user/admin - show the client's name
        if (chat.clientId && typeof chat.clientId === 'object' && chat.clientId !== null && chat.clientId.name) {
          return chat.clientId.name;
        }
        // If it's just an ID string, we need to find it in contacts
        if (chat.clientId && typeof chat.clientId === 'string') {
          const client = contacts.clients?.find(c => {
            const cId = c._id?.toString() || c._id;
            return cId === chat.clientId;
          });
          if (client && client.name) return client.name;
        }
        // If clientId is an object but name is missing, try to get it from contacts
        if (chat.clientId && typeof chat.clientId === 'object' && chat.clientId._id) {
          const client = contacts.clients?.find(c => {
            const cId = c._id?.toString() || c._id;
            const chatClientId = chat.clientId._id?.toString() || chat.clientId._id;
            return cId === chatClientId;
          });
          if (client && client.name) return client.name;
        }
        return 'Client';
      }
    }
    if (chat.type === 'group') {
      return chat.groupName || 'Group';
    }
    // User chat - get the other participant
    const otherParticipant = chat.participants?.find(p => {
      const pId = p._id?.toString() || p.toString();
      return pId !== currentUserId;
    });
    if (otherParticipant) {
      // Use workEmailName if available, otherwise fallback to First_Name/Last_Name or Email
      const participant = typeof otherParticipant === 'object' ? otherParticipant : contacts.users?.find(u => u._id === otherParticipant);
      if (participant) {
        return participant.workEmailName || `${participant.First_Name || ''} ${participant.Last_Name || ''}`.trim() || participant.Email || 'User';
      }
    }
    return 'Chat';
  };

  // Get chat avatar - use workEmailName if available
  const getChatAvatar = (chat) => {
    if (chat.clientId) {
      return (chat.clientId.name || 'C').charAt(0).toUpperCase();
    }
    if (chat.type === 'group') {
      return (chat.groupName || 'G').charAt(0).toUpperCase();
    }
    const otherParticipant = chat.participants?.find(p => p._id !== user?.id && p._id !== user?._id);
    if (otherParticipant) {
      // Use workEmailName if available, otherwise fallback
      const name = otherParticipant.workEmailName || otherParticipant.First_Name || otherParticipant.Email || 'U';
      return name.charAt(0).toUpperCase();
    }
    return 'U';
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    // Only auto-scroll if new messages were added
    if (messages.length > 0) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages.length]);

  // Initialize voice recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'en-US';

      recognitionInstance.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }
        
        if (finalTranscript) {
          setNewMessage(prev => {
            const updated = prev + (prev ? ' ' : '') + finalTranscript.trim();
            return updated;
          });
        } else if (interimTranscript) {
          // Show interim results in real-time (optional)
          setNewMessage(prev => {
            const base = prev.split(' [speaking...]')[0];
            return base + (base ? ' ' : '') + interimTranscript + ' [speaking...]';
          });
        }
      };

      recognitionInstance.onerror = (event) => {
        if (event.error === 'no-speech') {
          // No speech detected, just stop
          setIsRecording(false);
        } else if (event.error === 'audio-capture') {
          alert('No microphone found. Please check your microphone settings.');
          setIsRecording(false);
        } else if (event.error === 'not-allowed') {
          alert('Microphone access denied. Please allow microphone access to use voice messages.');
          setIsRecording(false);
        } else {
          setIsRecording(false);
        }
      };

      recognitionInstance.onend = () => {
        setIsRecording(false);
        
        // Remove interim text and get clean message
        setNewMessage(prev => {
          const cleanMessage = prev.replace(' [speaking...]', '').trim();
          voiceMessageRef.current = cleanMessage;
          
          // Auto-send if there's a message and flag is set
          if (shouldAutoSendRef.current && cleanMessage && selectedChatRef.current && !sendingRef.current) {
            shouldAutoSendRef.current = false;
            // Trigger send after a small delay to ensure state is updated
            setTimeout(() => {
              const currentMessage = voiceMessageRef.current;
              const currentChat = selectedChatRef.current;
              
              if (currentMessage && currentChat && !sendingRef.current) {
                // Send message directly using the API
                const payload = currentChat._id 
                  ? { chatId: currentChat._id, message: currentMessage }
                  : { clientId: currentChat.clientId?._id, message: currentMessage };
                
                axios.post(`${API_URL}/api/chat/send`, payload, {
                  headers: getAuthHeaders()
                })
                .then(res => {
                  // Don't add message here - socket will handle it via receive_message event
                  setNewMessage('');
                  // Use ref to call fetchChats if available
                  if (fetchChatsRef.current) {
                    fetchChatsRef.current(true);
                  }
                  setTimeout(() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                  }, 150);
                })
                .catch(error => {
                  // Error sending message
                });
              }
            }, 200);
          }
          
          return cleanMessage;
        });
      };

      setRecognition(recognitionInstance);
    }
    
    // Cleanup on unmount
    return () => {
      if (recognition) {
        try {
          recognition.stop();
        } catch (e) {
          // Ignore errors
        }
      }
    };
  }, []); // Empty deps - recognition instance is created once

  useEffect(() => {
    fetchChats();
    fetchContacts();
  }, []);

  // Track window width for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      // On mobile, hide sidebar when chat is selected
      if (window.innerWidth <= 768 && selectedChat) {
        setShowSidebar(false);
      } else if (window.innerWidth > 768) {
        setShowSidebar(true);
      }
    };
    
    if (typeof window !== 'undefined') {
      setWindowWidth(window.innerWidth);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [selectedChat]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  // Optimized scroll to bottom - only when messages actually change
  const prevMessagesLengthRef = useRef(0);
  useEffect(() => {
    // Only auto-scroll if new messages were added (not on initial load or polling)
    if (messages.length > prevMessagesLengthRef.current && messages.length > 0) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length]); // Only depend on length, not the entire messages array

  const filteredPeople = people.filter(chat => {
    if (!searchTerm) return true;
    const name = getChatName(chat).toLowerCase();
    return name.includes(searchTerm.toLowerCase());
  });

  const filteredGroups = groups.filter(chat => {
    if (!searchTerm) return true;
    const name = getChatName(chat).toLowerCase();
    return name.includes(searchTerm.toLowerCase());
  });

  // Filter contacts to exclude those that already have chats WITH THE CURRENT USER
  const getAvailableContacts = () => {
    const allContacts = [...(contacts.users || []), ...(contacts.clients || [])];
    const currentUserId = user?.id?.toString() || user?._id?.toString();
    const existingChatContactIds = new Set();
    
    // Collect IDs of contacts that the CURRENT USER already has chats with
    chats.forEach(chat => {
      // For user-to-user chats, find the other participant
      if (chat.type === 'user' && chat.participants) {
        const otherParticipant = chat.participants.find(p => {
          const pId = p._id?.toString() || p.toString();
          return pId !== currentUserId;
        });
        if (otherParticipant) {
          const otherId = otherParticipant._id?.toString() || otherParticipant.toString();
          existingChatContactIds.add(otherId);
        }
      }
      
      // For client chats, add the client ID
      if (chat.type === 'client' && chat.clientId) {
        const clientId = typeof chat.clientId === 'object' ? chat.clientId._id?.toString() : chat.clientId.toString();
        existingChatContactIds.add(clientId);
      }
      
      // Note: We don't filter out group chat participants since you can still have 1-on-1 chats with them
    });
    
    // Filter out contacts that the current user already has chats with
    return allContacts.filter(contact => {
      const contactId = contact._id?.toString() || contact._id;
      return !existingChatContactIds.has(contactId);
    });
  };

  const filteredContacts = activeTab === 'people' 
    ? getAvailableContacts().filter(contact => {
        if (!searchTerm) return true;
        const name = (contact.workEmailName || contact.First_Name || contact.name || '').toLowerCase();
        return name.includes(searchTerm.toLowerCase());
      })
    : [];

  return (
    <div style={{
      display: 'flex',
      height: isMobile ? '100dvh' : '100vh',
      fontFamily: theme.typography.fontFamily,
      background: colors.mainBg || '#f5f7fa',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      margin: 0,
      padding: 0,
      zIndex: 99999,
      overflow: 'hidden',
      maxHeight: isMobile ? '100dvh' : '100vh'
    }}>
      {/* Floating Back Button - Show when no chat is selected OR when chat is selected on desktop */}
      {onBack && (!selectedChat || (!isMobile && selectedChat)) && (
        <button
          onClick={onBack}
          style={{
            position: 'fixed',
            bottom: isMobile ? '24px' : '24px',
            left: isMobile ? '24px' : '24px',
            width: isMobile ? '48px' : '48px',
            height: isMobile ? '48px' : '48px',
            borderRadius: '50%',
            background: colors.white || '#ffffff',
            color: colors.textPrimary || '#111827',
            border: `1px solid ${colors.border || '#e5e7eb'}`,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: isMobile ? '20px' : '20px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1001,
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            if (!isMobile) {
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
              e.currentTarget.style.background = colors.primaryBg || '#f3f4f6';
            }
          }}
          onMouseLeave={(e) => {
            if (!isMobile) {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
              e.currentTarget.style.background = colors.white || '#ffffff';
            }
          }}
          onTouchStart={(e) => {
            e.currentTarget.style.transform = 'scale(0.95)';
            e.currentTarget.style.background = colors.primaryBg || '#f3f4f6';
          }}
          onTouchEnd={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.background = colors.white || '#ffffff';
          }}
          title="Back to Panel"
        >
          <FaArrowLeft />
        </button>
      )}
      {/* Left Sidebar */}
      <div style={{
        width: isMobile ? '100%' : (isTablet ? '300px' : '350px'),
        background: colors.white || '#ffffff',
        borderRight: isMobile && !showSidebar ? 'none' : `1px solid ${colors.border || '#e5e7eb'}`,
        display: isMobile && !showSidebar ? 'none' : 'flex',
        flexDirection: 'column',
        height: isMobile ? '100dvh' : '100vh',
        maxHeight: isMobile ? '100dvh' : '100vh',
        position: isMobile ? 'absolute' : 'relative',
        left: 0,
        top: 0,
        zIndex: isMobile ? 1000 : 1,
        transition: 'transform 0.3s ease',
        transform: isMobile && !showSidebar ? 'translateX(-100%)' : 'translateX(0)',
        overflow: 'hidden'
      }}>
        {/* Search Bar and New Chat Button */}
        <div style={{
          padding: isMobile ? '12px' : '16px',
          borderBottom: `1px solid ${colors.border || '#e5e7eb'}`,
          display: 'flex',
          gap: isMobile ? '6px' : '8px',
          alignItems: 'center'
        }}>
          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            flex: 1
          }}>
            <FaSearch style={{
              position: 'absolute',
              left: '12px',
              color: colors.textSecondary || '#6b7280',
              fontSize: '14px'
            }} />
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 36px',
                borderRadius: '20px',
                border: `1px solid ${colors.border || '#e5e7eb'}`,
                fontSize: '14px',
                outline: 'none',
                background: colors.primaryBg || '#f3f4f6'
              }}
            />
          </div>
          {activeTab === 'people' && (
            <button
              onClick={() => setShowNewChatModal(true)}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: colors.primary || '#667eea',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                flexShrink: 0,
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
              }}
              title="Start New Chat"
            >
              <FaPlus />
            </button>
          )}
        </div>

        {/* Groups and People Tabs */}
        {!hideGroups && (
          <div style={{
            display: 'flex',
            borderBottom: `1px solid ${colors.border || '#e5e7eb'}`,
            padding: '0 16px',
            position: 'relative',
            alignItems: 'center'
          }}>
            <button
              onClick={() => setActiveTab('groups')}
              style={{
                flex: 1,
                padding: '12px',
                border: 'none',
                background: 'transparent',
                borderBottom: activeTab === 'groups' ? `2px solid ${colors.primary || '#667eea'}` : '2px solid transparent',
                color: activeTab === 'groups' ? colors.primary : colors.textSecondary,
                fontWeight: activeTab === 'groups' ? 600 : 400,
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              Groups
            </button>
            <button
              onClick={() => setActiveTab('people')}
              style={{
                flex: 1,
                padding: '12px',
                border: 'none',
                background: 'transparent',
                borderBottom: activeTab === 'people' ? `2px solid ${colors.primary || '#667eea'}` : '2px solid transparent',
                color: activeTab === 'people' ? colors.primary : colors.textSecondary,
                fontWeight: activeTab === 'people' ? 600 : 400,
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              People
            </button>
            {activeTab === 'groups' && (
              <button
                onClick={() => setShowCreateGroupModal(true)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '8px',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: colors.primary || '#667eea',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.1)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.15)';
                }}
                title="Create Group"
              >
                <FaPlus />
              </button>
            )}
          </div>
        )}

        {/* Chat List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 0'
        }}>
          {!hideGroups && activeTab === 'groups' && (
            <div>
              {filteredGroups.map(chat => (
                <div
                  key={chat._id}
                  onClick={() => handleSelectChat(chat)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px 16px',
                    cursor: 'pointer',
                    background: selectedChat?._id === chat._id ? colors.primaryBg || '#f3f4f6' : 'transparent',
                    borderLeft: selectedChat?._id === chat._id ? `3px solid ${colors.primary || '#667eea'}` : '3px solid transparent',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedChat?._id !== chat._id) {
                      e.currentTarget.style.background = colors.hover || '#f9fafb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedChat?._id !== chat._id) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: colors.primary || '#667eea',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                    fontSize: '18px',
                    marginRight: '12px',
                    flexShrink: 0
                  }}>
                    {getChatAvatar(chat)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '4px'
                    }}>
                      <div style={{
                        fontWeight: 600,
                        fontSize: '14px',
                        color: colors.textPrimary || '#111827',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {getChatName(chat)}
                      </div>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{
                        fontSize: '13px',
                        color: colors.textSecondary || '#6b7280',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1
                      }}>
                        {chat.lastMessage || 'No messages yet'}
                      </div>
                      {unreadCounts[chat._id] > 0 && (
                        <div style={{
                          background: colors.primary || '#667eea',
                          color: 'white',
                          borderRadius: '50%',
                          width: '20px',
                          height: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 600,
                          marginLeft: '8px',
                          flexShrink: 0
                        }}>
                          {unreadCounts[chat._id]}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'people' && (
            <div>
              {/* Existing Chats */}
              {filteredPeople.map(chat => (
                <div
                  key={chat._id}
                  onClick={() => handleSelectChat(chat)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px 16px',
                    cursor: 'pointer',
                    background: selectedChat?._id === chat._id ? colors.primaryBg || '#f3f4f6' : 'transparent',
                    borderLeft: selectedChat?._id === chat._id ? `3px solid ${colors.primary || '#667eea'}` : '3px solid transparent',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedChat?._id !== chat._id) {
                      e.currentTarget.style.background = colors.hover || '#f9fafb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedChat?._id !== chat._id) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: (() => {
                      const isCurrentUserClient = user?.type === 'Client';
                      if (chat.type === 'client' || chat.clientId) {
                        // If current user is a client, show user color (purple), otherwise show client color (green)
                        return isCurrentUserClient ? (colors.primary || '#667eea') : '#10b981';
                      }
                      return colors.primary || '#667eea';
                    })(),
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                    fontSize: '18px',
                    marginRight: '12px',
                    flexShrink: 0
                  }}>
                    {getChatAvatar(chat)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '4px'
                    }}>
                      <div style={{
                        fontWeight: 600,
                        fontSize: '14px',
                        color: colors.textPrimary || '#111827',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {getChatName(chat)}
                      </div>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{
                        fontSize: '13px',
                        color: colors.textSecondary || '#6b7280',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1
                      }}>
                        {chat.lastMessage || 'No messages yet'}
                      </div>
                      {unreadCounts[chat._id] > 0 && (
                        <div style={{
                          background: colors.primary || '#667eea',
                          color: 'white',
                          borderRadius: '50%',
                          width: '20px',
                          height: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 600,
                          marginLeft: '8px',
                          flexShrink: 0
                        }}>
                          {unreadCounts[chat._id]}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Chat Area */}
      <div style={{
        flex: 1,
        display: isMobile && !selectedChat ? 'none' : 'flex',
        flexDirection: 'column',
        background: colors.white || '#ffffff',
        position: 'relative',
        overflow: 'hidden',
        width: isMobile && !selectedChat ? '0' : '100%',
        minWidth: 0,
        height: isMobile ? '100dvh' : '100vh',
        maxHeight: isMobile ? '100dvh' : '100vh'
      }}>
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div style={{
              padding: isMobile ? '12px 16px' : '16px 20px',
              borderBottom: `1px solid ${colors.border || '#e5e7eb'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: colors.white || '#ffffff',
              position: 'relative'
            }}>
              {/* Back Button - Show on both mobile and desktop when chat is selected */}
              {selectedChat && (
                <button
                  onClick={handleBackToChats}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: colors.textPrimary || '#111827',
                    cursor: 'pointer',
                    padding: '8px',
                    marginRight: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = colors.hover || '#f9fafb';
                    e.currentTarget.style.borderRadius = '50%';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <FaArrowLeft />
                </button>
              )}
              <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                <div style={{
                  width: isMobile ? '36px' : '40px',
                  height: isMobile ? '36px' : '40px',
                  borderRadius: '50%',
                  background: (() => {
                    const isCurrentUserClient = user?.type === 'Client';
                    if (selectedChat.type === 'client' || selectedChat.clientId) {
                      // If current user is a client, show user color (purple), otherwise show client color (green)
                      return isCurrentUserClient ? (colors.primary || '#667eea') : '#10b981';
                    }
                    return colors.primary || '#667eea';
                  })(),
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600,
                  fontSize: isMobile ? '14px' : '16px',
                  marginRight: isMobile ? '8px' : '12px',
                  flexShrink: 0
                }}>
                  {getChatAvatar(selectedChat)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: 600,
                    fontSize: isMobile ? '14px' : '16px',
                    color: colors.textPrimary || '#111827',
                    marginBottom: '2px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {getChatName(selectedChat)}
                  </div>
                  <div style={{
                    fontSize: '13px',
                    color: colors.textSecondary || '#6b7280'
                  }}>
                    {(() => {
                      const isCurrentUserClient = user?.type === 'Client';
                      if (selectedChat.type === 'client' || selectedChat.clientId) {
                        if (isCurrentUserClient) {
                          // Client is viewing - show "User" or participant info
                          return 'User';
                        } else {
                          // User/admin is viewing - show "Client"
                          return 'Client';
                        }
                      }
                      return '';
                    })()}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button
                  onClick={async () => {
                    if (selectedChat?._id) {
                      await fetchMessages(selectedChat._id, false);
                      // Scroll to bottom after messages are loaded
                      setTimeout(() => {
                        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                      }, 300);
                    }
                    await fetchChats(false);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: colors.textSecondary || '#6b7280',
                    cursor: 'pointer',
                    padding: '8px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    transition: 'all 0.2s'
                  }}
                  title="Refresh"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = colors.hover || '#f9fafb';
                    e.currentTarget.style.color = colors.primary || '#667eea';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = colors.textSecondary || '#6b7280';
                  }}
                >
                  <FaSync />
                </button>
                <button 
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: colors.textSecondary || '#6b7280',
                    cursor: 'not-allowed',
                    padding: '8px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    transition: 'all 0.2s',
                    opacity: 0.5
                  }}
                  title="Calling feature coming soon"
                  disabled
                >
                  <FaPhone />
                </button>
                <button 
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: colors.textSecondary || '#6b7280',
                    cursor: 'not-allowed',
                    padding: '8px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    transition: 'all 0.2s',
                    opacity: 0.5
                  }}
                  title="Video calling feature coming soon"
                  disabled
                >
                  <FaVideo />
                </button>
                <button style={{
                  background: 'transparent',
                  border: 'none',
                  color: colors.textSecondary || '#6b7280',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = colors.hover || '#f9fafb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
                >
                  <FaEllipsisV />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: isMobile ? '12px 16px' : '20px',
              paddingBottom: isMobile ? '80px' : '20px',
              background: '#f5f7fa',
              WebkitOverflowScrolling: 'touch'
            }}>
              {messagesLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: colors.textSecondary }}>
                  Loading messages...
                </div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: colors.textSecondary }}>
                  No messages yet. Start the conversation!
                </div>
              ) : (
                messages.map((msg, index) => {
                  // Determine if this is the current user's message
                  const isCurrentUserClient = user?.type === 'Client';
                  const currentUserId = user?.id?.toString() || user?._id?.toString();
                  
                  let isOwnMessage = false;
                  if (isCurrentUserClient) {
                    // For clients, check if the message's chat clientId matches current client
                    // Or if senderId is null and chat.clientId matches (client sent the message)
                    if (selectedChat?.clientId) {
                      const chatClientId = selectedChat.clientId?._id?.toString() || selectedChat.clientId?.toString();
                      isOwnMessage = chatClientId === currentUserId && !msg.senderId;
                    }
                  } else {
                    // For users, check if senderId matches
                    if (msg.senderId) {
                      const senderId = msg.senderId._id?.toString() || msg.senderId?.toString();
                      isOwnMessage = senderId === currentUserId;
                    }
                  }
                  
                  return (
                    <div
                      key={msg._id}
                      style={{
                        display: 'flex',
                        justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
                        marginBottom: '16px'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isOwnMessage ? 'flex-end' : 'flex-start',
                        maxWidth: isMobile ? '85%' : '70%',
                      }}>
                        {!isOwnMessage && (
                          <div style={{
                            fontSize: '11px',
                            color: colors.textSecondary || '#6b7280',
                            marginBottom: '2px',
                            marginLeft: '4px',
                            fontWeight: '500'
                          }}>
                            {(() => {
                              if (msg.senderId) {
                                const s = msg.senderId;
                                return typeof s === 'object' 
                                  ? (s.workEmailName || `${s.First_Name || ''} ${s.Last_Name || ''}`.trim() || s.Email || 'User')
                                  : 'User';
                              } else {
                                return selectedChat?.clientId?.name || 'Client';
                              }
                            })()}
                          </div>
                        )}
                        <div style={{
                          width: '100%',
                          background: isOwnMessage ? colors.primary || '#667eea' : colors.white || '#ffffff',
                          color: isOwnMessage ? 'white' : colors.textPrimary || '#111827',
                          padding: isMobile ? '8px 12px' : '10px 14px',
                          borderRadius: '18px',
                          borderTopLeftRadius: !isOwnMessage ? '4px' : '18px',
                          borderTopRightRadius: isOwnMessage ? '4px' : '18px',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                        }}>
                          <div style={{
                            fontSize: isMobile ? '14px' : '14px',
                            lineHeight: '1.5',
                            marginBottom: '4px',
                            wordWrap: 'break-word'
                          }}>
                            {msg.message}
                          </div>
                          {isOwnMessage && (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              gap: '4px',
                              fontSize: '11px',
                              color: isOwnMessage ? 'rgba(255,255,255,0.7)' : colors.textSecondary || '#6b7280',
                              marginTop: '4px'
                            }}>
                              {msg.readBy?.some(r => r.userId === selectedChat.participants?.find(p => p._id !== user?.id && p._id !== user?._id)?._id) ? (
                                <FaCheckDouble style={{ color: '#4fc3f7' }} />
                              ) : (
                                <FaCheck />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );

                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} style={{
              padding: isMobile ? '12px 16px' : '16px 20px',
              borderTop: `1px solid ${colors.border || '#e5e7eb'}`,
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? '8px' : '12px',
              background: colors.white || '#ffffff',
              position: isMobile ? 'fixed' : 'relative',
              bottom: isMobile ? '0' : 'auto',
              left: isMobile ? '0' : 'auto',
              right: isMobile ? '0' : 'auto',
              width: isMobile ? '100%' : 'auto',
              zIndex: isMobile ? 1000 : 'auto',
              overflow: 'visible'
            }}>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message here..."
                style={{
                  flex: 1,
                  padding: isMobile ? '10px 14px' : '12px 16px',
                  borderRadius: '24px',
                  border: `1px solid ${colors.border || '#e5e7eb'}`,
                  fontSize: isMobile ? '14px' : '14px',
                  outline: 'none',
                  background: colors.primaryBg || '#f3f4f6',
                  minWidth: 0
                }}
              />
              <div style={{ position: 'relative' }} ref={emojiPickerRef}>
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: colors.textSecondary || '#6b7280',
                    cursor: 'pointer',
                    padding: '8px',
                    fontSize: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.color = colors.primary || '#667eea';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.color = colors.textSecondary || '#6b7280';
                  }}
                >
                  <FaSmile />
                </button>
                {showEmojiPicker && (
                  <div style={{
                    position: 'fixed',
                    bottom: isMobile ? '80px' : '100px',
                    left: isMobile ? '50%' : 'auto',
                    right: isMobile ? 'auto' : 'calc(50% - 175px)',
                    transform: isMobile ? 'translateX(-50%)' : 'none',
                    zIndex: 10000,
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    borderRadius: '8px',
                    overflow: 'visible',
                    backgroundColor: 'white',
                    maxWidth: isMobile ? '95vw' : '350px',
                    maxHeight: isMobile ? '50vh' : '450px'
                  }}>
                    <EmojiPicker
                      onEmojiClick={(emojiData) => {
                        setNewMessage(prev => prev + emojiData.emoji);
                        setShowEmojiPicker(false);
                      }}
                      theme="light"
                      width={isMobile ? Math.min(350, windowWidth - 20) : 350}
                      height={isMobile ? 350 : 450}
                      previewConfig={{
                        showPreview: false
                      }}
                      skinTonesDisabled={false}
                      searchDisabled={false}
                      lazyLoadEmojis={false}
                    />
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={sending || !newMessage.trim()}
                style={{
                  background: colors.primary || '#667eea',
                  border: 'none',
                  color: 'white',
                  cursor: sending || !newMessage.trim() ? 'not-allowed' : 'pointer',
                  padding: '12px',
                  borderRadius: '50%',
                  width: '44px',
                  height: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  opacity: sending || !newMessage.trim() ? 0.6 : 1,
                  transition: 'all 0.2s'
                }}
              >
                <FaPaperPlane />
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (isRecording) {
                    // Stop recording and auto-send
                    shouldAutoSendRef.current = true;
                    
                    // Get current message before stopping (in case onend doesn't fire immediately)
                    const currentMessage = newMessage.replace(' [speaking...]', '').trim();
                    voiceMessageRef.current = currentMessage;
                    
                    if (recognition) {
                      try {
                        recognition.stop();
                        // Set a timeout to send if onend doesn't fire within 500ms
                        setTimeout(() => {
                          if (shouldAutoSendRef.current && currentMessage && selectedChatRef.current && !sendingRef.current) {
                            shouldAutoSendRef.current = false;
                            const payload = selectedChatRef.current._id 
                              ? { chatId: selectedChatRef.current._id, message: currentMessage }
                              : { clientId: selectedChatRef.current.clientId?._id, message: currentMessage };
                            
                            setSending(true);
                            sendingRef.current = true;
                            
                            axios.post(`${API_URL}/api/chat/send`, payload, {
                              headers: getAuthHeaders()
                            })
                            .then(res => {
                              setMessages(prev => [...prev, res.data.message]);
                              setNewMessage('');
                              if (fetchChatsRef.current) {
                                fetchChatsRef.current(true);
                              }
                              setTimeout(() => {
                                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                              }, 150);
                            })
                            .catch(error => {
                              // Error sending message
                            })
                            .finally(() => {
                              setSending(false);
                              sendingRef.current = false;
                            });
                          }
                        }, 500);
                      } catch (err) {
                        // Ignore errors when stopping
                        setIsRecording(false);
                        // If recognition fails to stop properly, try to send manually
                        if (currentMessage && selectedChatRef.current && !sendingRef.current) {
                          shouldAutoSendRef.current = false;
                          const payload = selectedChatRef.current._id 
                            ? { chatId: selectedChatRef.current._id, message: currentMessage }
                            : { clientId: selectedChatRef.current.clientId?._id, message: currentMessage };
                          
                          setSending(true);
                          sendingRef.current = true;
                          
                          axios.post(`${API_URL}/api/chat/send`, payload, {
                            headers: getAuthHeaders()
                          })
                          .then(res => {
                            setMessages(prev => [...prev, res.data.message]);
                            setNewMessage('');
                            if (fetchChatsRef.current) {
                              fetchChatsRef.current(true);
                            }
                            setTimeout(() => {
                              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                            }, 150);
                          })
                          .catch(error => {
                            // Error sending message
                          })
                          .finally(() => {
                            setSending(false);
                            sendingRef.current = false;
                          });
                        }
                      }
                    }
                    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                      mediaRecorderRef.current.stop();
                    }
                  } else {
                    // Start recording
                    if (!selectedChat) {
                      alert('Please select a chat first');
                      return;
                    }
                    
                    if (recognition) {
                      try {
                        // Clear any previous interim text and reset flag
                        setNewMessage(prev => prev.replace(' [speaking...]', ''));
                        shouldAutoSendRef.current = false;
                        voiceMessageRef.current = '';
                        recognition.start();
                        setIsRecording(true);
                      } catch (err) {
                        // Already recording or error - try to restart
                        if (err.name === 'InvalidStateError') {
                          try {
                            recognition.stop();
                            setTimeout(() => {
                              recognition.start();
                              setIsRecording(true);
                            }, 100);
                          } catch (e) {
                            setIsRecording(false);
                            alert('Unable to start voice recognition. Please try again.');
                          }
                        } else {
                          setIsRecording(false);
                          alert('Unable to start voice recognition. Please check your microphone permissions.');
                        }
                      }
                    } else {
                      // Fallback: Try MediaRecorder API for audio recording
                      try {
                        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                        const mediaRecorder = new MediaRecorder(stream);
                        mediaRecorderRef.current = mediaRecorder;
                        audioChunksRef.current = [];

                        mediaRecorder.ondataavailable = (event) => {
                          if (event.data.size > 0) {
                            audioChunksRef.current.push(event.data);
                          }
                        };

                        mediaRecorder.onstop = async () => {
                          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                          
                          // Try to convert audio to text using Web Speech API if available
                          // For now, we'll use a workaround: show a prompt for manual transcription
                          const userText = prompt('Voice recording captured. Please type what you said, or click Cancel to discard:');
                          if (userText && userText.trim()) {
                            setNewMessage(userText.trim());
                            // Auto-send the message
                            setTimeout(() => {
                              if (selectedChat && !sending) {
                                handleSendMessage({ preventDefault: () => {} });
                              }
                            }, 100);
                          }
                          
                          stream.getTracks().forEach(track => track.stop());
                          audioChunksRef.current = [];
                        };

                        mediaRecorder.start();
                        setIsRecording(true);
                      } catch (err) {
                        alert('Microphone access denied. Please allow microphone access to use voice messages.');
                        setIsRecording(false);
                      }
                    }
                  }
                }}
                style={{
                  background: isRecording ? '#ef4444' : 'transparent',
                  border: 'none',
                  color: isRecording ? 'white' : (colors.textSecondary || '#6b7280'),
                  cursor: 'pointer',
                  padding: '8px',
                  fontSize: '18px',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
                title={isRecording ? "Stop recording" : "Voice message"}
              >
                {isRecording ? <FaStop /> : <FaMicrophone />}
              </button>
            </form>
          </>
        ) : (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.textSecondary || '#6b7280',
            fontSize: '16px'
          }}>
            Select a chat to start messaging
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {!hideGroups && (
      <Modal
        open={showCreateGroupModal}
        onClose={() => {
          setShowCreateGroupModal(false);
          setGroupName('');
          setSelectedParticipants([]);
        }}
        title="Create Group"
        maxWidth="500px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="Group Name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Enter group name"
            required
          />
          
          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: 600,
              fontSize: '14px',
              color: colors.textPrimary || '#111827'
            }}>
              Select Participants
            </label>
            <div style={{
              maxHeight: '300px',
              overflowY: 'auto',
              border: `1px solid ${colors.border || '#e5e7eb'}`,
              borderRadius: '8px',
              padding: '8px'
            }}>
              {contacts.users.map(userContact => (
                <label
                  key={userContact._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = colors.hover || '#f9fafb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedParticipants.includes(userContact._id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedParticipants([...selectedParticipants, userContact._id]);
                      } else {
                        setSelectedParticipants(selectedParticipants.filter(id => id !== userContact._id));
                      }
                    }}
                    style={{ marginRight: '8px' }}
                  />
                  <span style={{ fontSize: '14px', color: colors.textPrimary || '#111827' }}>
                    {userContact.workEmailName || `${userContact.First_Name || ''} ${userContact.Last_Name || ''}`.trim() || userContact.Email}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
            <Button
              onClick={() => {
                setShowCreateGroupModal(false);
                setGroupName('');
                setSelectedParticipants([]);
              }}
              variant="secondary"
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!groupName.trim() || selectedParticipants.length === 0) {
                  alert('Please enter a group name and select at least one participant');
                  return;
                }
                
                try {
                  setCreatingGroup(true);
                  const res = await axios.post(
                    `${API_URL}/api/chat/groups`,
                    {
                      groupName: groupName.trim(),
                      participantIds: selectedParticipants
                    },
                    { headers: getAuthHeaders() }
                  );
                  
                  const newChat = res.data.chat;
                  setSelectedChat(newChat);
                  await fetchMessages(newChat._id);
                  await fetchChats();
                  setShowCreateGroupModal(false);
                  setGroupName('');
                  setSelectedParticipants([]);
                  setActiveTab('groups');
                } catch (error) {
                  alert(error.response?.data?.message || 'Failed to create group');
                } finally {
                  setCreatingGroup(false);
                }
              }}
              disabled={creatingGroup || !groupName.trim() || selectedParticipants.length === 0}
            >
              {creatingGroup ? 'Creating...' : 'Create Group'}
            </Button>
          </div>
        </div>
      </Modal>
      )}

      {/* Start New Chat Modal */}
      <Modal
        open={showNewChatModal}
        onClose={() => {
          setShowNewChatModal(false);
          setNewChatModalTab('clients'); // Reset to clients tab when closing
        }}
        title="Start New Chat"
        maxWidth="400px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Tabs for Clients and Users */}
          <div style={{
            display: 'flex',
            borderBottom: `1px solid ${colors.border || '#e5e7eb'}`,
            marginBottom: '8px'
          }}>
            <button
              onClick={() => setNewChatModalTab('clients')}
              style={{
                flex: 1,
                padding: '10px',
                border: 'none',
                background: 'transparent',
                borderBottom: newChatModalTab === 'clients' ? `2px solid ${colors.primary || '#667eea'}` : '2px solid transparent',
                color: newChatModalTab === 'clients' ? colors.primary : colors.textSecondary,
                fontWeight: newChatModalTab === 'clients' ? 600 : 400,
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.2s'
              }}
            >
              Clients
            </button>
            <button
              onClick={() => setNewChatModalTab('users')}
              style={{
                flex: 1,
                padding: '10px',
                border: 'none',
                background: 'transparent',
                borderBottom: newChatModalTab === 'users' ? `2px solid ${colors.primary || '#667eea'}` : '2px solid transparent',
                color: newChatModalTab === 'users' ? colors.primary : colors.textSecondary,
                fontWeight: newChatModalTab === 'users' ? 600 : 400,
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.2s'
              }}
            >
              Users
            </button>
          </div>

          {/* Search in modal */}
          <div style={{ position: 'relative' }}>
            <FaSearch style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: colors.textSecondary || '#6b7280',
              fontSize: '14px'
            }} />
            <input
              type="text"
              placeholder={`Search ${newChatModalTab}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 36px',
                borderRadius: '8px',
                border: `1px solid ${colors.border || '#e5e7eb'}`,
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          {/* Contacts list */}
          <div style={{
            maxHeight: '400px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {(() => {
              // Get all available contacts (users + clients) excluding those with existing chats
              const availableContacts = getAvailableContacts();
              
              // Filter by contact type based on selected tab
              const contactsByType = availableContacts.filter(contact => {
                // Users have First_Name or Email (from User model)
                // Clients have name but no First_Name (from Client model)
                const isClient = contact.name && !contact.First_Name && !contact.Email;
                return newChatModalTab === 'clients' ? isClient : !isClient;
              });
              
              // Filter by search term
              const filtered = contactsByType.filter(contact => {
                if (!searchTerm) return true;
                const name = (contact.workEmailName || contact.First_Name || contact.Last_Name || contact.name || '').toLowerCase();
                return name.includes(searchTerm.toLowerCase());
              });
              
              if (filtered.length === 0) {
                return (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px 20px',
                    color: colors.textSecondary || '#6b7280',
                    fontSize: '14px'
                  }}>
                    {searchTerm ? `No ${newChatModalTab} found` : `No available ${newChatModalTab}`}
                  </div>
                );
              }
              
              return filtered.map(contact => {
                // Check if it's a client - clients have 'name' but no 'First_Name' or 'Email'
                const isClient = contact.name && !contact.First_Name && !contact.Email;
                return (
                  <div
                    key={contact._id}
                    onClick={async () => {
                      await handleStartChat(contact);
                      setShowNewChatModal(false);
                      setNewChatModalTab('clients'); // Reset to clients tab
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px',
                      cursor: 'pointer',
                      borderRadius: '8px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = colors.hover || '#f9fafb';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: isClient ? '#10b981' : colors.primary || '#667eea',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 600,
                      fontSize: '16px',
                      marginRight: '12px',
                      flexShrink: 0
                    }}>
                      {(contact.workEmailName || contact.First_Name || contact.name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{
                        fontWeight: 500,
                        fontSize: '14px',
                        color: colors.textPrimary || '#111827'
                      }}>
                        {contact.workEmailName || (contact.First_Name ? `${contact.First_Name} ${contact.Last_Name || ''}`.trim() : contact.name)}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: colors.textSecondary || '#6b7280',
                        marginTop: '2px'
                      }}>
                        {isClient ? 'Client' : 'User'}
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default ChatPage;

