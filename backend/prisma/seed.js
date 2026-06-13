// Nạp dữ liệu mẫu vào database từ db.json của frontend.
// Chạy: npm run seed  (sau khi đã migrate)
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const prisma = new PrismaClient();
const __dirname = dirname(fileURLToPath(import.meta.url));

// Đọc db.json từ frontend
const db = JSON.parse(
  readFileSync(join(__dirname, "../../frontend/db.json"), "utf-8")
);

const date = (s) => (s ? new Date(s) : null);

async function main() {
  console.log("🌱 Bắt đầu nạp dữ liệu...");

  // Xóa dữ liệu cũ (theo thứ tự phụ thuộc khóa ngoại)
  await prisma.quotationItem.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.deliveryStatusHistory.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.order.deleteMany();
  await prisma.quotation.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.product.deleteMany();
  await prisma.categories.deleteMany();
  await prisma.priceListItem.deleteMany();
  await prisma.priceList.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.customerRequest.deleteMany();
  await prisma.opportunity.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.task.deleteMany();
  await prisma.member.deleteMany();
  await prisma.group.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.quarterlyReport.deleteMany();
  await prisma.notification.deleteMany();

  // Roles
  for (const r of db.roles) {
    await prisma.role.create({ data: { roleID: r.roleID, roleName: r.roleName } });
  }

  // Users — mật khẩu mặc định "123456" cho mọi tài khoản (demo)
  const hashed = await bcrypt.hash("123456", 10);
  for (const u of db.users) {
    await prisma.user.create({
      data: {
        userID: u.userID,
        lastName: u.lastName,
        firstName: u.firstName,
        dateOfBirth: date(u.dateOfBirth),
        phoneNumber: u.phoneNumber,
        email: u.email,
        password: hashed,
        address: u.address,
        dept: u.dept,
        roleID: u.roleID,
      },
    });
  }

  // Customers
  for (const c of db.customers) {
    await prisma.customer.create({
      data: {
        customerID: c.customerID,
        firstName: c.firstName,
        lastName: c.lastName,
        companyName: c.companyName,
        address: c.address,
        phoneNumber: c.phoneNumber,
        email: c.email,
        status: c.status,
      },
    });
  }

  // Categories — tạo trước các category gốc (parent null) rồi tới con
  const sortedCats = [...db.categories].sort(
    (a, b) => (a.parentCategoryID ?? 0) - (b.parentCategoryID ?? 0)
  );
  for (const cat of sortedCats) {
    await prisma.categories.create({
      data: {
        categoryID: cat.categoryID,
        categoryName: cat.categoryName,
        icon: cat.icon,
        status: cat.status,
        parentCategoryID: cat.parentCategoryID,
        createdAt: date(cat.createdAt),
      },
    });
  }

  // Products
  for (const p of db.products) {
    await prisma.product.create({
      data: {
        productID: p.productID,
        productName: p.productName,
        salePrice: p.salePrice,
        unit: p.unit,
        status: p.status,
        stockQuantity: p.stockQuantity ?? 0,
        categoryID: p.categoryID,
        createdAt: date(p.createdAt),
        updatedAt: date(p.updatedAt),
      },
    });
  }

  // Price lists + items
  for (const pl of db.priceLists) {
    await prisma.priceList.create({
      data: {
        priceListID: pl.id,
        priceListName: pl.name,
        type: pl.type,
        effectiveDate: date(pl.effectiveDate),
        status: pl.status,
        description: pl.description,
      },
    });
  }
  for (const item of db.priceListItems) {
    await prisma.priceListItem.create({
      data: {
        priceListItemID: item.id,
        priceListID: item.priceListId,
        applyTo: "Product",
        priceType: "Standard",
        products: {
          connect: { productID: item.productID }
        }
      },
    });
  }

  // Orders + items
  for (const o of db.orders) {
    await prisma.order.create({
      data: {
        orderID: o.orderID,
        orderDate: date(o.orderDate),
        deliveryDate: date(o.deliveryDate),
        paymentTerm: o.paymentTerm,
        paymentMethod: ["CASH", "TRANSFER"].includes(o.paymentMethod) ? o.paymentMethod : "CASH",
        orderStatus: o.orderStatus,
        totalAmount: o.totalAmount,
        taxAmount: o.taxAmount,
        discountAmount: o.discountAmount,
        paidAmount: o.paidAmount,
        customerID: o.customerID,
        userID: o.userID,
      },
    });
  }
  for (const it of db.orderItems) {
    await prisma.orderItem.create({
      data: {
        orderID: it.orderID,
        productID: it.productID,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        discount: it.discount,
      },
    });
  }

  // Invoices
  for (const inv of db.invoices) {
    await prisma.invoice.create({
      data: {
        invoiceID: inv.invoiceID,
        invoiceDate: date(inv.invoiceDate),
        dueDate: date(inv.dueDate),
        totalAmount: inv.totalAmount,
        paidAmount: inv.paidAmount,
        status: inv.status,
        orderID: inv.orderID,
        userID: inv.userID,
        createAt: date(inv.createAt),
      },
    });
  }

  // Payments
  for (const pay of db.payments) {
    await prisma.payment.create({
      data: {
        paymentID: pay.paymentID,
        amount: pay.amount,
        paymentMethod: pay.paymentMethod,
        paymentDate: date(pay.paymentDate),
        status: pay.status,
        invoiceID: pay.invoiceID,
      },
    });
  }

  // Quotations
  for (const q of db.quotations) {
    await prisma.quotation.create({
      data: {
        quotationID: q.quotationID,
        totalAmount: q.totalAmount,
        quotationStatus: q.status,
        quotationDate: date(q.createAt),
        customerID: q.customerID,
        userID: q.userID,
      },
    });
  }

  // Quarterly reports
  for (const r of db.quarterly_reports) {
    await prisma.quarterlyReport.create({
      data: {
        reportID: r.reportID,
        quarter: r.quarter,
        year: r.year,
        title: r.title,
        status: r.status,
        totalRevenue: r.totalRevenue,
        vatOut: r.vatOut,
        vatDeductible: r.vatDeductible,
        note: r.note,
        breakdown: r.breakdown,
        timeline: r.timeline,
        createdAt: date(r.createdAt),
      },
    });
  }

  // Notifications
  for (const n of db.notifications) {
    await prisma.notification.create({
      data: {
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        link: n.link,
        isRead: n.isRead,
        roleIds: n.roleIds ?? [],
        createdAt: date(n.createdAt),
      },
    });
  }

  console.log("✅ Nạp dữ liệu hoàn tất! Mật khẩu mọi tài khoản: 123456");
}

main()
  .catch((e) => {
    console.error("❌ Lỗi seed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
