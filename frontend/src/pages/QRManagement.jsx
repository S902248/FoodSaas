import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  ChefHat, 
  QrCode, Plus, Download, Search, Filter, 
  Trash2, Copy, RefreshCw, Check, Clock, ClipboardList, AlertTriangle
} from 'lucide-react';

const QRManagement = () => {
  const { token, restaurant, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [qrcodes, setQrcodes] = useState([]);
  const [stats, setStats] = useState({ totalQRCodes: 0, activeTables: 0, dailyScans: 0, totalOrdersViaQR: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  
  const [currentQR, setCurrentQR] = useState(null);
  const [formData, setFormData] = useState({ tableName: '', section: 'Main', status: 'active' });
  const [bulkData, setBulkData] = useState({ prefix: 'Table', startNumber: 1, count: 5, section: 'Main' });

  const qrRef = useRef();

  useEffect(() => {
    fetchQRCodes();
  }, []);

  const fetchQRCodes = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get('http://localhost:5000/api/qrcodes', config);
      setQrcodes(res.data.qrcodes);
      setStats(res.data.stats);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };




  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post('http://localhost:5000/api/qrcodes', formData, config);
      setShowCreateModal(false);
      setFormData({ tableName: '', section: 'Main', status: 'active' });
      fetchQRCodes();
    } catch (err) {
      alert(err.response?.data?.message || 'Error creating QR code');
    }
  };

  const handleBulkCreate = async (e) => {
    e.preventDefault();
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post('http://localhost:5000/api/qrcodes/bulk', bulkData, config);
      setShowBulkModal(false);
      fetchQRCodes();
    } catch (err) {
      alert(err.response?.data?.message || 'Error creating bulk QR codes');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this QR code?')) {
      try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        await axios.delete(`http://localhost:5000/api/qrcodes/${id}`, config);
        fetchQRCodes();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleDownloadPNG = (id, tableName) => {
    const svg = document.getElementById(`qr-${id}`);
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `QR_${tableName}.png`;
      downloadLink.href = `${pngFile}`;
      downloadLink.click();
    };
    
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const handleDownloadPDF = async () => {
    if (!qrRef.current || !currentQR) return;
    
    const canvas = await html2canvas(qrRef.current);
    const imgData = canvas.toDataURL('image/png');
    
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Add branding
    pdf.setFontSize(24);
    pdf.text(restaurant?.restaurantName || 'FoodaaS Restaurant', 105, 30, { align: 'center' });
    pdf.setFontSize(16);
    pdf.text(`Table: ${currentQR.tableName}`, 105, 45, { align: 'center' });
    
    // Add QR Code
    pdf.addImage(imgData, 'PNG', 55, 60, 100, 100);
    
    pdf.setFontSize(14);
    pdf.text('Scan to View Menu & Order', 105, 180, { align: 'center' });
    
    pdf.save(`QR_${currentQR.tableName}.pdf`);
  };

  const copyLink = (url) => {
    navigator.clipboard.writeText(url);
    alert('Link copied to clipboard!');
  };

  const filteredQRCodes = qrcodes.filter(qr => 
    qr.tableName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    qr.section.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-[#6C4DFF] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Loading QR Engine...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Main Panel Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 z-20 shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">QR Code Management</h1>
            <p className="text-xs text-slate-400 font-medium">Create, manage and monitor your live ordering touchpoints.</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => {
                if (restaurant?.status && restaurant?.status !== 'active') {
                  alert(`Your plan is currently ${restaurant?.status}. Bulk QR generation is disabled.`);
                  return;
                }
                setShowBulkModal(true);
              }}
              disabled={restaurant?.status && restaurant?.status !== 'active'}
              className="flex items-center px-4 py-2 border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 disabled:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400 transition-colors text-sm rounded-xl"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Bulk Generate
            </button>
            <button 
              onClick={() => {
                if (restaurant?.status && restaurant?.status !== 'active') {
                  alert(`Your plan is currently ${restaurant?.status}. Creating QR Code is disabled.`);
                  return;
                }
                setShowCreateModal(true);
              }}
              disabled={restaurant?.status && restaurant?.status !== 'active'}
              className="flex items-center px-5 py-2.5 bg-[#6C4DFF] hover:bg-indigo-700 disabled:bg-slate-350 disabled:cursor-not-allowed text-white rounded-xl shadow-md font-bold transition-all text-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create QR Code
            </button>
          </div>
        </header>

        {/* Workspace */}
        <div className="flex-1 p-8 overflow-y-auto space-y-8 max-w-7xl mx-auto w-full">
          {restaurant?.status && restaurant?.status !== 'active' && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-700 rounded-2xl flex items-start gap-3 animate-in slide-in-from-top duration-300">
              <AlertTriangle className="flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="font-extrabold text-sm capitalize">Plan Inactive / {restaurant?.status}</p>
                <p className="text-xs font-semibold text-amber-600 mt-0.5">
                  Your restaurant's plan is currently {restaurant?.status}. Write operations, order placement, and generating new QR codes are disabled. Please renew or contact support to reactivate.
                </p>
              </div>
            </div>
          )}
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { title: 'Total QR Codes', value: stats.totalQRCodes, icon: QrCode, color: 'bg-blue-50 text-blue-600 border-blue-100' },
              { title: 'Active Tables', value: stats.activeTables, icon: Check, color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
              { title: 'Daily QR Scans', value: stats.dailyScans, icon: Clock, color: 'bg-purple-50 text-purple-600 border-purple-100' },
              { title: 'Orders via QR', value: stats.totalOrdersViaQR, icon: ClipboardList, color: 'bg-amber-50 text-amber-600 border-amber-100' },
            ].map((stat, idx) => (
              <div key={idx} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300 relative group overflow-hidden">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-slate-400 text-xs font-bold tracking-wider uppercase mb-2">{stat.title}</p>
                    <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">{stat.value}</h3>
                  </div>
                  <div className={`p-3 rounded-xl border ${stat.color}`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* QR Code Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="p-5 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <div className="relative w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text"
                  placeholder="Search table name or section..."
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#6C4DFF]/20 focus:border-[#6C4DFF] transition-all bg-white"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button className="flex items-center px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm bg-white">
                <Filter className="w-4 h-4 mr-2 text-slate-400" />
                Filter
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-500 text-sm">
                    <th className="px-6 py-4 font-medium">QR Preview</th>
                    <th className="px-6 py-4 font-medium">Table Info</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Total Scans</th>
                    <th className="px-6 py-4 font-medium">Last Scanned</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQRCodes.map(qr => (
                    <tr key={qr._id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div 
                          className="bg-white p-2 rounded-xl border border-slate-150 cursor-pointer hover:shadow-md transition w-max shadow-sm"
                          onClick={() => { setCurrentQR(qr); setShowPreviewModal(true); }}
                        >
                          <QRCodeSVG id={`qr-${qr._id}`} value={qr.url} size={48} />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 text-base">{qr.tableName}</div>
                        <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Section: {qr.section}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          qr.status === 'active' 
                            ? 'bg-emerald-500/10 text-emerald-600' 
                            : 'bg-red-500/10 text-red-600'
                        }`}>
                          {qr.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-700">{qr.totalScans}</td>
                      <td className="px-6 py-4 text-sm text-slate-400 font-medium">
                        {qr.lastScanned ? new Date(qr.lastScanned).toLocaleString() : 'Never Scanned'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <a 
                            href={`/scan/${qr._id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Simulate Scan & Order"
                          >
                            <QrCode className="w-5 h-5" />
                          </a>
                          <button 
                            onClick={() => copyLink(qr.url)}
                            className="p-2 text-slate-400 hover:text-[#6C4DFF] hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Copy customer ordering link"
                          >
                            <Copy className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => handleDownloadPNG(qr._id, qr.tableName)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Download PNG"
                          >
                            <Download className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => {
                              if (restaurant?.status && restaurant?.status !== 'active') {
                                alert(`Your plan is currently ${restaurant?.status}. Deleting QR Code is disabled.`);
                                return;
                              }
                              handleDelete(qr._id);
                            }}
                            disabled={restaurant?.status && restaurant?.status !== 'active'}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors"
                            title="Delete QR"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredQRCodes.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-slate-400 font-medium">
                        No QR codes found. Create one above to get started!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100">
            <h2 className="text-lg font-extrabold text-slate-900 mb-4">Create New QR Code</h2>
            <form onSubmit={handleCreate}>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 tracking-wider uppercase mb-1.5">Table Name / Number</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Table 15"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-[#6C4DFF]/20 focus:border-[#6C4DFF] transition-all outline-none text-sm bg-slate-50/30"
                    value={formData.tableName}
                    onChange={e => setFormData({...formData, tableName: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 tracking-wider uppercase mb-1.5">Dining Area / Section</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Main Floor, Terrace, Patio"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-[#6C4DFF]/20 focus:border-[#6C4DFF] transition-all outline-none text-sm bg-slate-50/30"
                    value={formData.section}
                    onChange={e => setFormData({...formData, section: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 tracking-wider uppercase mb-1.5">Status</label>
                  <select 
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-[#6C4DFF]/20 focus:border-[#6C4DFF] transition-all outline-none text-sm bg-slate-50/30"
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="active">Active (Available for ordering)</option>
                    <option value="inactive">Inactive (Ordering disabled)</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6 border-t border-slate-100 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-3 rounded-2xl border border-slate-250 text-slate-750 font-bold hover:bg-slate-50 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-3 rounded-2xl bg-[#6C4DFF] text-white font-bold hover:bg-indigo-700 shadow-lg shadow-[#6C4DFF]/20 transition-all text-sm"
                >
                  Generate QR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Create Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100">
            <h2 className="text-lg font-extrabold text-slate-900 mb-4">Bulk Generate QR Codes</h2>
            <form onSubmit={handleBulkCreate}>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 tracking-wider uppercase mb-1.5">Prefix Name</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Table"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-[#6C4DFF]/20 focus:border-[#6C4DFF] transition-all outline-none text-sm bg-slate-50/30"
                    value={bulkData.prefix}
                    onChange={e => setBulkData({...bulkData, prefix: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 tracking-wider uppercase mb-1.5">Start Number</label>
                    <input 
                      type="number" 
                      min="1"
                      required 
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-[#6C4DFF]/20 focus:border-[#6C4DFF] transition-all outline-none text-sm bg-slate-50/30"
                      value={bulkData.startNumber}
                      onChange={e => setBulkData({...bulkData, startNumber: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 tracking-wider uppercase mb-1.5">Count</label>
                    <input 
                      type="number" 
                      min="1" max="50"
                      required 
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-[#6C4DFF]/20 focus:border-[#6C4DFF] transition-all outline-none text-sm bg-slate-50/30"
                      value={bulkData.count}
                      onChange={e => setBulkData({...bulkData, count: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 tracking-wider uppercase mb-1.5">Dining Area / Section</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Main Hall, Patio"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-[#6C4DFF]/20 focus:border-[#6C4DFF] transition-all outline-none text-sm bg-slate-50/30"
                    value={bulkData.section}
                    onChange={e => setBulkData({...bulkData, section: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6 border-t border-slate-100 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowBulkModal(false)}
                  className="flex-1 px-4 py-3 rounded-2xl border border-slate-250 text-slate-750 font-bold hover:bg-slate-50 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-3 rounded-2xl bg-[#6C4DFF] text-white font-bold hover:bg-indigo-700 shadow-lg shadow-[#6C4DFF]/20 transition-all text-sm"
                >
                  Generate {bulkData.count} QRs
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && currentQR && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden border border-slate-100">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50/50">
              <h2 className="font-extrabold text-slate-900 text-lg">QR Preview Card</h2>
              <button onClick={() => setShowPreviewModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            
            <div className="p-8 flex flex-col items-center">
              {/* Card capture wrapper */}
              <div ref={qrRef} className="bg-white p-6 rounded-2xl border-2 border-slate-100 flex flex-col items-center w-full shadow-sm">
                <div className="p-2 bg-gradient-to-br from-[#6C4DFF] to-indigo-600 rounded-xl shadow-lg mb-3">
                  <ChefHat size={20} className="text-white" />
                </div>
                <h3 className="text-lg font-extrabold text-slate-900">{restaurant?.restaurantName || 'Foodaas'}</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-6">{currentQR.tableName}</p>
                
                <div 
                  className="bg-white p-4 rounded-2xl shadow-sm border border-slate-155 cursor-pointer hover:ring-4 hover:ring-[#6C4DFF]/20 hover:scale-[1.02] transition-all duration-300"
                  onClick={() => window.open(`/scan/${currentQR._id}`, '_blank')}
                  title="Click to simulate scan"
                >
                  <QRCodeSVG value={currentQR.url} size={180} level="H" />
                </div>
                
                <p className="mt-6 text-xs text-slate-400 font-bold uppercase tracking-wider">Scan to View Menu & Order</p>
              </div>

              <button 
                onClick={() => window.open(`/scan/${currentQR._id}`, '_blank')}
                className="w-full mt-4 py-3.5 bg-slate-950 hover:bg-slate-900 text-white rounded-2xl font-bold shadow-lg shadow-slate-950/10 hover:shadow-slate-950/20 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 text-sm flex items-center justify-center gap-2 border border-slate-800"
              >
                <QrCode size={16} />
                Simulate Scan & Order Flow
              </button>
              
              <div className="flex w-full gap-3 mt-6 border-t border-slate-100 pt-4">
                <button 
                  onClick={() => handleDownloadPNG(currentQR._id, currentQR.tableName)}
                  className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-2xl font-bold transition-all text-sm border border-slate-250 flex items-center justify-center"
                >
                  <Download className="w-4 h-4 mr-2" /> PNG
                </button>
                <button 
                  onClick={handleDownloadPDF}
                  className="flex-1 py-3 bg-[#6C4DFF] hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg shadow-[#6C4DFF]/20 transition-all text-sm flex items-center justify-center"
                >
                  <Download className="w-4 h-4 mr-2" /> PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default QRManagement;
