// pnpm admin:promote you@example.com
import { PrismaClient } from "@prisma/client";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: pnpm admin:promote <email>");
    process.exit(1);
  }
  const db = new PrismaClient();
  const user = await db.user.update({
    where: { email: email.toLowerCase() },
    data: { isAdmin: true },
  });
  console.log(`Promoted ${user.email} (${user.id}) to admin.`);
  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
