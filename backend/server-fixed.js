// server-fixed.js - Complete Backend with Admin Controls + Activity Log
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// ========== MOCK DATABASE ==========
let users = [
    { id: '1', full_name: 'Admin User', email: 'admin@inventory.com', password_hash: 'Admin123', role: 'admin', status: 'active', created_at: new Date().toISOString() },
    { id: '2', full_name: 'Staff Member', email: 'staff@inventory.com', password_hash: 'Staff123', role: 'staff', status: 'active', created_at: new Date().toISOString() }
];

let categories = [
    { category_id: '1', category_name: 'Electronics', description: 'Electronic devices and accessories' },
    { category_id: '2', category_name: 'Clothing', description: 'Apparel and fashion items' },
    { category_id: '3', category_name: 'Furniture', description: 'Home and office furniture' }
];

let products = [
    { product_id: '1', name: 'Laptop', price: 999.99, quantity_in_stock: 50, category_id: '1', status: 'active', cost_price: 700.00 },
    { product_id: '2', name: 'T-Shirt', price: 19.99, quantity_in_stock: 100, category_id: '2', status: 'active', cost_price: 10.00 },
    { product_id: '3', name: 'Office Chair', price: 199.99, quantity_in_stock: 25, category_id: '3', status: 'active', cost_price: 120.00 }
];

let suppliers = [
    { supplier_id: '1', supplier_name: 'Tech Distributors', email: 'contact@techdist.com', phone: '+1-555-0101', status: 'active' },
    { supplier_id: '2', supplier_name: 'Fashion Wholesale', email: 'sales@fashionwholesale.com', phone: '+1-555-0102', status: 'active' },
    { supplier_id: '3', supplier_name: 'Furniture Mart', email: 'orders@furnituremart.com', phone: '+1-555-0103', status: 'active' }
];

let customers = [
    { customer_id: '1', customer_name: 'John Smith', email: 'john@example.com', phone: '555-0101', loyalty_points: 100, total_purchases: 0 },
    { customer_id: '2', customer_name: 'Sarah Johnson', email: 'sarah@example.com', phone: '555-0102', loyalty_points: 250, total_purchases: 0 }
];

let purchases = [];
let sales = [];

// ========== ACTIVITY LOG ==========
let activityLogs = [];

// Helper to add activity log
const addActivityLog = (userId, userName, action, entityType, entityId, details) => {
    const log = {
        id: String(activityLogs.length + 1),
        user_id: userId,
        user_name: userName,
        action: action,
        entity_type: entityType,
        entity_id: entityId,
        details: details,
        ip_address: '127.0.0.1',
        created_at: new Date().toISOString()
    };
    activityLogs.unshift(log);
    // Keep only last 500 logs
    if (activityLogs.length > 500) activityLogs.pop();
    return log;
};

// ========== HELPER FUNCTIONS ==========
const getProductWithCategory = (product) => ({
    ...product,
    categories: categories.find(c => c.category_id === product.category_id)
});

// Calculate profit/loss
const calculateProfitLoss = () => {
    let totalRevenue = 0;
    let totalCost = 0;
    
    sales.forEach(sale => {
        totalRevenue += sale.total_amount;
        if (sale.items && Array.isArray(sale.items)) {
            sale.items.forEach(item => {
                const product = products.find(p => p.product_id === item.product_id);
                if (product && product.cost_price) {
                    totalCost += (product.cost_price * item.quantity);
                }
            });
        }
    });
    
    return {
        totalRevenue: totalRevenue,
        totalCost: totalCost,
        totalProfit: totalRevenue - totalCost,
        profitMargin: totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue * 100) : 0
    };
};

// Get sales by month for charts
const getSalesByMonth = () => {
    const monthlyData = {};
    sales.forEach(sale => {
        const date = new Date(sale.sale_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { month: monthKey, sales: 0, quantity: 0 };
        }
        monthlyData[monthKey].sales += sale.total_amount;
        if (sale.items) {
            sale.items.forEach(item => {
                monthlyData[monthKey].quantity += item.quantity;
            });
        }
    });
    return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
};

// Get top selling products
const getTopProducts = () => {
    const productSales = {};
    sales.forEach(sale => {
        if (sale.items) {
            sale.items.forEach(item => {
                if (!productSales[item.product_id]) {
                    productSales[item.product_id] = { name: item.product_name, quantity: 0, revenue: 0 };
                }
                productSales[item.product_id].quantity += item.quantity;
                productSales[item.product_id].revenue += item.subtotal;
            });
        }
    });
    return Object.values(productSales).sort((a, b) => b.quantity - a.quantity).slice(0, 5);
};

