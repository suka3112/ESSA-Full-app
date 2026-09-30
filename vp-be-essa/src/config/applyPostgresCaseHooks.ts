/**
 * Remap where-clause keys to each model's real attribute casing for Postgres.
 * Import once at app startup (after dotenv).
 */
import { Model, ModelStatic } from "sequelize";
import { applyPostgresCaseHooks } from "../utils/sequelizeWhereCase";
import { sequelize } from "./sequelize";

// Ensure models are registered on the sequelize instance
import "../models/user";
import "../models/vendor";
import "../models/vendorOnboard";
import "../models/employee";
import "../models/entity";
import "../models/entityMapping";
import "../models/status";
import "../models/userRole";
import "../models/userOtp";
import "../models/uploadFiles";
import "../models/vendorBank";
import "../models/vendorBankOnboard";
import "../models/vendorEmail";
import "../models/vendorHistory";
import "../models/vendorStatement";
import "../models/vendorStatementHistory";
import "../models/vendorReconciliation";
import "../models/invoices";
import "../models/invoicesCategory";
import "../models/advancePayment";
import "../models/advancePaymentMapping";
import "../models/enquiry";
import "../models/response";
import "../models/notification";
import "../models/faqHeader";
import "../models/faqQA";
import "../models/inviteVendor";
import "../models/mastercodes";
import "../models/vimStatus";
import "../models/employeeEntityMapping";
import "../models/purchaseOrderHeader";
import "../models/purchaseOrderDetails";
import "../models/purchaseOrderDelivery";
import "../models/goodsReceipt";
import "../models/invoicePoMapping";
import "../models/GoodsReceiptInvoice";
import "../models/apDocument";
import "../models/apDocumentExtraction";
import "../models/apValidationResult";
import "../models/apExtractionAssociations";
import "../models/apInvoiceConfigAssociations";
import "../models/apInboundEmailAssociations";
import "../models/apInboundSharePoint";
import "../models/apDocumentRequestAssociations";
import "../models/essaEmailScenario";
import "../models/essaEmailScenarioVariable";
import "../models/essaEmailTemplate";
import "../models/essaEmailTemplateVersion";
import "../models/essaInvoice";
import "../models/essaSlaCalendar";
import "../models/essaSlaPolicy";
import "../models/essaSlaInstance";
import "../models/essaSlaAudit";
import "../models/essaAuditEvent";

for (const model of Object.values(sequelize.models) as ModelStatic<Model>[]) {
  applyPostgresCaseHooks(model);
}
