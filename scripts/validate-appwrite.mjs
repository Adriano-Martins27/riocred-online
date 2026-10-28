import "dotenv/config";
import { Account, Client, Databases } from "appwrite";

const ENDPOINT = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT ?? "";
const PROJECT_ID = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID ?? "";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@riocred.online";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";

const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID);

async function main() {
  console.log("Validando Appwrite…\n");

  const ping = await client.ping();
  console.log("✓ Ping:", JSON.stringify(ping));

  try {
    const db = new Databases(client);
    const profiles = await db.listDocuments("riocred", "profiles", []);
    console.log("✓ Database riocred / profiles — docs:", profiles.total);

    const admin = profiles.documents.find(
      (d) => d.email === ADMIN_EMAIL && d.role === "admin",
    );
    if (admin) {
      console.log("✓ Admin profile:", admin.fullName, `(${admin.email})`);
    } else {
      console.log("⚠ Nenhum profile admin encontrado para", ADMIN_EMAIL);
    }
  } catch (err) {
    console.log("⚠ Database/collections:", err.message);
    console.log("  Rode: npm run setup:appwrite");
  }

  if (ADMIN_PASSWORD) {
    const account = new Account(client);
    try {
      await account.createEmailPasswordSession(ADMIN_EMAIL, ADMIN_PASSWORD);
      const user = await account.get();
      console.log("✓ Login admin OK:", user.email);
      await account.deleteSession("current");
    } catch (err) {
      console.log("⚠ Login client (Node):", err.message);
      console.log("  (Normal em script Node — teste no browser em http://localhost:8081)");
      try {
        const { Client: SClient, Users } = await import("node-appwrite");
        const key = process.env.APPWRITE_API_KEY;
        if (key) {
          const sc = new SClient()
            .setEndpoint(ENDPOINT)
            .setProject(PROJECT_ID)
            .setKey(key);
          const users = new Users(sc);
          const list = await users.list({ search: ADMIN_EMAIL });
          const admin = list.users.find((u) => u.email === ADMIN_EMAIL);
          if (admin) {
            console.log("✓ Usuário admin no Auth:", admin.email, `(${admin.$id})`);
          }
        }
      } catch {
        /* ignore */
      }
    }
  }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error("✗", e.message);
  process.exit(1);
});
