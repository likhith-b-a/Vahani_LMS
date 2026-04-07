import "dotenv/config";
import { db } from "../src/db.js";
import { wishlistSeedEntries } from "../prisma/wishlistSeedData.js";

async function main() {
  const emails = [...new Set(wishlistSeedEntries.map((entry) => entry.userEmail))];

  const scholars = await db.user.findMany({
    where: {
      email: { in: emails },
      role: "scholar",
    },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });

  const scholarByEmail = new Map(scholars.map((scholar) => [scholar.email.toLowerCase(), scholar]));
  const missingEmails = emails.filter((email) => !scholarByEmail.has(email.toLowerCase()));

  if (missingEmails.length > 0) {
    throw new Error(
      `Cannot seed wishlist. Missing scholar accounts for: ${missingEmails.join(", ")}`,
    );
  }

  const seededEntries = await db.$transaction(
    wishlistSeedEntries.map((entry) => {
      const scholar = scholarByEmail.get(entry.userEmail.toLowerCase());

      return db.programmeWishlist.upsert({
        where: {
          userId_requestedTitle: {
            userId: scholar.id,
            requestedTitle: entry.requestedTitle,
          },
        },
        update: {
          note: entry.note ?? null,
        },
        create: {
          requestedTitle: entry.requestedTitle,
          note: entry.note ?? null,
          userId: scholar.id,
        },
      });
    }),
  );

  console.log(`Seeded ${seededEntries.length} wishlist entr${seededEntries.length === 1 ? "y" : "ies"}.`);
}

main()
  .catch((error) => {
    console.error("Wishlist seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
