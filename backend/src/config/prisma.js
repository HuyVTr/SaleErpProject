import { PrismaClient } from "@prisma/client";

// Một instance PrismaClient dùng chung cho toàn app
const prisma = new PrismaClient();

export default prisma;
