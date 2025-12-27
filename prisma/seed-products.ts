import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Product data extracted from the uploaded spreadsheet
const products = [
    { name: "Dưa chuột", sku: "Mua_QLDS", unit: "kg" },
    { name: "Khổ qua", sku: "Mua_QLDS", unit: "kg" },
    { name: "Cà chua", sku: "Mua_QLDS", unit: "kg" },
    { name: "Cà chua bí", sku: "Cà_Bi", unit: "kg" },
    { name: "Mướp", sku: "Mua_QLDS", unit: "kg" },
    { name: "Cà pháo", sku: "Mua_QLDS", unit: "kg" },
    { name: "Dưa gang", sku: "Mua_QLDS", unit: "kg" },
    { name: "Bí hồ lô", sku: "Mua_QLDS", unit: "kg" },
    { name: "Bí đao", sku: "Mua_QLDS", unit: "kg" },
    { name: "Su su", sku: "Mua_QLDS", unit: "kg" },
    { name: "Súp lơ", sku: "Sup_lo", unit: "kg" },
    { name: "Bắp cải", sku: "Mua_QLDS", unit: "kg" },
    { name: "Mồng tơi", sku: "Mua_QLDS", unit: "kg" },
    { name: "Cải thảo", sku: "Mua_QLDS", unit: "kg" },
    { name: "Rau má", sku: "Mua_QLDS", unit: "kg" },
    { name: "Xà lách", sku: "Mua_QLDS", unit: "kg" },
    { name: "Cải mầm", sku: "Mua_QLDS", unit: "kg" },
    { name: "Cải xoăn", sku: "Mua_QLDS", unit: "kg" },
    { name: "Cải ngọt", sku: "Cai_ngot", unit: "kg" },
    { name: "Cải thìa", sku: "Mua_QLDS", unit: "kg" },
    { name: "Cải xanh", sku: "Mua_QLDS", unit: "kg" },
    { name: "Cải làn", sku: "Mua_QLDS", unit: "kg" },
    { name: "Cải bẹ xanh", sku: "Mua_QLDS", unit: "kg" },
    { name: "Cải bẹ dún", sku: "Mua_QLDS", unit: "kg" },
    { name: "Cải chíp", sku: "Mua_QLDS", unit: "kg" },
    { name: "Cải bó xôi", sku: "Bo_xoi", unit: "kg" },
    { name: "Chùm ngây", sku: "Mua_QLDS", unit: "kg" },
    { name: "Măng tây", sku: "Mua_QLDS", unit: "kg" },
    { name: "Bông cải xanh", sku: "Mua_QLDS", unit: "kg" },
    { name: "Đậu bắp", sku: "Mua_QLDS", unit: "kg" },
    { name: "Đậu cove", sku: "Mua_QLDS", unit: "kg" },
    { name: "Đậu đũa", sku: "Mua_QLDS", unit: "kg" },
    { name: "Đậu Hà Lan", sku: "Mua_QLDS", unit: "kg" },
    { name: "Bắp non", sku: "Bap_non", unit: "kg" },
    { name: "Bầu", sku: "Mua_QLDS", unit: "kg" },
    { name: "Bí ngòi", sku: "Mua_QLDS", unit: "kg" },
    { name: "Cà rốt", sku: "Mua_QLDS", unit: "kg" },
    { name: "Củ cải trắng", sku: "Mua_QLDS", unit: "kg" },
    { name: "Củ đậu", sku: "Mua_QLDS", unit: "kg" },
    { name: "Củ dền", sku: "Mua_QLDS", unit: "kg" },
    { name: "Gừng", sku: "Mua_QLDS", unit: "kg" },
    { name: "Khoai lang", sku: "Mua_QLDS", unit: "kg" },
    { name: "Khoai môn", sku: "Mua_QLDS", unit: "kg" },
    { name: "Khoai tây", sku: "Mua_QLDS", unit: "kg" },
    { name: "Nghệ", sku: "Mua_QLDS", unit: "kg" },
    { name: "Riềng", sku: "Mua_QLDS", unit: "kg" },
    { name: "Sả", sku: "Sa", unit: "kg" },
    { name: "Hành lá", sku: "Mua_QLDS", unit: "bó" },
    { name: "Hành tây", sku: "Mua_QLDS", unit: "kg" },
    { name: "Hành tím", sku: "Mua_QLDS", unit: "kg" },
    { name: "Tỏi", sku: "Mua_QLDS", unit: "kg" },
    { name: "Ớt", sku: "Mua_QLDS", unit: "kg" },
    { name: "Ớt chuông", sku: "Ot_chuong", unit: "kg" },
    { name: "Ớt chỉ thiên", sku: "Mua_QLDS", unit: "kg" },
    { name: "Ớt hiểm", sku: "Mua_QLDS", unit: "kg" },
    { name: "Ớt sừng", sku: "Mua_QLDS", unit: "kg" },
    { name: "Rau mùi", sku: "Rau_mui", unit: "bó" },
    { name: "Rau ngò", sku: "Mua_QLDS", unit: "bó" },
    { name: "Rau húng", sku: "Rau_hung", unit: "bó" },
    { name: "Rau kinh giới", sku: "Mua_QLDS", unit: "bó" },
    { name: "Lá lốt", sku: "Mua_QLDS", unit: "bó" },
    { name: "Rau răm", sku: "Mua_QLDS", unit: "bó" },
    { name: "Tía tô", sku: "Mua_QLDS", unit: "bó" },
    { name: "Ngò gai", sku: "Mua_QLDS", unit: "bó" },
    { name: "Ngò om", sku: "Mua_QLDS", unit: "bó" },
    { name: "Thì là", sku: "Mua_QLDS", unit: "bó" },
    { name: "Rau dền", sku: "Mua_QLDS", unit: "kg" },
    { name: "Rau muống", sku: "Rau_muong", unit: "bó" },
    { name: "Rau lang", sku: "Mua_QLDS", unit: "bó" },
    { name: "Rau đay", sku: "Mua_QLDS", unit: "bó" },
    { name: "Nấm đùi gà", sku: "Mua_QLDS", unit: "kg" },
    { name: "Nấm mỡ", sku: "Mua_QLDS", unit: "kg" },
    { name: "Nấm đông cô", sku: "Mua_QLDS", unit: "kg" },
    { name: "Nấm kim châm", sku: "Mua_QLDS", unit: "gói" },
    { name: "Nấm bào ngư", sku: "Mua_QLDS", unit: "kg" },
    { name: "Nấm hương", sku: "Mua_QLDS", unit: "kg" },
    { name: "Nấm rơm", sku: "Mua_QLDS", unit: "kg" },
    { name: "Nấm linh chi", sku: "Mua_QLDS", unit: "kg" },
    { name: "Giá đỗ", sku: "Mua_QLDS", unit: "kg" },
    { name: "Đậu phụ", sku: "Dau_phu", unit: "miếng" },
    { name: "Đậu hũ non", sku: "Mua_QLDS", unit: "hộp" },
    { name: "Dưa leo", sku: "Dua_leo", unit: "kg" },
    { name: "Mướp đắng", sku: "Muop_dang", unit: "kg" },
    { name: "Bí xanh", sku: "Bi_xanh", unit: "kg" },
    { name: "Cà tím", sku: "Ca_tim", unit: "kg" },
    { name: "Chanh", sku: "Chanh", unit: "kg" },
    { name: "Chanh dây", sku: "Chanh_day", unit: "kg" },
    { name: "Trứng gà", sku: "Trung_ga", unit: "quả" },
    { name: "Trứng vịt", sku: "Trung_vit", unit: "quả" },
    { name: "Trứng cút", sku: "Trung_cut", unit: "quả" },
    { name: "Súp lơ trắng", sku: "Sup_lo_trang", unit: "kg" },
    { name: "Rau diếp", sku: "Rau_diep", unit: "kg" },
    { name: "Rau xà lách xoong", sku: "Xa_lach_xoong", unit: "kg" },
    { name: "Củ hành tây", sku: "Cu_hanh_tay", unit: "kg" },
    { name: "Củ tỏi", sku: "Cu_toi", unit: "kg" },
    { name: "Dọc mùng", sku: "Doc_mung", unit: "kg" },
    { name: "Môn thân", sku: "Mon_than", unit: "kg" },
    { name: "Lá chuối", sku: "La_chuoi", unit: "bó" },
    { name: "Lá dong", sku: "La_dong", unit: "bó" },
];

