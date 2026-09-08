import { execSync } from "child_process";

try {
  console.log("Adding files...");
  execSync("git add -A", { stdio: "inherit" });
  console.log("Committing files...");
  execSync('git commit -m "Fix Vercel serverless 500 crash by dynamic loading transformers and removing onnxruntime-node"', { stdio: "inherit" });
  console.log("Pushing to origin main...");
  execSync("git push origin main", { stdio: "inherit" });
  console.log("Git commit and push complete!");
} catch (err) {
  console.error("Git error:", err.message);
}
