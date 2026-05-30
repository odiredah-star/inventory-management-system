const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// ========== DATA ==========
let users = [
    { user_id: '1', full_name: 'Admin User', email: 'admin@inventory.com', role: 'admin', status: 'active' },
    { user_id: '2', full_name: 'Staff Member', email: 'staff@inventory.com', role: 'staff', status: 'active' }
];

let categories = [
    { category_id: '1', category_name: 'Electronics', description: 'Electronic devices' },
    { category_id: '2', category_name: 'Clothing', description: 'Apparel and fashion' },
    { category_id: '3', category_name: 'Furniture', description: 'Home and office furniture' }
];

let products = [
    { product_id: '1', name: 'Laptop', price: 999.99, quantity_in_stock: 50, category_id: '1', status: 'active' },
    { product_id: '2', name: 'T-Shirt', price: 19.99, quantity_in_stock: 100, category_id: '2', status: 'active' },
    { product_id: '3', name: 'Office Chair', price: 199.99, quantity_in_stock: 25, category_id: '3', status: 'active' }
];

let suppliers = [
    { supplier_id: '1', supplier_name: 'Tech Distributors' },
    { supplier_id: '2', supplier_name: 'Fashion Wholesale' },
    { supplier_id: '3', supplier_name: 'Furniture Mart' }
];

let customers = [
    { customer_id: '1', customer_name: 'John Smith', email: 'john@example.com', phone: '555-0101' },
    { customer_id: '2', customer_name: 'Sarah Johnson', email: 'sarah@example.com', phone: '555-0102' }
];

let purchases = [];
let sales = [];

// ========== HEALTH CHECK ==========
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running!', timestamp: new Date() });
});

// ========== LOGIN ==========
app.post('/api/v1/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    console.log('Login attempt:', email, password);
    
    const user = users.find(u => u.email === email && u.status === 'active');
    
    if (user && (password === 'Admin123' || password === 'Staff123')) {
        return res.json({
            success: true,
            data: {
                user: {
                    user_id: user.user_id,
                    full_name: user.full_name,
                    email: user.email,
                    role: user.role
                },
                accessToken: `mock-token-${user.user_id}`
            }
        });
    }
    
    res.status(401).json({ success: false, error: 'Invalid email or password' });
});

// ========== AUTH MIDDLEWARE ==========
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ success: false, error: 'No token' });
    }
    const token = authHeader.split(' ')[1];
    if (token && token.includes('1')) req.user = { user_id: '1', role: 'admin' };
    else if (token && token.includes('2')) req.user = { user_id: '2', role: 'staff' };
    else return res.status(401).json({ success: false, error: 'Invalid token' });
    next();
};

// ========== CATEGORIES ==========
app.get('/api/v1/categories', authenticate, (req, res) => {
    res.json({ success: true, data: categories });
});

// ========== PRODUCTS ==========
app.get('/api/v1/products', authenticate, (req, res) => {
    const productsWithCategories = products.map(p => ({
        ...p,
        categories: categories.find(c => c.category_id === p.category_id)
    }));
    res.json({ success: true, data: productsWithCategories });
});

app.post('/api/v1/products', authenticate, (req, res) => {
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

app.delete('/api/v1/products/:id', authenticate, (req, res) => {
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

// ========== PURCHASES ==========
app.get('/api/v1/purchases', authenticate, (req, res) => {
    res.json({ success: true, data: purchases });
});

app.post('/api/v1/purchases', authenticate, (req, res) => {
    const { supplier_id, items } = req.body;
    const total_cost = items.reduce((sum, item) => sum + (item.quantity * item.cost_price), 0);
    
    const newPurchase = {
        purchase_id: String(purchases.length + 1),
        purchase_number: `PO-${Date.now()}`,
        supplier_id,
        suppliers: suppliers.find(s => s.supplier_id === supplier_id),
        total_cost,
        purchase_date: new Date().toISOString(),
        items_count: items.length
    };
    purchases.unshift(newPurchase);
    
    // Update stock
    items.forEach(item => {
        const product = products.find(p => p.product_id === item.product_id);
        if (product) product.quantity_in_stock += parseInt(item.quantity);
    });
    
    res.json({ success: true, message: 'Purchase recorded', data: newPurchase });
});

// ========== SALES ==========
app.get('/api/v1/sales', authenticate, (req, res) => {
    res.json({ success: true, data: sales });
});

app.post('/api/v1/sales', authenticate, (req, res) => {
    const { customer_id, items, payment_method } = req.body;
    
    // Check stock
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
        customer: customers.find(c => c.customer_id === customer_id),
        sale_date: new Date().toISOString(),
        total_amount,
        payment_method: payment_method || 'cash',
        items: saleItems,
        items_count: items.length
    };
    sales.unshift(newSale);
    
    // Deduct stock
    items.forEach(item => {
        const product = products.find(p => p.product_id === item.product_id);
        if (product) product.quantity_in_stock -= parseInt(item.quantity);
    });
    
    res.json({ success: true, message: 'Sale recorded', data: newSale });
});

app.get('/api/v1/sales/stats', authenticate, (req, res) => {
    const totalSales = sales.reduce((sum, s) => sum + s.total_amount, 0);
    const today = new Date().toDateString();
    const todaySales = sales.filter(s => new Date(s.sale_date).toDateString() === today)
        .reduce((sum, s) => sum + s.total_amount, 0);
    
    res.json({ success: true, data: { totalSales, todaySales, saleCount: sales.length } });
});

// ========== START SERVER ==========
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📝 Admin: admin@inventory.com / Admin123`);
    console.log(`📝 Staff: staff@inventory.com / Staff123`);
});