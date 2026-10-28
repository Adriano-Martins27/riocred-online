/**
 * Publica a Appwrite Function profile-service (functions/profile-service).
 *
 * Uso: npm run deploy:functions
 */
import "dotenv/config";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Client, Functions, Role } from "node-appwrite";
import { InputFile } from "node-appwrite/file";

const FUNCTION_ID = "profile-service";
const SOURCE_DIR = path.resolve("functions", FUNCTION_ID);

const client = new Client()
  .setEndpoint(process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);
const functions = new Functions(client);

const config = {
  functionId: FUNCTION_ID,
  name: "Profile Service",
  runtime: "node-22",
  execute: [Role.users()],
  timeout: 30,
  logging: true,
  entrypoint: "src/main.js",
  commands: "npm install --omit=dev",
  scopes: ["users.read", "users.write", "documents.read", "documents.write"],
};

try {
  await functions.get({ functionId: FUNCTION_ID });
  await functions.update(config);
  console.log("✓ function atualizada");
} catch (err) {
  if (err.code !== 404) throw err;
  await functions.create(config);
  console.log("✓ function criada");
}

const workDir = mkdtempSync(path.join(tmpdir(), "fn-"));
const archive = path.join(workDir, "code.tar.gz");
execFileSync("tar", ["-czf", archive, "-C", SOURCE_DIR, "package.json", "src"]);

const deployment = await functions.createDeployment({
  functionId: FUNCTION_ID,
  code: InputFile.fromPath(archive, "code.tar.gz"),
  activate: true,
});
rmSync(workDir, { recursive: true, force: true });
console.log("… build iniciado", deployment.$id);

for (let i = 0; i < 90; i++) {
  const d = await functions.getDeployment({
    functionId: FUNCTION_ID,
    deploymentId: deployment.$id,
  });
  if (d.status === "ready") {
    console.log("✓ deployment pronto");
    process.exit(0);
  }
  if (d.status === "failed") {
    console.error("✗ build falhou:\n", d.buildLogs);
    process.exit(1);
  }
  await new Promise((r) => setTimeout(r, 2000));
}
console.error("✗ timeout aguardando build");
process.exit(1);
