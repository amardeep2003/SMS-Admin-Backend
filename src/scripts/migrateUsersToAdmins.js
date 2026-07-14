import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const runMigration = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("Error: MONGO_URI environment variable is missing.");
    process.exit(1);
  }

  try {
    console.log("Connecting to MongoDB...");
    const conn = await mongoose.connect(mongoUri);
    console.log("Connected successfully.");

    const db = conn.connection.db;

    // Get collections
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((c) => c.name);

    if (!collectionNames.includes("users")) {
      console.log("No 'users' collection found in the database. Nothing to migrate.");
      process.exit(0);
    }

    const usersCol = db.collection("users");
    const adminsCol = db.collection("admins");

    const users = await usersCol.find({}).toArray();
    console.log(`Found ${users.length} users in 'users' collection.`);

    if (users.length === 0) {
      console.log("No records to migrate.");
      process.exit(0);
    }

    let migratedCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      // Check if admin already exists by _id or email to prevent duplicates and ensure idempotency
      const existingAdmin = await adminsCol.findOne({
        $or: [{ _id: user._id }, { email: user.email }],
      });

      if (!existingAdmin) {
        await adminsCol.insertOne(user);
        migratedCount++;
      } else {
        skippedCount++;
      }
    }

    console.log(`Migration completed successfully.`);
    console.log(`Migrated: ${migratedCount} admins.`);
    console.log(`Skipped (already exists): ${skippedCount} admins.`);
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

runMigration();
