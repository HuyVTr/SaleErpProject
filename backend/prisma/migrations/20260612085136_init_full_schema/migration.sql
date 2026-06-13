-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'TRANSFER');

-- CreateEnum
CREATE TYPE "QuotationStatus" AS ENUM ('PENDING', 'SENT', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "Role" (
    "roleID" SERIAL NOT NULL,
    "roleName" TEXT NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("roleID")
);

-- CreateTable
CREATE TABLE "Group" (
    "groupID" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("groupID")
);

-- CreateTable
CREATE TABLE "User" (
    "userID" SERIAL NOT NULL,
    "lastName" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "phoneNumber" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "address" TEXT,
    "dept" TEXT,
    "roleID" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("userID")
);

-- CreateTable
CREATE TABLE "Member" (
    "memberID" SERIAL NOT NULL,
    "userID" INTEGER NOT NULL,
    "groupID" INTEGER NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("memberID")
);

-- CreateTable
CREATE TABLE "Task" (
    "taskID" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userID" INTEGER NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("taskID")
);

-- CreateTable
CREATE TABLE "Lead" (
    "leadID" SERIAL NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "company" TEXT,
    "source" TEXT,
    "status" TEXT NOT NULL,
    "userID" INTEGER NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("leadID")
);

-- CreateTable
CREATE TABLE "Activity" (
    "activityID" SERIAL NOT NULL,
    "relatedType" TEXT NOT NULL,
    "relatedID" INTEGER NOT NULL,
    "activityType" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL,
    "activityTime" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userID" INTEGER,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("activityID")
);

-- CreateTable
CREATE TABLE "Customer" (
    "customerID" SERIAL NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "address" TEXT,
    "phoneNumber" TEXT,
    "email" TEXT,
    "companyName" TEXT,
    "status" TEXT,
    "taskID" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("customerID")
);

-- CreateTable
CREATE TABLE "CustomerRequest" (
    "requestID" SERIAL NOT NULL,
    "title" TEXT,
    "content" TEXT,
    "priority" TEXT,
    "status" TEXT,
    "customerID" INTEGER NOT NULL,
    "userID" INTEGER NOT NULL,

    CONSTRAINT "CustomerRequest_pkey" PRIMARY KEY ("requestID")
);

-- CreateTable
CREATE TABLE "Contract" (
    "contractID" SERIAL NOT NULL,
    "contractCode" TEXT NOT NULL,
    "signedDate" TIMESTAMP(3),
    "priority" TEXT,
    "status" TEXT NOT NULL,
    "customerID" INTEGER NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("contractID")
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "opportunityID" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "expected_close" TIMESTAMP(3),
    "priority" INTEGER,
    "value" DECIMAL(19,2),
    "customerID" INTEGER NOT NULL,
    "assignedTo" INTEGER,
    "taskID" INTEGER,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("opportunityID")
);

-- CreateTable
CREATE TABLE "Order" (
    "orderID" SERIAL NOT NULL,
    "paymentTerm" TEXT,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "orderStatus" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "orderDate" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "deliveryDate" TIMESTAMP(3),
    "customerID" INTEGER NOT NULL,
    "opportunityID" INTEGER,
    "userID" INTEGER NOT NULL,
    "totalAmount" DECIMAL(19,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(19,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(19,2) NOT NULL DEFAULT 0,
    "paidAmount" DECIMAL(19,2) NOT NULL DEFAULT 0,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("orderID")
);

-- CreateTable
CREATE TABLE "Quotation" (
    "quotationID" SERIAL NOT NULL,
    "quotationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiration" TIMESTAMP(3),
    "paymentTerm" TEXT,
    "paymentMethod" TEXT,
    "quotationStatus" "QuotationStatus" NOT NULL DEFAULT 'PENDING',
    "customerID" INTEGER NOT NULL,
    "orderID" INTEGER,
    "userID" INTEGER NOT NULL,
    "opportunityID" INTEGER,
    "totalAmount" DECIMAL(19,2) NOT NULL DEFAULT 0,

    CONSTRAINT "Quotation_pkey" PRIMARY KEY ("quotationID")
);

-- CreateTable
CREATE TABLE "PriceList" (
    "priceListID" SERIAL NOT NULL,
    "priceListName" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "PriceList_pkey" PRIMARY KEY ("priceListID")
);

-- CreateTable
CREATE TABLE "PriceListItem" (
    "priceListItemID" SERIAL NOT NULL,
    "applyTo" TEXT NOT NULL,
    "minQTY" INTEGER NOT NULL DEFAULT 1,
    "priceType" TEXT NOT NULL,
    "discount" DECIMAL(19,2),
    "fixedPrice" DECIMAL(19,2),
    "basePrice" DECIMAL(19,2),
    "roundOffTo" DECIMAL(19,2),
    "extraFee" DECIMAL(19,2),
    "priceListID" INTEGER NOT NULL,

    CONSTRAINT "PriceListItem_pkey" PRIMARY KEY ("priceListItemID")
);

-- CreateTable
CREATE TABLE "Categories" (
    "categoryID" SERIAL NOT NULL,
    "categoryName" TEXT NOT NULL,
    "icon" TEXT DEFAULT 'package_2',
    "parentCategoryID" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'Đang hoạt động',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "priceListItemID" INTEGER,

    CONSTRAINT "Categories_pkey" PRIMARY KEY ("categoryID")
);

-- CreateTable
CREATE TABLE "Product" (
    "productID" SERIAL NOT NULL,
    "productName" TEXT NOT NULL,
    "salePrice" DECIMAL(19,2) NOT NULL,
    "cost" DECIMAL(19,2),
    "unit" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL,
    "imageURL" TEXT,
    "categoryID" INTEGER NOT NULL,
    "priceListItemID" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("productID")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "orderID" INTEGER NOT NULL,
    "productID" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(19,2) NOT NULL,
    "discount" DECIMAL(19,2) NOT NULL DEFAULT 0,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("orderID","productID")
);

-- CreateTable
CREATE TABLE "QuotationItem" (
    "quotationID" INTEGER NOT NULL,
    "productID" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(19,2) NOT NULL,
    "discount" DECIMAL(19,2) NOT NULL DEFAULT 0,

    CONSTRAINT "QuotationItem_pkey" PRIMARY KEY ("quotationID","productID")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "invoiceID" SERIAL NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "totalAmount" DECIMAL(19,2),
    "paidAmount" DECIMAL(19,2) DEFAULT 0,
    "status" TEXT,
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderID" INTEGER NOT NULL,
    "userID" INTEGER NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("invoiceID")
);

-- CreateTable
CREATE TABLE "Payment" (
    "paymentID" SERIAL NOT NULL,
    "amount" DECIMAL(19,2) NOT NULL,
    "paymentMethod" TEXT,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT,
    "invoiceID" INTEGER NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("paymentID")
);

-- CreateTable
CREATE TABLE "Warehouse" (
    "warehouseID" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("warehouseID")
);

-- CreateTable
CREATE TABLE "Inventory" (
    "inventoryID" SERIAL NOT NULL,
    "quantity" INTEGER NOT NULL,
    "updateAt" TIMESTAMP(3) NOT NULL,
    "productID" INTEGER NOT NULL,
    "warehouseID" INTEGER NOT NULL,

    CONSTRAINT "Inventory_pkey" PRIMARY KEY ("inventoryID")
);

-- CreateTable
CREATE TABLE "DeliveryStatusHistory" (
    "historyID" SERIAL NOT NULL,
    "orderID" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL,
    "userID" INTEGER,

    CONSTRAINT "DeliveryStatusHistory_pkey" PRIMARY KEY ("historyID")
);

-- CreateTable
CREATE TABLE "QuarterlyReport" (
    "reportID" SERIAL NOT NULL,
    "quarter" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "totalRevenue" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "vatOut" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "vatDeductible" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "note" TEXT,
    "breakdown" JSONB,
    "timeline" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuarterlyReport_pkey" PRIMARY KEY ("reportID")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "roleIds" INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_roleName_key" ON "Role"("roleName");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Activity_relatedType_relatedID_idx" ON "Activity"("relatedType", "relatedID");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleID_fkey" FOREIGN KEY ("roleID") REFERENCES "Role"("roleID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_userID_fkey" FOREIGN KEY ("userID") REFERENCES "User"("userID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_groupID_fkey" FOREIGN KEY ("groupID") REFERENCES "Group"("groupID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_userID_fkey" FOREIGN KEY ("userID") REFERENCES "User"("userID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_userID_fkey" FOREIGN KEY ("userID") REFERENCES "User"("userID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_userID_fkey" FOREIGN KEY ("userID") REFERENCES "User"("userID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_taskID_fkey" FOREIGN KEY ("taskID") REFERENCES "Task"("taskID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerRequest" ADD CONSTRAINT "CustomerRequest_customerID_fkey" FOREIGN KEY ("customerID") REFERENCES "Customer"("customerID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerRequest" ADD CONSTRAINT "CustomerRequest_userID_fkey" FOREIGN KEY ("userID") REFERENCES "User"("userID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_customerID_fkey" FOREIGN KEY ("customerID") REFERENCES "Customer"("customerID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_customerID_fkey" FOREIGN KEY ("customerID") REFERENCES "Customer"("customerID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "User"("userID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_taskID_fkey" FOREIGN KEY ("taskID") REFERENCES "Task"("taskID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerID_fkey" FOREIGN KEY ("customerID") REFERENCES "Customer"("customerID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_opportunityID_fkey" FOREIGN KEY ("opportunityID") REFERENCES "Opportunity"("opportunityID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userID_fkey" FOREIGN KEY ("userID") REFERENCES "User"("userID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_customerID_fkey" FOREIGN KEY ("customerID") REFERENCES "Customer"("customerID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_orderID_fkey" FOREIGN KEY ("orderID") REFERENCES "Order"("orderID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_userID_fkey" FOREIGN KEY ("userID") REFERENCES "User"("userID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_opportunityID_fkey" FOREIGN KEY ("opportunityID") REFERENCES "Opportunity"("opportunityID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceListItem" ADD CONSTRAINT "PriceListItem_priceListID_fkey" FOREIGN KEY ("priceListID") REFERENCES "PriceList"("priceListID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Categories" ADD CONSTRAINT "Categories_parentCategoryID_fkey" FOREIGN KEY ("parentCategoryID") REFERENCES "Categories"("categoryID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Categories" ADD CONSTRAINT "Categories_priceListItemID_fkey" FOREIGN KEY ("priceListItemID") REFERENCES "PriceListItem"("priceListItemID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryID_fkey" FOREIGN KEY ("categoryID") REFERENCES "Categories"("categoryID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_priceListItemID_fkey" FOREIGN KEY ("priceListItemID") REFERENCES "PriceListItem"("priceListItemID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderID_fkey" FOREIGN KEY ("orderID") REFERENCES "Order"("orderID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productID_fkey" FOREIGN KEY ("productID") REFERENCES "Product"("productID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationItem" ADD CONSTRAINT "QuotationItem_quotationID_fkey" FOREIGN KEY ("quotationID") REFERENCES "Quotation"("quotationID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationItem" ADD CONSTRAINT "QuotationItem_productID_fkey" FOREIGN KEY ("productID") REFERENCES "Product"("productID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_orderID_fkey" FOREIGN KEY ("orderID") REFERENCES "Order"("orderID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_userID_fkey" FOREIGN KEY ("userID") REFERENCES "User"("userID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceID_fkey" FOREIGN KEY ("invoiceID") REFERENCES "Invoice"("invoiceID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_productID_fkey" FOREIGN KEY ("productID") REFERENCES "Product"("productID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_warehouseID_fkey" FOREIGN KEY ("warehouseID") REFERENCES "Warehouse"("warehouseID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryStatusHistory" ADD CONSTRAINT "DeliveryStatusHistory_orderID_fkey" FOREIGN KEY ("orderID") REFERENCES "Order"("orderID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryStatusHistory" ADD CONSTRAINT "DeliveryStatusHistory_userID_fkey" FOREIGN KEY ("userID") REFERENCES "User"("userID") ON DELETE SET NULL ON UPDATE CASCADE;
