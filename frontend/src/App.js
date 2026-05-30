import React, { useState, useEffect } from 'react';

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [user, setUser] = useState(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [message, setMessage] = useState('');
    
    // Data states
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [purchases, setPurchases] = useState([]);
    const [sales, setSales] = useState([]);
    const [salesStats, setSalesStats] = useState({ totalSales: 0, todaySales: 0, saleCount: 0 });
    
    // UI states
    const [activeTab, setActiveTab] = useState('dashboard');
    const [showProductForm, setShowProductForm] = useState(false);
    const [showPurchaseForm, setShowPurchaseForm] = useState(false);
    const [showSaleForm, setShowSaleForm] = useState(false);
    
    // Form states
    const [newProduct, setNewProduct] = useState({ name: '', price: '', quantity_in_stock: '', category_id: '' });
    const [newPurchase, setNewPurchase] = useState({ supplier_id: '', items: [{ product_id: '', quantity: '', cost_price: '' }] });
    const [newSale, setNewSale] = useState({ customer_id: '', items: [{ product_id: '', quantity: '' }], payment_method: 'cash' });

    https://inventory-management-system-1-yji6.onrender.com

    // Login function
    const handleLogin = async (e) => {
        e.preventDefault();
        setMessage('Logging in...');
        
        try {
            const response = await fetch(`${API_URL}/api/v1/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (data.success) {
                setIsLoggedIn(true);
                setUser(data.data.user);
                localStorage.setItem('token', data.data.accessToken);
                setMessage(`Welcome ${data.data.user.full_name}!`);
                loadAllData();
            } else {
                setMessage('Login failed: ' + data.error);
            }
        } catch (error) {
            setMessage('Error: ' + error.message);
        }
    };

    // Load all data
    const loadAllData = async () => {
        try {
            // Load categories
            const catRes = await fetch(`${API_URL}/api/v1/categories`);
            const catData = await catRes.json();
            if (catData.success) setCategories(catData.data);
            
            // Load products
            const prodRes = await fetch(`${API_URL}/api/v1/products`);
            const prodData = await prodRes.json();
            if (prodData.success) setProducts(prodData.data);
            
            // Load suppliers
            const supRes = await fetch(`${API_URL}/api/v1/suppliers`);
            const supData = await supRes.json();
            if (supData.success) setSuppliers(supData.data);
            
            // Load customers
            const custRes = await fetch(`${API_URL}/api/v1/customers`);
            const custData = await custRes.json();
            if (custData.success) setCustomers(custData.data);
            
            // Load purchases
            const purRes = await fetch(`${API_URL}/api/v1/purchases`);
            const purData = await purRes.json();
            if (purData.success) setPurchases(purData.data);
            
            // Load sales
            const saleRes = await fetch(`${API_URL}/api/v1/sales`);
            const saleData = await saleRes.json();
            if (saleData.success) setSales(saleData.data);
            
            // Load sales stats
            const statsRes = await fetch(`${API_URL}/api/v1/sales/stats`);
            const statsData = await statsRes.json();
            if (statsData.success) setSalesStats(statsData.data);
            
        } catch (error) {
            console.error('Error loading data:', error);
        }
    };

    // Product functions
    const handleAddProduct = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${API_URL}/api/v1/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newProduct.name,
                    price: parseFloat(newProduct.price),
                    quantity_in_stock: parseInt(newProduct.quantity_in_stock),
                    category_id: newProduct.category_id
                })
            });
            const data = await response.json();
            if (data.success) {
                setShowProductForm(false);
                setNewProduct({ name: '', price: '', quantity_in_stock: '', category_id: '' });
                loadAllData();
                setMessage('Product added!');
            }
        } catch (error) {
            setMessage('Error: ' + error.message);
        }
    };

    const handleDeleteProduct = async (productId) => {
        if (!window.confirm('Delete this product?')) return;
        try {
            await fetch(`${API_URL}/api/v1/products/${productId}`, { method: 'DELETE' });
            loadAllData();
            setMessage('Product deleted');
        } catch (error) {
            setMessage('Error: ' + error.message);
        }
    };

    // Purchase functions
    const handleAddPurchase = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${API_URL}/api/v1/purchases`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newPurchase)
            });
            const data = await response.json();
            if (data.success) {
                setShowPurchaseForm(false);
                setNewPurchase({ supplier_id: '', items: [{ product_id: '', quantity: '', cost_price: '' }] });
                loadAllData();
                setMessage('Purchase recorded!');
            }
        } catch (error) {
            setMessage('Error: ' + error.message);
        }
    };

    const addPurchaseItem = () => {
        setNewPurchase({
            ...newPurchase,
            items: [...newPurchase.items, { product_id: '', quantity: '', cost_price: '' }]
        });
    };

    const removePurchaseItem = (index) => {
        const items = [...newPurchase.items];
        items.splice(index, 1);
        setNewPurchase({ ...newPurchase, items });
    };

    const handlePurchaseItemChange = (index, field, value) => {
        const items = [...newPurchase.items];
        items[index][field] = value;
        setNewPurchase({ ...newPurchase, items });
    };

    // Sale functions
    const handleAddSale = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${API_URL}/api/v1/sales`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newSale)
            });
            const data = await response.json();
            if (data.success) {
                setShowSaleForm(false);
                setNewSale({ customer_id: '', items: [{ product_id: '', quantity: '' }], payment_method: 'cash' });
                loadAllData();
                setMessage('Sale recorded!');
            } else {
                setMessage(data.error);
            }
        } catch (error) {
            setMessage('Error: ' + error.message);
        }
    };

    const addSaleItem = () => {
        setNewSale({
            ...newSale,
            items: [...newSale.items, { product_id: '', quantity: '' }]
        });
    };

    const removeSaleItem = (index) => {
        const items = [...newSale.items];
        items.splice(index, 1);
        setNewSale({ ...newSale, items });
    };

    const handleSaleItemChange = (index, field, value) => {
        const items = [...newSale.items];
        items[index][field] = value;
        setNewSale({ ...newSale, items });
    };

    const handleLogout = () => {
        setIsLoggedIn(false);
        setUser(null);
        localStorage.clear();
        setMessage('Logged out');
    };

    const toggleShowPassword = () => setShowPassword(!showPassword);

    // Login Screen
    if (!isLoggedIn) {
        return (
            <div style={styles.container}>
                <div style={styles.loginBox}>
                    <h1 style={styles.title}>Inventory Management System</h1>
                    <form onSubmit={handleLogin} style={styles.form}>
                        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={styles.input} required />
                        <div style={styles.passwordContainer}>
                            <input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={styles.passwordInput} required />
                            <button type="button" onClick={toggleShowPassword} style={styles.showHideButton}>{showPassword ? "Hide" : "Show"}</button>
                        </div>
                        <button type="submit" style={styles.button}>Login</button>
                    </form>
                    {message && <p style={styles.message}>{message}</p>}
                    <div style={styles.demoInfo}>
                        <p><strong>Demo Credentials:</strong></p>
                        <p>Admin: admin@inventory.com / Admin123</p>
                        <p>Staff: staff@inventory.com / Staff123</p>
                    </div>
                </div>
            </div>
        );
    }

    // Dashboard Screen
    return (
        <div style={styles.appContainer}>
            <nav style={styles.navbar}>
                <h2 style={styles.navTitle}>Inventory System</h2>
                <div style={styles.navRight}>
                    <span style={styles.userRole}>{user?.role?.toUpperCase()}</span>
                    <span style={styles.userName}>Welcome, {user?.full_name}!</span>
                    <button onClick={handleLogout} style={styles.logoutButton}>Logout</button>
                </div>
            </nav>
            
            <div style={styles.tabs}>
                <button onClick={() => setActiveTab('dashboard')} style={{...styles.tab, ...(activeTab === 'dashboard' ? styles.activeTab : {})}}>Dashboard</button>
                <button onClick={() => setActiveTab('products')} style={{...styles.tab, ...(activeTab === 'products' ? styles.activeTab : {})}}>Products</button>
                <button onClick={() => setActiveTab('purchases')} style={{...styles.tab, ...(activeTab === 'purchases' ? styles.activeTab : {})}}>Purchases</button>
                <button onClick={() => setActiveTab('sales')} style={{...styles.tab, ...(activeTab === 'sales' ? styles.activeTab : {})}}>Sales</button>
            </div>
            
            <div style={styles.dashboard}>
                {/* Dashboard Tab */}
                {activeTab === 'dashboard' && (
                    <>
                        <div style={styles.statsGrid}>
                            <div style={styles.statCard}><h3>Total Products</h3><p style={styles.statNumber}>{products.length}</p></div>
                            <div style={styles.statCard}><h3>Total Sales</h3><p style={styles.statNumber}>${salesStats.totalSales?.toLocaleString() || 0}</p></div>
                            <div style={styles.statCard}><h3>Today's Sales</h3><p style={styles.statNumber}>${salesStats.todaySales?.toLocaleString() || 0}</p></div>
                            <div style={styles.statCard}><h3>Transactions</h3><p style={styles.statNumber}>{salesStats.saleCount || 0}</p></div>
                        </div>
                        
                        <div style={styles.categoriesSection}>
                            <h3 style={styles.sectionTitle}>Product Categories</h3>
                            <div style={styles.categoryList}>
                                {categories.map((cat) => (
                                    <div key={cat.category_id || cat.id} style={styles.categoryCard}>
                                        <h4>{cat.category_name || cat.name}</h4>
                                        <p>{cat.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
                
                {/* Products Tab */}
                {activeTab === 'products' && (
                    <div style={styles.productsSection}>
                        <div style={styles.sectionHeader}>
                            <h3 style={styles.sectionTitle}>Products</h3>
                            <button onClick={() => setShowProductForm(true)} style={styles.addButton}>+ Add Product</button>
                        </div>
                        <div style={styles.productTable}>
                            <table style={styles.table}>
                                <thead><tr><th>Name</th><th>Price</th><th>Stock</th><th>Category</th><th>Actions</th></tr></thead>
                                <tbody>
                                    {products.map((product) => (
                                        <tr key={product.product_id || product.id}>
                                            <td>{product.name}</td>
                                            <td>${product.price}</td>
                                            <td><span style={{...styles.stockBadge, backgroundColor: product.quantity_in_stock === 0 ? '#dc3545' : product.quantity_in_stock < 10 ? '#ffc107' : '#28a745'}}>{product.quantity_in_stock}</span></td>
                                           <td>
    {(() => {
        const category = categories.find(c => (c.category_id || c.id) === (product.category_id || product.category));
        return category ? (category.category_name || category.name) : 'Uncategorized';
    })()}
</td>
                                            <td><button onClick={() => handleDeleteProduct(product.product_id || product.id)} style={styles.deleteButton}>Delete</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                
                {/* Purchases Tab */}
                {activeTab === 'purchases' && (
                    <div style={styles.productsSection}>
                        <div style={styles.sectionHeader}>
                            <h3 style={styles.sectionTitle}>Purchase Orders</h3>
                            <button onClick={() => setShowPurchaseForm(true)} style={styles.addButton}>+ New Purchase</button>
                        </div>
                        <div style={styles.productTable}>
                            <table style={styles.table}>
                                <thead><tr><th>Purchase #</th><th>Supplier</th><th>Date</th><th>Total Cost</th><th>Items</th></tr></thead>
                                <tbody>
                                    {purchases.map((purchase) => (
                                        <tr key={purchase.purchase_id}>
                                            <td>{purchase.purchase_number}</td>
                                            <td>{purchase.suppliers?.supplier_name || 'Unknown'}</td>
                                            <td>{new Date(purchase.purchase_date).toLocaleDateString()}</td>
                                            <td>${purchase.total_cost?.toFixed(2)}</td>
                                            <td>{purchase.items_count} items</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                
                {/* Sales Tab */}
                {activeTab === 'sales' && (
                    <div style={styles.productsSection}>
                        <div style={styles.sectionHeader}>
                            <h3 style={styles.sectionTitle}>Sales Transactions</h3>
                            <button onClick={() => setShowSaleForm(true)} style={styles.addButton}>+ New Sale</button>
                        </div>
                        <div style={styles.productTable}>
                            <table style={styles.table}>
                                <thead><tr><th>Invoice #</th><th>Date</th><th>Customer</th><th>Total</th><th>Payment</th><th>Items</th></tr></thead>
                                <tbody>
                                    {sales.map((sale) => (
                                        <tr key={sale.sale_id}>
                                            <td>{sale.sale_number}</td>
                                            <td>{new Date(sale.sale_date).toLocaleDateString()}</td>
                                            <td>{sale.customer?.customer_name || 'Walk-in'}</td>
                                            <td>${sale.total_amount?.toFixed(2)}</td>
                                            <td>{sale.payment_method}</td>
                                            <td>{sale.items_count} items</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Product Modal */}
            {showProductForm && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modal}>
                        <div style={styles.modalHeader}><h3>Add Product</h3><button onClick={() => setShowProductForm(false)} style={styles.closeButton}>×</button></div>
                        <form onSubmit={handleAddProduct}>
                            <input type="text" placeholder="Product Name" value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} style={styles.modalInput} required />
                            <input type="number" placeholder="Price" value={newProduct.price} onChange={(e) => setNewProduct({...newProduct, price: e.target.value})} style={styles.modalInput} required />
                            <input type="number" placeholder="Initial Stock" value={newProduct.quantity_in_stock} onChange={(e) => setNewProduct({...newProduct, quantity_in_stock: e.target.value})} style={styles.modalInput} required />
                            <select value={newProduct.category_id} onChange={(e) => setNewProduct({...newProduct, category_id: e.target.value})} style={styles.modalInput} required>
                                <option value="">Select Category</option>
                                {categories.map((cat) => (
                                    <option key={cat.category_id || cat.id} value={cat.category_id || cat.id}>
                                        {cat.category_name || cat.name}
                                    </option>
                                ))}
                            </select>
                            <button type="submit" style={styles.submitButton}>Add Product</button>
                        </form>
                    </div>
                </div>
            )}
            
            {/* Purchase Modal */}
            {showPurchaseForm && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalLarge}>
                        <div style={styles.modalHeader}><h3>New Purchase</h3><button onClick={() => setShowPurchaseForm(false)} style={styles.closeButton}>×</button></div>
                        <form onSubmit={handleAddPurchase}>
                            <select value={newPurchase.supplier_id} onChange={(e) => setNewPurchase({...newPurchase, supplier_id: e.target.value})} style={styles.modalInput} required>
                                <option value="">Select Supplier</option>
                                {suppliers.map((sup) => (
                                    <option key={sup.supplier_id || sup.id} value={sup.supplier_id || sup.id}>
                                        {sup.supplier_name || sup.name}
                                    </option>
                                ))}
                            </select>
                            <h4>Items:</h4>
                            {newPurchase.items.map((item, idx) => (
                                <div key={idx} style={styles.purchaseItemRow}>
                                    <select value={item.product_id} onChange={(e) => handlePurchaseItemChange(idx, 'product_id', e.target.value)} style={styles.itemSelect} required>
                                        <option value="">Select Product</option>
                                        {products.map((p) => (
                                            <option key={p.product_id || p.id} value={p.product_id || p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                    <input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => handlePurchaseItemChange(idx, 'quantity', e.target.value)} style={styles.itemInput} required />
                                    <input type="number" placeholder="Cost" value={item.cost_price} onChange={(e) => handlePurchaseItemChange(idx, 'cost_price', e.target.value)} style={styles.itemInput} required />
                                    {newPurchase.items.length > 1 && <button type="button" onClick={() => removePurchaseItem(idx)} style={styles.removeButton}>×</button>}
                                </div>
                            ))}
                            <button type="button" onClick={addPurchaseItem} style={styles.addItemButton}>+ Add Item</button>
                            <button type="submit" style={styles.submitButton}>Record Purchase</button>
                        </form>
                    </div>
                </div>
            )}
            
            {/* Sale Modal */}
            {showSaleForm && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalLarge}>
                        <div style={styles.modalHeader}><h3>New Sale</h3><button onClick={() => setShowSaleForm(false)} style={styles.closeButton}>×</button></div>
                        <form onSubmit={handleAddSale}>
                            <select value={newSale.customer_id} onChange={(e) => setNewSale({...newSale, customer_id: e.target.value})} style={styles.modalInput}>
                                <option value="">Walk-in Customer</option>
                                {customers.map((c) => (
                                    <option key={c.customer_id || c.id} value={c.customer_id || c.id}>
                                        {c.customer_name || c.name}
                                    </option>
                                ))}
                            </select>
                            <select value={newSale.payment_method} onChange={(e) => setNewSale({...newSale, payment_method: e.target.value})} style={styles.modalInput}>
                                <option value="cash">Cash</option>
                                <option value="card">Card</option>
                                <option value="mobile_money">Mobile Money</option>
                            </select>
                            <h4>Items:</h4>
                            {newSale.items.map((item, idx) => (
                                <div key={idx} style={styles.purchaseItemRow}>
                                    <select value={item.product_id} onChange={(e) => handleSaleItemChange(idx, 'product_id', e.target.value)} style={styles.itemSelect} required>
                                        <option value="">Select Product</option>
                                        {products.map((p) => (
                                            <option key={p.product_id || p.id} value={p.product_id || p.id}>{p.name} (${p.price}) - Stock: {p.quantity_in_stock}</option>
                                        ))}
                                    </select>
                                    <input type="number" placeholder="Quantity" value={item.quantity} onChange={(e) => handleSaleItemChange(idx, 'quantity', e.target.value)} style={styles.itemInput} required />
                                    {newSale.items.length > 1 && <button type="button" onClick={() => removeSaleItem(idx)} style={styles.removeButton}>×</button>}
                                </div>
                            ))}
                            <button type="button" onClick={addSaleItem} style={styles.addItemButton}>+ Add Item</button>
                            <button type="submit" style={styles.submitButton}>Complete Sale</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

const styles = {
    container: { minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f2f5', fontFamily: 'Arial, sans-serif' },
    loginBox: { backgroundColor: 'white', padding: '40px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', width: '400px', textAlign: 'center' },
    title: { color: '#333', marginBottom: '30px', fontSize: '24px' },
    form: { display: 'flex', flexDirection: 'column', gap: '15px' },
    input: { width: '100%', padding: '12px', fontSize: '16px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' },
    passwordContainer: { display: 'flex', gap: '10px', alignItems: 'center' },
    passwordInput: { flex: 1, padding: '12px', fontSize: '16px', border: '1px solid #ddd', borderRadius: '4px' },
    showHideButton: { padding: '12px 15px', fontSize: '14px', backgroundColor: '#f0f0f0', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' },
    button: { padding: '12px', fontSize: '16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '10px' },
    message: { marginTop: '15px', color: '#666' },
    demoInfo: { marginTop: '20px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px', fontSize: '12px', color: '#666' },
    appContainer: { minHeight: '100vh', backgroundColor: '#f0f2f5', fontFamily: 'Arial, sans-serif' },
    navbar: { backgroundColor: '#fff', padding: '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
    navTitle: { margin: 0, color: '#333' },
    navRight: { display: 'flex', alignItems: 'center', gap: '20px' },
    userName: { color: '#666' },
    userRole: { padding: '4px 8px', backgroundColor: '#007bff', color: 'white', borderRadius: '4px', fontSize: '12px' },
    logoutButton: { padding: '8px 16px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    tabs: { display: 'flex', gap: '10px', padding: '20px 30px 0 30px', backgroundColor: '#f0f2f5' },
    tab: { padding: '10px 20px', backgroundColor: 'white', border: 'none', borderRadius: '8px 8px 0 0', cursor: 'pointer', fontSize: '16px' },
    activeTab: { backgroundColor: '#007bff', color: 'white' },
    dashboard: { padding: '30px' },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' },
    statCard: { backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', textAlign: 'center' },
    statNumber: { fontSize: '32px', fontWeight: 'bold', color: '#007bff', margin: '10px 0 0 0' },
    categoriesSection: { backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '30px' },
    sectionTitle: { marginTop: 0, marginBottom: '20px', color: '#333' },
    categoryList: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' },
    categoryCard: { padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '4px', border: '1px solid #e9ecef' },
    productsSection: { backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '30px' },
    sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    addButton: { padding: '8px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
     productTable: {
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch'
    },
    table: { width: '100%', borderCollapse: 'collapse' },
    stockBadge: { padding: '4px 8px', borderRadius: '4px', color: 'white', fontWeight: 'bold', fontSize: '12px' },
    deleteButton: { padding: '4px 8px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modal: { backgroundColor: 'white', padding: '30px', borderRadius: '8px', width: '400px', maxWidth: '90%' },
    modalLarge: { backgroundColor: 'white', padding: '30px', borderRadius: '8px', width: '600px', maxWidth: '90%', maxHeight: '80vh', overflowY: 'auto' },
    modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    closeButton: { background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' },
    modalInput: { width: '100%', padding: '10px', marginBottom: '15px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' },
    submitButton: { width: '100%', padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    purchaseItemRow: { display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' },
    itemSelect: { flex: 2, padding: '8px', border: '1px solid #ddd', borderRadius: '4px' },
    itemInput: { flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px' },
    removeButton: { padding: '8px 12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' },
    addItemButton: { width: '100%', padding: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginBottom: '15px' }
};

export default App;