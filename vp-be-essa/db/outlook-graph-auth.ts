/**
 * One-time browser sign-in for Graph mail (device-code is blocked by
 * Entra Security Defaults — AADSTS530035).
 *
 * Azure (ESSA AP Automation):
 * Authentication → Add a platform → Web → Redirect URI:
 *   http://localhost:53535/callback
 * Then: npm run auth:outlook-graph
 * Sign in as avensys.dev@outlook.com and paste GRAPH_MAIL_REFRESH_TOKEN into .env.dev
 */
import axios from "axios";
import { exec } from "child_process";
import { randomBytes } from "crypto";
import http from "http";
import { URL } from "url";

const tenant = String(process.env.GRAPH_MAIL_TENANT || "consumers").trim();
const clientId = String(
  process.env.GRAPH_MAIL_CLIENT_ID || process.env.ENTRA_CLIENT_ID || "",
).trim();
const clientSecret = String(
  process.env.GRAPH_MAIL_CLIENT_SECRET || process.env.ENTRA_CLIENT_SECRET || "",
)
  .trim()
  .replace(/^["']|["']$/g, "");
const scope =
  "https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/User.Read offline_access openid";
const redirectUri = "http://localhost:53535/callback";
const tokenUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;

function openBrowser(url: string) {
  const command =
    process.platform === "win32"
      ? `start "" "${url}"`
      : process.platform === "darwin"
        ? `open "${url}"`
        : `xdg-open "${url}"`;
  exec(command);
}

async function exchangeCode(code: string) {
  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    scope,
  });
  if (clientSecret) {
    body.set("client_secret", clientSecret);
  }
  const token = await axios.post(tokenUrl, body, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  const refreshToken = String(token.data?.refresh_token || "").trim();
  if (!refreshToken) {
    throw new Error(
      "No refresh_token returned. Confirm offline_access is granted with admin consent.",
    );
  }
  return refreshToken;
}

async function main() {
  if (!clientId) {
    throw new Error("Set GRAPH_MAIL_CLIENT_ID.");
  }
  if (!clientSecret) {
    throw new Error(
      "Set GRAPH_MAIL_CLIENT_SECRET or ENTRA_CLIENT_SECRET (confidential client).",
    );
  }

  const state = randomBytes(16).toString("hex");
  const authorizeUrl =
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?` +
    new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      response_mode: "query",
      scope,
      state,
      prompt: "select_account",
    }).toString();

  console.log(`Tenant: ${tenant}`);
  console.log(`Client: ${clientId}`);
  console.log("\nIf the browser does not open, go to:\n");
  console.log(`${authorizeUrl}\n`);
  console.log("Sign in as avensys.dev@outlook.com\n");

  await new Promise<void>((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url || "/", redirectUri);
        if (url.pathname !== "/callback") {
          res.writeHead(404);
          res.end();
          return;
        }
        const error = url.searchParams.get("error");
        const description = url.searchParams.get("error_description");
        if (error) {
          res.writeHead(400, { "Content-Type": "text/plain" });
          res.end(`Sign-in failed: ${description || error}`);
          server.close();
          reject(new Error(description || error));
          return;
        }
        if (url.searchParams.get("state") !== state) {
          throw new Error("OAuth state mismatch");
        }
        const code = url.searchParams.get("code");
        if (!code) {
          throw new Error("Authorization code missing");
        }
        const refreshToken = await exchangeCode(code);
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("Sign-in complete. You can close this tab and return to the terminal.");
        server.close();
        console.log("Success. Add this to .env.dev:\n");
        console.log(`GRAPH_MAIL_REFRESH_TOKEN=${refreshToken}\n`);
        resolve();
      } catch (err: any) {
        const detail =
          err?.response?.data?.error_description ||
          err?.response?.data?.error ||
          err?.message ||
          String(err);
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end(detail);
        server.close();
        reject(new Error(detail));
      }
    });
    server.on("error", reject);
    server.listen(53535, () => openBrowser(authorizeUrl));
  });
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