// ========== AUTH MIDDLEWARE ==========
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ success: false, error: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    
    // Find user by token (simplified - in production use JWT)
    const user = users.find(u => u.id === token || (token.includes('admin') && u.role === 'admin') || (token.includes('staff') && u.role === 'staff'));
    
    if (user) {
        req.user = { id: user.id, role: user.role, name: user.full_name };
        next();
    } else {
        return res.status(401).json({ success: false, error: 'Invalid token' });
    }
};

const adminOnly = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    next();
};

// ========== HEALTH CHECK ==========
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running!' });
});

// ========== LOGIN ==========
app.post('/api/v1/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    const user = users.find(u => u.email === email && u.status === 'active');
    
    if (user && (password === user.password_hash)) {
        const token = user.id; // Simple token = user ID
        addActivityLog(user.id, user.full_name, 'LOGIN', 'user', user.id, `User logged in successfully`);
        return res.json({
            success: true,
            data: {
                user: {
                    user_id: user.id,
                    full_name: user.full_name,
                    email: user.email,
                    role: user.role
                },
                accessToken: token
            }
        });
    }
    
    res.status(401).json({ success: false, error: 'Invalid credentials' });
});

// ========== DASHBOARD STATS ==========
app.get('/api/v1/dashboard/stats', authenticate, async (req, res) => {
    const totalProducts = products.length;
    const totalSales = sales.reduce((sum, s) => sum + s.total_amount, 0);
    const totalPurchases = purchases.reduce((sum, p) => sum + p.total_cost, 0);
    const lowStockProducts = products.filter(p => p.quantity_in_stock <= 10).length;
    const outOfStockProducts = products.filter(p => p.quantity_in_stock === 0).length;
    const recentSales = sales.slice(0, 10);
    const salesByMonth = getSalesByMonth();
    const topProducts = getTopProducts();
    const profitLoss = calculateProfitLoss();
    
    res.json({
        success: true,
        data: {
            totalProducts,
            totalSales,
            totalPurchases,
            lowStockProducts,
            outOfStockProducts,
            recentSales,
            salesByMonth,
            topProducts,
            profitLoss
        }
    });
});

// ========== CATEGORIES ==========
app.get('/api/v1/categories', authenticate, (req, res) => {
    res.json({ success: true, data: categories });
});

// ========== PRODUCTS ==========
app.get('/api/v1/products', authenticate, (req, res) => {
    const productsWithCats = products.map(p => ({
        ...p,
        categories: categories.find(c => c.category_id === p.category_id)
    }));
    res.json({ success: true, data: productsWithCats });
});

app.post('/api/v1/products', authenticate, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    
    const newProduct = {
        product_id: String(products.length + 1),
        name: req.body.name,
        price: parseFloat(req.body.price),
        quantity_in_stock: parseInt(req.body.quantity_in_stock),
        category_id: req.body.category_id,
        cost_price: req.body.cost_price ? parseFloat(req.body.cost_price) : parseFloat(req.body.price) * 0.6,
        status: 'active'
    };
    products.push(newProduct);
    addActivityLog(req.user.id, req.user.name, 'CREATE', 'product', newProduct.product_id, `Added product: ${newProduct.name}`);
    res.json({ success: true, message: 'Product added', data: newProduct });
});

app.put('/api/v1/products/:id', authenticate, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    
    const { id } = req.params;
    const { name, price, quantity_in_stock, category_id, cost_price } = req.body;
    
    const productIndex = products.findIndex(p => p.product_id === id);
    if (productIndex === -1) {
        return res.status(404).json({ success: false, error: 'Product not found' });
    }
    
    const oldProduct = { ...products[productIndex] };
    products[productIndex] = {
        ...products[productIndex],
        name,
        price: parseFloat(price),
        quantity_in_stock: parseInt(quantity_in_stock),
        category_id,
        cost_price: cost_price ? parseFloat(cost_price) : products[productIndex].cost_price
    };
    
    addActivityLog(req.user.id, req.user.name, 'UPDATE', 'product', id, `Updated product from ${oldProduct.name} to ${name}`);
    res.json({ success: true, message: 'Product updated', data: products[productIndex] });
});

app.delete('/api/v1/products/:id', authenticate, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    
    const product = products.find(p => p.product_id === req.params.id);
    products = products.filter(p => p.product_id !== req.params.id);
    addActivityLog(req.user.id, req.user.name, 'DELETE', 'product', req.params.id, `Deleted product: ${product?.name}`);
    res.json({ success: true, message: 'Product deleted' });
});

