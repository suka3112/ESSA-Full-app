import { ClientSecretCredential } from "@azure/identity";
import axios from "axios";
import fs from "fs";
import { BaseController } from "../controllers/baseController";
import nodemailer = require("nodemailer");
import SMTPTransport = require("nodemailer/lib/smtp-transport");
import { User_Otp } from "../models/userOtp";
import logger from "./logger";

const isProd =
  process.env.NODE_ENV === "Prod" || process.env.NODE_ENV === "production";
const OAUTH_SCOPE = "https://outlook.office365.com/.default";
const GRAPH_SCOPE =
  "https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/User.Read offline_access";
const TOKEN_REFRESH_BUFFER_MS = 60_000;

type MailTransport = {
  transporter: nodemailer.Transporter;
  isTestAccount: boolean;
  host: string;
};

class SendEmail extends BaseController {
  private transportPromise: Promise<MailTransport> | null = null;
  private oauthCredential: ClientSecretCredential | null = null;
  private oauthAccessToken: string | null = null;
  private oauthExpiresOn = 0;
  private graphAccessToken: string | null = null;
  private graphExpiresOn = 0;
  private graphRefreshToken = String(
    process.env.GRAPH_MAIL_REFRESH_TOKEN || "",
  ).trim();

  private mailTransport(): string {
    return String(process.env.MAIL_TRANSPORT || "graph")
      .trim()
      .toLowerCase();
  }

  private getTransport() {
    if (!this.transportPromise) {
      this.transportPromise = this.createTransport().catch((error) => {
        this.transportPromise = null;
        throw error;
      });
    }
    return this.transportPromise;
  }

  private smtpUser(): string {
    return String(process.env.SMTP_USER || "").trim();
  }

  private smtpPass(): string {
    return String(process.env.SMTP_PASS || process.env.SMTP_PASSWORD || "").trim();
  }

  private smtpFrom(isTestAccount: boolean): string {
    const from = String(
      process.env.SMTP_FROM || process.env.DAIKIN_FROM_EMAIL || "",
    ).trim();
    if (from) {
      return from;
    }
    if (isTestAccount) {
      return "vendor_portal@daikinmea.com";
    }
    throw new Error("SMTP_FROM or DAIKIN_FROM_EMAIL is not configured");
  }

  private smtpCc(isTestAccount: boolean): string[] {
    if (isTestAccount) {
      return [];
    }
    const cc = String(
      process.env.SMTP_CC || process.env.DAIKIN_CC_EMAIL || "",
    ).trim();
    return cc ? [cc] : [];
  }

  private splitAddresses(value: any): string[] {
    return String(value || "")
      .split(/[,;]/)
      .map((part) => part.trim())
      .filter((part) => part.includes("@"));
  }

  private graphTokenUrl(): string {
    const tenant = String(
      process.env.GRAPH_MAIL_TENANT || "consumers",
    ).trim();
    return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;
  }

  private graphClientId(): string {
    return String(
      process.env.GRAPH_MAIL_CLIENT_ID || process.env.ENTRA_CLIENT_ID || "",
    ).trim();
  }

