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

// ========== HELPER FUNCTIONS ==========
// Calculate profit/loss
const calculateProfitLoss = async () => {
    // Get all sales with items
    const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select(`
            *,
            sale_items(*, products:product_id(name, cost_price))
        `);
    
    if (salesError) return { totalRevenue: 0, totalCost: 0, totalProfit: 0, profitMargin: 0 };
    
    let totalRevenue = 0;
    let totalCost = 0;
    
    sales.forEach(sale => {
        totalRevenue += sale.total_amount;
        if (sale.sale_items) {
            sale.sale_items.forEach(item => {
                if (item.products && item.products.cost_price) {
                    totalCost += (item.products.cost_price * item.quantity);
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

// Get sales by month
const getSalesByMonth = async () => {
    const { data: sales, error } = await supabase
        .from('sales')
        .select('sale_date, total_amount, sale_items(quantity)');
    
    if (error) return [];
    
    const monthlyData = {};
    sales.forEach(sale => {
        const date = new Date(sale.sale_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { month: monthKey, sales: 0, quantity: 0 };
        }
        monthlyData[monthKey].sales += sale.total_amount;
        if (sale.sale_items) {
            sale.sale_items.forEach(item => {
                monthlyData[monthKey].quantity += item.quantity;
            });
        }
    });
    return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
};

// Get top selling products
const getTopProducts = async () => {
    const { data: saleItems, error } = await supabase
        .from('sale_items')
        .select(`
            quantity,
            products:product_id(name)
        `);
    
    if (error) return [];
    
    const productSales = {};
    saleItems.forEach(item => {
        const productName = item.products?.name || 'Unknown';
        if (!productSales[productName]) {
            productSales[productName] = { name: productName, quantity: 0, revenue: 0 };
        }
        productSales[productName].quantity += item.quantity;
    });
    
    return Object.values(productSales).sort((a, b) => b.quantity - a.quantity).slice(0, 5);
};

// Add activity log
const addActivityLog = async (userId, userName, action, entityType, entityId, details) => {
    const { data, error } = await supabase
        .from('activity_logs')
        .insert([{
            user_id: userId,
            user_name: userName,
            action: action,
            entity_type: entityType,
            entity_id: entityId,
            details: details,
            created_at: new Date().toISOString()
        }]);
    
    if (error) console.error('Error adding activity log:', error);
    return data;
};

// ========== AUTH MIDDLEWARE ==========
const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ success: false, error: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    
    // Get user from Supabase by token (simplified)
    const { data: user, error } = await supabase
        .from('staff_users')
        .select('id, full_name, role')
        .eq('id', token)
        .single();
    
    if (user) {
        req.user = { id: user.id, role: user.role, name: user.full_name };
        next();
    } else if (token === 'admin-token-123') {
        req.user = { id: '1', role: 'admin', name: 'Admin User' };
        next();
    } else if (token === 'staff-token-456') {
        req.user = { id: '2', role: 'staff', name: 'Staff Member' };
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
        
        const token = user.id;
        await addActivityLog(user.id, user.full_name, 'LOGIN', 'user', user.id, `User logged in successfully`);
        
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

// ========== DASHBOARD STATS ==========
app.get('/api/v1/dashboard/stats', authenticate, async (req, res) => {
    try {
        const { data: products, error: productsError } = await supabase
            .from('products')
            .select('*');
        
        const { data: sales, error: salesError } = await supabase
            .from('sales')
            .select('*');
        
        const { data: purchases, error: purchasesError } = await supabase
            .from('purchases')
            .select('*');
        
        const totalProducts = products?.length || 0;
        const totalSales = sales?.reduce((sum, s) => sum + s.total_amount, 0) || 0;
        const totalPurchases = purchases?.reduce((sum, p) => sum + p.total_cost, 0) || 0;
        const lowStockProducts = products?.filter(p => p.quantity_in_stock <= 10).length || 0;
        const outOfStockProducts = products?.filter(p => p.quantity_in_stock === 0).length || 0;
        
        // Get recent sales with customer info
        const { data: recentSales, error: recentError } = await supabase
            .from('sales')
            .select(`
                *,
                customers:customer_id (customer_name)
            `)
            .order('sale_date', { ascending: false })
            .limit(10);
        
        const salesByMonth = await getSalesByMonth();
        const topProducts = await getTopProducts();
        const profitLoss = await calculateProfitLoss();
        
        res.json({
            success: true,
            data: {
                totalProducts,
                totalSales,
                totalPurchases,
                lowStockProducts,
                outOfStockProducts,
                recentSales: recentSales || [],
                salesByMonth,
                topProducts,
                profitLoss
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========== PROFIT/LOSS REPORT ==========
app.get('/api/v1/reports/profit-loss', authenticate, adminOnly, async (req, res) => {
    try {
        const profitLoss = await calculateProfitLoss();
        const monthlyData = await getSalesByMonth();
        const topProducts = await getTopProducts();
        
        res.json({ success: true, data: { profitLoss, monthlyData, topProducts } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========== ACTIVITY LOGS ==========
app.get('/api/v1/activity-logs', authenticate, adminOnly, async (req, res) => {
    try {
        const { limit = 100, action, entity_type } = req.query;
        
        let query = supabase
            .from('activity_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(parseInt(limit));
        
        if (action) query = query.eq('action', action);
        if (entity_type) query = query.eq('entity_type', entity_type);
        
        const { data, error } = await query;
        
        if (error) throw error;
        res.json({ success: true, data: data || [] });
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
        const { name, price, quantity_in_stock, category_id, cost_price } = req.body;
        
        const { data, error } = await supabase
            .from('products')
            .insert([{ 
                name, 
                price: parseFloat(price), 
                quantity_in_stock: parseInt(quantity_in_stock), 
                category_id,
                cost_price: cost_price ? parseFloat(cost_price) : parseFloat(price) * 0.6
            }])
            .select()
            .single();
        
        if (error) throw error;
        await addActivityLog(req.user.id, req.user.name, 'CREATE', 'product', data.id, `Added product: ${name}`);
        res.json({ success: true, message: 'Product added', data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/v1/products/:id', authenticate, adminOnly, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price, quantity_in_stock, category_id, cost_price } = req.body;
        
        const { data, error } = await supabase
            .from('products')
            .update({ 
                name, 
                price: parseFloat(price), 
                quantity_in_stock: parseInt(quantity_in_stock), 
                category_id,
                cost_price: cost_price ? parseFloat(cost_price) : null
            })
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        await addActivityLog(req.user.id, req.user.name, 'UPDATE', 'product', id, `Updated product: ${name}`);
        res.json({ success: true, message: 'Product updated', data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/v1/products/:id', authenticate, adminOnly, async (req, res) => {
    try {
        const { data: product } = await supabase
            .from('products')
            .select('name')
            .eq('id', req.params.id)
            .single();
        
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', req.params.id);
        
        if (error) throw error;
        await addActivityLog(req.user.id, req.user.name, 'DELETE', 'product', req.params.id, `Deleted product: ${product?.name}`);
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
        await addActivityLog(req.user.id, req.user.name, 'CREATE', 'customer', data.id, `Added customer: ${customer_name}`);
        res.json({ success: true, message: 'Customer added', data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========== PURCHASES ==========
app.get('/api/v1/purchases', authenticate, async (req, res) => {
    try {
        const { data: purchases, error: purchaseError } = await supabase
            .from('purchases')
            .select('*')
            .order('purchase_date', { ascending: false });
        
        if (purchaseError) throw purchaseError;
        
        const purchasesWithItems = await Promise.all(purchases.map(async (purchase) => {
            const { data: items, error: itemsError } = await supabase
                .from('purchase_items')
                .select(`
                    *,
                    products:product_id (id, name)
                `)
                .eq('purchase_id', purchase.id);
            
            if (itemsError) throw itemsError;
            
            const formattedItems = items.map(item => ({
                product_id: item.product_id,
                product_name: item.products?.name || 'Unknown',
                quantity: item.quantity,
                cost_price: item.cost_price,
                subtotal: item.subtotal
            }));
            
            const { data: supplier } = await supabase
                .from('suppliers')
                .select('supplier_id, supplier_name')
                .eq('id', purchase.supplier_id)
                .single();
            
            const total_quantity = formattedItems.reduce((sum, item) => sum + item.quantity, 0);
            
            return {
                ...purchase,
                items: formattedItems,
                items_count: formattedItems.length,
                total_quantity: total_quantity,
                suppliers: supplier || { supplier_name: 'Unknown' }
            };
        }));
        
        res.json({ success: true, data: purchasesWithItems });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/v1/purchases', authenticate, async (req, res) => {
    try {
        const { supplier_id, items } = req.body;
        let total_cost = 0;
        
        for (const item of items) {
            total_cost += item.quantity * item.cost_price;
        }
        
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
        
        await addActivityLog(req.user.id, req.user.name, 'CREATE', 'purchase', purchase.id, `Recorded purchase ${purchase_number} for ₦${total_cost}`);
        res.json({ success: true, message: 'Purchase recorded', data: purchase });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========== SALES ==========
app.get('/api/v1/sales', authenticate, async (req, res) => {
    try {
        const { data: sales, error: saleError } = await supabase
            .from('sales')
            .select('*')
            .order('sale_date', { ascending: false });
        
        if (saleError) throw saleError;
        
        const salesWithItems = await Promise.all(sales.map(async (sale) => {
            const { data: items, error: itemsError } = await supabase
                .from('sale_items')
                .select(`
                    *,
                    products:product_id (id, name, price)
                `)
                .eq('sale_id', sale.id);
            
            if (itemsError) throw itemsError;
            
            const formattedItems = items.map(item => ({
                product_id: item.product_id,
                product_name: item.products?.name || 'Unknown',
                quantity: item.quantity,
                unit_price: item.unit_price,
                subtotal: item.subtotal
            }));
            
            const { data: customer } = await supabase
                .from('customers')
                .select('customer_id, customer_name')
                .eq('id', sale.customer_id)
                .single();
            
            const total_quantity = formattedItems.reduce((sum, item) => sum + item.quantity, 0);
            
            return {
                ...sale,
                items: formattedItems,
                items_count: formattedItems.length,
                total_quantity: total_quantity,
                customer: customer || { customer_name: 'Walk-in' }
            };
        }));
        
        res.json({ success: true, data: salesWithItems });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/v1/sales', authenticate, async (req, res) => {
    try {
        const { customer_id, items, payment_method } = req.body;
        
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
        
        await addActivityLog(req.user.id, req.user.name, 'CREATE', 'sale', sale.id, `Recorded sale ${sale_number} for ₦${total_amount}`);
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

// ========== USER MANAGEMENT ==========
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
        await addActivityLog(req.user.id, req.user.name, 'CREATE', 'user', data.id, `Created new ${role} user: ${full_name} (${email})`);
        res.json({ success: true, message: 'User created successfully', data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/v1/users/:id', authenticate, adminOnly, async (req, res) => {
    try {
        const { id } = req.params;
        
        const { data: user } = await supabase
            .from('staff_users')
            .select('email, full_name')
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
        await addActivityLog(req.user.id, req.user.name, 'DELETE', 'user', id, `Deleted user: ${user?.full_name} (${user?.email})`);
        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/v1/users/:id/reset-password', authenticate, adminOnly, async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;
        
        const { data: user } = await supabase
            .from('staff_users')
            .select('full_name')
            .eq('id', id)
            .single();
        
        const { error } = await supabase
            .from('staff_users')
            .update({ password_hash: newPassword })
            .eq('id', id);
        
        if (error) throw error;
        await addActivityLog(req.user.id, req.user.name, 'UPDATE', 'user', id, `Reset password for user: ${user?.full_name}`);
        res.json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Supabase Server running on http://localhost:${PORT}`);
    console.log(`✅ Data is now PERSISTENT!`);
    console.log(`📝 Admin: admin@inventory.com / Admin123`);
    console.log(`📝 Staff: staff@inventory.com / Staff123`);
    console.log(`📊 Dashboard charts and Profit/Loss reports available`);
    console.log(`📋 Activity logging enabled`);
});