import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useSession } from '../session';
import getApiBaseUrl from '../apiBase';
import io from 'socket.io-client';
import { theme, getColors } from '../theme';
import { FaPaperPlane, FaSearch, FaUser, FaUsers, FaCircle, FaPlus, FaClock, FaCheckDouble, FaPaperclip, FaTrash, FaFilter, FaArrowLeft } from 'react-icons/fa';

function ChatPage({ colors: colorsProp }) {
  const colors = colorsProp || getColors();
  const { user } = useSession();
  const API_URL = getApiBaseUrl();
  const [socket, setSocket] = useState(null);
  const [activeTab, setActiveTab] = useState('staff'); // staff or clients
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [search, setSearch] = useState('');
  const [_loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const newSocket = io(API_URL, { auth: { token: user?.token } });
    setSocket(newSocket);
    return () => newSocket.close();
  }, [user?.token]);

  useEffect(() => {
    if (!socket) return;
    socket.on('receive_message', (msg) => {
      if (activeChat?._id === msg.senderId || activeChat?._id === msg.receiverId) {
        setMessages(prev => [...prev, msg]);
      }
      fetchConversations();
    });
    return () => socket.off('receive_message');
  }, [socket, activeChat]);

  useEffect(() => { fetchConversations(); }, [activeTab]);
  useEffect(() => { if (activeChat) fetchMessages(); }, [activeChat]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const endpoint = activeTab === 'staff' ? '/api/users' : '/api/clients';
      const res = await axios.get(`${API_URL}${endpoint}`, { headers: { Authorization: `Bearer ${user.token}` } });
      setConversations(res.data.filter(c => c._id !== user._id));
    } catch { console.error('Failed to sync directory'); }
    finally { setLoading(false); }
  };

  const fetchMessages = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/messages/${activeChat._id}`, { headers: { Authorization: `Bearer ${user.token}` } });
      setMessages(res.data);
    } catch { setMessages([]); }
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat || !socket) return;
    const msgData = { receiverId: activeChat._id, content: newMessage, receiverType: activeTab === 'staff' ? 'User' : 'Client' };
    socket.emit('send_message', msgData);
    setNewMessage('');
    setMessages(prev => [...prev, { ...msgData, senderId: user._id, timestamp: new Date() }]);
  };

  const filtered = conversations.filter(c => (c.Name || c.name || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ width: '100%', height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      {/* HEADER ROW */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: theme.spacing.lg, 
        background: colors.white, 
        padding: theme.spacing.md, 
        borderRadius: theme.radius.lg,
        border: `1px solid ${colors.borderLight}`,
        boxShadow: theme.shadows.sm
      }}>
        <div>
          <h2 style={{ fontSize: theme.typography.fontSizes.lg, fontWeight: 'bold', color: colors.textPrimary, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Real-time Intelligence & Communication
          </h2>
          <p style={{ fontSize: '10px', color: colors.textTertiary, margin: 0, fontWeight: 'bold', textTransform: 'uppercase' }}>
            Omnichannel Staff-to-Client Messaging & Internal Collaboration
          </p>
        </div>
        <div style={{ display: 'flex', gap: '2px', background: colors.primaryBg, padding: '2px', borderRadius: theme.radius.md, border: `1px solid ${colors.border}` }}>
          <button onClick={() => setActiveTab('staff')} style={{ padding: '8px 20px', background: activeTab === 'staff' ? colors.sidebarBg : 'transparent', color: activeTab === 'staff' ? colors.white : colors.textPrimary, border: 'none', borderRadius: theme.radius.sm, fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.2s' }}>Staff Network</button>
          <button onClick={() => setActiveTab('clients')} style={{ padding: '8px 20px', background: activeTab === 'clients' ? colors.sidebarBg : 'transparent', color: activeTab === 'clients' ? colors.white : colors.textPrimary, border: 'none', borderRadius: theme.radius.sm, fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.2s' }}>Client Database</button>
        </div>
      </div>

      <div style={{ 
        flex: 1, 
        display: 'flex', 
        gap: '1px', 
        overflow: 'hidden',
        background: colors.borderLight,
        borderRadius: theme.radius.lg,
        boxShadow: theme.shadows.md,
        border: `1px solid ${colors.borderLight}`
      }}>
        {/* LEFT COLUMN: LIST */}
        <div style={{ width: '350px', background: colors.white, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: theme.spacing.md, borderBottom: `1px solid ${colors.borderLight}`, background: colors.white }}>
            <div style={{ position: 'relative' }}>
              <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', color: colors.textTertiary }} />
              <input type="text" placeholder="Lookup identification..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', padding: '10px 10px 10px 34px', border: `1px solid ${colors.border}`, borderRadius: theme.radius.md, fontSize: '11px', background: colors.white, outline: 'none' }} />
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filtered.map(c => (
              <div key={c._id} onClick={() => setActiveChat(c)} style={{ padding: '15px', borderBottom: `1px solid ${colors.borderLight}`, cursor: 'pointer', background: activeChat?._id === c._id ? colors.primaryBg : colors.white, transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ position: 'relative' }}>
                  <div style={{ width: '40px', height: '40px', background: colors.sidebarBg, color: colors.white, borderRadius: theme.radius.md, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '16px', boxShadow: theme.shadows.sm }}>{(c.Name || c.name || '?')[0].toUpperCase()}</div>
                  <FaCircle style={{ position: 'absolute', bottom: '-2px', right: '-2px', fontSize: '10px', color: '#10b981', border: `2px solid ${colors.white}`, borderRadius: '50%' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', fontWeight: '900', color: colors.textPrimary, textTransform: 'uppercase' }}>{c.Name || c.name}</div>
                  <div style={{ fontSize: '9px', color: colors.textTertiary, fontWeight: 'bold' }}>{c.Role || (activeTab === 'clients' ? 'Verified Client' : 'Staff')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: CHREAD */}
        <div style={{ flex: 1, background: colors.white, display: 'flex', flexDirection: 'column' }}>
          {activeChat ? (
            <>
              <div style={{ padding: '15px 20px', borderBottom: `1px solid ${colors.borderLight}`, background: colors.white, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                   <div style={{ fontSize: '14px', fontWeight: '900', color: colors.sidebarBg, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{activeChat.Name || activeChat.name}</div>
                   <span style={{ padding: '3px 10px', background: '#10b98115', color: '#10b981', fontSize: '8px', fontWeight: '900', borderRadius: theme.radius.full, border: '1px solid #10b98130', letterSpacing: '0.5px' }}>SECURE CHANNEL</span>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button style={{ background: colors.primaryBg, border: 'none', borderRadius: theme.radius.sm, color: colors.textTertiary, cursor: 'pointer', padding: '8px' }}><FaFilter fontSize="12" /></button>
                </div>
              </div>
              
              <div style={{ flex: 1, overflowY: 'auto', padding: '30px', background: colors.primaryBg, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {messages.length === 0 ? (
                  <div style={{ textAlign: 'center', marginTop: '100px', fontSize: '10px', color: colors.textTertiary, fontWeight: 'bold', textTransform: 'uppercase' }}>No transmissions indexed for this channel.</div>
                ) : messages.map((m, idx) => {
                  const isOwn = m.senderId === user._id;
                  return (
                    <div key={idx} style={{ 
                      alignSelf: isOwn ? 'flex-end' : 'flex-start', 
                      maxWidth: '70%', 
                      background: isOwn ? colors.sidebarBg : colors.white, 
                      color: isOwn ? colors.white : colors.textPrimary, 
                      padding: '12px 18px', 
                      borderRadius: isOwn ? `${theme.radius.lg} ${theme.radius.lg} 2px ${theme.radius.lg}` : `${theme.radius.lg} ${theme.radius.lg} ${theme.radius.lg} 2px`,
                      border: `1px solid ${isOwn ? colors.sidebarBg : colors.borderLight}`, 
                      fontSize: '12px', 
                      lineHeight: '1.6', 
                      boxShadow: theme.shadows.sm
                    }}>
                      {m.content}
                      <div style={{ fontSize: '8px', textAlign: 'right', marginTop: '6px', opacity: 0.7, fontWeight: 'bold' }}>
                        {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={sendMessage} style={{ padding: '20px', borderTop: `1px solid ${colors.borderLight}`, background: colors.white, display: 'flex', gap: '12px' }}>
                <button type="button" style={{ background: colors.primaryBg, border: `1px solid ${colors.border}`, borderRadius: theme.radius.md, color: colors.textTertiary, padding: '0 18px', cursor: 'pointer', transition: 'all 0.2s' }}><FaPaperclip /></button>
                <input 
                  type="text" 
                  value={newMessage} 
                  onChange={e => setNewMessage(e.target.value)} 
                  placeholder="Type transmission..." 
                  style={{ 
                    flex: 1, 
                    padding: '14px 20px', 
                    border: `1px solid ${colors.border}`, 
                    borderRadius: theme.radius.md, 
                    fontSize: '12px',
                    outline: 'none',
                    background: colors.white,
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
                  }} 
                />
                <button 
                  type="submit" 
                  disabled={!newMessage.trim()} 
                  style={{ 
                    background: colors.sidebarBg, 
                    color: colors.white, 
                    border: 'none', 
                    borderRadius: theme.radius.md,
                    padding: '0 32px', 
                    fontWeight: '800', 
                    fontSize: '10px', 
                    textTransform: 'uppercase', 
                    cursor: !newMessage.trim() ? 'not-allowed' : 'pointer',
                    boxShadow: theme.shadows.sm,
                    transition: 'all 0.2s',
                    opacity: !newMessage.trim() ? 0.6 : 1
                  }}
                >
                  <FaPaperPlane style={{ marginRight: '8px' }} /> Dispatch
                </button>
              </form>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: colors.textTertiary, background: colors.primaryBg }}>
              <FaUsers style={{ fontSize: '80px', opacity: 0.05, marginBottom: '20px' }} />
              <div style={{ fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '2px', opacity: 0.5 }}>Initialize a secure communication channel.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChatPage;
