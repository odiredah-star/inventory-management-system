import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:5000';

function App() {
    // ========== STATE ==========
    const [loggedIn, setLoggedIn] = useState(false);
    const [user, setUser] = useState(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPwd, setShowPwd] = useState(false);
    const [msg, setMsg] = useState('');
    
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [purchases, setPurchases] = useState([]);
    const [sales, setSales] = useState([]);
    const [stats, setStats] = useState({ totalSales: 0, todaySales: 0, saleCount: 0 });
    const [users, setUsers] = useState([]);
    
    const [activeTab, setActiveTab] = useState('dashboard');
    const [showProductModal, setShowProductModal] = useState(false);
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);
    const [showSaleModal, setShowSaleModal] = useState(false);
    const [showUserModal, setShowUserModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [editingProduct, setEditingProduct] = useState(null);
    const [reportType, setReportType] = useState('inventory');
    
    const [newProduct, setNewProduct] = useState({ name: '', price: '', qty: '', categoryId: '' });
    const [editProduct, setEditProduct] = useState({ name: '', price: '', qty: '', categoryId: '' });
    const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'staff' });
    const [newPurchase, setNewPurchase] = useState({ supplierId: '', items: [{ productId: '', qty: '', cost: '' }] });
    const [newSale, setNewSale] = useState({ customerId: '', items: [{ productId: '', qty: '' }], method: 'cash' });

    const userRole = user?.role || JSON.parse(localStorage.getItem('user') || '{}')?.role;
    const formatPrice = (p) => parseFloat(p).toFixed(2);

    // ========== API CALLS ==========
    const login = async (e) => {
        e.preventDefault();
        setMsg('Logging in...');
        try {
            const res = await fetch(`${API_URL}/api/v1/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (data.success) {
                setLoggedIn(true);
                setUser(data.data.user);
                localStorage.setItem('token', data.data.accessToken);
                localStorage.setItem('user', JSON.stringify(data.data.user));
                await loadData();
            } else {
                setMsg('Invalid credentials');
            }
        } catch (err) {
            setMsg('Error: ' + err.message);
        }
    };

    const loadData = async () => {
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}` };
        
        try {
            const res1 = await fetch(`${API_URL}/api/v1/categories`, { headers });
            const data1 = await res1.json();
            if (data1.success) setCategories(data1.data || []);
            
            const res2 = await fetch(`${API_URL}/api/v1/products`, { headers });
            const data2 = await res2.json();
            if (data2.success) setProducts(data2.data || []);
            
            const res3 = await fetch(`${API_URL}/api/v1/suppliers`, { headers });
            const data3 = await res3.json();
            if (data3.success) setSuppliers(data3.data || []);
            
            const res4 = await fetch(`${API_URL}/api/v1/customers`, { headers });
            const data4 = await res4.json();
            if (data4.success) setCustomers(data4.data || []);
            
            const res5 = await fetch(`${API_URL}/api/v1/purchases`, { headers });
            const data5 = await res5.json();
            if (data5.success) setPurchases(data5.data || []);
            
            const res6 = await fetch(`${API_URL}/api/v1/sales`, { headers });
            const data6 = await res6.json();
            if (data6.success) setSales(data6.data || []);
            
            const res7 = await fetch(`${API_URL}/api/v1/sales/stats`, { headers });
            const data7 = await res7.json();
            if (data7.success) setStats(data7.data);
            
            const stored = JSON.parse(localStorage.getItem('user') || '{}');
            if (stored?.role === 'admin') {
                const res8 = await fetch(`${API_URL}/api/v1/users`, { headers });
                const data8 = await res8.json();
                if (data8.success) setUsers(data8.data || []);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const addProduct = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/api/v1/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    name: newProduct.name,
                    price: parseFloat(newProduct.price),
                    quantity_in_stock: parseInt(newProduct.qty),
                    category_id: newProduct.categoryId
                })
            });
            const data = await res.json();
            if (data.success) {
                setShowProductModal(false);
                setNewProduct({ name: '', price: '', qty: '', categoryId: '' });
                loadData();
                setMsg('Product added!');
                setTimeout(() => setMsg(''), 3000);
            }
        } catch (err) {
            setMsg('Error: ' + err.message);
        }
    };

    const deleteProduct = async (id) => {
        if (!window.confirm('Delete this product?')) return;
        const token = localStorage.getItem('token');
        try {
            await fetch(`${API_URL}/api/v1/products/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
            loadData();
            setMsg('Product deleted');
            setTimeout(() => setMsg(''), 3000);
        } catch (err) {
            setMsg('Error: ' + err.message);
        }
    };

    const startEdit = (p) => {
        setEditingProduct(p);
        setEditProduct({ name: p.name, price: p.price, qty: p.quantity_in_stock, categoryId: p.category_id });
    };

    const updateProduct = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/api/v1/products/${editingProduct.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    name: editProduct.name,
                    price: parseFloat(editProduct.price),
                    quantity_in_stock: parseInt(editProduct.qty),
                    category_id: editProduct.categoryId
                })
            });
            const data = await res.json();
            if (data.success) {
                setEditingProduct(null);
                loadData();
                setMsg('Product updated!');
                setTimeout(() => setMsg(''), 3000);
            }
        } catch (err) {
            setMsg('Error: ' + err.message);
        }
    };

    const addPurchase = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/api/v1/purchases`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ supplier_id: newPurchase.supplierId, items: newPurchase.items })
            });
            const data = await res.json();
            if (data.success) {
                setShowPurchaseModal(false);
                setNewPurchase({ supplierId: '', items: [{ productId: '', qty: '', cost: '' }] });
                loadData();
                setMsg('Purchase recorded!');
                setTimeout(() => setMsg(''), 3000);
            }
        } catch (err) {
            setMsg('Error: ' + err.message);
        }
    };

    const addPurchaseItem = () => {
        setNewPurchase({ ...newPurchase, items: [...newPurchase.items, { productId: '', qty: '', cost: '' }] });
    };

    const removePurchaseItem = (idx) => {
        const items = [...newPurchase.items];
        items.splice(idx, 1);
        setNewPurchase({ ...newPurchase, items });
    };

    const updatePurchaseItem = (idx, field, val) => {
        const items = [...newPurchase.items];
        items[idx][field] = val;
        setNewPurchase({ ...newPurchase, items });
    };

    const addSale = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/api/v1/sales`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ customer_id: newSale.customerId, items: newSale.items, payment_method: newSale.method })
            });
            const data = await res.json();
            if (data.success) {
                setShowSaleModal(false);
                setNewSale({ customerId: '', items: [{ productId: '', qty: '' }], method: 'cash' });
                loadData();
                setMsg('Sale recorded!');
                setTimeout(() => setMsg(''), 3000);
            }
        } catch (err) {
            setMsg('Error: ' + err.message);
        }
    };

    const addSaleItem = () => {
        setNewSale({ ...newSale, items: [...newSale.items, { productId: '', qty: '' }] });
    };

    const removeSaleItem = (idx) => {
        const items = [...newSale.items];
        items.splice(idx, 1);
        setNewSale({ ...newSale, items });
    };

    const updateSaleItem = (idx, field, val) => {
        const items = [...newSale.items];
        items[idx][field] = val;
        setNewSale({ ...newSale, items });
    };

    const addUser = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/api/v1/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ full_name: newUser.name, email: newUser.email, password: newUser.password, role: newUser.role })
            });
            const data = await res.json();
            if (data.success) {
                setShowUserModal(false);
                setNewUser({ name: '', email: '', password: '', role: 'staff' });
                loadData();
                setMsg('User added!');
                setTimeout(() => setMsg(''), 3000);
            }
        } catch (err) {
            setMsg('Error: ' + err.message);
        }
    };

    const deleteUser = async (id, email) => {
        if (email === 'admin@inventory.com') { setMsg('Cannot delete admin'); setTimeout(() => setMsg(''), 3000); return; }
        if (!window.confirm('Delete this user?')) return;
        const token = localStorage.getItem('token');
        try {
            await fetch(`${API_URL}/api/v1/users/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
            loadData();
            setMsg('User deleted');
            setTimeout(() => setMsg(''), 3000);
        } catch (err) {
            setMsg('Error: ' + err.message);
        }
    };

    const exportCSV = (type) => {
        let headers, data, filename;
        if (type === 'inventory') {
            headers = ['Name', 'Price', 'Stock', 'Category'];
            data = products.map(p => [p.name, formatPrice(p.price), p.quantity_in_stock, p.category_name || 'Uncategorized']);
            filename = 'inventory.csv';
        } else {
            headers = ['Invoice', 'Date', 'Customer', 'Total', 'Payment'];
            data = sales.map(s => [s.sale_number, new Date(s.sale_date).toLocaleDateString(), s.customer_name || 'Walk-in', formatPrice(s.total_amount), s.payment_method]);
            filename = 'sales.csv';
        }
        let csv = headers.join(',') + '\n';
        data.forEach(row => csv += row.map(c => `"${c}"`).join(',') + '\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        setShowReportModal(false);
    };

    const generatePDF = async () => {
        try {
            const { jsPDF } = await import('jspdf');
            const autoTable = (await import('jspdf-autotable')).default;
            const doc = new jsPDF();
            if (reportType === 'inventory') {
                doc.text('Inventory Report', 14, 15);
                doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 25);
                const tableData = products.map(p => [p.name, formatPrice(p.price), p.quantity_in_stock, p.category_name || 'Uncategorized']);
                autoTable(doc, { startY: 35, head: [['Name', 'Price', 'Stock', 'Category']], body: tableData });
                doc.save('inventory.pdf');
            } else {
                doc.text('Sales Report', 14, 15);
                doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 25);
                const tableData = sales.map(s => [s.sale_number, new Date(s.sale_date).toLocaleDateString(), s.customer_name || 'Walk-in', formatPrice(s.total_amount), s.payment_method]);
                autoTable(doc, { startY: 35, head: [['Invoice', 'Date', 'Customer', 'Total', 'Payment']], body: tableData });
                doc.save('sales.pdf');
            }
            setShowReportModal(false);
        } catch (err) {
            setMsg('PDF generation error');
        }
    };

    const logout = () => {
        setLoggedIn(false);
        localStorage.clear();
        setMsg('Logged out');
    };

    // ========== CATEGORY PAGE ==========
    if (selectedCategory) {
        const categoryProducts = products.filter(p => p.category_id === selectedCategory);
        const categoryName = categories.find(c => c.id === selectedCategory)?.name || 'Category';
        return (
            <div className="app-container" style={styles.app}>
                <header style={styles.header}>
                    <h1 style={styles.logo}>📦 Inventory System</h1>
                    <div style={styles.userInfo}>
                        <span style={styles.badge}>{userRole?.toUpperCase()}</span>
                        <span>Hi, {user?.full_name}</span>
                        <button onClick={logout} style={styles.logoutBtn}>Logout</button>
                    </div>
                </header>
                <div style={styles.categoryHeader}>
                    <button onClick={() => setSelectedCategory(null)} style={styles.backBtn}>← Back to Dashboard</button>
                    <h2 style={styles.categoryTitle}>{categoryName}</h2>
                    <p style={styles.categoryCount}>{categoryProducts.length} products in this category</p>
                </div>
                <div style={styles.cardContainer}>
                    <div style={styles.cardHeader}>
                        <h3>Products in {categoryName}</h3>
                        {userRole === 'admin' && <button onClick={() => setShowProductModal(true)} style={styles.primaryBtn}>+ Add Product</button>}
                    </div>
                    <div style={styles.tableWrapper}>
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th>Product Name</th>
                                    <th>Price</th>
                                    <th>Stock</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {categoryProducts.map(p => (
                                    <tr key={p.id}>
                                        <td>{p.name}</td>
                                        <td>${formatPrice(p.price)}</td>
                                        <td><span style={{...styles.stockBadge, background: p.quantity_in_stock === 0 ? '#ef4444' : p.quantity_in_stock < 10 ? '#f59e0b' : '#10b981'}}>{p.quantity_in_stock}</span></td>
                                        <td>
                                            {userRole === 'admin' && (
                                                <>
                                                    <button onClick={() => startEdit(p)} style={styles.editBtn}>Edit</button>
                                                    <button onClick={() => deleteProduct(p.id)} style={styles.dangerBtn}>Delete</button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                {renderModals()}
            </div>
        );
    }

    // ========== MODALS ==========
    const renderModals = () => (
        <>
            {/* Add Product Modal */}
            {showProductModal && !selectedCategory && userRole === 'admin' && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modal}>
                        <div style={styles.modalHeader}>
                            <h3>Add New Product</h3>
                            <button onClick={() => setShowProductModal(false)} style={styles.modalClose}>×</button>
                        </div>
                        <form onSubmit={addProduct}>
                            <input type="text" placeholder="Product Name" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} style={styles.input} required />
                            <input type="number" step="0.01" placeholder="Price" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} style={styles.input} required />
                            <input type="number" placeholder="Initial Stock" value={newProduct.qty} onChange={e => setNewProduct({...newProduct, qty: e.target.value})} style={styles.input} required />
                            <select value={newProduct.categoryId} onChange={e => setNewProduct({...newProduct, categoryId: e.target.value})} style={styles.select} required>
                                <option value="">Select Category</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <button type="submit" style={styles.submitBtn}>Add Product</button>
                        </form>
                    </div>
                </div>
            )}
            
            {/* Edit Product Modal */}
            {editingProduct && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modal}>
                        <div style={styles.modalHeader}>
                            <h3>Edit Product</h3>
                            <button onClick={() => setEditingProduct(null)} style={styles.modalClose}>×</button>
                        </div>
                        <form onSubmit={updateProduct}>
                            <input type="text" value={editProduct.name} onChange={e => setEditProduct({...editProduct, name: e.target.value})} style={styles.input} required />
                            <input type="number" step="0.01" value={editProduct.price} onChange={e => setEditProduct({...editProduct, price: e.target.value})} style={styles.input} required />
                            <input type="number" value={editProduct.qty} onChange={e => setEditProduct({...editProduct, qty: e.target.value})} style={styles.input} required />
                            <select value={editProduct.categoryId} onChange={e => setEditProduct({...editProduct, categoryId: e.target.value})} style={styles.select} required>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <button type="submit" style={styles.submitBtn}>Update Product</button>
                        </form>
                    </div>
                </div>
            )}
            
            {/* Purchase Modal */}
            {showPurchaseModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalLarge}>
                        <div style={styles.modalHeader}>
                            <h3>New Purchase Order</h3>
                            <button onClick={() => setShowPurchaseModal(false)} style={styles.modalClose}>×</button>
                        </div>
                        <form onSubmit={addPurchase}>
                            <select value={newPurchase.supplierId} onChange={e => setNewPurchase({...newPurchase, supplierId: e.target.value})} style={styles.select} required>
                                <option value="">Select Supplier</option>
                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.supplier_name}</option>)}
                            </select>
                            <h4 style={styles.sectionTitle}>Purchase Items</h4>
                            {newPurchase.items.map((item, idx) => (
                                <div key={idx} style={styles.itemRow}>
                                    <select value={item.productId} onChange={e => updatePurchaseItem(idx, 'productId', e.target.value)} style={styles.flex1} required>
                                        <option value="">Select Product</option>
                                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                    <input type="number" placeholder="Qty" value={item.qty} onChange={e => updatePurchaseItem(idx, 'qty', e.target.value)} style={styles.smallInput} required />
                                    <input type="number" step="0.01" placeholder="Cost" value={item.cost} onChange={e => updatePurchaseItem(idx, 'cost', e.target.value)} style={styles.smallInput} required />
                                    {newPurchase.items.length > 1 && <button type="button" onClick={() => removePurchaseItem(idx)} style={styles.iconBtn}>🗑️</button>}
                                </div>
                            ))}
                            <button type="button" onClick={addPurchaseItem} style={styles.secondaryBtn}>+ Add Another Item</button>
                            <button type="submit" style={styles.submitBtn}>Record Purchase</button>
                        </form>
                    </div>
                </div>
            )}
            
            {/* Sale Modal */}
            {showSaleModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalLarge}>
                        <div style={styles.modalHeader}>
                            <h3>New Sale Transaction</h3>
                            <button onClick={() => setShowSaleModal(false)} style={styles.modalClose}>×</button>
                        </div>
                        <form onSubmit={addSale}>
                            <select value={newSale.customerId} onChange={e => setNewSale({...newSale, customerId: e.target.value})} style={styles.select}>
                                <option value="">Walk-in Customer</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.customer_name}</option>)}
                            </select>
                            <select value={newSale.method} onChange={e => setNewSale({...newSale, method: e.target.value})} style={styles.select}>
                                <option value="cash">Cash</option>
                                <option value="card">Card</option>
                                <option value="mobile_money">Mobile Money</option>
                            </select>
                            <h4 style={styles.sectionTitle}>Sale Items</h4>
                            {newSale.items.map((item, idx) => (
                                <div key={idx} style={styles.itemRow}>
                                    <select value={item.productId} onChange={e => updateSaleItem(idx, 'productId', e.target.value)} style={styles.flex1} required>
                                        <option value="">Select Product</option>
                                        {products.map(p => <option key={p.id} value={p.id}>{p.name} (${formatPrice(p.price)}) - Stock: {p.quantity_in_stock}</option>)}
                                    </select>
                                    <input type="number" placeholder="Qty" value={item.qty} onChange={e => updateSaleItem(idx, 'qty', e.target.value)} style={styles.smallInput} required />
                                    {newSale.items.length > 1 && <button type="button" onClick={() => removeSaleItem(idx)} style={styles.iconBtn}>🗑️</button>}
                                </div>
                            ))}
                            <button type="button" onClick={addSaleItem} style={styles.secondaryBtn}>+ Add Another Item</button>
                            <button type="submit" style={styles.submitBtn}>Complete Sale</button>
                        </form>
                    </div>
                </div>
            )}
            
            {/* User Modal */}
            {showUserModal && userRole === 'admin' && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modal}>
                        <div style={styles.modalHeader}>
                            <h3>Add New User</h3>
                            <button onClick={() => setShowUserModal(false)} style={styles.modalClose}>×</button>
                        </div>
                        <form onSubmit={addUser}>
                            <input type="text" placeholder="Full Name" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} style={styles.input} required />
                            <input type="email" placeholder="Email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} style={styles.input} required />
                            <input type="password" placeholder="Password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} style={styles.input} required />
                            <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} style={styles.select}>
                                <option value="staff">Staff</option>
                                <option value="admin">Admin</option>
                            </select>
                            <button type="submit" style={styles.submitBtn}>Add User</button>
                        </form>
                    </div>
                </div>
            )}
            
            {/* Report Modal */}
            {showReportModal && userRole === 'admin' && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modal}>
                        <div style={styles.modalHeader}>
                            <h3>Generate Report</h3>
                            <button onClick={() => setShowReportModal(false)} style={styles.modalClose}>×</button>
                        </div>
                        <div style={styles.reportGrid}>
                            <button onClick={() => { setReportType('inventory'); generatePDF(); }} style={styles.reportBtn}>📄 Inventory PDF</button>
                            <button onClick={() => exportCSV('inventory')} style={styles.reportBtnGreen}>📊 Inventory CSV</button>
                            <button onClick={() => { setReportType('sales'); generatePDF(); }} style={styles.reportBtn}>💰 Sales PDF</button>
                            <button onClick={() => exportCSV('sales')} style={styles.reportBtnGreen}>📊 Sales CSV</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );

    // ========== LOGIN PAGE ==========
    if (!loggedIn) {
        return (
            <div style={styles.loginContainer}>
                <div style={styles.loginCard}>
                    <h1 style={styles.loginTitle}>📦 Inventory Management System</h1>
                    <form onSubmit={login}>
                        <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} style={styles.loginInput} required />
                        <div style={styles.passwordWrapper}>
                            <input type={showPwd ? "text" : "password"} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={styles.loginInput} required />
                            <button type="button" onClick={() => setShowPwd(!showPwd)} style={styles.eyeBtn}>{showPwd ? "🙈" : "👁️"}</button>
                        </div>
                        <button type="submit" style={styles.loginBtn}>Sign In</button>
                    </form>
                    {msg && <p style={styles.message}>{msg}</p>}
                    <div style={styles.demoBox}>
                        <p><strong>Demo Credentials:</strong></p>
                        <p>Admin: admin@inventory.com / Admin123</p>
                        <p>Staff: staff@inventory.com / Staff123</p>
                    </div>
                </div>
            </div>
        );
    }

    // ========== MAIN DASHBOARD ==========
    return (
        <div style={styles.app}>
            <header style={styles.header}>
                <h1 style={styles.logo}>📦 Inventory System</h1>
                <div style={styles.userInfo}>
                    <span style={styles.badge}>{userRole?.toUpperCase()}</span>
                    <span>Hi, {user?.full_name}</span>
                    <button onClick={logout} style={styles.logoutBtn}>Logout</button>
                </div>
            </header>
            
            <nav style={styles.nav}>
                <button onClick={() => setActiveTab('dashboard')} style={activeTab === 'dashboard' ? styles.navActive : styles.navBtn}>Dashboard</button>
                <button onClick={() => setActiveTab('products')} style={activeTab === 'products' ? styles.navActive : styles.navBtn}>Products</button>
                <button onClick={() => setActiveTab('purchases')} style={activeTab === 'purchases' ? styles.navActive : styles.navBtn}>Purchases</button>
                <button onClick={() => setActiveTab('sales')} style={activeTab === 'sales' ? styles.navActive : styles.navBtn}>Sales</button>
                {userRole === 'admin' && <button onClick={() => setActiveTab('users')} style={activeTab === 'users' ? styles.navActive : styles.navBtn}>Users</button>}
            </nav>
            
            <main style={styles.main}>
                {msg && <div style={styles.toast}>{msg}</div>}
                
                {activeTab === 'dashboard' && (
                    <>
                        {userRole === 'admin' && (
                            <div style={styles.reportBar}>
                                <button onClick={() => setShowReportModal(true)} style={styles.reportBarBtn}>📊 Generate Report</button>
                            </div>
                        )}
                        <div style={styles.statsGrid}>
                            <div style={styles.statCard}>
                                <div style={styles.statIcon}>📦</div>
                                <div>
                                    <p style={styles.statLabel}>Total Products</p>
                                    <p style={styles.statValue}>{products.length}</p>
                                </div>
                            </div>
                            <div style={styles.statCard}>
                                <div style={styles.statIcon}>💰</div>
                                <div>
                                    <p style={styles.statLabel}>Total Sales</p>
                                    <p style={styles.statValue}>${formatPrice(stats.totalSales)}</p>
                                </div>
                            </div>
                            <div style={styles.statCard}>
                                <div style={styles.statIcon}>📈</div>
                                <div>
                                    <p style={styles.statLabel}>Today's Sales</p>
                                    <p style={styles.statValue}>${formatPrice(stats.todaySales)}</p>
                                </div>
                            </div>
                            <div style={styles.statCard}>
                                <div style={styles.statIcon}>🔄</div>
                                <div>
                                    <p style={styles.statLabel}>Transactions</p>
                                    <p style={styles.statValue}>{stats.saleCount}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>Product Categories</h3>
                            <div style={styles.categoryGrid}>
                                {categories.map(c => (
                                    <div key={c.id} style={styles.categoryCard} onClick={() => setSelectedCategory(c.id)}>
                                        <div style={styles.categoryIcon}>📁</div>
                                        <h4 style={styles.categoryName}>{c.name}</h4>
                                        <p style={styles.categoryDesc}>{c.description}</p>
                                        <p style={styles.categoryProductCount}>{products.filter(p => p.category_id === c.id).length} products</p>
                                        <div style={styles.viewLink}>View Products →</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>Recent Sales</h3>
                            <div style={styles.tableWrapper}>
                                <table style={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>Invoice #</th>
                                            <th>Date</th>
                                            <th>Customer</th>
                                            <th>Total</th>
                                            <th>Items</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sales.slice(0, 5).map(s => (
                                            <tr key={s.id}>
                                                <td>{s.sale_number}</td>
                                                <td>{new Date(s.sale_date).toLocaleDateString()}</td>
                                                <td>{s.customer_name || 'Walk-in'}</td>
                                                <td>${formatPrice(s.total_amount)}</td>
                                                <td>{s.items_count || 0}</td>
                                            </tr>
                                        ))}
                                        {sales.length === 0 && <tr><td colSpan="5" style={styles.emptyRow}>No sales yet</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
                
                {activeTab === 'products' && (
                    <div style={styles.card}>
                        <div style={styles.cardHeader}>
                            <h3 style={styles.cardTitle}>All Products</h3>
                            {userRole === 'admin' && <button onClick={() => setShowProductModal(true)} style={styles.primaryBtn}>+ Add Product</button>}
                        </div>
                        <div style={styles.tableWrapper}>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Product Name</th>
                                        <th>Price</th>
                                        <th>Stock</th>
                                        <th>Category</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.map(p => {
                                        const catName = categories.find(c => c.id === p.category_id)?.name || 'Uncategorized';
                                        return (
                                            <tr key={p.id}>
                                                <td>{p.name}</td>
                                                <td>${formatPrice(p.price)}</td>
                                                <td><span style={{...styles.stockBadge, background: p.quantity_in_stock === 0 ? '#ef4444' : p.quantity_in_stock < 10 ? '#f59e0b' : '#10b981'}}>{p.quantity_in_stock}</span></td>
                                                <td>{catName}</td>
                                                <td>
                                                    {userRole === 'admin' && (
                                                        <>
                                                            <button onClick={() => startEdit(p)} style={styles.editBtn}>Edit</button>
                                                            <button onClick={() => deleteProduct(p.id)} style={styles.dangerBtn}>Delete</button>
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {products.length === 0 && <tr><td colSpan="5" style={styles.emptyRow}>No products yet</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                
                {activeTab === 'purchases' && (
                    <div style={styles.card}>
                        <div style={styles.cardHeader}>
                            <h3 style={styles.cardTitle}>Purchase Orders</h3>
                            <button onClick={() => setShowPurchaseModal(true)} style={styles.primaryBtn}>+ New Purchase</button>
                        </div>
                        <div style={styles.tableWrapper}>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th>PO Number</th>
                                        <th>Supplier</th>
                                        <th>Date</th>
                                        <th>Total Cost</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {purchases.map(p => (
                                        <tr key={p.id}>
                                            <td>{p.purchase_number}</td>
                                            <td>{p.supplier_name || 'Unknown'}</td>
                                            <td>{new Date(p.purchase_date).toLocaleDateString()}</td>
                                            <td>${formatPrice(p.total_cost)}</td>
                                        </tr>
                                    ))}
                                    {purchases.length === 0 && <tr><td colSpan="4" style={styles.emptyRow}>No purchases yet</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                
                {activeTab === 'sales' && (
                    <div style={styles.card}>
                        <div style={styles.cardHeader}>
                            <h3 style={styles.cardTitle}>Sales Transactions</h3>
                            <button onClick={() => setShowSaleModal(true)} style={styles.primaryBtn}>+ New Sale</button>
                        </div>
                        <div style={styles.tableWrapper}>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Invoice #</th>
                                        <th>Date</th>
                                        <th>Customer</th>
                                        <th>Total</th>
                                        <th>Payment</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sales.map(s => (
                                        <tr key={s.id}>
                                            <td>{s.sale_number}</td>
                                            <td>{new Date(s.sale_date).toLocaleDateString()}</td>
                                            <td>{s.customer_name || 'Walk-in'}</td>
                                            <td>${formatPrice(s.total_amount)}</td>
                                            <td>{s.payment_method}</td>
                                        </tr>
                                    ))}
                                    {sales.length === 0 && <tr><td colSpan="5" style={styles.emptyRow}>No sales yet</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                
                {activeTab === 'users' && userRole === 'admin' && (
                    <div style={styles.card}>
                        <div style={styles.cardHeader}>
                            <h3 style={styles.cardTitle}>User Management</h3>
                            <button onClick={() => setShowUserModal(true)} style={styles.primaryBtn}>+ Add User</button>
                        </div>
                        <div style={styles.tableWrapper}>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(u => (
                                        <tr key={u.id}>
                                            <td>{u.full_name}</td>
                                            <td>{u.email}</td>
                                            <td><span style={{...styles.roleBadge, background: u.role === 'admin' ? '#dc2626' : '#10b981'}}>{u.role}</span></td>
                                            <td><span style={{...styles.statusBadge, background: u.status === 'active' ? '#10b981' : '#ef4444'}}>{u.status}</span></td>
                                            <td>
                                                {u.email !== 'admin@inventory.com' && (
                                                    <button onClick={() => deleteUser(u.id, u.email)} style={styles.dangerBtn}>Delete</button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {users.length === 0 && <tr><td colSpan="5" style={styles.emptyRow}>No users found</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>
            {renderModals()}
        </div>
    );
}

// ========== STYLES ==========
const styles = {
    // Layout
    app: { minHeight: '100vh', background: '#f3f4f6' },
    loginContainer: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    main: { maxWidth: 1400, margin: '0 auto', padding: 24 },
    
    // Header
    header: { background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 },
    logo: { fontSize: 24, margin: 0, color: '#1f2937' },
    userInfo: { display: 'flex', alignItems: 'center', gap: 16 },
    badge: { background: '#6366f1', color: 'white', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 'bold' },
    logoutBtn: { background: '#ef4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 14, transition: 'all 0.2s' },
    
    // Navigation
    nav: { display: 'flex', gap: 8, background: 'white', padding: '0 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
    navBtn: { padding: '16px 24px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500, color: '#6b7280', transition: 'all 0.2s' },
    navActive: { padding: '16px 24px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#6366f1', borderBottom: '2px solid #6366f1' },
    
    // Cards
    card: { background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: 24, marginBottom: 24 },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 },
    cardTitle: { fontSize: 18, fontWeight: 600, margin: 0, color: '#1f2937' },
    
    // Stats Grid
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20, marginBottom: 24 },
    statCard: { background: 'white', borderRadius: 12, padding: 20, display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
    statIcon: { fontSize: 32 },
    statLabel: { fontSize: 14, color: '#6b7280', margin: 0 },
    statValue: { fontSize: 28, fontWeight: 'bold', color: '#1f2937', margin: 0 },
    
    // Category Grid
    categoryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 },
    categoryCard: { background: '#f9fafb', borderRadius: 12, padding: 20, cursor: 'pointer', transition: 'all 0.2s', border: '1px solid #e5e7eb' },
    categoryIcon: { fontSize: 32, marginBottom: 12 },
    categoryName: { fontSize: 18, fontWeight: 600, margin: '0 0 8px 0', color: '#1f2937' },
    categoryDesc: { fontSize: 14, color: '#6b7280', margin: '0 0 12px 0' },
    categoryProductCount: { fontSize: 12, color: '#9ca3af', margin: '0 0 12px 0' },
    viewLink: { color: '#6366f1', fontSize: 14, fontWeight: 500, textDecoration: 'none' },
    
    // Tables
    tableWrapper: { overflowX: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse' },
    emptyRow: { textAlign: 'center', padding: 40, color: '#9ca3af' },
    
    // Badges
    stockBadge: { display: 'inline-block', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, color: 'white' },
    roleBadge: { display: 'inline-block', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, color: 'white' },
    statusBadge: { display: 'inline-block', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, color: 'white' },
    
    // Buttons
    primaryBtn: { background: '#6366f1', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500, transition: 'all 0.2s' },
    editBtn: { background: '#f59e0b', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, marginRight: 8 },
    dangerBtn: { background: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12 },
    secondaryBtn: { background: '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500, marginBottom: 16 },
    submitBtn: { width: '100%', background: '#6366f1', color: 'white', border: 'none', padding: 12, borderRadius: 8, cursor: 'pointer', fontSize: 16, fontWeight: 600, marginTop: 16 },
    
    // Report
    reportBar: { marginBottom: 24 },
    reportBarBtn: { background: '#8b5cf6', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontSize: 14 },
    reportGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, padding: 10 },
    reportBtn: { background: '#6366f1', color: 'white', border: 'none', padding: '12px 20px', borderRadius: 8, cursor: 'pointer', fontSize: 14 },
    reportBtnGreen: { background: '#10b981', color: 'white', border: 'none', padding: '12px 20px', borderRadius: 8, cursor: 'pointer', fontSize: 14 },
    
    // Category Page
    categoryHeader: { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '48px 24px', textAlign: 'center' },
    backBtn: { background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', padding: '8px 20px', borderRadius: 20, cursor: 'pointer', fontSize: 14, marginBottom: 24 },
    categoryTitle: { fontSize: 32, margin: '0 0 12px 0' },
    categoryCount: { fontSize: 16, opacity: 0.9, margin: 0 },
    
    // Login
    loginCard: { background: 'white', borderRadius: 16, padding: 40, width: 400, maxWidth: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' },
    loginTitle: { textAlign: 'center', marginBottom: 32, color: '#1f2937', fontSize: 24 },
    loginInput: { width: '100%', padding: 12, border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, marginBottom: 16, boxSizing: 'border-box' },
    loginBtn: { width: '100%', background: '#6366f1', color: 'white', border: 'none', padding: 12, borderRadius: 8, cursor: 'pointer', fontSize: 16, fontWeight: 600 },
    passwordWrapper: { position: 'relative' },
    eyeBtn: { position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 },
    demoBox: { marginTop: 24, padding: 16, background: '#f3f4f6', borderRadius: 8, fontSize: 13, textAlign: 'center' },
    message: { textAlign: 'center', color: '#ef4444', marginTop: 16, fontSize: 14 },
    toast: { position: 'fixed', top: 80, right: 24, background: '#10b981', color: 'white', padding: '12px 24px', borderRadius: 8, zIndex: 1000, animation: 'fadeOut 3s forwards' },
    
    // Modal
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modal: { background: 'white', borderRadius: 16, width: 500, maxWidth: '90%', maxHeight: '90vh', overflow: 'auto' },
    modalLarge: { background: 'white', borderRadius: 16, width: 700, maxWidth: '90%', maxHeight: '90vh', overflow: 'auto' },
    modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottom: '1px solid #e5e7eb' },
    modalClose: { background: 'none', border: 'none', fontSize: 28, cursor: 'pointer', color: '#9ca3af' },
    
    // Form Elements
    input: { width: '100%', padding: 12, border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, marginBottom: 16, boxSizing: 'border-box' },
    select: { width: '100%', padding: 12, border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, marginBottom: 16, background: 'white', boxSizing: 'border-box' },
    sectionTitle: { fontSize: 16, fontWeight: 600, margin: '16px 0 12px 0', color: '#1f2937' },
    itemRow: { display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center' },
    flex1: { flex: 1, padding: 10, border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 14 },
    smallInput: { width: 100, padding: 10, border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 14 },
    iconBtn: { background: '#ef4444', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 16, padding: '8px 12px' },
};

export default App;