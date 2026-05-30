// server-fixed.js - Complete Backend with Admin Controls
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// ========== MOCK DATABASE ==========
let users = [
    { id: '1', full_name: 'Admin User', email: 'admin@inventory.com', password_hash: 'Admin123', role: 'admin', status: 'active' },
    { id: '2', full_name: 'Staff Member', email: 'staff@inventory.com', password_hash: 'Staff123', role: 'staff', status: 'active' }
];

// FIXED: Categories with correct field names that frontend expects
let categories = [
    { category_id: '1', category_name: 'Electronics', description: 'Electronic devices and accessories' },
    { category_id: '2', category_name: 'Clothing', description: 'Apparel and fashion items' },
    { category_id: '3', category_name: 'Furniture', description: 'Home and office furniture' }
];

// FIXED: Products with category_id matching categories
let products = [
    { product_id: '1', name: 'Laptop', price: 999.99, quantity_in_stock: 50, category_id: '1', status: 'active' },
    { product_id: '2', name: 'T-Shirt', price: 19.99, quantity_in_stock: 100, category_id: '2', status: 'active' },
    { product_id: '3', name: 'Office Chair', price: 199.99, quantity_in_stock: 25, category_id: '3', status: 'active' }
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

// ========== HELPER FUNCTIONS ==========
const getProductWithCategory = (product) => ({
    ...product,
    categories: categories.find(c => c.category_id === product.category_id)
});

// ========== AUTH MIDDLEWARE ==========
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ success: false, error: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    
    if (token && token.includes('admin')) {
        req.user = { id: '1', role: 'admin' };
    } else if (token && token.includes('staff')) {
        req.user = { id: '2', role: 'staff' };
    } else {
        return res.status(401).json({ success: false, error: 'Invalid token' });
    }
    next();
};

// ADMIN ONLY MIDDLEWARE
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
        const token = user.role === 'admin' ? 'admin-token-123' : 'staff-token-456';
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
        status: 'active'
    };
    products.push(newProduct);
    res.json({ success: true, message: 'Product added', data: newProduct });
});

app.put('/api/v1/products/:id', authenticate, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    
    const { id } = req.params;
    const { name, price, quantity_in_stock, category_id } = req.body;
    
    const productIndex = products.findIndex(p => p.product_id === id);
    if (productIndex === -1) {
        return res.status(404).json({ success: false, error: 'Product not found' });
    }
    
    products[productIndex] = {
        ...products[productIndex],
        name,
        price: parseFloat(price),
        quantity_in_stock: parseInt(quantity_in_stock),
        category_id
    };
    
    res.json({ success: true, message: 'Product updated', data: products[productIndex] });
});

app.delete('/api/v1/products/:id', authenticate, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    
    products = products.filter(p => p.product_id !== req.params.id);
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
    const total_cost = items.reduce((sum, item) => sum + (item.quantity * item.cost_price), 0);
    
    const newPurchase = {
        purchase_id: String(purchases.length + 1),
        purchase_number: `PO-${Date.now()}`,
        supplier_id,
        total_cost,
        purchase_date: new Date().toISOString(),
        items_count: items.length
    };
    purchases.unshift(newPurchase);
    
    items.forEach(item => {
        const product = products.find(p => p.product_id === item.product_id);
        if (product) product.quantity_in_stock += parseInt(item.quantity);
    });
    
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
        const subtotal = product.price * item.quantity;
        total_amount += subtotal;
        return {
            product_id: item.product_id,
            product_name: product.name,
            quantity: item.quantity,
            unit_price: product.price,
            subtotal
        };
    });
    
    const newSale = {
        sale_id: String(sales.length + 1),
        sale_number: `INV-${Date.now()}`,
        customer_id: customer_id || null,
        sale_date: new Date().toISOString(),
        total_amount,
        payment_method: payment_method || 'cash',
        items: saleItems,
        items_count: items.length
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
    
    res.json({ success: true, message: 'Sale recorded', data: newSale });
});

app.get('/api/v1/sales/stats', authenticate, (req, res) => {
    const totalSales = sales.reduce((sum, s) => sum + s.total_amount, 0);
    const today = new Date().toDateString();
    const todaySales = sales.filter(s => new Date(s.sale_date).toDateString() === today)
        .reduce((sum, s) => sum + s.total_amount, 0);
    
    res.json({ success: true, data: { totalSales, todaySales, saleCount: sales.length } });
});

// ========== REPORTS (ADMIN ONLY) ==========
app.get('/api/v1/reports/inventory', authenticate, adminOnly, (req, res) => {
    const productsWithCats = products.map(p => ({
        ...p,
        categories: categories.find(c => c.category_id === p.category_id)
    }));
    res.json({ success: true, data: productsWithCats });
});

app.get('/api/v1/reports/sales', authenticate, adminOnly, (req, res) => {
    const salesWithCustomers = sales.map(s => ({
        ...s,
        customer: customers.find(c => c.customer_id === s.customer_id)
    }));
    res.json({ success: true, data: salesWithCustomers, stats: { totalSales: sales.reduce((sum, s) => sum + s.total_amount, 0) } });
});

// ========== START SERVER ==========
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📝 Admin: admin@inventory.com / Admin123 (Full Access)`);
    console.log(`📝 Staff: staff@inventory.com / Staff123 (Limited Access)`);
    console.log(`📦 Categories: Electronics, Clothing, Furniture`);
    console.log(`🔒 Reports are ONLY available to Admin users`);
});