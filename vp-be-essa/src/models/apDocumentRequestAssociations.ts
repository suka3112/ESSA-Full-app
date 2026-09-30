import { ApDocumentRequest } from "./apDocumentRequest";
import { ApDocumentRequestItem } from "./apDocumentRequestItem";

ApDocumentRequest.hasMany(ApDocumentRequestItem, {
  foreignKey: "RequestId",
  as: "items",
});

ApDocumentRequestItem.belongsTo(ApDocumentRequest, {
  foreignKey: "RequestId",
  as: "request",
});

export { ApDocumentRequest, ApDocumentRequestItem };
