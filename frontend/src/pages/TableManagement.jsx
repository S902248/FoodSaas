import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { 
  Clock, 
  ListOrdered, 
  UserCircle,
  TrendingUp,
  Armchair,
  CheckCircle2,
  AlertCircle,
  Plus,
  Pencil
} from 'lucide-react';

const TableManagement = () => {
  const { restaurant, loading } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [tables, setTables] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedActionTable, setSelectedActionTable] = useState(null);
  const [actionError, setActionError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingQrId, setEditingQrId] = useState(null);
  const [newTable, setNewTable] = useState({ tableName: '', capacity: 4 });
  const [tableError, setTableError] = useState('');
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [metrics, setMetrics] = useState({
    total: 0,
    available: 0,
    occupied: 0,
    revenueToday: 0
  });

  const fetchData = async () => {
    if (!restaurant) return;
    try {
      const [ordersRes, qrRes] = await Promise.all([
        axios.get('http://localhost:5000/api/orders', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get('http://localhost:5000/api/qrcodes', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      const allOrders = ordersRes.data;
      const qrcodes = qrRes.data.qrcodes || [];

      // Calculate Revenue Today (sum of all completed orders today)
      // Assuming today's orders can be filtered by createdAt
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const revenueToday = allOrders
        .filter(o => o.status === 'Completed' && new Date(o.createdAt) >= today)
        .reduce((sum, o) => sum + o.totalAmount, 0);

      const currentActiveOrders = allOrders.filter(o => !['Completed', 'Cancelled', 'Served'].includes(o.status));

      const buildTables = (qrList) => {
        return qrList.map((qr, idx) => {
          const tableOrders = currentActiveOrders.filter(o => o.tableName === qr.tableName);
          
          let status = "Available";
          if (qr.isReserved) status = "Reserved";

          let totalBill = 0;
          let itemsCount = 0;
          let timeOccupied = "-";
          let occupiedSince = null;
          
          if (tableOrders.length > 0) {
            // Determine status based on latest order or combined logic
            // For now, if there's any active order, it's Occupied
            status = "Occupied"; 
            
            // Check specific statuses if needed
            const hasPreparing = tableOrders.some(o => o.status === 'Preparing');
            const hasReady = tableOrders.some(o => o.status === 'Ready');
            if (hasPreparing) status = "Preparing";
            else if (hasReady) status = "Served";
            else status = "Ordered";

            totalBill = tableOrders.reduce((sum, o) => sum + o.totalAmount, 0);
            
            tableOrders.forEach(o => {
               o.items.forEach(item => {
                 itemsCount += item.quantity;
               });
            });
            
            const oldestOrder = new Date(Math.min(...tableOrders.map(o => new Date(o.createdAt).getTime())));
            occupiedSince = oldestOrder.getTime();
            const diffMs = Date.now() - oldestOrder.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const hours = Math.floor(diffMins / 60);
            const mins = diffMins % 60;
            timeOccupied = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
          }

          return {
            id: qr.tableName.replace(/^\D+/g, '') || (idx + 1).toString(),
            qrId: qr._id,
            tableName: qr.tableName,
            status,
            capacity: qr.capacity || 4,
            itemsCount,
            totalBill,
            timeOccupied,
            occupiedSince
          };
        });
      };

      let tableData = [];
      if (qrcodes.length === 0) {
        const fallbackQRs = Array.from({ length: 12 }, (_, i) => ({ tableName: `Table ${i + 1}` }));
        tableData = buildTables(fallbackQRs);
      } else {
        tableData = buildTables(qrcodes);
      }
      
      setTables(tableData);
      
      // Update Metrics
      setMetrics({
        total: tableData.length,
        available: tableData.filter(t => t.status === 'Available').length,
        occupied: tableData.filter(t => t.status !== 'Available' && t.status !== 'Reserved').length,
        revenueToday
      });

    } catch (err) {
      console.error("Error fetching table data:", err);
    }
  };

  useEffect(() => {
    if (!loading && restaurant) {
      fetchData();
      const interval = setInterval(fetchData, 10000); 

      // Socket.io real-time updates
      const socket = io('http://localhost:5000');
      socket.emit('joinRestaurantRoom', restaurant._id);
      
      socket.on('orders_updated', () => {
        fetchData();
      });

      return () => {
        clearInterval(interval);
        socket.disconnect();
      };
    }
  }, [loading, restaurant]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSaveTable = async (e) => {
    e.preventDefault();
    setTableError('');

    // Check if table already exists
    const exists = tables.some(t => 
      t.tableName.toLowerCase() === newTable.tableName.trim().toLowerCase() && 
      t.qrId !== editingQrId
    );
    if (exists) {
      setTableError(`"${newTable.tableName}" already exists. Please choose a different name.`);
      return;
    }

    try {
      const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
      
      if (isEditing && editingQrId) {
        await axios.put(`http://localhost:5000/api/qrcodes/${editingQrId}`, {
          tableName: newTable.tableName.trim(),
          capacity: newTable.capacity
        }, config);
      } else {
        await axios.post('http://localhost:5000/api/qrcodes', {
          tableName: newTable.tableName.trim(),
          capacity: newTable.capacity,
          section: 'Main',
          status: 'active'
        }, config);
      }
      
      setShowModal(false);
      setIsEditing(false);
      setEditingQrId(null);
      setNewTable({ tableName: '', capacity: 4 });
      fetchData();
    } catch (err) {
      setTableError(err.response?.data?.message || 'Error saving table');
    }
  };

  const handleTableClick = (table) => {
    setSelectedActionTable(table);
    setShowActionModal(true);
    setActionError('');
  };

  const handleReserveToggle = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
      await axios.put(`http://localhost:5000/api/qrcodes/${selectedActionTable.qrId}/reserve`, {}, config);
      setShowActionModal(false);
      fetchData();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Error toggling reserve status');
    }
  };

  const handleCheckout = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
      await axios.put(`http://localhost:5000/api/orders/table/${selectedActionTable.tableName}/checkout`, {}, config);
      setShowActionModal(false);
      fetchData();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Error checking out table');
    }
  };

  const getStatusConfig = (status) => {
    switch(status) {
      case 'Available': return { bg: 'bg-emerald-500', text: 'text-emerald-700', badge: 'bg-emerald-50 border-emerald-200' };
      case 'Reserved': return { bg: 'bg-purple-500', text: 'text-purple-700', badge: 'bg-purple-50 border-purple-200' };
      case 'Ordered': return { bg: 'bg-yellow-500', text: 'text-yellow-700', badge: 'bg-yellow-50 border-yellow-200' };
      case 'Preparing': return { bg: 'bg-amber-500', text: 'text-amber-700', badge: 'bg-amber-50 border-amber-200' };
      case 'Served': return { bg: 'bg-blue-500', text: 'text-blue-700', badge: 'bg-blue-50 border-blue-200' };
      case 'Payment Pending': return { bg: 'bg-rose-500', text: 'text-rose-700', badge: 'bg-rose-50 border-rose-200' };
      default: return { bg: 'bg-indigo-500', text: 'text-indigo-700', badge: 'bg-indigo-50 border-indigo-200' };
    }
  };

  return (
    <div className="bg-[#f8f9fa] min-h-screen p-8 text-slate-800 font-sans">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Table Dashboard</h1>
          <p className="text-slate-500 mt-1">Manage tables and take orders directly</p>
        </div>
        <button 
          onClick={() => { setShowModal(true); setIsEditing(false); setEditingQrId(null); setTableError(''); setNewTable({ tableName: '', capacity: 4 }); }}
          className="flex items-center px-5 py-2.5 bg-[#6C4DFF] hover:bg-indigo-700 text-white rounded-xl shadow-md font-bold transition-all text-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Table
        </button>
      </header>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-[#6C4DFF] flex items-center justify-center">
            <Armchair size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Total Tables</p>
            <p className="text-2xl font-black text-slate-900">{metrics.total}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Available</p>
            <p className="text-2xl font-black text-slate-900">{metrics.available}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Occupied</p>
            <p className="text-2xl font-black text-slate-900">{metrics.occupied}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Revenue Today</p>
            <p className="text-2xl font-black text-emerald-600">₹{metrics.revenueToday.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Table Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {tables.map((table, idx) => {
          const config = getStatusConfig(table.status);
          const isOccupied = table.status !== 'Available' && table.status !== 'Reserved';
          
          return (
            <div 
              key={idx} 
              onClick={() => handleTableClick(table)}
              className={`bg-white rounded-3xl border p-5 transition-all duration-300 cursor-pointer group hover:-translate-y-1 hover:shadow-lg
                ${isOccupied ? 'border-indigo-100 shadow-md' : 'border-slate-200 shadow-sm'}
              `}
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-sm
                  ${isOccupied ? 'bg-[#6C4DFF] text-white shadow-indigo-200' : 'bg-slate-100 text-slate-500'}
                `}>
                  {table.id}
                </div>
                <div className="flex items-center gap-2">
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${config.badge}`}>
                    <div className={`w-2 h-2 rounded-full ${config.bg} ${isOccupied ? 'animate-pulse' : ''}`}></div>
                    <span className={`text-[9px] font-bold uppercase tracking-wider ${config.text}`}>
                      {table.status}
                    </span>
                  </div>
                  {table.qrId && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setNewTable({ tableName: table.tableName, capacity: table.capacity });
                        setEditingQrId(table.qrId);
                        setIsEditing(true);
                        setTableError('');
                        setShowModal(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-[#6C4DFF] hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Edit Table"
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <h4 className="font-bold text-slate-900 text-lg leading-tight mb-1">{table.tableName}</h4>
                <div className="flex items-center gap-1.5">
                  <UserCircle size={14} className="text-slate-400"/>
                  <span className="text-xs text-slate-500 font-medium">{table.capacity} Seats</span>
                </div>
              </div>
              
              <div className="h-[1px] w-full bg-slate-100 mb-4"></div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1 text-slate-400">
                    <Clock size={12} />
                    <span className="text-[9px] font-bold uppercase tracking-wider">Time</span>
                  </div>
                  <span className={`text-xs font-bold ${isOccupied ? 'text-slate-900' : 'text-slate-300'}`}>
                    {table.occupiedSince ? (() => {
                       const diffSecs = Math.floor((currentTime - table.occupiedSince) / 1000);
                       const hours = Math.floor(diffSecs / 3600);
                       const mins = Math.floor((diffSecs % 3600) / 60);
                       const secs = diffSecs % 60;
                       if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
                       return `${mins}m ${secs}s`;
                    })() : '-'}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1 text-slate-400">
                    <ListOrdered size={12} />
                    <span className="text-[9px] font-bold uppercase tracking-wider">Items</span>
                  </div>
                  <span className={`text-xs font-bold ${isOccupied ? 'text-slate-900' : 'text-slate-300'}`}>
                    {isOccupied ? table.itemsCount : '-'}
                  </span>
                </div>
              </div>
              
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100 group-hover:border-indigo-100 transition-colors">
                 <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Bill</span>
                 <span className={`text-base font-black tracking-tight ${isOccupied ? 'text-emerald-600' : 'text-slate-300'}`}>
                   ₹{isOccupied ? table.totalBill.toFixed(2) : '0.00'}
                 </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add/Edit Table Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100">
            <h2 className="text-lg font-extrabold text-slate-900 mb-4">{isEditing ? 'Edit Table' : 'Add New Table'}</h2>
            <form onSubmit={handleSaveTable}>
              <div className="space-y-4">
                {tableError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 font-medium flex items-start gap-2">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{tableError}</span>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-slate-500 tracking-wider uppercase mb-1.5">Table Name / Number</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Table 15"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-[#6C4DFF]/20 focus:border-[#6C4DFF] transition-all outline-none text-sm bg-slate-50/30"
                    value={newTable.tableName}
                    onChange={e => setNewTable({...newTable, tableName: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 tracking-wider uppercase mb-1.5">Seating Capacity</label>
                  <input 
                    type="number" 
                    min="1"
                    required 
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-[#6C4DFF]/20 focus:border-[#6C4DFF] transition-all outline-none text-sm bg-slate-50/30"
                    value={newTable.capacity}
                    onChange={e => setNewTable({...newTable, capacity: parseInt(e.target.value)})}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6 border-t border-slate-100 pt-4">
                <button 
                  type="button" 
                  onClick={() => { setShowModal(false); setIsEditing(false); setEditingQrId(null); setTableError(''); }}
                  className="flex-1 px-4 py-3 rounded-2xl border border-slate-250 text-slate-700 font-bold hover:bg-slate-50 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-3 rounded-2xl bg-[#6C4DFF] text-white font-bold hover:bg-indigo-700 shadow-lg shadow-[#6C4DFF]/20 transition-all text-sm"
                >
                  {isEditing ? 'Save Changes' : 'Save Table'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table Actions Modal */}
      {showActionModal && selectedActionTable && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100">
            <h2 className="text-xl font-extrabold text-slate-900 mb-2">{selectedActionTable.tableName}</h2>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6">Status: {selectedActionTable.status}</p>
            
            <div className="space-y-3">
              {actionError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 font-medium flex items-start gap-2">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}
              
              <button 
                onClick={() => navigate(`/dashboard/tables/${selectedActionTable.id}`)}
                className="w-full px-4 py-3 rounded-2xl bg-[#6C4DFF] text-white font-bold hover:bg-indigo-700 shadow-lg shadow-[#6C4DFF]/20 transition-all text-sm"
              >
                Book / View Orders
              </button>

              <button 
                onClick={handleReserveToggle}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors text-sm"
              >
                {selectedActionTable.status === 'Reserved' ? 'Cancel Reservation' : 'Reserve Table'}
              </button>

              {(selectedActionTable.status !== 'Available' && selectedActionTable.status !== 'Reserved') && (
                <button 
                  onClick={handleCheckout}
                  className="w-full px-4 py-3 rounded-2xl bg-emerald-100 text-emerald-700 font-bold hover:bg-emerald-200 transition-colors text-sm"
                >
                  Complete Payment & Leave
                </button>
              )}
              
              <button 
                onClick={() => setShowActionModal(false)}
                className="w-full px-4 py-3 rounded-2xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-colors text-sm mt-4"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableManagement;
