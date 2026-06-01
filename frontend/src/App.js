import toast, { Toaster } from 'react-hot-toast';
import React, { useState, useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

const API_URL = 'http://localhost:5000';

// HARDCODED CATEGORIES - These will ALWAYS show
const HARDCODED_CATEGORIES = [
    { id: '1', name: 'Electronics', description: 'Electronic devices and accessories' },
    { id: '2', name: 'Clothing', description: 'Apparel and fashion items' },
    { id: '3', name: 'Furniture', description: 'Home and office furniture' }
];

function App() {
    // ========== AUTHENTICATION STATES ==========
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [user, setUser] = useState(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [message, setMessage] = useState('');
    
    // ========== DATA STATES ==========
    const [categories, setCategories] = useState(HARDCODED_CATEGORIES);
    const [products, setProducts] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [purchases, setPurchases] = useState([]);
    const [sales, setSales] = useState([]);
    const [salesStats, setSalesStats] = useState({ totalSales: 0, todaySales: 0, saleCount: 0 });
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [dashboardStats, setDashboardStats] = useState(null);
    const [profitLoss, setProfitLoss] = useState(null);
    const [activityLogs, setActivityLogs] = useState([]);
    const [filterAction, setFilterAction] = useState('');
    const [filterEntity, setFilterEntity] = useState('');
    const [showSaleDetailsModal, setShowSaleDetailsModal] = useState(false);
    const [selectedSale, setSelectedSale] = useState(null);
    
    // Create a ref to always have the latest products
    const productsRef = useRef(products);
    
    // Update ref when products change
    useEffect(() => {
        productsRef.current = products;
    }, [products]);
    
    // ========== UI STATES ==========
    const [activeTab, setActiveTab] = useState('dashboard');
    const [showProductForm, setShowProductForm] = useState(false);
    const [showPurchaseForm, setShowPurchaseForm] = useState(false);
    const [showSaleForm, setShowSaleForm] = useState(false);
    const [showUserForm, setShowUserForm] = useState(false);
    const [selectedCategoryPage, setSelectedCategoryPage] = useState(null);
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportType, setReportType] = useState('inventory');
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [lastSale, setLastSale] = useState(null);
    const [newUserPassword, setNewUserPassword] = useState('');
    const [resettingUserId, setResettingUserId] = useState(null);
    
    // ========== EDIT PRODUCT STATES ==========
    const [editingProduct, setEditingProduct] = useState(null);
    const [editProductData, setEditProductData] = useState({
        name: '',
        price: '',
        quantity_in_stock: '',
        category_id: '',
        cost_price: ''
    });
    
    // ========== FORM STATES ==========
    const [newProduct, setNewProduct] = useState({ name: '', price: '', quantity_in_stock: '', category_id: '', cost_price: '' });
    const [newUser, setNewUser] = useState({ full_name: '', email: '', password: '', role: 'staff' });
    const [newPurchase, setNewPurchase] = useState({ supplier_id: '', items: [{ product_id: '', quantity: '', cost_price: '' }] });
    const [newSale, setNewSale] = useState({ items: [{ product_id: '', quantity: '' }], payment_method: 'cash' });

    // ========== MOBILE DETECTION ==========
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // ========== HELPER FUNCTIONS ==========
    const formatPrice = (price) => {
        if (!price && price !== 0) return '0.00';
        return parseFloat(price).toFixed(2);
    };

    // Calculate total quantities from items array
    const calculateTotalQuantityPurchased = () => {
        let totalQty = 0;
        purchases.forEach(purchase => {
            if (purchase.items && Array.isArray(purchase.items) && purchase.items.length > 0) {
                purchase.items.forEach(item => {
                    const qty = parseInt(item.quantity) || 0;
                    totalQty += qty;
                });
            }
        });
        return totalQty;
    };

    const calculateTotalQuantitySold = () => {
        let totalQty = 0;
        sales.forEach(sale => {
            if (sale.items && Array.isArray(sale.items) && sale.items.length > 0) {
                sale.items.forEach(item => {
                    const qty = parseInt(item.quantity) || 0;
                    totalQty += qty;
                });
            }
        });
        return totalQty;
    };

    const getPurchaseTotalQuantity = (purchase) => {
        let totalQty = 0;
        if (purchase.items && Array.isArray(purchase.items) && purchase.items.length > 0) {
            purchase.items.forEach(item => {
                totalQty += parseInt(item.quantity) || 0;
            });
        }
        return totalQty;
    };

    const getSaleTotalQuantity = (sale) => {
        let totalQty = 0;
        if (sale.items && Array.isArray(sale.items) && sale.items.length > 0) {
            sale.items.forEach(item => {
                totalQty += parseInt(item.quantity) || 0;
            });
        }
        return totalQty;
    };

    // Filtered sales based on search term
    const getFilteredSales = () => {
        if (!searchTerm) return sales;
        const term = searchTerm.toLowerCase();
        return sales.filter(sale => 
            sale.sale_number.toLowerCase().includes(term)
        );
    };

    // Print receipt function
    const printReceipt = (sale) => {
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.width = '0px';
        iframe.style.height = '0px';
        iframe.style.border = '0';
        document.body.appendChild(iframe);
        
        const itemsHtml = sale.items.map(item => `
            <tr>
                <td>${item.product_name}</td>
                <td style="text-align:center">${item.quantity}</td>
                <td style="text-align:right">₦${formatPrice(item.unit_price)}</td>
                <td style="text-align:right">₦${formatPrice(item.subtotal)}</td>
            </tr>
        `).join('');
        
        const customerName = sale.customer?.customer_name || 'Walk-in Customer';
        
        const receiptHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Receipt - ${sale.sale_number}</title>
                <style>
                    body { font-family: 'Courier New', monospace; padding: 20px; margin: 0; font-size: 14px; }
                    .receipt { max-width: 350px; margin: 0 auto; }
                    .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
                    .header h2 { margin: 0; font-size: 18px; }
                    .header p { margin: 5px 0; font-size: 12px; }
                    .customer-info { margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px dotted #ccc; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
                    th, td { padding: 5px; text-align: left; }
                    th { border-bottom: 1px solid #000; }
                    .total { text-align: right; font-weight: bold; border-top: 1px dashed #000; padding-top: 10px; margin-top: 10px; }
                    .footer { text-align: center; margin-top: 20px; padding-top: 10px; border-top: 1px dashed #000; font-size: 12px; }
                    .thankyou { text-align: center; font-size: 16px; font-weight: bold; margin: 15px 0; }
                </style>
            </head>
            <body>
                <div class="receipt">
                    <div class="header">
                        <h2>INVENTORY SYSTEM</h2>
                        <p>${new Date(sale.sale_date).toLocaleString()}</p>
                        <p>Receipt #: ${sale.sale_number}</p>
                    </div>
                    <div class="customer-info"><strong>Customer:</strong> ${customerName}</div>
                    <table>
                        <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
                        <tbody>${itemsHtml}</tbody>
                    </table>
                    <div class="total">
                        <p><strong>Total Amount: ₦${formatPrice(sale.total_amount)}</strong></p>
                        <p>Payment Method: ${sale.payment_method?.toUpperCase() || 'CASH'}</p>
                    </div>
                    <div class="thankyou">Thank You!</div>
                    <div class="footer"><p>For inquiries, contact support</p><p>www.inventorysystem.com</p></div>
                </div>
                <script>window.print(); setTimeout(() => window.close(), 500);</script>
            </body>
            </html>
        `;
        
        const iframeDoc = iframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(receiptHtml);
        iframeDoc.close();
        
        setTimeout(() => document.body.removeChild(iframe), 1000);
    };

    // Load dashboard stats
    const loadDashboardStats = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        try {
            const response = await fetch(`${API_URL}/api/v1/dashboard/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setDashboardStats(data.data);
            }
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
        }
    };

    // Load profit/loss report
    const loadProfitLoss = async () => {
        const token = localStorage.getItem('token');
        const userRole = JSON.parse(localStorage.getItem('user') || '{}')?.role;
        if (!token || userRole !== 'admin') return;
        
        try {
            const response = await fetch(`${API_URL}/api/v1/reports/profit-loss`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setProfitLoss(data.data);
            }
        } catch (error) {
            console.error('Error loading profit/loss:', error);
        }
    };

    // Load activity logs
    const loadActivityLogs = async () => {
        const token = localStorage.getItem('token');
        const userRole = JSON.parse(localStorage.getItem('user') || '{}')?.role;
        if (!token || userRole !== 'admin') return;
        
        try {
            let url = `${API_URL}/api/v1/activity-logs?limit=200`;
            if (filterAction) url += `&action=${filterAction}`;
            if (filterEntity) url += `&entity_type=${filterEntity}`;
            
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setActivityLogs(data.data);
            }
        } catch (error) {
            console.error('Error loading activity logs:', error);
        }
    };

    // Reset user password
    const handleResetPassword = async (userId, newPassword) => {
        const token = localStorage.getItem('token');
        try {
            const response = await fetch(`${API_URL}/api/v1/users/${userId}/reset-password`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ newPassword })
            });
            const data = await response.json();
            if (data.success) {
                setMessage('Password reset successfully!');
                setResettingUserId(null);
                setNewUserPassword('');
                setTimeout(() => setMessage(''), 3000);
                loadAllData();
            } else {
                setMessage(data.error);
            }
        } catch (error) {
            setMessage('Error: ' + error.message);
        }
    };

    // Export Profit/Loss to CSV
    const exportProfitLossToCSV = () => {
        if (!profitLoss) return;
        
        const headers = ['Metric', 'Amount (₦)'];
        const data = [
            ['Total Revenue', profitLoss.profitLoss.totalRevenue],
            ['Total Cost', profitLoss.profitLoss.totalCost],
            ['Net Profit', profitLoss.profitLoss.totalProfit],
            ['Profit Margin (%)', profitLoss.profitLoss.profitMargin]
        ];
        
        let csvContent = headers.join(',') + '\n';
        data.forEach(row => {
            csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
        });
        
        // Add top products section
        csvContent += '\n\nTop Selling Products\n';
        csvContent += 'Product,Quantity Sold,Revenue (₦)\n';
        profitLoss.topProducts?.forEach(product => {
            csvContent += `"${product.name}",${product.quantity},${formatPrice(product.revenue)}\n`;
        });
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'profit-loss-report.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        setMessage('Profit/Loss report downloaded as CSV!');
        setTimeout(() => setMessage(''), 3000);
    };

    // Export Profit/Loss to PDF
    const exportProfitLossToPDF = async () => {
        try {
            const { jsPDF } = await import('jspdf');
            const autoTable = (await import('jspdf-autotable')).default;
            const doc = new jsPDF();
            
            doc.setFontSize(18);
            doc.text('Profit & Loss Report', 14, 15);
            doc.setFontSize(10);
            doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 25);
            
            const summaryData = [
                ['Total Revenue', `₦${formatPrice(profitLoss.profitLoss.totalRevenue)}`],
                ['Total Cost', `₦${formatPrice(profitLoss.profitLoss.totalCost)}`],
                ['Net Profit', `₦${formatPrice(profitLoss.profitLoss.totalProfit)}`],
                ['Profit Margin', `${formatPrice(profitLoss.profitLoss.profitMargin)}%`]
            ];
            
            autoTable(doc, {
                startY: 35,
                head: [['Metric', 'Amount']],
                body: summaryData,
                theme: 'striped',
                headStyles: { fillColor: [0, 123, 255], textColor: 255 },
            });
            
            const topProductsData = profitLoss.topProducts?.map(p => [
                p.name,
                `${p.quantity} units`,
                `₦${formatPrice(p.revenue)}`
            ]) || [];
            
            if (topProductsData.length > 0) {
                autoTable(doc, {
                    startY: doc.lastAutoTable.finalY + 10,
                    head: [['Product', 'Quantity Sold', 'Revenue']],
                    body: topProductsData,
                    theme: 'striped',
                    headStyles: { fillColor: [0, 123, 255], textColor: 255 },
                });
            }
            
            doc.save('profit-loss-report.pdf');
            setMessage('Profit/Loss report downloaded as PDF!');
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error('PDF generation error:', error);
            setMessage('Error generating PDF. Please try again.');
        }
    };

    // ========== CHECK LOW STOCK ALERTS ==========
    const checkLowStockAlerts = (showAll = false, productsToCheck = null) => {
        const currentProducts = productsToCheck || productsRef.current;
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        const currentUserRole = user?.role || storedUser?.role;
        
        if (currentUserRole !== 'admin') return;
        if (!currentProducts || currentProducts.length === 0) return;
        
        const lowStockProducts = currentProducts.filter(p => p.quantity_in_stock <= 10 && p.quantity_in_stock > 0);
        const outOfStockProducts = currentProducts.filter(p => p.quantity_in_stock === 0);
        
        let delay = 0;
        
        lowStockProducts.forEach(product => {
            const productId = product.product_id || product.id;
            const alertKey = `low_stock_${productId}`;
            if (showAll || !sessionStorage.getItem(alertKey)) {
                setTimeout(() => {
                    toast.error(`⚠️ Low Stock: ${product.name} has only ${product.quantity_in_stock} left!`, {
                        duration: 4000,
                        position: 'top-center'
                    });
                }, delay);
                delay += 150;
                sessionStorage.setItem(alertKey, 'shown');
            }
        });
        
        outOfStockProducts.forEach(product => {
            const productId = product.product_id || product.id;
            const alertKey = `out_of_stock_${productId}`;
            if (showAll || !sessionStorage.getItem(alertKey)) {
                setTimeout(() => {
                    toast.error(`❌ Out of Stock: ${product.name} is sold out!`, {
                        duration: 4000,
                        position: 'top-center'
                    });
                }, delay);
                delay += 150;
                sessionStorage.setItem(alertKey, 'shown');
            }
        });
    };

    // ========== LOGIN FUNCTION ==========
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
                const loadedProducts = await loadAllData();
                await loadDashboardStats();
                if (data.data.user.role === 'admin') {
                    await loadProfitLoss();
                    await loadActivityLogs();
                }
                setTimeout(() => checkLowStockAlerts(true, loadedProducts), 100);
            } else {
                setMessage('Login failed: ' + data.error);
            }
        } catch (error) {
            setMessage('Error: ' + error.message);
        }
    };

    // ========== LOAD ALL DATA ==========
    const loadAllData = async () => {
        if (isLoading) return;
        setIsLoading(true);
        
        let loadedProducts = [];
        
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.warn('No token found');
                setIsLoading(false);
                return [];
            }
            
            const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
            
            const prodRes = await fetch(`${API_URL}/api/v1/products`, { headers });
            const prodData = await prodRes.json();
            if (prodData.success) {
                loadedProducts = prodData.data || [];
                setProducts(loadedProducts);
            }
            
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
            
            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            if (storedUser?.role === 'admin') {
                try {
                    const usersRes = await fetch(`${API_URL}/api/v1/users`, { headers });
                    if (usersRes.ok) {
                        const usersData = await usersRes.json();
                        if (usersData.success) setUsers(usersData.data || []);
                    } else {
                        setUsers([]);
                    }
                } catch (userErr) {
                    setUsers([]);
                }
            }
            
            await loadDashboardStats();
            if (storedUser?.role === 'admin') {
                await loadProfitLoss();
                await loadActivityLogs();
            }
            
            return loadedProducts;
        } catch (error) {
            console.error('Error loading data:', error);
            return [];
        } finally {
            setIsLoading(false);
        }
    };
    
    // ========== USER MANAGEMENT FUNCTIONS ==========
    const handleAddUser = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        try {
            const response = await fetch(`${API_URL}/api/v1/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(newUser)
            });
            const data = await response.json();
            if (data.success) {
                setShowUserForm(false);
                setNewUser({ full_name: '', email: '', password: '', role: 'staff' });
                await loadAllData();
                await loadActivityLogs();
                setMessage(`User ${newUser.full_name} created! They can login with email: ${newUser.email} and password: ${newUser.password}`);
                setTimeout(() => setMessage(''), 5000);
            } else {
                setMessage(data.error);
            }
        } catch (error) {
            setMessage('Error: ' + error.message);
        }
    };

    const handleDeleteUser = async (userId, userEmail) => {
        if (userEmail === 'admin@inventory.com') {
            setMessage('Cannot delete master admin account');
            setTimeout(() => setMessage(''), 3000);
            return;
        }
        if (!window.confirm('Delete this user?')) return;
        const token = localStorage.getItem('token');
        try {
            await fetch(`${API_URL}/api/v1/users/${userId}`, { 
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            await loadAllData();
            await loadActivityLogs();
            setMessage('User deleted');
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            setMessage('Error: ' + error.message);
        }
    };

    // ========== CSV EXPORT FUNCTION ==========
    const exportToCSV = (type) => {
        let data = [];
        let headers = [];
        let filename = '';
        
        if (type === 'inventory') {
            headers = ['Product Name', 'Price', 'Stock', 'Category'];
            data = products.map(p => [
                p.name,
                formatPrice(p.price),
                p.quantity_in_stock,
                p.categories?.category_name || 'Uncategorized'
            ]);
            filename = 'inventory-report.csv';
        } else if (type === 'sales') {
            headers = ['Invoice #', 'Date', 'Customer', 'Total', 'Payment Method', 'Quantity Sold', 'Products'];
            data = sales.map(s => [
                s.sale_number,
                new Date(s.sale_date).toLocaleDateString(),
                s.customer?.customer_name || 'Walk-in',
                formatPrice(s.total_amount),
                s.payment_method,
                getSaleTotalQuantity(s),
                s.items?.map(item => `${item.quantity}x ${item.product_name}`).join(', ') || 'N/A'
            ]);
            filename = 'sales-report.csv';
        } else if (type === 'purchases') {
            headers = ['Purchase #', 'Date', 'Supplier', 'Total Cost', 'Quantity Purchased', 'Products'];
            data = purchases.map(p => [
                p.purchase_number,
                new Date(p.purchase_date).toLocaleDateString(),
                p.suppliers?.supplier_name || 'Unknown',
                formatPrice(p.total_cost),
                getPurchaseTotalQuantity(p),
                p.items?.map(item => `${item.quantity}x ${item.product_name}`).join(', ') || 'N/A'
            ]);
            filename = 'purchase-report.csv';
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
        setMessage(`${type === 'inventory' ? 'Inventory' : type === 'sales' ? 'Sales' : 'Purchase'} report downloaded as CSV!`);
        setTimeout(() => setMessage(''), 3000);
    };

    // ========== PDF REPORT FUNCTION ==========
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
                    `₦${formatPrice(p.price)}`,
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
                const totalQuantitySold = calculateTotalQuantitySold();
                
                doc.setFontSize(18);
                doc.text('Sales Report', 14, 15);
                doc.setFontSize(10);
                doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 25);
                doc.text(`Total Sales: ₦${formatPrice(salesStats.totalSales || 0)}`, 14, 35);
                doc.text(`Today's Sales: ₦${formatPrice(salesStats.todaySales || 0)}`, 14, 45);
                doc.text(`Total Transactions: ${salesStats.saleCount || 0}`, 14, 55);
                doc.text(`Total Quantity Sold: ${totalQuantitySold} units`, 14, 65);
                
                const tableData = sales.map(s => [
                    s.sale_number,
                    new Date(s.sale_date).toLocaleDateString(),
                    s.customer?.customer_name || 'Walk-in',
                    `₦${formatPrice(s.total_amount)}`,
                    s.payment_method,
                    `${getSaleTotalQuantity(s)} units`,
                    s.items?.map(item => `${item.quantity}x ${item.product_name}`).join(', ') || 'N/A'
                ]);
                
                autoTable(doc, {
                    startY: 75,
                    head: [['Invoice #', 'Date', 'Customer', 'Total', 'Payment', 'Quantity', 'Products']],
                    body: tableData,
                    theme: 'striped',
                    headStyles: { fillColor: [0, 123, 255], textColor: 255 },
                    styles: { fontSize: 8, cellPadding: 2 },
                });
                
                doc.save('sales-report.pdf');
            } else if (reportType === 'purchases') {
                const totalQuantityPurchased = calculateTotalQuantityPurchased();
                const totalPurchaseCost = purchases.reduce((sum, p) => sum + (parseFloat(p.total_cost) || 0), 0);
                
                doc.setFontSize(18);
                doc.text('Purchase Report', 14, 15);
                doc.setFontSize(10);
                doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 25);
                doc.text(`Total Purchases: ${purchases.length}`, 14, 35);
                doc.text(`Total Cost: ₦${formatPrice(totalPurchaseCost)}`, 14, 45);
                doc.text(`Total Quantity Purchased: ${totalQuantityPurchased} units`, 14, 55);
                
                const tableData = purchases.map(p => [
                    p.purchase_number,
                    new Date(p.purchase_date).toLocaleDateString(),
                    p.suppliers?.supplier_name || 'Unknown',
                    `₦${formatPrice(p.total_cost)}`,
                    `${getPurchaseTotalQuantity(p)} units`,
                    p.items?.map(item => `${item.quantity}x ${item.product_name}`).join(', ') || 'N/A'
                ]);
                
                autoTable(doc, {
                    startY: 65,
                    head: [['Purchase #', 'Date', 'Supplier', 'Total Cost', 'Quantity', 'Products']],
                    body: tableData,
                    theme: 'striped',
                    headStyles: { fillColor: [0, 123, 255], textColor: 255 },
                    styles: { fontSize: 9, cellPadding: 3 },
                });
                
                doc.save('purchase-report.pdf');
            }
            
            setShowReportModal(false);
            setMessage('Report downloaded successfully!');
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error('PDF generation error:', error);
            setMessage('Error generating PDF. Please try again.');
        }
    };

    // ========== PURCHASE ITEM FUNCTIONS ==========
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

    // ========== PRODUCT FUNCTIONS ==========
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
                    category_id: newProduct.category_id,
                    cost_price: newProduct.cost_price ? parseFloat(newProduct.cost_price) : null
                })
            });
            const data = await response.json();
            if (data.success) {
                setShowProductForm(false);
                setNewProduct({ name: '', price: '', quantity_in_stock: '', category_id: '', cost_price: '' });
                await loadAllData();
                setMessage('Product added!');
                setTimeout(() => setMessage(''), 3000);
            } else {
                setMessage('Failed to add product');
            }
        } catch (error) {
            setMessage('Error: ' + error.message);
        }
    };

    const handleDeleteProduct = async (id) => {
        if (!window.confirm('Delete this product?')) return;
        const token = localStorage.getItem('token');
        try {
            await fetch(`${API_URL}/api/v1/products/${id}`, { 
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const loadedProducts = await loadAllData();
            setTimeout(() => checkLowStockAlerts(true, loadedProducts), 100);
            setMessage('Product deleted');
            setTimeout(() => setMessage(''), 3000);
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
            category_id: product.category_id || product.category,
            cost_price: product.cost_price || ''
        });
    };

    const handleUpdateProduct = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        try {
            const productId = editingProduct.product_id || editingProduct.id;
            const response = await fetch(`${API_URL}/api/v1/products/${productId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    name: editProductData.name,
                    price: parseFloat(editProductData.price),
                    quantity_in_stock: parseInt(editProductData.quantity_in_stock),
                    category_id: editProductData.category_id,
                    cost_price: editProductData.cost_price ? parseFloat(editProductData.cost_price) : null
                })
            });
            const data = await response.json();
            if (data.success) {
                setEditingProduct(null);
                setEditProductData({ name: '', price: '', quantity_in_stock: '', category_id: '', cost_price: '' });
                await loadAllData();
                setMessage('Product updated successfully!');
                setTimeout(() => setMessage(''), 3000);
            } else {
                setMessage('Update failed: ' + data.error);
            }
        } catch (error) {
            setMessage('Error: ' + error.message);
        }
    };

    // ========== PURCHASE FUNCTIONS ==========
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
                await loadAllData();
                setMessage('Purchase recorded!');
                setTimeout(() => setMessage(''), 3000);
            } else {
                setMessage('Failed to record purchase');
            }
        } catch (error) {
            setMessage('Error: ' + error.message);
        }
    };

    // ========== SALE ITEM FUNCTIONS ==========
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
    
    // ========== SALE FUNCTIONS ==========
    const handleAddSale = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        try {
            const response = await fetch(`${API_URL}/api/v1/sales`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    customer_id: null,
                    items: newSale.items,
                    payment_method: newSale.payment_method
                })
            });
            const data = await response.json();
            if (data.success) {
                setShowSaleForm(false);
                setLastSale(data.data);
                setShowReceiptModal(true);
                setNewSale({ items: [{ product_id: '', quantity: '' }], payment_method: 'cash' });
                const loadedProducts = await loadAllData();
                setTimeout(() => checkLowStockAlerts(true, loadedProducts), 100);
                setMessage('Sale recorded!');
                setTimeout(() => setMessage(''), 3000);
            } else {
                setMessage(data.error || 'Failed to record sale');
            }
        } catch (error) {
            setMessage('Error: ' + error.message);
        }
    };

    // ========== LOGOUT ==========
    const handleLogout = () => {
        setIsLoggedIn(false);
        setUser(null);
        localStorage.clear();
        sessionStorage.clear();
        setMessage('Logged out');
    };

    const toggleShowPassword = () => setShowPassword(!showPassword);

    // Get filtered products for selected category
    const getFilteredProducts = () => {
        if (!selectedCategoryPage) return [];
        return products.filter(p => (p.category_id || p.category) === selectedCategoryPage);
    };

    // Get category name by ID
    const getCategoryName = (categoryId) => {
        const category = categories.find(c => (c.id || c.category_id) === categoryId);
        return category ? (category.name || category.category_name) : 'Category';
    };

    const userRole = user?.role || JSON.parse(localStorage.getItem('user') || '{}')?.role;
    const filteredSales = getFilteredSales();

    // Chart data for sales by month (Admin only)
    const salesByMonthData = {
        labels: dashboardStats?.salesByMonth?.map(item => item.month) || [],
        datasets: [
            {
                label: 'Sales (₦)',
                data: dashboardStats?.salesByMonth?.map(item => item.sales) || [],
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1,
            },
        ],
    };

    // Chart data for top products (Admin only)
    const topProductsData = {
        labels: dashboardStats?.topProducts?.map(item => item.name) || [],
        datasets: [
            {
                label: 'Quantity Sold',
                data: dashboardStats?.topProducts?.map(item => item.quantity) || [],
                backgroundColor: 'rgba(75, 192, 192, 0.5)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1,
            },
        ],
    };

    // Profit/Loss chart data (Admin only)
    const profitLossData = {
        labels: ['Revenue', 'Cost', 'Profit'],
        datasets: [
            {
                label: 'Amount (₦)',
                data: profitLoss ? [profitLoss.profitLoss.totalRevenue, profitLoss.profitLoss.totalCost, profitLoss.profitLoss.totalProfit] : [0, 0, 0],
                backgroundColor: ['rgba(54, 162, 235, 0.5)', 'rgba(255, 99, 132, 0.5)', 'rgba(75, 192, 192, 0.5)'],
                borderColor: ['rgba(54, 162, 235, 1)', 'rgba(255, 99, 132, 1)', 'rgba(75, 192, 192, 1)'],
                borderWidth: 1,
            },
        ],
    };

    // ========== LOGIN SCREEN ==========
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

    // ========== CATEGORY PAGE VIEW ==========
    if (selectedCategoryPage) {
        const categoryProducts = getFilteredProducts();
        const categoryName = getCategoryName(selectedCategoryPage);
        
        return (
            <div style={styles.appContainer}>
                <Toaster position="top-center" reverseOrder={false} />
                <nav style={styles.navbar}>
                    <h2 style={styles.navTitle}>Inventory System</h2>
                    <div style={styles.navRight}>
                        <span style={styles.userRole}>{userRole?.toUpperCase()}</span>
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
                            {userRole === 'admin' && (
                                <button onClick={() => setShowProductForm(true)} style={styles.addButton}>+ Add Product</button>
                            )}
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
                                    {categoryProducts.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" style={styles.noData}>No products in this category yet. Add one!</td>
                                        </tr>
                                    ) : (
                                        categoryProducts.map((product) => (
                                            <tr key={product.product_id || product.id}>
                                                <td>{product.name}</td>
                                                <td>₦{formatPrice(product.price)}</td>
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
                                                    {userRole === 'admin' && (
                                                        <>
                                                            <button onClick={() => handleEditProduct(product)} style={styles.editButton}>Edit</button>
                                                            <button onClick={() => handleDeleteProduct(product.product_id || product.id)} style={styles.deleteButton}>Delete</button>
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                {showProductForm && (
                    <div style={styles.modalOverlay}>
                        <div style={styles.modal}>
                            <div style={styles.modalHeader}>
                                <h3>Add Product to {categoryName}</h3>
                                <button onClick={() => setShowProductForm(false)} style={styles.closeButton}>×</button>
                            </div>
                            <form onSubmit={handleAddProduct}>
                                <input type="text" placeholder="Product Name" value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} style={styles.modalInput} required />
                                <input type="number" step="0.01" placeholder="Selling Price" value={newProduct.price} onChange={(e) => setNewProduct({...newProduct, price: e.target.value})} style={styles.modalInput} required />
                                <input type="number" step="0.01" placeholder="Cost Price (for profit calculation)" value={newProduct.cost_price} onChange={(e) => setNewProduct({...newProduct, cost_price: e.target.value})} style={styles.modalInput} />
                                <input type="number" placeholder="Initial Stock" value={newProduct.quantity_in_stock} onChange={(e) => setNewProduct({...newProduct, quantity_in_stock: e.target.value})} style={styles.modalInput} required />
                                <button type="submit" style={styles.submitButton}>Add Product</button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ========== MAIN DASHBOARD SCREEN ==========
    return (
        <div style={styles.appContainer}>
            <Toaster position="top-center" reverseOrder={false} />
            <nav style={styles.navbar}>
                <h2 style={styles.navTitle}>Inventory System</h2>
                <div style={styles.navRight}>
                    <span style={styles.userRole}>{userRole?.toUpperCase()}</span>
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
                        {userRole === 'admin' && <option value="users">Users</option>}
                        {userRole === 'admin' && <option value="profitloss">Profit/Loss</option>}
                        {userRole === 'admin' && <option value="activity">Activity Log</option>}
                    </select>
                ) : (
                    <>
                        <button onClick={() => setActiveTab('dashboard')} style={{...styles.tab, ...(activeTab === 'dashboard' ? styles.activeTab : {})}}>Dashboard</button>
                        <button onClick={() => setActiveTab('products')} style={{...styles.tab, ...(activeTab === 'products' ? styles.activeTab : {})}}>Products</button>
                        <button onClick={() => setActiveTab('purchases')} style={{...styles.tab, ...(activeTab === 'purchases' ? styles.activeTab : {})}}>Purchases</button>
                        <button onClick={() => setActiveTab('sales')} style={{...styles.tab, ...(activeTab === 'sales' ? styles.activeTab : {})}}>Sales</button>
                        {userRole === 'admin' && (
                            <button onClick={() => setActiveTab('users')} style={{...styles.tab, ...(activeTab === 'users' ? styles.activeTab : {})}}>Users</button>
                        )}
                        {userRole === 'admin' && (
                            <button onClick={() => setActiveTab('profitloss')} style={{...styles.tab, ...(activeTab === 'profitloss' ? styles.activeTab : {})}}>Profit/Loss</button>
                        )}
                        {userRole === 'admin' && (
                            <button onClick={() => setActiveTab('activity')} style={{...styles.tab, ...(activeTab === 'activity' ? styles.activeTab : {})}}>Activity Log</button>
                        )}
                    </>
                )}
            </div>
            <div style={styles.dashboard}>
                {activeTab === 'dashboard' && (
                    <>
                        {userRole === 'admin' && (
                            <div style={styles.reportButtonContainer}>
                                <button onClick={() => setShowReportModal(true)} style={styles.reportButton}>📊 Generate Report</button>
                            </div>
                        )}
                        
                        {/* Stats Cards - Same for both Admin and Staff */}
                        <div style={styles.statsGrid}>
                            <div style={styles.statCard}><h3>Total Products</h3><p style={styles.statNumber}>{dashboardStats?.totalProducts || 0}</p></div>
                            <div style={styles.statCard}><h3>Total Sales</h3><p style={styles.statNumber}>₦{formatPrice(dashboardStats?.totalSales || 0)}</p></div>
                            <div style={styles.statCard}><h3>Low Stock Items</h3><p style={styles.statNumber}>{dashboardStats?.lowStockProducts || 0}</p></div>
                            <div style={styles.statCard}><h3>Out of Stock</h3><p style={styles.statNumber}>{dashboardStats?.outOfStockProducts || 0}</p></div>
                        </div>
                        
                        {/* For Admin: Show Charts */}
                        {userRole === 'admin' && (
                            <div style={styles.chartsGrid}>
                                <div style={styles.chartCard}>
                                    <h3>Sales by Month</h3>
                                    {dashboardStats?.salesByMonth?.length > 0 ? (
                                        <Bar data={salesByMonthData} options={{ responsive: true, maintainAspectRatio: true }} />
                                    ) : (
                                        <p style={styles.noData}>No sales data yet</p>
                                    )}
                                </div>
                                <div style={styles.chartCard}>
                                    <h3>Top Selling Products</h3>
                                    {dashboardStats?.topProducts?.length > 0 ? (
                                        <Bar data={topProductsData} options={{ responsive: true, maintainAspectRatio: true }} />
                                    ) : (
                                        <p style={styles.noData}>No sales data yet</p>
                                    )}
                                </div>
                            </div>
                        )}
                        
                        {/* For Staff: Show Product Categories instead of Charts */}
                        {userRole === 'staff' && (
                            <div style={styles.categoriesSection}>
                                <h3 style={styles.sectionTitle}>Product Categories</h3>
                                <div style={styles.categoryList}>
                                    {categories.map((cat) => {
                                        const categoryId = cat.id || cat.category_id;
                                        const categoryName = cat.name || cat.category_name;
                                        const productCount = products.filter(p => (p.category_id || p.category) === categoryId).length;
                                        return (
                                            <div 
                                                key={categoryId} 
                                                style={styles.categoryCard}
                                                onClick={() => setSelectedCategoryPage(categoryId)}
                                            >
                                                <h4>{categoryName}</h4>
                                                <p>{cat.description || 'No description'}</p>
                                                <small style={styles.productCount}>{productCount} product(s)</small>
                                                <div style={styles.viewProductsButton}>View Products →</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        
                        {/* Recent Sales Table - Same for both */}
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
                                            <th>Quantity</th>
                                            <th>Items</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dashboardStats?.recentSales?.slice(0, 5).map((sale) => (
                                            <tr key={sale.sale_id}>
                                                <td>{sale.sale_number}</td>
                                                <td>{new Date(sale.sale_date).toLocaleDateString()}</td>
                                                <td>{sale.customer?.customer_name || 'Walk-in'}</td>
                                                <td>₦{formatPrice(sale.total_amount)}</td>
                                                <td>{getSaleTotalQuantity(sale)} units</td>
                                                <td>
                                                    <button onClick={() => {
                                                        setSelectedSale(sale);
                                                        setShowSaleDetailsModal(true);
                                                    }} style={styles.viewButton}>View Items</button>
                                                </td>
                                            </tr>
                                        ))}
                                        {(!dashboardStats?.recentSales || dashboardStats.recentSales.length === 0) && (
                                            <tr><td colSpan="6" style={styles.noData}>No sales yet</td></tr>
                                        )}
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
                            {userRole === 'admin' && (
                                <button onClick={() => setShowProductForm(true)} style={styles.addButton}>+ Add Product</button>
                            )}
                        </div>
                        <div style={styles.productTable}>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Selling Price</th>
                                        <th>Cost Price</th>
                                        <th>Stock</th>
                                        <th>Category</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.map((product) => {
                                        const categoryName = categories.find(c => (c.id || c.category_id) === (product.category_id || product.category))?.name || 'Uncategorized';
                                        return (
                                            <tr key={product.product_id || product.id}>
                                                <td>{product.name}</td>
                                                <td>₦{formatPrice(product.price)}</td>
                                                <td>{product.cost_price ? `₦${formatPrice(product.cost_price)}` : 'N/A'}</td>
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
                                                    {userRole === 'admin' && (
                                                        <>
                                                            <button onClick={() => handleEditProduct(product)} style={styles.editButton}>Edit</button>
                                                            <button onClick={() => handleDeleteProduct(product.product_id || product.id)} style={styles.deleteButton}>Delete</button>
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {products.length === 0 && (
                                        <tr><td colSpan="6" style={styles.noData}>No products yet</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                
                {activeTab === 'purchases' && (
                    <div style={styles.productsSection}>
                        <div style={styles.sectionHeader}>
                            <h3 style={styles.sectionTitle}>Purchase Orders</h3>
                            {userRole === 'admin' && (
                                <button onClick={() => setShowPurchaseForm(true)} style={styles.addButton}>+ New Purchase</button>
                            )}
                        </div>
                        <div style={styles.productTable}>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Purchase #</th>
                                        <th>Supplier</th>
                                        <th>Date</th>
                                        <th>Total Cost</th>
                                        <th>Quantity</th>
                                        <th>Products</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {purchases.map((purchase) => (
                                        <tr key={purchase.purchase_id}>
                                            <td>{purchase.purchase_number}</td>
                                            <td>{purchase.suppliers?.supplier_name || 'Unknown'}</td>
                                            <td>{new Date(purchase.purchase_date).toLocaleDateString()}</td>
                                            <td>₦{formatPrice(purchase.total_cost)}</td>
                                            <td>{getPurchaseTotalQuantity(purchase)} units</td>
                                            <td>{purchase.items?.map(item => `${item.quantity}x ${item.product_name}`).join(', ') || 'N/A'}</td>
                                        </tr>
                                    ))}
                                    {purchases.length === 0 && (
                                        <tr><td colSpan="6" style={styles.noData}>No purchases yet</td></tr>
                                    )}
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
                        <div style={styles.searchContainer}>
                            <input
                                type="text"
                                placeholder="🔍 Search by Invoice Number..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={styles.searchInput}
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} style={styles.clearSearchButton}>Clear</button>
                            )}
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
                                        <th>Quantity</th>
                                        <th>Items</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSales.map((sale) => (
                                        <tr key={sale.sale_id}>
                                            <td>{sale.sale_number}</td>
                                            <td>{new Date(sale.sale_date).toLocaleDateString()}</td>
                                            <td>{sale.customer?.customer_name || 'Walk-in'}</td>
                                            <td>₦{formatPrice(sale.total_amount)}</td>
                                            <td>{sale.payment_method}</td>
                                            <td>{getSaleTotalQuantity(sale)} units</td>
                                            <td>{sale.items?.map(item => `${item.quantity}x ${item.product_name}`).join(', ') || 'N/A'}</td>
                                            <td>
                                                <button onClick={() => printReceipt(sale)} style={styles.printButton}>🖨️ Print</button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredSales.length === 0 && (
                                        <tr><td colSpan="8" style={styles.noData}>{searchTerm ? 'No sales found matching your search' : 'No sales yet'}</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                
                {activeTab === 'users' && userRole === 'admin' && (
                    <div style={styles.productsSection}>
                        <div style={styles.sectionHeader}>
                            <h3 style={styles.sectionTitle}>User Management</h3>
                            <button onClick={() => setShowUserForm(true)} style={styles.addButton}>+ Add User</button>
                        </div>
                        <div style={styles.productTable}>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th>Status</th>
                                        <th>Created</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((u) => (
                                        <tr key={u.id}>
                                            <td>{u.full_name}</td>
                                            <td>{u.email}</td>
                                            <td><span style={{...styles.roleBadge, backgroundColor: u.role === 'admin' ? '#dc3545' : '#28a745'}}>{u.role}</span></td>
                                            <td><span style={{...styles.statusBadge, backgroundColor: u.status === 'active' ? '#28a745' : '#dc3545'}}>{u.status}</span></td>
                                            <td>{new Date(u.created_at).toLocaleDateString()}</td>
                                            <td>
                                                {u.email !== 'admin@inventory.com' && (
                                                    <>
                                                        <button onClick={() => setResettingUserId(u.id)} style={styles.editButton}>Reset PW</button>
                                                        <button onClick={() => handleDeleteUser(u.id, u.email)} style={styles.deleteButton}>Delete</button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {users.length === 0 && (
                                        <tr><td colSpan="6" style={styles.noData}>No users found</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                
                {activeTab === 'profitloss' && userRole === 'admin' && (
                    <div style={styles.productsSection}>
                        <div style={styles.sectionHeader}>
                            <h3 style={styles.sectionTitle}>Profit & Loss Report</h3>
                            <div style={styles.reportButtonGroup}>
                                <button onClick={exportProfitLossToPDF} style={styles.reportOptionButton}>PDF</button>
                                <button onClick={exportProfitLossToCSV} style={styles.reportOptionButtonCSV}>CSV</button>
                            </div>
                        </div>
                        {profitLoss && (
                            <>
                                <div style={styles.profitLossCards}>
                                    <div style={{...styles.statCard, backgroundColor: '#d4edda'}}>
                                        <h3>Total Revenue</h3>
                                        <p style={styles.statNumber}>₦{formatPrice(profitLoss.profitLoss.totalRevenue)}</p>
                                    </div>
                                    <div style={{...styles.statCard, backgroundColor: '#f8d7da'}}>
                                        <h3>Total Cost</h3>
                                        <p style={styles.statNumber}>₦{formatPrice(profitLoss.profitLoss.totalCost)}</p>
                                    </div>
                                    <div style={{...styles.statCard, backgroundColor: profitLoss.profitLoss.totalProfit >= 0 ? '#d1ecf1' : '#f8d7da'}}>
                                        <h3>Net Profit</h3>
                                        <p style={{...styles.statNumber, color: profitLoss.profitLoss.totalProfit >= 0 ? '#28a745' : '#dc3545'}}>
                                            ₦{formatPrice(profitLoss.profitLoss.totalProfit)}
                                        </p>
                                    </div>
                                    <div style={{...styles.statCard}}>
                                        <h3>Profit Margin</h3>
                                        <p style={styles.statNumber}>{formatPrice(profitLoss.profitLoss.profitMargin)}%</p>
                                    </div>
                                </div>
                                
                                <div style={styles.chartCard}>
                                    <h3>Revenue vs Cost vs Profit</h3>
                                    <Pie data={profitLossData} options={{ responsive: true, maintainAspectRatio: true }} />
                                </div>
                                
                                <div style={styles.chartCard}>
                                    <h3>Top Selling Products</h3>
                                    <table style={styles.table}>
                                        <thead><tr><th>Product</th><th>Quantity Sold</th><th>Revenue</th></tr></thead>
                                        <tbody>
                                            {profitLoss.topProducts?.map((product, idx) => (
                                                <tr key={idx}><td>{product.name}</td><td>{product.quantity} units</td><td>₦{formatPrice(product.revenue)}</td></tr>
                                            ))}
                                            {(!profitLoss.topProducts || profitLoss.topProducts.length === 0) && (
                                                <tr><td colSpan="3" style={styles.noData}>No sales data yet</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                )}
                
                {activeTab === 'activity' && userRole === 'admin' && (
                    <div style={styles.productsSection}>
                        <div style={styles.sectionHeader}>
                            <h3 style={styles.sectionTitle}>Activity Log (Audit Trail)</h3>
                            <div style={styles.filterContainer}>
                                <select value={filterAction} onChange={(e) => { setFilterAction(e.target.value); setTimeout(loadActivityLogs, 100); }} style={styles.filterSelect}>
                                    <option value="">All Actions</option>
                                    <option value="CREATE">Create</option>
                                    <option value="UPDATE">Update</option>
                                    <option value="DELETE">Delete</option>
                                    <option value="LOGIN">Login</option>
                                </select>
                                <select value={filterEntity} onChange={(e) => { setFilterEntity(e.target.value); setTimeout(loadActivityLogs, 100); }} style={styles.filterSelect}>
                                    <option value="">All Entities</option>
                                    <option value="product">Product</option>
                                    <option value="sale">Sale</option>
                                    <option value="purchase">Purchase</option>
                                    <option value="user">User</option>
                                    <option value="customer">Customer</option>
                                </select>
                                <button onClick={() => { setFilterAction(''); setFilterEntity(''); setTimeout(loadActivityLogs, 100); }} style={styles.clearSearchButton}>Clear Filters</button>
                            </div>
                        </div>
                        <div style={styles.productTable}>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Time</th>
                                        <th>User</th>
                                        <th>Action</th>
                                        <th>Entity</th>
                                        <th>Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activityLogs.map((log) => (
                                        <tr key={log.id}>
                                            <td>{new Date(log.created_at).toLocaleString()}</td>
                                            <td>{log.user_name}</td>
                                            <td>
                                                <span style={{
                                                    ...styles.actionBadge,
                                                    backgroundColor: log.action === 'CREATE' ? '#28a745' : 
                                                                   log.action === 'UPDATE' ? '#ffc107' : 
                                                                   log.action === 'DELETE' ? '#dc3545' : '#17a2b8'
                                                }}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td>{log.entity_type}</td>
                                            <td>{log.details}</td>
                                        </tr>
                                    ))}
                                    {activityLogs.length === 0 && (
                                        <tr><td colSpan="5" style={styles.noData}>No activity logs found</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Sale Details Modal */}
            {showSaleDetailsModal && selectedSale && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modal}>
                        <div style={styles.modalHeader}>
                            <h3>Sale Details - {selectedSale.sale_number}</h3>
                            <button onClick={() => setShowSaleDetailsModal(false)} style={styles.closeButton}>×</button>
                        </div>
                        <div style={styles.receiptPreview}>
                            <p><strong>Date:</strong> {new Date(selectedSale.sale_date).toLocaleString()}</p>
                            <p><strong>Customer:</strong> {selectedSale.customer?.customer_name || 'Walk-in Customer'}</p>
                            <p><strong>Payment Method:</strong> {selectedSale.payment_method}</p>
                            <p><strong>Total Amount:</strong> ₦{formatPrice(selectedSale.total_amount)}</p>
                            <h4>Items Purchased:</h4>
                            <table style={styles.table}>
                                <thead><tr><th>Product</th><th>Quantity</th><th>Unit Price</th><th>Subtotal</th></tr></thead>
                                <tbody>
                                    {selectedSale.items?.map((item, idx) => (
                                        <tr key={idx}>
                                            <td>{item.product_name}</td>
                                            <td>{item.quantity}</td>
                                            <td>₦{formatPrice(item.unit_price)}</td>
                                            <td>₦{formatPrice(item.subtotal)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div style={{display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px'}}>
                                <button onClick={() => printReceipt(selectedSale)} style={{...styles.submitButton, backgroundColor: '#28a745', width: 'auto', padding: '10px 20px'}}>🖨️ Print Receipt</button>
                                <button onClick={() => setShowSaleDetailsModal(false)} style={{...styles.submitButton, backgroundColor: '#6c757d', width: 'auto', padding: '10px 20px'}}>Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Modals */}
            {showProductForm && !selectedCategoryPage && userRole === 'admin' && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modal}>
                        <div style={styles.modalHeader}>
                            <h3>Add Product</h3>
                            <button onClick={() => setShowProductForm(false)} style={styles.closeButton}>×</button>
                        </div>
                        <form onSubmit={handleAddProduct}>
                            <input type="text" placeholder="Product Name" value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} style={styles.modalInput} required />
                            <input type="number" step="0.01" placeholder="Selling Price" value={newProduct.price} onChange={(e) => setNewProduct({...newProduct, price: e.target.value})} style={styles.modalInput} required />
                            <input type="number" step="0.01" placeholder="Cost Price (for profit calculation)" value={newProduct.cost_price} onChange={(e) => setNewProduct({...newProduct, cost_price: e.target.value})} style={styles.modalInput} />
                            <input type="number" placeholder="Initial Stock" value={newProduct.quantity_in_stock} onChange={(e) => setNewProduct({...newProduct, quantity_in_stock: e.target.value})} style={styles.modalInput} required />
                            <select value={newProduct.category_id} onChange={(e) => setNewProduct({...newProduct, category_id: e.target.value})} style={styles.modalInput} required>
                                <option value="">Select Category</option>
                                {categories.map((cat) => (
                                    <option key={cat.id || cat.category_id} value={cat.id || cat.category_id}>
                                        {cat.name || cat.category_name}
                                    </option>
                                ))}
                            </select>
                            <button type="submit" style={styles.submitButton}>Add Product</button>
                        </form>
                    </div>
                </div>
            )}
            
            {editingProduct && userRole === 'admin' && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modal}>
                        <div style={styles.modalHeader}>
                            <h3>Edit Product</h3>
                            <button onClick={() => setEditingProduct(null)} style={styles.closeButton}>×</button>
                        </div>
                        <form onSubmit={handleUpdateProduct}>
                            <input type="text" placeholder="Product Name" value={editProductData.name} onChange={(e) => setEditProductData({...editProductData, name: e.target.value})} style={styles.modalInput} required />
                            <input type="number" step="0.01" placeholder="Selling Price" value={editProductData.price} onChange={(e) => setEditProductData({...editProductData, price: e.target.value})} style={styles.modalInput} required />
                            <input type="number" step="0.01" placeholder="Cost Price" value={editProductData.cost_price} onChange={(e) => setEditProductData({...editProductData, cost_price: e.target.value})} style={styles.modalInput} />
                            <input type="number" placeholder="Stock Quantity" value={editProductData.quantity_in_stock} onChange={(e) => setEditProductData({...editProductData, quantity_in_stock: e.target.value})} style={styles.modalInput} required />
                            <select value={editProductData.category_id} onChange={(e) => setEditProductData({...editProductData, category_id: e.target.value})} style={styles.modalInput} required>
                                <option value="">Select Category</option>
                                {categories.map((cat) => (
                                    <option key={cat.id || cat.category_id} value={cat.id || cat.category_id}>
                                        {cat.name || cat.category_name}
                                    </option>
                                ))}
                            </select>
                            <button type="submit" style={styles.submitButton}>Update Product</button>
                        </form>
                    </div>
                </div>
            )}
            
            {showUserForm && userRole === 'admin' && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modal}>
                        <div style={styles.modalHeader}>
                            <h3>Add New User</h3>
                            <button onClick={() => setShowUserForm(false)} style={styles.closeButton}>×</button>
                        </div>
                        <form onSubmit={handleAddUser}>
                            <input type="text" placeholder="Full Name" value={newUser.full_name} onChange={(e) => setNewUser({...newUser, full_name: e.target.value})} style={styles.modalInput} required />
                            <input type="email" placeholder="Email" value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} style={styles.modalInput} required />
                            <input type="password" placeholder="Password" value={newUser.password} onChange={(e) => setNewUser({...newUser, password: e.target.value})} style={styles.modalInput} required />
                            <select value={newUser.role} onChange={(e) => setNewUser({...newUser, role: e.target.value})} style={styles.modalInput}>
                                <option value="staff">Staff</option>
                                <option value="admin">Admin</option>
                            </select>
                            <button type="submit" style={styles.submitButton}>Create User</button>
                        </form>
                        <p style={{fontSize: '12px', color: '#666', marginTop: '10px', textAlign: 'center'}}>
                            User can login with their email and the password you set
                        </p>
                    </div>
                </div>
            )}
            
            {resettingUserId && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modal}>
                        <div style={styles.modalHeader}>
                            <h3>Reset Password</h3>
                            <button onClick={() => setResettingUserId(null)} style={styles.closeButton}>×</button>
                        </div>
                        <input type="password" placeholder="New Password" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} style={styles.modalInput} />
                        <button onClick={() => handleResetPassword(resettingUserId, newUserPassword)} style={styles.submitButton}>Reset Password</button>
                    </div>
                </div>
            )}
            
            {showPurchaseForm && userRole === 'admin' && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalLarge}>
                        <div style={styles.modalHeader}>
                            <h3>New Purchase</h3>
                            <button onClick={() => setShowPurchaseForm(false)} style={styles.closeButton}>×</button>
                        </div>
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
                                    <input type="number" step="0.01" placeholder="Cost" value={item.cost_price} onChange={(e) => handlePurchaseItemChange(idx, 'cost_price', e.target.value)} style={styles.itemInput} required />
                                    {newPurchase.items.length > 1 && (
                                        <button type="button" onClick={() => removePurchaseItem(idx)} style={styles.removeButton}>×</button>
                                    )}
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
                        <div style={styles.modalHeader}>
                            <h3>New Sale</h3>
                            <button onClick={() => setShowSaleForm(false)} style={styles.closeButton}>×</button>
                        </div>
                        <form onSubmit={handleAddSale}>
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
                                            <option key={p.product_id || p.id} value={p.product_id || p.id}>
                                                {p.name} (₦{formatPrice(p.price)}) - Stock: {p.quantity_in_stock}
                                            </option>
                                        ))}
                                    </select>
                                    <input type="number" placeholder="Quantity" value={item.quantity} onChange={(e) => handleSaleItemChange(idx, 'quantity', e.target.value)} style={styles.itemInput} required />
                                    {newSale.items.length > 1 && (
                                        <button type="button" onClick={() => removeSaleItem(idx)} style={styles.removeButton}>×</button>
                                    )}
                                </div>
                            ))}
                            <button type="button" onClick={addSaleItem} style={styles.addItemButton}>+ Add Item</button>
                            <button type="submit" style={styles.submitButton}>Complete Sale</button>
                        </form>
                    </div>
                </div>
            )}
            
            {showReceiptModal && lastSale && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modal}>
                        <div style={styles.modalHeader}>
                            <h3>Sale Complete! 🎉</h3>
                            <button onClick={() => setShowReceiptModal(false)} style={styles.closeButton}>×</button>
                        </div>
                        <div style={styles.receiptPreview}>
                            <p style={{textAlign: 'center', fontSize: '14px', marginBottom: '20px'}}>Sale recorded successfully!</p>
                            <div style={{display: 'flex', gap: '10px', justifyContent: 'center'}}>
                                <button onClick={() => printReceipt(lastSale)} style={{...styles.submitButton, backgroundColor: '#28a745', width: 'auto', padding: '10px 20px'}}>🖨️ Print Receipt</button>
                                <button onClick={() => setShowReceiptModal(false)} style={{...styles.submitButton, backgroundColor: '#6c757d', width: 'auto', padding: '10px 20px'}}>Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {showReportModal && userRole === 'admin' && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modal}>
                        <div style={styles.modalHeader}>
                            <h3>Generate Report</h3>
                            <button onClick={() => setShowReportModal(false)} style={styles.closeButton}>×</button>
                        </div>
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
                            <h4 style={styles.reportSubtitle}>📥 Purchase Report</h4>
                            <div style={styles.reportButtonGroup}>
                                <button onClick={() => { setReportType('purchases'); generatePDF(); }} style={styles.reportOptionButton}>PDF</button>
                                <button onClick={() => exportToCSV('purchases')} style={styles.reportOptionButtonCSV}>CSV</button>
                            </div>
                            <h4 style={styles.reportSubtitle}>💰 Profit & Loss Report</h4>
                            <div style={styles.reportButtonGroup}>
                                <button onClick={exportProfitLossToPDF} style={styles.reportOptionButton}>PDF</button>
                                <button onClick={exportProfitLossToCSV} style={styles.reportOptionButtonCSV}>CSV</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ========== STYLES ==========
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
    tabs: { display: 'flex', gap: '10px', padding: '20px 30px 0 30px', backgroundColor: '#f0f2f5', overflowX: 'auto', WebkitOverflowScrolling: 'touch', flexWrap: 'wrap' },
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
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' },
    statCard: { backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', textAlign: 'center' },
    statNumber: { fontSize: '32px', fontWeight: 'bold', color: '#007bff', margin: '10px 0 0 0' },
    chartsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginBottom: '30px' },
    chartCard: { backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
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
    printButton: { padding: '4px 8px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    viewButton: { padding: '4px 8px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    roleBadge: { padding: '4px 8px', borderRadius: '4px', color: 'white', fontSize: '12px', display: 'inline-block' },
    statusBadge: { padding: '4px 8px', borderRadius: '4px', color: 'white', fontSize: '12px', display: 'inline-block' },
    actionBadge: { padding: '4px 8px', borderRadius: '4px', color: 'white', fontSize: '11px', display: 'inline-block' },
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
    backButton: { padding: '8px 16px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginBottom: '20px' },
    receiptPreview: { textAlign: 'center', padding: '10px' },
    searchContainer: { display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'center' },
    searchInput: { flex: 1, padding: '10px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '4px' },
    clearSearchButton: { padding: '10px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    filterContainer: { display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' },
    filterSelect: { padding: '8px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: 'white' },
    profitLossCards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }
};

export default App;