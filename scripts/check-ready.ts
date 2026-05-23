import { loadServerEnv } from "../server/env";
import { evaluateLaunchReadiness } from "../server/launchReadiness";

await loadServerEnv();

const report = evaluateLaunchReadiness();
const symbol = report.overallStatus === "ready" ? "OK" : "TODO";

console.log(`村寻上线体检：${symbol}`);
console.log("");

report.items.forEach((item) => {
  const itemSymbol = item.status === "ready" ? "OK" : "TODO";
  console.log(`${itemSymbol} ${item.label}`);
  console.log(`   ${item.message}`);
});

if (report.overallStatus !== "ready") {
  console.log("");
  console.log("下一步：按上面的 TODO 补齐 .env.local 后，重启服务并再次运行 npm run check:ready。");
  process.exitCode = 1;
}
