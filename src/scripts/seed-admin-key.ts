import { deriveDefaultAdminKey, seedAdminKey } from "@/db/system/seed-admin-key";

async function main() {
  const seeded = await seedAdminKey();

  if (seeded) {
    console.log("✅ Admin key seeded from device MAC address.");
    console.log(`   Admin key (put this on the device label): ${seeded}`);
  } else {
    const derived = deriveDefaultAdminKey();
    if (derived) {
      console.log(
        "ℹ️  Admin key already set — leaving it unchanged. (Default would " +
          `have been ${derived}.)`,
      );
    } else {
      console.log(
        "⚠️  No admin key set and no usable MAC address found to derive one.",
      );
    }
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Failed to seed admin key:", err);
  process.exit(1);
});
