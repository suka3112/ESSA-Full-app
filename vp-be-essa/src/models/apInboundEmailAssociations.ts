import { ApInboundEmail } from "./apInboundEmail";
import { ApInboundEmailAttachment } from "./apInboundEmailAttachment";

ApInboundEmail.hasMany(ApInboundEmailAttachment, {
  foreignKey: "InboundEmailId",
  as: "attachments",
});

ApInboundEmailAttachment.belongsTo(ApInboundEmail, {
  foreignKey: "InboundEmailId",
  as: "email",
});

export { ApInboundEmail, ApInboundEmailAttachment };
