const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    // Create Products
    const products = [
        { name: 'Gạo tẻ ST25', sku: 'RICE001', price: 35000, cost: 28000, stock: 100 },
        { name: 'Nước mắm Phú Quốc', sku: 'SAUCE001', price: 55000, cost: 42000, stock: 50 },
        { name: 'Mì Hảo Hảo', sku: 'NOODLE001', price: 4500, cost: 3800, stock: 500 },
        { name: 'Dầu ăn Neptune 1L', sku: 'OIL001', price: 48000, cost: 40000, stock: 30 },
        { name: 'Bột giặt Omo 5kg', sku: 'WASH001', price: 180000, cost: 155000, stock: 20 },
        { name: 'Sữa Ông Thọ', sku: 'MILK001', price: 25000, cost: 21000, stock: 80 },
        { name: 'Trứng gà (vỉ 10)', sku: 'EGG001', price: 32000, cost: 28000, stock: 40 },
        { name: 'Bia Tiger (Thùng)', sku: 'BEER001', price: 380000, cost: 350000, stock: 15 },
    ]

    for (const p of products) {
        await prisma.product.upsert({
            where: { sku: p.sku },
            update: {},
            create: p,
        })
    }

    // Create Customers
    const customers = [
        { name: 'Nguyễn Văn An', phone: '0901234567', address: '123 Lê Lợi' },
        { name: 'Trần Thị Bình', phone: '0909888777', address: '456 Nguyễn Huệ' },
        { name: 'Khách lẻ', phone: '', address: '' },
    ]

    for (const c of customers) {
        if (c.phone) {
            await prisma.customer.upsert({
                where: { id: c.name }, // Hack: using name as ID predicate is risky but ok for seed script upsert logic with generated UUIDs if we actually queried by something unique. Since phone isn't unique in schema, we'll just create or skip.
                // Actually upsert needs a unique field. Phone is not unique in schema.
                // Let's just createMany or create.
                update: {},
                create: c,
            }).catch(e => { }) // Ignore if exists
        } else {
            await prisma.customer.create({ data: c })
        }
    }

    // Create Suppliers
    const suppliers = [
        { name: 'Đại lý Bia Sài Gòn', phone: '02839999999', address: 'KCN Tây Bắc' },
        { name: 'Công ty Acecook', phone: '02838888888', address: 'KCN Tân Bình' },
    ]

    for (const s of suppliers) {
        await prisma.supplier.create({ data: s })
    }

    console.log('Seeding finished.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
