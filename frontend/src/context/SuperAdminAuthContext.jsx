import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const SuperAdminAuthContext = createContext();

export const SuperAdminAuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [adminToken, setAdminToken] = useState(sessionStorage.getItem('superadmin_token'));
  const [adminLoading, setAdminLoading] = useState(true);

  useEffect(() => {
    if (adminToken) {
      fetchAdminMe(adminToken);
    } else {
      setAdminLoading(false);
    }
  }, [adminToken]);

  const fetchAdminMe = async (tkn) => {
    try {
      const res = await axios.get('http://localhost:5000/api/superadmin/me', {
        headers: { Authorization: `Bearer ${tkn}` }
      });
      setAdmin(res.data);
    } catch (err) {
      console.error('Error fetching admin profile:', err);
      sessionStorage.removeItem('superadmin_token');
      setAdminToken(null);
      setAdmin(null);
    } finally {
      setAdminLoading(false);
    }
  };

  const adminLogin = async (email, password) => {
    const res = await axios.post('http://localhost:5000/api/superadmin/login', { email, password });
    const newToken = res.data.token;
    sessionStorage.setItem('superadmin_token', newToken);
    setAdminToken(newToken);
    setAdmin(res.data.admin);
    return res.data;
  };

  const adminLogout = () => {
    sessionStorage.removeItem('superadmin_token');
    setAdminToken(null);
    setAdmin(null);
  };

  return (
    <SuperAdminAuthContext.Provider value={{ admin, adminToken, adminLoading, adminLogin, adminLogout }}>
      {children}
    </SuperAdminAuthContext.Provider>
  );
};
