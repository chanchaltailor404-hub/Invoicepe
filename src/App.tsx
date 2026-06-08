import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from './supabase';
import { 
  TrendingUp, 
  Plus, 
  Search, 
  Share2, 
  Check, 
  Clock, 
  ArrowUpRight, 
  FileText, 
  X, 
  Store, 
  Phone, 
  PlusCircle, 
  Trash2, 
  CheckCircle2, 
  ArrowRight, 
  Info,
  Calendar,
  AlertCircle,
  Filter,
  Users,
  ArrowLeft,
  ChevronRight,
  MessageSquare,
  LogOut,
  Notebook,
  QrCode,
  Mic,
  MicOff,
  Gift,
  Sun,
  Moon,
  Lock,
  Key,
  Mail,
  Sparkles,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeCanvas } from 'qrcode.react';
import { INITIAL_INVOICES, Invoice, InvoiceItem, SUGGESTED_ITEMS, UdhaarEntry } from './data';

export default function App() {
  // Supabase Auth States
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [rememberMe, setRememberMe] = useState(true);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // State for shop configuration
  const [shopName, setShopName] = useState(() => localStorage.getItem('invoicepe_shop_name') || 'Verma General Store');
  const [isEditingShop, setIsEditingShop] = useState(false);
  const [customShopInput, setCustomShopInput] = useState(shopName);

  const [ownerName, setOwnerName] = useState(() => localStorage.getItem('invoicepe_owner_name') || '');
  const [customOwnerInput, setCustomOwnerInput] = useState(ownerName);

  const [shopPhone, setShopPhone] = useState(() => localStorage.getItem('invoicepe_shop_phone') || '');
  const [customShopPhoneInput, setCustomShopPhoneInput] = useState(shopPhone);

  const [shopAddress, setShopAddress] = useState(() => localStorage.getItem('invoicepe_shop_address') || '');
  const [customShopAddressInput, setCustomShopAddressInput] = useState(shopAddress);

  // UPI configuration
  const [upiId, setUpiId] = useState(() => {
    const stored = localStorage.getItem('invoicepe_upi_id');
    return (stored === 'shopname@upi' ? '' : (stored || ''));
  });
  const [customUpiInput, setCustomUpiInput] = useState(() => {
    const stored = localStorage.getItem('invoicepe_upi_id');
    return (stored === 'shopname@upi' ? '' : (stored || ''));
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // GSTIN configuration
  const [gstin, setGstin] = useState(() => localStorage.getItem('invoicepe_gstin') || '');
  const [customGstinInput, setCustomGstinInput] = useState(() => localStorage.getItem('invoicepe_gstin') || '');

  // Referral states
  const [referralCode, setReferralCode] = useState(() => localStorage.getItem('invoicepe_referral_code') || '');
  const [enteredReferralCode, setEnteredReferralCode] = useState('');
  const [totalReferrals, setTotalReferrals] = useState(0);
  const [freeMonths, setFreeMonths] = useState(0);
  const [proExpiresAt, setProExpiresAt] = useState<string | null>(null);
  const [proUntil, setProUntil] = useState<string | null>(() => {
    try {
      const p = localStorage.getItem('invoicepe_pro_until');
      if (!p) return null;
      const d = new Date(p);
      if (isNaN(d.getTime())) return null;
      return p;
    } catch (_) {
      return null;
    }
  });
  const [userPlan, setUserPlan] = useState<string>(() => {
    try {
      const p = localStorage.getItem('invoicepe_plan');
      if (!p) return 'free';
      const normalized = p.toLowerCase().trim();
      if (normalized === 'pro' || normalized === 'business') {
        return normalized;
      }
    } catch (_) {}
    return 'free';
  });

  // Discovered columns of shop_profiles list to safely update only existing columns
  const [discoveredShopProfileFields, setDiscoveredShopProfileFields] = useState<string[] | null>(null);

  const filterShopProfilePayload = (payload: Record<string, any>): Record<string, any> => {
    if (!discoveredShopProfileFields) {
      const fallbackCols = ['user_id', 'shop_name', 'owner_name', 'phone', 'address', 'upi_id', 'gstin'];
      const clean: Record<string, any> = {};
      for (const key of Object.keys(payload)) {
        if (fallbackCols.includes(key)) {
          clean[key] = payload[key];
        }
      }
      return clean;
    }
    const clean: Record<string, any> = {};
    for (const key of Object.keys(payload)) {
      if (discoveredShopProfileFields.includes(key)) {
        clean[key] = payload[key];
      }
    }
    return clean;
  };

  // Dark mode state control (Disabled: client requested pure light mode)
  const darkMode = false;

  const generateReferralCode = (nameOrUser: any): string => {
    let base = 'USER';
    if (typeof nameOrUser === 'string') {
      base = nameOrUser;
    } else if (nameOrUser && typeof nameOrUser === 'object') {
      const uMetadata = nameOrUser.user_metadata || {};
      const ownerName = uMetadata.owner_name || uMetadata.name;
      const userEmail = nameOrUser.email || '';
      
      if (ownerName && ownerName.trim()) {
        base = ownerName.trim();
      } else if (userEmail && userEmail.trim()) {
        base = userEmail.split('@')[0];
      } else if (uMetadata.shop_name && uMetadata.shop_name.trim()) {
        base = uMetadata.shop_name.trim();
      }
    }

    const cleanBase = (base || 'USER')
      .toUpperCase()
      .replace(/[^A-Z]/g, '');

    const truncated = cleanBase.substring(0, 10) || 'USER';
    const suffix = Math.floor(Math.random() * 90) + 10;
    return `${truncated}${suffix}`;
  };

  // GST Report configuration
  const [isGstReportOpen, setIsGstReportOpen] = useState(false);
  const [selectedReportMonth, setSelectedReportMonth] = useState(() => new Date().getMonth() + 1);
  const [selectedReportYear, setSelectedReportYear] = useState(() => new Date().getFullYear());
  const [isGeneratingGstReport, setIsGeneratingGstReport] = useState(false);

  // Voice Invoice configuration
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');

  // Invoices list state
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);

  // Filter and search state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Paid' | 'Pending'>('All');
  const [datePeriod, setDatePeriod] = useState<'All' | 'Today' | 'Yesterday' | 'Last7Days' | 'ThisMonth' | 'Custom'>('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Customer Screen State
  const [activeView, setActiveView] = useState<'dashboard' | 'customers' | 'udhaar'>('dashboard');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerFilter, setCustomerFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState<{
    name: string;
    phone: string;
    pendingAmount: number;
    paidAmount: number;
    invoices: Invoice[];
  } | null>(null);

  // Derived unique customers list
  const customers = useMemo(() => {
    const list: Array<{
      name: string;
      phone: string;
      pendingAmount: number;
      paidAmount: number;
      invoices: Invoice[];
    }> = [];

    invoices.forEach(inv => {
      let curr = list.find(c => c.name.toLowerCase().trim() === inv.customerName.toLowerCase().trim());
      if (!curr) {
        curr = {
          name: inv.customerName.trim(),
          phone: inv.customerPhone,
          pendingAmount: 0,
          paidAmount: 0,
          invoices: []
        };
        list.push(curr);
      }
      
      // Update phone if it was No Mobile
      if ((curr.phone === 'No Mobile' || !curr.phone) && inv.customerPhone && inv.customerPhone !== 'No Mobile') {
        curr.phone = inv.customerPhone;
      }
      
      if (inv.status === 'Pending') {
        curr.pendingAmount += inv.totalAmount;
      } else {
        curr.paidAmount += inv.totalAmount;
      }
      
      curr.invoices.push(inv);
    });

    return list;
  }, [invoices]);

  // Filtered customers list
  const filteredCustomers = useMemo(() => {
    return customers.filter(cust => {
      const matchesSearch = cust.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                            cust.phone.includes(customerSearchQuery);
      
      if (customerFilter === 'pending') {
        return matchesSearch && cust.pendingAmount > 0;
      }
      if (customerFilter === 'paid') {
        return matchesSearch && cust.pendingAmount === 0;
      }
      return matchesSearch;
    });
  }, [customers, customerSearchQuery, customerFilter]);

  // New Invoice Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showVoiceHelp, setShowVoiceHelp] = useState(false);
  const [showLimitPopup, setShowLimitPopup] = useState(false);
  const [upgradeReferralCode, setUpgradeReferralCode] = useState('');
  const [appliedReferral, setAppliedReferral] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [formItems, setFormItems] = useState<InvoiceItem[]>([
    { id: '1', name: '', quantity: 1, price: 0 }
  ]);
  const [formGstRate, setFormGstRate] = useState<number>(18);
  const [formGstType, setFormGstType] = useState<'inclusive' | 'exclusive'>('exclusive');
  const [formStatus, setFormStatus] = useState<'Paid' | 'Pending'>('Paid');

  // Notification state
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // Quick Receipt preview state
  const [selectedReceipt, setSelectedReceipt] = useState<Invoice | null>(null);

  // Routing and Admin Panel States
  const [currentPath, setCurrentPath] = useState(() => {
    if (window.location.hash.startsWith('#/')) {
      return window.location.hash.substring(1);
    }
    if (window.location.hash.startsWith('#')) {
      const hashVal = window.location.hash.substring(1);
      if (hashVal.startsWith('/') || hashVal.includes('-secret')) {
        return hashVal.startsWith('/') ? hashVal : '/' + hashVal;
      }
    }
    return window.location.pathname;
  });

  // Password Reset / Recovery States
  const [resetEmail, setResetEmail] = useState('chanchaltailor404@gmail.com');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetMessage, setResetMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [pastedResetUrl, setPastedResetUrl] = useState('');
  const [pastedResetError, setPastedResetError] = useState<string | null>(null);

  // Active Settings Password Change States
  const [settingsNewPassword, setSettingsNewPassword] = useState('');
  const [settingsConfirmPassword, setSettingsConfirmPassword] = useState('');
  const [settingsPassSubmitting, setSettingsPassSubmitting] = useState(false);
  const [settingsPassError, setSettingsPassError] = useState<string | null>(null);
  const [settingsPassSuccess, setSettingsPassSuccess] = useState<string | null>(null);
  const [adminProfiles, setAdminProfiles] = useState<any[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminSearch, setAdminSearch] = useState('');
  const [adminMutatingId, setAdminMutatingId] = useState<string | null>(null);
  const [adminRpcError, setAdminRpcError] = useState<string | null>(null);

  // Fetch All Profiles for Master Admin Dashboard
  const fetchAllAdminProfiles = async () => {
    if (!user || user.email !== 'chanchaltailor404@gmail.com') return;
    setAdminLoading(true);
    setAdminRpcError(null);
    try {
      console.log('Admin loading all registered users directly from shop_profiles...');
      const { data, error } = await supabase
        .from('shop_profiles')
        .select('*');

      if (error) {
        console.error('Error loading admin profiles:', error);
        setAdminRpcError(error.message);
        showToast('E-Ledger sync error inside admin panel', 'info');
      } else if (data) {
        console.log('Direct fetch from shop_profiles succeeded with', data.length, 'records');
        setAdminProfiles(data);
      }
    } catch (err: any) {
      console.error('Exception loading admin profiles:', err);
      setAdminRpcError(err?.message || String(err));
      showToast('Exception loading admin profiles', 'info');
    } finally {
      setAdminLoading(false);
    }
  };

  useEffect(() => {
    const isAdmin = user?.email === 'chanchaltailor404@gmail.com';
    const isAdminRoute = currentPath === '/admin-invoicepe-secret';
    if (isAdmin && isAdminRoute) {
      fetchAllAdminProfiles();
    }
  }, [user, currentPath]);

  useEffect(() => {
    const checkHashForRecovery = () => {
      const hash = window.location.hash;
      if (hash && (hash.includes('type=recovery') || hash.includes('access_token=') || hash.includes('error_description='))) {
        setIsResettingPassword(true);
        setCurrentPath('/forgot-password-secret');
        // Clear settings window if visible
        try {
          setIsSettingsOpen(false);
        } catch (_) {}
      }
    };
    checkHashForRecovery();
    window.addEventListener('hashchange', checkHashForRecovery);
    return () => window.removeEventListener('hashchange', checkHashForRecovery);
  }, []);

  useEffect(() => {
    const handleLocationChange = () => {
      if (window.location.hash.startsWith('#/')) {
        setCurrentPath(window.location.hash.substring(1));
      } else if (window.location.hash.startsWith('#')) {
        const hashVal = window.location.hash.substring(1);
        if (hashVal.startsWith('/') || hashVal.includes('-secret')) {
          setCurrentPath(hashVal.startsWith('/') ? hashVal : '/' + hashVal);
        }
      } else {
        setCurrentPath(window.location.pathname);
      }
    };
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    
    // Fallback sync
    const timer = setInterval(handleLocationChange, 1050);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
      clearInterval(timer);
    };
  }, []);

  const handleUpgradeToPro = async (profile: any) => {
    setAdminMutatingId(profile.user_id + '-pro');
    try {
      const today = new Date();
      const expiry = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      const payload = filterShopProfilePayload({ 
        pro_until: expiry.toISOString(),
        pro_expires_at: expiry.toISOString(),
        plan: 'pro'
      });

      if (Object.keys(payload).length === 0) {
        showToast('DB update skipped: No plan-related columns exist in the database table', 'info');
        return;
      }

      const { error } = await supabase
        .from('shop_profiles')
        .update(payload)
        .eq('user_id', profile.user_id);

      if (error) {
        console.error('Pro upgrade error:', error);
        showToast('DB upgrade failed: ' + error.message, 'info');
      } else {
        showToast(`User successfully upgraded to PRO!`, 'success');
        setAdminProfiles(prev => 
          prev.map(p => p.user_id === profile.user_id ? { ...p, pro_until: expiry.toISOString(), pro_expires_at: expiry.toISOString(), plan: 'pro' } : p)
        );
      }
    } catch (err) {
      console.error(err);
      showToast('Error during upgrade processing', 'info');
    } finally {
      setAdminMutatingId(null);
    }
  };

  const handleUpgradeToBusiness = async (profile: any) => {
    setAdminMutatingId(profile.user_id + '-business');
    try {
      const today = new Date();
      const expiry = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      const payload = filterShopProfilePayload({ 
        pro_until: expiry.toISOString(),
        pro_expires_at: expiry.toISOString(),
        plan: 'business'
      });

      if (Object.keys(payload).length === 0) {
        showToast('DB update skipped: No plan-related columns exist in the database table', 'info');
        return;
      }

      const { error } = await supabase
        .from('shop_profiles')
        .update(payload)
        .eq('user_id', profile.user_id);

      if (error) {
        console.error('Business upgrade error:', error);
        showToast('DB upgrade failed: ' + error.message, 'info');
      } else {
        showToast(`User successfully upgraded to BUSINESS!`, 'success');
        setAdminProfiles(prev => 
          prev.map(p => p.user_id === profile.user_id ? { ...p, pro_until: expiry.toISOString(), pro_expires_at: expiry.toISOString(), plan: 'business' } : p)
        );
      }
    } catch (err) {
      console.error(err);
      showToast('Error during upgrade processing', 'info');
    } finally {
      setAdminMutatingId(null);
    }
  };

  const adminStats = useMemo(() => {
    let total = adminProfiles.length;
    let pro = 0;
    let business = 0;
    
    adminProfiles.forEach(p => {
      if (p.pro_until) {
        const isNotExpired = new Date(p.pro_until) > new Date();
        if (isNotExpired) {
          if (p.plan === 'business') {
            business++;
          } else {
            pro++;
          }
        }
      }
    });

    return { total, pro, business };
  }, [adminProfiles]);

  const filteredAdminProfiles = useMemo(() => {
    if (!adminSearch.trim()) return adminProfiles;
    const query = adminSearch.toLowerCase().trim();
    return adminProfiles.filter(p => {
      const emailMatch = p.email && p.email.toLowerCase().includes(query);
      return !!emailMatch;
    });
  }, [adminProfiles, adminSearch]);

  // Check if user is currently Pro (either through active paid subscription or non-expired referral reward)
  const isPro = useMemo(() => {
    if (!user) {
      return false; // Absolutely no Pro features if not logged in
    }
    
    const planNormalized = (userPlan || '').toLowerCase().trim();
    const isPaidPlan = planNormalized === 'pro' || planNormalized === 'business';

    // Must have a future expiry date in proUntil to count as Pro/Business features active
    let isExpired = true;
    if (proUntil) {
      const expiryDate = new Date(proUntil);
      const today = new Date();
      if (expiryDate > today) {
        isExpired = false;
      }
    }

    const resolvedPro = isPaidPlan && !isExpired;
    console.log('DEBUG [isPro evaluation]: plan =', userPlan, 'proUntil =', proUntil, 'isExpired =', isExpired, 'Resolved Pro =', resolvedPro);
    return resolvedPro;
  }, [user, proUntil, userPlan]);

  // Calculated metrics
  const metrics = useMemo(() => {
    let sales = 0;
    let pending = 0;
    invoices.forEach(inv => {
      sales += inv.totalAmount;
      if (inv.status === 'Pending') {
        pending += inv.totalAmount;
      }
    });

    return {
      totalSales: sales,
      pendingPayments: pending,
      totalInvoicesCount: invoices.length,
      paidCount: invoices.filter(i => i.status === 'Paid').length,
      pendingCount: invoices.filter(i => i.status === 'Pending').length,
    };
  }, [invoices]);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    const getLocalYMD = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const todayStr = getLocalYMD(new Date());

    return invoices.filter(inv => {
      const matchesSearch = inv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            inv.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            inv.customerPhone.includes(searchQuery);
      
      const matchesStatus = statusFilter === 'All' || inv.status === statusFilter;
      
      let matchesDate = true;
      if (datePeriod !== 'All') {
        const invDate = inv.date; // e.g. "2026-06-03"
        if (datePeriod === 'Today') {
          matchesDate = invDate === todayStr;
        } else if (datePeriod === 'Yesterday') {
          const d = new Date();
          d.setDate(d.getDate() - 1);
          matchesDate = invDate === getLocalYMD(d);
        } else if (datePeriod === 'Last7Days') {
          const d = new Date();
          d.setDate(d.getDate() - 6);
          const limitStr = getLocalYMD(d);
          matchesDate = invDate >= limitStr && invDate <= todayStr;
        } else if (datePeriod === 'ThisMonth') {
          const d = new Date();
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const limitStr = `${year}-${month}-01`;
          matchesDate = invDate >= limitStr && invDate <= todayStr;
        } else if (datePeriod === 'Custom') {
          if (startDate && endDate) {
            matchesDate = invDate >= startDate && invDate <= endDate;
          } else if (startDate) {
            matchesDate = invDate >= startDate;
          } else if (endDate) {
            matchesDate = invDate <= endDate;
          }
        }
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [invoices, searchQuery, statusFilter, datePeriod, startDate, endDate]);

  // Custom toast notification trigger
  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Udhaar Book States
  const [udhaars, setUdhaars] = useState<UdhaarEntry[]>([]);
  const [udhaarLoading, setUdhaarLoading] = useState(false);
  const [udhaarError, setUdhaarError] = useState<string | null>(null);
  const [isUdhaarFormOpen, setIsUdhaarFormOpen] = useState(false);
  const [udhaarCustomerName, setUdhaarCustomerName] = useState('');
  const [udhaarPhone, setUdhaarPhone] = useState('');
  const [udhaarAmount, setUdhaarAmount] = useState<number | ''>('');
  const [udhaarDesc, setUdhaarDesc] = useState('');
  const [udhaarDate, setUdhaarDate] = useState(new Date().toISOString().split('T')[0]);

  // Load Shop Profile from Supabase with LocalStorage cache
  const fetchShopProfileFromSupabase = async (currentUser = user) => {
    if (!currentUser) return;
    try {
      console.log('Fetching shop profile for user_id:', currentUser.id);
      let { data, error } = await supabase
        .from('shop_profiles')
        .select('*')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (error) {
        console.warn('Error fetching shop profile, resetting plan to free:', error);
        setUserPlan('free');
        setProUntil(null);
        localStorage.setItem('invoicepe_plan', 'free');
        localStorage.removeItem('invoicepe_pro_until');
        return;
      }

      // If no profile exists, create a default unique one!
      if (!data) {
        console.log('No shop profile entry found on startup. Automatically upserting default empty shop profile row for user...');
        
        const baseProfile = {
          user_id: currentUser.id,
          shop_name: currentUser.user_metadata?.shop_name || 'Verma General Store',
          upi_id: currentUser.user_metadata?.upi_id || ''
        };

        const { data: upsertedData, error: upsertError } = await supabase
          .from('shop_profiles')
          .upsert(baseProfile, { onConflict: 'user_id', ignoreDuplicates: true })
          .select()
          .maybeSingle();

        if (upsertError) {
          console.error('❌ Error upserting base shop_profile on startup:', upsertError);
        } else {
          if (upsertedData) {
            console.log('✅ Base shop_profile row upserted on startup successfully:', upsertedData);
            data = upsertedData;
          } else {
            const { data: refetched } = await supabase
              .from('shop_profiles')
              .select('*')
              .eq('user_id', currentUser.id)
              .maybeSingle();
            data = refetched;
          }
        }
      }

      if (data) {
        console.log('Using shop profile data:', data);

        const cols = Object.keys(data);
        setDiscoveredShopProfileFields(cols);
        console.log('DEBUG [Columns Discovered] shop_profiles actual available keys in DB:', cols);

        const nameForCode = currentUser.user_metadata?.owner_name || currentUser.user_metadata?.shop_name || currentUser.email?.split('@')[0] || 'MERCHANT';

        // Fill other initial fields dynamically if they exist & are empty
        const updatePayload: Record<string, any> = {};
        
        if (cols.includes('owner_name') && !data.owner_name) {
          updatePayload.owner_name = currentUser.user_metadata?.owner_name || nameForCode;
        }
        if (cols.includes('phone') && !data.phone) {
          updatePayload.phone = currentUser.user_metadata?.phone || '';
        }
        if (cols.includes('address') && !data.address) {
          updatePayload.address = currentUser.user_metadata?.address || '';
        }
        if (cols.includes('gstin') && !data.gstin) {
          updatePayload.gstin = currentUser.user_metadata?.gstin || '';
        }
        if (cols.includes('email') && !data.email && currentUser.email) {
          updatePayload.email = currentUser.email;
        }
        
        // Handle referral code initialization
        let loadedReferralCode = data.referral_code;
        if (cols.includes('referral_code')) {
          if (!loadedReferralCode || loadedReferralCode === 'RAMESH20' || loadedReferralCode.trim() === '') {
            const generatedCode = generateReferralCode(currentUser);
            updatePayload.referral_code = generatedCode;
            loadedReferralCode = generatedCode;
          }
        }

        if (Object.keys(updatePayload).length > 0) {
          console.log('Syncing initial dynamic shop profile payload:', updatePayload);
          const { data: updatedData } = await supabase
            .from('shop_profiles')
            .update(updatePayload)
            .eq('user_id', currentUser.id)
            .select()
            .maybeSingle();
            
          if (updatedData) {
            data = { ...data, ...updatedData };
          }
        }

        setShopName(data.shop_name);
        setCustomShopInput(data.shop_name);

        const loadedUpi = data.upi_id === 'shopname@upi' ? '' : (data.upi_id || '');
        setUpiId(loadedUpi);
        setCustomUpiInput(loadedUpi);

        setGstin(data.gstin || '');
        setCustomGstinInput(data.gstin || '');

        setOwnerName(data.owner_name || '');
        setCustomOwnerInput(data.owner_name || '');

        setShopPhone(data.phone || '');
        setCustomShopPhoneInput(data.phone || '');

        setShopAddress(data.address || '');
        setCustomShopAddressInput(data.address || '');

        setReferralCode(loadedReferralCode || '');

        // Resolve expiration and plan strictly as a reader to prevent database overwrites
        const finalProUntil = data.pro_until || null;
        let finalPlan = 'free';

        const rawPlan = data.plan || 'free';
        const planNormalized = typeof rawPlan === 'string' ? rawPlan.toLowerCase().trim() : 'free';

        if (planNormalized === 'business') {
          finalPlan = 'business';
        } else if (planNormalized === 'pro') {
          finalPlan = 'pro';
        }

        setUserPlan(finalPlan);
        setProUntil(finalProUntil);
        setProExpiresAt(data.pro_expires_at || finalProUntil);

        console.log('DEBUG [fetchShopProfileFromSupabase] Loaded from Supabase - pro_until:', finalProUntil, 'Resolved finalPlan:', finalPlan);

        // Cache locally
        localStorage.setItem('invoicepe_shop_name', data.shop_name);
        localStorage.setItem('invoicepe_upi_id', loadedUpi);
        localStorage.setItem('invoicepe_gstin', data.gstin || '');
        localStorage.setItem('invoicepe_owner_name', data.owner_name || '');
        localStorage.setItem('invoicepe_shop_phone', data.phone || '');
        localStorage.setItem('invoicepe_shop_address', data.address || '');
        localStorage.setItem('invoicepe_plan', finalPlan);
        if (data.referral_code) {
          localStorage.setItem('invoicepe_referral_code', data.referral_code);
        }
        if (finalProUntil) {
          localStorage.setItem('invoicepe_pro_until', finalProUntil);
        } else {
          localStorage.removeItem('invoicepe_pro_until');
        }
      } else {
        // Fallback if data from DB is completely null or missing
        setUserPlan('free');
        setProUntil(null);
        localStorage.setItem('invoicepe_plan', 'free');
        localStorage.removeItem('invoicepe_pro_until');
      }

      // Fetch referrals where current user is the referrer
      const { data: refsData, error: refsErr } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_user_id', currentUser.id);

      if (!refsErr && refsData && Array.isArray(refsData)) {
        setTotalReferrals(refsData.length);
        setFreeMonths(refsData.length);
      } else if (refsData) {
        console.warn('Supabase select referrals returned non-array:', refsData);
      }

    } catch (err) {
      console.error('Exception fetching shop profile:', err);
    }
  };

  // Load Udhaar from Supabase
  const fetchUdhaar = async (showLoading = false, currentUser = user) => {
    if (!currentUser) return;
    setUdhaarLoading(showLoading);
    setUdhaarError(null);
    try {
      const { data, error } = await supabase
        .from('udhaar')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      if (data && Array.isArray(data)) {
        setUdhaars(data.map((row: any) => ({
          id: row.id,
          user_id: row.user_id,
          customer_name: row.customer_name,
          phone: row.phone,
          amount: Number(row.amount),
          note: row.note || '',
          status: row.status as 'Paid' | 'Unpaid',
          created_at: row.created_at
        })));
      } else if (data) {
        console.warn('Supabase select udhaar query returned non-array data structure:', data);
        setUdhaars([]);
      }
    } catch (err: any) {
      console.error('Exception fetching udhaars:', err);
      setUdhaarError(err.message || 'उधार डेटा लोड करने में त्रुटि आई!');
    } finally {
      setUdhaarLoading(false);
    }
  };

  // Backwards compatible wrapper alias
  const fetchUdhaarsFromSupabase = async (showLoading = false, currentUser = user) => {
    return fetchUdhaar(showLoading, currentUser);
  };

  // Add Udhaar entry helper
  const handleAddUdhaar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast('Kripya Login karein!', 'info');
      return;
    }
    if (!udhaarCustomerName.trim() || !udhaarAmount || Number(udhaarAmount) <= 0) {
      showToast('Kripya Grahak ka Naam aur Sahi Rakam bharein!', 'info');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.from('udhaar').insert({
        user_id: user.id,
        customer_name: udhaarCustomerName.trim(),
        phone: udhaarPhone.trim() || 'No Mobile',
        amount: Number(udhaarAmount),
        note: udhaarDesc.trim(),
        status: 'Unpaid',
        created_at: new Date(udhaarDate).toISOString()
      });

      if (error) {
        throw error;
      }

      showToast('उधार बही एंट्री जोड़ी गई!', 'success');

      // Reset Form fields
      setUdhaarCustomerName('');
      setUdhaarPhone('');
      setUdhaarAmount('');
      setUdhaarDesc('');
      setUdhaarDate(new Date().toISOString().split('T')[0]);
      setIsUdhaarFormOpen(false);

      // Refresh data
      await fetchUdhaar(false, user);
    } catch (err: any) {
      console.error('Supabase exception inserting udhaar:', err);
      showToast('उधार जोड़ने में समस्या आई: ' + (err.message || ''), 'info');
    } finally {
      setIsLoading(false);
    }
  };

  // Settle / Mark Udhaar as Paid
  const handleMarkUdhaarAsPaid = async (id: string, customerName: string, amount: number) => {
    if (!user) {
      showToast('Kripya Login karein!', 'info');
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('udhaar')
        .update({ status: 'Paid' })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      showToast(`${customerName}ji ka ₹${amount} ka udhaar paid mark kiya gaya!`, 'success');
      await fetchUdhaar(false, user);
    } catch (err: any) {
      console.error('Supabase exception updating status:', err);
      showToast('उधार सेटल करने में त्रुटि आई: ' + (err.message || ''), 'info');
    } finally {
      setIsLoading(false);
    }
  };

  // Send WhatsApp reminder for Udhaar Entry
  const handleSendUdhaarReminder = (entry: UdhaarEntry) => {
    const text = `Namaste ${entry.customer_name}ji! Aapka ₹${entry.amount.toLocaleString('en-IN')} ka udhaar baaki hai. Kripya jaldi ada karein. 🙏 - InvoicePe`;
    const encoded = encodeURIComponent(text);
    const phoneSuffix = entry.phone && entry.phone !== 'No Mobile' ? entry.phone : '';
    const url = `https://api.whatsapp.com/send?phone=91${phoneSuffix}&text=${encoded}`;
    
    showToast(`Sending WhatsApp reminder to ${entry.customer_name}ji...`, 'success');
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Handle adding an item in the Create Form
  const handleAddFormItem = () => {
    setFormItems([
      ...formItems,
      { id: Date.now().toString(), name: '', quantity: 1, price: 0 }
    ]);
  };

  // Handle removing an item from the Create Form
  const handleRemoveFormItem = (id: string) => {
    if (formItems.length > 1) {
      setFormItems(formItems.filter(item => item.id !== id));
    } else {
      showToast('At least one item is required in the invoice', 'info');
    }
  };

  // Handle updating form items
  const handleUpdateFormItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setFormItems(
      formItems.map(item => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          // Keep quantity flexible during input, we validate >= 1 on final action/submit
          if (field === 'quantity') {
            if (value === '' || value === null) {
              updated.quantity = '' as any;
            } else {
              const numVal = Number(value);
              if (numVal < 0) {
                updated.quantity = 0;
              } else {
                updated.quantity = numVal;
              }
            }
          }
          return updated;
        }
        return item;
      })
    );
  };

  // Quick Preset Autocomplete
  const applyPresetItem = (index: number, name: string, price: number) => {
    const updated = [...formItems];
    if (updated[index]) {
      updated[index].name = name;
      updated[index].price = price;
      setFormItems(updated);
    }
  };

  // Custom Inventory Presets for shop owners
  const [customPresets, setCustomPresets] = useState<{ name: string; price: number }[]>(() => {
    try {
      const saved = localStorage.getItem('invoicepe_custom_presets');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const saveToCustomPresets = (name: string, price: number) => {
    const cleanName = name.trim();
    if (!cleanName) {
      showToast('Please enter an item name first!', 'info');
      return;
    }
    const alreadyExists = customPresets.some(
      p => p.name.toLowerCase() === cleanName.toLowerCase()
    );
    if (alreadyExists) {
      showToast(`"${cleanName}" is already saved in your inventory presets!`, 'info');
      return;
    }
    const updated = [...customPresets, { name: cleanName, price: Number(price) || 0 }];
    setCustomPresets(updated);
    localStorage.setItem('invoicepe_custom_presets', JSON.stringify(updated));
    showToast(`Saved "${cleanName}" to inventory presets! 📦`, 'success');
  };

  const deleteCustomPreset = (nameToDel: string) => {
    const updated = customPresets.filter(p => p.name.toLowerCase() !== nameToDel.toLowerCase());
    setCustomPresets(updated);
    localStorage.setItem('invoicepe_custom_presets', JSON.stringify(updated));
    showToast('Removed preset from inventory', 'info');
  };

  const handleRegisterReferralAndProfile = async (newUser: any, enteredCode: string) => {
    if (!newUser) return;
    try {
      let referrerUserId = null;
      const cleanCode = enteredCode.trim().toUpperCase();
      if (cleanCode) {
        const { data: profileWithCode, error: lookupErr } = await supabase
          .from('shop_profiles')
          .select('user_id')
          .eq('referral_code', cleanCode)
          .maybeSingle();

        if (!lookupErr && profileWithCode) {
          referrerUserId = profileWithCode.user_id;
          console.log('Valid referral code found for user_id:', referrerUserId);
        } else {
          console.warn('No user found matching referral code:', cleanCode);
        }
      }

      const generatedCode = generateReferralCode(newUser);
      // New user gets 1 month free Pro if referred
      const proExpiry = referrerUserId 
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() 
        : null;

      const defaultProfile = {
        user_id: newUser.id,
        shop_name: shopName.trim() || 'Verma General Store',
        owner_name: shopName.trim().split(' ')[0] || 'Merchant',
        phone: '',
        address: '',
        upi_id: '',
        gstin: '',
        referral_code: generatedCode,
        pro_expires_at: proExpiry,
        pro_until: proExpiry,
        email: newUser.email,
        plan: referrerUserId ? 'pro' : 'free'
      };

      let signupProfilePayload = { ...defaultProfile };
      let createdProfile = null;
      let profileErr = null;

      while (true) {
        const processedPayload = filterShopProfilePayload(signupProfilePayload);
        const { data, error } = await supabase
          .from('shop_profiles')
          .upsert(processedPayload, { onConflict: 'user_id' })
          .select()
          .maybeSingle();

        if (error) {
          if (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist')) {
            const match = error.message.match(/column "([^"]+)"/) || error.message.match(/column ([a-zA-Z0-9_]+) does not exist/);
            if (match && match[1]) {
              const brokenCol = match[1];
              console.warn(`[Signup DB Self Healing] Column "${brokenCol}" does not exist in shop_profiles. Stripping and retrying...`);
              if (brokenCol in signupProfilePayload) {
                delete signupProfilePayload[brokenCol as keyof typeof signupProfilePayload];
                continue;
              }
            }
            // Generic word check fallback
            let removed = false;
            for (const key of Object.keys(signupProfilePayload)) {
              if (error.message.includes(key)) {
                console.warn(`[Signup DB Self Healing] Found key "${key}" in error message. Stripping...`);
                delete signupProfilePayload[key as keyof typeof signupProfilePayload];
                removed = true;
              }
            }
            if (removed) continue;
          }
          profileErr = error;
          break;
        }
        createdProfile = data;
        break;
      }

      if (profileErr) {
        console.error('Error upserting shop profile on signup:', profileErr);
      } else {
        console.log('Successfully upserted profile for new user, setting referralCode state to:', generatedCode);
        setReferralCode(generatedCode);
        localStorage.setItem('invoicepe_referral_code', generatedCode);
      }

      if (referrerUserId) {
        const referralRecord = {
          referrer_user_id: referrerUserId,
          referred_user_id: newUser.id,
          referral_code: cleanCode
        };

        const { error: refError } = await supabase
          .from('referrals')
          .insert(referralRecord);

        if (refError) {
          console.error('Error logging referral record:', refError);
        } else {
          console.log('Referral model logged!');
          // Add 30 days to referrer's pro_until & pro_expires_at
          const { data: referrerProfile } = await supabase
            .from('shop_profiles')
            .select('pro_until, pro_expires_at')
            .eq('user_id', referrerUserId)
            .maybeSingle();

          let targetExpiry = new Date();
          const currentExpiryStr = referrerProfile?.pro_until || referrerProfile?.pro_expires_at;
          if (currentExpiryStr) {
            const currentExpiry = new Date(currentExpiryStr);
            if (currentExpiry > targetExpiry) {
              targetExpiry = currentExpiry;
            }
          }
          targetExpiry.setDate(targetExpiry.getDate() + 30);

          const updateReferrerPayload = filterShopProfilePayload({ 
            pro_until: targetExpiry.toISOString(),
            pro_expires_at: targetExpiry.toISOString() 
          });

          if (Object.keys(updateReferrerPayload).length > 0) {
            await supabase
              .from('shop_profiles')
              .update(updateReferrerPayload)
              .eq('user_id', referrerUserId);
          }
        }
      }
    } catch (err) {
      console.error('Error handling post-signup logic:', err);
    }
  };

  const handleApplyUpgradeReferral = async () => {
    const cleanCode = upgradeReferralCode.trim().toUpperCase();
    if (!cleanCode) {
      showToast('Please enter a referral code first!', 'info');
      return;
    }
    if (!user) {
      showToast('Please login first to apply a referral code!', 'info');
      return;
    }
    const ownCode = (referralCode || '').trim().toUpperCase();
    if (ownCode && cleanCode === ownCode) {
      showToast('You cannot use your own referral code!', 'info');
      return;
    }

    try {
      const enteredCode = upgradeReferralCode;
      console.log('DEBUG [Referral Verification] User entered:', enteredCode);

      // Fetch what codes exist in shop_profiles
      const { data: allProfiles, error: allProfilesErr } = await supabase
        .from('shop_profiles')
        .select('referral_code, shop_name, user_id');
      
      if (allProfiles) {
        const availableCodes = allProfiles
          .map(p => p.referral_code)
          .filter(code => code !== null && code !== undefined && code !== '');
        console.log('DEBUG [Referral Verification] Codes existing in shop_profiles:', availableCodes);
        console.log('DEBUG [Referral Verification] Full existing profiles:', allProfiles);
      } else {
        console.log('DEBUG [Referral Verification] Failed to query existing profiles or none found:', allProfilesErr);
      }

      // Exact search query requested
      const { data: matchingProfiles, error: lookupErr } = await supabase
        .from('shop_profiles')
        .select()
        .eq('referral_code', enteredCode.toUpperCase().trim());

      console.log('DEBUG [Referral Verification] Match search query result:', matchingProfiles, 'error:', lookupErr);

      const profileWithCode = matchingProfiles && matchingProfiles.length > 0 ? matchingProfiles[0] : null;

      if (lookupErr || !profileWithCode) {
        showToast('Invalid referral code! Verification failed.', 'info');
        return;
      }

      setAppliedReferral(cleanCode);
      
      const claimExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const claimExpiryStr = claimExpiry.toISOString();
      
      // Update local state immediately
      setUserPlan('pro');
      setProUntil(claimExpiryStr);
      localStorage.setItem('invoicepe_plan', 'pro');
      localStorage.setItem('invoicepe_pro_until', claimExpiryStr);

      showToast(`Referral code "${cleanCode}" applied! 1 Month of Pro Plan activated for FREE. 🎉`, 'success');

      // Update current user profile on DB to Pro with expiry if plan-related columns exist
      const userPayload = filterShopProfilePayload({
        plan: 'pro',
        pro_until: claimExpiryStr,
        pro_expires_at: claimExpiryStr
      });
      if (Object.keys(userPayload).length > 0) {
        await supabase
          .from('shop_profiles')
          .update(userPayload)
          .eq('user_id', user.id);
      }

      // Sync backend: Log referral record if not already exists
      const { data: existingRef } = await supabase
        .from('referrals')
        .select('id')
        .eq('referred_user_id', user.id)
        .maybeSingle();

      if (!existingRef) {
        // Insert referral log connection
        await supabase
          .from('referrals')
          .insert({
            referrer_user_id: profileWithCode.user_id,
            referred_user_id: user.id,
            referral_code: cleanCode
          });

        // Extend referrer's pro status by 30 days as reward
        const { data: referrerProfile } = await supabase
          .from('shop_profiles')
          .select('pro_until, pro_expires_at')
          .eq('user_id', profileWithCode.user_id)
          .maybeSingle();

        let targetExpiry = new Date();
        const currentExpiryStr = referrerProfile?.pro_until || referrerProfile?.pro_expires_at;
        if (currentExpiryStr) {
          const currentExpiry = new Date(currentExpiryStr);
          if (currentExpiry > targetExpiry) {
            targetExpiry = currentExpiry;
          }
        }
        targetExpiry.setDate(targetExpiry.getDate() + 30);

        const referrerPayload = filterShopProfilePayload({
          pro_until: targetExpiry.toISOString(),
          pro_expires_at: targetExpiry.toISOString()
        });

        if (Object.keys(referrerPayload).length > 0) {
          await supabase
            .from('shop_profiles')
            .update(referrerPayload)
            .eq('user_id', profileWithCode.user_id);
        }
      }
    } catch (err) {
      console.error('Error applying upgrade referral:', err);
      showToast('Error validating referral code. Please try again.', 'info');
    }
  };

  // Handle Authentication submit (Login / SignUp)
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthSubmitting(true);
    setAuthError(null);

    const email = authEmail.trim();
    const password = authPassword;

    try {
      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              shop_name: shopName.trim() || 'My General Store'
            }
          }
        });

        if (error) throw error;
        
        if (data.session) {
          await handleRegisterReferralAndProfile(data.session.user, enteredReferralCode);
          setEnteredReferralCode('');
          setUser(data.session.user);
          showToast('Welcome to InvoicePe! Your shop is created.', 'success');
        } else if (data.user) {
          await handleRegisterReferralAndProfile(data.user, enteredReferralCode);
          setEnteredReferralCode('');
          showToast('Signup successful!', 'success');
          // Email confirmation is enabled on their project
          setAuthError(
            "Account registered! Log in now. IMPORTANT: If you see 'Email not confirmed' on login, please confirm your email OR go to Supabase Dashboard -> Authentication -> Providers -> Email and turn OFF 'Confirm email' for instant login."
          );
          setAuthMode('login');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;

        if (data.user) {
          setUser(data.user);
          const metaShop = data.user.user_metadata?.shop_name;
          if (metaShop) {
            setShopName(metaShop);
            setCustomShopInput(metaShop);
          }
          showToast('Merchant session successfully verified!', 'success');
        }
      }
    } catch (err: any) {
      console.error('❌ Auth error:', err);
      let friendlyError = err.message || 'Authentication failed. Please verify credentials.';
      const errMsg = friendlyError.toLowerCase();
      
      if (errMsg.includes('email not confirmed')) {
        friendlyError = "Email not confirmed! Please verify your email inbox. 💡 TIP: You can disable this restriction by opening your Supabase Dashboard -> Authentication -> Providers -> Email and untoggling 'Confirm email'. This allows instant sign-up & log-in without email checks.";
      } else if (errMsg.includes('rate limit') || errMsg.includes('20 seconds') || errMsg.includes('too many requests')) {
        friendlyError = "Rate limit reached. Please wait a few seconds before trying again. 💡 TIP: Turn OFF 'Confirm email' in Supabase to log in instantly and avoid triggering verification limits.";
      }
      
      setAuthError(friendlyError);
    } finally {
      setAuthSubmitting(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      setInvoices([]);
      setUdhaars([]);
      setAuthEmail('');
      setAuthPassword('');

      // Clear cached and state-level shop configurations & subscription status
      setShopName('Verma General Store');
      setCustomShopInput('Verma General Store');
      setUpiId('');
      setCustomUpiInput('');
      setGstin('');
      setCustomGstinInput('');
      setOwnerName('');
      setCustomOwnerInput('');
      setShopPhone('');
      setCustomShopPhoneInput('');
      setShopAddress('');
      setCustomShopAddressInput('');
      setUserPlan('free');
      setProUntil(null);

      localStorage.removeItem('invoicepe_shop_name');
      localStorage.removeItem('invoicepe_upi_id');
      localStorage.removeItem('invoicepe_gstin');
      localStorage.removeItem('invoicepe_owner_name');
      localStorage.removeItem('invoicepe_shop_phone');
      localStorage.removeItem('invoicepe_shop_address');
      localStorage.removeItem('invoicepe_plan');
      localStorage.removeItem('invoicepe_pro_until');

      showToast('Logged out successfully from InvoicePe', 'info');
    } catch (err: any) {
      console.error('❌ Logout error:', err);
      showToast('Logout failed: ' + err.message, 'info');
    } finally {
      setIsLoading(false);
    }
  };

  // Save custom shop configuration and UPI details
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const newName = customShopInput.trim();
    const newUpi = customUpiInput.trim();
    const newGstin = customGstinInput.trim().toUpperCase();
    const newOwnerName = customOwnerInput.trim();
    const newPhone = customShopPhoneInput.trim();
    const newAddress = customShopAddressInput.trim();

    if (!newName) {
      showToast('Shop name updated nahi kiya ja sakta, kripya sahi naam bharein!', 'info');
      return;
    }

    setShopName(newName);
    setUpiId(newUpi);
    setGstin(newGstin);
    setOwnerName(newOwnerName);
    setShopPhone(newPhone);
    setShopAddress(newAddress);

    localStorage.setItem('invoicepe_shop_name', newName);
    localStorage.setItem('invoicepe_upi_id', newUpi);
    localStorage.setItem('invoicepe_gstin', newGstin);
    localStorage.setItem('invoicepe_owner_name', newOwnerName);
    localStorage.setItem('invoicepe_shop_phone', newPhone);
    localStorage.setItem('invoicepe_shop_address', newAddress);

    setIsSettingsOpen(false);

    if (user) {
      try {
        const payload = {
          user_id: user.id,
          shop_name: newName,
          owner_name: newOwnerName,
          phone: newPhone,
          address: newAddress,
          upi_id: newUpi,
          gstin: newGstin,
          referral_code: referralCode && referralCode.trim() !== '' ? referralCode : null,
          email: user.email
        };
        console.log('DEBUG [handleSaveSettings]: Saving shop profile payload:', payload);

        const filteredPayload = filterShopProfilePayload(payload);

        const { error: profileErr } = await supabase
          .from('shop_profiles')
          .upsert(filteredPayload, { onConflict: 'user_id' });

        if (profileErr) {
          console.error('❌ Error saving/upserting to shop_profiles table:', profileErr);
          showToast('Database sync failed, saved locally: ' + profileErr.message, 'info');
        } else {
          console.log('✅ Shop profile table upsert complete successfully!');
          showToast('Vyapaar settings saved and synced successfully!', 'success');
        }

        // Keep user metadata synced as fallback
        const { error: authErr } = await supabase.auth.updateUser({
          data: { 
            shop_name: newName,
            upi_id: newUpi,
            gstin: newGstin,
            owner_name: newOwnerName,
            phone: newPhone,
            address: newAddress
          }
        });
        if (authErr) {
          console.error('Error syncing settings to Supabase user metadata:', authErr);
        }
      } catch (err) {
        console.error('Error syncing settings:', err);
      }
    }
  };

  // Change Password directly from settings panel
  const handleChangePasswordInSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsPassError(null);
    setSettingsPassSuccess(null);

    if (settingsNewPassword !== settingsConfirmPassword) {
      setSettingsPassError('Security locks do not match.');
      return;
    }

    if (settingsNewPassword.length < 6) {
      setSettingsPassError('Password must code 6 digits or more.');
      return;
    }

    setSettingsPassSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: settingsNewPassword });
      if (error) {
        setSettingsPassError(error.message);
        showToast(error.message, 'info');
      } else {
        setSettingsPassSuccess('Password updated successfully in the Supabase Cloud!');
        setSettingsNewPassword('');
        setSettingsConfirmPassword('');
        showToast('Password changed successfully!', 'success');
      }
    } catch (err: any) {
      setSettingsPassError(err.message || 'Error occurred while updating password.');
    } finally {
      setSettingsPassSubmitting(false);
    }
  };

  // Load data from Supabase (filtered by user_id for isolation)
  const fetchInvoicesFromSupabase = async (showLoading = true, currentUser = user) => {
    if (!currentUser) {
      console.log('No logged-in user, skipping database fetch.');
      return;
    }
    if (showLoading) setIsLoading(true);
    setSupabaseError(null);
    try {
      console.log('fetching isolated ledger data from Supabase for user_id:', currentUser.id);
      
      const selectFields = `
        id,
        invoice_number,
        total_amount,
        gst_amount,
        status,
        created_at,
        customers (
          id,
          name,
          phone
        ),
        invoice_items (
          id,
          item_name,
          quantity,
          rate,
          amount
        )
      `;

      let queryResult = await supabase
        .from('invoices')
        .select(selectFields)
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (queryResult.error) {
        throw queryResult.error;
      }

      const data = queryResult.data;

      if (data && Array.isArray(data)) {
        console.log('Successfully fetched isolated rows from Supabase:', data.length);
        const mappedInvoices = data.map((inv: any) => {
          // Multi-layered defensive fallback scanning both root and nested/array relations
          const custInfo = Array.isArray(inv.customers) 
            ? inv.customers[0] 
            : (inv.customers || (Array.isArray(inv.customer) ? inv.customer[0] : inv.customer));
          
          const itemsRaw = Array.isArray(inv.invoice_items) 
            ? inv.invoice_items 
            : (inv.invoice_items ? [inv.invoice_items] : (Array.isArray(inv.items) ? inv.items : []));

          // Set safe default values as these columns don't exist in the remote table
          const parsedGstRate = 18;
          const parsedGstType = 'exclusive';
          const parsedGstAmount = Number(inv.gst_amount) || 0;

          return {
            id: inv.id,
            invoiceNo: inv.invoice_number,
            customerName: custInfo?.name || 'Unknown Grahak',
            customerPhone: custInfo?.phone || 'No Mobile',
            items: itemsRaw.map((item: any) => ({
              id: item.id,
              name: item.item_name || item.name || 'Goods',
              quantity: Number(item.quantity) || 1,
              price: Number(item.rate) || Number(item.price) || 0
            })),
            date: inv.created_at ? new Date(inv.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            status: (inv.status === 'Paid' || inv.status === 'paid' || inv.status === 'PAID') ? 'Paid' : 'Pending',
            totalAmount: Number(inv.total_amount) || 0,
            gstRate: parsedGstRate,
            gstAmount: parsedGstAmount,
            gstType: parsedGstType as 'inclusive' | 'exclusive'
          };
        });
        setInvoices(mappedInvoices);
      } else if (data) {
        console.warn('Supabase select invoices query returned non-array data structure:', data);
        setInvoices([]);
      }
    } catch (err: any) {
      console.error('❌ Error fetching from Supabase:', err);
      setSupabaseError(err.message || 'Could not connect to Supabase. Check schema config.');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  const startupDatabaseTest = async (currentUser: any) => {
    if (!currentUser) return;
    console.log('🚀 Supabase Startup Connection Test Initiated...');
    try {
      const testCustomerName = `Verification Grahak ${Math.floor(100 + Math.random() * 900)}`;
      const testPhone = '9876543210';
      
      console.log(`Writing verification row to 'customers'... name="${testCustomerName}"`);
      const { data: inserted, error: insertErr } = await supabase
        .from('customers')
        .insert({ name: testCustomerName, phone: testPhone, user_id: currentUser.id })
        .select('id, name, phone');

      if (insertErr) {
        console.error('❌ Supabase write verification failed:', insertErr);
      } else {
        console.log('✅ Supabase write verification successful!', inserted);
      }

      console.log('Reading ' + testCustomerName + ' back from customers table to verify list reads...');
      const { data: testFetch, error: fetchErr } = await supabase
        .from('customers')
        .select('id, name')
        .eq('user_id', currentUser.id)
        .limit(1);

      if (fetchErr) {
        console.error('❌ Supabase list read query failed:', fetchErr);
      } else {
        console.log('✅ Supabase read verification successful!', testFetch);
      }
    } catch (err: any) {
      console.error('❌ Exception thrown during startup connect verify:', err);
    }
  };

  // Auth flow and sessions loading effect
  useEffect(() => {
    // Automatically clear stale cached plan values on app startup to guarantee fresh validation
    localStorage.removeItem('invoicepe_plan');
    localStorage.removeItem('invoicepe_pro_until');
    setUserPlan('free');
    setProUntil(null);

    // 1. Initial Session Get
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.warn('Session retrieval validation error, clearing state:', error);
        // Clear corrupt state tokens from local storage
        Object.keys(localStorage).forEach(key => {
          if (key.includes('-auth-token')) {
            localStorage.removeItem(key);
          }
        });
        supabase.auth.signOut().catch(() => {});
        setAuthLoading(false);
        setIsLoading(false);
        return;
      }
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      if (sessionUser) {
        const localCode = localStorage.getItem('invoicepe_referral_code');
        if (!localCode || localCode === 'RAMESH20') {
          const fallbackCode = generateReferralCode(sessionUser);
          setReferralCode(fallbackCode);
          localStorage.setItem('invoicepe_referral_code', fallbackCode);
        } else {
          setReferralCode(localCode);
        }

        const metaShop = sessionUser.user_metadata?.shop_name;
        if (metaShop) {
          setShopName(metaShop);
          setCustomShopInput(metaShop);
        }
        const metaUpi = sessionUser.user_metadata?.upi_id;
        if (metaUpi) {
          setUpiId(metaUpi);
          setCustomUpiInput(metaUpi);
        }
        const metaGstin = sessionUser.user_metadata?.gstin;
        if (metaGstin) {
          setGstin(metaGstin);
          setCustomGstinInput(metaGstin);
        }
        startupDatabaseTest(sessionUser);
        fetchShopProfileFromSupabase(sessionUser);
        fetchInvoicesFromSupabase(true, sessionUser);
        fetchUdhaar(true, sessionUser);
      } else {
        setUserPlan('free');
        setProUntil(null);
        localStorage.removeItem('invoicepe_plan');
        localStorage.removeItem('invoicepe_pro_until');
        setAuthLoading(false);
        setIsLoading(false);
      }
    }).catch(async (err) => {
      console.error('Error fetching session, clearing auth cache:', err);
      Object.keys(localStorage).forEach(key => {
        if (key.includes('-auth-token')) {
          localStorage.removeItem(key);
        }
      });
      try {
        await supabase.auth.signOut();
      } catch (e) {}
      setAuthLoading(false);
      setIsLoading(false);
    });

    // 2. Auth State Change Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      if (sessionUser) {
        const localCode = localStorage.getItem('invoicepe_referral_code');
        if (!localCode || localCode === 'RAMESH20') {
          const fallbackCode = generateReferralCode(sessionUser);
          setReferralCode(fallbackCode);
          localStorage.setItem('invoicepe_referral_code', fallbackCode);
        } else {
          setReferralCode(localCode);
        }

        const metaShop = sessionUser.user_metadata?.shop_name;
        if (metaShop) {
          setShopName(metaShop);
          setCustomShopInput(metaShop);
        }
        const metaUpi = sessionUser.user_metadata?.upi_id;
        if (metaUpi) {
          setUpiId(metaUpi);
          setCustomUpiInput(metaUpi);
        }
        const metaGstin = sessionUser.user_metadata?.gstin;
        if (metaGstin) {
          setGstin(metaGstin);
          setCustomGstinInput(metaGstin);
        }
        fetchShopProfileFromSupabase(sessionUser);
        fetchInvoicesFromSupabase(true, sessionUser);
        fetchUdhaar(true, sessionUser);
      } else {
        setInvoices([]);
        setUdhaars([]);
        setUserPlan('free');
        setProUntil(null);
        localStorage.removeItem('invoicepe_plan');
        localStorage.removeItem('invoicepe_pro_until');
        setIsLoading(false);
      }
      setAuthLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Realtime subscription to keep local states synced whenever the database record updates in Supabase
  useEffect(() => {
    if (!user) return;

    console.log('Registering real-time subscription for shop_profiles: user_id =', user.id);
    const channel = supabase
      .channel(`realtime-profile-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shop_profiles',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Realtime update captured for shop_profiles:', payload);
          const updatedProfile = payload.new as any;
          if (updatedProfile) {
            if (updatedProfile.referral_code && updatedProfile.referral_code !== 'RAMESH20') {
              console.log('Realtime setting referralCode state to:', updatedProfile.referral_code);
              setReferralCode(updatedProfile.referral_code);
              localStorage.setItem('invoicepe_referral_code', updatedProfile.referral_code);
            }
            if (updatedProfile.shop_name) {
              setShopName(updatedProfile.shop_name);
              setCustomShopInput(updatedProfile.shop_name);
              localStorage.setItem('invoicepe_shop_name', updatedProfile.shop_name);
            }
            if (updatedProfile.upi_id) {
              const loadedUpi = updatedProfile.upi_id === 'shopname@upi' ? '' : updatedProfile.upi_id;
              setUpiId(loadedUpi);
              setCustomUpiInput(loadedUpi);
              localStorage.setItem('invoicepe_upi_id', loadedUpi);
            }
            if (updatedProfile.owner_name) {
              setOwnerName(updatedProfile.owner_name);
              setCustomOwnerInput(updatedProfile.owner_name);
              localStorage.setItem('invoicepe_owner_name', updatedProfile.owner_name);
            }
            if (updatedProfile.phone) {
              setShopPhone(updatedProfile.phone);
              setCustomShopPhoneInput(updatedProfile.phone);
              localStorage.setItem('invoicepe_shop_phone', updatedProfile.phone);
            }
            if (updatedProfile.address) {
              setShopAddress(updatedProfile.address);
              setCustomShopAddressInput(updatedProfile.address);
              localStorage.setItem('invoicepe_shop_address', updatedProfile.address);
            }
            if (updatedProfile.pro_until !== undefined || updatedProfile.plan !== undefined) {
              const currentProUntil = updatedProfile.pro_until !== undefined ? updatedProfile.pro_until : proUntil;
              const currentPlan = updatedProfile.plan !== undefined ? updatedProfile.plan : userPlan;

              let finalProUntil = currentProUntil || null;
              let finalPlan = 'free';

              const planNormalized = typeof currentPlan === 'string' ? currentPlan.toLowerCase().trim() : 'free';

              let isActive = false;
              if (finalProUntil) {
                const expiryDate = new Date(finalProUntil);
                const today = new Date();
                if (expiryDate > today) {
                  isActive = true;
                } else {
                  finalProUntil = null;
                }
              }

              if (isActive && finalProUntil) {
                if (planNormalized === 'business') {
                  finalPlan = 'business';
                } else {
                  finalPlan = 'pro';
                }
              } else {
                finalPlan = 'free';
              }

              console.log('DEBUG [realtime sync resolved]: finalPlan =', finalPlan, 'finalProUntil =', finalProUntil);
              
              setProUntil(finalProUntil);
              setProExpiresAt(finalProUntil);
              setUserPlan(finalPlan);

              if (finalProUntil) {
                localStorage.setItem('invoicepe_pro_until', finalProUntil);
              } else {
                localStorage.removeItem('invoicepe_pro_until');
              }
              localStorage.setItem('invoicepe_plan', finalPlan);
            }
            if (updatedProfile.gstin) {
              setGstin(updatedProfile.gstin);
              setCustomGstinInput(updatedProfile.gstin);
              localStorage.setItem('invoicepe_gstin', updatedProfile.gstin);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log(`Realtime channel status: ${status}`);
      });

    return () => {
      console.log('Cleaning up real-time stream for shop_profiles for user_id:', user.id);
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Seed standard dummy customers/invoices into Supabase (user isolated)
  const handleSeedDatabase = async () => {
    if (!user) {
      showToast('Please log in first to seed your ledger.', 'info');
      return;
    }
    setIsLoading(true);
    try {
      showToast('Seeding dummy data to Supabase...', 'info');
      
      for (const inv of INITIAL_INVOICES) {
        // Insert customer
        let customerId;
        const { data: customerData, error: custErr } = await supabase
          .from('customers')
          .insert({ name: inv.customerName, phone: inv.customerPhone, user_id: user.id })
          .select('id');
        
        if (custErr || !customerData || customerData.length === 0) {
          // fetch existing
          const { data: existingCust } = await supabase
            .from('customers')
            .select('id')
            .eq('user_id', user.id)
            .ilike('name', inv.customerName.trim());
          if (existingCust && existingCust.length > 0) {
            customerId = existingCust[0].id;
          } else {
            continue;
          }
        } else {
          customerId = customerData[0].id;
        }

        // Insert invoice
        const { data: invoiceData, error: invErr } = await supabase
          .from('invoices')
          .insert({
            customer_id: customerId,
            invoice_number: inv.invoiceNo,
            total_amount: inv.totalAmount,
            gst_amount: 0,
            status: inv.status,
            user_id: user.id
          })
          .select('id');

        if (invErr || !invoiceData || invoiceData.length === 0) {
          continue;
        }
        
        const invoiceId = invoiceData[0].id;

        // Insert items
        const itemRows = inv.items.map(item => ({
          invoice_id: invoiceId,
          item_name: item.name,
          quantity: item.quantity,
          rate: item.price,
          amount: item.quantity * item.price
        }));

        await supabase.from('invoice_items').insert(itemRows);
      }
      
      showToast('Supabase seeded with 5 test books successfully!', 'success');
      await fetchInvoicesFromSupabase(false);
    } catch (err: any) {
      console.error(err);
      showToast('Seed failed: ' + err.message, 'info');
    } finally {
      setIsLoading(false);
    }
  };

  // Create new invoice handler
  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      showToast('Please log in first to create invoices.', 'info');
      return;
    }

    if (!isPro && invoices.length >= 30) {
      setShowLimitPopup(true);
      showToast('Free plan limit reached. Upgrade to continue.', 'info');
      return;
    }

    // Validations
    if (!customerName.trim()) {
      showToast('Please enter customer name', 'info');
      return;
    }

    const invalidItems = formItems.some(i => !i.name.trim() || i.price <= 0 || !i.quantity || Number(i.quantity) < 1);
    if (invalidItems) {
      showToast('Please fill item descriptions, rate (> 0), and quantity (>= 1)', 'info');
      return;
    }

    setIsLoading(true);
    try {
      const total = formItems.reduce((acc, item) => acc + (item.quantity * item.price), 0);
      const custNameTrim = customerName.trim();
      const custPhoneTrim = customerPhone.trim() || 'No Mobile';
      let customerId: string;
      
      // Get or create customer ID in Supabase belonging to this user
      const { data: existingCustomers, error: findError } = await supabase
        .from('customers')
        .select('id, name, phone')
        .eq('user_id', user.id)
        .ilike('name', custNameTrim);
         
      if (existingCustomers && existingCustomers.length > 0) {
        const existing = existingCustomers[0];
        customerId = existing.id;
        
        if ((existing.phone === 'No Mobile' || !existing.phone) && custPhoneTrim !== 'No Mobile') {
          await supabase
            .from('customers')
            .update({ phone: custPhoneTrim })
            .eq('id', existing.id);
        }
      } else {
        const { data: newCustomer, error: insertCustErr } = await supabase
          .from('customers')
          .insert({ name: custNameTrim, phone: custPhoneTrim, user_id: user.id })
          .select('id');
          
        if (insertCustErr || !newCustomer || newCustomer.length === 0) {
          throw insertCustErr || new Error('Failed to create customer record');
        }
        customerId = newCustomer[0].id;
      }

      // Generate invoice format number: IP-2026-XYZ
      const invoiceNumber = `IP-2026-${String(invoices.length + 1).padStart(3, '0')}`;

      // Calculate GST and Grand Total (exclusive model: GST added on top)
      const calculatedGstAmount = total * (formGstRate / 100);
      const calculatedGrandTotal = total + calculatedGstAmount;

      // Save invoice to Supabase with user_id & GST values
      const { data: newInvResponse, error: insertInvErr } = await supabase
        .from('invoices')
        .insert({
          customer_id: customerId,
          invoice_number: invoiceNumber,
          total_amount: Number(calculatedGrandTotal.toFixed(2)),
          gst_amount: Number(calculatedGstAmount.toFixed(2)),
          status: formStatus,
          user_id: user.id
        })
        .select('id, created_at');

      if (insertInvErr || !newInvResponse || newInvResponse.length === 0) {
        throw insertInvErr || new Error('Failed to create invoice record');
      }
      
      const savedInvoiceId = newInvResponse[0].id;
      const createdAt = newInvResponse[0].created_at;

      // Insert invoice items to Supabase
      const itemRows = formItems.map(item => ({
        invoice_id: savedInvoiceId,
        item_name: item.name.trim(),
        quantity: item.quantity,
        rate: item.price,
        amount: item.quantity * item.price
      }));

      const { error: insertItemsErr } = await supabase
        .from('invoice_items')
        .insert(itemRows);

      if (insertItemsErr) {
        throw insertItemsErr;
      }

      // Construct safe UI state object so navigation is smooth and fluid
      const newInvoiceObj: Invoice = {
        id: savedInvoiceId,
        invoiceNo: invoiceNumber,
        customerName: custNameTrim,
        customerPhone: custPhoneTrim,
        items: formItems.map((item, idx) => ({
          id: `item-${Date.now()}-${idx}`,
          name: item.name.trim(),
          quantity: item.quantity,
          price: item.price
        })),
        date: createdAt ? new Date(createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        status: formStatus,
        totalAmount: Number(calculatedGrandTotal.toFixed(2)),
        gstRate: formGstRate,
        gstAmount: Number(calculatedGstAmount.toFixed(2)),
        gstType: 'exclusive'
      };

      setIsFormOpen(false);
      setSelectedReceipt(newInvoiceObj);
      showToast(`Invoice ${invoiceNumber} successfully saved to Supabase!`, 'success');

      // Reset Form fields
      setCustomerName('');
      setCustomerPhone('');
      setFormItems([{ id: '1', name: '', quantity: 1, price: 0 }]);
      setFormGstRate(18);
      setFormGstType('exclusive');
      setFormStatus('Paid');

      await fetchInvoicesFromSupabase(false);

    } catch (err: any) {
      console.error(err);
      showToast(`Failed to create invoice: ${err.message}`, 'info');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete invoice
  const handleDeleteInvoice = async (id: string, invoiceNo: string) => {
    if (window.confirm(`Are you sure you want to delete invoice ${invoiceNo}?`)) {
      setIsLoading(true);
      try {
        const { error } = await supabase
          .from('invoices')
          .delete()
          .eq('id', id);

        if (error) throw error;

        setInvoices(invoices.filter(i => i.id !== id));
        showToast(`Invoice ${invoiceNo} deleted from Supabase`, 'info');
        if (selectedReceipt?.id === id) {
          setSelectedReceipt(null);
        }
      } catch (err: any) {
        console.error(err);
        showToast(`Error deleting invoice: ${err.message}`, 'info');
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Toggle invoice status (Paid <=> Pending)
  const toggleInvoiceStatus = async (id: string) => {
    const current = invoices.find(inv => inv.id === id);
    if (!current) return;

    const newStatus = current.status === 'Paid' ? 'Pending' : 'Paid';
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      setInvoices(
        invoices.map(inv => {
          if (inv.id === id) {
            return { ...inv, status: newStatus };
          }
          return inv;
        })
      );

      showToast(`Invoice marked as ${newStatus} in Supabase`, 'success');
      
      // If viewing receipt, update it too
      if (selectedReceipt && selectedReceipt.id === id) {
        setSelectedReceipt(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err: any) {
      console.error(err);
      showToast(`Failed to update status: ${err.message}`, 'info');
    } finally {
      setIsLoading(false);
    }
  };

  // Simulate sharing to WhatsApp
  const handleWhatsAppShare = (inv: Invoice) => {
    // Sync current receipt to modal so the QR code canvas gets rendered
    if (!selectedReceipt || selectedReceipt.id !== inv.id) {
      setSelectedReceipt(inv);
    }

    const processShare = () => {
      const hasUpiSet = upiId && upiId.trim() !== '' && upiId.trim() !== 'shopname@upi';
      
      // Attempt to download the QR code canvas if present in DOM
      const canvas = document.getElementById('invoice-qr-canvas') as HTMLCanvasElement | null;
      if (hasUpiSet && canvas) {
        try {
          const qrImage = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.download = `InvoicePe-QR-${inv.invoiceNo}.png`;
          link.href = qrImage;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          showToast(`UPI QR code image is downloaded! Kindly attach it to WhatsApp.`, 'success');
        } catch (err) {
          console.error('Error exporting QR canvas:', err);
        }
      }

      // Calculate total amounts accurately
      const qrSubtotal = (inv.items || []).reduce((sum, item) => sum + (item.quantity * item.price), 0);
      const qrGstRate = inv.gstRate !== undefined ? inv.gstRate : 18;
      const qrGstAmount = inv.gstAmount !== undefined ? inv.gstAmount : qrSubtotal * (qrGstRate / 100);
      const qrGrandTotal = Math.round(qrSubtotal + qrGstAmount);
      
      const statusText = (inv.status || 'PENDING').toUpperCase();
      const encodedShopName = encodeURIComponent(shopName);

      let upiPaymentSection = '';
      if (hasUpiSet) {
        upiPaymentSection = `💳 Pay instantly via UPI:\n` +
          `UPI ID: ${upiId}\n` +
          `Amount: ₹${inv.totalAmount}\n` +
          `Or click to pay:\n` +
          `gpay://upi/pay?pa=${upiId}&pn=${encodedShopName}&am=${inv.totalAmount}&cu=INR\n`;
      }

      const text = `🧾 Invoice from ${shopName}\n` +
        `Invoice No: ${inv.invoiceNo}\n` +
        `Customer: ${inv.customerName}\n` +
        `Amount: ₹${inv.totalAmount}\n` +
        `Status: ${statusText}\n` +
        upiPaymentSection +
        `Thank you for shopping with us!\n` +
        `Powered by InvoicePe 🧾`;

      const encoded = encodeURIComponent(text);
      const phoneSuffix = inv.customerPhone && inv.customerPhone !== 'No Mobile' ? inv.customerPhone : '';
      const url = `https://api.whatsapp.com/send?phone=91${phoneSuffix}&text=${encoded}`;
      
      showToast(`Sharing invoice with ${inv.customerName} via WhatsApp!`, 'success');
      window.open(url, '_blank', 'noopener,noreferrer');
    };

    // If canvas is not yet in the DOM, let react render it first
    const canvasExists = !!document.getElementById('invoice-qr-canvas');
    if (!canvasExists && upiId && upiId.trim() !== '' && upiId.trim() !== 'shopname@upi') {
      setTimeout(() => {
        processShare();
      }, 250);
    } else {
      processShare();
    }
  };

  // Send payment reminder to customer via WhatsApp
  const handleSendReminder = (cust: { name: string; phone: string; pendingAmount: number }) => {
    const amount = cust.pendingAmount;
    const text = `Namaste ${cust.name}ji! Aapka ₹${amount.toLocaleString('en-IN')} pending hai. Kripya jaldi bhugtan karein. - InvoicePe`;
    const encoded = encodeURIComponent(text);
    const phoneSuffix = cust.phone && cust.phone !== 'No Mobile' ? cust.phone : '';
    const url = `https://api.whatsapp.com/send?phone=91${phoneSuffix}&text=${encoded}`;
    
    showToast(`Sending payment reminder to ${cust.name}!`, 'success');
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Send WhatsApp Daily Summary of today's business
  const handleSendDailySummary = async () => {
    try {
      showToast("Fetching today's latest business ledger...", "info");
      
      // Update background lists from Supabase
      if (user) {
        await Promise.all([
          fetchInvoicesFromSupabase(false),
          fetchUdhaarsFromSupabase(false)
        ]);
      }

      const todayStr = new Date().toISOString().split('T')[0];
      const todayInvoices = invoices.filter(inv => inv.date === todayStr);

      const todaySales = todayInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
      const invoicesCount = todayInvoices.length;

      const totalPendingPayments = invoices
        .filter(inv => inv.status === 'Pending')
        .reduce((sum, inv) => sum + inv.totalAmount, 0);

      const totalActiveUdhaar = udhaars
        .filter(entry => entry.status === 'Unpaid')
        .reduce((sum, entry) => sum + entry.amount, 0);

      const formattedDate = new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

      // Construct WhatsApp message template precisely as requested
      const text = `📊 InvoicePe Daily Report - ${formattedDate}
🏪 ${shopName.toUpperCase()}
✅ Today's Sales: ₹${todaySales.toLocaleString('en-IN')}
📄 Invoices Created: ${invoicesCount}
⏳ Pending Payments: ₹${totalPendingPayments.toLocaleString('en-IN')}
📒 Active Udhaar: ₹${totalActiveUdhaar.toLocaleString('en-IN')}
Powered by InvoicePe 🧾`;

      const encoded = encodeURIComponent(text);
      const url = `https://api.whatsapp.com/send?text=${encoded}`;

      showToast("Opening WhatsApp with Daily Report summary...", "success");
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error("Error generating daily summary:", error);
      showToast("Pratikriya fill nahi ho payi, punah prayas karein.", "info");
    }
  };

  // Parse voice text transcript to auto-extract Customer Name, and Items with quantities/rates
  const parseVoiceInvoice = (transcript: string) => {
    let customerNameResult = "";
    let itemPart = transcript;

    // Remove polite terms or introductory fillers
    let cleaned = transcript
      .replace(/^(namaste|hello|hi|please|kripya|invoice for|invoice pe)\s+/gi, "")
      .trim();

    // Look for separator keywords in Hindi or English (e.g. "Ramesh ko", "Ramesh customer", "Ramesh ji")
    const koRegex = /\s+(?:ko|ko\s+ji|ji\s+ko|को|for|to)\s+/i;
    const hasKoIdx = cleaned.search(koRegex);
    if (hasKoIdx !== -1) {
      const beforeKo = cleaned.substring(0, hasKoIdx).trim();
      const words = beforeKo.split(/\s+/);
      if (words.length > 0) {
        // First word before 'ko' = customer name
        customerNameResult = words[words.length - 1].trim();
        // Remove non-word characters and retain Hindi / English characters
        customerNameResult = customerNameResult.replace(/^[-\s,.:;+()]+|[-\s,.:;+()]+$/g, "");
      }
      const match = cleaned.match(koRegex);
      const separatorLength = match ? match[0].length : 4;
      itemPart = cleaned.substring(hasKoIdx + separatorLength).trim();
    } else {
      // Split at the first comma as fallback
      const commaSplit = cleaned.split(/,|\bko\b/i);
      if (commaSplit.length > 1 && isNaN(Number(commaSplit[0].trim()))) {
        customerNameResult = commaSplit[0].trim();
        itemPart = cleaned.substring(commaSplit[0].length + 1).trim();
      } else {
        // If first word is a string name, check if we can carve it out
        const words = cleaned.split(/\s+/);
        if (words.length > 1 && isNaN(Number(words[0]))) {
          customerNameResult = words[0];
          itemPart = cleaned.substring(words[0].length).trim();
        }
      }
    }

    if (!customerNameResult) {
      customerNameResult = "Walk-in Customer";
    }

    // Split entire tail block into components by "aur", "and", "plus", "+", "or", "another", "then", or commas
    const itemSplitRegex = /\s+(?:aur|and|और|plus|\+|then|comma)\s+|,/gi;
    const itemBlocks = itemPart.split(itemSplitRegex);
    const parsedItems: InvoiceItem[] = [];

    itemBlocks.forEach(block => {
      const trimmedBlock = block.trim();
      if (!trimmedBlock) return;

      // Match all numerical sequences
      const numbers = trimmedBlock.match(/\d+(?:\.\d+)?/g);
      if (!numbers) {
        if (trimmedBlock.length > 2) {
          parsedItems.push({
            id: 'voice-' + Math.random().toString(36).substring(2, 9),
            name: trimmedBlock.charAt(0).toUpperCase() + trimmedBlock.slice(1),
            quantity: 1,
            price: 0
          });
        }
        return;
      }

      let quantity = 1;
      let price = 0;
      let name = trimmedBlock;

      if (numbers.length >= 2) {
        // Numbers before item name = quantity
        // Numbers after item name = rate/price
        const qStr = numbers[0];
        const pStr = numbers[numbers.length - 1];

        quantity = Number(qStr);
        price = Number(pStr);

        // Get everything in between
        const qIndex = trimmedBlock.indexOf(qStr);
        const pIndex = trimmedBlock.lastIndexOf(pStr);

        let midPart = "";
        if (qIndex !== -1 && pIndex !== -1 && pIndex > qIndex + qStr.length) {
          midPart = trimmedBlock.substring(qIndex + qStr.length, pIndex).trim();
        } else {
          midPart = trimmedBlock.replace(qStr, "").replace(pStr, "").trim();
        }

        // Strip off common filler words & units in Hindi/English
        name = midPart
          .replace(/^(?:kilo|kilos|kg|kgs|litre|litres|liter|liters|ltr|ltrs|packet|packets|piece|pieces|pc|pcs|gram|grams|g|ml|of|at|rate|for|ko|to|rupaye|rupee|rupees|rs|rs\.)\s+/gi, "")
          .replace(/^(?:किलो|लीटर|पीस|पैकेट|ग्राम|रुपये|रुपया|का|के)\s+/i, "")
          .replace(/\s+(?:kilo|kilos|kg|kgs|litre|litres|liter|liters|ltr|ltrs|packet|packets|piece|pieces|pc|pcs|gram|grams|g|ml|of|at|rate|for|ko|to|rupaye|rupee|rupees|rs|rs\.)$/gi, "")
          .replace(/\s+(?:किलो|लीटर|पीस|पैकेट|ग्राम|रुपये|रुपया|का|के)$/i, "")
          .trim();

        if (!name) {
          name = midPart;
        }

      } else if (numbers.length === 1) {
        const valStr = numbers[0];
        const val = Number(valStr);
        const valIdx = trimmedBlock.indexOf(valStr);

        const beforeText = trimmedBlock.substring(0, valIdx).trim();
        const afterText = trimmedBlock.substring(valIdx + valStr.length).trim();

        const hasPriceIndicator = trimmedBlock.match(/\b(rupaye|rupee|rupees|rs|rate|price|₹|inr|रुपये|रुपया|रू|रु)\b/i);

        if (hasPriceIndicator || (beforeText.length > 0 && afterText.length === 0)) {
          // Number after item name = price/rate
          price = val;
          quantity = 1;
          name = beforeText;
        } else {
          // Number before item name = quantity
          quantity = val;
          price = 0;
          name = afterText;
        }

        name = name
          .replace(/^(?:kilo|kilos|kg|kgs|litre|litres|liter|liters|ltr|ltrs|packet|packets|piece|pieces|pc|pcs|gram|grams|g|ml|of|at|rate|for|ko|to|rupaye|rupee|rupees|rs|rs\.)\s+/gi, "")
          .replace(/^(?:किलो|लीटर|पीस|पैकेट|ग्राम|रुपये|रुपया|का|के)\s+/i, "")
          .replace(/\s+(?:kilo|kilos|kg|kgs|litre|litres|liter|liters|ltr|ltrs|packet|packets|piece|pieces|pc|pcs|gram|grams|g|ml|of|at|rate|for|ko|to|rupaye|rupee|rupees|rs|rs\.)$/gi, "")
          .replace(/\s+(?:किलो|लीटर|पीस|पैकेट|ग्राम|रुपये|रुपया|का|के)$/i, "")
          .trim();
      }

      name = name.replace(/\s+/g, " ")
                 .replace(/^[-\s,.:;+()]+|[-\s,.:;+()]+$/g, "")
                 .trim();

      if (name) {
        name = name.charAt(0).toUpperCase() + name.slice(1);
        parsedItems.push({
          id: 'voice-' + Math.random().toString(36).substring(2, 9),
          name,
          quantity,
          price
        });
      }
    });

    customerNameResult = customerNameResult
      .replace(/\s+/g, " ")
      .replace(/^[-\s,.:;+()]+|[-\s,.:;+()]+$/g, "")
      .trim();

    if (customerNameResult) {
      customerNameResult = customerNameResult.charAt(0).toUpperCase() + customerNameResult.slice(1);
    }

    return {
      customerName: customerNameResult,
      items: parsedItems
    };
  };

  // Start Voice Recognition Recording
  const startVoiceInvoice = () => {
    if (!isPro && invoices.length >= 30) {
      setShowLimitPopup(true);
      showToast('Free plan limit reached. Upgrade to continue.', 'info');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast("Apke browser me Speech Recognition support nahi hai. Chrome ya Safari use karein.", "info");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.lang = 'hi-IN'; // Works incredibly well for combining Hindi sentences & English products
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceTranscript("Sunn raha hoon... Hindi ya English me bolein...");
        showToast("Voice mode chaloo hai! Bolna shuru karein.", "success");
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          showToast("Mic permission verify karein!", "info");
          setVoiceTranscript("Permission Denied: Please check mic configuration.");
        } else {
          showToast(`Error matching voice input: ${event.error}`, "info");
          setVoiceTranscript(`Speech Error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onresult = (event: any) => {
        const textTranscript = event.results[0][0].transcript;
        setVoiceTranscript(textTranscript);
        
        const parsed = parseVoiceInvoice(textTranscript);
        
        if (parsed.customerName) {
          setCustomerName(parsed.customerName);
        }

        if (parsed.items && parsed.items.length > 0) {
          const isCurrentEmpty = formItems.length === 1 && formItems[0].name === '' && formItems[0].price === 0;
          if (isCurrentEmpty) {
            setFormItems(parsed.items);
          } else {
            setFormItems(prev => {
              const cleanedPrev = prev.filter(item => item.name.trim() !== '');
              return [...cleanedPrev, ...parsed.items];
            });
          }
          showToast(`Successfully extracted ${parsed.items.length} bill items!`, "success");
        } else {
          showToast("Sound heard but couldn't parse any items. Tap again and speak clearly.", "info");
        }
      };

      recognition.start();
    } catch (err) {
      console.error("Failed to start speech service:", err);
      showToast("Kuch takneeki kharabi aayi. Kripya punah prayas karein.", "info");
    }
  };

  // Generate Monthly GST Report PDF
  const handleGenerateGstReport = async () => {
    if (!isPro) {
      setShowLimitPopup(true);
      showToast("GST Report generation is a PRO feature! Please upgrade to PRO/Business to download. 🚀", "info");
      return;
    }

    try {
      if (!(window as any).jspdf) {
        showToast("Error: jsPDF is still loading. Please try again in a moment.", "info");
        return;
      }

      setIsGeneratingGstReport(true);
      // Fetch latest invoices in background
      if (user) {
        await fetchInvoicesFromSupabase(false);
      }
      
      // Filter invoices for selected Month and Year
      // inv.date is formatted as YYYY-MM-DD
      const filtered = invoices.filter(inv => {
        if (!inv.date) return false;
        const parts = inv.date.split('-');
        if (parts.length < 2) return false;
        const y = Number(parts[0]);
        const m = Number(parts[1]);
        return y === selectedReportYear && m === selectedReportMonth;
      });

      if (filtered.length === 0) {
        const monthNames = [
          "January", "February", "March", "April", "May", "June", 
          "July", "August", "September", "October", "November", "December"
        ];
        showToast(`Selected period (${monthNames[selectedReportMonth - 1]} ${selectedReportYear}) me koi invoices nahi mile!`, 'info');
        setIsGeneratingGstReport(false);
        return;
      }

      const { jsPDF } = (window as any).jspdf;
      const doc = new jsPDF();

      // Header Orange Band
      doc.setFillColor(249, 115, 22); // Orange #F97316
      doc.rect(0, 0, 210, 40, 'F');

      // White text in the header
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.text("InvoicePe", 15, 20);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("MONTHLY TAX LEDGER & GST RETURNS REPORT", 15, 27);

      // Shop details in header right-aligned
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text(shopName.toUpperCase(), 195, 20, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.text(`GSTIN: ${gstin ? gstin.toUpperCase() : 'Not Set (Khaata Personal / Non-GST)'}`, 195, 27, { align: "right" });

      let y = 52;

      // Horizontal Rule
      doc.setDrawColor(240, 240, 240);
      doc.line(15, y, 195, y);
      y += 8;

      // Report Info Header Section
      doc.setTextColor(60, 60, 60);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("GST SALES SUMMARY REPORT", 15, y);

      const monthNamesUpper = [
        "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", 
        "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
      ];
      const monthStr = monthNamesUpper[selectedReportMonth - 1] + " " + selectedReportYear;
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.text(`REPORT PERIOD: ${monthStr}`, 15, y + 6);
      doc.text(`GENERATION DATE: ${new Date().toLocaleDateString('en-IN')}`, 120, y + 6);

      y += 14;

      // Draw Table Header Background
      doc.setFillColor(250, 245, 240); // Soft warm gray
      doc.rect(15, y, 180, 8, 'F');

      doc.setTextColor(120, 70, 20); // Warm theme color
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);

      doc.text("INV NO", 17, y + 5.5);
      doc.text("CUSTOMER NAME", 40, y + 5.5);
      doc.text("DATE", 95, y + 5.5);
      doc.text("SUBTOTAL (INR)", 125, y + 5.5, { align: "right" });
      doc.text("GST AMOUNT", 158, y + 5.5, { align: "right" });
      doc.text("GRAND TOTAL", 195, y + 5.5, { align: "right" });

      y += 8;

      // Table items rows
      doc.setTextColor(50, 50, 50);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      let totalSalesSubtotal = 0;
      let totalGstCollectedAmt = 0;
      let totalInvoicesCountAmt = filtered.length;

      filtered.forEach((inv) => {
        if (y > 255) {
          doc.addPage();
          y = 20;
        }

        // Calculate pricing
        const subtotal = inv.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
        const gstRate = inv.gstRate !== undefined ? inv.gstRate : 18;
        const gstAmount = inv.gstAmount !== undefined ? inv.gstAmount : subtotal * (gstRate / 100);
        const grandTotal = subtotal + gstAmount;

        totalSalesSubtotal += subtotal;
        totalGstCollectedAmt += gstAmount;

        doc.setDrawColor(245, 245, 245);
        doc.line(15, y + 7, 195, y + 7);

        doc.text(inv.invoiceNo, 17, y + 4.5);
        const nameTruncated = inv.customerName.length > 22 ? inv.customerName.substring(0, 20) + "..." : inv.customerName;
        doc.text(nameTruncated, 40, y + 4.5);
        doc.text(inv.date, 95, y + 4.5);
        doc.text("₹" + Math.round(subtotal).toLocaleString('en-IN'), 125, y + 4.5, { align: "right" });
        doc.text("₹" + Math.round(gstAmount).toLocaleString('en-IN') + ` (${gstRate}%)`, 158, y + 4.5, { align: "right" });
        doc.text("₹" + Math.round(grandTotal).toLocaleString('en-IN'), 195, y + 4.5, { align: "right" });
        
        y += 7.5;
      });

      // Total Summaries
      if (y > 230) {
        doc.addPage();
        y = 20;
      }

      y += 8;
      const totalGrandCollected = totalSalesSubtotal + totalGstCollectedAmt;

      // Draw summary container frame
      doc.setFillColor(254, 247, 240); // Soft orange block
      doc.rect(15, y, 180, 25, 'F');
      doc.setDrawColor(249, 115, 22); // Orange border
      doc.rect(15, y, 180, 25);

      doc.setTextColor(30, 30, 30);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      
      doc.text(`TOTAL INVOICES ISSUED: ${totalInvoicesCountAmt}`, 20, y + 6.5);
      doc.text(`TOTAL SALES VALUE (TAXABLE): INR ${Math.round(totalSalesSubtotal).toLocaleString('en-IN')}`, 20, y + 12.5);
      doc.text(`TOTAL GST TAX COLLECTED: INR ${Math.round(totalGstCollectedAmt).toLocaleString('en-IN')}`, 20, y + 18.5);

      doc.setTextColor(249, 115, 22);
      doc.setFontSize(10);
      doc.text("TOTAL GROSS SALES (INR)", 190, y + 7.5, { align: "right" });
      doc.setFontSize(13);
      doc.text(`₹${Math.round(totalGrandCollected).toLocaleString('en-IN')}`, 190, y + 17, { align: "right" });

      // Footer line at the bottom of the page
      doc.setDrawColor(240, 240, 240);
      doc.line(15, 275, 195, 275);

      doc.setTextColor(140, 140, 140);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text("Generated by InvoicePe Digital Khaata Book • Professional GST Report summary", 15, 281);
      doc.text("Page 1", 195, 281, { align: "right" });

      const fileSafeMonth = monthStr.replace(/\s+/g, '_');
      doc.save(`GST_Report_${fileSafeMonth}.pdf`);
      showToast(`GST Report for ${monthStr} successfully downloaded!`, 'success');
      setIsGstReportOpen(false);
    } catch (error: any) {
      console.error("Error generating GST report:", error);
      showToast("GST Report update fail ho gaya. Kripya punah prayas karein.", 'info');
    } finally {
      setIsGeneratingGstReport(false);
    }
  };

  // Export PDF with jsPDF CDN
  const handleExportPDF = (inv: Invoice) => {
    try {
      if (!(window as any).jspdf) {
        showToast("Error: jsPDF is still loading. Please try again in a moment.", "info");
        return;
      }

      const { jsPDF } = (window as any).jspdf;
      const doc = new jsPDF();

      // Header Orange Band
      doc.setFillColor(249, 115, 22); // Orange #F97316
      doc.rect(0, 0, 210, 40, 'F');

      // White text in the header
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(26);
      doc.text("InvoicePe", 15, 20);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("KHAATA BOOK & DIGITAL LEDGER", 15, 27);

      // Shop details in header right-aligned
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(shopName.toUpperCase(), 195, 20, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("Active Owner / Merchant", 195, 27, { align: "right" });

      let y = 52;

      // Horizontal Rule
      doc.setDrawColor(240, 240, 240);
      doc.line(15, y, 195, y);
      y += 8;

      // Invoice Info Section
      doc.setTextColor(60, 60, 60);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("INVOICE NO:", 15, y);
      doc.setFont("helvetica", "normal");
      doc.text(inv.invoiceNo, 45, y);

      doc.setFont("helvetica", "bold");
      doc.text("DATE OF ISSUE:", 120, y);
      doc.setFont("helvetica", "normal");
      doc.text(inv.date, 160, y);

      y += 6;

      doc.setFont("helvetica", "bold");
      doc.text("PAYMENT STATUS:", 15, y);
      // Color-coded status text
      if (inv.status === 'Paid') {
        doc.setTextColor(16, 124, 65); // Green
        doc.text("PAID / NAKAD", 55, y);
      } else {
        doc.setTextColor(231, 76, 60); // Red
        doc.text("PENDING / UDHAAR", 55, y);
      }

      y += 10;
      doc.setDrawColor(230, 230, 230);
      doc.line(15, y, 195, y);
      y += 10;

      // Customer Info Section
      doc.setTextColor(100, 100, 100);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("BILLED TO (GRAHAK):", 15, y);

      y += 6;
      doc.setTextColor(30, 30, 30);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(inv.customerName, 15, y);

      if (inv.customerPhone && inv.customerPhone !== 'No Mobile') {
        y += 5;
        doc.setTextColor(80, 80, 80);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text("Mobile: +91 " + inv.customerPhone, 15, y);
      }

      y += 12;

      // Draw Table Header Background
      doc.setFillColor(250, 245, 240); // Soft warm gray
      doc.rect(15, y, 180, 8, 'F');

      doc.setTextColor(120, 70, 20); // Warm theme color
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);

      doc.text("S.No", 17, y + 5.5);
      doc.text("Item Description", 32, y + 5.5);
      doc.text("Qty", 125, y + 5.5, { align: "right" });
      doc.text("Rate (INR)", 155, y + 5.5, { align: "right" });
      doc.text("Amount (INR)", 195, y + 5.5, { align: "right" });

      y += 8;

      // Table items rows
      doc.setTextColor(50, 50, 50);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      inv.items.forEach((item, index) => {
        if (y > 250) {
          doc.addPage();
          y = 20;
        }

        doc.setDrawColor(245, 245, 245);
        doc.line(15, y + 8, 195, y + 8);

        doc.text((index + 1).toString(), 17, y + 5.5);
        const nameTruncated = item.name.length > 42 ? item.name.substring(0, 40) + "..." : item.name;
        doc.text(nameTruncated, 32, y + 5.5);
        doc.text(item.quantity.toString(), 125, y + 5.5, { align: "right" });
        doc.text("₹" + item.price.toLocaleString('en-IN'), 155, y + 5.5, { align: "right" });
        
        const amountStr = "₹" + (item.quantity * item.price).toLocaleString('en-IN');
        doc.text(amountStr, 195, y + 5.5, { align: "right" });

        y += 8;
      });

      const subtotal = inv.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
      const gstRate = inv.gstRate !== undefined ? inv.gstRate : 18;
      const gstAmount = inv.gstAmount !== undefined ? inv.gstAmount : subtotal * (gstRate / 100);
      const grandTotal = subtotal + gstAmount;

      y += 6;

      if (y > 230) {
        doc.addPage();
        y = 20;
      }

      // Draw summary box border
      doc.setDrawColor(240, 240, 240);
      doc.rect(120, y, 75, 28);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);

      doc.text("Subtotal:", 125, y + 6);
      doc.text("₹" + Math.round(subtotal).toLocaleString('en-IN'), 190, y + 6, { align: "right" });

      doc.text(`GST (${gstRate}%):`, 125, y + 13);
      doc.text("₹" + Math.round(gstAmount).toLocaleString('en-IN'), 190, y + 13, { align: "right" });

      doc.setDrawColor(220, 220, 220);
      doc.line(125, y + 17, 190, y + 17);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(249, 115, 22); // Orange Accent color for Grand Total
      doc.text("Grand Total:", 125, y + 23);
      const formattedGrandTotal = Math.round(grandTotal).toLocaleString('en-IN');
      doc.text("₹" + formattedGrandTotal, 190, y + 23, { align: "right" });

      // Embed UPI QR code onto PDF from active modal canvas element
      const qrCanvas = document.getElementById('invoice-qr-canvas') as HTMLCanvasElement;
      if (qrCanvas) {
        try {
          const imgData = qrCanvas.toDataURL('image/png');
          // Draw QR card border & fill (width 95, height 28)
          doc.setDrawColor(240, 240, 240);
          doc.setFillColor(254, 247, 240); 
          doc.rect(15, y, 95, 28, 'FD'); 

          // Insert QR Canvas Image (24x24 inside the 95x28 container)
          doc.addImage(imgData, 'PNG', 17, y + 2, 24, 24);

          // Add helper text in orange and neutral gray
          doc.setTextColor(249, 115, 22); 
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.text("SCAN TO PAY INSTANTLY VIA UPI", 45, y + 7);

          doc.setFont("helvetica", "bold");
          doc.setFontSize(7.5);
          doc.setTextColor(60, 60, 60);
          doc.text(`Store: ${shopName}`, 45, y + 12);

          doc.setFont("helvetica", "normal");
          doc.setFontSize(7);
          doc.setTextColor(110, 110, 110);
          doc.text(`UPI ID: ${upiId}`, 45, y + 17);
          doc.text("Scan to pay instantly via any UPI app", 45, y + 22);
        } catch (qrError) {
          console.error("Error embedding QR code in PDF:", qrError);
        }
      }

      // Draw footer line at the bottom of the page
      doc.setDrawColor(240, 240, 240);
      doc.line(15, 275, 195, 275);

      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text("Generated by InvoicePe Digital Khaata Book • Thank you for doing business!", 105, 281, { align: "center" });

      doc.save(`Invoice_${inv.invoiceNo}.pdf`);
      showToast(`PDF download started!`, 'success');
    } catch (e) {
      console.error(e);
      showToast("Could not export PDF. Please try again.", "info");
    }
  };

  if (authLoading) {
    return (
      <div id="app-root" className={`min-h-screen bg-neutral-900 flex justify-center items-start overflow-x-hidden font-sans text-neutral-800 selection:bg-orange-500 selection:text-white pt-4 ${darkMode ? 'dark' : ''} transition-all duration-300`}>
        <div id="mobile-viewport" className="w-full max-w-md min-h-screen bg-[#FFFBF7] flex flex-col shadow-2xl relative border border-neutral-850/20 rounded-3xl overflow-hidden justify-center items-center gap-3 transition-all duration-300">
          <div className="w-12 h-12 rounded-full border-4 border-orange-200 border-t-orange-500 animate-spin"></div>
          <p className="text-[11px] font-extrabold text-orange-950 animate-pulse tracking-widest uppercase text-center">Initializing InvoicePe Ledger...</p>
        </div>
      </div>
    );
  }

  // Intercept Password Reset Route
  if (currentPath === '/forgot-password-secret') {
    const handleTriggerReset = async (e: React.FormEvent) => {
      e.preventDefault();
      setResetSubmitting(true);
      setResetMessage(null);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
          redirectTo: window.location.origin + '/#forgot-password-secret'
        });
        if (error) {
          setResetMessage({ text: error.message, type: 'error' });
          showToast(error.message, 'info');
        } else {
          setResetMessage({ 
            text: `A recovery link from Supabase has been sent to ${resetEmail}. Check your mailbox (or spam folder), click the link, and you will be returned here to save active new credentials.`, 
            type: 'success' 
          });
          showToast('Reset email dispatched!', 'success');
        }
      } catch (err: any) {
        setResetMessage({ text: err.message || 'Error requesting password reset', type: 'error' });
      } finally {
        setResetSubmitting(false);
      }
    };

    const handleSaveNewPassword = async (e: React.FormEvent) => {
      e.preventDefault();
      if (newPassword !== confirmNewPassword) {
        setResetMessage({ text: 'Security locks must match.', type: 'error' });
        showToast('Passwords do not match', 'info');
        return;
      }
      if (newPassword.length < 6) {
        setResetMessage({ text: 'Password must code 6 digits or more.', type: 'error' });
        showToast('Minimum 6 characters required', 'info');
        return;
      }

      setResetSubmitting(true);
      setResetMessage(null);
      try {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) {
          setResetMessage({ text: error.message, type: 'error' });
          showToast(error.message, 'info');
        } else {
          setResetMessage({ text: 'Success! Your password was updated successfully in the Supabase Cloud. Redirecting...', type: 'success' });
          showToast('Password updated permanently!', 'success');
          setNewPassword('');
          setConfirmNewPassword('');
          setIsResettingPassword(false);
          setPastedResetUrl('');
          setTimeout(() => {
            window.location.hash = '';
            setCurrentPath('/');
          }, 3000);
        }
      } catch (err: any) {
        setResetMessage({ text: err.message || 'Error updating password', type: 'error' });
      } finally {
        setResetSubmitting(false);
      }
    };

    const handleProcessPastedUrl = async (inputVal: string) => {
      setPastedResetUrl(inputVal);
      setPastedResetError(null);
      if (!inputVal) return;

      try {
        let queryString = '';
        if (inputVal.includes('#')) {
          queryString = inputVal.split('#')[1];
        } else if (inputVal.includes('?')) {
          queryString = inputVal.split('?')[1];
        } else {
          queryString = inputVal;
        }

        const params = new URLSearchParams(queryString);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (!accessToken) {
          setPastedResetError('Could not find access_token. Make sure to copy the ENTIRE address bar URL.');
          return;
        }

        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });

        if (error) {
          setPastedResetError(`Supabase Session Error: ${error.message}`);
        } else {
          setIsResettingPassword(true);
          setResetMessage({
            text: '🎉 Session authorized with Supabase via pasted fragment! Create your new password below.',
            type: 'success'
          });
          showToast('Session authorized successfully!', 'success');
        }
      } catch (err: any) {
        setPastedResetError(err.message || 'Error parsing pasted URL details.');
      }
    };

    return (
      <div id="app-root" className={`min-h-screen bg-neutral-900 flex justify-center items-start overflow-x-hidden font-sans text-neutral-800 pt-4 ${darkMode ? 'dark' : ''} transition-all duration-300`}>
        <div id="mobile-viewport" className="w-full max-w-md min-h-screen bg-[#FFFBF7] flex flex-col shadow-2xl relative border border-neutral-850/20 rounded-3xl overflow-hidden justify-between transition-all duration-300">
          
          {/* Top Status Header */}
          <div className="bg-orange-500/10 text-[10px] tracking-wider text-orange-850 px-4 py-3 flex justify-between items-center font-mono font-bold select-none border-b border-orange-100/30">
            <span className="flex items-center gap-1.5 flex-row">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
              <span>ADMIN SECURE RECOVERY SYSTEM</span>
            </span>
            <button
              onClick={() => {
                window.location.hash = '';
                setCurrentPath('/');
              }}
              className="px-2 py-0.5 bg-orange-100/50 hover:bg-orange-100 text-orange-950 font-sans text-[9px] uppercase font-black rounded transition-all cursor-pointer border-0"
            >
              Exit Gateway
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 p-5 flex flex-col justify-start space-y-5 overflow-y-auto">
            <div className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-md">
                🔒
              </div>
              <div>
                <h1 className="text-lg font-display font-black text-slate-900 tracking-tight leading-none">
                  Reset Password / पासवर्ड बदलें
                </h1>
                <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest mt-1">
                  InvoicePe Simple Recovery Wizard
                </p>
              </div>
            </div>

            {resetMessage && (
              <div className={`p-4 rounded-xl border text-xs font-bold leading-relaxed ${resetMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                {resetMessage.text}
              </div>
            )}

            {!isResettingPassword ? (
              // STEP 1 & 2 COMBINED FOR MAXIMUM Simplicity
              <div className="space-y-5">
                {/* Visual Step Tracker card */}
                <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm space-y-4">
                  <h3 className="text-xs font-black text-slate-800 border-b border-slate-150 pb-2 uppercase tracking-wider">
                    Easy 2-Step Recovery / 2 आसान चरण:
                  </h3>
                  
                  {/* Step 1 */}
                  <div className="space-y-1">
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-orange-500 text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                      <div>
                        <h4 className="text-[11.5px] font-black text-slate-900">Request Email / ईमेल भेजें</h4>
                        <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                          Enter email and press <strong>Send Link</strong>. You will get an email from Supabase.
                          <br />
                          अपना ईमेल लिखकर <strong>"Send Reset Link"</strong> बटन दबाएं। आपको ईमेल प्राप्त होगा।
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="space-y-1 border-t border-slate-100 pt-3">
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-amber-500 text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                      <div>
                        <h4 className="text-[11.5px] font-black text-slate-900">Copy & Paste Link / लिंक कॉपी-पेस्ट करें</h4>
                        <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                          Click that email link. If it opens a broken <strong className="text-orange-600">localhost:3000</strong> page, <strong>don't worry!</strong> Just copy that entire address/URL from your web browser and paste it in the box below!
                          <br />
                          ईमेल लिंक खोलें। यदि "localhost" एरर आए, तो घबराएं नहीं! बस अपनी एड्रेस बार का पूरा लिंक कॉपी करें और नीचे पेस्ट करें।
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Email Form */}
                <form onSubmit={handleTriggerReset} className="space-y-3.5 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <div>
                    <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block mb-1">
                      Your Registered Email / आपका ईमेल
                    </label>
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                      placeholder="chanchaltailor404@gmail.com"
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none font-bold text-slate-850"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={resetSubmitting}
                    className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-350 text-white py-3 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all shadow-sm cursor-pointer"
                  >
                    {resetSubmitting ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                        <span>Sending Link...</span>
                      </>
                    ) : (
                      <>
                        <span>Send Reset Link (ईमेल भेजें)</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* Paste URL Box */}
                <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200/60 space-y-2.5 shadow-sm">
                  <h3 className="text-[11px] font-black text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="text-sm">📥</span>
                    <span>Paste Email Reset Link Here / लिंक यहाँ पेस्ट करें:</span>
                  </h3>
                  <input
                    type="text"
                    className="w-full text-[10.5px] px-3.5 py-3 bg-white border border-amber-200 rounded-xl focus:border-orange-550 focus:outline-none font-mono text-slate-800 placeholder:text-slate-400 border-dashed"
                    placeholder="e.g. http://localhost:3000/#access_token=..."
                    value={pastedResetUrl}
                    onChange={(e) => handleProcessPastedUrl(e.target.value)}
                  />
                  {pastedResetError && (
                    <p className="text-[9.5px] font-bold text-red-600 block bg-red-50 p-2 rounded-lg border border-red-100">❌ {pastedResetError}</p>
                  )}
                  <p className="text-[9px] text-amber-800/80 font-bold leading-normal">
                    💡 Directly pasting the link you got via email (even if "localhost:3000" didn't load) unlocks your page instantly!
                  </p>
                </div>
              </div>
            ) : (
              // STEP 3: Token verified, show password update boxes
              <form onSubmit={handleSaveNewPassword} className="space-y-4">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3.5 text-center text-emerald-850 text-[10px] uppercase tracking-wider font-black animate-pulse flex items-center justify-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Reset Session Authorized / सेशन स्वीकृत</span>
                </div>

                <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block">New Password (नया पासवर्ड)</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                      placeholder="Minimum 6 characters"
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none font-bold text-slate-950"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block">Confirm New Password (पासवर्ड दोबारा लिखें)</label>
                    <input
                      type="password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      required
                      minLength={6}
                      placeholder="Minimum 6 characters"
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none font-bold text-slate-950"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={resetSubmitting}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white py-3 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer"
                >
                  {resetSubmitting ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                      <span>Rewriting password...</span>
                    </>
                  ) : (
                    <>
                      <span>Save New Password (पासवर्ड सुरक्षित करें)</span>
                      <CheckCircle2 className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            <div className="text-center pt-1 pb-4">
              <button
                type="button"
                onClick={() => {
                  setIsResettingPassword(!isResettingPassword);
                  setResetMessage(null);
                }}
                className="text-[10px] font-black text-slate-400 hover:text-orange-500 tracking-wider uppercase bg-transparent border-0 cursor-pointer"
              >
                {!isResettingPassword ? "No email access but have the redirect code?" : "Go back to request reset email"}
              </button>
            </div>
          </div>

          {/* Footer lock and trust notation */}
          <div className="text-center py-4 border-t border-slate-100 text-[9px] text-slate-400 font-bold space-y-1 uppercase tracking-widest bg-slate-50">
            <p>🔒 Security Protocol • SHA-256 Encryption</p>
            <p>© 2026 InvoicePe Master Account Node</p>
          </div>
        </div>
      </div>
    );
  }

  // Intercept Admin Panel Route
  if (currentPath === '/admin-invoicepe-secret') {
    if (!user) {
       // Allow user verification flow below; do not block here
    } else if (user.email !== 'chanchaltailor404@gmail.com') {
      return (
        <div id="app-root" className={`min-h-screen bg-neutral-900 flex justify-center items-start overflow-x-hidden font-sans text-neutral-800 pt-4 ${darkMode ? 'dark' : ''} transition-all duration-300`}>
          <div id="mobile-viewport" className="w-full max-w-md min-h-screen bg-[#FFFBF7] flex flex-col shadow-2xl relative border border-neutral-850/20 rounded-3xl overflow-hidden p-6 justify-between transition-all duration-300">
            <div className="bg-red-500/10 text-[10px] tracking-wider text-red-850 px-4 py-2.5 flex justify-between items-center font-mono font-bold select-none border-b border-red-100/50 -mx-6 -mt-6">
              <span>ADMIN SECURE GATEWAY</span>
              <div className="flex items-center gap-1.5 flex-row">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                <span>ACCESS RESTRICTED</span>
              </div>
            </div>
            
            <div className="flex-1 flex flex-col justify-center items-center text-center space-y-4">
              <div className="w-16 h-16 bg-red-100 border border-red-200 text-red-600 rounded-2xl flex items-center justify-center font-bold text-2xl shadow-sm">
                ⚠️
              </div>
              <h2 className="text-xl font-bold text-slate-900 font-display">Access Denied (अवैध प्रवेश)</h2>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs font-semibold">
                This hidden ledger dashboard is reserved for administrative audits only. Logging in with email <span className="font-mono text-slate-800 font-bold break-all">{user.email}</span> does not confer administration permissions.
              </p>
              
              <button
                type="button"
                onClick={() => {
                  window.history.pushState({}, '', '/');
                  window.dispatchEvent(new Event('popstate'));
                }}
                className="px-5 py-3 bg-[#E05E23] hover:bg-orange-600 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider shadow-sm transition-all cursor-pointer"
              >
                Go Back to Merchant Account
              </button>
            </div>
            
            <div className="text-center py-4 border-t border-slate-100 text-[10px] text-slate-400 font-bold -mx-6 -mb-6 bg-slate-50">
              © 2026 InvoicePe Security Protocol
            </div>
          </div>
        </div>
      );
    } else {
      // Is admin user on /admin-invoicepe-secret route
      return (
        <div id="app-root" className={`min-h-screen bg-neutral-900 flex justify-center items-start overflow-x-hidden font-sans text-neutral-800 pt-4 ${darkMode ? 'dark' : ''} transition-all duration-300`}>
          <div id="mobile-viewport" className="w-full max-w-md min-h-screen bg-[#FFFBF7] flex flex-col shadow-2xl relative border border-neutral-850/20 rounded-3xl overflow-hidden transition-all duration-300">
            {/* Admin Header */}
            <div className="bg-slate-900 text-[10px] tracking-wider text-slate-350 px-4 py-3.5 flex justify-between items-center font-mono font-bold select-none border-b border-slate-800">
              <span className="flex items-center gap-1.5 flex-row">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>INVOICEPE ADMIN MASTER SYSTEM</span>
              </span>
              <button
                onClick={() => {
                  window.history.pushState({}, '', '/');
                  window.dispatchEvent(new Event('popstate'));
                }}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white font-sans text-[10px] uppercase font-black rounded border border-slate-700 transition-all cursor-pointer"
              >
                Exit
              </button>
            </div>

            {/* Admin View Body */}
            <div className="flex-1 flex flex-col p-4 space-y-4 overflow-y-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2 font-display">
                    <span>Admin Controls</span>
                  </h1>
                  <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest mt-0.5">Global Ledger Synchronizer</p>
                </div>
                <button
                  type="button"
                  onClick={fetchAllAdminProfiles}
                  className="px-3 py-1.5 bg-orange-500 text-white text-[9px] font-black uppercase rounded-lg cursor-pointer transition-all hover:bg-orange-600 shadow-sm"
                >
                  Sync DB
                </button>
              </div>              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  value={adminSearch}
                  onChange={(e) => setAdminSearch(e.target.value)}
                  placeholder="Search registered users by email..."
                  className="w-full text-xs pl-8 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none font-bold text-slate-950 shadow-sm"
                />
                {adminSearch && (
                  <button
                    onClick={() => setAdminSearch('')}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-sm font-extrabold bg-transparent border-0"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Profiles List */}
              <div className="space-y-2.5 flex-1 pb-10">
                {adminLoading ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-2">
                    <div className="w-8 h-8 rounded-full border-3 border-orange-200 border-t-orange-500 animate-spin"></div>
                    <p className="text-[9px] uppercase tracking-widest font-extrabold text-orange-950 animate-pulse">Syncing Profiles Ledger...</p>
                  </div>
                ) : filteredAdminProfiles.length === 0 ? (
                  <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-slate-200 p-6 space-y-2">
                    <p className="text-xl">🔍</p>
                    <p className="text-xs font-bold text-slate-700">No matching merchants found</p>
                    <p className="text-[9px] text-slate-400 shrink-0 font-bold uppercase">Try adjusting your query or click Sync DB.</p>
                  </div>
                ) : (
                  filteredAdminProfiles.map((prof) => {
                    const expiry = prof.pro_until ? new Date(prof.pro_until) : null;
                    const isActive = expiry ? expiry > new Date() : false;
                    const rawPlan = prof.plan || 'free';
                    const planNormalized = typeof rawPlan === 'string' ? rawPlan.toLowerCase().trim() : 'free';
                    const planType = (isActive && (planNormalized === 'pro' || planNormalized === 'business')) ? planNormalized : 'free';
                    const isMutating = adminMutatingId === prof.user_id + '-pro' || adminMutatingId === prof.user_id + '-business';
                    
                    return (
                      <div key={prof.id || prof.user_id} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3 transition-all duration-200 hover:shadow-md">
                        <div className="flex items-start justify-between border-b border-slate-100 pb-2">
                          <div className="space-y-1 max-w-[70%]">
                            <h3 className="text-xs font-black text-slate-900 leading-tight">{prof.shop_name || 'My General Store'}</h3>
                            <p className="text-[10px] font-mono font-bold text-slate-500 truncate select-all">{prof.email || 'No email saved'}</p>
                          </div>
                          
                          {/* Plan Status Badge */}
                          <div className="flex flex-col items-end gap-1">
                            {planType === 'business' ? (
                              <span className="text-[8.5px] font-black uppercase bg-indigo-500 text-white px-2 py-0.5 rounded border border-indigo-400 select-none shadow-sm leading-none shrink-0">
                                BUSINESS
                              </span>
                            ) : planType === 'pro' ? (
                              <span className="text-[8.5px] font-black uppercase bg-emerald-500 text-white px-2 py-0.5 rounded border border-emerald-400 select-none shadow-sm leading-none shrink-0">
                                PRO
                              </span>
                            ) : (
                              <span className="text-[8.5px] font-black uppercase bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200 select-none leading-none shrink-0">
                                FREE
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Direct Metadata Fields */}
                        <div className="grid grid-cols-1 gap-1 text-[9.5px] font-medium text-slate-600 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 font-mono">
                          <p className="truncate"><span className="text-slate-400 font-bold uppercase text-[8px]">User ID:</span> {prof.user_id}</p>
                          <p className="truncate"><span className="text-slate-400 font-bold uppercase text-[8px]">Owner:</span> {prof.owner_name || 'N/A'}</p>
                          <p className="truncate"><span className="text-slate-400 font-bold uppercase text-[8px]">UPI ID:</span> {prof.upi_id || 'N/A'}</p>
                          <p><span className="text-slate-400 font-bold uppercase text-[8px]">Validity:</span> {isActive && expiry ? (
                            <span className="text-emerald-600 font-black">
                              PRO UNTIL: {expiry.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          ) : (
                            <span className="text-amber-600 font-black">EXPIRED / NOT ACTIVE</span>
                          )}</p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            disabled={isMutating}
                            onClick={() => handleUpgradeToPro(prof)}
                            className="flex-1 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer disabled:cursor-not-allowed text-center shadow-sm"
                          >
                            {adminMutatingId === prof.user_id + '-pro' ? 'Setting Pro...' : 'Set Pro'}
                          </button>

                          <button
                            type="button"
                            disabled={isMutating}
                            onClick={() => handleUpgradeToBusiness(prof)}
                            className="flex-1 py-1.5 bg-indigo-650 hover:bg-indigo-700 disabled:bg-indigo-350 text-white rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer disabled:cursor-not-allowed text-center shadow-sm"
                          >
                            {adminMutatingId === prof.user_id + '-business' ? 'Setting Biz...' : 'Set Business'}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  if (!user) {
    return (
      <div id="app-root" className={`min-h-screen bg-neutral-900 flex justify-center items-start overflow-x-hidden font-sans text-neutral-800 selection:bg-orange-500 selection:text-white pt-4 ${darkMode ? 'dark' : ''} transition-all duration-300`}>
        <div id="mobile-viewport" className="w-full max-w-md min-h-screen bg-[#FFFBF7] flex flex-col shadow-2xl relative border border-neutral-850/20 rounded-3xl overflow-hidden p-6 justify-between transition-all duration-300">
          
          {/* Top Status Accent */}
          <div className="bg-orange-500/10 text-[10px] tracking-wider text-orange-850 px-4 py-2.5 flex justify-between items-center font-mono font-bold select-none border-b border-orange-100/50 -mx-6 -mt-6">
            <span>INVOICEPE PORTALSECURE</span>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
              <span>SYSTEM LOGIN</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center py-6 space-y-6">
            {/* Branding Header */}
            <div className="text-center space-y-3">
              <div className="mx-auto w-14 h-14 bg-orange-500 rounded-xl flex items-center justify-center text-white font-black text-3xl shadow-lg shadow-orange-200/80">
                I
              </div>
              <div className="space-y-1 pt-1">
                <h1 className="text-2xl font-display font-black text-slate-900 tracking-tight leading-none">
                  Invoice<span className="text-orange-500">Pe</span>
                </h1>
                <p className="text-[9.5px] text-slate-400 font-extrabold uppercase tracking-widest leading-none mt-1">
                  India's Digital Vyapaar & Udhaar Ledger
                </p>
              </div>
            </div>

            {/* Custom notifications during auth */}
            <AnimatePresence>
              {notification && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-3 bg-neutral-950 text-white rounded-xl text-xs font-bold font-mono text-center flex items-center justify-center gap-2 shadow-md"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping"></span>
                  <span>{notification.message}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authMode === 'signup' && (
                <div className="space-y-1 animate-fadeIn">
                  <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block">Merchant Shop Name</label>
                  <input
                    type="text"
                    value={shopName}
                    onChange={(e) => {
                      setShopName(e.target.value);
                      setCustomShopInput(e.target.value);
                    }}
                    placeholder="e.g. Verma General Store"
                    required
                    className="w-full text-xs px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none font-bold text-slate-900 shadow-sm"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block">Email Address</label>
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="name@store.com"
                  required
                  className="w-full text-xs px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none font-bold text-slate-900 shadow-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block">Security Password</label>
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  required
                  minLength={6}
                  className="w-full text-xs px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none font-bold text-slate-900 shadow-sm"
                />
              </div>

              {authMode === 'signup' && (
                <div className="space-y-1 animate-fadeIn">
                  <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block">Have a referral code? Enter here (optional)</label>
                  <input
                    type="text"
                    value={enteredReferralCode}
                    onChange={(e) => setEnteredReferralCode(e.target.value.trim().toUpperCase())}
                    placeholder="e.g. RAMESH20"
                    className="w-full text-xs px-4 py-3 bg-white border border-slate-250 rounded-xl focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none font-bold text-slate-900 shadow-sm uppercase font-mono placeholder:font-sans placeholder:normal-case"
                  />
                </div>
              )}

              {/* Remember Me box & Help */}
              <div className="flex items-center justify-between pt-1 select-none">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-[10.5px] text-slate-500">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-orange-500 focus:ring-orange-500 w-3.5 h-3.5"
                  />
                  <span>Remember me</span>
                </label>
                {authMode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      window.location.hash = 'forgot-password-secret';
                      window.dispatchEvent(new Event('hashchange'));
                    }}
                    className="text-[10.5px] font-black text-orange-500 hover:underline cursor-pointer bg-transparent border-0"
                  >
                    Forgot Lock?
                  </button>
                )}
              </div>

              {/* Submit Error */}
              {authError && (
                <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl flex flex-col gap-1.5 text-[10.5px] font-bold text-red-700 leading-snug">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <span>{authError.split('💡')[0]}</span>
                  </div>
                  {authError.includes('💡') && (
                    <div className="mt-1 bg-amber-500/15 border border-amber-500/20 text-amber-900 rounded-lg p-2.5 font-bold space-y-1">
                      <p className="flex items-center gap-1 text-[9.5px] text-amber-850 uppercase tracking-widest font-extrabold">
                        <span>💡 Developer Solution</span>
                      </p>
                      <p className="text-[10px] text-slate-700 font-semibold leading-relaxed">
                        {authError.substring(authError.indexOf('💡') + 1).replace('TIP:', '').replace('Tip:', '').trim()}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Action Button */}
              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-extrabold text-xs shadow-md shadow-orange-100 uppercase tracking-widest transition-all cursor-pointer"
              >
                {authSubmitting ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                    <span>Processing Session...</span>
                  </>
                ) : (
                  <>
                    <span>{authMode === 'login' ? 'Proceed to Ledger Book' : 'Register Shop & Start Book'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Toggle Login vs SignUp option */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === 'login' ? 'signup' : 'login');
                  setAuthError(null);
                }}
                className="text-[11px] font-extrabold text-slate-500 hover:text-orange-600 transition-colors uppercase tracking-wider bg-transparent border-0 cursor-pointer"
              >
                {authMode === 'login' ? (
                  <>Don't have an account? <span className="text-orange-500 underline ml-1">Create Shop Signup</span></>
                ) : (
                  <>Already registered merchant? <span className="text-orange-500 underline ml-1">Log In Here</span></>
                )}
              </button>
            </div>

            {/* HOMEPAGE TRUST SECTION */}
            <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100 flex flex-col gap-2.5 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="text-sm">🇮🇳</span>
                <span className="text-xs font-black text-slate-800 tracking-tight">Made for Indian Businesses</span>
              </div>
              <div className="grid grid-cols-1 gap-2 text-[11px] text-slate-600 font-bold">
                <div className="flex items-center gap-2">
                  <span className="text-sm">🧾</span>
                  <span>Simple GST Billing</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">📲</span>
                  <span>WhatsApp Invoice Sharing</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">⚡</span>
                  <span>Fast & Easy to Use</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer lock and trust notation */}
          <div className="text-center py-4 border-t border-slate-100 text-[9px] text-slate-400 font-bold space-y-1 uppercase tracking-widest -mx-6 -mb-6 bg-slate-50">
            <p>🔒 AES-256 Bit Supabase Encrypted Ledger</p>
            <p>© 2026 InvoicePe App. All customer data saved securely.</p>
          </div>
        </div>
      </div>
    );
  }

  // Logged-in view starting
  return (
    <div id="app-root" className={`min-h-screen bg-neutral-900 flex justify-center items-start overflow-x-hidden font-sans text-neutral-800 selection:bg-orange-500 selection:text-white pt-4 ${darkMode ? 'dark' : ''} transition-all duration-300`}>
      
      {/* Container simulating high quality mobile dashboard centered on desktop, seamless on actual mobile */}
      <div id="mobile-viewport" className="w-full max-w-md min-h-screen bg-[#FFFBF7] flex flex-col shadow-2xl relative border border-neutral-850/20 rounded-3xl overflow-hidden transition-all duration-300">
        
        {/* Loading Spinner Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/75 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full border-4 border-orange-200 border-t-orange-500 animate-spin"></div>
            <p className="text-[11px] font-extrabold text-orange-950 animate-pulse tracking-widest uppercase">Syncing with Supabase...</p>
          </div>
        )}

        {/* TOP STATUS BAR ACCENT */}
        <div className="bg-orange-500/10 text-[10px] tracking-wider text-orange-850 px-4 py-2 flex justify-between items-center font-mono font-bold select-none border-b border-orange-100/50">
          <span>INVOICEPE DIGITAL LEDGER</span>
          <div className="flex items-center gap-1.5 flex-row">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>STORE SESSION ALIVE</span>
          </div>
        </div>

        {/* HEADER */}
        <header id="main-header" className="bg-white border-b border-orange-100 flex flex-col px-5 py-4 sticky top-0 z-30 shadow-sm flex-none">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-orange-500 rounded-lg flex items-center justify-center text-white font-black text-xl shadow-lg shadow-orange-200">
                I
              </div>
              <div>
                <h1 className="text-xl font-display font-extrabold text-slate-900 tracking-tight leading-none">
                  Invoice<span className="text-orange-500">Pe</span>
                </h1>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Vyapaar Book</p>
              </div>
            </div>

            {/* Shop context selector & Logout btn */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 text-right">
                <div 
                  onClick={() => {
                    setCustomShopInput(shopName);
                    setCustomUpiInput(upiId);
                    setCustomGstinInput(gstin);
                    setCustomOwnerInput(ownerName);
                    setCustomShopPhoneInput(shopPhone);
                    setCustomShopAddressInput(shopAddress);
                    setIsSettingsOpen(true);
                  }}
                  className="flex items-center gap-2 cursor-pointer group bg-orange-50/50 hover:bg-orange-50 px-2.5 py-1.5 rounded-xl border border-orange-100 transition-all select-none"
                  title="Vyapaar Settings & UPI Profile"
                >
                  <div className="text-right">
                    <p className="text-[7.5px] text-orange-600 font-extrabold uppercase tracking-widest leading-none">Settings</p>
                    <p className="font-extrabold text-[11px] text-slate-800 group-hover:text-orange-650 transition-colors truncate max-w-[100px] mt-0.5">{shopName}</p>
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center text-white font-black text-[9px] shrink-0 group-hover:scale-105 transition-all">
                    {(typeof shopName === 'string' ? shopName : 'Verma General Store').split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'SP'}
                  </div>
                </div>
              </div>


              {/* Header GST Report Button */}
              <button
                type="button"
                onClick={() => setIsGstReportOpen(true)}
                title="Generate Monthly GST Report"
                className="w-8 h-8 rounded-full bg-orange-50 hover:bg-orange-100 border border-orange-200 flex items-center justify-center text-orange-600 hover:text-orange-700 transition-colors cursor-pointer shrink-0"
              >
                <FileText className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>

              {/* Header Logout Button */}
              <button
                type="button"
                onClick={handleLogout}
                title="Log Out From Register"
                className="w-8 h-8 rounded-full bg-orange-50 hover:bg-orange-100 border border-orange-200 flex items-center justify-center text-orange-600 hover:text-orange-700 transition-colors cursor-pointer shrink-0"
              >
                <LogOut className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </header>

        {/* NAVIGATION TABS BAR */}
        <div id="navigation-tabs" className="bg-white border-b border-orange-100 flex items-center p-2 gap-1 flex-none select-none">
          <button
            type="button"
            onClick={() => setActiveView('dashboard')}
            className={`flex-1 py-2 text-center rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeView === 'dashboard'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-100'
                : 'text-slate-500 hover:text-slate-900 bg-transparent hover:bg-slate-50'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveView('customers')}
            className={`flex-1 py-2 text-center rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeView === 'customers'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-100'
                : 'text-slate-500 hover:text-slate-900 bg-transparent hover:bg-slate-50'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Customers ({customers.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveView('udhaar')}
            className={`flex-1 py-2 text-center rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeView === 'udhaar'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-100'
                : 'text-slate-500 hover:text-slate-900 bg-transparent hover:bg-slate-50'
            }`}
          >
            <Notebook className="w-3.5 h-3.5" />
            <span>Udhaar Bahi</span>
          </button>
        </div>

        {/* TOAST NOTIFICATION CONTAINER */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-26 left-4 right-4 z-50 pointer-events-none"
            >
              <div className={`p-3 rounded-xl shadow-lg border text-xs font-bold flex items-center gap-2.5 ${
                notification.type === 'success' 
                  ? 'bg-neutral-900 text-white border-neutral-800' 
                  : 'bg-orange-500 text-white border-orange-400'
              }`}>
                {notification.type === 'success' ? (
                  <CheckCircle2 className="w-4.5 h-4.5 text-orange-400 shrink-0" />
                ) : (
                  <Info className="w-4.5 h-4.5 text-white shrink-0" />
                )}
                <span>{notification.message}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MAIN BODY SCROLLABLE AREA */}
        <main className="flex-1 px-5 py-5 space-y-5 pb-28 overflow-y-auto">

        {supabaseError && (
          <div className="bg-red-50/50 border border-red-100 rounded-2xl p-5 space-y-4 shadow-sm text-center">
            <div className="bg-red-100 text-red-600 w-10 h-10 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-red-950">Supabase Table Sync Pending</h3>
              <p className="text-[10px] text-red-700 leading-normal font-medium">
                Please create these 3 tables in your Supabase project (SQL Editor).
              </p>
            </div>
            
            <pre className="bg-zinc-900 text-white text-[8px] rounded-xl p-3 text-left max-h-[140px] overflow-y-auto font-mono select-all select-text">
{`CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT 'No Mobile',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    gst_amount NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    quantity NUMERIC NOT NULL,
    rate NUMERIC NOT NULL,
    amount NUMERIC NOT NULL
);`}
            </pre>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fetchInvoicesFromSupabase()}
                className="flex-1 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 py-2 rounded-xl text-[10px] font-extrabold shadow-sm transition-colors cursor-pointer uppercase tracking-wider"
              >
                Retry Setup
              </button>
              <button
                type="button"
                onClick={handleSeedDatabase}
                className="flex-1 bg-orange-500 hover:bg-orange-650 text-white py-2 rounded-xl text-[10px] font-extrabold shadow-sm transition-colors cursor-pointer uppercase tracking-wider"
              >
                Seed Local DB
              </button>
            </div>
          </div>
        )}

        {activeView === 'dashboard' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="space-y-5"
          >
            {/* Welcome Message */}
            <section className="px-1 pt-1 flex-none flex flex-col gap-2">
              <div className="flex items-center gap-2 justify-between md:justify-start">
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-none">Namaste, {(typeof shopName === 'string' ? shopName : 'Verma General Store').split(' ')[0]}!</h2>
                {isPro && (
                  userPlan === 'business' ? (
                    <span className="text-[8.5px] tracking-wider font-extrabold uppercase bg-indigo-500 text-white px-2.5 py-1.5 rounded-full flex items-center gap-1 shadow-sm leading-none shrink-0 border border-indigo-400 font-mono">
                      <Gift className="w-2.5 h-2.5 shrink-0 animate-bounce" />
                      <span>BUSINESS ACTIVE {proUntil ? `until ${new Date(proUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Permanent'}</span>
                    </span>
                  ) : (
                    <span className="text-[8.5px] tracking-wider font-extrabold uppercase bg-emerald-500 text-white px-2.5 py-1.5 rounded-full flex items-center gap-1 shadow-sm leading-none shrink-0 border border-emerald-400 font-mono">
                      <Gift className="w-2.5 h-2.5 shrink-0 animate-bounce" />
                      <span>PRO ACTIVE {proUntil ? `until ${new Date(proUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Permanent'}</span>
                    </span>
                  )
                )}
              </div>
              <p className="text-slate-500 text-xs font-medium leading-none">Here is what's happening with your store today.</p>
            </section>

            {/* INVOICE USAGE COUNTER BAR */}
            <div className="bg-white border border-slate-100 rounded-2xl p-4.5 shadow-sm flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${isPro ? 'bg-emerald-500' : 'bg-orange-500'}`} />
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider font-mono">
                    {isPro ? 'Invoice Usage (Unlimited)' : 'Free Invoice Usage'}
                  </span>
                </div>
                {!isPro ? (
                  <span className="text-[10px] font-extrabold text-orange-600 bg-orange-50 px-2 py-1 rounded-md border border-orange-100 uppercase">Free Plan</span>
                ) : (
                  <span className="text-[10px] font-extrabold text-indigo-600 bg-indigo-55/10 px-2.5 py-1 rounded-md border border-indigo-100/50 uppercase font-mono">{userPlan === 'business' ? 'Business Plan' : 'Pro Plan'}</span>
                )}
              </div>
              
              <div className="space-y-1.5">
                <div className="relative pt-1">
                  <div className="overflow-hidden h-2.5 text-xs flex rounded-full bg-slate-100">
                    <div 
                      style={{ width: isPro ? '100%' : `${Math.min((invoices.length / 30) * 100, 100)}%` }} 
                      className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-500 rounded-full ${
                        isPro ? 'bg-gradient-to-r from-emerald-500 to-indigo-500' : invoices.length >= 27 ? 'bg-red-500 animate-pulse' : invoices.length >= 20 ? 'bg-orange-500' : 'bg-amber-500'
                      }`}
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center text-[11px] font-bold text-slate-500">
                  <span className="font-sans font-black text-slate-700">{isPro ? `${invoices.length} Invoices Created` : `${invoices.length} / 30 Free Invoices Used`}</span>
                  <span className="font-mono text-[10px]">{isPro ? 'Unlimited Invoices Unlocked' : '30 Bills Limit'}</span>
                </div>
              </div>

              {!isPro && (
                <button
                  type="button"
                  onClick={() => setShowLimitPopup(true)}
                  className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-[10px] tracking-wider py-2.5 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs active:scale-[0.99] uppercase font-sans"
                >
                  🚀 {invoices.length >= 30 ? 'Limit Reached • Upgrade to Continue' : 'Upgrade to PRO / BUSINESS for Unlimited Invoices'}
                </button>
              )}
            </div>

            {/* DYNAMIC METRICS CARDS */}
            <div className="grid grid-cols-2 gap-4" id="metrics-grid">
              
              {/* CARD 1: TOTAL SALES (Span 2 for emphasis as high level core metric) */}
              <div id="card-total-sales" className="col-span-2 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-2 relative overflow-hidden">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Total Sales Volume</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900 leading-none">₹{metrics.totalSales.toLocaleString('en-IN')}</span>
                  <span className="text-emerald-500 text-xs font-bold leading-none bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100/50">+12%</span>
                </div>
                <div className="mt-3.5 h-1 w-full bg-slate-50 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500" style={{ width: '75%' }}></div>
                </div>
                <div className="mt-1 flex justify-between items-center text-[10px] text-slate-400 font-semibold font-mono">
                  <span>{metrics.paidCount} Fully Received</span>
                  <span>•</span>
                  <span>{metrics.totalInvoicesCount} Issued Invoices</span>
                </div>
              </div>

              {/* CARD 2: PENDING PAYMENTS (FOCUSED HIGHLIGHTED HIGHDENSITY CARD) */}
              <div 
                id="card-pending-payments" 
                onClick={() => {
                  setActiveView('customers');
                  setCustomerFilter('pending');
                }}
                className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-2 ring-2 ring-orange-500 ring-offset-2 cursor-pointer hover:bg-orange-50/10 transition-colors"
              >
                <span className="text-[11px] font-bold text-orange-500 uppercase tracking-widest">Pending Payments</span>
                <div className="flex items-baseline justify-between gap-1 mt-0.5">
                  <span className="text-xl font-black text-slate-900 leading-none">₹{metrics.pendingPayments.toLocaleString('en-IN')}</span>
                  <span className="px-1.5 py-0.5 bg-red-100 text-red-600 rounded text-[9px] font-extrabold uppercase tracking-tight">High</span>
                </div>
                <p className="text-[9px] text-slate-400 font-bold mt-3.5 italic leading-tight uppercase tracking-wider">
                  {metrics.pendingCount} unpaid ledger
                </p>
              </div>

              {/* CARD 3: TOTAL INVOICES */}
              <div id="card-total-invoices" className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Total Invoices</span>
                <div className="flex items-baseline gap-1 justify-between mt-0.5">
                  <span className="text-2xl font-black text-slate-900 leading-none">{metrics.totalInvoicesCount}</span>
                  <span className="text-slate-400 text-[9px] font-extrabold uppercase tracking-widest leading-none">Book</span>
                </div>
                <div className="flex mt-3.5 gap-1 py-0.5 select-none">
                  <div className="h-1 flex-1 bg-emerald-400 rounded-full"></div>
                  <div className="h-1 flex-1 bg-emerald-400 rounded-full"></div>
                  <div className="h-1 flex-1 bg-orange-400 rounded-full"></div>
                  <div className="h-1 flex-1 bg-slate-100 rounded-full"></div>
                </div>
              </div>

            </div>

            {/* QUICK ACTIONS ROW */}
            <div className="grid grid-cols-4 gap-2" id="quick-actions-row">
              <button
                type="button"
                onClick={() => setIsFormOpen(true)}
                className="bg-orange-50 hover:bg-orange-100 text-orange-600 p-2 border border-orange-100 shadow-sm flex flex-col items-center gap-1.5 justify-center font-bold text-[10px] transition-all cursor-pointer rounded-xl"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>New Invoice</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveView('customers')}
                className="bg-slate-50 hover:bg-slate-100 text-slate-700 p-2 border border-slate-100 shadow-sm flex flex-col items-center gap-1.5 justify-center font-bold text-[10px] transition-all cursor-pointer rounded-xl"
              >
                <Users className="w-4 h-4 stroke-[2.5]" />
                <span>Customers</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveView('udhaar')}
                className="bg-red-50 hover:bg-red-100 text-red-650 p-2 border border-red-100 shadow-sm flex flex-col items-center gap-1.5 justify-center font-bold text-[10px] transition-all cursor-pointer rounded-xl"
              >
                <Notebook className="w-4 h-4 text-red-500 stroke-[2.5]" />
                <span className="text-red-650">Udhaar Book</span>
              </button>
              <button
                type="button"
                onClick={() => setIsGstReportOpen(true)}
                className="bg-orange-50 hover:bg-orange-100 text-orange-600 p-2 border border-orange-100 shadow-sm flex flex-col items-center gap-1.5 justify-center font-bold text-[10px] transition-all cursor-pointer rounded-xl"
              >
                <FileText className="w-4 h-4 text-orange-500 stroke-[2.5]" />
                <span>GST Report</span>
              </button>
            </div>

            {/* SEND DAILY SUMMARY LEDGER REPORT CARD */}
            <div 
              onClick={handleSendDailySummary}
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-650 hover:to-amber-650 p-4 rounded-xl shadow-sm cursor-pointer transition-all flex items-center justify-between group select-none relative overflow-hidden"
            >
              <div className="absolute -right-4 -bottom-4 opacity-10">
                <Share2 className="w-20 h-20 text-white stroke-[2.5]" />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform">
                  <Share2 className="w-4 h-4 text-white stroke-[2.5]" />
                </div>
                <div className="text-left font-sans">
                  <p className="text-[11px] font-black uppercase text-white tracking-widest flex items-center gap-1.5">
                    <span>Send Daily Summary</span>
                  </p>
                  <p className="text-[9.5px] text-orange-50/90 font-bold leading-tight mt-0.5">Share today's store performance overview on WhatsApp</p>
                </div>
              </div>
              <div className="flex items-center gap-1 bg-white/15 hover:bg-white/25 text-white px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all shrink-0">
                <span>Send WhatsApp</span>
                <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            {/* SEARCH & FILTERS CONTROLS */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by Name or Phone..."
                    className="w-full text-xs pl-9 pr-8 py-2.5 bg-[#FFFBF7] rounded-xl border border-slate-100/80 focus:ring-2 focus:ring-orange-500 focus:outline-none transition-all placeholder:text-slate-400 font-semibold text-slate-900"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="w-5 h-5 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Date range filter dropdown */}
                <div className="relative shrink-0 md:w-48">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={datePeriod}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setDatePeriod(val);
                      if (val !== 'Custom') {
                        setStartDate('');
                        setEndDate('');
                      }
                    }}
                    className="w-full text-xs pl-8 pr-8 py-2.5 bg-[#FFFBF7] rounded-xl border border-slate-100/80 focus:ring-2 focus:ring-orange-500 focus:outline-none transition-all font-semibold text-slate-700 appearance-none cursor-pointer"
                  >
                    <option value="All">All Time (हमेशा)</option>
                    <option value="Today">Today (आज)</option>
                    <option value="Yesterday">Yesterday (कल)</option>
                    <option value="Last7Days">Last 7 Days (7 दिन)</option>
                    <option value="ThisMonth">This Month (महीना)</option>
                    <option value="Custom">Custom Range 📅</option>
                  </select>
                  <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center text-slate-400">
                    <Filter className="w-3 h-3" />
                  </div>
                </div>
              </div>

              {/* Custom Date Inputs */}
              {datePeriod === 'Custom' && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-50">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wide mb-1">From Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-[#FFFBF7] rounded-xl border border-slate-150 focus:ring-2 focus:ring-orange-500 focus:outline-none font-semibold text-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wide mb-1">To Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-[#FFFBF7] rounded-xl border border-slate-150 focus:ring-2 focus:ring-orange-500 focus:outline-none font-semibold text-slate-700"
                    />
                  </div>
                </div>
              )}

              {/* Tab states */}
              <div className="flex bg-[#FFFBF7] border border-slate-100/70 p-1.5 rounded-xl text-[11px] font-extrabold text-slate-500">
                {(['All', 'Paid', 'Pending'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setStatusFilter(tab)}
                    className={`flex-1 py-1.5 text-center rounded-lg transition-all cursor-pointer font-bold ${
                      statusFilter === tab 
                        ? 'bg-white text-orange-600 shadow-sm border border-orange-100/30' 
                        : 'hover:text-slate-950'
                    }`}
                  >
                    {tab === 'All' ? 'All Invoices' : tab === 'Paid' ? 'Paid (नकद)' : 'Pending (उधार)'}
                  </button>
                ))}
              </div>
            </div>

            {/* SUB-SECTION HEADER */}
            <div className="flex justify-between items-center px-1">
              <h2 className="text-xs font-bold text-slate-700 tracking-wider uppercase flex items-center gap-1.5 mb-0.5">
                <span>Invoice Ledger</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-full font-mono font-bold">
                  {filteredInvoices.length}
                </span>
              </h2>
              <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Tap to view Receipt</span>
            </div>

            {/* RECENT INVOICES MAIN CONTAINER TABLE */}
            <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between bg-slate-50/50 flex-none">
                <h3 className="font-bold text-slate-900 uppercase tracking-dense text-[11px]">Ledger Sheet</h3>
                <span className="text-[9px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-md font-bold uppercase tracking-widest">Active</span>
              </div>
              
              <div className="divide-y divide-slate-50" id="invoices-ledger">
                {filteredInvoices.length === 0 ? (
                  <div className="text-center py-12 bg-white flex flex-col items-center justify-center p-6 space-y-2">
                    <AlertCircle className="w-8 h-8 text-slate-300 animate-bounce" />
                    <p className="text-xs text-slate-500 font-semibold">No records match filters.</p>
                    <button 
                      type="button"
                      onClick={() => { setSearchQuery(''); setStatusFilter('All'); }}
                      className="text-[11px] text-orange-600 font-black tracking-wider uppercase hover:underline cursor-pointer"
                    >
                      Reset filters
                    </button>
                  </div>
                ) : (
                  filteredInvoices.map((inv) => (
                    <div
                      key={inv.id}
                      onClick={() => setSelectedReceipt(inv)}
                      className="px-4.5 py-3.5 hover:bg-orange-50/20 active:bg-orange-50/40 transition-all cursor-pointer flex justify-between items-center"
                    >
                      <div className="space-y-1 min-w-[70%]">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {inv.invoiceNo}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold">
                            {inv.date}
                          </span>
                        </div>

                        <h4 className="font-bold text-sm text-slate-900 tracking-tight leading-none pt-0.5 truncate">
                          {inv.customerName}
                        </h4>

                        <p className="text-[10.5px] text-slate-400 truncate">
                          {inv.items.map(i => `${i.name} x${i.quantity}`).join(', ')}
                        </p>

                        <div className="flex gap-2 text-[10px] pt-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleWhatsAppShare(inv);
                            }}
                            className="flex items-center gap-1 font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                          >
                            <Share2 className="w-3 h-3 text-emerald-500" />
                            <span>WhatsApp</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleInvoiceStatus(inv.id);
                            }}
                            className={`flex items-center gap-1 font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                              inv.status === 'Paid' 
                                ? 'text-orange-705 bg-orange-50 hover:bg-orange-100/85' 
                                : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100/85'
                            }`}
                          >
                            {inv.status === 'Paid' ? 'Mark Overdue' : 'Mark Paid'}
                          </button>
                        </div>
                      </div>

                      <div className="text-right flex flex-col justify-between items-end space-y-2.5">
                        <div className="text-xs font-black text-slate-900 font-mono">
                          ₹{inv.totalAmount.toLocaleString('en-IN')}
                        </div>

                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider leading-none select-none ${
                          inv.status === 'Paid' 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-orange-100 text-orange-755'
                        }`}>
                          {inv.status === 'Paid' ? 'PAID' : 'PENDING'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </motion.div>
        )}

        {activeView === 'customers' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="space-y-5"
          >
            {/* Customer Header */}
            <section className="px-1 pt-1 flex-none flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-none">Customers Ledger</h2>
                <p className="text-slate-500 text-xs mt-1.5 font-medium leading-none">Track individual books and send reminders.</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveView('dashboard')}
                className="p-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            </section>

            {/* CUSTOMER SEARCH & FILTER CONTROLS */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  placeholder="Search Grahak by name, phone, or email... / ईमेल से खोजें"
                  className="w-full text-xs pl-9 pr-8 py-2.5 bg-[#FFFBF7] rounded-xl border border-slate-100/80 focus:ring-2 focus:ring-orange-500 focus:outline-none transition-all placeholder:text-slate-400 font-semibold text-slate-900"
                />
                {customerSearchQuery && (
                  <button 
                    onClick={() => setCustomerSearchQuery('')}
                    className="w-5 h-5 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Customer Filter Tabs */}
              <div className="flex bg-[#FFFBF7] border border-slate-100/70 p-1.5 rounded-xl text-[11px] font-extrabold text-slate-500">
                {([
                  { key: 'all', label: 'All Grahaks' },
                  { key: 'pending', label: 'Owed Only (उधार)' },
                  { key: 'paid', label: 'Fully Settled (नकद)' }
                ] as const).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setCustomerFilter(tab.key)}
                    className={`flex-1 py-1.5 text-center rounded-lg transition-all cursor-pointer font-bold ${
                      customerFilter === tab.key 
                        ? 'bg-white text-orange-600 shadow-sm border border-orange-100/30' 
                        : 'hover:text-slate-950'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* CUSTOMERS CARDS LIST */}
            <div className="space-y-3 prose" id="customers-list">
              {filteredCustomers.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center p-6 space-y-2">
                  <AlertCircle className="w-8 h-8 text-slate-300" />
                  <p className="text-xs text-slate-500 font-semibold">No customers match filters.</p>
                  <button 
                    type="button"
                    onClick={() => { setCustomerSearchQuery(''); setCustomerFilter('all'); }}
                    className="text-[11px] text-orange-600 font-black tracking-wider uppercase hover:underline cursor-pointer"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                filteredCustomers.map((cust) => (
                  <div
                    key={cust.name}
                    onClick={() => setSelectedCustomerForHistory(cust)}
                    className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center hover:border-orange-200 transition-all cursor-pointer active:scale-[0.99]"
                  >
                    <div className="space-y-1.5 max-w-[65%]">
                      <h3 className="font-bold text-sm text-slate-900 leading-tight tracking-tight truncate">
                        {cust.name}
                      </h3>
                      <p className="text-[10px] text-slate-400 font-mono font-bold flex items-center gap-1 leading-none">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {cust.phone && cust.phone !== 'No Mobile' ? `+91 ${cust.phone}` : 'No Mobile'}
                      </p>
                      <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wide">
                        {cust.invoices.length} {cust.invoices.length === 1 ? 'Bill' : 'Bills'} Issued
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Owed Balance</p>
                        <p className={`text-base font-black font-mono mt-1 ${cust.pendingAmount > 0 ? 'text-red-500 animate-pulse' : 'text-emerald-600'}`}>
                          ₹{cust.pendingAmount.toLocaleString('en-IN')}
                        </p>
                        <p className="text-[9px] font-bold mt-0.5 leading-none uppercase tracking-widest">
                          {cust.pendingAmount > 0 ? 'Udhaar pending' : 'Settle / Paid'}
                        </p>
                      </div>

                      {/* Small WhatsApp Reminder Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSendReminder(cust);
                        }}
                        disabled={cust.pendingAmount <= 0}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                          cust.pendingAmount > 0 
                            ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 active:scale-90 cursor-pointer' 
                            : 'bg-slate-100 text-slate-300 cursor-not-allowed pointer-events-none'
                        }`}
                        title={cust.pendingAmount > 0 ? "Send Payment Reminder" : "No Pending Balance"}
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {activeView === 'udhaar' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="space-y-5"
          >
            {/* Udhaar Welcome Details and Metrics */}
            <section className="px-1 pt-1 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-none text-orange-650">उधार बही (Udhaar Book)</h2>
                <p className="text-slate-500 text-xs mt-1.5 font-medium leading-none">Hisab-Kitab easily managed digitally on InvoicePe.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsUdhaarFormOpen(true)}
                className="bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs uppercase tracking-wider px-3.5 py-2.5 rounded-xl shadow-md cursor-pointer flex items-center gap-1 active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>नया उधार (New Udhaar)</span>
              </button>
            </section>

            {/* Loader & Error handler */}
            {udhaarLoading ? (
              <div className="flex items-center justify-center py-20 bg-white rounded-2xl border border-slate-150 shadow-xs">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs text-slate-500 font-semibold font-sans">उधार बही ख़ाता लोड हो रहा है...<br/><span className="text-[10px] font-normal text-slate-400">Loading your secure ledger from Supabase</span></p>
                </div>
              </div>
            ) : udhaarError ? (
              <div className="p-5 bg-red-50 border border-red-100 rounded-2xl text-xs flex flex-col gap-2 font-sans">
                <span className="font-extrabold text-red-750 text-sm">त्रुटि (An error occurred loading Udhaar Book)</span>
                <p className="text-slate-600 font-medium">{udhaarError}</p>
                <button
                  type="button"
                  onClick={() => fetchUdhaar(true)}
                  className="mt-1 text-xs bg-red-650 text-white px-4 py-2 rounded-xl font-bold self-start cursor-pointer hover:bg-red-700 transition"
                >
                  पुनः प्रयास करें (Retry)
                </button>
              </div>
            ) : (
              <>
                {/* Total Udhaar Amount Card in big red text */}
            {(() => {
              const pendingUdhaarTotal = udhaars
                .filter(item => item.status === 'Unpaid')
                .reduce((total, item) => total + item.amount, 0);

              return (
                <div className="bg-red-50 border border-red-100 p-5 rounded-2xl shadow-sm flex flex-col gap-1.5 relative overflow-hidden">
                  <div className="absolute right-4 top-4 text-red-100">
                    <Notebook className="w-16 h-16 stroke-[1.5]" />
                  </div>
                  <span className="text-[11px] font-bold text-red-600 uppercase tracking-widest block font-sans">कुल बाकी रकम (Total Udhaar Baaki)</span>
                  <p className="text-3xl font-black text-red-600 font-mono leading-none">
                    ₹{pendingUdhaarTotal.toLocaleString('en-IN')}
                  </p>
                  <div className="mt-2.5 flex justify-between items-center text-[10px] text-red-750 font-semibold font-mono">
                    <span>{udhaars.filter(item => item.status === 'Unpaid').length} Owed Accounts</span>
                    <span>•</span>
                    <span>उधार बही बहीखाता (Ledger)</span>
                  </div>
                </div>
              );
            })()}

            {/* List of People Who Owe Money */}
            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <h2 className="text-xs font-bold text-slate-705 tracking-wider uppercase flex items-center gap-1.5 leading-none">
                  <span>Active Udhaar (बाकी सूचि)</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded-full font-mono font-bold">
                    {udhaars.filter(item => item.status === 'Unpaid').length}
                  </span>
                </h2>
              </div>

              {udhaars.filter(item => item.status === 'Unpaid').length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center p-6 space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-550" />
                  <p className="text-xs text-slate-500 font-semibold font-sans">Sabb paid hai! Koi udhaar baaki nahi hai. 👍</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {udhaars
                    .filter(item => item.status === 'Unpaid')
                    .map((item) => (
                      <div
                        key={item.id}
                        className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between gap-3 hover:border-red-250 transition-all font-sans"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-extrabold text-sm text-slate-900 leading-tight">
                              {item.customer_name}
                            </h3>
                            <span className="text-[7.5px] bg-red-100 text-red-705 px-1.5 py-0.5 rounded font-extrabold uppercase tracking-widest leading-none">
                              DUE / बाकि
                            </span>
                          </div>
                          
                          {item.phone && item.phone !== 'No Mobile' && (
                            <p className="text-[10px] text-slate-400 font-mono font-bold flex items-center gap-1 leading-none">
                              <Phone className="w-3 h-3 text-slate-400" />
                              +91 {item.phone}
                            </p>
                          )}
                          
                          {item.note && (
                            <p className="text-xs text-slate-500 italic bg-slate-50 border border-slate-100 p-2 rounded-lg my-1 block">
                              "{item.note}"
                            </p>
                          )}
                          
                          <p className="text-[9.5px] text-slate-450 font-semibold font-mono">
                            Date: {new Date(item.created_at).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </p>
                        </div>

                        <div className="flex items-center justify-between gap-3.5 pt-2 border-t border-slate-100">
                          <div>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block leading-none font-sans">Baaki Rakam</span>
                            <span className="text-base font-black font-mono text-red-650 block">
                              ₹{item.amount.toLocaleString('en-IN')}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* WhatsApp Reminder Button */}
                            <button
                              type="button"
                              onClick={() => handleSendUdhaarReminder(item)}
                              className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 p-2 rounded-xl transition-all active:scale-90 cursor-pointer flex items-center gap-1 text-[10.5px] font-extrabold"
                              title="Send WhatsApp Reminder"
                            >
                              <Share2 className="w-3.5 h-3.5 text-emerald-500" />
                              <span>Remind</span>
                            </button>

                            {/* Mark as Paid button */}
                            <button
                              type="button"
                              onClick={() => handleMarkUdhaarAsPaid(item.id, item.customer_name, item.amount)}
                              className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-[10.5px] px-3 py-2 rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Paid किया</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Paid Udhaar History Section at bottom */}
            <div className="space-y-3 pt-4">
              <div className="flex justify-between items-center px-1">
                <h2 className="text-xs font-bold text-slate-400 tracking-wider uppercase flex items-center gap-1.5 font-sans leading-none">
                  <span>Paid History (चुकाए गए खातों का इतिहास)</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-full font-mono font-bold">
                    {udhaars.filter(item => item.status === 'Paid').length}
                  </span>
                </h2>
              </div>

              {udhaars.filter(item => item.status === 'Paid').length === 0 ? (
                <div className="text-center py-8 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 text-xs font-semibold font-sans">
                  इतिहास खाली है (Paid account history is empty).
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-150 rounded-2xl overflow-hidden bg-white shadow-xs">
                  {udhaars
                    .filter(item => item.status === 'Paid')
                    .map((item) => (
                      <div
                        key={item.id}
                        className="p-4 flex justify-between items-center bg-zinc-50/40 relative font-sans"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-bold text-slate-700 text-xs truncate">
                              {item.customer_name}
                            </h4>
                            <span className="text-[7.5px] bg-emerald-100 text-emerald-850 px-1.5 py-0.5 rounded font-extrabold tracking-widest leading-none">
                              PAID / चुकता
                            </span>
                          </div>
                          
                          {item.note && (
                            <p className="text-[11px] text-slate-450 truncate max-w-[180px]">
                              "{item.note}"
                            </p>
                          )}
                          
                          <p className="text-[9px] text-slate-400 font-mono font-bold leading-none">
                            Received: {new Date(item.created_at).toLocaleDateString('en-IN')}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Settle Amount</p>
                          <p className="text-sm font-black text-slate-450 font-mono line-through">
                            ₹{item.amount.toLocaleString('en-IN')}
                          </p>
                          <span className="text-[8px] text-emerald-600 font-bold block bg-emerald-50 border border-emerald-100 rounded px-1 mt-0.5">
                            Settle Completed
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
              </>
            )}
          </motion.div>
        )}

      </main>

        {/* BOTTOM ACTION BAR (Big Orange CTA saying "Create New Invoice") */}
        <footer className="p-5 bg-white border-t border-orange-100 sticky bottom-0 left-0 right-0 z-40 flex-none shadow-md">
          <button
            type="button"
            id="create-invoice-button"
            onClick={() => {
              if (!isPro && invoices.length >= 30) {
                setShowLimitPopup(true);
                showToast('Free plan limit reached. Upgrade to continue.', 'info');
              } else {
                setIsFormOpen(true);
              }
            }}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4.5 rounded-2xl font-black text-xs shadow-xl shadow-orange-200 transition-all flex items-center justify-center gap-3 active:scale-[0.98] cursor-pointer tracking-widest uppercase"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>CREATE NEW INVOICE</span>
          </button>
        </footer>

        {/* DIALOG FOR MERCHANT SETTINGS & UPI */}
        <AnimatePresence>
          {isSettingsOpen && (
            <>
              {/* Backplate backdrop overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSettingsOpen(false)}
                className="absolute inset-0 bg-neutral-950 z-50 cursor-pointer"
              />

              {/* Form container drawer panel slide-up */}
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className="absolute left-0 right-0 bottom-0 max-h-[85vh] bg-white rounded-t-3xl shadow-2xl z-50 overflow-y-auto flex flex-col border-t border-orange-100"
              >
                {/* Header of Drawer */}
                <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10 font-sans">
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wide flex items-center gap-1.5 text-orange-600">
                      <QrCode className="w-4 h-4 text-orange-500 animate-pulse" />
                      <span>व्यापार सेटिंग्स (Merchant Settings)</span>
                    </h3>
                    <p className="text-[10px] text-neutral-500 mt-0.5">Configure your shop/store details & UPI address</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(false)}
                    className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Form main context */}
                <form onSubmit={handleSaveSettings} className="p-5 space-y-4 flex-1 pb-10 font-sans">

                  {/* Admin Panel Entry Link */}
                  {user?.email === 'chanchaltailor404@gmail.com' && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsSettingsOpen(false);
                        window.history.pushState({}, '', '/admin-invoicepe-secret');
                        window.dispatchEvent(new Event('popstate'));
                      }}
                      className="w-full p-4 bg-slate-900 hover:bg-slate-950 text-white rounded-xl flex items-center justify-between text-xs font-black tracking-wider uppercase leading-none cursor-pointer transition-all border border-slate-800 shadow-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>🔒 Open Admin Control Hub</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 stroke-[3]" />
                    </button>
                  )}

                  {/* Subscription Plan Status Card */}
                  <div className={`p-4 rounded-xl border ${isPro ? (userPlan === 'business' ? 'bg-indigo-50/30 border-indigo-100 text-indigo-950' : 'bg-emerald-50/30 border-emerald-100 text-emerald-950') : 'bg-orange-55/10 border-orange-100 text-orange-950'} flex items-center justify-between`}>
                    <div className="space-y-0.5">
                      <p className="text-[9.5px] uppercase tracking-wider font-extrabold text-slate-400">Subscription Plan</p>
                      {isPro ? (
                        userPlan === 'business' ? (
                          <p className="text-xs font-black text-indigo-600 flex items-center gap-1.5 font-mono">
                            <span className="w-2 h-2 rounded-full bg-indigo-550 animate-pulse" />
                            <span>Business Status: Active until {proUntil ? new Date(proUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</span>
                          </p>
                        ) : (
                          <p className="text-xs font-black text-emerald-600 flex items-center gap-1.5 font-mono">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Pro Status: Active until {proUntil ? new Date(proUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</span>
                          </p>
                        )
                      ) : (
                        <p className="text-xs font-black text-orange-650 flex flex-col gap-1 font-mono">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                            <span>Free Plan</span>
                          </span>
                          <span className="text-[10px] text-slate-500 font-bold ml-3.5">
                            Usage: {invoices.length} of 30 bills issued
                          </span>
                        </p>
                      )}
                    </div>
                    {isPro ? (
                      userPlan === 'business' ? (
                        <span className="text-[10px] font-black uppercase bg-indigo-500 text-white px-2.5 py-1.5 rounded-xl border border-indigo-400 shadow-sm leading-none shrink-0 font-mono">
                          BUSINESS
                        </span>
                      ) : (
                        <span className="text-[10px] font-black uppercase bg-emerald-500 text-white px-2.5 py-1.5 rounded-xl border border-emerald-400 shadow-sm leading-none shrink-0 font-mono">
                          PRO
                        </span>
                      )
                    ) : (
                      <span className="text-[10px] font-black uppercase bg-orange-500 text-white px-2.5 py-1.5 rounded-xl border border-orange-400 shadow-sm leading-none shrink-0 font-mono">
                        FREE
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-4 bg-orange-50/20 p-4 rounded-xl border border-orange-100">
                    <h4 className="text-[11px] font-bold text-orange-850 uppercase tracking-widest flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5 text-orange-500" />
                      <span>व्यापार प्रोफाइल (Vyapaar Profile)</span>
                    </h4>

                    {/* Shop Name input */}
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-600 mb-1">दुकान / व्यापार का नाम (Vyapaar Name) *</label>
                      <input
                        type="text"
                        required
                        value={customShopInput}
                        onChange={(e) => setCustomShopInput(e.target.value)}
                        placeholder="जैसे: Verma General Store"
                        className="w-full text-xs px-3 py-2.5 bg-white rounded-xl border border-slate-250 focus:ring-2 focus:ring-orange-500 focus:outline-none transition-all placeholder:text-slate-400 font-semibold text-slate-800"
                      />
                    </div>

                    {/* Owner Name input */}
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-600 mb-1">मालिक का नाम (Owner Name)</label>
                      <input
                        type="text"
                        value={customOwnerInput}
                        onChange={(e) => setCustomOwnerInput(e.target.value)}
                        placeholder="जैसे: Ramesh Verma"
                        className="w-full text-xs px-3 py-2.5 bg-white rounded-xl border border-slate-250 focus:ring-2 focus:ring-orange-500 focus:outline-none transition-all placeholder:text-slate-400 font-semibold text-slate-800"
                      />
                    </div>

                    {/* Phone input */}
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-600 mb-1">फ़ोन नंबर (Shop Phone)</label>
                      <input
                        type="text"
                        value={customShopPhoneInput}
                        onChange={(e) => setCustomShopPhoneInput(e.target.value)}
                        placeholder="जैसे: 9876543210"
                        className="w-full text-xs px-3 py-2.5 bg-white rounded-xl border border-slate-250 focus:ring-2 focus:ring-orange-500 focus:outline-none transition-all placeholder:text-slate-400 font-semibold text-slate-800"
                      />
                    </div>

                    {/* Address input */}
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-600 mb-1">पता (Shop Address)</label>
                      <textarea
                        value={customShopAddressInput}
                        onChange={(e) => setCustomShopAddressInput(e.target.value)}
                        placeholder="जैसे: Shop No. 12, Main Market, New Delhi"
                        rows={2}
                        className="w-full text-xs px-3 py-2.5 bg-white rounded-xl border border-slate-250 focus:ring-2 focus:ring-orange-500 focus:outline-none transition-all placeholder:text-slate-400 font-semibold text-slate-800 resize-none"
                      />
                    </div>

                    {/* GSTIN input */}
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                        GSTIN (GST नंबर - वैकल्पिक) 
                        <span className="text-[9px] text-slate-400 font-normal ml-1">(जैसे 07AAAAA1111A1Z1)</span>
                      </label>
                      <input
                        type="text"
                        value={customGstinInput}
                        onChange={(e) => setCustomGstinInput(e.target.value.toUpperCase())}
                        placeholder="GSTIN नंबर दर्ज करें"
                        maxLength={15}
                        className="w-full text-xs px-3 py-2.5 bg-white rounded-xl border border-slate-250 focus:ring-2 focus:ring-orange-500 focus:outline-none transition-all placeholder:text-slate-400 font-semibold tracking-wider text-slate-850 uppercase font-mono"
                      />
                    </div>

                    {/* UPI ID input */}
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                        UPI ID (Optional / वैकल्पिक)
                        <span className="text-[9px] text-slate-400 font-normal ml-1">(जैसे shopname@upi, 9876543210@paytm)</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">
                          <QrCode className="w-3.5 h-3.5 text-orange-500" />
                        </span>
                        <input
                          type="text"
                          value={customUpiInput}
                          onChange={(e) => setCustomUpiInput(e.target.value.trim())}
                          placeholder="जैसे: merchant@upi (Optional)"
                          className="w-full text-xs pl-9 pr-3 py-2.5 bg-white rounded-xl border border-slate-250 focus:ring-2 focus:ring-orange-500 focus:outline-none transition-all placeholder:text-slate-400 font-mono font-bold text-slate-850"
                        />
                      </div>
                      <p className="text-[9.5px] text-orange-700 mt-2 leading-normal font-bold">
                        💡 Optional — only fill if you want customers to pay via UPI
                      </p>
                    </div>
                  </div>

                  {/* REFERRAL SYSTEM SECTION (इनवाइट और कमाएं) */}
                  <div className="space-y-4 bg-orange-500/5 p-4 rounded-xl border border-orange-200/50">
                    <div className="text-center space-y-1">
                      <h4 className="text-sm font-black text-slate-900 tracking-tight flex items-center justify-center gap-1.5">
                        <Gift className="w-4 h-4 text-orange-500 animate-bounce shrink-0" />
                        <span>Invite Friends • Get 1 Month Pro</span>
                      </h4>
                      <p className="text-xs font-semibold text-slate-500">
                        Share your referral code and unlock rewards
                      </p>
                    </div>

                    {/* Big Orange referral code */}
                    <div className="text-center bg-white p-4.5 rounded-xl border border-orange-100 shadow-xs space-y-2">
                      <p className="text-[10px] text-slate-450 font-extrabold uppercase tracking-wider">Your Referral Code</p>
                      <p className="text-3xl font-black text-orange-500 tracking-widest select-all font-sans">
                        {referralCode && referralCode !== 'RAMESH20' ? referralCode : (user ? generateReferralCode(user) : 'RAMESH20')}
                      </p>
                      <p className="text-[10.5px] text-slate-500 font-bold leading-relaxed">
                        Earn <span className="text-orange-500 font-extrabold">1 month absolute free Pro status</span> for both you and your friend on every shop register!
                      </p>
                    </div>

                    {/* Stats counters */}
                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div className="bg-white/80 p-3 rounded-xl border border-orange-100 shadow-2xs">
                        <p className="text-[9px] text-slate-450 font-bold uppercase tracking-wider leading-none mb-1.5">Total Referrals</p>
                        <p className="text-lg font-black text-slate-800 font-sans">{totalReferrals}</p>
                      </div>
                      <div className="bg-white/80 p-3 rounded-xl border border-orange-100 shadow-2xs">
                        <p className="text-[9px] text-slate-450 font-bold uppercase tracking-wider leading-none mb-1.5">Free Months</p>
                        <p className="text-lg font-black text-orange-600 font-sans">{freeMonths}</p>
                      </div>
                    </div>

                    {/* Share Referral button */}
                    <button
                      type="button"
                      onClick={() => {
                        const codeText = referralCode && referralCode !== 'RAMESH20' ? referralCode : (user ? generateReferralCode(user) : 'RAMESH20');
                        const shareMsg = `🧾 Dukaan ki billing ab easy!

InvoicePe se:
✅ GST invoices banao
✅ WhatsApp pe instantly share karo
✅ Udhaar track karo
✅ Reports & PDF export

⚡ First 30 invoices FREE

👉 https://invoicepe.co.in

🎁 Referral Code: ${codeText}`;
                        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareMsg)}`, '_blank');
                      }}
                      className="w-full bg-orange-500 hover:bg-orange-600 active:scale-95 text-white py-3 border border-orange-400/20 rounded-xl font-black text-[11px] transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs uppercase tracking-wider"
                    >
                      <Share2 className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Share via WhatsApp</span>
                    </button>
                  </div>

                  {/* SECURITY SETTINGS / PASSWORD UPDATE */}
                  <div className="space-y-4 bg-slate-900 text-white p-4 rounded-xl border border-slate-800">
                    <h4 className="text-[11px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
                      <span>Security & Password (खाता सुरक्षा)</span>
                    </h4>

                    {settingsPassError && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-200 text-xs font-bold rounded-lg leading-snug">
                        ⚠️ {settingsPassError}
                      </div>
                    )}

                    {settingsPassSuccess && (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-bold rounded-lg leading-snug">
                        ✨ {settingsPassSuccess}
                      </div>
                    )}

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">नया पासवर्ड (New Password)</label>
                        <input
                          type="password"
                          value={settingsNewPassword}
                          onChange={(e) => setSettingsNewPassword(e.target.value)}
                          placeholder="Min 6 characters"
                          className="w-full text-xs px-3 py-2.5 bg-slate-800 border border-slate-750 rounded-xl focus:border-orange-500 focus:outline-none transition-all placeholder:text-slate-500 font-semibold text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">पासवर्ड की पुष्टि करें (Confirm Password)</label>
                        <input
                          type="password"
                          value={settingsConfirmPassword}
                          onChange={(e) => setSettingsConfirmPassword(e.target.value)}
                          placeholder="Min 6 characters"
                          className="w-full text-xs px-3 py-2.5 bg-slate-800 border border-slate-750 rounded-xl focus:border-orange-500 focus:outline-none transition-all placeholder:text-slate-500 font-semibold text-white"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleChangePasswordInSettings}
                        disabled={settingsPassSubmitting}
                        className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-slate-750 text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        {settingsPassSubmitting ? (
                          <>
                            <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                            <span>Updating Password...</span>
                          </>
                        ) : (
                          <>
                            <Key className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Change Password (पासवर्ड बदलें)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full bg-orange-500 hover:bg-orange-600 py-3.5 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md active:scale-[0.98]"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>सेटिंग्स सुरक्षित करें / SAVE SETTINGS</span>
                    </button>
                  </div>

                </form>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* DIALOG FOR MONTHLY GST REPORT */}
        <AnimatePresence>
          {isGstReportOpen && (
            <>
              {/* Backplate backdrop overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsGstReportOpen(false)}
                className="absolute inset-0 bg-neutral-950 z-50 cursor-pointer"
              />

              {/* Form container drawer panel slide-up */}
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className="absolute left-0 right-0 bottom-0 max-h-[80vh] bg-white rounded-t-3xl shadow-2xl z-50 overflow-y-auto flex flex-col border-t border-orange-100"
              >
                {/* Header of Drawer */}
                <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10 font-sans">
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wide flex items-center gap-1.5 text-orange-600">
                      <FileText className="w-4 h-4 text-orange-500 animate-pulse" />
                      <span>मासिक जीएसटी रिपोर्ट (GST Sales Report)</span>
                    </h3>
                    <p className="text-[10px] text-neutral-500 mt-0.5">Select month & year to fetch invoices and export PDF</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsGstReportOpen(false)}
                    className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Form main context */}
                <div className="p-5 space-y-4 flex-1 pb-10 font-sans">
                  <div className="bg-orange-50/20 p-4 rounded-xl border border-orange-100 space-y-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-orange-500" />
                      <span className="text-xs font-bold text-slate-800">Select Audit Period</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Month Selector */}
                      <div>
                        <label className="block text-[11px] font-semibold text-neutral-600 mb-1">महीना (Month)</label>
                        <select
                          value={selectedReportMonth}
                          onChange={(e) => setSelectedReportMonth(Number(e.target.value))}
                          className="w-full text-xs px-3 py-2.5 bg-white rounded-xl border border-slate-250 focus:ring-2 focus:ring-orange-500 focus:outline-none transition-all font-bold text-slate-800 cursor-pointer"
                        >
                          <option value={1}>January (जनवरी)</option>
                          <option value={2}>February (फरवरी)</option>
                          <option value={3}>March (मार्च)</option>
                          <option value={4}>April (अप्रैल)</option>
                          <option value={5}>May (मई)</option>
                          <option value={6}>June (जून)</option>
                          <option value={7}>July (जुलाई)</option>
                          <option value={8}>August (अगस्त)</option>
                          <option value={9}>September (सितंबर)</option>
                          <option value={10}>October (अक्टूबर)</option>
                          <option value={11}>November (नवंबर)</option>
                          <option value={12}>December (दिसंबर)</option>
                        </select>
                      </div>

                      {/* Year Selector */}
                      <div>
                        <label className="block text-[11px] font-semibold text-neutral-600 mb-1">साल (Year)</label>
                        <select
                          value={selectedReportYear}
                          onChange={(e) => setSelectedReportYear(Number(e.target.value))}
                          className="w-full text-xs px-3 py-2.5 bg-white rounded-xl border border-slate-250 focus:ring-2 focus:ring-orange-500 focus:outline-none transition-all font-bold text-slate-800 cursor-pointer"
                        >
                          <option value={2024}>2024</option>
                          <option value={2025}>2025</option>
                          <option value={2026}>2026</option>
                          <option value={2027}>2027</option>
                        </select>
                      </div>
                    </div>

                    {/* Meta info of total current invoices matched */}
                    <div className="bg-white p-3 rounded-xl border border-orange-100 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Invoices found</span>
                      <span className="font-mono font-extrabold text-sm text-order-650 bg-orange-50 px-2.5 py-0.5 rounded-lg text-orange-600">
                        {invoices.filter(inv => {
                          if (!inv.date) return false;
                          const parts = inv.date.split('-');
                          if (parts.length < 2) return false;
                          return Number(parts[0]) === selectedReportYear && Number(parts[1]) === selectedReportMonth;
                        }).length} items
                      </span>
                    </div>

                    <div className="text-[9.5px] text-slate-500 leading-normal font-medium bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                      * Yeh report automatic data Supabase database se sync karke select kiye gaye maas ke table aur GST calculations compute karegi. Export PDF par click karne se report automatically download ho jayegi.
                    </div>
                  </div>

                  {/* Actions Submit / Cancel */}
                  <div className="pt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsGstReportOpen(false)}
                      className="flex-1 border border-slate-200 hover:bg-slate-50 py-3.5 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest transition-all cursor-pointer text-center"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerateGstReport}
                      disabled={isGeneratingGstReport}
                      className="flex-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-350 py-3.5 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md active:scale-[0.98]"
                    >
                      {isGeneratingGstReport ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4 stroke-[3]" />
                          <span>EXPORT PDF REPORT</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* DIALOG FOR NEW UDHAAR ENTRY */}
        <AnimatePresence>
          {isUdhaarFormOpen && (
            <>
              {/* Backplate backdrop overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsUdhaarFormOpen(false)}
                className="absolute inset-0 bg-neutral-950 z-50 cursor-pointer"
              />

              {/* Form container drawer panel slide-up */}
              <motion.div
                initial={{ y: '30%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '30%', opacity: 0 }}
                transition={{ type: 'spring', damping: 28, stiffness: 220 }}
                className="absolute left-0 right-0 bottom-0 max-h-[85vh] bg-white rounded-t-3xl shadow-2xl z-50 overflow-y-auto flex flex-col border-t border-orange-100"
              >
                {/* Header of Drawer */}
                <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10 font-sans">
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wide">नया उधार जोड़ें (New Udhaar Entry)</h3>
                    <p className="text-[10px] text-neutral-500 mt-0.5">Manage digital ledger instantly on InvoicePe</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsUdhaarFormOpen(false)}
                    className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Form main context */}
                <form onSubmit={handleAddUdhaar} className="p-5 space-y-4 flex-1 pb-10 font-sans">
                  
                  {/* Customer details */}
                  <div className="space-y-3.5 bg-red-50/20 p-4 rounded-xl border border-red-100">
                    <h4 className="text-[11px] font-bold text-red-750 uppercase tracking-wider flex items-center gap-1.5">
                      <Notebook className="w-3.5 h-3.5 text-red-500" />
                      <span>Udhaar Khata bahi (उधार बही विवरण)</span>
                    </h4>

                    {/* Customer Name input */}
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-600 mb-1">ग्राहक का नाम (Grahak Name) *</label>
                      <input
                        type="text"
                        required
                        value={udhaarCustomerName}
                        onChange={(e) => setUdhaarCustomerName(e.target.value)}
                        placeholder="जैसे: Ramesh Kumar"
                        className="w-full text-xs px-3 py-2.5 bg-white rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 focus:outline-none transition-all placeholder:text-slate-400 font-semibold text-slate-800"
                      />
                    </div>

                    {/* Customer Phone input */}
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-600 mb-1">ग्राहक का मोबाइल (Grahak Mobile Phone)</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">+91</span>
                        <input
                          type="tel"
                          maxLength={10}
                          value={udhaarPhone}
                          onChange={(e) => setUdhaarPhone(e.target.value.replace(/\D/g, ''))}
                          placeholder="98765 XXXXX"
                          className="w-full text-xs pl-11 pr-3 py-2.5 bg-white rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 focus:outline-none transition-all placeholder:text-slate-400 font-mono font-bold text-slate-850"
                        />
                      </div>
                    </div>

                    {/* Udhaar Amount input */}
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-600 mb-1">उधार रकम (Amount in ₹) *</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">₹</span>
                        <input
                          type="number"
                          required
                          min="1"
                          value={udhaarAmount}
                          onChange={(e) => {
                            const val = e.target.value;
                            setUdhaarAmount(val === '' ? '' : Number(val));
                          }}
                          placeholder="जैसे: 250"
                          className="w-full text-xs pl-7 pr-3 py-2.5 bg-white rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 focus:outline-none transition-all font-mono font-bold text-red-650"
                        />
                      </div>
                    </div>

                    {/* Item description */}
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-600 mb-1">विवरण / सामान की जानकारी (Item description)</label>
                      <input
                        type="text"
                        value={udhaarDesc}
                        onChange={(e) => setUdhaarDesc(e.target.value)}
                        placeholder="जैसे: atta 2kg, cheeni 1kg"
                        className="w-full text-xs px-3 py-2.5 bg-white rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 focus:outline-none transition-all placeholder:text-slate-400 text-slate-800"
                      />
                    </div>

                    {/* Date */}
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-600 mb-1">तारीख (Udhaar Date)</label>
                      <input
                        type="date"
                        value={udhaarDate}
                        onChange={(e) => setUdhaarDate(e.target.value)}
                        className="w-full text-xs px-3 py-2.5 bg-white rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 focus:outline-none transition-all text-slate-800 font-semibold"
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full bg-orange-500 hover:bg-orange-600 py-3.5 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md active:scale-[0.98]"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>उधार बही में जोड़ें / SAVE TO BOOK</span>
                    </button>
                  </div>

                </form>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* DIALOG FOR NEW INVOICE */}
        <AnimatePresence>
          {isFormOpen && (
            <>
              {/* Backplate backdrop overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsFormOpen(false)}
                className="absolute inset-0 bg-neutral-950 z-50 cursor-pointer"
              />

              {/* Form container drawer panel slide-up */}
              <motion.div
                initial={{ y: '30%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '30%', opacity: 0 }}
                transition={{ type: 'spring', damping: 28, stiffness: 220 }}
                className="absolute left-0 right-0 bottom-0 max-h-[92vh] bg-white rounded-t-3xl shadow-2xl z-50 overflow-y-auto flex flex-col border-t border-orange-100"
              >
                {/* Header of Drawer */}
                <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wide">Generate New Bill</h3>
                    <p className="text-[10px] text-neutral-500 mt-0.5">Quick GST / Cash invoice draft</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Form main context */}
                <form onSubmit={handleCreateInvoice} className="p-5 space-y-4 flex-1 pb-10">

                  {/* VOICE INVOICE MODULE */}
                  <div className="bg-gradient-to-r from-orange-500/5 via-orange-100/10 to-transparent p-4 rounded-2xl border border-orange-100/80 space-y-3 font-sans shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Mic className={`w-4 h-4 text-orange-500 ${isListening ? 'animate-bounce' : ''}`} />
                        <span className="text-[11px] font-black text-orange-850 uppercase tracking-widest">Voice Invoice Assist</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowVoiceHelp(!showVoiceHelp)}
                          className="flex items-center gap-1 text-[9.5px] text-orange-850 hover:text-orange-950 bg-orange-100/80 hover:bg-orange-200/90 px-2 py-0.5 rounded-lg font-extrabold border border-orange-200/50 cursor-pointer select-none transition-all active:scale-95 shadow-2xs"
                        >
                          <Info className="w-2.5 h-2.5 text-orange-650" />
                          <span>{showVoiceHelp ? 'Hide Info' : 'Help (कैसे बोलें?)'}</span>
                        </button>
                        <span className="text-[8px] bg-orange-100/80 text-orange-700 px-1.5 py-0.5 rounded font-black tracking-widest uppercase">SPEECH BETA</span>
                      </div>
                    </div>

                    <AnimatePresence>
                      {showVoiceHelp && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="bg-orange-500/5 p-3 rounded-xl border border-orange-100 space-y-2.5 text-xs text-neutral-700 mt-1 mb-2">
                            <h5 className="font-extrabold text-[10px] text-orange-850 uppercase tracking-wider flex items-center gap-1">
                              <span>🎧 Speaking Commands Guide (आवाज निर्देश)</span>
                            </h5>
                            
                            <div className="space-y-2 text-[9px] leading-relaxed">
                              {/* Rule 1 */}
                              <div className="bg-white/70 p-2.5 rounded-lg border border-orange-100/40">
                                <p className="font-bold text-neutral-800 flex items-center gap-1">
                                  <span className="w-1 h-1 rounded-full bg-orange-500" />
                                  1. Customer name & items (ग्राहक का नाम और सामान):
                                </p>
                                <p className="text-neutral-500 mt-0.5">Start with name followed by <span className="font-bold italic text-slate-800">"ko"</span>, <span className="font-bold italic text-slate-800">"for"</span>, or <span className="font-bold italic text-slate-800">"to"</span>.</p>
                                <p className="text-orange-700 font-mono font-extrabold mt-1 select-all hover:bg-orange-50 px-1 py-0.5 rounded transition-colors inline-block text-[9.5px]">
                                  🗣️ "Ramesh ko 2 kilo aatta 60 aur 1 litre tel 120"
                                </p>
                                <p className="text-neutral-400 mt-0.5 text-[8px] italic">
                                  (Auto parses: Customer: Ramesh, Item 1: Aatta [Qty: 2, Rate: 60], Item 2: Tel [Qty: 1, Rate: 120])
                                </p>
                              </div>

                              {/* Rule 2 */}
                              <div className="bg-white/70 p-2.5 rounded-lg border border-orange-100/40">
                                <p className="font-bold text-neutral-800 flex items-center gap-1">
                                  <span className="w-1 h-1 rounded-full bg-orange-500" />
                                  2. Multiple items (सामान और मूल्य):
                                </p>
                                <p className="text-neutral-500 mt-0.5">Use <span className="font-bold italic text-slate-800">"and"</span>, <span className="font-bold italic text-slate-800">"aur"</span>, or commas to split items.</p>
                                <p className="text-orange-700 font-mono font-extrabold mt-1 select-all hover:bg-orange-50 px-1 py-0.5 rounded transition-colors inline-block text-[9.5px]">
                                  🗣️ "3 piece soap 35 and 1 packet chips 10"
                                </p>
                                <p className="text-neutral-400 mt-0.5 text-[8px] italic">
                                  (Format: <span className="font-bold">Quantity</span> + <span className="font-bold">Item Name</span> + <span className="font-bold">Price</span>. Units like kg/litre/piece/rs are automatically cleaned!)
                                </p>
                              </div>

                              {/* Rule 3 */}
                              <div className="bg-white/70 p-2.5 rounded-lg border border-orange-100/40">
                                <p className="font-bold text-neutral-800 flex items-center gap-1">
                                  <span className="w-1 h-1 rounded-full bg-orange-500" />
                                  3. Default Grahak (सामान्य रसीद):
                                </p>
                                <p className="text-neutral-500 mt-0.5">If customer name is omitted, it defaults to "Walk-in Customer".</p>
                                <p className="text-orange-700 font-mono font-extrabold mt-1 select-all hover:bg-orange-50 px-1 py-0.5 rounded transition-colors inline-block text-[9.5px]">
                                  🗣️ "10 registers 40, 5 pens 10"
                                </p>
                              </div>
                            </div>
                            
                            <div className="text-[8px] text-slate-450 text-right font-medium italic mt-1 bg-orange-100/20 p-1.5 rounded-md border border-orange-100/20">
                              💡 Tip: Transcript read block check karein, agar koi typo ho, to edit karke "RE-PARSE & APPLY" dabaein!
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={startVoiceInvoice}
                        className={`w-11 h-11 rounded-full flex items-center justify-center transition-all shadow active:scale-95 shrink-0 select-none cursor-pointer ${
                          isListening 
                            ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                            : 'bg-orange-500 hover:bg-orange-600 text-white'
                        }`}
                        title={isListening ? "Listening... tap to stop" : "Start speaking voice invoice details"}
                      >
                        {isListening ? (
                          <div className="relative w-5 h-5 flex items-center justify-center">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-25 animate-ping"></span>
                            <MicOff className="w-4 h-4 stroke-[2.5]" />
                          </div>
                        ) : (
                          <Mic className="w-5 h-5 stroke-[2.5]" />
                        )}
                      </button>

                      <div className="flex-1 flex flex-col justify-center min-h-[44px]">
                        {isListening ? (
                          <div>
                            <p className="text-[10px] text-orange-600 font-extrabold tracking-wide uppercase animate-pulse mb-0.5">Bolna shuru karein...</p>
                            <p className="text-[9.5px] text-neutral-400 font-bold leading-none select-none">App automatic details parse karega</p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-[10px] text-neutral-600 font-bold leading-snug">
                              Tap orange mic and speak clearly (Hindi / English):
                            </p>
                            <p className="text-[9px] text-neutral-400 mt-0.5 leading-tight font-medium">
                              e.g. <span className="font-bold text-slate-500 italic">"Ramesh ko 2 kilo atta 60 aur 1 litre tel 120"</span>
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Hearing Results with Text Area to edit transcripts manually */}
                    {voiceTranscript && (
                      <div className="space-y-2 pt-1">
                        <div className="flex justify-between items-center">
                          <label className="text-[9.5px] font-bold text-neutral-500 uppercase tracking-widest">What was heard:</label>
                          <button
                            type="button"
                            onClick={() => {
                              const parsed = parseVoiceInvoice(voiceTranscript);
                              if (parsed.customerName) setCustomerName(parsed.customerName);
                              if (parsed.items && parsed.items.length > 0) {
                                const isCurrentEmpty = formItems.length === 1 && formItems[0].name === '' && formItems[0].price === 0;
                                if (isCurrentEmpty) {
                                  setFormItems(parsed.items);
                                } else {
                                  setFormItems(prev => {
                                    const cleanedPrev = prev.filter(item => item.name.trim() !== '');
                                    return [...cleanedPrev, ...parsed.items];
                                  });
                                }
                                showToast("Re-parsed and successfully added invoice items!", "success");
                              } else {
                                showToast("Nothing matched. Check items text syntax and re-try.", "info");
                              }
                            }}
                            className="text-[9px] text-orange-600 font-black bg-orange-100 hover:bg-orange-150 px-2 py-0.5 rounded flex items-center gap-1 transition-colors select-none cursor-pointer border border-orange-200/50"
                          >
                            <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                            <span>RE-PARSE & APPLY</span>
                          </button>
                        </div>
                        <textarea
                          value={voiceTranscript}
                          onChange={(e) => setVoiceTranscript(e.target.value)}
                          rows={2}
                          className="w-full text-[11px] px-3 py-2 bg-white rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500 font-bold text-slate-800 shadow-inner"
                          placeholder="Edit voice transcript here if mistranscribed..."
                        />
                      </div>
                    )}
                  </div>
                  
                  {/* Customer details */}
                  <div className="space-y-3.5 bg-orange-50/40 p-3.5 rounded-xl border border-orange-100">
                    <h4 className="text-[11px] font-bold text-orange-850 uppercase tracking-wider flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5" />
                      Customer (Grahak) Details
                    </h4>
                    
                    <div className="space-y-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-neutral-600 mb-1">Customer Name *</label>
                        <input
                          type="text"
                          required
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="e.g. Ramesh Kumar, Verma Book Store"
                          className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-slate-200 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-neutral-600 mb-1">Mobile Number (Receipt SMS/WhatsApp)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-neutral-400 font-semibold font-mono">
                            +91
                          </span>
                          <input
                            type="tel"
                            maxLength={10}
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                            placeholder="Enter 10-digit mobile"
                            className="w-full text-xs pl-12 pr-3 py-2 bg-white rounded-lg border border-slate-200 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Billing items listing */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-widest">
                        Bill Items & Inventory
                      </h4>
                      <button
                        type="button"
                        onClick={handleAddFormItem}
                        className="text-[10px] text-orange-600 font-bold flex items-center gap-1 bg-orange-50 hover:bg-orange-100/70 p-1.5 py-1 rounded"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        Add Item
                      </button>
                    </div>

                    {/* Active items inputs */}
                    <div className="space-y-3">
                      {formItems.map((item, idx) => (
                        <div key={item.id} className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 space-y-2 relative">
                          <div className="flex items-start gap-2 pr-8">
                            <div className="flex-1 text-left">
                              <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-0.5">Item Name</label>
                              <input
                                type="text"
                                required
                                value={item.name}
                                onChange={(e) => handleUpdateFormItem(item.id, 'name', e.target.value)}
                                placeholder="Item name or description"
                                className="w-full text-xs px-2 py-1.5 bg-white rounded border border-neutral-200 focus:outline-none focus:border-orange-500"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveFormItem(item.id)}
                              className="text-neutral-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-all absolute top-2.5 right-2 z-10 flex items-center justify-center cursor-pointer min-h-[36px] min-w-[36px]"
                              title="Delete Item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-0.5">Quantity</label>
                              <input
                                type="number"
                                min={1}
                                required
                                value={item.quantity}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  handleUpdateFormItem(item.id, 'quantity', val === '' ? '' : Number(val));
                                }}
                                className="w-full text-xs px-2 py-1.5 bg-white rounded border border-neutral-200 font-medium"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-0.5">Rate (₹ per item)</label>
                              <input
                                type="number"
                                min={0}
                                required
                                value={item.price || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  handleUpdateFormItem(item.id, 'price', val === '' ? 0 : Number(val));
                                }}
                                className="w-full text-xs px-2 py-1.5 bg-white rounded border border-neutral-200 font-medium font-mono"
                              />
                            </div>
                          </div>

                          {/* Quick Add inventory button for typed custom items */}
                          {item.name.trim() !== '' && (
                            <div className="flex justify-end pt-1">
                              {customPresets.some(p => p.name.toLowerCase() === item.name.trim().toLowerCase()) ? (
                                <span className="text-[9px] text-emerald-600 font-extrabold flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 font-mono">
                                  <Check className="w-3 h-3 stroke-[3]" /> Saved in Inventory (Preset)
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => saveToCustomPresets(item.name, item.price)}
                                  className="text-[9px] text-orange-600 hover:text-orange-700 font-extrabold flex items-center gap-1 bg-orange-50 hover:bg-orange-100/70 px-2.5 py-1 rounded-lg transition-all border border-orange-100/50 shadow-xs cursor-pointer select-none"
                                >
                                  <Plus className="w-3 h-3 stroke-[3]" /> Save to Inventory (Quick Add)
                                </button>
                              )}
                            </div>
                          )}

                          {/* Suggested Inventory presets (including user custom presets) */}
                          {item.name === '' && (
                            <div className="pt-1.5 space-y-2 text-left">
                              {/* Custom presets if any */}
                              {customPresets.length > 0 && (
                                <div className="space-y-1">
                                  <span className="text-[9px] font-extrabold text-indigo-600 uppercase tracking-widest block font-mono">My Saved Presets:</span>
                                  <div className="flex flex-wrap gap-1 border-b border-indigo-50/50 pb-1.5 mb-1.5 animate-fade-in">
                                    {customPresets.map((preset, pIdx) => (
                                      <div 
                                        key={pIdx} 
                                        className="inline-flex items-center bg-indigo-55/10 border border-indigo-100/55 rounded-lg overflow-hidden transition-all text-xs"
                                      >
                                        <button
                                          type="button"
                                          onClick={() => applyPresetItem(idx, preset.name, preset.price)}
                                          className="text-[9px] text-indigo-700 font-extrabold px-2 py-1 hover:bg-indigo-100/20 transition-colors cursor-pointer font-sans"
                                        >
                                          {preset.name} (₹{preset.price})
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => deleteCustomPreset(preset.name)}
                                          className="text-[9px] text-indigo-400 hover:text-red-650 px-1.5 py-1 hover:bg-red-50/50 transition-colors border-l border-indigo-100/30 cursor-pointer align-middle flex items-center justify-center"
                                          title="Remove Preset"
                                        >
                                          <X className="w-2.5 h-2.5" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div>
                                <span className="text-[9px] text-neutral-400 block font-bold uppercase tracking-wider mb-1">Quick Select:</span>
                                <div className="flex flex-wrap gap-1">
                                  {SUGGESTED_ITEMS.slice(0, 3).map((sug, sIdx) => (
                                    <button
                                      key={sIdx}
                                      type="button"
                                      onClick={() => applyPresetItem(idx, sug.name, sug.price)}
                                      className="text-[9px] bg-white border border-neutral-200 hover:border-orange-300 text-neutral-600 hover:text-orange-600 px-1.5 py-0.5 rounded transition-all cursor-pointer font-medium"
                                    >
                                      {sug.name.split(' ')[0]} (₹{sug.price})
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Payment status selector */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-semibold text-neutral-600">Payment Status</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormStatus('Paid')}
                        className={`py-2 px-3 text-xs font-semibold rounded-xl border text-center transition-all ${
                          formStatus === 'Paid'
                            ? 'bg-emerald-500 text-white border-emerald-400 shadow-sm'
                            : 'bg-slate-50 text-neutral-600 border-slate-200 hover:bg-neutral-100'
                        }`}
                      >
                        Paid (नकद मिल गया)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormStatus('Pending')}
                        className={`py-2 px-3 text-xs font-semibold rounded-xl border text-center transition-all ${
                          formStatus === 'Pending'
                            ? 'bg-orange-500 text-white border-orange-400 shadow-sm'
                            : 'bg-slate-50 text-neutral-600 border-slate-200 hover:bg-neutral-100'
                        }`}
                      >
                        Pending (उधार है)
                      </button>
                    </div>
                  </div>

                  {/* GST Rate dropdown */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-semibold text-neutral-600">GST Rate (%) *</label>
                    <select
                      value={formGstRate}
                      onChange={(e) => setFormGstRate(Number(e.target.value))}
                      className="w-full text-xs px-3 py-2 bg-white rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 font-semibold"
                    >
                      <option value={0}>0% GST (Zero Tax)</option>
                      <option value={5}>5% GST</option>
                      <option value={12}>12% GST</option>
                      <option value={18}>18% GST (Standard)</option>
                      <option value={28}>28% GST (Luxury)</option>
                    </select>
                  </div>

                  {/* COMPUTED SUMMARY BLOCK */}
                  {(() => {
                    const subtotal = formItems.reduce((acc, item) => acc + (item.quantity * (item.price || 0)), 0);
                    const gstAmount = subtotal * (formGstRate / 100);
                    const grandTotal = subtotal + gstAmount;

                    return (
                      <div className="bg-neutral-900 border border-neutral-800 text-white rounded-xl p-4 mt-3 space-y-3 font-display shadow-inner">
                        <div className="grid grid-cols-3 gap-2 border-b border-neutral-800 pb-2.5 text-center">
                          <div>
                            <span className="text-[8px] text-neutral-400 tracking-wider block uppercase font-display">Subtotal</span>
                            <span className="text-xs font-bold text-neutral-200 font-mono">
                              ₹{Math.round(subtotal).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div>
                            <span className="text-[8px] text-neutral-400 tracking-wider block uppercase font-display flex flex-col items-center">
                              <span>GST ({formGstRate}%)</span>
                            </span>
                            <span className="text-xs font-bold text-neutral-200 font-mono">
                              ₹{Math.round(gstAmount).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div>
                            <span className="text-[8px] text-orange-400 tracking-wider block uppercase">Total Bill</span>
                            <span className="text-xs font-extrabold text-orange-400 font-mono">
                              ₹{Math.round(grandTotal).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-0.5">
                          <div>
                            <span className="text-[9px] text-neutral-400 tracking-wider block uppercase">Payable Amount</span>
                            <span className="text-lg font-black text-orange-400 flex items-baseline font-sans">
                              <span className="text-xs mr-0.5 font-sans font-bold">₹</span>
                              <span>
                                {Math.round(grandTotal).toLocaleString('en-IN')}
                              </span>
                            </span>
                          </div>

                          <button
                            type="submit"
                            className="bg-orange-500 hover:bg-orange-600 font-semibold text-xs text-white uppercase tracking-wider px-5 py-2.5 rounded-lg active:scale-95 transition-all shadow-md shadow-orange-500/25 cursor-pointer"
                          >
                            Generate Bill
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                </form>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* RECEIPT DETAIL MODAL / SLIDE OVER */}
        <AnimatePresence>
          {selectedReceipt && (
            <>
              {/* Backplate */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedReceipt(null)}
                className="absolute inset-0 bg-neutral-950 z-50 cursor-pointer"
              />

              {/* Receipt Body Card */}
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 50 }}
                className="absolute left-4 right-4 top-[10%] max-h-[80vh] bg-white rounded-2xl shadow-2xl z-50 overflow-y-auto flex flex-col border border-neutral-100"
              >
                {/* Header info */}
                <div className="p-4 bg-orange-600 text-white flex justify-between items-start">
                  <div>
                    <span className="text-[10px] tracking-widest font-bold uppercase opacity-85">KHAATA BILL RECEIPT</span>
                    <h4 className="text-lg font-display font-bold leading-tight mt-0.5">{selectedReceipt.invoiceNo}</h4>
                    <p className="text-[10px] font-mono mt-1 opacity-75">{shopName}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedReceipt(null)}
                    className="p-1 rounded-full bg-orange-700/60 hover:bg-orange-700 text-white transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Receipt Details and Line Items */}
                <div className="p-5 space-y-4 text-xs">
                  
                  {/* Billed To block */}
                  <div className="pb-3 border-b border-dashed border-slate-200 space-y-1">
                    <span className="text-[9px] font-bold text-neutral-400 block uppercase">Billed To Grahak:</span>
                    <p className="font-bold text-neutral-900">{selectedReceipt.customerName}</p>
                    {selectedReceipt.customerPhone && selectedReceipt.customerPhone !== 'No Mobile' && (
                      <p className="text-neutral-500 font-mono text-[10px] flex items-center gap-1">
                        <Phone className="w-3 h-3 text-neutral-400" />
                        +91 {selectedReceipt.customerPhone}
                      </p>
                    )}
                    <span className="text-[10px] text-neutral-400 block pt-1">
                      Billing Date: {selectedReceipt.date}
                    </span>
                  </div>

                  {/* Line Items List */}
                  <div>
                    <span className="text-[9px] font-bold text-neutral-400 block uppercase mb-2">Itemised Ledger Details:</span>
                    <div className="space-y-2">
                      {selectedReceipt.items.map((item) => (
                        <div key={item.id} className="flex justify-between items-center text-neutral-700 border-b border-slate-50 pb-1.5">
                          <div className="max-w-[70%]">
                            <p className="font-medium text-neutral-950 text-xs">{item.name}</p>
                            <span className="text-[10px] text-neutral-400 font-mono">
                              {item.quantity} units x ₹{item.price.toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="text-right font-mono font-bold text-neutral-900">
                            ₹{(item.quantity * item.price).toLocaleString('en-IN')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Calculations and state */}
                  {(() => {
                    const receiptSubtotal = selectedReceipt.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
                    const receiptGstRate = selectedReceipt.gstRate !== undefined ? selectedReceipt.gstRate : 18;
                    const receiptGstAmount = selectedReceipt.gstAmount !== undefined ? selectedReceipt.gstAmount : receiptSubtotal * (receiptGstRate / 100);
                    const receiptGrandTotal = receiptSubtotal + receiptGstAmount;

                    return (
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-2 text-xs">
                        <div className="flex justify-between items-center text-slate-500 font-medium">
                          <span>Items Subtotal:</span>
                          <span className="font-mono text-slate-800">
                            ₹{Math.round(receiptSubtotal).toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-slate-500 font-medium">
                          <span className="flex items-center gap-1">
                            <span>GST ({receiptGstRate}%):</span>
                          </span>
                          <span className="font-mono text-slate-800">
                            ₹{Math.round(receiptGstAmount).toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div className="border-t border-slate-200/60 my-1"></div>

                        <div className="flex justify-between items-center font-bold text-neutral-900 text-sm">
                          <span>Grand Total:</span>
                          <span className="font-mono text-orange-600">
                            ₹{Math.round(receiptGrandTotal).toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div className="border-t border-dashed border-slate-250 my-1.5"></div>

                        <div className="flex justify-between items-center text-[10.5px]">
                          <span className="font-bold text-slate-500">Payment Status:</span>
                          <span className={`font-black px-2 py-0.5 rounded text-[9px] ${
                            selectedReceipt.status === 'Paid' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-orange-100 text-orange-900'
                          }`}>
                            {selectedReceipt.status === 'Paid' ? 'PAID / नकद' : 'PENDING / उधार'}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* GST, backup notes and safety */}
                  <div className="text-[10px] text-neutral-400 leading-snug text-center space-y-1 pt-2">
                    <p>🇮🇳 Generated via InvoicePe Digital Khaata Book.</p>
                    <p>Thank you for doing business with us!</p>
                  </div>

                  {/* UPI QR CODE DISPLAY OR CONFIGURATION BANNER */}
                  {(() => {
                    const hasUpiSet = upiId && upiId.trim() !== '' && upiId.trim() !== 'shopname@upi';

                    if (hasUpiSet) {
                      const qrSubtotal = selectedReceipt.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
                      const qrGstRate = selectedReceipt.gstRate !== undefined ? selectedReceipt.gstRate : 18;
                      const qrGstAmount = selectedReceipt.gstAmount !== undefined ? selectedReceipt.gstAmount : qrSubtotal * (qrGstRate / 100);
                      const qrGrandTotal = Math.round(qrSubtotal + qrGstAmount);
                      const upiDeepLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(shopName)}&am=${qrGrandTotal}&cu=INR&tn=${encodeURIComponent(`Invoice-${selectedReceipt.invoiceNo}`)}`;

                      return (
                        <div className="flex flex-col items-center justify-center p-4 bg-orange-50/40 rounded-2xl border border-orange-100/50 space-y-2.5 mt-2.5 mb-2">
                          <div className="p-2.5 bg-white rounded-xl shadow-xs border border-orange-150 flex items-center justify-center">
                            <QRCodeCanvas
                              id="invoice-qr-canvas"
                              value={upiDeepLink}
                              size={120}
                              level="H"
                              includeMargin={true}
                            />
                          </div>
                          <div className="text-center font-sans">
                            <p className="text-[10px] font-extrabold text-orange-950 flex items-center justify-center gap-1">
                              <QrCode className="w-3 h-3 text-orange-500 animate-pulse" />
                              <span>Scan to pay instantly via any UPI app</span>
                            </p>
                            <p className="text-[9px] text-slate-400 font-mono font-bold mt-0.5">
                              UPI ID: {upiId} • PAY TO MERCHANT
                            </p>
                          </div>
                        </div>
                      );
                    } else {
                      return null;
                    }
                  })()}

                  {/* Share action buttons inside receipt */}
                  <div className="pt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleWhatsAppShare(selectedReceipt)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-center flex items-center justify-center gap-1.5 text-[11px] shadow-sm transform active:scale-95 transition-all cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      Share WhatsApp
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleInvoiceStatus(selectedReceipt.id)}
                      className={`font-semibold py-2 rounded-xl text-center text-[11px] border shadow-sm transform active:scale-95 transition-all text-neutral-800 ${
                        selectedReceipt.status === 'Paid' 
                          ? 'bg-orange-50 border-orange-200 hover:bg-orange-100 text-orange-700' 
                          : 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {selectedReceipt.status === 'Paid' ? 'Mark Unpaid' : 'Mark Recieved'}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleExportPDF(selectedReceipt)}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-xl text-center flex items-center justify-center gap-2 text-[11.5px] shadow-md shadow-orange-100 transform active:scale-95 transition-all cursor-pointer"
                  >
                    <FileText className="w-4 h-4" />
                    Download PDF Receipt
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteInvoice(selectedReceipt.id, selectedReceipt.invoiceNo)}
                    className="w-full text-[10px] text-neutral-400 hover:text-red-600 py-1 font-bold text-center border border-transparent hover:border-slate-100 rounded-lg transition-all"
                  >
                    Delete Invoice Record
                  </button>

                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* CUSTOMER LEDGER HISTORY DRAWER */}
        <AnimatePresence>
          {selectedCustomerForHistory && (() => {
            const activeCust = customers.find(c => c.name.toLowerCase().trim() === selectedCustomerForHistory.name.toLowerCase().trim()) || selectedCustomerForHistory;
            return (
              <>
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.5 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSelectedCustomerForHistory(null)}
                  className="absolute inset-0 bg-neutral-950 z-50 cursor-pointer"
                />

                {/* Drawer Container Panel */}
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                  className="absolute left-0 right-0 bottom-0 max-h-[85vh] bg-white rounded-t-3xl shadow-2xl z-50 overflow-y-auto flex flex-col border-t border-orange-100"
                >
                  {/* Header */}
                  <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-start sticky top-0 bg-white z-10 w-full">
                    <div>
                      <span className="text-[9px] bg-orange-100 text-orange-755 px-2 py-0.5 rounded-md font-bold uppercase tracking-widest block w-fit mb-1">
                        Customer Ledger Book
                      </span>
                      <h3 className="text-base font-bold text-slate-900 leading-none">{activeCust.name}</h3>
                      <div className="flex flex-col gap-1 mt-1.5">
                        <p className="text-[10px] text-slate-450 flex items-center gap-1 font-mono font-bold leading-none">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {activeCust.phone && activeCust.phone !== 'No Mobile' 
                            ? `+91 ${activeCust.phone}` 
                            : 'No Mobile'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedCustomerForHistory(null)}
                      className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-all cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Ledger Quick Summary Stats */}
                  <div className="p-4 grid grid-cols-2 gap-3 bg-[#FFFBF7] border-b border-orange-50">
                    <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Total Pending (उधार)</span>
                      <span className="text-lg font-black font-mono text-red-500">₹{activeCust.pendingAmount.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Total Received (नकद)</span>
                      <span className="text-lg font-black font-mono text-emerald-600">₹{activeCust.paidAmount.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Invoices List */}
                  <div className="p-5 space-y-3 flex-1 overflow-y-auto pb-12 bg-white">
                    <div className="flex justify-between items-center bg-[#FFFBF7] p-2.5 rounded-xl border border-orange-100/50">
                      <h4 className="text-[10.5px] font-bold text-orange-850 uppercase tracking-widest">Transaction History</h4>
                      <span className="text-[10px] bg-orange-100 text-orange-850 font-black px-2 py-0.5 rounded-md">{activeCust.invoices.length} Bills</span>
                    </div>

                    <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden bg-white shadow-sm">
                      {activeCust.invoices.map((inv) => (
                        <div
                          key={inv.id}
                          onClick={() => setSelectedReceipt(inv)}
                          className="p-3.5 hover:bg-orange-50/20 active:bg-orange-50/40 transition-all cursor-pointer flex justify-between items-center"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                {inv.invoiceNo}
                              </span>
                              <span className="text-[10px] text-slate-400 font-semibold">
                                {inv.date}
                              </span>
                            </div>
                            <p className="text-[10.5px] text-slate-500 truncate max-w-[200px]">
                              {inv.items.map(i => `${i.name} x${i.quantity}`).join(', ')}
                            </p>
                          </div>

                          <div className="text-right flex items-center gap-2">
                            <div className="space-y-0.5">
                              <p className="text-xs font-black font-mono text-slate-900">₹{inv.totalAmount.toLocaleString('en-IN')}</p>
                              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                inv.status === 'Paid' 
                                  ? 'bg-emerald-100 text-emerald-700' 
                                  : 'bg-orange-100 text-orange-755'
                              }`}>
                                {inv.status === 'Paid' ? 'PAID' : 'PENDING'}
                              </span>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Share button inside history drawer */}
                    {activeCust.pendingAmount > 0 ? (
                      <button
                        type="button"
                        onClick={() => handleSendReminder(activeCust)}
                        className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl text-center flex items-center justify-center gap-2 text-xs shadow-md shadow-emerald-100 transform active:scale-95 transition-all cursor-pointer uppercase tracking-wider"
                      >
                        <Share2 className="w-4 h-4 text-emerald-150" />
                        <span>Send REMINDER (₹{activeCust.pendingAmount.toLocaleString('en-IN')})</span>
                      </button>
                    ) : (
                      <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-3.5 rounded-xl text-center text-xs font-bold mt-4 uppercase tracking-wide">
                        All Paid! No Pending Udhaar.
                      </div>
                    )}
                  </div>
                </motion.div>
              </>
            );
          })()}
        </AnimatePresence>

        {/* FREE PLAN LIMIT EXCEEDED MODAL */}
        <AnimatePresence>
          {showLimitPopup && (
            <>
              {/* Backplate backdrop overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowLimitPopup(false)}
                className="absolute inset-0 bg-neutral-950/80 z-50 cursor-pointer"
              />

              {/* Modal Container drawer */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 100 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 100 }}
                transition={{ type: 'spring', damping: 25, stiffness: 250 }}
                className="absolute left-4 right-4 bottom-4 md:bottom-auto md:top-[12%] md:max-w-2xl md:mx-auto bg-white rounded-3xl shadow-2xl z-50 overflow-hidden border border-orange-100 flex flex-col font-sans max-h-[92vh]"
              >
                {/* Visual Top Highlight strip */}
                <div className="h-2 bg-gradient-to-r from-orange-500 to-amber-500 w-full animate-pulse flex-none" />

                {/* Close Button X */}
                <button
                  type="button"
                  onClick={() => setShowLimitPopup(false)}
                  className="absolute right-4 top-4 w-7 h-7 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200/50 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all cursor-pointer select-none active:scale-95 z-20"
                >
                  <X className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>

                {/* Content Area */}
                <div className="p-5 md:p-6 overflow-y-auto space-y-4">
                  
                  {/* Header Title & Subtitle Info */}
                  <div className="text-center space-y-1.5 pt-2">
                    <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center text-orange-500 mx-auto border border-orange-100 shadow-xs">
                      <Gift className="w-6 h-6 stroke-[2.5] animate-bounce" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">
                      🚀 Aapka Free Plan Full Ho Gaya!
                    </h3>
                    <p className="text-xs font-bold text-orange-950/90 max-w-sm mx-auto">
                      Apna business badhao — upgrade karein aaj!
                    </p>
                  </div>

                  {/* Two Plans Layout Grid */}
                  {(() => {
                    const baseProPrice = 99;
                    const baseBusinessPrice = 249;

                    return (
                      <>
                        {/* Referral Code Coupon Input Section */}
                        <div className="bg-slate-50 p-4 rounded-3xl border border-orange-100 space-y-2 mt-1 mb-2">
                          <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block font-sans">
                            🏷️ HAVE A REFERRAL CODE? / REFERRAL CODE लागू करें
                          </span>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={upgradeReferralCode}
                              onChange={(e) => setUpgradeReferralCode(e.target.value.trim().toUpperCase())}
                              disabled={!!appliedReferral}
                              placeholder="E.G. RAMESH20"
                              className="flex-1 text-xs px-3 py-2.5 bg-white border border-slate-205 rounded-xl focus:border-orange-500 focus:outline-none font-bold uppercase font-mono placeholder:normal-case placeholder:font-sans disabled:bg-slate-100 disabled:text-slate-400"
                            />
                            <button
                              type="button"
                              onClick={handleApplyUpgradeReferral}
                              disabled={!!appliedReferral}
                              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs active:scale-95 transition-all select-none cursor-pointer disabled:bg-slate-150 disabled:text-slate-400"
                            >
                              {appliedReferral ? 'Applied ✓' : 'Apply'}
                            </button>
                          </div>
                          {appliedReferral && (
                            <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 animate-fadeIn">
                              🎉 Coupon "{appliedReferral}" applied successfully! 1 Month of Pro Plan has been activated on your account for FREE.
                            </p>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          
                          {/* Plan 1 — Free */}
                          <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200/60 flex flex-col justify-between space-y-4 shadow-2xs relative overflow-hidden">
                            <div className="space-y-3">
                              {/* Plan Header */}
                              <div>
                                <p className="text-[9px] text-slate-500 font-extrabold uppercase tracking-widest mb-0.5 font-mono">Current Plan</p>
                                <h4 className="text-lg font-black text-slate-900 flex items-baseline gap-1.5">
                                  <span>Free Plan</span>
                                  <span className="text-slate-600 text-xl font-black">₹0<span className="text-[10px] text-slate-405 font-bold">/mo</span></span>
                                </h4>
                                <p className="text-[10px] text-slate-400 font-medium">Try basic billing features</p>
                              </div>
       
                              {/* Feature List */}
                              <ul className="space-y-2 text-xs text-slate-600">
                                <li className="flex items-center gap-2">
                                  <Check className="w-3.5 h-3.5 text-slate-500 shrink-0 stroke-[3]" />
                                  <span className="font-semibold text-slate-750">30 invoices limit</span>
                                </li>
                                <li className="flex items-center gap-2">
                                  <Check className="w-3.5 h-3.5 text-slate-500 shrink-0 stroke-[3]" />
                                  <span>GST Billing</span>
                                </li>
                                <li className="flex items-center gap-2">
                                  <Check className="w-3.5 h-3.5 text-slate-500 shrink-0 stroke-[3]" />
                                  <span>WhatsApp Sharing</span>
                                </li>
                                <li className="flex items-center gap-2">
                                  <Check className="w-3.5 h-3.5 text-slate-500 shrink-0 stroke-[3]" />
                                  <span className="text-slate-500">Premium Features Trial</span>
                                </li>
                              </ul>
                            </div>
       
                            {/* CTA button */}
                            <div>
                              <button
                                type="button"
                                disabled
                                className="w-full bg-slate-2 w text-slate-400 py-3 rounded-2xl font-black text-[10px] flex items-center justify-center gap-1.5 tracking-wider uppercase font-mono cursor-not-allowed border border-slate-200"
                              >
                                Active Free Plan
                              </button>
                            </div>
                          </div>

                          {/* Plan 2 — Pro */}
                          <div className="bg-gradient-to-br from-indigo-50/20 via-white to-orange-50/10 p-5 rounded-3xl border border-orange-200 flex flex-col justify-between space-y-4 shadow-sm relative overflow-hidden">
                            {/* Top Accent Ribbon */}
                            <div className="absolute top-0 right-0 bg-orange-500 text-white font-extrabold text-[8px] tracking-widest uppercase px-3.5 py-1 rounded-bl-2xl border-l border-b border-orange-200">
                              POPULAR
                            </div>
       
                            <div className="space-y-3">
                              {/* Plan Header */}
                              <div>
                                <p className="text-[9px] text-orange-600 font-extrabold uppercase tracking-widest mb-0.5 font-mono">Best Value</p>
                                <h4 className="text-lg font-black text-slate-900 flex items-baseline gap-1.5">
                                  <span>Pro Plan</span>
                                  <span className="text-orange-600 text-xl font-black">₹{baseProPrice}<span className="text-[10px] text-slate-400 font-bold">/mo</span></span>
                                </h4>
                                <p className="text-[10px] text-slate-400 font-medium font-bold">Perfect for growing independent stores</p>
                              </div>
       
                              {/* Feature List */}
                              <ul className="space-y-2 text-xs text-slate-600">
                                <li className="flex items-center gap-2">
                                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 stroke-[3]" />
                                  <span className="font-semibold text-slate-700">Unlimited invoices</span>
                                </li>
                                <li className="flex items-center gap-2">
                                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 stroke-[3]" />
                                  <span className="font-semibold text-slate-700">PDF Export</span>
                                </li>
                                <li className="flex items-center gap-2">
                                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 stroke-[3]" />
                                  <span className="font-semibold text-slate-705">GST Reports</span>
                                </li>
                                <li className="flex items-center gap-2">
                                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 stroke-[3]" />
                                  <span>Voice Billing</span>
                                </li>
                                <li className="flex items-center gap-2">
                                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 stroke-[3]" />
                                  <span>UPI QR</span>
                                </li>
                              </ul>
                            </div>
       
                            {/* WhatsApp CTA with new labeled Upgrade button */}
                            <div>
                              <button
                                type="button"
                                onClick={() => {
                                  const userEmail = user?.email || 'N/A';
                                  const customMessage = `Namaste! Main InvoicePe Pro ₹${baseProPrice}/month lena chahta hun. Mera email: ${userEmail} 🙏`;
                                  const url = `https://api.whatsapp.com/send?phone=919828488365&text=${encodeURIComponent(customMessage)}`;
                                  window.open(url, '_blank', 'noopener,noreferrer');
                                }}
                                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-2xl font-black text-[11px] transition-all flex items-center justify-center gap-1.5 shadow-md shadow-orange-100 active:scale-[0.98] cursor-pointer tracking-wider uppercase font-sans border border-orange-400/20"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-orange-200 animate-pulse shrink-0" />
                                <span>Upgrade to Pro</span>
                              </button>
                            </div>
                          </div>
       
                          {/* Plan 3 — Business */}
                          <div className="bg-gradient-to-br from-indigo-50/40 via-white to-amber-50/10 p-5 rounded-3xl border border-indigo-200 flex flex-col justify-between space-y-4 shadow-sm relative overflow-hidden">
                            {/* Top Accent Ribbon */}
                            <div className="absolute top-0 right-0 bg-indigo-600 text-white font-extrabold text-[8px] tracking-widest uppercase px-3.5 py-1 rounded-bl-2xl border-l border-b border-indigo-200">
                              COMPLETE SUITE
                            </div>
       
                            <div className="space-y-3">
                              {/* Plan Header */}
                              <div>
                                <p className="text-[9px] text-indigo-600 font-extrabold uppercase tracking-widest mb-0.5 font-mono font-black">All Features</p>
                                <h4 className="text-lg font-black text-slate-900 flex items-baseline gap-1.5">
                                  <span>Business</span>
                                  <span className="text-indigo-600 text-xl font-black">₹{baseBusinessPrice}<span className="text-[10px] text-slate-400 font-bold">/mo</span></span>
                                </h4>
                                <p className="text-[10px] text-slate-450 font-medium">Enterprise multi-store accounting node</p>
                              </div>
       
                              {/* Feature List */}
                              <ul className="space-y-2 text-xs text-slate-600">
                                <li className="flex items-center gap-2">
                                  <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0 stroke-[3]" />
                                  <span className="font-semibold text-slate-800">Multi Shop Management</span>
                                </li>
                                <li className="flex items-center gap-2">
                                  <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0 stroke-[3]" />
                                  <span>Staff Accounts</span>
                                </li>
                                <li className="flex items-center gap-2">
                                  <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0 stroke-[3]" />
                                  <span className="font-semibold text-indigo-805">Priority Support</span>
                                </li>
                              </ul>
                            </div>
       
                            {/* WhatsApp CTA with new labeled Upgrade button */}
                            <div>
                              <button
                                type="button"
                                onClick={() => {
                                  const userEmail = user?.email || 'N/A';
                                  const customMessage = `Namaste! Main InvoicePe Business ₹${baseBusinessPrice}/month lena chahta hun. Mera email: ${userEmail} 🙏`;
                                  const url = `https://api.whatsapp.com/send?phone=919828488365&text=${encodeURIComponent(customMessage)}`;
                                  window.open(url, '_blank', 'noopener,noreferrer');
                                }}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-2xl font-black text-[11px] transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-100 active:scale-[0.98] cursor-pointer tracking-wider uppercase font-sans border border-indigo-400/20"
                              >
                                <Zap className="w-3.5 h-3.5 text-indigo-200 animate-pulse shrink-0" />
                                <span>Upgrade to Business</span>
                              </button>
                            </div>
                          </div>

                        </div>
                      </>
                    );
                  })()}

                  {/* Close / Dismiss link anchor */}
                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => setShowLimitPopup(false)}
                      className="text-[10px] text-slate-450 hover:text-slate-650 font-extrabold uppercase tracking-widest transition-colors cursor-pointer select-none"
                    >
                      Piche Jayein / Close
                    </button>
                  </div>

                </div>

              </motion.div>
            </>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
