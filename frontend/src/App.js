import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:5000';

function App() {
    // ========== AUTH STATE ==========
    const [loggedIn, setLoggedIn] = useState(false);
    const [user, setUser] = useState(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPwd, setShowPwd] = useState(false);
    const [msg, setMsg] = useState('');
    
    // ========== DATA STATE ==========
    const [cats, setCats] = useState([]);
    const [prods, setProds] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [purchases, setPurchases] = useState([]);
    const [sales, setSales] = useState([]);
    const [stats, setStats] = useState({ totalSales: 0, todaySales: 0, saleCount: 0 });
    const [users, setUsers] = useState([]);
    
    // ========== UI STATE ==========
    const [tab, setTab] = useState('dashboard');
    const [showAddProduct, setShowAddProduct] = useState(false);
    const [showAddPurchase, setShowAddPurchase] = useState(false);
    const [showAddSale, setShowAddSale] = useState(false);
    const [showAddUser, setShowAddUser] = useState(false);
    const [showReport, setShowReport] = useState(false);
    const [selectedCat, setSelectedCat] = useState(null);
    const [editingProd, setEditingProd] = useState(null);
    const [reportType, setReportType] = useState('inventory');
    
    // ========== FORM STATE ==========
    const [newProd, setNewProd] = useState({ name: '', price: '', qty: '', catId: '' });
    const [editProd, setEditProd] = useState({ name: '', price: '', qty: '', catId: '' });
    const [newUser, setNewUser] = useState({ name: '', email: '', pwd: '', role: 'staff' });
    const [newPurchase, setNewPurchase] = useState({ supplierId: '', items: [{ prodId: '', qty: '', cost: '' }] });
    const [newSale, setNewSale] = useState({ customerId: '', items: [{ prodId: '', qty: '' }], method: 'cash' });

    const isMobile = window.innerWidth < 768;
    const userRole = user?.role || JSON.parse(localStorage.getItem('user') || '{}')?.role;

    const formatPrice = (p) => parseFloat(p).toFixed(2);

    // ========== LOGIN ==========
    const doLogin = async (e) => {
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

    // ========== LOAD DATA ==========
    const loadData = async () => {
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}` };
        
        try {
            const cRes = await fetch(`${API_URL}/api/v1/categories`, { headers });
            const cData = await cRes.json();
            if (cData.success) setCats(cData.data || []);
            
            const pRes = await fetch(`${API_URL}/api/v1/products`, { headers });
            const pData = await pRes.json();
            if (pData.success) setProds(pData.data || []);
            
            const sRes = await fetch(`${API_URL}/api/v1/suppliers`, { headers });
            const sData = await sRes.json();
            if (sData.success) setSuppliers(sData.data || []);
            
            const cuRes = await fetch(`${API_URL}/api/v1/customers`, { headers });
            const cuData = await cuRes.json();
            if (cuData.success) setCustomers(cuData.data || []);
            
            const puRes = await fetch(`${API_URL}/api/v1/purchases`, { headers });
            const puData = await puRes.json();
            if (puData.success) setPurchases(puData.data || []);
            
            const saRes = await fetch(`${API_URL}/api/v1/sales`, { headers });
            const saData = await saRes.json();
            if (saData.success) setSales(saData.data || []);
            
            const stRes = await fetch(`${API_URL}/api/v1/sales/stats`, { headers });
            const stData = await stRes.json();
            if (stData.success) setStats(stData.data);
            
            const stored = JSON.parse(localStorage.getItem('user') || '{}');
            if (stored?.role === 'admin') {
                const uRes = await fetch(`${API_URL}/api/v1/users`, { headers });
                const uData = await uRes.json();
                if (uData.success) setUsers(uData.data || []);
            }
        } catch (err) {
            console.error(err);
        }
    };

    // ========== PRODUCT CRUD ==========
    const addProduct = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/api/v1/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    name: newProd.name,
                    price: parseFloat(newProd.price),
                    quantity_in_stock: parseInt(newProd.qty),
                    category_id: newProd.catId
                })
            });
            const data = await res.json();
            if (data.success) {
                setShowAddProduct(false);
                setNewProd({ name: '', price: '', qty: '', catId: '' });
                loadData();
                setMsg('Product added!');
            }
        } catch (err) {
            setMsg('Error: ' + err.message);
        }
    };

    const deleteProduct = async (id) => {
        if (!window.confirm('Delete product?')) return;
        const token = localStorage.getItem('token');
        try {
            await fetch(`${API_URL}/api/v1/products/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
            loadData();
            setMsg('Product deleted');
        } catch (err) {
            setMsg('Error: ' + err.message);
        }
    };

    const startEdit = (p) => {
        setEditingProd(p);
        setEditProd({ name: p.name, price: p.price, qty: p.quantity_in_stock, catId: p.category_id });
    };

    const updateProduct = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/api/v1/products/${editingProd.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    name: editProd.name,
                    price: parseFloat(editProd.price),
                    quantity_in_stock: parseInt(editProd.qty),
                    category_id: editProd.catId
                })
            });
            const data = await res.json();
            if (data.success) {
                setEditingProd(null);
                loadData();
                setMsg('Product updated!');
            }
        } catch (err) {
            setMsg('Error: ' + err.message);
        }
    };

    // ========== PURCHASE ==========
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
                setShowAddPurchase(false);
                setNewPurchase({ supplierId: '', items: [{ prodId: '', qty: '', cost: '' }] });
                loadData();
                setMsg('Purchase recorded!');
            }
        } catch (err) {
            setMsg('Error: ' + err.message);
        }
    };

    const addPurchaseItem = () => {
        setNewPurchase({ ...newPurchase, items: [...newPurchase.items, { prodId: '', qty: '', cost: '' }] });
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

    // ========== SALE ==========
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
                setShowAddSale(false);
                setNewSale({ customerId: '', items: [{ prodId: '', qty: '' }], method: 'cash' });
                loadData();
                setMsg('Sale recorded!');
            }
        } catch (err) {
            setMsg('Error: ' + err.message);
        }
    };

    const addSaleItem = () => {
        setNewSale({ ...newSale, items: [...newSale.items, { prodId: '', qty: '' }] });
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

    // ========== USER MGMT ==========
    const addUser = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/api/v1/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ full_name: newUser.name, email: newUser.email, password: newUser.pwd, role: newUser.role })
            });
            const data = await res.json();
            if (data.success) {
                setShowAddUser(false);
                setNewUser({ name: '', email: '', pwd: '', role: 'staff' });
                loadData();
                setMsg('User added!');
            }
        } catch (err) {
            setMsg('Error: ' + err.message);
        }
    };

    const deleteUser = async (id, email) => {
        if (email === 'admin@inventory.com') { setMsg('Cannot delete admin'); return; }
        if (!window.confirm('Delete user?')) return;
        const token = localStorage.getItem('token');
        try {
            await fetch(`${API_URL}/api/v1/users/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
            loadData();
            setMsg('User deleted');
        } catch (err) {
            setMsg('Error: ' + err.message);
        }
    };

    // ========== REPORTS ==========
    const exportCSV = (type) => {
        let headers, data, filename;
        if (type === 'inventory') {
            headers = ['Name', 'Price', 'Stock', 'Category'];
            data = prods.map(p => [p.name, formatPrice(p.price), p.quantity_in_stock, p.category_name || 'Uncategorized']);
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
        setShowReport(false);
    };

    const genPDF = async () => {
        try {
            const { jsPDF } = await import('jspdf');
            const autoTable = (await import('jspdf-autotable')).default;
            const doc = new jsPDF();
            if (reportType === 'inventory') {
                doc.text('Inventory Report', 14, 15);
                doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 25);
                const tableData = prods.map(p => [p.name, formatPrice(p.price), p.quantity_in_stock, p.category_name || 'Uncategorized']);
                autoTable(doc, { startY: 35, head: [['Name', 'Price', 'Stock', 'Category']], body: tableData });
                doc.save('inventory.pdf');
            } else {
                doc.text('Sales Report', 14, 15);
                doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 25);
                const tableData = sales.map(s => [s.sale_number, new Date(s.sale_date).toLocaleDateString(), s.customer_name || 'Walk-in', formatPrice(s.total_amount), s.payment_method]);
                autoTable(doc, { startY: 35, head: [['Invoice', 'Date', 'Customer', 'Total', 'Payment']], body: tableData });
                doc.save('sales.pdf');
            }
            setShowReport(false);
        } catch (err) {
            setMsg('PDF error');
        }
    };

    const logout = () => {
        setLoggedIn(false);
        localStorage.clear();
        setMsg('Logged out');
    };

    // ========== CATEGORY VIEW ==========
    if (selectedCat) {
        const catProds = prods.filter(p => p.category_id === selectedCat);
        const catName = cats.find(c => c.id === selectedCat)?.name || 'Category';
        return (
            <div style={styles.app}>
                <div style={styles.header}>
                    <h2>Inventory System</h2>
                    <div>
                        <span style={styles.badge}>{userRole?.toUpperCase()}</span>
                        <span>Welcome, {user?.full_name}!</span>
                        <button onClick={logout} style={styles.logoutBtn}>Logout</button>
                    </div>
                </div>
                <div style={styles.catHeader}>
                    <button onClick={() => setSelectedCat(null)} style={styles.backBtn}>← Back</button>
                    <h1>{catName}</h1>
                    <p>{catProds.length} products</p>
                </div>
                <div style={styles.section}>
                    {userRole === 'admin' && <button onClick={() => setShowAddProduct(true)} style={styles.greenBtn}>+ Add Product</button>}
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Price</th>
                                <th>Stock</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {catProds.map(p => (
                                <tr key={p.id}>
                                    <td>{p.name}</td>
                                    <td>${formatPrice(p.price)}</td>
                                    <td><span style={{...styles.stock, background: p.quantity_in_stock === 0 ? '#dc3545' : p.quantity_in_stock < 10 ? '#ffc107' : '#28a745'}}>{p.quantity_in_stock}</span></td>
                                    <td>{userRole === 'admin' && <><button onClick={() => startEdit(p)} style={styles.editBtn}>Edit</button><button onClick={() => deleteProduct(p.id)} style={styles.delBtn}>Del</button></>}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {renderModals()}
            </div>
        );
    }

    // ========== MODALS ==========
    const renderModals = () => (
        <>
            {showAddProduct && !selectedCat && userRole === 'admin' && (
                <div style={styles.modal}>
                    <div style={styles.modalBox}>
                        <h3>Add Product</h3>
                        <button onClick={() => setShowAddProduct(false)} style={styles.close}>×</button>
                        <form onSubmit={addProduct}>
                            <input type="text" placeholder="Name" value={newProd.name} onChange={e => setNewProd({...newProd, name: e.target.value})} required />
                            <input type="number" step="0.01" placeholder="Price" value={newProd.price} onChange={e => setNewProd({...newProd, price: e.target.value})} required />
                            <input type="number" placeholder="Stock" value={newProd.qty} onChange={e => setNewProd({...newProd, qty: e.target.value})} required />
                            <select value={newProd.catId} onChange={e => setNewProd({...newProd, catId: e.target.value})} required>
                                <option value="">Select Category</option>
                                {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <button type="submit">Add</button>
                        </form>
                    </div>
                </div>
            )}
            {editingProd && (
                <div style={styles.modal}>
                    <div style={styles.modalBox}>
                        <h3>Edit Product</h3>
                        <button onClick={() => setEditingProd(null)} style={styles.close}>×</button>
                        <form onSubmit={updateProduct}>
                            <input type="text" value={editProd.name} onChange={e => setEditProd({...editProd, name: e.target.value})} required />
                            <input type="number" step="0.01" value={editProd.price} onChange={e => setEditProd({...editProd, price: e.target.value})} required />
                            <input type="number" value={editProd.qty} onChange={e => setEditProd({...editProd, qty: e.target.value})} required />
                            <select value={editProd.catId} onChange={e => setEditProd({...editProd, catId: e.target.value})} required>
                                {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <button type="submit">Update</button>
                        </form>
                    </div>
                </div>
            )}
            {showAddPurchase && (
                <div style={styles.modal}>
                    <div style={styles.modalLarge}>
                        <h3>New Purchase</h3>
                        <button onClick={() => setShowAddPurchase(false)} style={styles.close}>×</button>
                        <form onSubmit={addPurchase}>
                            <select value={newPurchase.supplierId} onChange={e => setNewPurchase({...newPurchase, supplierId: e.target.value})} required>
                                <option value="">Select Supplier</option>
                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.supplier_name}</option>)}
                            </select>
                            <h4>Items</h4>
                            {newPurchase.items.map((item, idx) => (
                                <div key={idx} style={styles.row}>
                                    <select value={item.prodId} onChange={e => updatePurchaseItem(idx, 'prodId', e.target.value)} required>
                                        <option value="">Select Product</option>
                                        {prods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                    <input type="number" placeholder="Qty" value={item.qty} onChange={e => updatePurchaseItem(idx, 'qty', e.target.value)} required />
                                    <input type="number" step="0.01" placeholder="Cost" value={item.cost} onChange={e => updatePurchaseItem(idx, 'cost', e.target.value)} required />
                                    {newPurchase.items.length > 1 && <button type="button" onClick={() => removePurchaseItem(idx)}>×</button>}
                                </div>
                            ))}
                            <button type="button" onClick={addPurchaseItem} style={styles.greenBtn}>+ Add Item</button>
                            <button type="submit">Record</button>
                        </form>
                    </div>
                </div>
            )}
            {showAddSale && (
                <div style={styles.modal}>
                    <div style={styles.modalLarge}>
                        <h3>New Sale</h3>
                        <button onClick={() => setShowAddSale(false)} style={styles.close}>×</button>
                        <form onSubmit={addSale}>
                            <select value={newSale.customerId} onChange={e => setNewSale({...newSale, customerId: e.target.value})}>
                                <option value="">Walk-in</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.customer_name}</option>)}
                            </select>
                            <select value={newSale.method} onChange={e => setNewSale({...newSale, method: e.target.value})}>
                                <option value="cash">Cash</option>
                                <option value="card">Card</option>
                                <option value="mobile_money">Mobile Money</option>
                            </select>
                            <h4>Items</h4>
                            {newSale.items.map((item, idx) => (
                                <div key={idx} style={styles.row}>
                                    <select value={item.prodId} onChange={e => updateSaleItem(idx, 'prodId', e.target.value)} required>
                                        <option value="">Select Product</option>
                                        {prods.map(p => <option key={p.id} value={p.id}>{p.name} (${formatPrice(p.price)}) - Stock: {p.quantity_in_stock}</option>)}
                                    </select>
                                    <input type="number" placeholder="Qty" value={item.qty} onChange={e => updateSaleItem(idx, 'qty', e.target.value)} required />
                                    {newSale.items.length > 1 && <button type="button" onClick={() => removeSaleItem(idx)}>×</button>}
                                </div>
                            ))}
                            <button type="button" onClick={addSaleItem} style={styles.greenBtn}>+ Add Item</button>
                            <button type="submit">Complete Sale</button>
                        </form>
                    </div>
                </div>
            )}
            {showAddUser && userRole === 'admin' && (
                <div style={styles.modal}>
                    <div style={styles.modalBox}>
                        <h3>Add User</h3>
                        <button onClick={() => setShowAddUser(false)} style={styles.close}>×</button>
                        <form onSubmit={addUser}>
                            <input type="text" placeholder="Full Name" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} required />
                            <input type="email" placeholder="Email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} required />
                            <input type="password" placeholder="Password" value={newUser.pwd} onChange={e => setNewUser({...newUser, pwd: e.target.value})} required />
                            <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                                <option value="staff">Staff</option>
                                <option value="admin">Admin</option>
                            </select>
                            <button type="submit">Add</button>
                        </form>
                    </div>
                </div>
            )}
            {showReport && userRole === 'admin' && (
                <div style={styles.modal}>
                    <div style={styles.modalBox}>
                        <h3>Generate Report</h3>
                        <button onClick={() => setShowReport(false)} style={styles.close}>×</button>
                        <div style={{display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 20}}>
                            <button onClick={() => { setReportType('inventory'); genPDF(); }} style={styles.blueBtn}>Inventory PDF</button>
                            <button onClick={() => exportCSV('inventory')} style={styles.greenBtn}>Inventory CSV</button>
                            <button onClick={() => { setReportType('sales'); genPDF(); }} style={styles.blueBtn}>Sales PDF</button>
                            <button onClick={() => exportCSV('sales')} style={styles.greenBtn}>Sales CSV</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );

    if (!loggedIn) {
        return (
            <div style={styles.center}>
                <div style={styles.loginBox}>
                    <h1>Inventory System</h1>
                    <form onSubmit={doLogin}>
                        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
                        <div style={{display: 'flex', gap: 10}}>
                            <input type={showPwd ? "text" : "password"} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
                            <button type="button" onClick={() => setShowPwd(!showPwd)}>{showPwd ? "Hide" : "Show"}</button>
                        </div>
                        <button type="submit">Login</button>
                    </form>
                    {msg && <p>{msg}</p>}
                    <p><strong>Demo:</strong> admin@inventory.com / Admin123</p>
                    <p>staff@inventory.com / Staff123</p>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.app}>
            <div style={styles.header}>
                <h2>Inventory System</h2>
                <div>
                    <span style={styles.badge}>{userRole?.toUpperCase()}</span>
                    <span>Welcome, {user?.full_name}!</span>
                    <button onClick={logout} style={styles.logoutBtn}>Logout</button>
                </div>
            </div>
            
            <div style={styles.tabs}>
                {isMobile ? (
                    <select value={tab} onChange={e => setTab(e.target.value)} style={styles.select}>
                        <option value="dashboard">Dashboard</option>
                        <option value="products">Products</option>
                        <option value="purchases">Purchases</option>
                        <option value="sales">Sales</option>
                        {userRole === 'admin' && <option value="users">Users</option>}
                    </select>
                ) : (
                    <>
                        <button onClick={() => setTab('dashboard')} style={tab === 'dashboard' ? styles.activeTab : styles.tabBtn}>Dashboard</button>
                        <button onClick={() => setTab('products')} style={tab === 'products' ? styles.activeTab : styles.tabBtn}>Products</button>
                        <button onClick={() => setTab('purchases')} style={tab === 'purchases' ? styles.activeTab : styles.tabBtn}>Purchases</button>
                        <button onClick={() => setTab('sales')} style={tab === 'sales' ? styles.activeTab : styles.tabBtn}>Sales</button>
                        {userRole === 'admin' && <button onClick={() => setTab('users')} style={tab === 'users' ? styles.activeTab : styles.tabBtn}>Users</button>}
                    </>
                )}
            </div>
            
            <div style={styles.content}>
                {tab === 'dashboard' && (
                    <>
                        {userRole === 'admin' && <button onClick={() => setShowReport(true)} style={styles.reportBtn}>📊 Generate Report</button>}
                        <div style={styles.grid}>
                            <div style={styles.card}><h3>Products</h3><p>{prods.length}</p></div>
                            <div style={styles.card}><h3>Total Sales</h3><p>${formatPrice(stats.totalSales)}</p></div>
                            <div style={styles.card}><h3>Today's Sales</h3><p>${formatPrice(stats.todaySales)}</p></div>
                            <div style={styles.card}><h3>Transactions</h3><p>{stats.saleCount}</p></div>
                        </div>
                        <div style={styles.catSection}>
                            <h3>Product Categories</h3>
                            <div style={styles.catGrid}>
                                {cats.map(c => (
                                    <div key={c.id} style={styles.catCard} onClick={() => setSelectedCat(c.id)}>
                                        <h4>{c.name}</h4>
                                        <p>{c.description}</p>
                                        <small>{prods.filter(p => p.category_id === c.id).length} products</small>
                                        <div style={styles.viewBtn}>View →</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
                
                {tab === 'products' && (
                    <div>
                        <div style={styles.flexBetween}>
                            <h3>All Products</h3>
                            {userRole === 'admin' && <button onClick={() => setShowAddProduct(true)} style={styles.greenBtn}>+ Add Product</button>}
                        </div>
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Price</th>
                                    <th>Stock</th>
                                    <th>Category</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {prods.map(p => {
                                    const catName = cats.find(c => c.id === p.category_id)?.name || 'Uncategorized';
                                    return (
                                        <tr key={p.id}>
                                            <td>{p.name}</td>
                                            <td>${formatPrice(p.price)}</td>
                                            <td><span style={{...styles.stock, background: p.quantity_in_stock === 0 ? '#dc3545' : p.quantity_in_stock < 10 ? '#ffc107' : '#28a745'}}>{p.quantity_in_stock}</span></td>
                                            <td>{catName}</td>
                                            <td>{userRole === 'admin' && <><button onClick={() => startEdit(p)} style={styles.editBtn}>Edit</button><button onClick={() => deleteProduct(p.id)} style={styles.delBtn}>Del</button></>}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                
                {tab === 'purchases' && (
                    <div>
                        <div style={styles.flexBetween}>
                            <h3>Purchase Orders</h3>
                            <button onClick={() => setShowAddPurchase(true)} style={styles.greenBtn}>+ New Purchase</button>
                        </div>
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th>PO #</th>
                                    <th>Supplier</th>
                                    <th>Date</th>
                                    <th>Total</th>
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
                            </tbody>
                        </table>
                    </div>
                )}
                
                {tab === 'sales' && (
                    <div>
                        <div style={styles.flexBetween}>
                            <h3>Sales Transactions</h3>
                            <button onClick={() => setShowAddSale(true)} style={styles.greenBtn}>+ New Sale</button>
                        </div>
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th>Invoice</th>
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
                            </tbody>
                        </table>
                    </div>
                )}
                
                {tab === 'users' && userRole === 'admin' && (
                    <div>
                        <div style={styles.flexBetween}>
                            <h3>User Management</h3>
                            <button onClick={() => setShowAddUser(true)} style={styles.greenBtn}>+ Add User</button>
                        </div>
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
                                        <td><span style={{...styles.badgeSmall, background: u.role === 'admin' ? '#dc3545' : '#28a745'}}>{u.role}</span></td>
                                        <td><span style={{...styles.badgeSmall, background: u.status === 'active' ? '#28a745' : '#dc3545'}}>{u.status}</span></td>
                                        <td>{u.email !== 'admin@inventory.com' && <button onClick={() => deleteUser(u.id, u.email)} style={styles.delBtn}>Delete</button>}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            {renderModals()}
        </div>
    );
}

// ========== STYLES ==========
const styles = {
    center: { minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f0f2f5' },
    loginBox: { background: 'white', padding: 40, borderRadius: 8, width: 400, textAlign: 'center' },
    app: { minHeight: '100vh', background: '#f0f2f5' },
    header: { background: 'white', padding: '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
    badge: { padding: '4px 8px', background: '#007bff', color: 'white', borderRadius: 4, marginRight: 15 },
    logoutBtn: { padding: '8px 16px', background: '#dc3545', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', marginLeft: 15 },
    tabs: { display: 'flex', gap: 10, padding: '20px 30px 0 30px', background: '#f0f2f5', overflowX: 'auto' },
    tabBtn: { padding: '10px 20px', background: 'white', border: 'none', borderRadius: '8px 8px 0 0', cursor: 'pointer' },
    activeTab: { padding: '10px 20px', background: '#007bff', color: 'white', border: 'none', borderRadius: '8px 8px 0 0', cursor: 'pointer' },
    select: { width: '100%', padding: 10, marginBottom: 10, borderRadius: 8, border: '1px solid #ddd' },
    content: { padding: 20 },
    flexBetween: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 30 },
    card: { background: 'white', padding: 20, borderRadius: 8, textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
    catSection: { background: 'white', padding: 20, borderRadius: 8 },
    catGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 15, marginTop: 15 },
    catCard: { padding: 20, background: '#f8f9fa', borderRadius: 8, cursor: 'pointer', border: '1px solid #e9ecef' },
    viewBtn: { marginTop: 12, padding: '6px 12px', background: '#007bff', color: 'white', textAlign: 'center', borderRadius: 4, fontSize: 12, display: 'inline-block' },
    table: { width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: 8, overflow: 'hidden' },
    stock: { padding: '4px 8px', borderRadius: 4, color: 'white', fontSize: 12 },
    editBtn: { padding: '4px 8px', background: '#ffc107', color: '#333', border: 'none', borderRadius: 4, cursor: 'pointer', marginRight: 5 },
    delBtn: { padding: '4px 8px', background: '#dc3545', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' },
    greenBtn: { padding: '8px 16px', background: '#28a745', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' },
    blueBtn: { padding: '8px 16px', background: '#007bff', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' },
    reportBtn: { padding: '8px 16px', background: '#17a2b8', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', marginBottom: 20 },
    badgeSmall: { padding: '4px 8px', borderRadius: 4, color: 'white', fontSize: 12 },
    modal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modalBox: { background: 'white', padding: 30, borderRadius: 8, width: 400, maxWidth: '90%', position: 'relative' },
    modalLarge: { background: 'white', padding: 30, borderRadius: 8, width: 600, maxWidth: '90%', maxHeight: '80vh', overflowY: 'auto', position: 'relative' },
    close: { position: 'absolute', top: 10, right: 15, fontSize: 24, background: 'none', border: 'none', cursor: 'pointer' },
    row: { display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center' },
    catHeader: { textAlign: 'center', padding: 20 },
    backBtn: { padding: '8px 16px', background: '#6c757d', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', marginBottom: 20 },
    section: { background: 'white', padding: 20, borderRadius: 8, margin: 20 }
};

export default App;