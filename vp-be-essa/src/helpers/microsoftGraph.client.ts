import { ClientSecretCredential } from "@azure/identity";
import { Client } from "@microsoft/microsoft-graph-client";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials";

const GRAPH_SCOPES = ["https://graph.microsoft.com/.default"];

let cachedClient: Client | null = null;

/** True when Azure app credentials are present (mailbox/SharePoint targets are separate). */
export const isGraphAppConfigured = (): boolean => {
  return Boolean(
    process.env.GRAPH_TENANT_ID &&
      process.env.GRAPH_CLIENT_ID &&
      process.env.GRAPH_CLIENT_SECRET,
  );
};

export const getGraphClient = (): Client => {
  if (cachedClient) return cachedClient;

  if (!isGraphAppConfigured()) {
    throw new Error(
      "Microsoft Graph is not configured. Set GRAPH_TENANT_ID, GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET.",
    );
  }

  const credential = new ClientSecretCredential(
    String(process.env.GRAPH_TENANT_ID),
    String(process.env.GRAPH_CLIENT_ID),
    String(process.env.GRAPH_CLIENT_SECRET),
  );

  const authProvider = new TokenCredentialAuthenticationProvider(credential, {
    scopes: GRAPH_SCOPES,
  });

  cachedClient = Client.initWithMiddleware({ authProvider });
  return cachedClient;
};