// ========== SUPPLIERS ==========
app.get('/api/v1/suppliers', authenticate, (req, res) => {
    res.json({ success: true, data: suppliers });
});

// ========== CUSTOMERS ==========
app.get('/api/v1/customers', authenticate, (req, res) => {
    res.json({ success: true, data: customers });
});

app.post('/api/v1/customers', authenticate, (req, res) => {
    const newCustomer = {
        customer_id: String(customers.length + 1),
        customer_name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        loyalty_points: 0,
        total_purchases: 0
    };
    customers.push(newCustomer);
    addActivityLog(req.user.id, req.user.name, 'CREATE', 'customer', newCustomer.customer_id, `Added customer: ${newCustomer.customer_name}`);
    res.json({ success: true, message: 'Customer added', data: newCustomer });
});

// ========== PURCHASES ==========
app.get('/api/v1/purchases', authenticate, (req, res) => {
    const purchasesWithSuppliers = purchases.map(p => ({
        ...p,
        suppliers: suppliers.find(s => s.supplier_id === p.supplier_id)
    }));
    res.json({ success: true, data: purchasesWithSuppliers });
});

app.post('/api/v1/purchases', authenticate, (req, res) => {
    const { supplier_id, items } = req.body;
    
    console.log('Creating purchase with items:', items);
    
    let total_cost = 0;
    const purchaseItems = items.map(item => {
        const product = products.find(p => p.product_id === item.product_id);
        const quantity = parseInt(item.quantity);
        const cost_price = parseFloat(item.cost_price);
        const subtotal = quantity * cost_price;
        total_cost += subtotal;
        
        return {
            product_id: item.product_id,
            product_name: product ? product.name : 'Unknown',
            quantity: quantity,
            cost_price: cost_price,
            subtotal: subtotal
        };
    });
    
    const total_quantity = purchaseItems.reduce((sum, item) => sum + item.quantity, 0);
    
    const newPurchase = {
        purchase_id: String(purchases.length + 1),
        purchase_number: `PO-${Date.now()}`,
        supplier_id,
        total_cost,
        purchase_date: new Date().toISOString(),
        items: purchaseItems,
        items_count: purchaseItems.length,
        total_quantity: total_quantity
    };
    purchases.unshift(newPurchase);
    
    items.forEach(item => {
        const product = products.find(p => p.product_id === item.product_id);
        if (product) {
            product.quantity_in_stock += parseInt(item.quantity);
        }
    });
    
    addActivityLog(req.user.id, req.user.name, 'CREATE', 'purchase', newPurchase.purchase_id, `Recorded purchase ${newPurchase.purchase_number} for ₦${total_cost}`);
    res.json({ success: true, message: 'Purchase recorded', data: newPurchase });
});

// ========== SALES ==========
app.get('/api/v1/sales', authenticate, (req, res) => {
    const salesWithCustomers = sales.map(s => ({
        ...s,
        customer: customers.find(c => c.customer_id === s.customer_id)
    }));
    res.json({ success: true, data: salesWithCustomers });
});

app.post('/api/v1/sales', authenticate, (req, res) => {
    const { customer_id, items, payment_method } = req.body;
    
    for (const item of items) {
        const product = products.find(p => p.product_id === item.product_id);
        if (!product || product.quantity_in_stock < item.quantity) {
            return res.status(400).json({ success: false, error: `Insufficient stock for ${product?.name}` });
        }
    }
    
    let total_amount = 0;
    const saleItems = items.map(item => {
        const product = products.find(p => p.product_id === item.product_id);
        const quantity = parseInt(item.quantity);
        const subtotal = product.price * quantity;
        total_amount += subtotal;
        return {
            product_id: item.product_id,
            product_name: product.name,
            quantity: quantity,
            unit_price: product.price,
            subtotal: subtotal
        };
    });
    
    const total_quantity = saleItems.reduce((sum, item) => sum + item.quantity, 0);
    
    const newSale = {
        sale_id: String(sales.length + 1),
        sale_number: `INV-${Date.now()}`,
        customer_id: customer_id || null,
        sale_date: new Date().toISOString(),
        total_amount,
        payment_method: payment_method || 'cash',
        items: saleItems,
        items_count: saleItems.length,
        total_quantity: total_quantity
    };
    sales.unshift(newSale);
    
    items.forEach(item => {
        const product = products.find(p => p.product_id === item.product_id);
        if (product) product.quantity_in_stock -= parseInt(item.quantity);
    });
    
    if (customer_id) {
        const customer = customers.find(c => c.customer_id === customer_id);
        if (customer) {
            customer.loyalty_points += Math.floor(total_amount / 10);
            customer.total_purchases += total_amount;
        }
    }
    
    addActivityLog(req.user.id, req.user.name, 'CREATE', 'sale', newSale.sale_id, `Recorded sale ${newSale.sale_number} for ₦${total_amount}`);
    res.json({ success: true, message: 'Sale recorded', data: newSale });
});

