import { shopProfiles } from "../src/data/shopProfiles";
import { loadServerEnv } from "../server/env";
import { createSupabaseShopRepositoryFromEnv } from "../server/supabaseShopRepository";

await loadServerEnv();

const repository = createSupabaseShopRepositoryFromEnv();

if (!repository) {
  console.error("缺少 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY，未写入小店目录。");
  process.exitCode = 1;
} else {
  try {
    for (const shop of shopProfiles) {
      await repository.upsertShopProfile(shop);
    }

    const remoteShops = await repository.listShopProfiles({
      category: "all",
      village: "all",
      zoom: "near"
    });

    console.log(`已写入 Supabase 小店目录：${remoteShops.length} 家`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("写入 Supabase 小店目录失败。");
    console.error(message);
    console.error("请先在 Supabase SQL Editor 执行 docs/supabase-shop-profiles.sql，然后重跑 npm run seed:shops。");
    process.exitCode = 1;
  }
}
