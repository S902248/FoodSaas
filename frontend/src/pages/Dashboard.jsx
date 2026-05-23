import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
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
  TrendingUp,
  Users,
  Star,
  DollarSign,
  ChevronRight,
  Clock,
  AlertTriangle
} from 'lucide-react';

const Dashboard = () => {
  const { restaurant, logout, loading } = useContext(AuthContext);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [liveOrders, setLiveOrders] = useState([]);
  const [tables, setTables] = useState([]);
  const [stats, setStats] = useState([
    { 
      title: "Today's Revenue", 
      value: "₹0.00", 
      change: "+0%", 
      isPositive: true,
      color: "from-purple-500/10 to-indigo-500/10 text-purple-600 border-purple-500/20" 
    },
    { 
      title: "Live Orders", 
      value: "0", 
      change: "0 Active", 
      isPositive: true,
      color: "from-blue-500/10 to-cyan-500/10 text-blue-600 border-blue-500/20" 
    },
    { 
      title: "Table Occupancy", 
      value: "0%", 
      change: "0 Tables", 
      isPositive: true,
      color: "from-amber-500/10 to-orange-500/10 text-amber-600 border-amber-500/20" 
    },
    { 
      title: "Guest Experience", 
      value: "4.9", 
      change: "115 Reviews", 
      isPositive: true,
      color: "from-emerald-500/10 to-teal-500/10 text-emerald-600 border-emerald-500/20" 
    }
  ]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const fetchDashboardData = async () => {
    try {
      const [ordersRes, qrRes] = await Promise.all([
        axios.get('http://localhost:5000/api/orders'),
        axios.get('http://localhost:5000/api/qrcodes')
      ]);

      const activeOrders = ordersRes.data;
      const qrcodes = qrRes.data.qrcodes || [];

      // Map orders to display structure
      const mappedOrders = activeOrders
        .filter(o => !['Completed', 'Cancelled', 'Served'].includes(o.status))
        .map(o => {
          let statusColor = "bg-blue-500/10 text-blue-600 border-blue-500/20";
          if (o.status === "Preparing") {
            statusColor = "bg-amber-500/10 text-amber-600 border-amber-500/20 animate-pulse";
          } else if (o.status === "Ready") {
            statusColor = "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
          }
          
          return {
            id: o.orderId,
            table: o.tableName,
            itemsCount: o.items.reduce((sum, item) => sum + item.quantity, 0),
            status: o.status,
            statusColor,
            total: `₹${o.totalAmount.toFixed(2)}`,
            items: o.items.map(item => ({ name: item.name, qty: item.quantity, price: `₹${item.price.toFixed(2)}` })),
            time: `${Math.max(1, Math.round((Date.now() - new Date(o.createdAt).getTime()) / 60000))} mins ago`
          };
        });
      setLiveOrders(mappedOrders);

      // Compute stats
      const totalRevenue = activeOrders
        .filter(o => !['Cancelled'].includes(o.status))
        .reduce((sum, o) => sum + o.totalAmount, 0);

      const activeOrdersCount = activeOrders.filter(o => !['Completed', 'Cancelled', 'Served'].includes(o.status)).length;
      
      const occupiedTablesCount = new Set(
        activeOrders
          .filter(o => !['Completed', 'Cancelled', 'Served'].includes(o.status))
          .map(o => o.tableName)
      ).size;
      const totalTablesCount = qrcodes.length || 12;
      const occupancyRate = Math.round((occupiedTablesCount / totalTablesCount) * 100);

      setStats([
        { 
          title: "Today's Revenue", 
          value: `₹${totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, 
          change: `+${activeOrders.length} orders`, 
          isPositive: true,
          color: "from-purple-500/10 to-indigo-500/10 text-purple-600 border-purple-500/20" 
        },
        { 
          title: "Live Orders", 
          value: String(activeOrdersCount), 
          change: "Active Now", 
          isPositive: true,
          color: "from-blue-500/10 to-cyan-500/10 text-blue-600 border-blue-500/20" 
        },
        { 
          title: "Table Occupancy", 
          value: `${occupancyRate}%`, 
          change: `${occupiedTablesCount}/${totalTablesCount} Tables`, 
          isPositive: true,
          color: "from-amber-500/10 to-orange-500/10 text-amber-600 border-amber-500/20" 
        },
        { 
          title: "Guest Experience", 
          value: "4.9", 
          change: "115 Reviews", 
          isPositive: true,
          color: "from-emerald-500/10 to-teal-500/10 text-emerald-600 border-emerald-500/20" 
        }
      ]);

      // Build tables list dynamically
      const updatedTables = qrcodes.map((qr, idx) => {
        const tableOrders = activeOrders.filter(o => o.tableName === qr.tableName && !['Completed', 'Cancelled', 'Served'].includes(o.status));
        let status = "available";
        if (tableOrders.length > 0) {
          status = tableOrders.some(o => o.status === "Ready") ? "billing" : "occupied";
        }
        return {
          id: qr.tableName.replace(/^\D+/g, '') || idx + 1,
          tableName: qr.tableName,
          status,
          capacity: idx % 2 === 0 ? 4 : 2,
          orders: tableOrders.length
        };
      });

      if (updatedTables.length === 0) {
        const fallbackTables = Array.from({ length: 12 }, (_, i) => {
          const tableName = `Table ${i + 1}`;
          const tableOrders = activeOrders.filter(o => o.tableName === tableName && !['Completed', 'Cancelled', 'Served'].includes(o.status));
          let status = "available";
          if (tableOrders.length > 0) {
            status = tableOrders.some(o => o.status === "Ready") ? "billing" : "occupied";
          }
          return {
            id: i + 1,
            tableName,
            status,
            capacity: i % 2 === 0 ? 4 : 2,
            orders: tableOrders.length
          };
        });
        setTables(fallbackTables);
      } else {
        setTables(updatedTables);
      }
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    }
  };

  useEffect(() => {
    if (!loading && restaurant) {
      fetchDashboardData();
      const interval = setInterval(fetchDashboardData, 5000);
      return () => clearInterval(interval);
    }
  }, [loading, restaurant]);

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
    <div className="min-h-screen flex bg-[#F8FAFC] font-sans overflow-hidden">
      {/* Premium Sidebar */}
      <aside className="w-64 bg-[#111827] text-slate-300 flex flex-col justify-between transition-all duration-300 shadow-2xl z-30">
        <div>
          {/* Logo */}
          <div className="p-6 flex items-center gap-3 text-white border-b border-slate-800/50">
            <div className="p-2 bg-gradient-to-br from-[#6C4DFF] to-indigo-600 rounded-xl shadow-lg shadow-indigo-500/30">
              <ChefHat size={24} className="text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">FoodaaS</span>
          </div>
          
          {/* Nav Items */}
          <nav className="px-4 py-6 space-y-1.5">
            <Link 
              to="/dashboard" 
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${
                activeTab === 'dashboard' 
                  ? 'bg-gradient-to-r from-[#6C4DFF] to-[#5235DB] text-white shadow-xl shadow-indigo-500/20' 
                  : 'hover:bg-slate-800/50 hover:text-white text-slate-400'
              }`}
            >
              <div className="flex items-center gap-3">
                <LayoutDashboard size={20} className={activeTab === 'dashboard' ? 'text-white' : 'text-slate-400 group-hover:text-white'} />
                <span className="font-semibold text-sm">Dashboard</span>
              </div>
              {activeTab === 'dashboard' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
            </Link>

            <Link 
              to="/dashboard/menu" 
              onClick={() => setActiveTab('menu')}
              className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${
                activeTab === 'menu' 
                  ? 'bg-gradient-to-r from-[#6C4DFF] to-[#5235DB] text-white shadow-xl' 
                  : 'hover:bg-slate-800/50 hover:text-white text-slate-400'
              }`}
            >
              <div className="flex items-center gap-3">
                <UtensilsCrossed size={20} className="text-slate-400 group-hover:text-white" />
                <span className="font-semibold text-sm">Menu</span>
              </div>
            </Link>

            <Link
              to="/dashboard/orders"
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800/50 hover:text-white text-slate-400 transition-all group"
            >
              <ClipboardList size={20} className="text-slate-400 group-hover:text-white" />
              <span className="font-semibold text-sm">Live Orders</span>
            </Link>

            <a 
              href="#" 
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800/50 hover:text-white text-slate-400 transition-all group"
            >
              <Grid2X2 size={20} className="text-slate-400 group-hover:text-white" />
              <span className="font-semibold text-sm">Table Management</span>
            </a>

            <Link 
              to="/dashboard/qr-codes" 
              onClick={() => setActiveTab('qrcodes')}
              className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${
                activeTab === 'qrcodes' 
                  ? 'bg-gradient-to-r from-[#6C4DFF] to-[#5235DB] text-white shadow-xl shadow-indigo-500/20' 
                  : 'hover:bg-slate-800/50 hover:text-white text-slate-400'
              }`}
            >
              <div className="flex items-center gap-3">
                <QrCode size={20} className={activeTab === 'qrcodes' ? 'text-white' : 'text-slate-400 group-hover:text-white'} />
                <span className="font-semibold text-sm">QR Codes</span>
              </div>
            </Link>

            <a 
              href="#" 
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800/50 hover:text-white text-slate-400 transition-all group"
            >
              <Users size={20} className="text-slate-400 group-hover:text-white" />
              <span className="font-semibold text-sm">Staff Panel</span>
            </a>
          </nav>
        </div>

        {/* Profile Card & Logout */}
        <div className="p-4 border-t border-slate-800/50 space-y-3">
          <div className="flex items-center gap-3 px-3 py-2 bg-slate-800/30 rounded-xl border border-slate-850/50">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#6C4DFF] to-indigo-400 flex items-center justify-center text-white font-bold shadow-md">
              {restaurant?.restaurantName?.charAt(0) || 'O'}
            </div>
            <div className="overflow-hidden">
              <p className="font-semibold text-sm text-white truncate">{restaurant?.restaurantName || 'Osteria Bella'}</p>
              <p className="text-xs text-slate-500 truncate">Store Owner</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-left rounded-xl hover:bg-red-500/10 hover:text-red-400 text-slate-400 transition-all duration-200"
          >
            <LogOut size={20} />
            <span className="font-semibold text-sm">Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 z-20">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome Back, {restaurant?.restaurantName || 'Osteria Bella'}!</h1>
              <p className="text-xs text-slate-400 font-medium">Here's your live restaurant overview for today.</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Search Bar */}
            <div className="relative w-64 hidden md:block">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search orders, tables, items..."
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#6C4DFF]/20 focus:border-[#6C4DFF] transition-all bg-slate-50/50"
              />
            </div>

            {/* Calendar widget */}
            <div className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-600 text-xs font-semibold shadow-sm cursor-pointer hover:bg-slate-50 transition-colors">
              <Calendar size={14} className="text-slate-400" />
              <span>Oct 26, 2023</span>
            </div>

            {/* Notification Badge */}
            <button className="w-10 h-10 border border-slate-200 rounded-xl flex items-center justify-center text-slate-600 bg-white relative hover:bg-slate-50 transition-colors shadow-sm">
              <Bell size={18} />
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-[#6C4DFF] rounded-full ring-2 ring-white"></span>
            </button>
          </div>
        </header>

        {/* Inner Scrollable Workspace */}
        <div className="flex-1 p-8 overflow-y-auto space-y-8 max-w-7xl mx-auto w-full">
          {restaurant?.status && restaurant?.status !== 'active' && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-700 rounded-2xl flex items-start gap-3 animate-in slide-in-from-top duration-300">
              <AlertTriangle className="flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="font-extrabold text-sm capitalize">Plan Inactive / {restaurant?.status}</p>
                <p className="text-xs font-semibold text-amber-600 mt-0.5">
                  Your restaurant's plan is currently {restaurant?.status}. Write operations, order placement, and new QR code generation are blocked. Please renew or contact support to reactivate.
                </p>
              </div>
            </div>
          )}
          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <div 
                key={i} 
                className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] hover:shadow-md transition-all duration-300 relative group overflow-hidden"
              >
                {/* Floating soft background highlight */}
                <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br opacity-5 rounded-full blur-xl group-hover:scale-125 transition-transform duration-500`}></div>
                
                <p className="text-slate-400 text-xs font-bold tracking-wider uppercase mb-2">{stat.title}</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">{stat.value}</h3>
                  <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">{stat.change}</span>
                </div>
                
                <div className="mt-4 flex items-center justify-between text-xs text-slate-400 font-medium">
                  <span>Updated 2 mins ago</span>
                  <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>

          {/* Analytics Wave & Live Orders Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Live Orders Card Column */}
            <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] flex flex-col h-[460px]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">Live Orders</h3>
                <span className="px-2.5 py-1 text-xs font-bold bg-[#6C4DFF]/10 text-[#6C4DFF] rounded-full">{liveOrders.length} Active</span>
              </div>

              {/* Scrollable list */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
                {liveOrders.map((order, i) => (
                  <div key={i} className="p-4 border border-slate-100 rounded-xl hover:border-slate-200 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <span className="font-extrabold text-sm text-slate-800">{order.id}</span>
                        <span className="text-xs font-medium text-slate-400 block">{order.table}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${order.statusColor}`}>
                        {order.status}
                      </span>
                    </div>

                    {/* Order Food List */}
                    <div className="space-y-1.5 border-t border-b border-slate-100/80 py-2.5 my-2.5">
                      {order.items.map((food, fIdx) => (
                        <div key={fIdx} className="flex justify-between text-xs text-slate-600 font-medium">
                          <span>{food.qty}x {food.name}</span>
                          <span className="text-slate-400">{food.price}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-semibold flex items-center gap-1">
                        <Clock size={12} />
                        {order.time}
                      </span>
                      <span className="font-bold text-slate-900">{order.total}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Performance Analytics SVG Curve */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] flex flex-col h-[460px]">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">Restaurant Performance</h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">Real-time daily transaction velocity & revenue curves.</p>
                </div>
                {/* Indicator colors key */}
                <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#6C4DFF]"></span>
                    <span>Revenue</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>Orders</span>
                  </div>
                </div>
              </div>

              {/* Glowing SVG Wave Chart */}
              <div className="flex-1 w-full relative min-h-[250px] mt-4 flex items-end">
                <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6C4DFF" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#6C4DFF" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="emeraldGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Emerald Area/Line */}
                  <path 
                    d="M0,170 C50,150 100,180 150,120 C200,60 250,160 300,130 C350,100 400,140 450,100 C475,80 500,90 500,90 L500,200 L0,200 Z" 
                    fill="url(#emeraldGrad)" 
                  />
                  <path 
                    d="M0,170 C50,150 100,180 150,120 C200,60 250,160 300,130 C350,100 400,140 450,100 C475,80 500,90 500,90" 
                    fill="none" stroke="#10B981" strokeWidth="3" 
                  />

                  {/* Purple Area/Line */}
                  <path 
                    d="M0,150 C50,110 100,130 150,80 C200,30 250,120 300,70 C350,20 400,110 450,60 C475,35 500,45 500,45 L500,200 L0,200 Z" 
                    fill="url(#purpleGrad)" 
                  />
                  <path 
                    d="M0,150 C50,110 100,130 150,80 C200,30 250,120 300,70 C350,20 400,110 450,60 C475,35 500,45 500,45" 
                    fill="none" stroke="#6C4DFF" strokeWidth="3.5" 
                  />
                </svg>

                {/* X Axis labels */}
                <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 text-[10px] text-slate-400 font-bold border-t border-slate-100 pt-2 bg-white">
                  <span>08:00 AM</span>
                  <span>12:00 PM</span>
                  <span>04:00 PM</span>
                  <span>08:00 PM</span>
                  <span>11:00 PM</span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Table Activity & Live Grid Status */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)]">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">Active Table Activity</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Click/view real-time guest status directly from this interactive console map.</p>
              </div>
              
              {/* Legend keys */}
              <div className="flex items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span className="text-slate-500">Available</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                  <span className="text-slate-500">Occupied</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-bounce"></span>
                  <span className="text-slate-500">Requesting Bill</span>
                </div>
              </div>
            </div>

            {/* Table Grid Layout */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-5">
              {tables.map((table, idx) => {
                let statusClasses = "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100/50";
                let statusDot = "bg-emerald-500";
                
                if (table.status === "occupied") {
                  statusClasses = "bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100/50";
                  statusDot = "bg-amber-500 animate-pulse";
                } else if (table.status === "billing") {
                  statusClasses = "bg-red-50 text-red-600 border-red-100 hover:bg-red-100/50";
                  statusDot = "bg-red-500 animate-bounce";
                }

                return (
                  <div 
                    key={idx} 
                    className={`p-4 border rounded-xl flex flex-col justify-between h-28 cursor-pointer transition-all duration-200 shadow-sm ${statusClasses}`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-sm">{table.tableName || `Table ${table.id}`}</span>
                      <span className={`w-2.5 h-2.5 rounded-full ${statusDot}`}></span>
                    </div>
                    
                    <div className="flex flex-col gap-0.5 text-[10px] opacity-80 font-bold">
                      <span>Cap: {table.capacity} Guests</span>
                      <span>{table.orders > 0 ? "1 Active Order" : "No Orders"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