  private graphClientSecret(): string {
    return String(
      process.env.GRAPH_MAIL_CLIENT_SECRET ||
        process.env.ENTRA_CLIENT_SECRET ||
        "",
    )
      .trim()
      .replace(/^["']|["']$/g, "");
  }

  private async getGraphAccessToken(): Promise<string> {
    if (
      this.graphAccessToken &&
      this.graphExpiresOn > Date.now() + TOKEN_REFRESH_BUFFER_MS
    ) {
      return this.graphAccessToken;
    }

    const clientId = this.graphClientId();
    const refreshToken = this.graphRefreshToken;
    if (!clientId || !refreshToken) {
      const message =
        "Graph mail is not configured. Set GRAPH_MAIL_CLIENT_ID and GRAPH_MAIL_REFRESH_TOKEN, then run `npm run auth:outlook-graph` while signed in as avensys.dev@outlook.com.";
      logger.error(message);
      throw new Error(message);
    }

    const body = new URLSearchParams({
      client_id: clientId,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      scope: GRAPH_SCOPE,
    });
    const secret = this.graphClientSecret();
    if (secret) {
      body.set("client_secret", secret);
    }

    try {
      const response = await axios.post(this.graphTokenUrl(), body, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      const token = String(response.data?.access_token || "").trim();
      if (!token) {
        throw new Error("Graph token endpoint returned an empty access_token");
      }
      if (response.data?.refresh_token) {
        this.graphRefreshToken = String(response.data.refresh_token);
      }
      this.graphAccessToken = token;
      const expiresIn = Number(response.data?.expires_in || 3600);
      this.graphExpiresOn = Date.now() + expiresIn * 1000;
      return token;
    } catch (error: any) {
      const detail =
        error?.response?.data?.error_description ||
        error?.response?.data?.error ||
        error?.message ||
        String(error);
      const message = `Graph mail token refresh failed. Re-run npm run auth:outlook-graph. ${detail}`;
      logger.error(message);
      throw new Error(message);
    }
  }

  private safeErrorDetail(error: any): string {
    const data = error?.response?.data;
    const graph = data?.error;
    if (typeof graph === "string" && graph) {
      return graph;
    }
    if (graph?.message) {
      return String(graph.message);
    }
    if (graph?.code) {
      return String(graph.code);
    }
    if (typeof data === "string" && data) {
      return data;
    }
    if (data && typeof data === "object") {
      try {
        return JSON.stringify(data);
      } catch {
        // Axios response bodies can still fail stringify; ignore.
      }
    }
    return String(error?.message || error);
  }

  private async toGraphAttachments(attachments: any[] = []) {
    const items: Array<Record<string, string>> = [];
    for (const item of attachments || []) {
      if (!item) {
        continue;
      }
      const name = String(item.filename || item.name || "attachment");
      const contentType = String(item.contentType || "application/octet-stream")
        .split(";")[0]
        .trim();
      let contentBytes = "";
      if (item.path) {
        contentBytes = (await fs.promises.readFile(item.path)).toString(
          "base64",
        );
      } else if (item.encoding === "base64" && typeof item.content === "string") {
        contentBytes = item.content;
      } else if (Buffer.isBuffer(item.content)) {
        contentBytes = item.content.toString("base64");
      } else if (typeof item.content === "string") {
        contentBytes = Buffer.from(item.content).toString("base64");
      } else {
        continue;
      }
      items.push({
        "@odata.type": "#microsoft.graph.fileAttachment",
        name,
        contentType,
        contentBytes,
      });
    }
    return items;
  }

  private mergeCc(isTestAccount: boolean, extraCc?: any): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const address of [...this.smtpCc(isTestAccount), ...this.splitAddresses(extraCc)]) {
      const key = address.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(address);
    }
    return out;
  }

  private async sendViaGraph(
    to: any,
    subject: any,
    body: any,
    attachments: any[] = [],
    extraCc?: any,
  ) {
    const toList = this.splitAddresses(to);
    if (!toList.length) {
      throw new Error("Email recipient is missing");
    }
    const cc = this.mergeCc(false, extraCc);
    const accessToken = await this.getGraphAccessToken();
    const graphAttachments = await this.toGraphAttachments(attachments);
    const payload = {
      message: {
        subject: String(subject || ""),
        body: {
          contentType: "HTML",
          content: String(body || ""),
        },
        toRecipients: toList.map((address) => ({
          emailAddress: { address },
        })),
        ...(cc.length
          ? {
              ccRecipients: cc.map((address) => ({
                emailAddress: { address },
              })),
            }
          : {}),
        ...(graphAttachments.length ? { attachments: graphAttachments } : {}),
      },
      saveToSentItems: true,
    };

    try {
      await axios.post("https://graph.microsoft.com/v1.0/me/sendMail", payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });
      logger.info(
        `Email sent via Microsoft Graph to ${toList.join(", ")} as ${this.smtpFrom(false)}`,
      );
      return { accepted: toList, previewUrl: null as string | null };
    } catch (error: any) {
      const status = error?.response?.status;
      const detail = this.safeErrorDetail(error);
      const message =
        status === 401
          ? "Graph sendMail 401: avensys.dev@outlook.com is a guest in ESSA and has no Exchange mailbox there. Sending as Outlook.com needs a separate app registration that allows personal Microsoft accounts, GRAPH_MAIL_TENANT=consumers, and a new npm run auth:outlook-graph sign-in."
          : `Graph sendMail failed: ${detail}`;
      logger.error(message);
      throw new Error(message);
    }
  }

