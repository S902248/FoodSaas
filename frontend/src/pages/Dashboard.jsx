import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { 
  Search, 
  Bell, 
  Calendar,
  TrendingUp,
  Users,
  DollarSign,
  ChevronRight,
  Clock,
  AlertTriangle,
  QrCode,
  Eye,
  ChefHat,
  CheckCircle,
  ListOrdered,
  UserCircle
} from 'lucide-react';

const Dashboard = () => {
  const { restaurant, loading } = useContext(AuthContext);
  const [liveOrders, setLiveOrders] = useState([]);
  const [showExpiredWarning, setShowExpiredWarning] = useState(false);
  const [tables, setTables] = useState([]);
  const [kitchenStats, setKitchenStats] = useState({ preparing: 0, ready: 0, served: 0 });
  const [stats, setStats] = useState([
    { title: "Total Orders", value: "0", change: "+0%", isPositive: true },
    { title: "Active Tables", value: "0", change: "0 / 0", isPositive: true },
    { title: "Revenue", value: "₹0.00", change: "+0%", isPositive: true },
    { title: "Pending Payments", value: "₹0.00", change: "0 orders", isPositive: false }
  ]);

  const mockWaiters = ["Alex M.", "Sarah K.", "John D.", "Emma W."];

  const fetchDashboardData = async () => {
    try {
      const [ordersRes, qrRes] = await Promise.all([
        axios.get('http://localhost:5000/api/orders'),
        axios.get('http://localhost:5000/api/qrcodes')
      ]);

      const allOrders = ordersRes.data;
      const qrcodes = qrRes.data.qrcodes || [];

      const activeOrders = allOrders.filter(o => !['Completed', 'Cancelled'].includes(o.status));
      
      // Kitchen Stats
      let prep = 0, ready = 0, served = 0;
      activeOrders.forEach(o => {
        if (o.status === 'Preparing') prep++;
        if (o.status === 'Ready') ready++;
        if (o.status === 'Served') served++;
      });
      setKitchenStats({ preparing: prep, ready, served });

      // Live Orders mapping
      const mappedOrders = activeOrders.map(o => {
        return {
          id: o.orderId,
          table: o.tableName,
          itemsCount: o.items.reduce((sum, item) => sum + item.quantity, 0),
          status: o.status,
          paymentStatus: o.paymentStatus || 'Pending',
          total: `₹${o.totalAmount.toFixed(2)}`,
          time: `${Math.max(1, Math.round((Date.now() - new Date(o.createdAt).getTime()) / 60000))}m ago`
        };
      });
      setLiveOrders(mappedOrders);

      // Compute stats
      const totalRevenue = allOrders
        .filter(o => !['Cancelled'].includes(o.status))
        .reduce((sum, o) => sum + o.totalAmount, 0);

      const pendingRevenue = allOrders
        .filter(o => o.paymentStatus !== 'Completed' && !['Cancelled'].includes(o.status))
        .reduce((sum, o) => sum + o.totalAmount, 0);
      
      const occupiedTablesCount = new Set(
        activeOrders.filter(o => o.status !== 'Served').map(o => o.tableName)
      ).size;
      const totalTablesCount = qrcodes.length || 12;

      setStats([
        { 
          title: "Total Orders", 
          value: String(allOrders.filter(o => o.status !== 'Cancelled').length), 
          change: `Today`, 
          isPositive: true
        },
        { 
          title: "Active Tables", 
          value: String(occupiedTablesCount), 
          change: `${occupiedTablesCount}/${totalTablesCount} Occupied`, 
          isPositive: true
        },
        { 
          title: "Revenue", 
          value: `₹${totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, 
          change: `Today`, 
          isPositive: true
        },
        { 
          title: "Pending Payments", 
          value: `₹${pendingRevenue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, 
          change: `Action Needed`, 
          isPositive: false
        }
      ]);

      // Build tables list dynamically
      const buildTables = (qrList) => {
        return qrList.map((qr, idx) => {
          const tableOrders = activeOrders.filter(o => o.tableName === qr.tableName && o.status !== 'Served');
          
          let status = "Available";
          let totalBill = 0;
          let itemsCount = 0;
          let timeOccupied = "-";

          if (tableOrders.length > 0) {
            status = "Occupied";
            totalBill = tableOrders.reduce((sum, o) => sum + o.totalAmount, 0);
            itemsCount = tableOrders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0);
            const oldestOrder = new Date(Math.min(...tableOrders.map(o => new Date(o.createdAt).getTime())));
            timeOccupied = `${Math.max(1, Math.round((Date.now() - oldestOrder.getTime()) / 60000))}m`;
          }

          // Randomize some statuses to show Reserved/Cleaning for the UI demo based on ID if no active orders
          if (status === "Available") {
             if (idx % 7 === 0) status = "Reserved";
             else if (idx % 5 === 0) status = "Cleaning";
          }

          return {
            id: qr.tableName.replace(/^\D+/g, '') || idx + 1,
            tableName: qr.tableName,
            status,
            capacity: idx % 2 === 0 ? 4 : 2,
            orders: tableOrders.length,
            itemsCount,
            totalBill,
            timeOccupied,
            waiter: mockWaiters[idx % mockWaiters.length]
          };
        });
      };

      if (qrcodes.length === 0) {
        const fallbackQRs = Array.from({ length: 12 }, (_, i) => ({ tableName: `Table ${i + 1}` }));
        setTables(buildTables(fallbackQRs));
      } else {
        setTables(buildTables(qrcodes));
      }

    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    }
  };

  useEffect(() => {
    if (!loading && restaurant) {
      fetchDashboardData();
      const interval = setInterval(fetchDashboardData, 5000);
      
      let warnInterval;
      if (restaurant.status === 'expired' || (restaurant.subscriptionExpiry && new Date(restaurant.subscriptionExpiry) < new Date())) {
        warnInterval = setInterval(() => {
          setShowExpiredWarning(true);
        }, 60000); // every minute
        setShowExpiredWarning(true); // Show immediately on load too
      }
      
      return () => {
        clearInterval(interval);
        if (warnInterval) clearInterval(warnInterval);
      };
    }
  }, [loading, restaurant]);

  // Color mappings
  const getStatusColor = (status) => {
    switch(status) {
      case 'Available': return 'bg-emerald-500';
      case 'Occupied': return 'bg-rose-500';
      case 'Reserved': return 'bg-amber-500';
      case 'Cleaning': return 'bg-slate-400';
      default: return 'bg-emerald-500';
    }
  };

  const getStatusTextClasses = (status) => {
    switch(status) {
      case 'Available': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'Occupied': return 'text-rose-700 bg-rose-50 border-rose-200';
      case 'Reserved': return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'Cleaning': return 'text-slate-700 bg-slate-50 border-slate-200';
      default: return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    }
  };

  return (
    <div className="bg-[#f8f9fa] min-h-screen text-slate-800 font-sans relative">
      
      {/* Expiration Warning Modal */}
      {showExpiredWarning && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full border border-red-100 text-center animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={40} className="text-red-500" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-3">Subscription Expired</h2>
            <p className="text-slate-500 font-medium mb-8">
              Your restaurant's subscription plan has expired. Operations are currently restricted. Please contact the administrator to extend your plan.
            </p>
            <button 
              onClick={() => setShowExpiredWarning(false)}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-red-500/30 transition-all active:scale-[0.98]"
            >
              Dismiss Warning
            </button>
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-20 sticky top-0 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white font-bold shadow-lg shadow-orange-500/30">
              {restaurant?.restaurantName?.charAt(0) || 'R'}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">{restaurant?.restaurantName || 'Restaurant'}</h1>
              <p className="text-xs text-slate-500 font-medium">Dashboard Overview</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Today's Sales Summary */}
          <div className="hidden lg:flex items-center gap-3 px-4 py-2 bg-orange-50 rounded-xl border border-orange-100">
            <TrendingUp size={18} className="text-orange-500" />
            <div>
              <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">Today's Sales</p>
              <p className="text-sm font-extrabold text-slate-900">{stats[2].value}</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative w-64 hidden md:block">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all bg-slate-50 hover:bg-white"
            />
          </div>

          <button className="relative p-2.5 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">
            <Bell size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full ring-2 ring-white"></span>
          </button>

          <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
             <div className="text-right hidden sm:block">
               <p className="text-sm font-bold text-slate-900">Admin User</p>
               <p className="text-xs text-slate-500">Manager</p>
             </div>
             <UserCircle size={36} className="text-slate-400" />
          </div>
        </div>
      </header>

      <div className="p-8 max-w-[1600px] mx-auto space-y-8">
        
        {/* Live Restaurant Analytics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl group-hover:bg-orange-500/10 transition-colors"></div>
              <p className="text-slate-500 text-sm font-semibold mb-2">{stat.title}</p>
              <h3 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">{stat.value}</h3>
              <div className="flex items-center text-xs font-medium text-slate-500">
                <span className={`px-2 py-1 rounded-md mr-2 ${stat.isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                  {stat.change}
                </span>
                <span>vs yesterday</span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Left Column */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Table Management Section */}
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Table Management</h2>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/30"></div><span className="text-xs font-semibold text-slate-600">Available</span></div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-rose-500 shadow-sm shadow-rose-500/30"></div><span className="text-xs font-semibold text-slate-600">Occupied</span></div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500 shadow-sm shadow-amber-500/30"></div><span className="text-xs font-semibold text-slate-600">Reserved</span></div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-slate-400 shadow-sm shadow-slate-400/30"></div><span className="text-xs font-semibold text-slate-600">Cleaning</span></div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {tables.map((table, idx) => (
                  <div key={idx} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group">
                    <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 group-hover:bg-white transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md ${getStatusColor(table.status)}`}>
                          T{table.id}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900">{table.tableName}</h4>
                          <p className="text-xs text-slate-500 font-medium">Cap: {table.capacity} pax</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusTextClasses(table.status)}`}>
                        {table.status}
                      </span>
                    </div>

                    <div className="p-5 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Time</p>
                          <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5"><Clock size={14} className="text-slate-400"/> {table.timeOccupied}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Items</p>
                          <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5"><ListOrdered size={14} className="text-slate-400"/> {table.itemsCount}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Total Bill</p>
                          <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5"><DollarSign size={14} className="text-orange-500"/> ₹{table.totalBill.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Waiter</p>
                          <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5"><UserCircle size={14} className="text-slate-400"/> {table.waiter}</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-3 pt-2">
                        <button className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
                          <QrCode size={16} /> QR
                        </button>
                        <button className="flex-1 bg-black hover:bg-slate-800 text-white py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors shadow-md">
                          <Eye size={16} /> Details
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Orders Section */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Recent Orders</h2>
                <button className="text-orange-500 hover:text-orange-600 text-sm font-semibold flex items-center gap-1">
                  View All <ChevronRight size={16} />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wider font-bold">
                      <th className="p-4 pl-6">Order ID</th>
                      <th className="p-4">Table</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Payment</th>
                      <th className="p-4 pr-6">Progress</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {liveOrders.slice(0, 5).map((order, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 pl-6 font-bold text-slate-900 text-sm">#{order.id.substring(0, 8)}</td>
                        <td className="p-4 text-sm font-medium text-slate-600">{order.table}</td>
                        <td className="p-4 text-sm font-bold text-slate-900">{order.total}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            order.paymentStatus === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'
                          }`}>
                            {order.paymentStatus}
                          </span>
                        </td>
                        <td className="p-4 pr-6">
                           <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            order.status === 'Ready' ? 'bg-emerald-50 text-emerald-600' : 
                            order.status === 'Preparing' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {liveOrders.length === 0 && (
                      <tr>
                        <td colSpan="5" className="p-8 text-center text-slate-500 font-medium">No recent orders found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Right Column */}
          <div className="space-y-8">
            
            {/* Kitchen Status Panel */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                  <ChefHat className="text-orange-500" size={24} />
                </div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Kitchen Status</h2>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                    <span className="font-semibold text-slate-700">Preparing</span>
                  </div>
                  <span className="text-2xl font-black text-slate-900">{kitchenStats.preparing}</span>
                </div>
                
                <div className="p-4 rounded-xl border border-slate-100 bg-emerald-50/50 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="font-semibold text-emerald-800">Ready for Pickup</span>
                  </div>
                  <span className="text-2xl font-black text-emerald-700">{kitchenStats.ready}</span>
                </div>
                
                <div className="p-4 rounded-xl border border-slate-100 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="text-slate-400" size={16} />
                    <span className="font-semibold text-slate-600">Served Today</span>
                  </div>
                  <span className="text-xl font-bold text-slate-800">{kitchenStats.served}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions (Optional addition for SaaS feel) */}
            <div className="bg-gradient-to-br from-black to-slate-800 rounded-2xl shadow-xl p-6 text-white relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
               <h3 className="text-lg font-bold mb-2">Need Help?</h3>
               <p className="text-slate-300 text-sm mb-6">Get 24/7 support for your restaurant operations.</p>
               <button className="w-full bg-white text-black py-3 rounded-xl font-bold text-sm hover:bg-slate-100 transition-colors shadow-lg">
                 Contact Support
               </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
