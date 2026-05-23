import React, { useState, useEffect, useContext } from 'react';
import { SuperAdminAuthContext } from '../../context/SuperAdminAuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, PieChart, Pie, Cell
} from 'recharts';
import {
  LayoutDashboard, Utensils, CreditCard, TrendingUp, QrCode,
  ShoppingBag, Users, LifeBuoy, Bell, Settings, LogOut, Search,
  Plus, Edit, Trash2, Mail, Phone, ShieldAlert, DollarSign,
  CheckCircle, Calendar, Moon, Sun, Send, Percent, Download,
  HelpCircle, Activity, FileSpreadsheet, ChevronLeft, ChevronRight, Menu, MessageSquare
} from 'lucide-react';
import { Loader2 } from 'lucide-react';

const SuperAdminDashboard = () => {
  const { admin, adminToken, adminLogout } = useContext(SuperAdminAuthContext);
  const navigate = useNavigate();

  // Navigation and layout states
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  // API Data States
  const [stats, setStats] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [plans, setPlans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [systemSettings, setSystemSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  // Search & Filter States
  const [restSearch, setRestSearch] = useState('');
  const [restStatusFilter, setRestStatusFilter] = useState('all');
  const [restPlanFilter, setRestPlanFilter] = useState('all');

  // Modals States
  const [activeModal, setActiveModal] = useState(null); // 'add_restaurant', 'edit_restaurant', 'extend_sub', 'plan_form', 'payment_form', 'ticket_chat'
  const [selectedItem, setSelectedItem] = useState(null);

  // Form States
  const [restaurantForm, setRestaurantForm] = useState({ restaurantName: '', ownerName: '', email: '', password: '', phone: '', planId: '', expiryDays: 30 });
  const [planForm, setPlanForm] = useState({ name: '', price: 0, billingPeriod: 'Monthly', features: '', maxTables: 10, maxBranches: 1, qrLimits: 10, staffLimits: 5 });
  const [paymentForm, setPaymentForm] = useState({ restaurantId: '', amount: '', method: 'UPI', date: '' });
  const [settingsForm, setSettingsForm] = useState({ platformName: '', logoUrl: '', smtpHost: '', smtpPort: '', smtpUser: '', currency: 'INR', taxPercentage: '18' });
  const [couponForm, setCouponForm] = useState({ code: '', discount: '', maxUses: '', expiryDate: '' });
  const [coupons, setCoupons] = useState([
    { id: '1', code: 'WELCOME50', discount: 50, maxUses: 100, used: 25, expiryDate: '2026-12-31', status: 'Active' },
    { id: '2', code: 'FOOD500', discount: 20, maxUses: 50, used: 50, expiryDate: '2026-05-01', status: 'Expired' }
  ]);
  const [announcementForm, setAnnouncementForm] = useState({ title: '', message: '' });
  const [ticketReplyText, setTicketReplyText] = useState('');

  // Headers configuration
  const apiConfig = {
    headers: { Authorization: `Bearer ${adminToken}` }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, restRes, plansRes, paymentsRes, ticketsRes, notifRes, settingsRes] = await Promise.all([
        axios.get('http://localhost:5000/api/superadmin/stats', apiConfig),
        axios.get('http://localhost:5000/api/superadmin/restaurants', apiConfig),
        axios.get('http://localhost:5000/api/superadmin/plans', apiConfig),
        axios.get('http://localhost:5000/api/superadmin/payments', apiConfig),
        axios.get('http://localhost:5000/api/superadmin/tickets', apiConfig),
        axios.get('http://localhost:5000/api/superadmin/notifications', apiConfig),
        axios.get('http://localhost:5000/api/superadmin/settings', apiConfig)
      ]);

      setStats(statsRes.data);
      setRestaurants(restRes.data);
      setPlans(plansRes.data);
      setPayments(paymentsRes.data);
      setTickets(ticketsRes.data);
      setNotifications(notifRes.data);
      setSystemSettings(settingsRes.data);
      setSettingsForm(settingsRes.data);
    } catch (err) {
      console.error('Error fetching admin dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (adminToken) {
      fetchData();
    }
  }, [adminToken]);

  const handleLogout = () => {
    adminLogout();
    navigate('/superadmin/login');
  };

  // Actions: Restaurant
  const handleCreateRestaurant = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/superadmin/restaurants', restaurantForm, apiConfig);
      setActiveModal(null);
      setRestaurantForm({ restaurantName: '', ownerName: '', email: '', password: '', phone: '', planId: '', expiryDays: 30 });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error creating restaurant');
    }
  };

  const handleUpdateRestaurant = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`http://localhost:5000/api/superadmin/restaurants/${selectedItem.id}`, selectedItem, apiConfig);
      setActiveModal(null);
      setSelectedItem(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error updating restaurant');
    }
  };

  const handleDeleteRestaurant = async (id) => {
    if (window.confirm('Are you sure you want to delete this restaurant and all associated branches, menus, and configurations?')) {
      try {
        await axios.delete(`http://localhost:5000/api/superadmin/restaurants/${id}`, apiConfig);
        fetchData();
      } catch (err) {
        alert(err.response?.data?.message || 'Error deleting restaurant');
      }
    }
  };

  const handleStatusChange = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    try {
      await axios.put(`http://localhost:5000/api/superadmin/restaurants/${id}/status`, { status: nextStatus }, apiConfig);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error changing status');
    }
  };

  const handleExtendExpiry = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`http://localhost:5000/api/superadmin/restaurants/${selectedItem.id}/extend`, { days: selectedItem.days }, apiConfig);
      setActiveModal(null);
      setSelectedItem(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error extending subscription');
    }
  };

  // Actions: Plans
  const handlePlanSubmit = async (e) => {
    e.preventDefault();
    try {
      if (planForm._id) {
        await axios.put(`http://localhost:5000/api/superadmin/plans/${planForm._id}`, planForm, apiConfig);
      } else {
        await axios.post('http://localhost:5000/api/superadmin/plans', planForm, apiConfig);
      }
      setActiveModal(null);
      setPlanForm({ name: '', price: 0, billingPeriod: 'Monthly', features: '', maxTables: 10, maxBranches: 1, qrLimits: 10, staffLimits: 5 });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error processing plan');
    }
  };

  const handleDeletePlan = async (id) => {
    if (window.confirm('Delete this plan?')) {
      try {
        await axios.delete(`http://localhost:5000/api/superadmin/plans/${id}`, apiConfig);
        fetchData();
      } catch (err) {
        alert(err.response?.data?.message || 'Error deleting plan');
      }
    }
  };

  // Actions: Payments
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/superadmin/payments', paymentForm, apiConfig);
      setActiveModal(null);
      setPaymentForm({ restaurantId: '', amount: '', method: 'UPI', date: '' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error logging payment');
    }
  };

  // Actions: Tickets
  const handleSendTicketReply = async (e) => {
    e.preventDefault();
    if (!ticketReplyText.trim()) return;
    try {
      await axios.post(`http://localhost:5000/api/superadmin/tickets/${selectedItem._id}/reply`, { text: ticketReplyText }, apiConfig);
      setTicketReplyText('');
      // Reload tickets to update active thread
      const res = await axios.get('http://localhost:5000/api/superadmin/tickets', apiConfig);
      setTickets(res.data);
      const updatedTicket = res.data.find(t => t._id === selectedItem._id);
      setSelectedItem(updatedTicket);
    } catch (err) {
      alert(err.response?.data?.message || 'Error replying to ticket');
    }
  };

  const handleTicketStatusChange = async (id, status) => {
    try {
      await axios.put(`http://localhost:5000/api/superadmin/tickets/${id}`, { status }, apiConfig);
      fetchData();
      if (selectedItem && selectedItem._id === id) {
        setSelectedItem(prev => ({ ...prev, status }));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error changing ticket status');
    }
  };

  // Actions: Announcements
  const handleSendAnnouncement = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/superadmin/notifications', announcementForm, apiConfig);
      setAnnouncementForm({ title: '', message: '' });
      fetchData();
      alert('Global Announcement sent successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Error dispatching announcement');
    }
  };

  // Actions: Settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/superadmin/settings', settingsForm, apiConfig);
      fetchData();
      alert('Settings saved successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving settings');
    }
  };

  // Export CSV Helper
  const handleExportCSV = () => {
    const headers = ['Restaurant Name', 'Owner Name', 'Email', 'Phone', 'Plan', 'Status', 'Expiry Date'];
    const rows = restaurants.map(r => [
      r.restaurantName,
      r.ownerName,
      r.email,
      r.phone,
      r.plan,
      r.status,
      r.subscriptionExpiry ? new Date(r.subscriptionExpiry).toLocaleDateString() : 'N/A'
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `foodaas_restaurants_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Dark/Light Styling Class Helpers
  const textPrimary = darkMode ? 'text-slate-100' : 'text-slate-800';
  const textSecondary = darkMode ? 'text-slate-400' : 'text-slate-500';
  const bgCard = darkMode ? 'bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 shadow-xl' : 'bg-white border border-slate-100 shadow-[0_4px_12px_rgba(0,0,0,0.03)]';
  const bgMain = darkMode ? 'bg-[#0B0F19]' : 'bg-[#F8FAFC]';
  const bgSidebar = darkMode ? 'bg-slate-950 border-r border-slate-900' : 'bg-slate-900 text-white';
  const borderPrimary = darkMode ? 'border-slate-800' : 'border-slate-100';
  const bgInput = darkMode ? 'bg-slate-950/80 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800';

  if (loading || !stats) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-[#0B0F19]' : 'bg-[#F8FAFC]'}`}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className={`w-12 h-12 animate-spin ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
          <p className={darkMode ? 'text-slate-400 font-medium' : 'text-slate-500 font-medium'}>Loading Console...</p>
        </div>
      </div>
    );
  }

  // Sidebar Items
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'restaurants', label: 'Restaurants', icon: Utensils },
    { id: 'plans', label: 'Subscription Plans', icon: Percent },
    { id: 'active_subs', label: 'Active Subscriptions', icon: CheckCircle },
    { id: 'expired_subs', label: 'Expired Subscriptions', icon: ShieldAlert },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'revenue', label: 'Revenue Analytics', icon: TrendingUp },
    { id: 'qr_codes', label: 'QR Management', icon: QrCode },
    { id: 'orders', label: 'Orders Monitoring', icon: ShoppingBag },
    { id: 'users', label: 'Users & Staff', icon: Users },
    { id: 'support', label: 'Support Tickets', icon: LifeBuoy },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'coupons', label: 'Coupons & Offers', icon: Percent },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className={`min-h-screen flex overflow-hidden font-sans transition-colors duration-200 ${bgMain}`}>
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} shrink-0 transition-all duration-300 ${bgSidebar} flex flex-col justify-between z-30 shadow-2xl`}>
        <div>
          {/* Logo Branding */}
          <div className={`p-5 flex items-center gap-3 border-b ${darkMode ? 'border-slate-900' : 'border-slate-800/40'}`}>
            <div className="p-2 bg-gradient-to-tr from-indigo-500 to-violet-600 rounded-xl shadow-lg shrink-0">
              <Utensils size={22} className="text-white" />
            </div>
            {sidebarOpen && (
              <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                FoodaaS
              </span>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-160px)]">
            {menuItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setSelectedItem(null);
                  }}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-200 group text-left cursor-pointer ${
                    isActive 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
                      : 'text-slate-400 hover:bg-slate-800/40 hover:text-white'
                  }`}
                >
                  <Icon size={20} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'} />
                  {sidebarOpen && <span className="font-semibold text-xs tracking-wide">{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Profile Card / Logout */}
        <div className={`p-4 border-t ${darkMode ? 'border-slate-900' : 'border-slate-800/40'} space-y-3`}>
          {sidebarOpen && (
            <div className={`flex items-center gap-3 p-2 rounded-xl ${darkMode ? 'bg-slate-900/40' : 'bg-slate-800/20'}`}>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center font-bold text-white shadow-md">
                {admin?.name?.charAt(0) || 'A'}
              </div>
              <div className="overflow-hidden">
                <p className="font-bold text-xs text-white truncate">{admin?.name || 'Administrator'}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Super Admin</p>
              </div>
            </div>
          )}
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3.5 px-4 py-3 w-full text-left rounded-xl hover:bg-red-500/10 hover:text-red-400 text-slate-400 transition-all duration-200 cursor-pointer"
          >
            <LogOut size={20} />
            {sidebarOpen && <span className="font-bold text-xs">Log Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className={`h-20 border-b flex items-center justify-between px-6 z-20 transition-all ${
          darkMode ? 'bg-slate-950/80 border-slate-900 backdrop-blur-md' : 'bg-white border-slate-100'
        }`}>
          {/* Collapse sidebar button */}
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`p-2 rounded-lg hover:bg-slate-800/10 transition-colors text-slate-400 cursor-pointer`}
            >
              <Menu size={20} />
            </button>
            <div>
              <h2 className={`text-xl font-extrabold tracking-tight ${textPrimary}`}>
                {activeTab.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </h2>
              <p className={`text-[10px] font-semibold uppercase tracking-wider ${textSecondary}`}>
                System control board
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className={`w-10 h-10 border rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                darkMode ? 'bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Notification Bells */}
            <div className="relative">
              <button className={`w-10 h-10 border rounded-xl flex items-center justify-center transition-colors shadow-sm cursor-pointer ${
                darkMode ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
                <Bell size={18} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full ring-2 ring-white"></span>
              </button>
            </div>
          </div>
        </header>

        {/* Scrollable Dashboard Workspace */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* VIEW 1: DASHBOARD HOME */}
              {activeTab === 'dashboard' && (
                <div className="space-y-6">
                  {/* Analytic Stats Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {[
                      { title: 'Total Restaurants', value: stats.metrics.totalRestaurants, trend: '+3 this month', color: 'indigo', icon: Utensils },
                      { title: 'Active Restaurants', value: stats.metrics.activeRestaurants, trend: 'Healthy subscription base', color: 'emerald', icon: CheckCircle },
                      { title: 'Expired Subscriptions', value: stats.metrics.expiredSubscriptions, trend: 'Requires attention', color: 'red', icon: ShieldAlert },
                      { title: 'Monthly Revenue', value: `${systemSettings?.currencySymbol || '₹'}${stats.metrics.monthlyRevenue.toLocaleString('en-IN')}`, trend: '+15.2% vs last month', color: 'amber', icon: DollarSign },
                      { title: 'Total Orders', value: stats.metrics.totalOrders, trend: 'Across all tables', color: 'cyan', icon: ShoppingBag },
                      { title: 'Total Tables QR', value: stats.metrics.totalTables, trend: 'Active scan points', color: 'blue', icon: QrCode },
                      { title: 'Pending Renewals', value: stats.metrics.pendingRenewals, trend: 'Expires within 7 days', color: 'orange', icon: Calendar }
                    ].map((card, i) => {
                      const Icon = card.icon;
                      let colorClasses = 'from-indigo-500/10 to-indigo-600/5 text-indigo-400 border-indigo-500/20';
                      if (card.color === 'emerald') colorClasses = 'from-emerald-500/10 to-emerald-600/5 text-emerald-400 border-emerald-500/20';
                      if (card.color === 'red') colorClasses = 'from-red-500/10 to-red-600/5 text-red-400 border-red-500/20';
                      if (card.color === 'amber') colorClasses = 'from-amber-500/10 to-amber-600/5 text-amber-400 border-amber-500/20';
                      if (card.color === 'cyan') colorClasses = 'from-cyan-500/10 to-cyan-600/5 text-cyan-400 border-cyan-500/20';
                      if (card.color === 'violet') colorClasses = 'from-violet-500/10 to-violet-600/5 text-violet-400 border-violet-500/20';
                      if (card.color === 'blue') colorClasses = 'from-blue-500/10 to-blue-600/5 text-blue-400 border-blue-500/20';
                      if (card.color === 'orange') colorClasses = 'from-orange-500/10 to-orange-600/5 text-orange-400 border-orange-500/20';

                      return (
                        <div key={i} className={`p-5 rounded-2xl border flex items-center justify-between ${bgCard}`}>
                          <div>
                            <p className={`text-[10px] font-extrabold uppercase tracking-widest ${textSecondary}`}>{card.title}</p>
                            <h3 className={`text-2xl font-black mt-2 tracking-tight ${textPrimary}`}>{card.value}</h3>
                            <p className="text-[10px] font-bold text-slate-400 mt-1">{card.trend}</p>
                          </div>
                          <div className={`p-3 rounded-2xl border ${colorClasses}`}>
                            <Icon size={24} />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Dynamic Charts Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Revenue Wave Chart */}
                    <div className={`p-5 rounded-2xl border ${bgCard}`}>
                      <h3 className={`text-sm font-black mb-4 tracking-tight ${textPrimary}`}>Revenue Analytics</h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={stats.charts.monthlyRevenue}>
                            <defs>
                              <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#1e293b" : "#f1f5f9"} />
                            <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                            <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: darkMode ? '#0f172a' : '#ffffff', borderColor: darkMode ? '#1e293b' : '#f1f5f9', color: darkMode ? '#f1f5f9' : '#0f172a' }} />
                            <Area type="monotone" dataKey="Revenue" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Subscription Growth Chart */}
                    <div className={`p-5 rounded-2xl border ${bgCard}`}>
                      <h3 className={`text-sm font-black mb-4 tracking-tight ${textPrimary}`}>Subscription Growth Curve</h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={stats.charts.subscriptionGrowth}>
                            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#1e293b" : "#f1f5f9"} />
                            <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                            <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: darkMode ? '#0f172a' : '#ffffff', borderColor: darkMode ? '#1e293b' : '#f1f5f9', color: darkMode ? '#f1f5f9' : '#0f172a' }} />
                            <Legend wrapperStyle={{ fontSize: 10 }} />
                            <Bar dataKey="Active" fill="#10b981" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Expired" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Logs & Activity Feeds */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Recent Restaurants */}
                    <div className={`p-5 rounded-2xl border lg:col-span-1 flex flex-col h-[400px] ${bgCard}`}>
                      <h3 className={`text-sm font-black mb-4 tracking-tight ${textPrimary}`}>New Registrations</h3>
                      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                        {stats.recentRestaurants.map((res, i) => (
                          <div key={i} className={`p-3 rounded-xl border flex items-center justify-between ${
                            darkMode ? 'bg-slate-900/40 border-slate-800/50' : 'bg-slate-50 border-slate-100'
                          }`}>
                            <div className="overflow-hidden">
                              <p className={`font-bold text-xs truncate ${textPrimary}`}>{res.restaurantName}</p>
                              <p className="text-[10px] text-slate-400 font-semibold">{res.ownerName}</p>
                            </div>
                            <span className="text-[9px] font-black uppercase bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/20">
                              {res.planName}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recent Payments */}
                    <div className={`p-5 rounded-2xl border lg:col-span-1 flex flex-col h-[400px] ${bgCard}`}>
                      <h3 className={`text-sm font-black mb-4 tracking-tight ${textPrimary}`}>Recent Revenue Feed</h3>
                      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                        {stats.recentPayments.map((pay, i) => (
                          <div key={i} className={`p-3 rounded-xl border flex items-center justify-between ${
                            darkMode ? 'bg-slate-900/40 border-slate-800/50' : 'bg-slate-50 border-slate-100'
                          }`}>
                            <div className="overflow-hidden">
                              <p className={`font-bold text-xs truncate ${textPrimary}`}>{pay.restaurantName}</p>
                              <p className="text-[10px] text-slate-400 font-bold">{new Date(pay.date).toLocaleDateString()} via {pay.method}</p>
                            </div>
                            <span className="text-xs font-black text-emerald-400">
                              +{systemSettings?.currencySymbol || '₹'}{pay.amount}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Audit Logs */}
                    <div className={`p-5 rounded-2xl border lg:col-span-1 flex flex-col h-[400px] ${bgCard}`}>
                      <h3 className={`text-sm font-black mb-4 tracking-tight ${textPrimary}`}>System Timeline</h3>
                      <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
                        {stats.timeline.map((log, i) => (
                          <div key={i} className="flex gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0"></div>
                            <div>
                              <p className={`text-xs font-bold ${textPrimary}`}>{log.action}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{log.details}</p>
                              <p className="text-[8px] text-slate-500 font-extrabold uppercase tracking-widest mt-1">
                                {new Date(log.time).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW 2: RESTAURANTS */}
              {activeTab === 'restaurants' && (
                <div className="space-y-6">
                  {/* Actions Header Bar */}
                  <div className={`p-4 rounded-2xl border flex flex-col md:flex-row gap-4 items-center justify-between ${bgCard}`}>
                    <div className="relative w-full md:w-80">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                      <input
                        type="text"
                        placeholder="Search restaurants, owners, emails..."
                        value={restSearch}
                        onChange={(e) => setRestSearch(e.target.value)}
                        className={`w-full pl-10 pr-4 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${bgInput}`}
                      />
                    </div>

                    <div className="flex flex-wrap gap-3 w-full md:w-auto items-center justify-end">
                      {/* Filter Status */}
                      <select
                        value={restStatusFilter}
                        onChange={(e) => setRestStatusFilter(e.target.value)}
                        className={`px-3 py-2 border rounded-xl text-xs font-semibold bg-transparent ${darkMode ? 'border-slate-800 text-slate-300 bg-slate-950' : 'border-slate-200 text-slate-600 bg-white'}`}
                      >
                        <option value="all">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                        <option value="expired">Expired</option>
                      </select>

                      {/* Filter Plan */}
                      <select
                        value={restPlanFilter}
                        onChange={(e) => setRestPlanFilter(e.target.value)}
                        className={`px-3 py-2 border rounded-xl text-xs font-semibold bg-transparent ${darkMode ? 'border-slate-800 text-slate-300 bg-slate-950' : 'border-slate-200 text-slate-600 bg-white'}`}
                      >
                        <option value="all">All Plans</option>
                        {plans.map(p => (
                          <option key={p._id} value={p.name}>{p.name}</option>
                        ))}
                      </select>

                      {/* Export CSV */}
                      <button
                        onClick={handleExportCSV}
                        className={`p-2 border rounded-xl hover:bg-slate-800/10 text-slate-400 flex items-center gap-1.5 text-xs font-semibold cursor-pointer ${borderPrimary}`}
                      >
                        <FileSpreadsheet size={16} />
                        <span>Export CSV</span>
                      </button>

                      {/* Add Restaurant */}
                      <button
                        onClick={() => {
                          setRestaurantForm({ restaurantName: '', ownerName: '', email: '', password: '', phone: '', planId: plans[0]?._id || '', expiryDays: 30 });
                          setActiveModal('add_restaurant');
                        }}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/20"
                      >
                        <Plus size={16} />
                        <span>Register Restaurant</span>
                      </button>
                    </div>
                  </div>

                  {/* Restaurants Table */}
                  <div className={`rounded-2xl border overflow-hidden ${bgCard}`}>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className={`border-b font-extrabold uppercase tracking-widest ${darkMode ? 'bg-slate-900/50 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                            <th className="p-4">Restaurant</th>
                            <th className="p-4">Owner Details</th>
                            <th className="p-4">Plan Name</th>
                            <th className="p-4">Expiry Date</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {restaurants
                            .filter(r => {
                              const matchesSearch = r.restaurantName.toLowerCase().includes(restSearch.toLowerCase()) ||
                                r.ownerName.toLowerCase().includes(restSearch.toLowerCase()) ||
                                r.email.toLowerCase().includes(restSearch.toLowerCase());
                              
                              const matchesStatus = restStatusFilter === 'all' || r.status === restStatusFilter;
                              const matchesPlan = restPlanFilter === 'all' || r.plan === restPlanFilter;
                              return matchesSearch && matchesStatus && matchesPlan;
                            })
                            .map((r) => {
                              let statusBadge = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                              if (r.status === 'suspended') statusBadge = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                              if (r.status === 'expired') statusBadge = "bg-red-500/10 text-red-400 border-red-500/20";

                              return (
                                <tr key={r.id} className={`hover:bg-slate-850/20 transition-colors ${darkMode ? 'hover:bg-slate-900/20' : 'hover:bg-slate-50/50'}`}>
                                  <td className="p-4">
                                    <p className={`font-extrabold text-sm ${textPrimary}`}>{r.restaurantName}</p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">ID: {r.id.slice(-6)}</p>
                                  </td>
                                  <td className="p-4">
                                    <p className={`font-bold ${textPrimary}`}>{r.ownerName}</p>
                                    <p className="text-[10px] text-slate-400">{r.email}</p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">{r.phone}</p>
                                  </td>
                                  <td className="p-4">
                                    <span className="font-extrabold bg-indigo-500/10 text-indigo-400 px-2.5 py-1 rounded-full border border-indigo-500/20">
                                      {r.plan}
                                    </span>
                                  </td>
                                  <td className="p-4 font-bold text-slate-400">
                                    {r.subscriptionExpiry ? new Date(r.subscriptionExpiry).toLocaleDateString() : 'N/A'}
                                  </td>
                                  <td className="p-4">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border uppercase ${statusBadge}`}>
                                      {r.status}
                                    </span>
                                  </td>
                                  <td className="p-4 text-right space-x-1.5 shrink-0">
                                    <button 
                                      onClick={() => {
                                        setSelectedItem(r);
                                        setActiveModal('edit_restaurant');
                                      }}
                                      className={`p-1.5 border rounded-lg hover:bg-indigo-500/10 hover:text-indigo-400 text-slate-500 cursor-pointer ${borderPrimary}`}
                                    >
                                      <Edit size={14} />
                                    </button>
                                    <button 
                                      onClick={() => handleStatusChange(r.id, r.status)}
                                      className={`p-1.5 border rounded-lg hover:bg-amber-500/10 hover:text-amber-400 text-slate-500 cursor-pointer ${borderPrimary}`}
                                    >
                                      {r.status === 'suspended' ? <CheckCircle size={14} /> : <ShieldAlert size={14} />}
                                    </button>
                                    <button 
                                      onClick={() => {
                                        setSelectedItem({ id: r.id, days: 30 });
                                        setActiveModal('extend_sub');
                                      }}
                                      className={`p-1.5 border rounded-lg hover:bg-violet-500/10 hover:text-violet-400 text-slate-500 cursor-pointer ${borderPrimary}`}
                                    >
                                      <Calendar size={14} />
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteRestaurant(r.id)}
                                      className={`p-1.5 border rounded-lg hover:bg-red-500/10 hover:text-red-400 text-slate-500 cursor-pointer ${borderPrimary}`}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}



              {/* VIEW 4: SUBSCRIPTION PLANS */}
              {activeTab === 'plans' && (
                <div className="space-y-6">
                  {/* Create New Plan Button */}
                  <div className="flex justify-between items-center">
                    <h3 className={`text-base font-extrabold ${textPrimary}`}>Pricing Architecture</h3>
                    <button
                      onClick={() => {
                        setPlanForm({ name: '', price: 999, billingPeriod: 'Monthly', features: '', maxTables: 10, maxBranches: 1, qrLimits: 10, staffLimits: 5 });
                        setActiveModal('plan_form');
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/20"
                    >
                      <Plus size={16} />
                      <span>Create Plan Option</span>
                    </button>
                  </div>

                  {/* Plan Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {plans.map((p) => (
                      <div key={p._id} className={`p-6 rounded-3xl border flex flex-col justify-between relative overflow-hidden ${bgCard}`}>
                        {p.name === 'Enterprise Plan' && (
                          <div className="absolute top-0 right-0 bg-gradient-to-l from-indigo-500 to-violet-600 text-white px-4 py-1 rounded-bl-2xl text-[9px] font-black uppercase tracking-widest shadow-md">
                            Popular Choice
                          </div>
                        )}
                        <div>
                          <h4 className={`text-lg font-black ${textPrimary}`}>{p.name}</h4>
                          <div className="flex items-baseline gap-1 mt-4">
                            <span className={`text-3xl font-black ${textPrimary}`}>{systemSettings?.currencySymbol || '₹'}{p.price}</span>
                            <span className={`text-xs ${textSecondary}`}>/ {p.billingPeriod}</span>
                          </div>

                          {/* Features list */}
                          <ul className="mt-6 space-y-3.5">
                            {p.features.map((feat, i) => (
                              <li key={i} className="flex gap-2 text-xs font-semibold text-slate-400">
                                <CheckCircle size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                                <span>{feat}</span>
                              </li>
                            ))}
                          </ul>

                          {/* Configuration parameters */}
                          <div className={`mt-6 pt-6 border-t ${borderPrimary} grid grid-cols-2 gap-4 text-xs font-semibold text-slate-400`}>
                            <div>
                              <p className="text-[10px] text-slate-500">Max Tables</p>
                              <p className={`text-sm font-black mt-1 ${textPrimary}`}>{p.maxTables}</p>
                            </div>

                            <div>
                              <p className="text-[10px] text-slate-500">QR Scans Limit</p>
                              <p className={`text-sm font-black mt-1 ${textPrimary}`}>{p.qrLimits}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-500">Staff Limit</p>
                              <p className={`text-sm font-black mt-1 ${textPrimary}`}>{p.staffLimits}</p>
                            </div>
                          </div>
                        </div>

                        {/* Modals controls */}
                        <div className="mt-8 flex gap-3">
                          <button
                            onClick={() => {
                              setPlanForm({ ...p, features: p.features.join(', ') });
                              setActiveModal('plan_form');
                            }}
                            className={`flex-1 py-2.5 rounded-xl border font-bold text-xs hover:bg-slate-800/10 text-slate-400 flex items-center justify-center gap-1 cursor-pointer ${borderPrimary}`}
                          >
                            <Edit size={14} />
                            <span>Edit Scheme</span>
                          </button>
                          <button
                            onClick={() => handleDeletePlan(p._id)}
                            className={`p-2.5 border rounded-xl hover:bg-red-500/10 hover:text-red-400 text-slate-500 cursor-pointer ${borderPrimary}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* VIEW 5: ACTIVE SUBSCRIPTIONS */}
              {activeTab === 'active_subs' && (
                <div className="space-y-6">
                  {/* Table containing all active restaurants */}
                  <div className={`rounded-2xl border overflow-hidden ${bgCard}`}>
                    <div className="p-4 border-b border-slate-800/50">
                      <h3 className={`font-black text-sm ${textPrimary}`}>Active Paying Tenants</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className={`border-b font-extrabold uppercase tracking-widest ${darkMode ? 'bg-slate-900/50 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                            <th className="p-4">Restaurant</th>
                            <th className="p-4">Plan Name</th>
                            <th className="p-4">Start Date</th>
                            <th className="p-4">Expiration Date</th>
                            <th className="p-4">Estimated Days Left</th>
                            <th className="p-4">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {restaurants.filter(r => r.status === 'active').map((r) => {
                            const expiry = new Date(r.subscriptionExpiry);
                            const now = new Date();
                            const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

                            return (
                              <tr key={r.id} className={`hover:bg-slate-850/20 transition-colors ${darkMode ? 'hover:bg-slate-900/20' : 'hover:bg-slate-50/50'}`}>
                                <td className="p-4">
                                  <p className={`font-extrabold text-sm ${textPrimary}`}>{r.restaurantName}</p>
                                  <p className="text-[10px] text-slate-400 font-semibold">{r.email}</p>
                                </td>
                                <td className="p-4 font-bold text-slate-400">{r.plan}</td>
                                <td className="p-4 font-bold text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</td>
                                <td className="p-4 font-bold text-slate-300">{expiry.toLocaleDateString()}</td>
                                <td className="p-4 font-bold text-indigo-400">{diffDays} Days Left</td>
                                <td className="p-4">
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    active
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW 6: EXPIRED SUBSCRIPTIONS */}
              {activeTab === 'expired_subs' && (
                <div className="space-y-6">
                  {/* Table containing all expired restaurants */}
                  <div className={`rounded-2xl border overflow-hidden ${bgCard}`}>
                    <div className="p-4 border-b border-slate-800/50">
                      <h3 className={`font-black text-sm ${textPrimary}`}>Subscription Expired / Overdue Base</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className={`border-b font-extrabold uppercase tracking-widest ${darkMode ? 'bg-slate-900/50 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                            <th className="p-4">Restaurant</th>
                            <th className="p-4">Plan Name</th>
                            <th className="p-4">Expired On</th>
                            <th className="p-4">Days Overdue</th>
                            <th className="p-4">Warning level</th>
                            <th className="p-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {restaurants.filter(r => r.status === 'expired' || (r.subscriptionExpiry && new Date(r.subscriptionExpiry) < new Date())).map((r) => {
                            const expiry = new Date(r.subscriptionExpiry);
                            const now = new Date();
                            const diffDays = Math.ceil((now - expiry) / (1000 * 60 * 60 * 24));

                            return (
                              <tr key={r.id} className={`hover:bg-slate-850/20 transition-colors ${darkMode ? 'hover:bg-slate-900/20' : 'hover:bg-slate-50/50'}`}>
                                <td className="p-4">
                                  <p className={`font-extrabold text-sm ${textPrimary}`}>{r.restaurantName}</p>
                                  <p className="text-[10px] text-slate-400 font-semibold">{r.email}</p>
                                </td>
                                <td className="p-4 font-bold text-slate-400">{r.plan}</td>
                                <td className="p-4 font-bold text-slate-300">{expiry.toLocaleDateString()}</td>
                                <td className="p-4 font-bold text-red-400">{diffDays} Days Overdue</td>
                                <td className="p-4">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                                    diffDays > 7 ? 'bg-red-500/10 text-red-400 border-red-500/20 animate-pulse' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  }`}>
                                    {diffDays > 7 ? 'Critical Suspend' : 'Grace Period'}
                                  </span>
                                </td>
                                <td className="p-4 text-right space-x-1.5">
                                  <button
                                    onClick={() => {
                                      setSelectedItem({ id: r.id, days: 30 });
                                      setActiveModal('extend_sub');
                                    }}
                                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[10px] cursor-pointer shadow-md"
                                  >
                                    Renew Subscription
                                  </button>
                                  <button
                                    onClick={() => {
                                      alert(`Reminder email notification dispatched to ${r.ownerName} (${r.email})`);
                                    }}
                                    className={`p-1.5 border rounded-lg hover:bg-slate-800/10 text-slate-500 cursor-pointer ${borderPrimary}`}
                                  >
                                    <Send size={12} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW 7: PAYMENTS */}
              {activeTab === 'payments' && (
                <div className="space-y-6">
                  {/* Actions Header Bar */}
                  <div className="flex justify-between items-center">
                    <h3 className={`text-base font-extrabold ${textPrimary}`}>Financial Ledger</h3>
                    <button
                      onClick={() => {
                        setPaymentForm({ restaurantId: restaurants[0]?.id || '', amount: '', method: 'UPI', date: '' });
                        setActiveModal('payment_form');
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/20"
                    >
                      <Plus size={16} />
                      <span>Log Offline Payment</span>
                    </button>
                  </div>

                  {/* Payments Table */}
                  <div className={`rounded-2xl border overflow-hidden ${bgCard}`}>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className={`border-b font-extrabold uppercase tracking-widest ${darkMode ? 'bg-slate-900/50 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                            <th className="p-4">Transaction ID</th>
                            <th className="p-4">Restaurant</th>
                            <th className="p-4">Amount</th>
                            <th className="p-4">Payment Date</th>
                            <th className="p-4">Gateway Method</th>
                            <th className="p-4">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {payments.map((p) => (
                            <tr key={p._id} className={`hover:bg-slate-850/20 transition-colors ${darkMode ? 'hover:bg-slate-900/20' : 'hover:bg-slate-50/50'}`}>
                              <td className="p-4 font-mono font-bold text-slate-400">TXN-{p._id.toString().slice(-6).toUpperCase()}</td>
                              <td className="p-4 font-bold text-slate-200">{p.restaurant?.restaurantName || 'Unknown Restaurant'}</td>
                              <td className="p-4 font-black text-slate-200">{systemSettings?.currencySymbol || '₹'}{p.amount}</td>
                              <td className="p-4 font-bold text-slate-400">{new Date(p.date || p.createdAt).toLocaleDateString()}</td>
                              <td className="p-4 font-bold text-slate-400">{p.method}</td>
                              <td className="p-4">
                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black border uppercase ${
                                  p.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                                }`}>
                                  {p.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW 8: REVENUE ANALYTICS */}
              {activeTab === 'revenue' && (
                <div className="space-y-6">
                  {/* Performance stats row */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                    <div className={`p-5 rounded-2xl border ${bgCard}`}>
                      <p className={`text-[10px] font-extrabold uppercase tracking-widest ${textSecondary}`}>Total Earnings (All Time)</p>
                      <h3 className={`text-2xl font-black mt-2 tracking-tight ${textPrimary}`}>
                        {systemSettings?.currencySymbol || '₹'}{payments.filter(p => p.status === 'Completed').reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
                      </h3>
                      <span className="text-[10px] text-emerald-400 font-bold bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20 mt-2 inline-block">
                        +14.5% YoY Growth
                      </span>
                    </div>

                    <div className={`p-5 rounded-2xl border ${bgCard}`}>
                      <p className={`text-[10px] font-extrabold uppercase tracking-widest ${textSecondary}`}>Enterprise plan earnings</p>
                      <h3 className={`text-2xl font-black mt-2 tracking-tight ${textPrimary}`}>
                        {systemSettings?.currencySymbol || '₹'}{payments.filter(p => p.status === 'Completed' && p.amount > 3000).reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
                      </h3>
                    </div>

                    <div className={`p-5 rounded-2xl border ${bgCard}`}>
                      <p className={`text-[10px] font-extrabold uppercase tracking-widest ${textSecondary}`}>Pro plan earnings</p>
                      <h3 className={`text-2xl font-black mt-2 tracking-tight ${textPrimary}`}>
                        {systemSettings?.currencySymbol || '₹'}{payments.filter(p => p.status === 'Completed' && p.amount > 1000 && p.amount < 3000).reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
                      </h3>
                    </div>

                    <div className={`p-5 rounded-2xl border ${bgCard}`}>
                      <p className={`text-[10px] font-extrabold uppercase tracking-widest ${textSecondary}`}>Refund / Failure Rate</p>
                      <h3 className={`text-2xl font-black mt-2 tracking-tight ${textPrimary}`}>
                        {((payments.filter(p => p.status === 'Failed').length / (payments.length || 1)) * 100).toFixed(1)}%
                      </h3>
                    </div>
                  </div>

                  {/* Graphical details */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div className={`p-5 rounded-2xl border lg:col-span-2 ${bgCard}`}>
                      <h4 className={`text-sm font-black mb-4 ${textPrimary}`}>Revenue Curve (Past 6 Months)</h4>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={stats.charts.monthlyRevenue}>
                            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#1e293b" : "#f1f5f9"} />
                            <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                            <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: darkMode ? '#0f172a' : '#ffffff', borderColor: darkMode ? '#1e293b' : '#f1f5f9' }} />
                            <Area type="monotone" dataKey="Revenue" stroke="#10b981" strokeWidth={2.5} fill="#10b981" fillOpacity={0.05} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Donut Chart plan breakdown */}
                    <div className={`p-5 rounded-2xl border lg:col-span-1 flex flex-col justify-between ${bgCard}`}>
                      <h4 className={`text-sm font-black mb-4 ${textPrimary}`}>Plan Share Percentage</h4>
                      <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'Basic Plan', value: payments.filter(p => p.amount === 999).length },
                                { name: 'Pro Plan', value: payments.filter(p => p.amount === 2499).length },
                                { name: 'Enterprise Plan', value: payments.filter(p => p.amount === 5999).length }
                              ]}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              <Cell fill="#6366f1" />
                              <Cell fill="#10b981" />
                              <Cell fill="#f59e0b" />
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex justify-around text-[10px] font-bold text-slate-400">
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-[#6366f1] rounded-full inline-block"></span> Basic</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-[#10b981] rounded-full inline-block"></span> Pro</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-[#f59e0b] rounded-full inline-block"></span> Enterprise</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW 9: QR MANAGEMENT */}
              {activeTab === 'qr_codes' && (
                <div className="space-y-6">
                  {/* Grid showing tables QR cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {[
                      { restaurant: 'natkhat', tableName: 'Table 1', scans: 42, orders: 12, url: 'http://localhost:5173/scan/natkhat-t1' },
                      { restaurant: 'Osteria Bella', tableName: 'Table 4', scans: 85, orders: 30, url: 'http://localhost:5173/scan/osteria-t4' },
                      { restaurant: 'Spice Route', tableName: 'Table 2', scans: 19, orders: 4, url: 'http://localhost:5173/scan/spice-t2' },
                      { restaurant: 'The Burger Club', tableName: 'Table 5', scans: 31, orders: 8, url: 'http://localhost:5173/scan/burger-t5' }
                    ].map((qr, idx) => (
                      <div key={idx} className={`p-5 rounded-2xl border flex flex-col justify-between items-center text-center ${bgCard}`}>
                        <div className="w-32 h-32 bg-white p-2 rounded-xl flex items-center justify-center shadow-inner relative group border border-slate-100">
                          {/* Simulated QR Code pixels */}
                          <div className="w-full h-full bg-[#1e293b] opacity-80 rounded-md flex flex-wrap p-1">
                            {Array.from({ length: 16 }).map((_, i) => (
                              <div key={i} className={`w-[25%] h-[25%] border border-[#0f172a] ${i % 3 === 0 || i % 5 === 0 ? 'bg-white' : 'bg-transparent'}`}></div>
                            ))}
                          </div>
                          {/* Download hover overlay */}
                          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-xl flex items-center justify-center">
                            <button
                              onClick={() => {
                                alert(`Downloading high-res QR Code PDF for ${qr.restaurant} - ${qr.tableName}...`);
                              }}
                              className="p-3 bg-indigo-600 rounded-full text-white cursor-pointer hover:bg-indigo-700 shadow-md shadow-indigo-600/30"
                            >
                              <Download size={20} />
                            </button>
                          </div>
                        </div>

                        <div className="mt-4">
                          <h4 className={`font-black text-xs ${textPrimary}`}>{qr.restaurant}</h4>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">{qr.tableName}</p>
                          <div className="flex gap-4 mt-3 text-[10px] font-extrabold text-slate-400 justify-center">
                            <span>Scans: {qr.scans}</span>
                            <span>Orders: {qr.orders}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* VIEW 10: ORDERS MONITORING */}
              {activeTab === 'orders' && (
                <div className="space-y-6">
                  {/* Order monitoring aggregates */}
                  <div className={`p-5 rounded-2xl border flex flex-wrap gap-6 items-center justify-around text-center ${bgCard}`}>
                    {[
                      { label: 'New Orders', val: 1, color: 'indigo' },
                      { label: 'Preparing', val: 1, color: 'amber animate-pulse' },
                      { label: 'Ready', val: 0, color: 'emerald' },
                      { label: 'Served', val: 2, color: 'blue' }
                    ].map((item, idx) => (
                      <div key={idx}>
                        <p className={`text-[10px] font-extrabold uppercase tracking-widest ${textSecondary}`}>{item.label}</p>
                        <h4 className={`text-2xl font-black mt-1 ${textPrimary}`}>{item.val}</h4>
                      </div>
                    ))}
                  </div>

                  {/* Orders Live List */}
                  <div className={`rounded-2xl border overflow-hidden ${bgCard}`}>
                    <div className="p-4 border-b border-slate-800/50">
                      <h3 className={`font-black text-sm ${textPrimary}`}>Active Orders Feed</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className={`border-b font-extrabold uppercase tracking-widest ${darkMode ? 'bg-slate-900/50 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                            <th className="p-4">Order ID</th>
                            <th className="p-4">Restaurant</th>
                            <th className="p-4">Table</th>
                            <th className="p-4">Items Summary</th>
                            <th className="p-4">Total Amount</th>
                            <th className="p-4">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {[
                            { id: '#1204', restaurant: 'natkhat', table: 'Table 1', items: '1x Paneer Butter Masala, 2x Garlic Naan', total: '₹350.00', status: 'Preparing' },
                            { id: '#1205', restaurant: 'Osteria Bella', table: 'Table 4', items: '2x Chicken Biryani, 1x Gulab Jamun', total: '₹680.00', status: 'New Order' }
                          ].map((ord, idx) => (
                            <tr key={idx} className={`hover:bg-slate-850/20 transition-colors ${darkMode ? 'hover:bg-slate-900/20' : 'hover:bg-slate-50/50'}`}>
                              <td className="p-4 font-mono font-bold text-slate-300">{ord.id}</td>
                              <td className="p-4 font-bold text-slate-200">{ord.restaurant}</td>
                              <td className="p-4 text-slate-400 font-bold">{ord.table}</td>
                              <td className="p-4 text-slate-400 font-medium">{ord.items}</td>
                              <td className="p-4 font-black text-slate-200">{ord.total}</td>
                              <td className="p-4">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border uppercase ${
                                  ord.status === 'Preparing' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                }`}>
                                  {ord.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW 11: USERS & STAFF */}
              {activeTab === 'users' && (
                <div className="space-y-6">
                  {/* Table with admin operators */}
                  <div className={`rounded-2xl border overflow-hidden ${bgCard}`}>
                    <div className="p-4 border-b border-slate-800/50 flex justify-between items-center">
                      <h3 className={`font-black text-sm ${textPrimary}`}>Platform Administrators</h3>
                      <button
                        onClick={() => {
                          alert('Adding new administrative credentials...');
                        }}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[10px] flex items-center gap-1.5 cursor-pointer shadow-md"
                      >
                        <Plus size={14} />
                        <span>Add Admin Access</span>
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className={`border-b font-extrabold uppercase tracking-widest ${darkMode ? 'bg-slate-900/50 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                            <th className="p-4">Admin Name</th>
                            <th className="p-4">Account Email</th>
                            <th className="p-4">Access Authority Role</th>
                            <th className="p-4">Security Level</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          <tr className={`hover:bg-slate-850/20 transition-colors ${darkMode ? 'hover:bg-slate-900/20' : 'hover:bg-slate-50/50'}`}>
                            <td className="p-4 font-bold text-slate-200">Global Administrator</td>
                            <td className="p-4 font-semibold text-slate-400">admin@foodaas.com</td>
                            <td className="p-4">
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-violet-500/10 text-violet-400 border border-violet-500/20">
                                SUPER_ADMIN
                              </span>
                            </td>
                            <td className="p-4 font-bold text-slate-400">Full Access console</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW 12: SUPPORT TICKETS */}
              {activeTab === 'support' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 h-[500px]">
                  {/* Left Side: Tickets list */}
                  <div className={`p-4 rounded-2xl border flex flex-col lg:col-span-1 h-full overflow-hidden ${bgCard}`}>
                    <h3 className={`font-black text-sm mb-4 ${textPrimary}`}>Tickets Inbox</h3>
                    <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                      {tickets.map((t) => (
                        <div
                          key={t._id}
                          onClick={() => setSelectedItem(t)}
                          className={`p-3 rounded-xl border text-left cursor-pointer transition-all duration-200 ${
                            selectedItem?._id === t._id 
                              ? 'bg-indigo-600/15 border-indigo-500/50' 
                              : darkMode ? 'bg-slate-900/40 border-slate-800/50 hover:border-slate-700' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-mono text-[9px] font-bold text-slate-500">#{t._id.toString().slice(-6).toUpperCase()}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                              t.status === 'Open' ? 'bg-red-500/10 text-red-400 border-red-500/20' : t.status === 'Closed' ? 'bg-slate-500/10 text-slate-400 border-slate-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}>
                              {t.status}
                            </span>
                          </div>
                          <p className={`font-bold text-xs truncate ${textPrimary}`}>{t.title}</p>
                          <p className="text-[10px] text-slate-400 font-semibold mt-1">{t.restaurant?.restaurantName || 'Restaurant'}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Side: Chat panel */}
                  <div className={`p-5 rounded-2xl border flex flex-col lg:col-span-2 h-full overflow-hidden justify-between ${bgCard}`}>
                    {selectedItem ? (
                      <>
                        {/* Conversation Header */}
                        <div className={`pb-4 border-b ${borderPrimary} flex justify-between items-center`}>
                          <div>
                            <h4 className={`font-black text-sm ${textPrimary}`}>{selectedItem.title}</h4>
                            <p className="text-[10px] text-slate-400 font-bold mt-1">Tenant: {selectedItem.restaurant?.restaurantName || 'Restaurant'}</p>
                          </div>

                          <div className="flex gap-2">
                            <select
                              value={selectedItem.status}
                              onChange={(e) => handleTicketStatusChange(selectedItem._id, e.target.value)}
                              className={`px-2 py-1.5 border rounded-lg text-[10px] font-extrabold bg-transparent ${darkMode ? 'border-slate-800 text-slate-300 bg-slate-950' : 'border-slate-200 text-slate-600 bg-white'}`}
                            >
                              <option value="Open">Open</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Closed">Closed</option>
                            </select>
                          </div>
                        </div>

                        {/* Messages Thread */}
                        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
                          {selectedItem.messages?.map((msg, idx) => {
                            const isAdmin = msg.sender === 'SuperAdmin';
                            return (
                              <div key={idx} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[70%] p-3.5 rounded-2xl text-xs font-semibold ${
                                  isAdmin 
                                    ? 'bg-indigo-600 text-white rounded-br-none' 
                                    : darkMode ? 'bg-slate-900 border border-slate-800 text-slate-100 rounded-bl-none' : 'bg-slate-100 text-slate-800 rounded-bl-none'
                                }`}>
                                  <p>{msg.text}</p>
                                  <span className={`text-[8px] mt-1 block text-right font-extrabold ${isAdmin ? 'text-indigo-200' : 'text-slate-500'}`}>
                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Reply Form */}
                        <form onSubmit={handleSendTicketReply} className="flex gap-2 pt-4 border-t border-slate-800/50">
                          <input
                            type="text"
                            placeholder="Type administrative reply..."
                            value={ticketReplyText}
                            onChange={(e) => setTicketReplyText(e.target.value)}
                            className={`flex-1 px-4 py-2.5 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${bgInput}`}
                          />
                          <button
                            type="submit"
                            className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl cursor-pointer shadow-md shadow-indigo-600/20"
                          >
                            <Send size={16} />
                          </button>
                        </form>
                      </>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-500">
                        <MessageSquare size={48} className="text-slate-600 mb-2" />
                        <p className="font-bold text-xs">Select a support ticket from inbox to view the chat thread.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* VIEW 13: NOTIFICATIONS */}
              {activeTab === 'notifications' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  {/* Left Side: Broadcast form */}
                  <div className={`p-5 rounded-2xl border lg:col-span-1 flex flex-col ${bgCard}`}>
                    <h3 className={`font-black text-sm mb-4 ${textPrimary}`}>Dispatch Announcement</h3>
                    <form onSubmit={handleSendAnnouncement} className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Subject Title</label>
                        <input
                          type="text"
                          required
                          value={announcementForm.title}
                          onChange={(e) => setAnnouncementForm(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="e.g. Scheduled Optimization downtime"
                          className={`w-full px-4 py-2.5 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${bgInput}`}
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Announcement Message</label>
                        <textarea
                          required
                          rows={4}
                          value={announcementForm.message}
                          onChange={(e) => setAnnouncementForm(prev => ({ ...prev, message: e.target.value }))}
                          placeholder="Type details to transmit to all tenants..."
                          className={`w-full px-4 py-2.5 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${bgInput}`}
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5"
                      >
                        <Send size={14} />
                        <span>Send Global Broadcast</span>
                      </button>
                    </form>
                  </div>

                  {/* Right Side: Sent notifications history */}
                  <div className={`p-5 rounded-2xl border lg:col-span-2 flex flex-col h-[400px] ${bgCard}`}>
                    <h3 className={`font-black text-sm mb-4 ${textPrimary}`}>Broadcast History</h3>
                    <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                      {notifications.map((n) => (
                        <div key={n._id} className={`p-4 rounded-xl border ${
                          darkMode ? 'bg-slate-900/40 border-slate-800/50' : 'bg-slate-50 border-slate-100'
                        }`}>
                          <div className="flex justify-between items-start mb-2">
                            <h4 className={`font-bold text-xs ${textPrimary}`}>{n.title}</h4>
                            <span className="text-[8px] text-slate-500 font-extrabold uppercase tracking-widest">
                              {new Date(n.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium leading-relaxed">{n.message}</p>
                          <span className="text-[8px] font-black uppercase text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20 mt-3 inline-block">
                            Type: {n.type}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW 14: COUPONS & OFFERS */}
              {activeTab === 'coupons' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  {/* Left Side: Create coupon */}
                  <div className={`p-5 rounded-2xl border lg:col-span-1 flex flex-col ${bgCard}`}>
                    <h3 className={`font-black text-sm mb-4 ${textPrimary}`}>Create Promo Code</h3>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const newC = {
                          id: Date.now().toString(),
                          code: couponForm.code.toUpperCase(),
                          discount: parseFloat(couponForm.discount),
                          maxUses: parseInt(couponForm.maxUses),
                          used: 0,
                          expiryDate: couponForm.expiryDate,
                          status: 'Active'
                        };
                        setCoupons(prev => [newC, ...prev]);
                        setCouponForm({ code: '', discount: '', maxUses: '', expiryDate: '' });
                        alert('Promo Code created successfully!');
                      }}
                      className="space-y-4"
                    >
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Promo Code</label>
                        <input
                          type="text"
                          required
                          value={couponForm.code}
                          onChange={(e) => setCouponForm(prev => ({ ...prev, code: e.target.value }))}
                          placeholder="e.g. SAVE30"
                          className={`w-full px-4 py-2.5 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${bgInput}`}
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Discount Percentage</label>
                        <input
                          type="number"
                          required
                          value={couponForm.discount}
                          onChange={(e) => setCouponForm(prev => ({ ...prev, discount: e.target.value }))}
                          placeholder="e.g. 30"
                          className={`w-full px-4 py-2.5 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${bgInput}`}
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Max Uses</label>
                        <input
                          type="number"
                          required
                          value={couponForm.maxUses}
                          onChange={(e) => setCouponForm(prev => ({ ...prev, maxUses: e.target.value }))}
                          placeholder="e.g. 100"
                          className={`w-full px-4 py-2.5 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${bgInput}`}
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Expiration Date</label>
                        <input
                          type="date"
                          required
                          value={couponForm.expiryDate}
                          onChange={(e) => setCouponForm(prev => ({ ...prev, expiryDate: e.target.value }))}
                          className={`w-full px-4 py-2.5 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${bgInput}`}
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1"
                      >
                        <Plus size={14} />
                        <span>Add Coupon Code</span>
                      </button>
                    </form>
                  </div>

                  {/* Right Side: Coupons list */}
                  <div className={`rounded-2xl border overflow-hidden lg:col-span-2 ${bgCard}`}>
                    <div className="p-4 border-b border-slate-800/50">
                      <h3 className={`font-black text-sm ${textPrimary}`}>Active Promotion Schemes</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className={`border-b font-extrabold uppercase tracking-widest ${darkMode ? 'bg-slate-900/50 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                            <th className="p-4">Promo Code</th>
                            <th className="p-4">Discount</th>
                            <th className="p-4 text-center">Uses status</th>
                            <th className="p-4">Expiry Date</th>
                            <th className="p-4">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {coupons.map((c) => (
                            <tr key={c.id} className={`hover:bg-slate-850/20 transition-colors ${darkMode ? 'hover:bg-slate-900/20' : 'hover:bg-slate-50/50'}`}>
                              <td className="p-4 font-mono font-bold text-indigo-400 text-sm">{c.code}</td>
                              <td className="p-4 font-black text-slate-200">{c.discount}% Off</td>
                              <td className="p-4 text-center text-slate-400 font-bold">{c.used} / {c.maxUses} used</td>
                              <td className="p-4 font-bold text-slate-400">{new Date(c.expiryDate).toLocaleDateString()}</td>
                              <td className="p-4">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                                  c.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                }`}>
                                  {c.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW 15: SETTINGS */}
              {activeTab === 'settings' && (
                <div className="max-w-3xl">
                  <div className={`p-6 rounded-3xl border ${bgCard}`}>
                    <form onSubmit={handleSaveSettings} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Platform Name</label>
                          <input
                            type="text"
                            required
                            value={settingsForm.platformName}
                            onChange={(e) => setSettingsForm(prev => ({ ...prev, platformName: e.target.value }))}
                            className={`w-full px-4 py-2.5 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${bgInput}`}
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Site Logo URL</label>
                          <input
                            type="text"
                            required
                            value={settingsForm.logoUrl}
                            onChange={(e) => setSettingsForm(prev => ({ ...prev, logoUrl: e.target.value }))}
                            className={`w-full px-4 py-2.5 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${bgInput}`}
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">SMTP Host Server</label>
                          <input
                            type="text"
                            required
                            value={settingsForm.smtpHost}
                            onChange={(e) => setSettingsForm(prev => ({ ...prev, smtpHost: e.target.value }))}
                            className={`w-full px-4 py-2.5 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${bgInput}`}
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">SMTP Port</label>
                          <input
                            type="text"
                            required
                            value={settingsForm.smtpPort}
                            onChange={(e) => setSettingsForm(prev => ({ ...prev, smtpPort: e.target.value }))}
                            className={`w-full px-4 py-2.5 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${bgInput}`}
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">SMTP Alert Username</label>
                          <input
                            type="text"
                            required
                            value={settingsForm.smtpUser}
                            onChange={(e) => setSettingsForm(prev => ({ ...prev, smtpUser: e.target.value }))}
                            className={`w-full px-4 py-2.5 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${bgInput}`}
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">SMTP Gateway Password</label>
                          <input
                            type="password"
                            defaultValue="••••••••••••"
                            className={`w-full px-4 py-2.5 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${bgInput}`}
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Currency Symbol</label>
                          <input
                            type="text"
                            required
                            value={settingsForm.currency}
                            onChange={(e) => setSettingsForm(prev => ({ ...prev, currency: e.target.value }))}
                            className={`w-full px-4 py-2.5 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${bgInput}`}
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Global Tax Percentage</label>
                          <input
                            type="number"
                            required
                            value={settingsForm.taxPercentage}
                            onChange={(e) => setSettingsForm(prev => ({ ...prev, taxPercentage: e.target.value }))}
                            className={`w-full px-4 py-2.5 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${bgInput}`}
                          />
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-800/50">
                        <button
                          type="submit"
                          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
                        >
                          <CheckCircle size={16} />
                          <span>Save Branding & Server Settings</span>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <footer className={`h-12 border-t flex items-center justify-center text-[10px] font-bold uppercase tracking-widest ${
          darkMode ? 'bg-slate-950/60 border-slate-900 text-slate-600' : 'bg-white border-slate-100 text-slate-400'
        }`}>
          &copy; {new Date().getFullYear()} {systemSettings?.platformName || 'FoodaaS'} &bull; SUPER_ADMIN DASHBOARD CONSOLE
        </footer>
      </main>

      {/* MODALS GATEWAY */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-lg p-6 rounded-3xl border shadow-2xl relative max-h-[90vh] overflow-y-auto ${
                darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-100 text-slate-800'
              }`}
            >
              <h3 className={`text-base font-black mb-4 tracking-tight ${textPrimary}`}>
                {activeModal.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </h3>

              {/* MODAL: REGISTER RESTAURANT */}
              {activeModal === 'add_restaurant' && (
                <form onSubmit={handleCreateRestaurant} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Restaurant Name</label>
                      <input
                        type="text"
                        required
                        value={restaurantForm.restaurantName}
                        onChange={(e) => setRestaurantForm(prev => ({ ...prev, restaurantName: e.target.value }))}
                        placeholder="e.g. natkhat"
                        className={`w-full px-4 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${bgInput}`}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Owner Name</label>
                      <input
                        type="text"
                        required
                        value={restaurantForm.ownerName}
                        onChange={(e) => setRestaurantForm(prev => ({ ...prev, ownerName: e.target.value }))}
                        placeholder="e.g. Shubham Kumar"
                        className={`w-full px-4 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${bgInput}`}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Account Email</label>
                      <input
                        type="email"
                        required
                        value={restaurantForm.email}
                        onChange={(e) => setRestaurantForm(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="owner@gmail.com"
                        className={`w-full px-4 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${bgInput}`}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Password</label>
                      <input
                        type="password"
                        required
                        value={restaurantForm.password}
                        onChange={(e) => setRestaurantForm(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="••••••••"
                        className={`w-full px-4 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${bgInput}`}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Phone Number</label>
                      <input
                        type="text"
                        required
                        value={restaurantForm.phone}
                        onChange={(e) => setRestaurantForm(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="+91 98765 43210"
                        className={`w-full px-4 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${bgInput}`}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Choose Plan</label>
                      <select
                        value={restaurantForm.planId}
                        onChange={(e) => setRestaurantForm(prev => ({ ...prev, planId: e.target.value }))}
                        className={`w-full px-3 py-2 border rounded-xl text-xs font-semibold bg-transparent ${darkMode ? 'border-slate-800 text-slate-300 bg-slate-950' : 'border-slate-200 text-slate-600 bg-white'}`}
                      >
                        {plans.map(p => (
                          <option key={p._id} value={p._id}>{p.name} (₹{p.price})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Expiration Limit (Days)</label>
                      <input
                        type="number"
                        required
                        value={restaurantForm.expiryDays}
                        onChange={(e) => setRestaurantForm(prev => ({ ...prev, expiryDays: e.target.value }))}
                        placeholder="30"
                        className={`w-full px-4 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${bgInput}`}
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex gap-3 border-t border-slate-800/50 justify-end">
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className={`px-4 py-2 border rounded-xl font-bold text-xs hover:bg-slate-800/10 text-slate-400 cursor-pointer ${borderPrimary}`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow-md"
                    >
                      Register Restaurant
                    </button>
                  </div>
                </form>
              )}

              {/* MODAL: EDIT RESTAURANT */}
              {activeModal === 'edit_restaurant' && selectedItem && (
                <form onSubmit={handleUpdateRestaurant} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Restaurant Name</label>
                      <input
                        type="text"
                        required
                        value={selectedItem.restaurantName}
                        onChange={(e) => setSelectedItem(prev => ({ ...prev, restaurantName: e.target.value }))}
                        className={`w-full px-4 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${bgInput}`}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Owner Name</label>
                      <input
                        type="text"
                        required
                        value={selectedItem.ownerName}
                        onChange={(e) => setSelectedItem(prev => ({ ...prev, ownerName: e.target.value }))}
                        className={`w-full px-4 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${bgInput}`}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Account Email</label>
                      <input
                        type="email"
                        required
                        value={selectedItem.email}
                        onChange={(e) => setSelectedItem(prev => ({ ...prev, email: e.target.value }))}
                        className={`w-full px-4 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${bgInput}`}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Phone Number</label>
                      <input
                        type="text"
                        required
                        value={selectedItem.phone}
                        onChange={(e) => setSelectedItem(prev => ({ ...prev, phone: e.target.value }))}
                        className={`w-full px-4 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${bgInput}`}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Change Plan</label>
                      <select
                        value={selectedItem.planId || ''}
                        onChange={(e) => setSelectedItem(prev => ({ ...prev, planId: e.target.value }))}
                        className={`w-full px-3 py-2 border rounded-xl text-xs font-semibold bg-transparent ${darkMode ? 'border-slate-800 text-slate-300 bg-slate-950' : 'border-slate-200 text-slate-600 bg-white'}`}
                      >
                        {plans.map(p => (
                          <option key={p._id} value={p._id}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Status</label>
                      <select
                        value={selectedItem.status}
                        onChange={(e) => setSelectedItem(prev => ({ ...prev, status: e.target.value }))}
                        className={`w-full px-3 py-2 border rounded-xl text-xs font-semibold bg-transparent ${darkMode ? 'border-slate-800 text-slate-300 bg-slate-950' : 'border-slate-200 text-slate-600 bg-white'}`}
                      >
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                        <option value="expired">Expired</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4 flex gap-3 border-t border-slate-800/50 justify-end">
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className={`px-4 py-2 border rounded-xl font-bold text-xs hover:bg-slate-800/10 text-slate-400 cursor-pointer ${borderPrimary}`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow-md"
                    >
                      Save Modifications
                    </button>
                  </div>
                </form>
              )}

              {/* MODAL: EXTEND SUBSCRIPTION */}
              {activeModal === 'extend_sub' && selectedItem && (
                <form onSubmit={handleExtendExpiry} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Duration (Days)</label>
                    <input
                      type="number"
                      required
                      value={selectedItem.days}
                      onChange={(e) => setSelectedItem(prev => ({ ...prev, days: e.target.value }))}
                      placeholder="30"
                      className={`w-full px-4 py-2.5 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${bgInput}`}
                    />
                  </div>

                  <div className="pt-4 flex gap-3 border-t border-slate-800/50 justify-end">
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className={`px-4 py-2 border rounded-xl font-bold text-xs hover:bg-slate-800/10 text-slate-400 cursor-pointer ${borderPrimary}`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow-md"
                    >
                      Add Expiry Days
                    </button>
                  </div>
                </form>
              )}

              {/* MODAL: PLAN CONFIG FORM */}
              {activeModal === 'plan_form' && (
                <form onSubmit={handlePlanSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Plan Name</label>
                      <input
                        type="text"
                        required
                        value={planForm.name}
                        onChange={(e) => setPlanForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g. Pro Plan"
                        className={`w-full px-4 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${bgInput}`}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Price Amount</label>
                      <input
                        type="number"
                        required
                        value={planForm.price}
                        onChange={(e) => setPlanForm(prev => ({ ...prev, price: e.target.value }))}
                        className={`w-full px-4 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${bgInput}`}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Billing Period</label>
                      <select
                        value={planForm.billingPeriod}
                        onChange={(e) => setPlanForm(prev => ({ ...prev, billingPeriod: e.target.value }))}
                        className={`w-full px-3 py-2 border rounded-xl text-xs font-semibold bg-transparent ${darkMode ? 'border-slate-800 text-slate-300 bg-slate-950' : 'border-slate-200 text-slate-600 bg-white'}`}
                      >
                        <option value="Monthly">Monthly</option>
                        <option value="Yearly">Yearly</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Max Tables</label>
                      <input
                        type="number"
                        required
                        value={planForm.maxTables}
                        onChange={(e) => setPlanForm(prev => ({ ...prev, maxTables: e.target.value }))}
                        className={`w-full px-4 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${bgInput}`}
                      />
                    </div>



                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">QR Scans Limit</label>
                      <input
                        type="number"
                        required
                        value={planForm.qrLimits}
                        onChange={(e) => setPlanForm(prev => ({ ...prev, qrLimits: e.target.value }))}
                        className={`w-full px-4 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${bgInput}`}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Staff Limit</label>
                      <input
                        type="number"
                        required
                        value={planForm.staffLimits}
                        onChange={(e) => setPlanForm(prev => ({ ...prev, staffLimits: e.target.value }))}
                        className={`w-full px-4 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${bgInput}`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Features (Comma Separated)</label>
                    <textarea
                      rows={3}
                      required
                      value={planForm.features}
                      onChange={(e) => setPlanForm(prev => ({ ...prev, features: e.target.value }))}
                      placeholder="e.g. 5 Branches Limit, Custom Logo QR Codes, 10 Staff Members"
                      className={`w-full px-4 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${bgInput}`}
                    />
                  </div>

                  <div className="pt-4 flex gap-3 border-t border-slate-800/50 justify-end">
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className={`px-4 py-2 border rounded-xl font-bold text-xs hover:bg-slate-800/10 text-slate-400 cursor-pointer ${borderPrimary}`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow-md"
                    >
                      Save Pricing Plan
                    </button>
                  </div>
                </form>
              )}

              {/* MODAL: OFFLINE PAYMENT LOGGER */}
              {activeModal === 'payment_form' && (
                <form onSubmit={handlePaymentSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Restaurant Account</label>
                    <select
                      value={paymentForm.restaurantId}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, restaurantId: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-xl text-xs font-semibold bg-transparent ${darkMode ? 'border-slate-800 text-slate-300 bg-slate-950' : 'border-slate-200 text-slate-600 bg-white'}`}
                    >
                      {restaurants.map(r => (
                        <option key={r.id} value={r.id}>{r.restaurantName}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Amount Received</label>
                    <input
                      type="number"
                      required
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder="e.g. 2499"
                      className={`w-full px-4 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${bgInput}`}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Payment Method</label>
                    <select
                      value={paymentForm.method}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, method: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-xl text-xs font-semibold bg-transparent ${darkMode ? 'border-slate-800 text-slate-300 bg-slate-950' : 'border-slate-200 text-slate-600 bg-white'}`}
                    >
                      <option value="UPI">UPI</option>
                      <option value="Cash">Cash</option>
                      <option value="Card">Card</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                  </div>

                  <div className="pt-4 flex gap-3 border-t border-slate-800/50 justify-end">
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className={`px-4 py-2 border rounded-xl font-bold text-xs hover:bg-slate-800/10 text-slate-400 cursor-pointer ${borderPrimary}`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow-md"
                    >
                      Log offline txn
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SuperAdminDashboard;
