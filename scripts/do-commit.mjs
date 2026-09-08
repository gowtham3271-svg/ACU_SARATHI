import { execSync } from "child_process";

try {
  console.log("Adding files...");
  execSync("git add -A", { stdio: "inherit" });
  console.log("Committing files...");
  execSync('git commit -m "Fix neural voice, SSML sanitization, audio priming, and serverless cold start"', { stdio: "inherit" });
  console.log("Git commit complete!");
} catch (err) {
  console.error("Git error:", err.message);
}
