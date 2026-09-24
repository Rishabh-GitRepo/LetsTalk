import express from "express";

const app = express();

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "service-b",
    version: "1.0.0"
  });
});

app.listen(3002, () => {
  console.log("Service B running on port 3002");
});