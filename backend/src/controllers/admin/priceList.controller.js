import prisma from "../../config/prisma.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

// POST /api/price-lists
export const createPriceList = asyncHandler(async (req, res) => {
  const { name, type, effectiveDate, status, description } = req.body;
  
  // Đồng bộ sequence ID của PostgreSQL tránh lỗi trùng lặp ID (409 Conflict) sau khi chạy seed
  try {
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"PriceList"', 'priceListID'), coalesce(max("priceListID"), 1)) FROM "PriceList";`);
  } catch (seqErr) {
    console.error("Không thể đồng bộ sequence cho PriceList:", seqErr);
  }

  const priceList = await prisma.priceList.create({
    data: {
      priceListName: name,
      type,
      effectiveDate: new Date(effectiveDate),
      status,
      description,
    },
  });
  res.status(201).json({
    ...priceList,
    id: priceList.priceListID,
    name: priceList.priceListName,
  });
});

// PUT /api/price-lists/:id
export const updatePriceList = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, type, effectiveDate, status, description } = req.body;
  const priceList = await prisma.priceList.update({
    where: { priceListID: Number(id) },
    data: {
      priceListName: name,
      type,
      effectiveDate: effectiveDate ? new Date(effectiveDate) : undefined,
      status,
      description,
    },
  });
  res.json({
    ...priceList,
    id: priceList.priceListID,
    name: priceList.priceListName,
  });
});

// PUT /api/price-lists/:id/items
export const savePriceListItems = asyncHandler(async (req, res) => {
  const priceListID = Number(req.params.id);
  const { items } = req.body;

  // Đồng bộ sequence ID của PriceListItem tránh lỗi 409 Conflict
  try {
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"PriceListItem"', 'priceListItemID'), coalesce(max("priceListItemID"), 1)) FROM "PriceListItem";`);
  } catch (seqErr) {
    console.error("Không thể đồng bộ sequence cho PriceListItem:", seqErr);
  }

  await prisma.$transaction(async (tx) => {
    const existingItems = await tx.priceListItem.findMany({
      where: { priceListID },
      select: { priceListItemID: true }
    });
    const ids = existingItems.map(i => i.priceListItemID);

    if (ids.length > 0) {
      await tx.product.updateMany({
        where: { priceListItemID: { in: ids } },
        data: { priceListItemID: null }
      });
    }

    await tx.priceListItem.deleteMany({
      where: { priceListID }
    });

    if (Array.isArray(items)) {
      for (const item of items) {
        await tx.priceListItem.create({
          data: {
            priceListID,
            applyTo: "Product",
            priceType: "Standard",
            fixedPrice: Number(item.price),
            products: {
              connect: { productID: Number(item.productID) }
            }
          }
        });
      }
    }
  });

  res.json({ success: true, message: "Đã cập nhật danh sách sản phẩm áp dụng" });
});
