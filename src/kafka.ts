import { Kafka, logLevel } from "kafkajs";

const kafka = new Kafka({
  clientId: "stellar-kafka-microservice",
  brokers: [process.env.KAFKA_BROKER || "localhost:9092"],
  logLevel: logLevel.ERROR,
});

export const producer = kafka.producer();
