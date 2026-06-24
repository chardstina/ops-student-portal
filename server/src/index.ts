import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import swaggerUi from "swagger-ui-express";
import { config } from "./config";
import { errorHandler } from "./middleware/errors";
import { openapiSpec } from "./openapi";
import { startCron } from "./cron";

import authRoutes from "./modules/auth/auth.routes";
import studentRoutes from "./modules/students/students.routes";
import courseRoutes from "./modules/courses/courses.routes";
import paymentRoutes from "./modules/payments/payments.routes";
import webhookRoutes from "./modules/payments/webhook";
import enquiryRoutes from "./modules/enquiries/enquiries.routes";
import expenseRoutes from "./modules/expenses/expenses.routes";
import notificationRoutes from "./modules/notifications/notifications.routes";
import userRoutes from "./modules/users/users.routes";
import uploadRoutes from "./modules/uploads/uploads.routes";
import accountRoutes from "./modules/accounts/accounts.routes";

const app = express();

app.use(cors({ origin: config.clientUrl, credentials: true }));

// Stripe webhook needs the raw body — mount BEFORE express.json()
app.use("/api/webhooks", webhookRoutes);

app.use(express.json());
app.use(cookieParser());

// Static uploads (passport photos, receipts)
app.use("/uploads", express.static(path.resolve(config.uploadDir)));

app.get("/api/health", (_req, res) => res.json({ ok: true, env: config.env }));
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openapiSpec));

app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/enquiries", enquiryRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/users", userRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/accounts", accountRoutes);

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`);
  console.log(`Swagger docs: http://localhost:${config.port}/api/docs`);
  if (config.enableCron) startCron();
});
