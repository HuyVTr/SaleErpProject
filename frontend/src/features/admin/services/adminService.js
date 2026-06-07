import api from '../../../services/api';
import dbData from '../../../../db.json';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

// --- Local storage helpers ---
const getLocal = (key) => {
	try {
		const raw = localStorage.getItem(key);
		return raw ? JSON.parse(raw) : [];
	} catch (e) {
		return [];
	}
};

const setLocal = (key, value) => {
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch (e) {
		// ignore
	}
};

// Keys used by admin UI
const KEY_PRODUCTS = 'adminProducts';
const KEY_CATEGORIES = 'adminCategories';
const KEY_STAFFS = 'adminStaffs';
const KEY_PRICELISTS = 'adminPriceLists';

// --- Fallback sources in db.json ---
const fallbackProducts = () => dbData.products || [];
const fallbackCategories = () => dbData.categories || [];
const fallbackPriceLists = () => dbData.priceLists || [];

// --- Utilities ---
const nextIdFor = (arr, idField = 'id') => {
	const nums = arr
		.map(i => {
			const v = i[idField];
			if (!v) return 0;
			const n = Number(String(v).replace(/[^0-9]/g, ''));
			return isNaN(n) ? 0 : n;
		});
	return (nums.length ? Math.max(...nums) : 0) + 1;
};

