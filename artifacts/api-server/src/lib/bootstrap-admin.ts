import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { logger } from "./logger";

const ROOT_ADMIN_EMAIL = "delewaitamer7@gmail.com";

function getRootAdminPassword(): string {
  return process.env.ROOT_ADMIN_PASSWORD ?? "00Amer00";
}

/**
 * Ensures the permanent root administrator account exists and is healthy.
 * Runs on every server startup. Idempotent and safe to re-run.
 *
 * Checks:
 *   - Account exists            → create if missing
 *   - role = admin              → repair if wrong
 *   - account_status = active   → repair if wrong
 *   - is_verified = true        → repair if wrong
 *   - password hash matches ROOT_ADMIN_PASSWORD → regenerate if stale/missing
 */
export async function bootstrapRootAdmin(): Promise<void> {
  const rootPassword = getRootAdminPassword();

  const rows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, ROOT_ADMIN_EMAIL))
    .limit(1);

  if (rows.length === 0) {
    const passwordHash = await bcrypt.hash(rootPassword, 12);
    await db.insert(usersTable).values({
      email: ROOT_ADMIN_EMAIL,
      phone: null,
      passwordHash,
      name: "Root Administrator",
      role: "admin",
      isVerified: true,
      accountStatus: "active",
    } as any);
    logger.info({ email: ROOT_ADMIN_EMAIL }, "Root admin bootstrapped (created)");
    return;
  }

  const admin = rows[0]!;
  const patch: Partial<typeof usersTable.$inferInsert> = {};
  const repairs: string[] = [];

  if (admin.role !== "admin") {
    patch.role = "admin";
    repairs.push("role→admin");
  }
  if (admin.accountStatus !== "active") {
    patch.accountStatus = "active";
    repairs.push("accountStatus→active");
  }
  if (!admin.isVerified) {
    patch.isVerified = true;
    repairs.push("isVerified→true");
  }

  // Verify password hash matches current configured password.
  // Regenerate if hash is absent or password has rotated.
  const hashValid =
    admin.passwordHash.length > 0 &&
    (await bcrypt.compare(rootPassword, admin.passwordHash));
  if (!hashValid) {
    patch.passwordHash = await bcrypt.hash(rootPassword, 12);
    repairs.push("passwordHash regenerated");
  }

  if (Object.keys(patch).length > 0) {
    await db
      .update(usersTable)
      .set(patch)
      .where(eq(usersTable.email, ROOT_ADMIN_EMAIL));
    logger.info({ email: ROOT_ADMIN_EMAIL, repairs }, "Root admin repaired");
  } else {
    logger.info({ email: ROOT_ADMIN_EMAIL }, "Root admin healthy");
  }
}