app.get('/api/v1/sales/stats', authenticate, (req, res) => {
    const totalSales = sales.reduce((sum, s) => sum + s.total_amount, 0);
    const today = new Date().toDateString();
    const todaySales = sales.filter(s => new Date(s.sale_date).toDateString() === today)
        .reduce((sum, s) => sum + s.total_amount, 0);
    
    res.json({ success: true, data: { totalSales, todaySales, saleCount: sales.length } });
});

// ========== PROFIT/LOSS REPORT (ADMIN ONLY) ==========
app.get('/api/v1/reports/profit-loss', authenticate, adminOnly, (req, res) => {
    const profitLoss = calculateProfitLoss();
    const monthlyData = getSalesByMonth();
    const topProducts = getTopProducts();
    
    res.json({ success: true, data: { profitLoss, monthlyData, topProducts } });
});

// ========== ACTIVITY LOGS (ADMIN ONLY) ==========
app.get('/api/v1/activity-logs', authenticate, adminOnly, (req, res) => {
    const { limit = 100, action, entity_type } = req.query;
    let logs = [...activityLogs];
    
    if (action) {
        logs = logs.filter(l => l.action === action);
    }
    if (entity_type) {
        logs = logs.filter(l => l.entity_type === entity_type);
    }
    
    res.json({ success: true, data: logs.slice(0, parseInt(limit)) });
});

// ========== USER MANAGEMENT (ADMIN ONLY) ==========
app.get('/api/v1/users', authenticate, adminOnly, (req, res) => {
    const safeUsers = users.map(u => ({
        id: u.id,
        full_name: u.full_name,
        email: u.email,
        role: u.role,
        status: u.status,
        created_at: u.created_at
    }));
    res.json({ success: true, data: safeUsers });
});

app.post('/api/v1/users', authenticate, adminOnly, (req, res) => {
    const { full_name, email, password, role } = req.body;
    
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
        return res.status(400).json({ success: false, error: 'Email already exists' });
    }
    
    const newUser = {
        id: String(users.length + 1),
        full_name,
        email,
        password_hash: password,
        role: role || 'staff',
        status: 'active',
        created_at: new Date().toISOString()
    };
    
    users.push(newUser);
    addActivityLog(req.user.id, req.user.name, 'CREATE', 'user', newUser.id, `Created new ${role} user: ${full_name} (${email})`);
    
    res.json({ 
        success: true, 
        message: 'User created successfully',
        data: {
            id: newUser.id,
            full_name: newUser.full_name,
            email: newUser.email,
            role: newUser.role,
            status: newUser.status,
            created_at: newUser.created_at
        }
    });
});

app.delete('/api/v1/users/:id', authenticate, adminOnly, (req, res) => {
    const { id } = req.params;
    
    const userToDelete = users.find(u => u.id === id);
    if (!userToDelete) {
        return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    if (userToDelete.email === 'admin@inventory.com') {
        return res.status(400).json({ success: false, error: 'Cannot delete master admin account' });
    }
    
    users = users.filter(u => u.id !== id);
    addActivityLog(req.user.id, req.user.name, 'DELETE', 'user', id, `Deleted user: ${userToDelete.full_name} (${userToDelete.email})`);
    res.json({ success: true, message: 'User deleted successfully' });
});

app.put('/api/v1/users/:id/reset-password', authenticate, adminOnly, (req, res) => {
    const { id } = req.params;
    const { newPassword } = req.body;
    
    const userIndex = users.findIndex(u => u.id === id);
    if (userIndex === -1) {
        return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    users[userIndex].password_hash = newPassword;
    addActivityLog(req.user.id, req.user.name, 'UPDATE', 'user', id, `Reset password for user: ${users[userIndex].full_name}`);
    res.json({ success: true, message: 'Password reset successfully' });
});

// ========== START SERVER ==========
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📝 Admin: admin@inventory.com / Admin123 (Full Access)`);
    console.log(`📝 Staff: staff@inventory.com / Staff123 (Limited Access)`);
    console.log(`📊 Dashboard charts and Profit/Loss reports available`);
    console.log(`📋 Activity logging enabled`);
});