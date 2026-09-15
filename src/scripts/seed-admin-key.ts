import { seedAdminKey } from "@/db/system/seed-admin-key";
import { adminKeyFilePath } from "@/db/system/admin-key-file";

async function main() {
  const seeded = await seedAdminKey();

  if (seeded) {
    console.log("✅ Admin key generated.");
    console.log(`   Admin key (put this on the device label): ${seeded}`);
    console.log(`   Also written to: ${adminKeyFilePath()}`);
  } else {
    console.log(
      "ℹ️  Admin key already set — leaving it unchanged. To rotate it, clear " +
        "the stored key first, then re-run this script.",
    );
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Failed to seed admin key:", err);
  process.exit(1);
});
