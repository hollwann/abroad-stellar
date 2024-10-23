import dotenv from "dotenv";
import { listenToTransactions } from "./transactions";
import { producer } from "./kafka";

dotenv.config();

listenToTransactions().catch((error) => {
  console.error("Failed to start transaction listener:", error);
});

process.on("SIGINT", async () => {
  console.log("Shutting down gracefully...");
  await producer.disconnect();
  process.exit(0);
});
