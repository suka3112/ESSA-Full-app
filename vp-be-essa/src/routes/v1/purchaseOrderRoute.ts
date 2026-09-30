import { Router } from "express";
import { Authenticate } from "../../middleware/authentication";
import purchaseOrderController from "../../controllers/purchaseOrderController";
import { UserRole } from "../../utils/enums/role.enum";
import { checkEntityId } from "../../middleware/customCheck.middleware";

const purchaseOrder = Router();

purchaseOrder.get(
  "/poLineItemList", // Authenticate.loginAccess,
  (req, res) => purchaseOrderController.poLineItemList(req, res),
);

purchaseOrder.post(
  "/multiplepoLineItemList", // Authenticate.loginAccess,
  (req, res) => purchaseOrderController.multiplepoLineItemList(req, res),
);

purchaseOrder.get(
  "/poDeliveryList", //Authenticate.loginAccess,
  (req, res) => purchaseOrderController.poDeliveryList(req, res),
);

purchaseOrder.get("/poList", Authenticate.loginAccess, (req, res) =>
  purchaseOrderController.poList(req, res),
);

purchaseOrder.get(
  "/goodsReceivedList", //Authenticate.loginAccess,
  (req, res) => purchaseOrderController.goodsReceivedList(req, res),
);

purchaseOrder.get(
  "/grDropdown", //Authenticate.loginAccess,
  (req, res) => purchaseOrderController.grDropdown(req, res),
);

purchaseOrder.get(
  "/poDropdown", //Authenticate.loginAccess,
  (req, res) => purchaseOrderController.poDropdown(req, res),
);

purchaseOrder.get(
  "/goodsReceivedListExport",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]), //Authenticate.loginAccess,
  (req, res, next) =>
    purchaseOrderController.goodsReceivedListExport(req, res, next),
);

purchaseOrder.get(
  "/poList/export",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  checkEntityId,
  (req, res, next) => purchaseOrderController.poListExport(req, res, next),
);

purchaseOrder.get(
  "/poLineItemList/export",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) =>
    purchaseOrderController.poLineItemListExport(req, res, next),
);

export default purchaseOrder;
