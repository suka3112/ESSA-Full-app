import {
  CloudAdapter,
  ConfigurationBotFrameworkAuthentication,
  ConfigurationServiceClientCredentialFactory,
  TurnContext,
} from "botbuilder";
import logger from "../utils/logger";

export const isTeamsBotConfigured = (): boolean =>
  Boolean(process.env.MicrosoftAppId?.trim());

let teamsAdapter: CloudAdapter | null = null;

if (isTeamsBotConfigured()) {
  const credentialsFactory = new ConfigurationServiceClientCredentialFactory({
    MicrosoftAppId: process.env.MicrosoftAppId,
    MicrosoftAppPassword: process.env.MicrosoftAppPassword,
    MicrosoftAppType: process.env.MicrosoftAppType,
    MicrosoftAppTenantId: process.env.MicrosoftAppTenantId,
  });

  const botFrameworkAuthentication = new ConfigurationBotFrameworkAuthentication(
    process.env as NodeJS.ProcessEnv & Record<string, string | undefined>,
    credentialsFactory,
  );

  teamsAdapter = new CloudAdapter(botFrameworkAuthentication);
  teamsAdapter.onTurnError = async (context: TurnContext, error: Error) => {
    logger.error("Teams bot turn error", error);
    try {
      await context.sendActivity("The bot encountered an error or bug.");
    } catch (sendError) {
      logger.error("Teams bot failed to send error activity", sendError);
    }
  };
} else {
  logger.warn(
    "Teams bot disabled: set MicrosoftAppId (and related MicrosoftApp* vars) to enable it",
  );
}

export { teamsAdapter };
