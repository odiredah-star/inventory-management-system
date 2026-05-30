// server-supabase.js - Backend with Supabase Database
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const supabase = require('./src/config/supabase');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ========== HELPER FUNCTIONS ==========
const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ success: false, error: 'No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Simple token validation for demo
    if (token && token.includes('admin')) {
        req.user = { id: '1', role: 'admin' };
    } else if (token && token.includes('staff')) {
        req.user = { id: '2', role: 'staff' };
    } else {
        return res.status(401).json({ success: false, error: 'Invalid token' });
    }
    next();
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }
        next();
    };
};

// ========== HEALTH CHECK ==========
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server running with Supabase!', timestamp: new Date() });
});

// ========== LOGIN ==========
app.post('/api/v1/auth/login', async (req, res) => {
    const { email, password } = req.body;
    
    console.log('Login attempt:', email); // Debug log
    
    try {
        // Query Supabase for user
        const { data: user, error } = await supabase
            .from('staff_users')
            .select('*')
            .eq('email', email)
            .single();
        
        console.log('User found:', user ? 'Yes' : 'No'); // Debug log
        
        if (error || !user) {
            return res.status(401).json({ success: false, error: 'Invalid email or password' });
        }
        
        // For demo purposes, accept these passwords
        // In production, use bcrypt.compare()
        let validPassword = false;
        
        if (email === 'admin@inventory.com' && password === 'Admin123') {
            validPassword = true;
        } else if (email === 'staff@inventory.com' && password === 'Staff123') {
            validPassword = true;
        }
        
        if (!validPassword) {
            return res.status(401).json({ success: false, error: 'Invalid email or password' });
        }
        
        res.json({
            success: true,
            data: {
                user: {
                    user_id: user.id,
                    full_name: user.full_name,
                    email: user.email,
                    role: user.role
                },
                accessToken: `mock-token-${user.id}-${user.role}`
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========== CATEGORIES ==========
app.get('/api/v1/categories', authenticate, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .order('name');
        
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========== PRODUCTS ==========
app.get('/api/v1/products', authenticate, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('products')
            .select(`
                *,
                categories:category_id (id, name)
            `)
            .order('name');
        
        if (error) throw error;
        
        // Format response
        const formattedProducts = data.map(p => ({
            ...p,
            categories: p.categories ? { category_name: p.categories.name } : null
        }));
        
        res.json({ success: true, data: formattedProducts });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/v1/products', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { name, price, quantity_in_stock, category_id } = req.body;
        
        const { data, error } = await supabase
            .from('products')
            .insert([{
                name,
                price: parseFloat(price),
                quantity_in_stock: parseInt(quantity_in_stock),
                category_id,
                status: 'active'
            }])
            .select()
            .single();
        
        if (error) throw error;
        res.json({ success: true, message: 'Product added', data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/v1/products/:id', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', req.params.id);
        
        if (error) throw error;
        res.json({ success: true, message: 'Product deleted' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========== SUPPLIERS ==========
app.get('/api/v1/suppliers', authenticate, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('suppliers')
            .select('*')
            .order('name');
        
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========== CUSTOMERS ==========
app.get('/api/v1/customers', authenticate, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .order('name');
        
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/v1/customers', authenticate, async (req, res) => {
    try {
        const { name, email, phone, address } = req.body;
        
        const { data, error } = await supabase
            .from('customers')
            .insert([{ name, email, phone, address, loyalty_points: 0, total_purchases: 0 }])
            .select()
            .single();
        
        if (error) throw error;
        res.json({ success: true, message: 'Customer added', data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========== PURCHASES ==========
app.get('/api/v1/purchases', authenticate, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('purchases')
            .select(`
                *,
                suppliers:supplier_id (id, name)
            `)
            .order('purchase_date', { ascending: false });
        
        if (error) throw error;
        
        const formattedPurchases = data.map(p => ({
            ...p,
            suppliers: p.suppliers ? { supplier_name: p.suppliers.name } : null
        }));
        
        res.json({ success: true, data: formattedPurchases });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/v1/purchases', authenticate, authorize('admin', 'staff'), async (req, res) => {
    try {
        const { supplier_id, items, notes } = req.body;
        const total_cost = items.reduce((sum, item) => sum + (item.quantity * item.cost_price), 0);
        const purchase_number = `PO-${Date.now()}`;
        
        // Insert purchase
        const { data: purchase, error: purchaseError } = await supabase
            .from('purchases')
            .insert([{
                purchase_number,
                supplier_id,
                user_id: req.user.id,
                total_cost,
                notes,
                status: 'completed'
            }])
            .select()
            .single();
        
        if (purchaseError) throw purchaseError;
        
        // Insert purchase items and update stock
        for (const item of items) {
            // Insert purchase item
            const subtotal = item.quantity * item.cost_price;
            const { error: itemError } = await supabase
                .from('purchase_items')
                .insert([{
                    purchase_id: purchase.id,
                    product_id: item.product_id,
                    quantity: item.quantity,
                    cost_price: item.cost_price,
                    subtotal
                }]);
            
            if (itemError) throw itemError;
            
            // Update product stock
            const { data: product } = await supabase
                .from('products')
                .select('quantity_in_stock')
                .eq('id', item.product_id)
                .single();
            
            await supabase
                .from('products')
                .update({ quantity_in_stock: product.quantity_in_stock + item.quantity })
                .eq('id', item.product_id);
        }
        
        res.json({ success: true, message: 'Purchase recorded', data: purchase });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========== SALES ==========
app.get('/api/v1/sales', authenticate, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('sales')
            .select(`
                *,
                customers:customer_id (id, name)
            `)
            .order('sale_date', { ascending: false });
        
        if (error) throw error;
        
        const formattedSales = data.map(s => ({
            ...s,
            customer: s.customers ? { customer_name: s.customers.name } : null
        }));
        
        res.json({ success: true, data: formattedSales });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/v1/sales', authenticate, authorize('admin', 'staff'), async (req, res) => {
    try {
        const { customer_id, items, payment_method } = req.body;
        
        // Check stock availability
        for (const item of items) {
            const { data: product } = await supabase
                .from('products')
                .select('quantity_in_stock, name')
                .eq('id', item.product_id)
                .single();
            
            if (!product || product.quantity_in_stock < item.quantity) {
                return res.status(400).json({ 
                    success: false, 
                    error: `Insufficient stock for ${product?.name}. Available: ${product?.quantity_in_stock}` 
                });
            }
        }
        
        // Calculate total
        let total_amount = 0;
        const saleItems = [];
        
        for (const item of items) {
            const { data: product } = await supabase
                .from('products')
                .select('price, name')
                .eq('id', item.product_id)
                .single();
            
            const subtotal = product.price * item.quantity;
            total_amount += subtotal;
            saleItems.push({
                product_id: item.product_id,
                product_name: product.name,
                quantity: item.quantity,
                unit_price: product.price,
                subtotal
            });
        }
        
        // Create sale record
        const sale_number = `INV-${Date.now()}`;
        const { data: sale, error: saleError } = await supabase
            .from('sales')
            .insert([{
                sale_number,
                customer_id: customer_id || null,
                user_id: req.user.id,
                total_amount,
                payment_method: payment_method || 'cash',
                status: 'completed'
            }])
            .select()
            .single();
        
        if (saleError) throw saleError;
        
        // Insert sale items and deduct stock
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const saleItem = saleItems[i];
            
            const { error: itemError } = await supabase
                .from('sale_items')
                .insert([{
                    sale_id: sale.id,
                    product_id: item.product_id,
                    quantity: item.quantity,
                    unit_price: saleItem.unit_price,
                    subtotal: saleItem.subtotal
                }]);
            
            if (itemError) throw itemError;
            
            // Deduct stock
            const { data: product } = await supabase
                .from('products')
                .select('quantity_in_stock')
                .eq('id', item.product_id)
                .single();
            
            await supabase
                .from('products')
                .update({ quantity_in_stock: product.quantity_in_stock - item.quantity })
                .eq('id', item.product_id);
        }
        
        // Update customer loyalty points
        if (customer_id) {
            const { data: customer } = await supabase
                .from('customers')
                .select('loyalty_points, total_purchases')
                .eq('id', customer_id)
                .single();
            
            await supabase
                .from('customers')
                .update({
                    loyalty_points: customer.loyalty_points + Math.floor(total_amount / 10),
                    total_purchases: customer.total_purchases + total_amount
                })
                .eq('id', customer_id);
        }
        
        res.json({ success: true, message: 'Sale recorded', data: sale });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/v1/sales/stats', authenticate, async (req, res) => {
    try {
        const { data: sales, error } = await supabase
            .from('sales')
            .select('total_amount, sale_date');
        
        if (error) throw error;
        
        const totalSales = sales.reduce((sum, s) => sum + s.total_amount, 0);
        const today = new Date().toDateString();
        const todaySales = sales
            .filter(s => new Date(s.sale_date).toDateString() === today)
            .reduce((sum, s) => sum + s.total_amount, 0);
        
        res.json({ 
            success: true, 
            data: { 
                totalSales, 
                todaySales, 
                saleCount: sales.length 
            } 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========== START SERVER ==========
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📝 Using Supabase Database`);
    console.log(`📝 Admin: admin@inventory.com / Admin123`);
    console.log(`📝 Staff: staff@inventory.com / Staff123`);
});