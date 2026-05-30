// server-supabase-final.js - Full Inventory System with Supabase
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Supabase connection
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('✅ Connected to Supabase');

// ========== AUTH MIDDLEWARE ==========
const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ success: false, error: 'No token' });
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
        if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }
        next();
    };
};

// ========== HEALTH CHECK ==========
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Supabase backend running!' });
});

// ========== LOGIN ==========
app.post('/api/v1/auth/login', async (req, res) => {
    const { email, password } = req.body;
    
    console.log('Login attempt for:', email);
    
    try {
        // Convert email to lowercase for consistent matching
        const searchEmail = email.toLowerCase();
        
        const { data: user, error } = await supabase
            .from('staff_users')
            .select('*')
            .eq('email', searchEmail)
            .single();
        
        if (error) {
            console.log('Query error:', error.message);
            // Try to get all users to debug
            const { data: allUsers } = await supabase.from('staff_users').select('email');
            console.log('Available emails:', allUsers?.map(u => u.email));
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }
        
        if (!user) {
            console.log('No user found');
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }
        
        console.log('User found:', user.email);
        console.log('Stored password:', user.password_hash);
        
        // Check password
        if (password === user.password_hash) {
            console.log('Login successful!');
            return res.json({
                success: true,
                data: {
                    user: {
                        user_id: user.id,
                        full_name: user.full_name,
                        email: user.email,
                        role: user.role
                    },
                    accessToken: `token-${user.id}-${user.role}`
                }
            });
        } else {
            console.log('Password mismatch');
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
// ========== CATEGORIES ==========
app.get('/api/v1/categories', async (req, res) => {
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

app.post('/api/v1/categories', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { name, description } = req.body;
        const { data, error } = await supabase
            .from('categories')
            .insert([{ name, description }])
            .select()
            .single();
        
        if (error) throw error;
        res.json({ success: true, message: 'Category added', data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========== PRODUCTS ==========
app.get('/api/v1/products', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('products')
            .select(`
                *,
                categories:category_id (id, name)
            `)
            .order('name');
        
        if (error) throw error;
        
        const formatted = data.map(p => ({
            ...p,
            categories: p.categories ? { category_name: p.categories.name } : null
        }));
        
        res.json({ success: true, data: formatted });
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
app.get('/api/v1/suppliers', async (req, res) => {
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
app.get('/api/v1/customers', async (req, res) => {
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
app.get('/api/v1/purchases', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('purchases')
            .select(`
                *,
                suppliers:supplier_id (id, name)
            `)
            .order('purchase_date', { ascending: false });
        
        if (error) throw error;
        
        const formatted = data.map(p => ({
            ...p,
            suppliers: p.suppliers ? { supplier_name: p.suppliers.name } : null
        }));
        
        res.json({ success: true, data: formatted });
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
        
        // Insert items and update stock
        for (const item of items) {
            // Insert purchase item
            const subtotal = item.quantity * item.cost_price;
            await supabase
                .from('purchase_items')
                .insert([{
                    purchase_id: purchase.id,
                    product_id: item.product_id,
                    quantity: item.quantity,
                    cost_price: item.cost_price,
                    subtotal
                }]);
            
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
app.get('/api/v1/sales', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('sales')
            .select(`
                *,
                customers:customer_id (id, name)
            `)
            .order('sale_date', { ascending: false });
        
        if (error) throw error;
        
        const formatted = data.map(s => ({
            ...s,
            customer: s.customers ? { customer_name: s.customers.name } : null
        }));
        
        res.json({ success: true, data: formatted });
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
                    error: `Insufficient stock for ${product?.name}` 
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
        
        // Create sale
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
            
            await supabase
                .from('sale_items')
                .insert([{
                    sale_id: sale.id,
                    product_id: item.product_id,
                    quantity: item.quantity,
                    unit_price: saleItem.unit_price,
                    subtotal: saleItem.subtotal
                }]);
            
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

app.get('/api/v1/sales/stats', async (req, res) => {
    try {
        // Get today's date boundaries
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();
        
        console.log('Start of day:', startOfDay);
        console.log('End of day:', endOfDay);
        
        // Get today's sales directly from database using date range
        const { data: todayData, error: todayError } = await supabase
            .from('sales')
            .select('total_amount')
            .eq('status', 'completed')
            .gte('sale_date', startOfDay)
            .lte('sale_date', endOfDay);
        
        if (todayError) throw todayError;
        
        // Get all sales for total
        const { data: allData, error: allError } = await supabase
            .from('sales')
            .select('total_amount')
            .eq('status', 'completed');
        
        if (allError) throw allError;
        
        const totalSales = allData.reduce((sum, s) => sum + s.total_amount, 0);
        const todaySales = todayData.reduce((sum, s) => sum + s.total_amount, 0);
        
        console.log('Today sales amount:', todaySales);
        console.log('Total sales:', totalSales);
        
        res.json({ 
            success: true, 
            data: { 
                totalSales, 
                todaySales, 
                saleCount: allData.length 
            } 
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========== START SERVER ==========
app.listen(PORT, () => {
    console.log(`🚀 Supabase Server running on http://localhost:${PORT}`);
    console.log(`✅ Data will now PERSIST forever!`);
    console.log(`📝 Admin: admin@inventory.com / Admin123`);
    console.log(`📝 Staff: staff@inventory.com / Staff123`);
});