// --- Admin service ---
const adminService = {
	// Products
	getProducts: async () => {
		if (USE_MOCK) {
			const local = getLocal(KEY_PRODUCTS);
			const apiData = fallbackProducts();
			// local overrides apiData by id
			const map = new Map();
			apiData.forEach(p => map.set(String(p.productID || p.id || p.code || p.sku), p));
			local.forEach(p => map.set(String(p.productID || p.id || p.code || p.sku), p));
			return Array.from(map.values());
		}
		const response = await api.get('/admin/products');
		return response.data;
	},

	createProduct: async (product) => {
		if (USE_MOCK) {
			const local = getLocal(KEY_PRODUCTS);
			const apiData = fallbackProducts();
			const all = [...local, ...apiData];
			const id = nextIdFor(all, 'productID') || nextIdFor(all, 'id');
			const newProd = { ...product, productID: id };
			setLocal(KEY_PRODUCTS, [newProd, ...local]);
			return newProd;
		}
		const response = await api.post('/admin/products', product);
		return response.data;
	},

	updateProduct: async (productID, data) => {
		if (USE_MOCK) {
			const local = getLocal(KEY_PRODUCTS);
			const updated = local.map(p => (String(p.productID) === String(productID) ? { ...p, ...data } : p));
			// if product not in local, try to patch fallback and add to local
			if (!updated.some(p => String(p.productID) === String(productID))) {
				const orig = fallbackProducts().find(p => String(p.productID || p.id) === String(productID));
				if (orig) {
					const merged = { ...orig, ...data, productID: orig.productID || orig.id };
					setLocal(KEY_PRODUCTS, [merged, ...local]);
					return { success: true };
				}
			}
			setLocal(KEY_PRODUCTS, updated);
			return { success: true };
		}
		const response = await api.put(`/admin/products/${productID}`, data);
		return response.data;
	},

	deleteProduct: async (productID) => {
		if (USE_MOCK) {
			const local = getLocal(KEY_PRODUCTS);
			const filtered = local.filter(p => String(p.productID) !== String(productID) && String(p.id) !== String(productID));
			setLocal(KEY_PRODUCTS, filtered);
			return { success: true };
		}
		const response = await api.delete(`/admin/products/${productID}`);
		return response.data;
	},

	// Categories
	getCategories: async () => {
		if (USE_MOCK) {
			const local = getLocal(KEY_CATEGORIES);
			const apiData = fallbackCategories();
			const map = new Map();
			apiData.forEach(c => map.set(String(c.categoryID || c.id), c));
			local.forEach(c => map.set(String(c.categoryID || c.id), c));
			return Array.from(map.values());
		}
		const response = await api.get('/admin/categories');
		return response.data;
	},

	createCategory: async (category) => {
		if (USE_MOCK) {
			const local = getLocal(KEY_CATEGORIES);
			const apiData = fallbackCategories();
			const id = nextIdFor([...local, ...apiData], 'categoryID') || nextIdFor([...local, ...apiData], 'id');
			const newCat = { ...category, categoryID: id };
			setLocal(KEY_CATEGORIES, [newCat, ...local]);
			return newCat;
		}
		const response = await api.post('/admin/categories', category);
		return response.data;
	},

	updateCategory: async (categoryID, data) => {
		if (USE_MOCK) {
			const local = getLocal(KEY_CATEGORIES);
			const updated = local.map(c => (String(c.categoryID) === String(categoryID) ? { ...c, ...data } : c));
			if (!updated.some(c => String(c.categoryID) === String(categoryID))) {
				const orig = fallbackCategories().find(c => String(c.categoryID || c.id) === String(categoryID));
				if (orig) {
					const merged = { ...orig, ...data, categoryID: orig.categoryID || orig.id };
					setLocal(KEY_CATEGORIES, [merged, ...local]);
					return { success: true };
				}
			}
			setLocal(KEY_CATEGORIES, updated);
			return { success: true };
		}
		const response = await api.put(`/admin/categories/${categoryID}`, data);
		return response.data;
	},

	deleteCategory: async (categoryID) => {
		if (USE_MOCK) {
			const local = getLocal(KEY_CATEGORIES);
			const filtered = local.filter(c => String(c.categoryID) !== String(categoryID) && String(c.id) !== String(categoryID));
			setLocal(KEY_CATEGORIES, filtered);
			return { success: true };
		}
		const response = await api.delete(`/admin/categories/${categoryID}`);
		return response.data;
	},

	// Staffs (users)
	getStaffs: async () => {
		if (USE_MOCK) {
			const local = getLocal(KEY_STAFFS);
			const apiData = dbData.users || [];
			const map = new Map();
			apiData.forEach(u => map.set(String(u.userID || u.id), u));
			local.forEach(u => map.set(String(u.userID || u.id), u));
			return Array.from(map.values());
		}
		const response = await api.get('/admin/staffs');
		return response.data;
	},

	createStaff: async (staff) => {
		if (USE_MOCK) {
			const local = getLocal(KEY_STAFFS);
			const apiData = dbData.users || [];
			const id = nextIdFor([...local, ...apiData], 'userID') || nextIdFor([...local, ...apiData], 'id');
			const newStaff = { ...staff, userID: id };
			setLocal(KEY_STAFFS, [newStaff, ...local]);
			return newStaff;
		}
		const response = await api.post('/admin/staffs', staff);
		return response.data;
	},

	updateStaff: async (staffID, data) => {
		if (USE_MOCK) {
			const local = getLocal(KEY_STAFFS);
			const updated = local.map(s => (String(s.userID) === String(staffID) ? { ...s, ...data } : s));
			if (!updated.some(s => String(s.userID) === String(staffID))) {
				const orig = (dbData.users || []).find(u => String(u.userID || u.id) === String(staffID));
				if (orig) {
					const merged = { ...orig, ...data, userID: orig.userID || orig.id };
					setLocal(KEY_STAFFS, [merged, ...local]);
					return { success: true };
				}
			}
			setLocal(KEY_STAFFS, updated);
			return { success: true };
		}
		const response = await api.put(`/admin/staffs/${staffID}`, data);
		return response.data;
	},

	deleteStaff: async (staffID) => {
		if (USE_MOCK) {
			const local = getLocal(KEY_STAFFS);
			const filtered = local.filter(s => String(s.userID) !== String(staffID) && String(s.id) !== String(staffID));
			setLocal(KEY_STAFFS, filtered);
			return { success: true };
		}
		const response = await api.delete(`/admin/staffs/${staffID}`);
		return response.data;
	},

	// Price lists
	getPriceLists: async () => {
		if (USE_MOCK) {
			const local = getLocal(KEY_PRICELISTS);
			const apiData = fallbackPriceLists();
			const map = new Map();
			apiData.forEach(p => map.set(String(p.id || p.listID), p));
			local.forEach(p => map.set(String(p.id || p.listID), p));
			return Array.from(map.values());
		}
		const response = await api.get('/admin/price-lists');
		return response.data;
	},

	createPriceList: async (payload) => {
		if (USE_MOCK) {
			const local = getLocal(KEY_PRICELISTS);
			const apiData = fallbackPriceLists();
			const id = nextIdFor([...local, ...apiData], 'id');
			const newList = { ...payload, id: id };
			setLocal(KEY_PRICELISTS, [newList, ...local]);
			return newList;
		}
		const response = await api.post('/admin/price-lists', payload);
		return response.data;
	},

	updatePriceList: async (id, data) => {
		if (USE_MOCK) {
			const local = getLocal(KEY_PRICELISTS);
			const updated = local.map(p => (String(p.id) === String(id) ? { ...p, ...data } : p));
			if (!updated.some(p => String(p.id) === String(id))) {
				const orig = fallbackPriceLists().find(p => String(p.id) === String(id));
				if (orig) {
					const merged = { ...orig, ...data, id: orig.id };
					setLocal(KEY_PRICELISTS, [merged, ...local]);
					return { success: true };
				}
			}
			setLocal(KEY_PRICELISTS, updated);
			return { success: true };
		}
		const response = await api.put(`/admin/price-lists/${id}`, data);
		return response.data;
	},

	deletePriceList: async (id) => {
		if (USE_MOCK) {
			const local = getLocal(KEY_PRICELISTS);
			const filtered = local.filter(p => String(p.id) !== String(id));
			setLocal(KEY_PRICELISTS, filtered);
			return { success: true };
		}
		const response = await api.delete(`/admin/price-lists/${id}`);
		return response.data;
	}
};

export default adminService;

