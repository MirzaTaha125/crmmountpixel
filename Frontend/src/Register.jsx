import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import getApiBaseUrl from './apiBase';

function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Employee');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const API_URL = getApiBaseUrl();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('All fields are required');
      return;
    }
    setSuccess(true);
    setError('');
    setTimeout(() => navigate('/signin'), 1500);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f6fa' }}>
      <div style={{ background: '#fff', padding: 32, borderRadius: 12, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', width: 350 }}>
        <h2 style={{ textAlign: 'center', marginBottom: 24 }}>Register</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Username</label>
            <input type="text" name="username" value={username} onChange={e => setUsername(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ccc', fontSize: 16 }} />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Password</label>
            <input type="password" name="password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ccc', fontSize: 16 }} />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Role</label>
            <select name="role" value={role} onChange={e => setRole(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ccc', fontSize: 16 }}>
              <option value="Admin">Admin</option>
              <option value="Employee">Employee</option>
            </select>
          </div>
          {error && <div style={{ color: '#e74c3c', marginBottom: 14, textAlign: 'center' }}>{error}</div>}
          {success && <div style={{ color: '#27ae60', marginBottom: 14, textAlign: 'center' }}>Registration successful!</div>}
          <button type="submit" style={{ width: '100%', padding: 12, background: '#4f8cff', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 16, cursor: 'pointer', marginBottom: 10 }}>Register</button>
          <div style={{ textAlign: 'center', marginTop: 10 }}>
            <span>Already have an account? </span>
            <span style={{ color: '#4f8cff', cursor: 'pointer' }} onClick={() => navigate('/signin')}>Sign In</span>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Register; 