async function main() {
    console.log("🌱 Starting product seed...");

    // First, create a default "Rau củ" category if not exists
    let vegCategory = await prisma.category.findFirst({
        where: { code: "RAU" }
    });

    if (!vegCategory) {
        vegCategory = await prisma.category.create({
            data: {
                name: "Rau củ quả",
                code: "RAU"
            }
        });
        console.log("✅ Created category: Rau củ quả");
    }

    let created = 0;
    let skipped = 0;

    for (let i = 0; i < products.length; i++) {
        const p = products[i];

        // Generate unique SKU
        const uniqueSku = `RAU-${String(i + 1).padStart(3, "0")}`;

        // Check if product with this name already exists
        const existing = await prisma.product.findFirst({
            where: { name: p.name }
        });

        if (existing) {
            console.log(`⏩ Skipped (exists): ${p.name}`);
            skipped++;
            continue;
        }

        await prisma.product.create({
            data: {
                name: p.name,
                sku: uniqueSku,
                price: 0, // Default price, to be updated later
                cost: 0,
                stock: 0,
                unit: p.unit,
                categoryId: vegCategory.id
            }
        });
        console.log(`✅ Created: ${p.name} (${uniqueSku})`);
        created++;
    }

    console.log(`\n🎉 Seed complete! Created: ${created}, Skipped: ${skipped}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
