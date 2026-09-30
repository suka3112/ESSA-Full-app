//Env
import path, { join } from "path";
import dotenv from "dotenv";
import { argv } from "process";
const envFile = [".env", ".env.dev", ".env.prod"].includes(argv[2] ?? "")
  ? argv[2]
  : ".env";
dotenv.config({ path: join(__dirname, "..", envFile) });
//Middleware npm
import express from "express";
import session from "express-session";
import "./types/express-session";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import { createServer } from "http";
import { Server } from "socket.io";
//Database connection + Postgres where-key case remaps (before routes load)
import { verifyDBConnection } from "./config/sequelize";
import "./config/applyPostgresCaseHooks";
//Middlewares
import Router from "./routes";
import Encryption from "./encryption/encrypt";
import ErrorHandler from "./middleware/errorHandler.middleware";
import SocketService from "./helpers/socketService";
import sapSsoService from "./helpers/sapSso.service";
import entraSsoService from "./helpers/entraSso.service";
import { VENDOR_BASE_PATH } from "./middleware/imageUploadV1";
import logger, { errorMeta } from "./utils/logger";
import cron from "node-cron";
import { isSchedulerEnabled } from "./config/scheduler";
import { startScheduler } from "./queues";
import apEmailIntakeService from "./helpers/apEmailIntake.service";
import {
  isEmailIntakeEnabled,
  isGraphConfigured,
} from "./helpers/microsoftGraphMail.client";
import apSharePointIntakeService from "./helpers/apSharePointIntake.service";
import {
  getSharePointFiledRoot,
  getSharePointFolderPath,
  isSharePointConfigured,
  isSharePointIntakeEnabled,
} from "./helpers/microsoftGraphSharePoint.client";
import teamsRoutes from "./routes/v1/teams.route";
import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_PATH,
  isSessionCookieSecure,
  sessionCookieSameSite,
  sessionSecret,
} from "./config/sessionCookie";

process.on("unhandledRejection", (reason) => {
  // Always print to stderr first — winston must not be the only sink if it fails.
  // eslint-disable-next-line no-console
  console.error("[Process] unhandledRejection", reason instanceof Error ? reason.stack || reason.message : reason);
  logger.error("[Process] unhandledRejection", errorMeta(reason));
});

process.on("uncaughtException", (error) => {
  // eslint-disable-next-line no-console
  console.error("[Process] uncaughtException — process will exit", error?.stack || error?.message || error);
  logger.error("[Process] uncaughtException — process will exit", errorMeta(error));
  process.exit(1);
});

const PORT = process.env.PORT;
const app = express();
if (isSessionCookieSecure()) {
  app.set("trust proxy", 1);
}
// Create HTTP server
const server = createServer(app);

/** Allow long-running OCR extract + DB persistence (multi-section PDFs). */
const HTTP_SERVER_TIMEOUT_MS = parseInt(
  process.env.HTTP_SERVER_TIMEOUT_MS || String(30 * 60 * 1000),
  10,
);
server.setTimeout(HTTP_SERVER_TIMEOUT_MS);
server.headersTimeout = HTTP_SERVER_TIMEOUT_MS + 5000;
server.requestTimeout = HTTP_SERVER_TIMEOUT_MS;

// Initialize Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: "*", // Configure based on your frontend domain
    methods: ["GET", "POST"],
  },
});

// Initialize Socket Service
SocketService.initialize(io);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.static("public"));

app.use(
  helmet({
    crossOriginOpenerPolicy: false,
    crossOriginEmbedderPolicy: false,
    originAgentCluster: false,
  }),
);

app.use(
  cors({
    // Reflect request Origin so credentialed SSO session cookies work (cannot use "*")
    origin: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  }),
);

const sessionCookieSecure = isSessionCookieSecure();
const sessionSameSite = sessionCookieSameSite();

app.use(
  session({
    name: SESSION_COOKIE_NAME,
    secret: sessionSecret(),
    resave: false,
    saveUninitialized: false,
    cookie: {
      path: SESSION_COOKIE_PATH,
      secure: sessionCookieSecure,
      httpOnly: true,
      sameSite: sessionSameSite,
      maxAge: 10 * 60 * 1000,
    },
  }),
);

if (process.env.NODE_ENV === "Prod") {
  // Redirect /uploads/... to /vendor-portal/uploads/...
  app.use("/uploads", (req, res, next) => {
    const newUrl = req?.originalUrl?.replace(
      /^\/uploads/,
      "/vendor-portal/uploads",
    );
    return res.redirect(301, newUrl); // permanent redirect
  });

  // Serve the files
  app.use(
    "/vendor-portal/uploads",
    (req, res, next) => {
      res?.header("Access-Control-Allow-Origin", "*");
      res?.header("Access-Control-Allow-Methods", "GET,OPTIONS");
      res?.header("Cross-Origin-Resource-Policy", "cross-origin");
      next();
    },
    express.static(VENDOR_BASE_PATH),
  );
} else {
  app.use(
    "/uploads",
    (req, res, next) => {
      res?.header("Access-Control-Allow-Origin", "*");
      res?.header("Access-Control-Allow-Methods", "GET,OPTIONS");

      // 🔥 This is the critical fix:
      res?.header("Cross-Origin-Resource-Policy", "cross-origin");

      next();
    },
    express.static(VENDOR_BASE_PATH),
  );
}

