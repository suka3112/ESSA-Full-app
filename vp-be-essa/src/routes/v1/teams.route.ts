import { Router } from "express";
import { CardFactory, MessageFactory } from "botbuilder";
import {
  approvalBot,
  buildTestApprovalCard,
  findConversationReferences,
  storedConversationRefCount,
} from "../../bots/approvalBot";
import {
  isTeamsBotConfigured,
  teamsAdapter,
} from "../../helpers/teamsBot.adapter";
import logger from "../../utils/logger";

const teamsRoutes = Router();

const requireTeamsBot = (_req: any, res: any, next: any) => {
  if (!isTeamsBotConfigured() || !teamsAdapter) {
    return res.status(503).json({
      message:
        "Teams bot is not configured. Set MicrosoftAppId, MicrosoftAppPassword, MicrosoftAppType, and MicrosoftAppTenantId.",
    });
  }
  return next();
};

teamsRoutes.post("/api/messages", requireTeamsBot, async (req, res) => {
  try {
    await teamsAdapter!.process(req, res, async (context) => {
      await approvalBot.run(context);
    });
  } catch (error) {
    logger.error("Teams /api/messages failed", error);
    if (!res.headersSent) {
      res.status(500).send("Bot error");
    }
  }
});

teamsRoutes.post(
  "/vendor-portal/teams/dev/send-test-card",
  requireTeamsBot,
  async (req, res) => {
    if (process.env.NODE_ENV === "Prod") {
      return res.status(404).json({ message: "Not found" });
    }

    const aadObjectId =
      typeof req.body?.aadObjectId === "string" ? req.body.aadObjectId : undefined;
    const upn = typeof req.body?.upn === "string" ? req.body.upn : undefined;

    const references = findConversationReferences({ aadObjectId, upn });
    if (references.length === 0) {
      return res.status(404).json({
        message:
          "No stored conversation reference. Open the bot 1:1 chat (or send a message) first.",
        storedCount: storedConversationRefCount(),
      });
    }

    const botAppId = process.env.MicrosoftAppId ?? "";
    const card = MessageFactory.attachment(
      CardFactory.adaptiveCard(buildTestApprovalCard()),
    );

    try {
      for (const reference of references) {
        await teamsAdapter!.continueConversationAsync(
          botAppId,
          reference,
          async (context) => {
            await context.sendActivity(card);
          },
        );
      }
      return res.status(200).json({
        message: "Test approval card sent",
        sent: references.length,
      });
    } catch (error) {
      logger.error("Teams send-test-card failed", error);
      return res.status(500).json({ message: "Failed to send test card" });
    }
  },
);

export default teamsRoutes;
