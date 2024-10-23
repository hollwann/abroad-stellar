import { Horizon } from "stellar-sdk";
import { producer } from "./kafka";

const network = process.env.STELLAR_NETWORK || "testnet";

const { Server } = Horizon;

const server = new Server(
  network === "public"
    ? "https://horizon.stellar.org"
    : "https://horizon-testnet.stellar.org"
);

export async function listenToTransactions() {
  const accountId = process.env.STELLAR_ACCOUNT;
  if (!accountId) {
    throw new Error(
      "Stellar account ID is not defined in environment variables."
    );
  }

  await producer.connect();

  server
    .payments()
    .forAccount(accountId)
    .cursor("now")
    .stream({
      onmessage: async (message) => {
        message.records
          .filter(
            (record): record is Horizon.ServerApi.PaymentOperationRecord => {
              return record.type === "payment";
            }
          )
          .map(async (payment) => {
            try {
              // Filter only incoming payments
              if (payment.to !== accountId) return;

              const transaction = await payment.transaction();

              const message = {
                transactionHash: payment.transaction_hash,
                sourceAccount: payment.source_account,
                destinationAccount: payment.to,
                amount: payment.amount,
                assetType: payment.asset_type,
                assetCode: payment.asset_code,
                createdAt: payment.created_at,
                memo: transaction.memo,
                memoType: transaction.memo_type,
              };

              console.log("New transaction detected:", message);

              await producer.send({
                topic: process.env.KAFKA_TOPIC || "stellar-transactions",
                messages: [
                  {
                    key: payment.id,
                    value: JSON.stringify(message),
                  },
                ],
              });

              console.log("Transaction details sent to Kafka.");
            } catch (error) {
              console.error("Error processing payment:", error);
            }
          });
      },
      onerror: (error) => {
        console.error("Stream error:", error);
      },
    });
}
