import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import {
  Plus,
  Pencil,
  Trash2,
  X,
  UploadCloud,
  Loader2,
  FileImage,
  AlertTriangle
} from 'lucide-react';

const Menu = () => {
  const { restaurant } = useContext(AuthContext);

  const [menuItems, setMenuItems] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [image, setImage] = useState('');

  // Image Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    fetchMenu();
  }, []);

  const fetchMenu = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/menu');
      setMenuItems(res.data);
    } catch (err) {
      console.error('Error fetching menu', err);
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    setName('');
    setPrice('');
    setCategory('');
    setImage('');
    setUploadError('');
    setUploadProgress(0);
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setName(item.name);
    setPrice(item.price);
    setCategory(item.category);
    setImage(item.image || '');
    setUploadError('');
    setUploadProgress(0);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  // Drag & Drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleImageUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      await handleImageUpload(e.target.files[0]);
    }
  };

  const handleImageUpload = async (file) => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Invalid file type! Only JPG, JPEG, and PNG images are allowed.');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File is too large! Maximum limit is 5MB.');
      return;
    }

    const formData = new FormData();
    formData.append('image', file);

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError('');

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('http://localhost:5000/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });

      setImage(res.data.secure_url);
      setUploadProgress(100);
    } catch (err) {
      console.error('Upload failed:', err);
      // Handle Cloudinary configuration errors gracefully
      const backendMessage = err.response?.data?.message || 'Server image upload failed';
      setUploadError(
        backendMessage.includes('Must provide')
          ? 'Cloudinary keys missing! Fall back to manual URL below or check .env'
          : backendMessage
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { name, price: Number(price), category, image };

    try {
      if (editingItem) {
        await axios.put(`http://localhost:5000/api/menu/${editingItem._id}`, payload);
      } else {
        await axios.post('http://localhost:5000/api/menu', payload);
      }
      fetchMenu();
      closeModal();
    } catch (err) {
      console.error('Error saving item', err);
      alert('Error saving item');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await axios.delete(`http://localhost:5000/api/menu/${id}`);
        fetchMenu();
      } catch (err) {
        console.error('Error deleting item', err);
      }
    }
  };

  return (
    <>
      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Menu Management</h1>
            <p className="text-slate-500 mt-1">Manage your food items and categories</p>
          </div>
          <button
            onClick={() => {
              if (restaurant?.status && restaurant?.status !== 'active') {
                alert(`Your plan is currently ${restaurant?.status}. You cannot add new menu items.`);
                return;
              }
              openAddModal();
            }}
            disabled={restaurant?.status && restaurant?.status !== 'active'}
            className="flex items-center gap-2 bg-[#6C4DFF] hover:bg-indigo-700 disabled:bg-slate-350 disabled:cursor-not-allowed disabled:hover:bg-slate-350 text-white px-5 py-2.5 rounded-xl shadow-md transition-all font-semibold"
          >
            <Plus size={20} />
            <span className="font-medium">Add Item</span>
          </button>
        </header>

        {restaurant?.status && restaurant?.status !== 'active' && (
          <div className="p-4 mb-8 bg-amber-500/10 border border-amber-500/20 text-amber-700 rounded-2xl flex items-start gap-3 animate-in slide-in-from-top duration-300">
            <AlertTriangle className="flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-extrabold text-sm capitalize">Plan Inactive / {restaurant?.status}</p>
              <p className="text-xs font-semibold text-amber-600 mt-0.5">
                Your restaurant's plan is currently {restaurant?.status}. Write operations, order placement, and menu changes are blocked. Please renew or contact support to reactivate.
              </p>
            </div>
          </div>
        )}

        {/* Menu Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-55 border-b border-slate-100 text-slate-500 text-sm">
                  <th className="px-6 py-4 font-medium">Item</th>
                  <th className="px-6 py-4 font-medium">Category</th>
                  <th className="px-6 py-4 font-medium">Price</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {menuItems.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                      No menu items found. Click "Add Item" to create one.
                    </td>
                  </tr>
                ) : (
                  menuItems.map((item) => (
                    <tr key={item._id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <img src={item.image || 'https://via.placeholder.com/150'} alt={item.name} className="w-12 h-12 rounded-lg object-cover shadow-sm animate-in fade-in" />
                          <span className="font-medium text-slate-900">{item.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{item.category}</td>
                      <td className="px-6 py-4 font-medium text-slate-900">₹{item.price}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${item.isAvailable ? 'bg-[#10B981]/10 text-[#10B981]' : 'bg-slate-100 text-slate-500'}`}>
                          {item.isAvailable ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => {
                              if (restaurant?.status && restaurant?.status !== 'active') {
                                alert(`Your plan is currently ${restaurant?.status}. Edit is disabled.`);
                                return;
                              }
                              openEditModal(item);
                            }}
                            className="p-2 text-slate-400 hover:text-[#6C4DFF] hover:bg-indigo-50 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors"
                            disabled={restaurant?.status && restaurant?.status !== 'active'}
                          >
                            <Pencil size={18} />
                          </button>
                          <button 
                            onClick={() => {
                              if (restaurant?.status && restaurant?.status !== 'active') {
                                alert(`Your plan is currently ${restaurant?.status}. Delete is disabled.`);
                                return;
                              }
                              handleDelete(item._id);
                            }}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors"
                            disabled={restaurant?.status && restaurant?.status !== 'active'}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-150 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-extrabold text-slate-900">{editingItem ? 'Edit Food Item' : 'Add Food Item'}</h2>
              <button onClick={closeModal} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-400 hover:text-slate-650 transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 tracking-wider uppercase mb-1.5">Food Name</label>
                <input
                  type="text" required
                  value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-[#6C4DFF]/20 focus:border-[#6C4DFF] transition-all outline-none text-sm bg-slate-50/30"
                  placeholder="e.g. Double Truffle Burger"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 tracking-wider uppercase mb-1.5">Price (₹)</label>
                  <input
                    type="number" required min="0"
                    value={price} onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-[#6C4DFF]/20 focus:border-[#6C4DFF] transition-all outline-none text-sm bg-slate-50/30"
                    placeholder="180"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 tracking-wider uppercase mb-1.5">Category</label>
                  <input
                    type="text" required
                    value={category} onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-[#6C4DFF]/20 focus:border-[#6C4DFF] transition-all outline-none text-sm bg-slate-50/30"
                    placeholder="e.g. Burgers"
                  />
                </div>
              </div>

              {/* Upload Drag & Drop Uploader Component */}
              <div>
                <label className="block text-xs font-bold text-slate-500 tracking-wider uppercase mb-1.5">Food Image</label>

                {/* Drag zone wrapper */}
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-3xl p-5 text-center cursor-pointer transition-all flex flex-col justify-center items-center h-44 relative ${dragActive ? 'border-[#6C4DFF] bg-[#6C4DFF]/5' : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                    }`}
                >
                  <input
                    type="file"
                    id="image-file-uploader"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {image ? (
                    // Selected / Uploaded state preview
                    <div className="absolute inset-0 p-2 flex items-center justify-between gap-4 z-10 animate-in fade-in duration-300">
                      <img src={image} alt="Upload preview" className="w-full h-full object-cover rounded-2xl" />
                      <button
                        type="button"
                        onClick={() => setImage('')}
                        className="absolute top-4 right-4 bg-slate-900/80 hover:bg-slate-950 backdrop-blur-md text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-colors border border-white/20"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : isUploading ? (
                    // Upload Progress Loader state
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="animate-spin text-[#6C4DFF]" size={36} />
                      <p className="text-xs font-bold text-[#6C4DFF]">Uploading to Cloudinary... {uploadProgress}%</p>
                      <div className="w-48 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-[#6C4DFF] h-full transition-all duration-200" style={{ width: `${uploadProgress}%` }}></div>
                      </div>
                    </div>
                  ) : (
                    // Default Prompt state
                    <label htmlFor="image-file-uploader" className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                      <UploadCloud className="text-slate-400 mb-2 group-hover:scale-105 transition-transform" size={32} />
                      <span className="text-xs font-extrabold text-slate-800">Drag & Drop Food Image here</span>
                      <span className="text-[10px] text-slate-400 mt-1 font-semibold">Supports JPG, PNG, JPEG (Max 5MB)</span>
                    </label>
                  )}
                </div>

                {/* Error Banner */}
                {uploadError && (
                  <div className="mt-2.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 text-xs font-semibold flex items-start gap-2 animate-in slide-in-from-top duration-200">
                    <AlertTriangle className="flex-shrink-0 mt-0.5" size={14} />
                    <span>{uploadError}</span>
                  </div>
                )}
              </div>

              {/* Manual URL Input Fallback */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 tracking-wider uppercase mb-1">Or Paste Image URL directly</label>
                <input
                  type="url"
                  value={image} onChange={(e) => setImage(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#6C4DFF]/15 focus:border-[#6C4DFF] transition-all outline-none text-xs bg-slate-50/10"
                  placeholder="https://images.unsplash.com/photo-..."
                />
              </div>

              <div className="pt-3 flex gap-3 border-t border-slate-100">
                <button type="button" onClick={closeModal} className="flex-1 px-4 py-3 rounded-2xl border border-slate-250 text-slate-700 font-bold hover:bg-slate-50 transition-colors text-sm">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="flex-1 px-4 py-3 rounded-2xl bg-[#6C4DFF] text-white font-bold hover:bg-indigo-700 shadow-lg shadow-[#6C4DFF]/20 transition-all text-sm disabled:opacity-50"
                >
                  {editingItem ? 'Save Changes' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Menu;
