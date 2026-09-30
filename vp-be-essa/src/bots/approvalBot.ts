import {
  CardFactory,
  MessageFactory,
  TeamsActivityHandler,
  TurnContext,
} from "botbuilder";
import type {
  ConversationReference,
  InvokeResponse,
  TeamsChannelAccount,
} from "botbuilder";
import logger from "../utils/logger";

type StoredConversationRef = {
  aadObjectId?: string;
  upn?: string;
  reference: Partial<ConversationReference>;
};

/** In-memory conversation refs for the personal prototype (cleared on restart). */
const conversationRefs = new Map<string, StoredConversationRef>();

function normalizeKey(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed.toLowerCase() : undefined;
}

function accountFromActivity(activity: TurnContext["activity"]): {
  aadObjectId?: string;
  upn?: string;
} {
  const from = activity.from as (TeamsChannelAccount & { aadObjectId?: string }) | undefined;
  return {
    aadObjectId: from?.aadObjectId,
    upn: from?.userPrincipalName,
  };
}

export function saveConversationReference(context: TurnContext): void {
  const reference = TurnContext.getConversationReference(context.activity);
  const { aadObjectId, upn } = accountFromActivity(context.activity);
  const stored: StoredConversationRef = { aadObjectId, upn, reference };

  const aadKey = normalizeKey(aadObjectId);
  const upnKey = normalizeKey(upn);
  if (aadKey) {
    conversationRefs.set(aadKey, stored);
  }
  if (upnKey) {
    conversationRefs.set(upnKey, stored);
  }
  if (!aadKey && !upnKey && context.activity.from?.id) {
    conversationRefs.set(context.activity.from.id, stored);
  }
}

export function findConversationReferences(filter?: {
  aadObjectId?: string;
  upn?: string;
}): Partial<ConversationReference>[] {
  const aadKey = normalizeKey(filter?.aadObjectId);
  const upnKey = normalizeKey(filter?.upn);

  if (aadKey) {
    const hit = conversationRefs.get(aadKey);
    return hit ? [hit.reference] : [];
  }
  if (upnKey) {
    const hit = conversationRefs.get(upnKey);
    return hit ? [hit.reference] : [];
  }

  const unique = new Map<string, Partial<ConversationReference>>();
  for (const entry of conversationRefs.values()) {
    const conversationId =
      entry.reference.conversation?.id ?? JSON.stringify(entry.reference);
    unique.set(conversationId, entry.reference);
  }
  return [...unique.values()];
}

export function storedConversationRefCount(): number {
  return findConversationReferences().length;
}

export function buildTestApprovalCard(): Record<string, unknown> {
  return {
    type: "AdaptiveCard",
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    version: "1.4",
    body: [
      {
        type: "TextBlock",
        text: "Test approval",
        weight: "Bolder",
        size: "Medium",
      },
      {
        type: "TextBlock",
        text: "Approve or reject this test card (no domain workflow yet).",
        wrap: true,
      },
    ],
    actions: [
      {
        type: "Action.Submit",
        title: "Approve",
        data: { verb: "approve", msteams: { type: "invoke" } },
      },
      {
        type: "Action.Submit",
        title: "Reject",
        data: { verb: "reject", msteams: { type: "invoke" } },
      },
    ],
  };
}

function buildProcessedCard(verb: string): Record<string, unknown> {
  const outcome = verb === "approve" ? "approved" : "rejected";
  return {
    type: "AdaptiveCard",
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    version: "1.4",
    body: [
      {
        type: "TextBlock",
        text: "Processed",
        weight: "Bolder",
        size: "Medium",
      },
      {
        type: "TextBlock",
        text: `This test card was ${outcome}.`,
        wrap: true,
      },
    ],
  };
}

function getCardVerb(value: unknown): string | undefined {
  if (!value) {
    return undefined;
  }
  if (typeof value === "string") {
    try {
      return getCardVerb(JSON.parse(value));
    } catch {
      return undefined;
    }
  }
  if (typeof value !== "object") {
    return undefined;
  }
  const payload = value as Record<string, unknown>;
  if (typeof payload.verb === "string") {
    return payload.verb;
  }
  const action = payload.action as Record<string, unknown> | undefined;
  if (typeof action?.verb === "string") {
    return action.verb;
  }
  if (action?.data && typeof action.data === "object") {
    const data = action.data as Record<string, unknown>;
    if (typeof data.verb === "string") {
      return data.verb;
    }
  }
  if (payload.data && typeof payload.data === "object") {
    const data = payload.data as Record<string, unknown>;
    if (typeof data.verb === "string") {
      return data.verb;
    }
  }
  return undefined;
}

async function replaceCardWithProcessed(
  context: TurnContext,
  verb: string,
): Promise<void> {
  const activity = MessageFactory.attachment(
    CardFactory.adaptiveCard(buildProcessedCard(verb)),
  );
  if (context.activity.replyToId) {
    activity.id = context.activity.replyToId;
    await context.updateActivity(activity);
    return;
  }
  await context.sendActivity(activity);
}

export class ApprovalBot extends TeamsActivityHandler {
  constructor() {
    super();

    this.onMembersAdded(async (context, next) => {
      for (const member of context.activity.membersAdded ?? []) {
        if (member.id === context.activity.recipient.id) {
          continue;
        }
        saveConversationReference(context);
        await context.sendActivity(
          "Approval bot is ready. Send a message to echo, then use the dev send-test-card route.",
        );
      }
      await next();
    });

    this.onMessage(async (context, next) => {
      saveConversationReference(context);

      const verb = getCardVerb(context.activity.value);
      if (verb === "approve" || verb === "reject") {
        await replaceCardWithProcessed(context, verb);
        await next();
        return;
      }

      const text = (context.activity.text ?? "").trim();
      await context.sendActivity(text ? `You said: ${text}` : "You said: (empty)");
      await next();
    });
  }

  protected async handleTeamsCardActionInvoke(
    context: TurnContext,
  ): Promise<InvokeResponse> {
    saveConversationReference(context);
    const verb = getCardVerb(context.activity.value);
    if (verb !== "approve" && verb !== "reject") {
      logger.warn("Teams card invoke with unknown verb", {
        value: context.activity.value,
      });
      return { status: 400 };
    }

    await replaceCardWithProcessed(context, verb);
    return { status: 200 };
  }
}

export const approvalBot = new ApprovalBot();
