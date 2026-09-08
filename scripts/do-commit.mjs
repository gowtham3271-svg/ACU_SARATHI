import { execSync } from "child_process";

try {
  console.log("Adding files...");
  execSync("git add -A", { stdio: "inherit" });
  console.log("Committing files...");
  execSync('git commit -m "Enhance multilingual search rewriter for Indic full-text queries and hyphen normalization"', { stdio: "inherit" });
  console.log("Pushing to origin main...");
  execSync("git push origin main", { stdio: "inherit" });
  console.log("Git commit and push complete!");
} catch (err) {
  console.error("Git error:", err.message);
}
