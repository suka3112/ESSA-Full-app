import { Router } from "express";
import InvoiceController from "../../controllers/invoice.controller";
import { Authenticate } from "../../middleware/authentication";
import { UserRole } from "../../utils/enums/role.enum";

const invoiceRoutes = Router();

invoiceRoutes.post("/LineDetails", (req, res, next) =>
  InvoiceController.LineDetails(req, res, next),
);

invoiceRoutes.post("/getPoInvoice", (req, res, next) =>
  InvoiceController.getPoInvoice(req, res, next),
);

invoiceRoutes.post("/getPoInvoiceV1", (req, res, next) =>
  InvoiceController.getPoInvoiceV1(req, res, next),
);

invoiceRoutes.get(
  "/getPoInvoice/export",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) => InvoiceController.getPoInvoiceExport(req, res, next),
);

invoiceRoutes.get(
  "/invoiceList",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) => InvoiceController.getInvoices(req, res, next),
);

invoiceRoutes.get(
  "/pendingInvoiceList",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) => InvoiceController.getPendingInvoices(req, res, next),
);

invoiceRoutes.post("/invoiceListById", (req, res, next) =>
  InvoiceController.invoiceListById(req, res, next),
);

invoiceRoutes.post(
  "/AddPoInvoice",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) => InvoiceController.AddPoInvoice(req, res, next),
);

invoiceRoutes.put(
  "/editPoInvoice",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) => InvoiceController.editPoInvoice(req, res, next),
);

invoiceRoutes.put(
  "/editNonPoInvoice",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) => InvoiceController.editNonPoInvoice(req, res, next),
);

invoiceRoutes.get(
  "/invoiceList/export",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) => InvoiceController.InvoiceListExport(req, res, next),
);

invoiceRoutes.get(
  "/pendingInvoiceList/export",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) =>
    InvoiceController.pendingInvoiceListExport(req, res, next),
);

invoiceRoutes.post(
  "/AddNonPoInvoice",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) => InvoiceController.AddNonPoInvoice(req, res, next),
);

invoiceRoutes.get(
  "/getInvoiceById",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) => InvoiceController.getInvoicesByID(req, res, next),
);

invoiceRoutes.get(
  "/getCreditInvoicesByID",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) => InvoiceController.getCreditInvoicesByID(req, res, next),
);

invoiceRoutes.get(
  "/getOneInvoice",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) => InvoiceController.getCreditInvoicesByID(req, res, next),
);

invoiceRoutes.put(
  "/editCreditInvoices",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) => InvoiceController.editCreditInvoices(req, res, next),
);

invoiceRoutes.post(
  "/AddCreditNote",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) => InvoiceController.AddCreditNote(req, res, next),
);

//Logistics invoice
invoiceRoutes.post(
  "/AddLogisticsInvoice",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) => InvoiceController.AddLogisticsInvoice(req, res, next),
);
invoiceRoutes.get(
  "/mainLogisticsList",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) => InvoiceController.mainLogisticsList(req, res, next),
);
invoiceRoutes.get(
  "/logisticsListByMonth",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) => InvoiceController.logisticsListByMonth(req, res, next),
);

invoiceRoutes.get(
  "/mainLogisticsList/export",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) => InvoiceController.mainLogisticsListExport(req, res, next),
);

invoiceRoutes.get(
  "/logisticsListByMonth/export",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) =>
    InvoiceController.logisticsListByMonthExport(req, res, next),
);

invoiceRoutes.get("/invoiceDropdown", (req, res, next) =>
  InvoiceController.invoiceDropdown(req, res, next),
);

invoiceRoutes.put(
  "/editLogisticsInvoice",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) => InvoiceController.editLogisticsInvoice(req, res, next),
);

invoiceRoutes.post(
  "/logistics/bulk-submit",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) =>
    InvoiceController.bulkSubmitLogisticsInvoices(req, res, next),
);

invoiceRoutes.post(
  "/logistics/approve-reject",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) => InvoiceController.logisticsApproval(req, res, next),
);

invoiceRoutes.post(
  "/logisticsApprovalBulk/approve-reject",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) => InvoiceController.logisticsApprovalBulk(req, res, next),
);

invoiceRoutes.post(
  "/reqCreditNote",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) => InvoiceController.reqCreditNote(req, res, next),
);

invoiceRoutes.post(
  "/approve-reject",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) => InvoiceController.invoiceApprove(req, res, next),
);

invoiceRoutes.delete(
  "/deleteInvoice",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.VENDOR,
    UserRole.FINANCE,
  ]),
  (req, res, next) => InvoiceController.deleteInvoice(req, res, next),
);

export default invoiceRoutes;
