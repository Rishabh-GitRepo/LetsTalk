import express from "express";

const app = express();

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "service-a",
    version: "1.0.0"
  });
});

app.listen(3001, () => {
  console.log("Service A running on port 3001");
});