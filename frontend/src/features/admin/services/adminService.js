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
const KEY_PRODUCTS = 'added_products';
const KEY_DELETED_PRODUCTS = 'deleted_product_ids';
const KEY_CATEGORIES = 'adminCategories';
const KEY_STAFFS = 'adminStaffs';
const KEY_PRICELISTS = 'adminPriceLists';
const KEY_PRICELIST_ITEMS = 'adminPriceListItems';
// Khóa dữ liệu khách hàng dùng chung với module Sales để đảm bảo đồng bộ giữa 2 phân hệ
const KEY_CUSTOMERS = 'added_customers';
const KEY_DELETED_CUSTOMERS = 'deleted_customer_ids';

// --- Fallback sources in db.json ---
const fallbackProducts = () => dbData.products || [];
const fallbackCategories = () => dbData.categories || [];
const fallbackPriceLists = () => dbData.priceLists || [];
const fallbackPriceListItems = () => dbData.priceListItems || [];

// Helper to clean formatted IDs (like PRD-010 or PROD-001) to pure numeric value
const cleanProductId = (id) => {
	if (!id) return 0;
	const cleaned = String(id).replace('PRD-', '').replace('PROD-', '').replace(/^0+/, '');
	return Number(cleaned) || Number(id) || 0;
};

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
			const deletedIds = getLocal(KEY_DELETED_PRODUCTS);
			const deletedSet = new Set(deletedIds.map(cleanProductId));

			const productMap = new Map();
			apiData.forEach(p => {
				const pid = cleanProductId(p.productID || p.id);
				if (!deletedSet.has(pid)) {
					productMap.set(pid, { ...p, productID: pid });
				}
			});
			local.forEach(p => {
				const pid = cleanProductId(p.productID || p.id);
				productMap.set(pid, { ...p, productID: pid });
			});

			return Array.from(productMap.values());
		}
		const response = await api.get('/products');
		return response.data?.data || response.data || [];
	},

	createProduct: async (product) => {
		if (USE_MOCK) {
			const local = getLocal(KEY_PRODUCTS);
			const apiData = fallbackProducts();
			const deletedIds = getLocal(KEY_DELETED_PRODUCTS);
			
			const allIds = [
				...local.map(p => cleanProductId(p.productID || p.id)),
				...apiData.map(p => cleanProductId(p.productID || p.id)),
				...deletedIds.map(cleanProductId)
			];
			const maxId = allIds.reduce((max, id) => Math.max(max, id), 0);
			const newProd = { ...product, productID: maxId + 1 };
			setLocal(KEY_PRODUCTS, [newProd, ...local]);
			return newProd;
		}
		const response = await api.post('/products', product);
		return response.data;
	},

	updateProduct: async (productID, data) => {
		if (USE_MOCK) {
			const cleanID = cleanProductId(productID);
			const local = getLocal(KEY_PRODUCTS);
			const updated = local.map(p => 
				cleanProductId(p.productID || p.id) === cleanID 
					? { ...p, ...data, productID: cleanID } 
					: p
			);
			
			if (!updated.some(p => cleanProductId(p.productID || p.id) === cleanID)) {
				const orig = fallbackProducts().find(p => cleanProductId(p.productID || p.id) === cleanID);
				if (orig) {
					const merged = { ...orig, ...data, productID: cleanID };
					setLocal(KEY_PRODUCTS, [merged, ...local]);
					return { success: true };
				}
			}
			setLocal(KEY_PRODUCTS, updated);
			return { success: true };
		}
		const response = await api.put(`/products/${productID}`, data);
		return response.data;
	},

	deleteProduct: async (productID) => {
		if (USE_MOCK) {
			const cleanID = cleanProductId(productID);
			const local = getLocal(KEY_PRODUCTS);
			const updated = local.filter(p => cleanProductId(p.productID || p.id) !== cleanID);
			setLocal(KEY_PRODUCTS, updated);
			
			const deletedIds = getLocal(KEY_DELETED_PRODUCTS);
			if (!deletedIds.map(cleanProductId).includes(cleanID)) {
				deletedIds.push(cleanID);
				setLocal(KEY_DELETED_PRODUCTS, deletedIds);
			}
			return { success: true };
		}
		const response = await api.delete(`/products/${productID}`);
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
		const response = await api.get('/categories');
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
		const response = await api.post('/categories', category);
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
		const response = await api.put(`/categories/${categoryID}`, data);
		return response.data;
	},

	deleteCategory: async (categoryID) => {
		if (USE_MOCK) {
			const local = getLocal(KEY_CATEGORIES);
			const filtered = local.filter(c => String(c.categoryID) !== String(categoryID) && String(c.id) !== String(categoryID));
			setLocal(KEY_CATEGORIES, filtered);
			return { success: true };
		}
		const response = await api.delete(`/categories/${categoryID}`);
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
		const response = await api.get('/users');
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
		const response = await api.post('/users', staff);
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
		const response = await api.put(`/users/${staffID}`, data);
		return response.data;
	},

	deleteStaff: async (staffID) => {
		if (USE_MOCK) {
			const local = getLocal(KEY_STAFFS);
			const filtered = local.filter(s => String(s.userID) !== String(staffID) && String(s.id) !== String(staffID));
			setLocal(KEY_STAFFS, filtered);
			return { success: true };
		}
		const response = await api.delete(`/users/${staffID}`);
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
		const response = await api.get('/price-lists');
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
		const response = await api.post('/price-lists', payload);
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
		const response = await api.put(`/price-lists/${id}`, data);
		return response.data;
	},

	// Soft delete: chỉ chuyển trạng thái sang "Tạm dừng" để giữ lại lịch sử dữ liệu
	deletePriceList: async (id) => {
		return adminService.updatePriceList(id, { status: 'Tạm dừng' });
	},

	// Price list items (sản phẩm + giá áp dụng trong từng bảng giá)
	getPriceListItems: async (priceListId) => {
		if (USE_MOCK) {
			const local = getLocal(KEY_PRICELIST_ITEMS);
			const store = Array.isArray(local) ? {} : local;
			const apiData = fallbackPriceListItems();
			const all = store[priceListId] !== undefined ? store[priceListId] : apiData.filter(i => String(i.priceListId) === String(priceListId));
			return all;
		}
		const response = await api.get(`/price-lists/${priceListId}/items`);
		return response.data;
	},

	savePriceListItems: async (priceListId, items) => {
		if (USE_MOCK) {
			const local = getLocal(KEY_PRICELIST_ITEMS);
			const store = Array.isArray(local) ? {} : local;
			store[priceListId] = items;
			setLocal(KEY_PRICELIST_ITEMS, store);
			return { success: true };
		}
		const response = await api.put(`/price-lists/${priceListId}/items`, { items });
		return response.data;
	},

	// Khách hàng (đọc/ghi cùng nguồn dữ liệu với module Sales để 2 phân hệ luôn đồng bộ)
	getCustomers: async () => {
		if (USE_MOCK) {
			const local = getLocal(KEY_CUSTOMERS);
			const apiData = dbData.customers || [];
			const deletedIds = new Set(getLocal(KEY_DELETED_CUSTOMERS).map(Number));

			const customerMap = new Map();
			apiData.forEach(c => {
				if (!deletedIds.has(Number(c.customerID))) {
					customerMap.set(Number(c.customerID), c);
				}
			});
			local.forEach(c => customerMap.set(Number(c.customerID), c));
			return Array.from(customerMap.values());
		}
		const response = await api.get('/customers');
		return response.data?.data || response.data || [];
	},

	// Gán/bỏ gán bảng giá cho một khách hàng
	setCustomerPriceList: async (customerID, priceListId) => {
		if (USE_MOCK) {
			const local = getLocal(KEY_CUSTOMERS);
			const isLocal = local.some(c => Number(c.customerID) === Number(customerID));
			if (isLocal) {
				setLocal(KEY_CUSTOMERS, local.map(c => (
					Number(c.customerID) === Number(customerID) ? { ...c, priceListId } : c
				)));
			} else {
				const original = (dbData.customers || []).find(c => Number(c.customerID) === Number(customerID));
				if (original) {
					setLocal(KEY_CUSTOMERS, [{ ...original, priceListId }, ...local]);
				}
			}
			return { success: true };
		}
		const response = await api.put(`/customers/${customerID}`, { priceListId });
		return response.data;
	}
};

export default adminService;

