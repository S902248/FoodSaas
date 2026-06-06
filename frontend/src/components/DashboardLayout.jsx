import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link, Outlet, useLocation } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import {
  ChefHat,
  LayoutDashboard,
  UtensilsCrossed,
  ClipboardList,
  Grid2X2,
  QrCode,
  LogOut,
  Search,
  Bell,
  Calendar,
  Clock,
  ChevronRight,
  CreditCard,
  BarChart,
  Settings as SettingsIcon,
  Menu,
  Users,
  Radio,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const DashboardLayout = () => {
  const { restaurant, logout, loading } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [liveOrders, setLiveOrders] = useState([]);
  const [liveOrdersExpanded, setLiveOrdersExpanded] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Determine active tab from current route
  const getActiveTab = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'dashboard';
    if (path.includes('/menu')) return 'menu';
    if (path.includes('/orders')) return 'orders';
    if (path.includes('/qr-codes')) return 'qrcodes';
    if (path.includes('/tables')) return 'tables';
    if (path.includes('/customers')) return 'customers';
    if (path.includes('/billing')) return 'billing';
    if (path.includes('/reports')) return 'reports';
    if (path.includes('/settings')) return 'settings';
    return 'dashboard';
  };

  const activeTab = getActiveTab();

  // Socket.IO for low stock alerts
  useEffect(() => {
    if (restaurant && (restaurant._id || restaurant.id)) {
      const restaurantId = restaurant._id || restaurant.id;
      const socket = io('http://localhost:5000');
      
      socket.emit('joinRestaurantRoom', restaurantId);

      socket.on('low_stock_alert', (notification) => {
        setAlerts(prev => [...prev, notification]);
      });

      socket.on('alert_resolved', (data) => {
        setAlerts(prev => prev.filter(n => n.productName !== data.productName));
      });

      return () => socket.disconnect();
    }
  }, [restaurant]);

  // Fetch live orders for the sidebar mini-panel
  const fetchLiveOrders = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/orders');
      const activeOrders = res.data
        .filter(o => !['Completed', 'Cancelled', 'Served'].includes(o.status))
        .map(o => {
          let statusColor = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
          if (o.status === 'Preparing') {
            statusColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
          } else if (o.status === 'Ready') {
            statusColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
          }
          return {
            id: o.orderId,
            table: o.tableName,
            status: o.status,
            statusColor,
            total: `₹${o.totalAmount}`,
            time: `${Math.max(1, Math.round((Date.now() - new Date(o.createdAt).getTime()) / 60000))}m ago`
          };
        });
      setLiveOrders(activeOrders);
    } catch (err) {
      // silent fail – sidebar shouldn't break page
    }
  };

  useEffect(() => {
    if (!loading && restaurant) {
      fetchLiveOrders();
      const interval = setInterval(fetchLiveOrders, 5000);
      return () => clearInterval(interval);
    }
  }, [loading, restaurant]);

  const navGroups = [
    {
      name: 'Operations',
      items: [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', tab: 'dashboard' },
        { to: '/dashboard/orders', icon: ClipboardList, label: 'Orders', tab: 'orders' },
        { to: '/dashboard/tables', icon: Grid2X2, label: 'Tables', tab: 'tables' },
        { to: '/dashboard/menu', icon: UtensilsCrossed, label: 'Menu', tab: 'menu' },
      ]
    },
    {
      name: 'Management',
      items: [
        { to: '/dashboard/customers', icon: Users, label: 'Customers', tab: 'customers' },
      ]
    },
    {
      name: 'Billing',
      items: [
        { to: '/dashboard/billing', icon: CreditCard, label: 'Billing', tab: 'billing' }
      ]
    }
  ];

  useEffect(() => {
    // Auto-expand the active group
    const newExpanded = { ...expandedGroups };
    let changed = false;
    navGroups.forEach(group => {
      if (group.items.some(item => item.tab === activeTab)) {
        if (!newExpanded[group.name]) {
          newExpanded[group.name] = true;
          changed = true;
        }
      }
    });
    if (changed) setExpandedGroups(newExpanded);
  }, [activeTab]);

  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8FAFC] font-sans overflow-hidden">
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-[#111827] text-white shrink-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-gradient-to-br from-[#6C4DFF] to-indigo-600 rounded-lg">
            <ChefHat size={20} className="text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">BitsCon</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-1 text-slate-300 hover:text-white transition-colors">
          <Menu size={24} />
        </button>
      </div>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      {/* Premium Sidebar */}
      <aside className={`fixed md:relative z-50 h-full w-64 bg-[#111827] text-slate-300 flex flex-col justify-between transition-transform duration-300 shadow-2xl shrink-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="flex flex-col flex-1 min-h-0">
          {/* Logo & Notifications */}
          <div className="p-6 flex items-center justify-between text-white border-b border-slate-800/50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-[#6C4DFF] to-indigo-600 rounded-xl shadow-lg shadow-indigo-500/30">
                <ChefHat size={24} className="text-white" />
              </div>
              <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">BitsCon</span>
            </div>
            
            {/* Notification Bell */}
            <div className="relative cursor-pointer hover:bg-slate-800 p-2 rounded-full transition-colors group">
              <Bell size={20} className="text-slate-400 group-hover:text-white" />
              {alerts.length > 0 && (
                <>
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border border-slate-900"></span>
                  {/* Tooltip for alerts */}
                  <div className="absolute left-full ml-2 top-0 bg-slate-800 text-white text-xs rounded-lg p-3 w-48 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                    <p className="font-bold mb-1 border-b border-slate-700 pb-1">Alerts ({alerts.length})</p>
                    {alerts.map((a, i) => (
                      <p key={i} className="text-[10px] text-slate-300 py-1 truncate">{a.message || a.title}</p>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Nav Items Grouped */}
          <nav className="px-4 py-6 space-y-4 shrink-0 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
            {navGroups.map((group) => (
              <div key={group.name} className="space-y-1.5">
                <button
                  onClick={() => toggleGroup(group.name)}
                  className="flex items-center justify-between w-full px-2 py-1 text-xs font-bold text-slate-500 uppercase tracking-wider hover:text-slate-300 transition-colors"
                >
                  {group.name}
                  {expandedGroups[group.name] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {expandedGroups[group.name] && (
                  <div className="space-y-1.5 mt-1">
                    {group.items.map(item => (
                      <Link
                        key={item.tab}
                        to={item.to}
                        className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${
                          activeTab === item.tab
                            ? 'bg-gradient-to-r from-[#6C4DFF] to-[#5235DB] text-white shadow-xl shadow-indigo-500/20'
                            : 'hover:bg-slate-800/50 hover:text-white text-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon size={20} className={activeTab === item.tab ? 'text-white' : 'text-slate-400 group-hover:text-white'} />
                          <span className="font-semibold text-sm">{item.label}</span>
                        </div>
                        {activeTab === item.tab && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Live Orders Mini-Panel */}
          <div className="px-4 pb-4 flex flex-col overflow-hidden max-h-48 border-t border-slate-800/50 pt-4">
            <button
              onClick={() => setLiveOrdersExpanded(!liveOrdersExpanded)}
              className="flex items-center justify-between w-full px-3 py-2 mb-2 rounded-lg hover:bg-slate-800/50 transition-colors shrink-0"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50"></span>
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Live Orders</span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#6C4DFF]/20 text-[#6C4DFF] rounded-full">
                  {liveOrders.length}
                </span>
              </div>
              {liveOrdersExpanded ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronUp size={14} className="text-slate-500" />}
            </button>

            {liveOrdersExpanded && (
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 pb-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                {liveOrders.length === 0 ? (
                  <div className="text-center py-2">
                    <Radio size={20} className="text-slate-600 mx-auto mb-2" />
                    <p className="text-xs text-slate-600 font-medium">No active orders</p>
                  </div>
                ) : (
                  liveOrders.map((order, i) => (
                    <div
                      key={i}
                      className="px-3 py-2.5 bg-slate-800/40 border border-slate-700/40 rounded-xl hover:border-slate-600/60 transition-all cursor-pointer"
                      onClick={() => navigate('/dashboard/orders')}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white">{order.id}</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${order.statusColor}`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-500 font-medium">{order.table}</span>
                        <span className="text-slate-400 font-semibold">{order.total}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-600">
                        <Clock size={9} />
                        <span>{order.time}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Profile Card & Logout */}
        <div className="p-4 border-t border-slate-800/50 space-y-3 shrink-0">
          <div className="flex items-center gap-3 px-3 py-2 bg-slate-800/30 rounded-xl border border-slate-800/50">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#6C4DFF] to-indigo-400 flex items-center justify-center text-white font-bold shadow-md">
              {restaurant?.restaurantName?.charAt(0) || 'O'}
            </div>
            <div className="overflow-hidden">
              <p className="font-semibold text-sm text-white truncate">{restaurant?.restaurantName || 'Restaurant'}</p>
              <p className="text-xs text-slate-500 truncate">Store Owner</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-left rounded-xl hover:bg-red-500/10 hover:text-red-400 text-slate-400 transition-all duration-200"
          >
            <LogOut size={20} />
            <span className="font-semibold text-sm">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Render the child route page */}
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