  // SMTP AUTH / XOAUTH2 / Ethereal / Daikin intranet — unused while
  // MAIL_TRANSPORT=graph (Outlook.com personal SMTP AUTH is disabled).
  // Set MAIL_TRANSPORT=smtp to use this path again.
  private async getOAuthAccessToken(): Promise<string> {
    if (
      this.oauthAccessToken &&
      this.oauthExpiresOn > Date.now() + TOKEN_REFRESH_BUFFER_MS
    ) {
      return this.oauthAccessToken;
    }

    const tenantId = String(process.env.ENTRA_TENANT_ID || "").trim();
    const clientId = String(process.env.ENTRA_CLIENT_ID || "").trim();
    const clientSecret = String(process.env.ENTRA_CLIENT_SECRET || "")
      .trim()
      .replace(/^["']|["']$/g, "");
    const missing = [
      !tenantId && "ENTRA_TENANT_ID",
      !clientId && "ENTRA_CLIENT_ID",
      !clientSecret && "ENTRA_CLIENT_SECRET",
    ].filter(Boolean);

    if (missing.length) {
      const message =
        `SMTP OAuth2 is not configured: missing ${missing.join(", ")}. ` +
        "Set SMTP_PASS (or SMTP_PASSWORD) for SMTP AUTH, or set the Entra client-credentials keys to use XOAUTH2.";
      logger.error(message);
      throw new Error(message);
    }

    try {
      if (!this.oauthCredential) {
        this.oauthCredential = new ClientSecretCredential(
          tenantId,
          clientId,
          clientSecret,
        );
      }
      const result = await this.oauthCredential.getToken(OAUTH_SCOPE);
      if (!result?.token) {
        throw new Error("Entra client-credentials returned an empty token");
      }
      this.oauthAccessToken = result.token;
      this.oauthExpiresOn =
        result.expiresOnTimestamp || Date.now() + 50 * 60 * 1000;
      return result.token;
    } catch (error: any) {
      if (String(error?.message || "").startsWith("SMTP OAuth2")) {
        throw error;
      }
      const detail = error?.message || String(error);
      const message =
        "SMTP OAuth2 token acquisition failed. Check Entra app has Office 365 Exchange Online SMTP send-as-app permission with admin consent, and the mailbox is granted send permission. " +
        detail;
      logger.error(message);
      throw new Error(message);
    }
  }

  private async createTransport(): Promise<MailTransport> {
    const host = String(process.env.SMTP_HOST || "").trim();
    const user = this.smtpUser();
    const pass = this.smtpPass();

    if (host) {
      const port = Number(process.env.SMTP_PORT || 587);
      const secure = process.env.SMTP_SECURE === "true";

      if (user && pass) {
        logger.info(`SMTP transport ${host}:${port} SMTP AUTH (STARTTLS)`);
        return {
          transporter: nodemailer.createTransport({
            host,
            port,
            secure,
            requireTLS: true,
            auth: { user, pass },
          }),
          isTestAccount: false,
          host,
        };
      }

      if (!user) {
        const message =
          "SMTP_USER is required when SMTP_HOST is set (SMTP AUTH or OAuth2 XOAUTH2)";
        logger.error(message);
        throw new Error(message);
      }

      const accessToken = await this.getOAuthAccessToken();
      const oauthOptions: SMTPTransport.Options = {
        host,
        port,
        secure,
        requireTLS: true,
        auth: {
          type: "OAuth2",
          user,
          accessToken,
          expires: this.oauthExpiresOn,
          provisionCallback: (_requestedUser, _renew, callback) => {
            this.getOAuthAccessToken()
              .then((token) => callback(null, token, this.oauthExpiresOn))
              .catch((err) => callback(err, "", 0));
          },
        },
      };
      logger.info(`SMTP transport ${host}:${port} OAuth2 XOAUTH2 (STARTTLS)`);
      return {
        transporter: nodemailer.createTransport(oauthOptions),
        isTestAccount: false,
        host,
      };
    }

    if (!isProd) {
      const account = await nodemailer.createTestAccount();
      logger.info(
        `Local SMTP unreachable; using Ethereal test inbox ${account.user}`,
      );
      return {
        transporter: nodemailer.createTransport({
          host: account.smtp.host,
          port: account.smtp.port,
          secure: account.smtp.secure,
          auth: { user: account.user, pass: account.pass },
        }),
        isTestAccount: true,
        host: account.smtp.host,
      };
    }

    const daikinHost = "smtp.eu.eur.daikintranet";
    logger.info(`SMTP transport ${daikinHost}:25 (prod fallback)`);
    return {
      transporter: nodemailer.createTransport({
        host: daikinHost,
        port: 25,
        secure: false,
        tls: { rejectUnauthorized: false },
      }),
      isTestAccount: false,
      host: daikinHost,
    };
  }

  private async sendViaSmtp(
    to: any,
    subject: any,
    body: any,
    attachments: any[] = [],
    extraCc?: any,
  ) {
    const { transporter, isTestAccount, host } = await this.getTransport();
    const from = this.smtpFrom(isTestAccount);
    if (!to) {
      throw new Error("Email recipient is missing");
    }
    const cc = this.mergeCc(isTestAccount, extraCc);
    const mailOptions = {
      from,
      to,
      subject,
      html: body,
      attachments: attachments ?? [],
      ...(cc.length ? { cc } : {}),
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      const previewUrl = isTestAccount
        ? nodemailer.getTestMessageUrl(info)
        : undefined;
      if (previewUrl) {
        logger.info(`Email preview: ${previewUrl}`);
      } else {
        logger.info(
          `Email sent via ${host} to ${to}${info?.messageId ? ` (${info.messageId})` : ""}`,
        );
      }
      return { ...info, previewUrl: previewUrl || undefined };
    } catch (error) {
      logger.error(`SMTP sendMail failed: ${this.safeErrorDetail(error)}`);
      throw error;
    }
  }

  private async sendViaTransport(
    to: any,
    subject: any,
    body: any,
    attachments: any[] = [],
    extraCc?: any,
  ) {
    if (this.mailTransport() === "graph") {
      return this.sendViaGraph(to, subject, body, attachments, extraCc);
    }
    return this.sendViaSmtp(to, subject, body, attachments, extraCc);
  }

  async sendEmail(
    to: any,
    subject: any,
    body: any,
    attachments: any[] = [],
    extraCc?: any,
  ) {
    return this.sendViaTransport(to, subject, body, attachments, extraCc);
  }

  async sendOtpEmail(to: any, subject: any, body: any, email: any) {
    await this.sendViaTransport(to, subject, body);
    const expiry = new Date(Date.now() + 2 * 60 * 1000);
    await User_Otp.update(
      { Expires_at: expiry },
      {
        where: {
          Email: email,
          Is_Used: false,
        },
      },
    );
  }

  async sendEmail2(to: any, subject: any, body: any, attachments: any[] = []) {
    return this.sendViaTransport(to, subject, body, attachments);
  }

  async sendReportEmail(to: any, subject: any, body: any, attachment: any) {
    return this.sendViaTransport(to, subject, body, attachment ?? []);
  }
}

export default new SendEmail();