app.use(compression());

// Bot Framework POSTs raw JSON — register before request decryption / JWT.
// app.use(teamsRoutes);

//Encryption Method
app.use(async (req: any, res: any, next) => {
  try {
    req.start = Date.now();
    if (process.env.REQ_DECRYPTION == "true") {
      await Encryption.decryptReq(req, res);
    }
    if (process.env.RES_ENCRYPTION == "true") {
      await Encryption.encryptRes(req, res);
    }

    if (process.env.REQ_DECRYPTION != "true") {
    }

    next?.();
  } catch (e) {
    logger.error("Error in requestDecryption", e);
  }
});

Router(app);
app.use(ErrorHandler);

const oidcInits: Promise<unknown>[] = [];
if (sapSsoService.isEnabled() && sapSsoService.isConfigured()) {
  oidcInits.push(sapSsoService.initOidcClient());
} else if (!sapSsoService.isEnabled()) {
  logger.warn("SAP IAS SSO is disabled; skipping IAS OIDC discovery");
} else {
  logger.warn("SAP IAS SSO is not configured; skipping IAS OIDC discovery");
}
if (entraSsoService.isConfigured()) {
  oidcInits.push(
    entraSsoService.initOidcClient().catch((err) => {
      logger.error(
        "Entra ID OIDC discovery failed; continuing without Entra SSO",
        err,
      );
    }),
  );
} else {
  logger.warn("Entra ID SSO is not configured; skipping Entra OIDC discovery");
}

verifyDBConnection()
  .then(() => Promise.all(oidcInits))
  .then(async () => {
    server.listen(PORT as any, () => {
      logger.info(`App running on port ${PORT}`);
      logger.info(
        `[SharePoint] intake=${isSharePointIntakeEnabled() ? "on" : "off"} ` +
        `filingRoot=${getSharePointFiledRoot() || "(unset)"} ` +
        `watch=${getSharePointFolderPath() || "(unset)"}`,
      );
    });

    try {
      await startScheduler();
    } catch (err) {
      logger.error("Scheduler failed to start:", err);
    }

    // Email invoice intake — M365 shared mailbox poll (disabled unless EMAIL_INTAKE_ENABLED=true)
    const emailIntakeCron =
      process.env.EMAIL_INTAKE_CRON || "*/3 * * * *";
    cron.schedule(emailIntakeCron, async () => {
      if (!isEmailIntakeEnabled() || !isGraphConfigured()) {
        return;
      }
      try {
        const result = await apEmailIntakeService.pollMailbox();
        logger.info("[EmailIntakeCron] Poll completed", {
          idle: (result as any).idle,
          scanned: (result as any).scanned,
          newQueued: (result as any).newQueued,
          retryQueued: (result as any).retryQueued,
          ocrRan: (result as any).ocrRan,
          processedOk: (result as any).processedOk,
          processedFailed: (result as any).processedFailed,
          skipped: (result as any).skipped,
        });
      } catch (err) {
        // Never pass raw Graph/Axios errors as winston splat — circular refs can
        // crash the logger and take down the process via uncaughtException.
        logger.error(`[EmailIntakeCron] Poll failed: ${(err as Error)?.message || err}`, errorMeta(err));
      }
    });

    // SharePoint invoice intake — folder poll (disabled unless SHAREPOINT_INTAKE_ENABLED=true)
    // Offset slightly from email so both Graph clients are not hammered in the same tick.
    const sharePointIntakeCron =
      process.env.SHAREPOINT_INTAKE_CRON || "1-59/3 * * * *";
    cron.schedule(sharePointIntakeCron, async () => {
      if (!isSharePointIntakeEnabled() || !isSharePointConfigured()) {
        return;
      }
      try {
        const result = await apSharePointIntakeService.pollFolder();
        logger.info("[SharePointIntakeCron] Poll completed", {
          idle: (result as any).idle,
          scanned: (result as any).scanned,
          newQueued: (result as any).newQueued,
          retryQueued: (result as any).retryQueued,
          ocrRan: (result as any).ocrRan,
          processedOk: (result as any).processedOk,
          processedFailed: (result as any).processedFailed,
          skipped: (result as any).skipped,
        });
      } catch (err) {
        logger.error(`[SharePointIntakeCron] Poll failed: ${(err as Error)?.message || err}`, errorMeta(err));
      }
    });
  })
  .catch((e) => {
    logger.error(e);
    logger.error("Startup failed (database)");
    process.exit(1);
  });
