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

const adminOnly = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    next();
};

// ========== HEALTH CHECK ==========
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Supabase backend running!' });
});

// ========== LOGIN ==========
app.post('/api/v1/auth/login', async (req, res) => {
    const { email, password } = req.body;
    
    try {
        const { data: user, error } = await supabase
            .from('staff_users')
            .select('id, full_name, email, role, password_hash, status')
            .eq('email', email)
            .single();
        
        if (error || !user) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }
        
        if (user.status !== 'active') {
            return res.status(401).json({ success: false, error: 'Account is inactive' });
        }
        
        if (user.password_hash !== password) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }
        
        const token = user.role === 'admin' ? 'admin-token-123' : 'staff-token-456';
        
        res.json({
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
    } catch (error) {
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
            .select('*')
            .order('name');
        
        if (error) throw error;
        
        // Get categories to add category names
        const { data: categories } = await supabase
            .from('categories')
            .select('id, name');
        
        const formatted = data.map(p => ({
            ...p,
            category_name: categories?.find(c => c.id === p.category_id)?.name || 'Uncategorized'
        }));
        
        res.json({ success: true, data: formatted });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/v1/products', authenticate, adminOnly, async (req, res) => {
    try {
        const { name, price, quantity_in_stock, category_id } = req.body;
        
        const { data, error } = await supabase
            .from('products')
            .insert([{ name, price, quantity_in_stock, category_id }])
            .select()
            .single();
        
        if (error) throw error;
        res.json({ success: true, message: 'Product added', data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/v1/products/:id', authenticate, adminOnly, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price, quantity_in_stock, category_id } = req.body;
        
        const { data, error } = await supabase
            .from('products')
            .update({ name, price, quantity_in_stock, category_id })
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        res.json({ success: true, message: 'Product updated', data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/v1/products/:id', authenticate, adminOnly, async (req, res) => {
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
            .order('supplier_name');
        
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
            .order('customer_name');
        
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/v1/customers', authenticate, async (req, res) => {
    try {
        const { customer_name, email, phone } = req.body;
        
        const { data, error } = await supabase
            .from('customers')
            .insert([{ customer_name, email, phone, loyalty_points: 0, total_purchases: 0 }])
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
            .select('*')
            .order('purchase_date', { ascending: false });
        
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/v1/purchases', authenticate, async (req, res) => {
    try {
        const { supplier_id, items } = req.body;
        const total_cost = items.reduce((sum, item) => sum + (item.quantity * item.cost_price), 0);
        const purchase_number = `PO-${Date.now()}`;
        
        const { data: purchase, error: purchaseError } = await supabase
            .from('purchases')
            .insert([{ purchase_number, supplier_id, user_id: req.user.id, total_cost }])
            .select()
            .single();
        
        if (purchaseError) throw purchaseError;
        
        for (const item of items) {
            const subtotal = item.quantity * item.cost_price;
            await supabase
                .from('purchase_items')
                .insert([{ purchase_id: purchase.id, product_id: item.product_id, quantity: item.quantity, cost_price: item.cost_price, subtotal }]);
            
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
            .select('*')
            .order('sale_date', { ascending: false });
        
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/v1/sales', authenticate, async (req, res) => {
    try {
        const { customer_id, items, payment_method } = req.body;
        
        // Check stock
        for (const item of items) {
            const { data: product } = await supabase
                .from('products')
                .select('quantity_in_stock, name')
                .eq('id', item.product_id)
                .single();
            
            if (!product || product.quantity_in_stock < item.quantity) {
                return res.status(400).json({ success: false, error: `Insufficient stock for ${product?.name}` });
            }
        }
        
        let total_amount = 0;
        for (const item of items) {
            const { data: product } = await supabase
                .from('products')
                .select('price')
                .eq('id', item.product_id)
                .single();
            total_amount += product.price * item.quantity;
        }
        
        const sale_number = `INV-${Date.now()}`;
        const { data: sale, error: saleError } = await supabase
            .from('sales')
            .insert([{ sale_number, customer_id: customer_id || null, user_id: req.user.id, total_amount, payment_method: payment_method || 'cash' }])
            .select()
            .single();
        
        if (saleError) throw saleError;
        
        for (const item of items) {
            const { data: product } = await supabase
                .from('products')
                .select('price')
                .eq('id', item.product_id)
                .single();
            
            const subtotal = product.price * item.quantity;
            await supabase
                .from('sale_items')
                .insert([{ sale_id: sale.id, product_id: item.product_id, quantity: item.quantity, unit_price: product.price, subtotal }]);
            
            // Deduct stock
            const { data: stock } = await supabase
                .from('products')
                .select('quantity_in_stock')
                .eq('id', item.product_id)
                .single();
            
            await supabase
                .from('products')
                .update({ quantity_in_stock: stock.quantity_in_stock - item.quantity })
                .eq('id', item.product_id);
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
        const today = new Date().toISOString().split('T')[0];
        const todaySales = sales
            .filter(s => new Date(s.sale_date).toISOString().split('T')[0] === today)
            .reduce((sum, s) => sum + s.total_amount, 0);
        
        res.json({ success: true, data: { totalSales, todaySales, saleCount: sales.length } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========== USER MANAGEMENT (ADMIN ONLY) ==========
app.get('/api/v1/users', authenticate, adminOnly, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('staff_users')
            .select('id, full_name, email, role, status, created_at')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/v1/users', authenticate, adminOnly, async (req, res) => {
    try {
        const { full_name, email, password, role } = req.body;
        
        // Check if user exists
        const { data: existing } = await supabase
            .from('staff_users')
            .select('email')
            .eq('email', email)
            .single();
        
        if (existing) {
            return res.status(400).json({ success: false, error: 'Email already exists' });
        }
        
        const { data, error } = await supabase
            .from('staff_users')
            .insert([{ 
                full_name, 
                email, 
                password_hash: password, 
                role: role || 'staff', 
                status: 'active' 
            }])
            .select()
            .single();
        
        if (error) throw error;
        res.json({ success: true, message: 'User created successfully', data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/v1/users/:id', authenticate, adminOnly, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Prevent deleting admin account
        const { data: user } = await supabase
            .from('staff_users')
            .select('email')
            .eq('id', id)
            .single();
        
        if (user?.email === 'admin@inventory.com') {
            return res.status(400).json({ success: false, error: 'Cannot delete the master admin account' });
        }
        
        const { error } = await supabase
            .from('staff_users')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/v1/users/:id/reset-password', authenticate, adminOnly, async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;
        
        const { error } = await supabase
            .from('staff_users')
            .update({ password_hash: newPassword })
            .eq('id', id);
        
        if (error) throw error;
        res.json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========== START SERVER ==========
app.listen(PORT, () => {
    console.log(`🚀 Supabase Server running on http://localhost:${PORT}`);
    console.log(`✅ Data is now PERSISTENT!`);
    console.log(`📝 Admin: admin@inventory.com / Admin123`);
    console.log(`📝 Staff: staff@inventory.com / Staff123`);
    console.log(`👥 User Management endpoints active`);
});