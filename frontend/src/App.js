import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:5000';

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [user, setUser] = useState(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [message, setMessage] = useState('');
    
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [purchases, setPurchases] = useState([]);
    const [sales, setSales] = useState([]);
    const [salesStats, setSalesStats] = useState({ totalSales: 0, todaySales: 0, saleCount: 0 });
    
    const [activeTab, setActiveTab] = useState('dashboard');
    const [showProductForm, setShowProductForm] = useState(false);
    const [showPurchaseForm, setShowPurchaseForm] = useState(false);
    const [showSaleForm, setShowSaleForm] = useState(false);
    const [selectedCategoryPage, setSelectedCategoryPage] = useState(null);
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportType, setReportType] = useState('inventory');
    
    const [editingProduct, setEditingProduct] = useState(null);
    const [editProductData, setEditProductData] = useState({
        name: '',
        price: '',
        quantity_in_stock: '',
        category_id: ''
    });
    
    const [newProduct, setNewProduct] = useState({ name: '', price: '', quantity_in_stock: '', category_id: '' });
    const [newPurchase, setNewPurchase] = useState({ supplier_id: '', items: [{ product_id: '', quantity: '', cost_price: '' }] });
    const [newSale, setNewSale] = useState({ customer_id: '', items: [{ product_id: '', quantity: '' }], payment_method: 'cash' });

    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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
                localStorage.setItem('user', JSON.stringify(data.data.user));
                setMessage(`Welcome ${data.data.user.full_name}!`);
                loadAllData();
            } else {
                setMessage('Login failed: ' + data.error);
            }
        } catch (error) {
            setMessage('Error: ' + error.message);
        }
    };

    const loadAllData = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };
            
            const catRes = await fetch(`${API_URL}/api/v1/categories`, { headers });
            const catData = await catRes.json();
            if (catData.success) setCategories(catData.data || []);
            
            const prodRes = await fetch(`${API_URL}/api/v1/products`, { headers });
            const prodData = await prodRes.json();
            if (prodData.success) setProducts(prodData.data || []);
            
            const supRes = await fetch(`${API_URL}/api/v1/suppliers`, { headers });
            const supData = await supRes.json();
            if (supData.success) setSuppliers(supData.data || []);
            
            const custRes = await fetch(`${API_URL}/api/v1/customers`, { headers });
            const custData = await custRes.json();
            if (custData.success) setCustomers(custData.data || []);
            
            const purRes = await fetch(`${API_URL}/api/v1/purchases`, { headers });
            const purData = await purRes.json();
            if (purData.success) setPurchases(purData.data || []);
            
            const saleRes = await fetch(`${API_URL}/api/v1/sales`, { headers });
            const saleData = await saleRes.json();
            if (saleData.success) setSales(saleData.data || []);
            
            const statsRes = await fetch(`${API_URL}/api/v1/sales/stats`, { headers });
            const statsData = await statsRes.json();
            if (statsData.success) setSalesStats(statsData.data);
            
        } catch (error) {
            console.error('Error loading data:', error);
        }
    };

    const handleAddProduct = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        try {
            const response = await fetch(`${API_URL}/api/v1/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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
        const token = localStorage.getItem('token');
        try {
            await fetch(`${API_URL}/api/v1/products/${productId}`, { 
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            loadAllData();
            setMessage('Product deleted');
        } catch (error) {
            setMessage('Error: ' + error.message);
        }
    };

    const handleEditProduct = (product) => {
        setEditingProduct(product);
        setEditProductData({
            name: product.name,
            price: product.price,
            quantity_in_stock: product.quantity_in_stock,
            category_id: product.category_id
        });
    };

    const handleUpdateProduct = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        try {
            const productId = editingProduct.id;
            const response = await fetch(`${API_URL}/api/v1/products/${productId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    name: editProductData.name,
                    price: parseFloat(editProductData.price),
                    quantity_in_stock: parseInt(editProductData.quantity_in_stock),
                    category_id: editProductData.category_id
                })
            });
            const data = await response.json();
            if (data.success) {
                setEditingProduct(null);
                loadAllData();
                setMessage('Product updated!');
            }
        } catch (error) {
            setMessage('Error: ' + error.message);
        }
    };

    const handleAddPurchase = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        try {
            const response = await fetch(`${API_URL}/api/v1/purchases`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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

    const handleAddSale = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        try {
            const response = await fetch(`${API_URL}/api/v1/sales`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(newSale)
            });
            const data = await response.json();
            if (data.success) {
                setShowSaleForm(false);
                setNewSale({ customer_id: '', items: [{ product_id: '', quantity: '' }], payment_method: 'cash' });
                loadAllData();
                setMessage('Sale recorded!');
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

    const exportToCSV = (type) => {
        let data = [];
        let headers = [];
        let filename = '';
        
        if (type === 'inventory') {
            headers = ['Product Name', 'Price', 'Stock', 'Category'];
            data = products.map(p => [p.name, p.price, p.quantity_in_stock, p.categories?.category_name || 'Uncategorized']);
            filename = 'inventory-report.csv';
        } else if (type === 'sales') {
            headers = ['Invoice #', 'Date', 'Customer', 'Total', 'Payment Method', 'Items'];
            data = sales.map(s => [s.sale_number, new Date(s.sale_date).toLocaleDateString(), s.customer?.customer_name || 'Walk-in', s.total_amount, s.payment_method, s.items_count]);
            filename = 'sales-report.csv';
        }
        
        let csvContent = headers.join(',') + '\n';
        data.forEach(row => {
            csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
        });
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        setShowReportModal(false);
        setMessage('Report downloaded!');
    };

    const generatePDF = async () => {
        try {
            const { jsPDF } = await import('jspdf');
            const autoTable = (await import('jspdf-autotable')).default;
            const doc = new jsPDF();
            
            if (reportType === 'inventory') {
                doc.setFontSize(18);
                doc.text('Inventory Report', 14, 15);
                doc.setFontSize(10);
                doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 25);
                doc.text(`Total Products: ${products.length}`, 14, 35);
                
                const tableData = products.map(p => [
                    p.name,
                    `$${p.price}`,
                    p.quantity_in_stock,
                    p.categories?.category_name || 'Uncategorized'
                ]);
                
                autoTable(doc, {
                    startY: 45,
                    head: [['Product Name', 'Price', 'Stock', 'Category']],
                    body: tableData,
                    theme: 'striped',
                    headStyles: { fillColor: [0, 123, 255], textColor: 255 },
                    styles: { fontSize: 9, cellPadding: 3 },
                });
                
                doc.save('inventory-report.pdf');
            } else if (reportType === 'sales') {
                doc.setFontSize(18);
                doc.text('Sales Report', 14, 15);
                doc.setFontSize(10);
                doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 25);
                doc.text(`Total Sales: $${salesStats.totalSales?.toLocaleString() || 0}`, 14, 35);
                doc.text(`Today's Sales: $${salesStats.todaySales?.toLocaleString() || 0}`, 14, 45);
                doc.text(`Total Transactions: ${salesStats.saleCount || 0}`, 14, 55);
                
                const tableData = sales.map(s => [
                    s.sale_number,
                    new Date(s.sale_date).toLocaleDateString(),
                    s.customer?.customer_name || 'Walk-in',
                    `$${s.total_amount?.toFixed(2)}`,
                    s.payment_method,
                    `${s.items_count} items`
                ]);
                
                autoTable(doc, {
                    startY: 65,
                    head: [['Invoice #', 'Date', 'Customer', 'Total', 'Payment', 'Items']],
                    body: tableData,
                    theme: 'striped',
                    headStyles: { fillColor: [0, 123, 255], textColor: 255 },
                    styles: { fontSize: 8, cellPadding: 2 },
                });
                
                doc.save('sales-report.pdf');
            }
            
            setShowReportModal(false);
            setMessage('Report downloaded!');
        } catch (error) {
            setMessage('Error generating PDF.');
        }
    };

    const handleLogout = () => {
        setIsLoggedIn(false);
        setUser(null);
        localStorage.clear();
        setMessage('Logged out');
    };

    const toggleShowPassword = () => setShowPassword(!showPassword);

    const getFilteredProducts = () => {
        if (!selectedCategoryPage) return [];
        return products.filter(p => p.category_id === selectedCategoryPage);
    };

    const getCategoryName = (categoryId) => {
        const category = categories.find(c => c.id === categoryId);
        return category ? category.name : 'Category';
    };

    const currentUserRole = user?.role || JSON.parse(localStorage.getItem('user') || '{}')?.role;
    const formatPrice = (price) => parseFloat(price).toFixed(2);

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

    if (selectedCategoryPage) {
        const categoryProducts = getFilteredProducts();
        const categoryName = getCategoryName(selectedCategoryPage);
        
        return (
            <div style={styles.appContainer}>
                <nav style={styles.navbar}>
                    <h2 style={styles.navTitle}>Inventory System</h2>
                    <div style={styles.navRight}>
                        <span style={styles.userRole}>{currentUserRole?.toUpperCase()}</span>
                        <span style={styles.userName}>Welcome, {user?.full_name}!</span>
                        <button onClick={handleLogout} style={styles.logoutButton}>Logout</button>
                    </div>
                </nav>
                
                <div style={styles.categoryPageContainer}>
                    <div style={styles.categoryPageHeader}>
                        <button onClick={() => setSelectedCategoryPage(null)} style={styles.backButton}>← Back to Dashboard</button>
                        <h1 style={styles.categoryPageTitle}>{categoryName}</h1>
                        <p style={styles.categoryPageCount}>{categoryProducts.length} products in this category</p>
                    </div>
                    
                    <div style={styles.productsSection}>
                        <div style={styles.sectionHeader}>
                            <h3 style={styles.sectionTitle}>Products in {categoryName}</h3>
                            {currentUserRole === 'admin' && <button onClick={() => setShowProductForm(true)} style={styles.addButton}>+ Add Product</button>}
                        </div>
                        <div style={styles.productTable}>
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
                                    {categoryProducts.map((product) => (
                                        <tr key={product.id}>
                                            <td>{product.name}</td>
                                            <td>${formatPrice(product.price)}</td>
                                            <td>
                                                <span style={{
                                                    ...styles.stockBadge,
                                                    backgroundColor: product.quantity_in_stock === 0 ? '#dc3545' : 
                                                                   product.quantity_in_stock < 10 ? '#ffc107' : '#28a745'
                                                }}>
                                                    {product.quantity_in_stock}
                                                </span>
                                            </td>
                                            <td>{categoryName}</td>
                                            <td>
                                                {currentUserRole === 'admin' && (
                                                    <>
                                                        <button onClick={() => handleEditProduct(product)} style={styles.editButton}>Edit</button>
                                                        <button onClick={() => handleDeleteProduct(product.id)} style={styles.deleteButton}>Delete</button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                
                {showProductForm && (
                    <div style={styles.modalOverlay}>
                        <div style={styles.modal}>
                            <div style={styles.modalHeader}><h3>Add Product to {categoryName}</h3><button onClick={() => setShowProductForm(false)} style={styles.closeButton}>×</button></div>
                            <form onSubmit={handleAddProduct}>
                                <input type="text" placeholder="Product Name" value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} style={styles.modalInput} required />
                                <input type="number" step="0.01" placeholder="Price" value={newProduct.price} onChange={(e) => setNewProduct({...newProduct, price: e.target.value})} style={styles.modalInput} required />
                                <input type="number" placeholder="Initial Stock" value={newProduct.quantity_in_stock} onChange={(e) => setNewProduct({...newProduct, quantity_in_stock: e.target.value})} style={styles.modalInput} required />
                                <button type="submit" style={styles.submitButton}>Add Product</button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div style={styles.appContainer}>
            <nav style={styles.navbar}>
                <h2 style={styles.navTitle}>Inventory System</h2>
                <div style={styles.navRight}>
                    <span style={styles.userRole}>{currentUserRole?.toUpperCase()}</span>
                    <span style={styles.userName}>Welcome, {user?.full_name}!</span>
                    <button onClick={handleLogout} style={styles.logoutButton}>Logout</button>
                </div>
            </nav>
            
            <div style={styles.tabs}>
                {isMobile ? (
                    <select value={activeTab} onChange={(e) => setActiveTab(e.target.value)} style={styles.mobileSelect}>
                        <option value="dashboard">Dashboard</option>
                        <option value="products">Products</option>
                        <option value="purchases">Purchases</option>
                        <option value="sales">Sales</option>
                    </select>
                ) : (
                    <>
                        <button onClick={() => setActiveTab('dashboard')} style={{...styles.tab, ...(activeTab === 'dashboard' ? styles.activeTab : {})}}>Dashboard</button>
                        <button onClick={() => setActiveTab('products')} style={{...styles.tab, ...(activeTab === 'products' ? styles.activeTab : {})}}>Products</button>
                        <button onClick={() => setActiveTab('purchases')} style={{...styles.tab, ...(activeTab === 'purchases' ? styles.activeTab : {})}}>Purchases</button>
                        <button onClick={() => setActiveTab('sales')} style={{...styles.tab, ...(activeTab === 'sales' ? styles.activeTab : {})}}>Sales</button>
                    </>
                )}
            </div>
            
            <div style={styles.dashboard}>
                {activeTab === 'dashboard' && (
                    <>
                        {currentUserRole === 'admin' && (
                            <div style={styles.reportButtonContainer}>
                                <button onClick={() => setShowReportModal(true)} style={styles.reportButton}>📊 Generate Report</button>
                            </div>
                        )}
                        
                        <div style={styles.statsGrid}>
                            <div style={styles.statCard}><h3>Total Products</h3><p style={styles.statNumber}>{products.length}</p></div>
                            <div style={styles.statCard}><h3>Total Sales</h3><p style={styles.statNumber}>${formatPrice(salesStats.totalSales || 0)}</p></div>
                            <div style={styles.statCard}><h3>Today's Sales</h3><p style={styles.statNumber}>${formatPrice(salesStats.todaySales || 0)}</p></div>
                            <div style={styles.statCard}><h3>Transactions</h3><p style={styles.statNumber}>{salesStats.saleCount || 0}</p></div>
                        </div>
                        
                        <div style={styles.categoriesSection}>
                            <h3 style={styles.sectionTitle}>Product Categories</h3>
                            <div style={styles.categoryList}>
                                {categories.map((cat) => {
                                    const productCount = products.filter(p => p.category_id === cat.id).length;
                                    return (
                                        <div 
                                            key={cat.id} 
                                            style={styles.categoryCard}
                                            onClick={() => setSelectedCategoryPage(cat.id)}
                                        >
                                            <h4>{cat.name}</h4>
                                            <p>{cat.description}</p>
                                            <small style={styles.productCount}>{productCount} product(s)</small>
                                            <div style={styles.viewProductsButton}>View Products →</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        
                        <div style={styles.productsSection}>
                            <h3 style={styles.sectionTitle}>Recent Sales</h3>
                            <div style={styles.productTable}>
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
                                        {sales.slice(0, 5).map((sale) => (
                                            <tr key={sale.id}>
                                                <td>{sale.sale_number}</td>
                                                <td>{new Date(sale.sale_date).toLocaleDateString()}</td>
                                                <td>{sale.customer?.customer_name || 'Walk-in'}</td>
                                                <td>${formatPrice(sale.total_amount)}</td>
                                                <td>{sale.items_count} items</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
                
                {activeTab === 'products' && (
                    <div style={styles.productsSection}>
                        <div style={styles.sectionHeader}>
                            <h3 style={styles.sectionTitle}>All Products</h3>
                            {currentUserRole === 'admin' && <button onClick={() => setShowProductForm(true)} style={styles.addButton}>+ Add Product</button>}
                        </div>
                        <div style={styles.productTable}>
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
                                    {products.map((product) => {
                                        const categoryName = categories.find(c => c.id === product.category_id)?.name || 'Uncategorized';
                                        return (
                                            <tr key={product.id}>
                                                <td>{product.name}</td>
                                                <td>${formatPrice(product.price)}</td>
                                                <td>
                                                    <span style={{
                                                        ...styles.stockBadge,
                                                        backgroundColor: product.quantity_in_stock === 0 ? '#dc3545' : 
                                                                       product.quantity_in_stock < 10 ? '#ffc107' : '#28a745'
                                                    }}>
                                                        {product.quantity_in_stock}
                                                    </span>
                                                </td>
                                                <td>{categoryName}</td>
                                                <td>
                                                    {currentUserRole === 'admin' && (
                                                        <>
                                                            <button onClick={() => handleEditProduct(product)} style={styles.editButton}>Edit</button>
                                                            <button onClick={() => handleDeleteProduct(product.id)} style={styles.deleteButton}>Delete</button>
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                
                {activeTab === 'purchases' && (
                    <div style={styles.productsSection}>
                        <div style={styles.sectionHeader}>
                            <h3 style={styles.sectionTitle}>Purchase Orders</h3>
                            <button onClick={() => setShowPurchaseForm(true)} style={styles.addButton}>+ New Purchase</button>
                        </div>
                        <div style={styles.productTable}>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Purchase #</th>
                                        <th>Supplier</th>
                                        <th>Date</th>
                                        <th>Total Cost</th>
                                        <th>Items</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {purchases.map((purchase) => (
                                        <tr key={purchase.id}>
                                            <td>{purchase.purchase_number}</td>
                                            <td>{purchase.supplier_name || 'Unknown'}</td>
                                            <td>{new Date(purchase.purchase_date).toLocaleDateString()}</td>
                                            <td>${formatPrice(purchase.total_cost)}</td>
                                            <td>{purchase.items_count} items\n
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                
                {activeTab === 'sales' && (
                    <div style={styles.productsSection}>
                        <div style={styles.sectionHeader}>
                            <h3 style={styles.sectionTitle}>Sales Transactions</h3>
                            <button onClick={() => setShowSaleForm(true)} style={styles.addButton}>+ New Sale</button>
                        </div>
                        <div style={styles.productTable}>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Invoice #</th>
                                        <th>Date</th>
                                        <th>Customer</th>
                                        <th>Total</th>
                                        <th>Payment</th>
                                        <th>Items</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sales.map((sale) => (
                                        <tr key={sale.id}>
                                            <td>{sale.sale_number}</td>
                                            <td>{new Date(sale.sale_date).toLocaleDateString()}</td>
                                            <td>{sale.customer?.customer_name || 'Walk-in'}</td>
                                            <td>${formatPrice(sale.total_amount)}</td>
                                            <td>{sale.payment_method}</td>
                                            <td>{sale.items_count} items\n
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Modals */}
            {showProductForm && !selectedCategoryPage && currentUserRole === 'admin' && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modal}>
                        <div style={styles.modalHeader}><h3>Add Product</h3><button onClick={() => setShowProductForm(false)} style={styles.closeButton}>×</button></div>
                        <form onSubmit={handleAddProduct}>
                            <input type="text" placeholder="Product Name" value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} style={styles.modalInput} required />
                            <input type="number" step="0.01" placeholder="Price" value={newProduct.price} onChange={(e) => setNewProduct({...newProduct, price: e.target.value})} style={styles.modalInput} required />
                            <input type="number" placeholder="Initial Stock" value={newProduct.quantity_in_stock} onChange={(e) => setNewProduct({...newProduct, quantity_in_stock: e.target.value})} style={styles.modalInput} required />
                            <select value={newProduct.category_id} onChange={(e) => setNewProduct({...newProduct, category_id: e.target.value})} style={styles.modalInput} required>
                                <option value="">Select Category</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <button type="submit" style={styles.submitButton}>Add Product</button>
                        </form>
                    </div>
                </div>
            )}
            
            {editingProduct && currentUserRole === 'admin' && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modal}>
                        <div style={styles.modalHeader}><h3>Edit Product</h3><button onClick={() => setEditingProduct(null)} style={styles.closeButton}>×</button></div>
                        <form onSubmit={handleUpdateProduct}>
                            <input type="text" value={editProductData.name} onChange={(e) => setEditProductData({...editProductData, name: e.target.value})} style={styles.modalInput} required />
                            <input type="number" step="0.01" value={editProductData.price} onChange={(e) => setEditProductData({...editProductData, price: e.target.value})} style={styles.modalInput} required />
                            <input type="number" value={editProductData.quantity_in_stock} onChange={(e) => setEditProductData({...editProductData, quantity_in_stock: e.target.value})} style={styles.modalInput} required />
                            <select value={editProductData.category_id} onChange={(e) => setEditProductData({...editProductData, category_id: e.target.value})} style={styles.modalInput} required>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <button type="submit" style={styles.submitButton}>Update Product</button>
                        </form>
                    </div>
                </div>
            )}
            
            {showPurchaseForm && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalLarge}>
                        <div style={styles.modalHeader}><h3>New Purchase</h3><button onClick={() => setShowPurchaseForm(false)} style={styles.closeButton}>×</button></div>
                        <form onSubmit={handleAddPurchase}>
                            <select value={newPurchase.supplier_id} onChange={(e) => setNewPurchase({...newPurchase, supplier_id: e.target.value})} style={styles.modalInput} required>
                                <option value="">Select Supplier</option>
                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.supplier_name}</option>)}
                            </select>
                            <h4>Items:</h4>
                            {newPurchase.items.map((item, idx) => (
                                <div key={idx} style={styles.purchaseItemRow}>
                                    <select value={item.product_id} onChange={(e) => handlePurchaseItemChange(idx, 'product_id', e.target.value)} style={styles.itemSelect} required>
                                        <option value="">Select Product</option>
                                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                    <input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => handlePurchaseItemChange(idx, 'quantity', e.target.value)} style={styles.itemInput} required />
                                    <input type="number" step="0.01" placeholder="Cost" value={item.cost_price} onChange={(e) => handlePurchaseItemChange(idx, 'cost_price', e.target.value)} style={styles.itemInput} required />
                                    {newPurchase.items.length > 1 && <button type="button" onClick={() => removePurchaseItem(idx)} style={styles.removeButton}>×</button>}
                                </div>
                            ))}
                            <button type="button" onClick={addPurchaseItem} style={styles.addItemButton}>+ Add Item</button>
                            <button type="submit" style={styles.submitButton}>Record Purchase</button>
                        </form>
                    </div>
                </div>
            )}
            
            {showSaleForm && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalLarge}>
                        <div style={styles.modalHeader}><h3>New Sale</h3><button onClick={() => setShowSaleForm(false)} style={styles.closeButton}>×</button></div>
                        <form onSubmit={handleAddSale}>
                            <select value={newSale.customer_id} onChange={(e) => setNewSale({...newSale, customer_id: e.target.value})} style={styles.modalInput}>
                                <option value="">Walk-in Customer</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.customer_name}</option>)}
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
                                        {products.map(p => <option key={p.id} value={p.id}>{p.name} (${formatPrice(p.price)}) - Stock: {p.quantity_in_stock}</option>)}
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
            
            {showReportModal && currentUserRole === 'admin' && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modal}>
                        <div style={styles.modalHeader}><h3>Generate Report</h3><button onClick={() => setShowReportModal(false)} style={styles.closeButton}>×</button></div>
                        <div style={styles.reportOptions}>
                            <h4 style={styles.reportSubtitle}>📦 Inventory Report</h4>
                            <div style={styles.reportButtonGroup}>
                                <button onClick={() => { setReportType('inventory'); generatePDF(); }} style={styles.reportOptionButton}>PDF</button>
                                <button onClick={() => exportToCSV('inventory')} style={styles.reportOptionButtonCSV}>CSV</button>
                            </div>
                            <h4 style={styles.reportSubtitle}>💰 Sales Report</h4>
                            <div style={styles.reportButtonGroup}>
                                <button onClick={() => { setReportType('sales'); generatePDF(); }} style={styles.reportOptionButton}>PDF</button>
                                <button onClick={() => exportToCSV('sales')} style={styles.reportOptionButtonCSV}>CSV</button>
                            </div>
                        </div>
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
    tabs: { display: 'flex', gap: '10px', padding: '20px 30px 0 30px', backgroundColor: '#f0f2f5', overflowX: 'auto', WebkitOverflowScrolling: 'touch' },
    tab: { padding: '10px 20px', backgroundColor: 'white', border: 'none', borderRadius: '8px 8px 0 0', cursor: 'pointer', fontSize: '16px', whiteSpace: 'nowrap' },
    mobileSelect: { width: '100%', padding: '12px', fontSize: '16px', borderRadius: '8px', border: '1px solid #ddd', backgroundColor: 'white', marginBottom: '10px' },
    activeTab: { backgroundColor: '#007bff', color: 'white' },
    dashboard: { padding: '15px' },
    reportButtonContainer: { display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' },
    reportButton: { padding: '10px 20px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' },
    reportOptions: { display: 'flex', flexDirection: 'column', gap: '15px', padding: '10px' },
    reportSubtitle: { fontSize: '14px', fontWeight: 'bold', margin: '0 0 8px 0', color: '#555', textAlign: 'center' },
    reportButtonGroup: { display: 'flex', gap: '10px', justifyContent: 'center' },
    reportOptionButton: { padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' },
    reportOptionButtonCSV: { padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' },
    statCard: { backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', textAlign: 'center' },
    statNumber: { fontSize: '32px', fontWeight: 'bold', color: '#007bff', margin: '10px 0 0 0' },
    categoriesSection: { backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '30px' },
    sectionTitle: { marginTop: 0, marginBottom: '20px', color: '#333' },
    sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' },
    categoryList: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' },
    categoryCard: { padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef', cursor: 'pointer', transition: 'all 0.3s ease' },
    productCount: { display: 'block', marginTop: '8px', fontSize: '12px', color: '#666' },
    viewProductsButton: { marginTop: '12px', padding: '6px 12px', backgroundColor: '#007bff', color: 'white', textAlign: 'center', borderRadius: '4px', fontSize: '12px', display: 'inline-block' },
    productsSection: { backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '30px' },
    addButton: { padding: '8px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    productTable: { overflowX: 'auto', WebkitOverflowScrolling: 'touch' },
    table: { width: '100%', borderCollapse: 'collapse', minWidth: '600px' },
    stockBadge: { padding: '4px 8px', borderRadius: '4px', color: 'white', fontWeight: 'bold', fontSize: '12px' },
    editButton: { padding: '4px 8px', backgroundColor: '#ffc107', color: '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '8px' },
    deleteButton: { padding: '4px 8px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modal: { backgroundColor: 'white', padding: '30px', borderRadius: '8px', width: '400px', maxWidth: '90%' },
    modalLarge: { backgroundColor: 'white', padding: '30px', borderRadius: '8px', width: '600px', maxWidth: '90%', maxHeight: '80vh', overflowY: 'auto' },
    modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    closeButton: { background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' },
    modalInput: { width: '100%', padding: '10px', marginBottom: '15px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' },
    submitButton: { width: '100%', padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    purchaseItemRow: { display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center', flexWrap: 'wrap' },
    itemSelect: { flex: 2, padding: '8px', border: '1px solid #ddd', borderRadius: '4px', minWidth: '120px' },
    itemInput: { flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px', minWidth: '80px' },
    removeButton: { padding: '8px 12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' },
    addItemButton: { width: '100%', padding: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginBottom: '15px' },
    noData: { textAlign: 'center', padding: '40px', color: '#666' },
    categoryPageContainer: { padding: '20px' },
    categoryPageHeader: { marginBottom: '30px', textAlign: 'center' },
    categoryPageTitle: { fontSize: '32px', color: '#333', marginBottom: '10px' },
    categoryPageCount: { fontSize: '14px', color: '#666' },
    backButton: { padding: '8px 16px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginBottom: '20px' }
};

export default App;