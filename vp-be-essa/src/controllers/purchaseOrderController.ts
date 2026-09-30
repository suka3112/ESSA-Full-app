import purchaseOrderService from "../helpers/purchaseOrderService";
import { dateRange, exportFile } from "../utils/globalFunction";
import { BaseController } from "./baseController";
import constructMail from "../utils/constructMail";
import { Op } from "sequelize";
import { UserRole } from "../utils/enums/role.enum";
import { APIError } from "../utils/apiError.utils";
import { StatusCodeEnum } from "../utils/enums/status.enum";
import { NextFunction } from "express";
import VendorService from "../helpers/vendor.service";
import userService from "../helpers/user.service";
import logger from "../utils/logger";

class PurchaseOrderController extends BaseController {

  async poLineItemList(req: any, res: any) {
    try {
      const PONo = req?.query?.PONo;
      const { time_interval, start_date, end_date } = req?.query ?? {};
      const dateTimeRange: any = dateRange(time_interval, start_date, end_date);
      let limit = req?.query?.limit ? parseInt(req?.query?.limit) : 10;
      let page = req?.query?.page ? parseInt(req?.query?.page) : 1;
      let searchQuery = req?.query?.search ? req?.query?.search : "";
      let { ...query } = req?.query || {};

      const getHeaderDetails = await purchaseOrderService.poHeaderDetails(
        query
      );

      const result: any = await purchaseOrderService.listLineItem(
        limit,
        page,
        PONo,
        dateTimeRange,
        searchQuery,
        query
      );

      if (!result?.status) {
        return await this.success(
          req,
          res,
          this.status.HTTP_OK,
          result?.data,
          "No purchase Order found"
        );
      }

      let finalResult = {
        headersDetails: getHeaderDetails?.data,
        list: result?.data,
      };

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        finalResult,
        "Purchase Order Line Item Fetched successfully"
      );
    } catch (error) {
      logger.error("Error:", error);
      return await this.errors(
        req,
        res,
        this.status.HTTP_INTERNAL_SERVER_ERROR,
        this.exceptions.internalServerErr(req, error)
      );
    }
  }

  async poLineItemListExport(req: any, res: any, next: NextFunction) {
    try {
      const PONo = req?.query?.PONo;
      const { time_interval, start_date, end_date } = req?.query ?? {};
      const dateTimeRange: any = dateRange(time_interval, start_date, end_date);
      let limit = req?.query?.limit ? parseInt(req?.query?.limit) : 1000;
      let page = req?.query?.page ? parseInt(req?.query?.page) : 1;
      let searchQuery = req?.query?.search ? req?.query?.search : "";
      let { ...query } = req?.query || {};

      const format = req?.query?.format as "csv" | "xls"; // 'csv' or 'xls'
      const mode = req?.query?.mode;

      const email = req?.user?.email;

      const links: any = await userService.socialLinks(query.entity_id);

      const result: any = await purchaseOrderService.listLineItem(
        limit,
        page,
        PONo,
        dateTimeRange,
        searchQuery,
        query
      );

      if (!result?.status) {
        return await this.success(
          req,
          res,
          this.status.HTTP_OK,
          result?.data,
          "No purchase Order found"
        );
      }

      const items = (result?.data?.results ?? []).map((item: any) => ({
        line_item_no: item?.POLnNo,
        status: item?.Material_status,
        material_code: item?.Material_Code,
        material_description: item?.Material_Description,
        UOM: item?.Unit_of_measure,
        po_quantity: item?.Qty,
        open_quantity: item?.Qty,
        net_price: item?.NetAmount,
        gr_quantity: item?.GR_Qty,
        gr_value: item?.GR_value,
        ir_quantity: item?.Inv_Qty,
        ir_value: item?.IR_value,
      }));

      const isArabic = String(req?.query?.isArabic).toLowerCase() === "true";

      let headers;

      if (isArabic) {
        headers = [
          { header: "رقم عنصر أمر الشراء", key: "line_item_no" },
          { header: "الحالة", key: "status" },
          { header: "رمز المادة", key: "material_code" },
          { header: "وصف المادة", key: "material_description" },
          { header: "وحدة القياس (UOM)", key: "UOM" },
          { header: "كمية أمر الشراء", key: "po_quantity" },
          { header: "الكمية المفتوحة", key: "open_quantity" },
          { header: "السعر الصافي", key: "net_price" },
          { header: "كمية استلام البضائع (GR)", key: "gr_quantity" },
          { header: "قيمة استلام البضائع", key: "gr_value" },
          { header: "كمية الفاتورة (INV)", key: "ir_quantity" },
          { header: "قيمة الفاتورة", key: "ir_value" },
        ];
      } else {
        headers = [
          { header: "PO line item no", key: "line_item_no" },
          { header: "Status", key: "status" },
          { header: "Material Code", key: "material_code" },
          { header: "Material Description", key: "material_description" },
          { header: "UOM", key: "UOM" },
          { header: "PO Quantity", key: "po_quantity" },
          { header: "Open Quantity", key: "open_quantity" },
          { header: "Net Price", key: "net_price" },
          { header: "GR QTY", key: "gr_quantity" },
          { header: "GR Value", key: "gr_value" },
          { header: "IR QTY", key: "ir_quantity" },
          { header: "IR Value", key: "ir_value" },
        ];
      }

      if (mode === "report") {
        if (!["csv", "xls"].includes(format)) {
          throw new APIError(
            "Invalid format. Only 'csv' and 'xls' are supported.",
            StatusCodeEnum.HTTP_BAD_REQUEST
          );
        }

        await exportFile(format, items, headers, res, `invoices`);
        return;
      }

      const fields: string[] = headers.map((h) => h.key);
      await constructMail.CSVEmail(
        items,
        email,
        fields,
        headers,
        "PO Line Item Details",
        "Please find the attached file which contains the po line item details available",
        req?.user?.name || "User",
        "POLineItems.csv",
        links
      );

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        result?.data?.results,
        "Purchase Order Line Item exported and emailed successfully"
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async multiplepoLineItemList(req: any, res: any) {
    try {
      const PONo = req?.body?.PONo;
      const { time_interval, start_date, end_date } = req?.query ?? {};
      const dateTimeRange: any = dateRange(time_interval, start_date, end_date);
      let limit = req?.body?.limit ? parseInt(req?.body?.limit) : 10;
      let page = req?.body?.page ? parseInt(req?.body?.page) : 1;
      let searchQuery = req?.body?.search ? req?.body?.search : "";
      let { ...query } = req?.body || {};

      const getHeaderDetails = await purchaseOrderService.poHeaderDetails(
        query
      );

      const result: any = await purchaseOrderService.multiplelistLineItem(
        limit,
        page,
        PONo,
        dateTimeRange,
        searchQuery,
        req?.query
      );

      const sumNetValue: any = await purchaseOrderService.sumNetValue(
        limit,
        page,
        PONo,
        dateTimeRange,
        searchQuery,
        query
      );

      if (!result?.status) {
        return await this.success(
          req,
          res,
          this.status.HTTP_OK,
          result?.data,
          "No purchase Order found"
        );
      }

      let finalResult = {
        headersDetails: getHeaderDetails?.data,
        list: result?.data,
        totalNetValue: sumNetValue,
      };

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        finalResult,
        "Purchase Order Line Item Fetched successfully"
      );
    } catch (error) {
      logger.error("Error:", error);
      return await this.errors(
        req,
        res,
        this.status.HTTP_INTERNAL_SERVER_ERROR,
        this.exceptions.internalServerErr(req, error)
      );
    }
  }

  async poDeliveryList(req: any, res: any) {
    try {
      const POLnNo = req?.query?.POLnNo;
      const PONo = req?.query?.PONo;
      const { time_interval, start_date, end_date } = req?.query ?? {};
      const dateTimeRange: any = dateRange(time_interval, start_date, end_date);
      let limit = req?.query?.limit ? parseInt(req?.query?.limit) : 10;
      let page = req?.query?.page ? parseInt(req?.query?.page) : 1;
      let searchQuery = req?.query?.search ? req?.query?.search : "";
      let { ...query } = req?.query || {};

      const result: any = await purchaseOrderService.listPoDelivery(
        limit,
        page,
        POLnNo,
        dateTimeRange,
        searchQuery,
        query,
        PONo
      );

      if (!result?.status) {
        return await this.success(
          req,
          res,
          this.status.HTTP_OK,
          result?.data,
          "No purchase Order found"
        );
      }
      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        result?.data,
        "Purchase Order Fetched successfully"
      );
    } catch (error) {
      logger.error("Error:", error);
      return await this.errors(
        req,
        res,
        this.status.HTTP_INTERNAL_SERVER_ERROR,
        this.exceptions.internalServerErr(req, error)
      );
    }
  }

  async poList(req: any, res: any) {
    try {
      const id = req?.user?.vendor_id;
      const { startDate, endDate } = req?.query ?? {};
      let limit = req?.query?.limit ? parseInt(req?.query?.limit) : 10;
      let page = req?.query?.page ? parseInt(req?.query?.page) : 1;
      let searchQuery = req?.query?.search ? req?.query?.search : "";
      let { ...query } = req?.query || {};
      let payload;

      if (!req?.query?.entity_id) {
        return await this.errors(
          req,
          res,
          this.status.HTTP_BAD_REQUEST,
          "Invalid Entity Id"
        );
      }

      if (req?.user?.role_id == 1) {
        payload = { CoCd: query.entity_id, vendor_id: id };
      } else if (req?.user?.role_id == 3) {
        const vendorIds = await VendorService.getVendorsId(
          req?.user?.emp_id,
          query.entity_id
        );
        payload = { CoCd: query.entity_id, vendor_id: { [Op.in]: vendorIds } };
      } else {
        payload = { CoCd: query.entity_id };
      }

      const result: any = await purchaseOrderService.poList(
        limit,
        page,
        id,
        startDate,
        endDate,
        searchQuery,
        query,
        payload
      );

      if (!result?.status) {
        return await this.success(
          req,
          res,
          this.status.HTTP_OK,
          result?.data,
          "No purchase Order found"
        );
      }
      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        result?.data,
        "Purchase Order Fetched successfully"
      );
    } catch (error) {
      logger.error("Error:", error);
      return await this.errors(
        req,
        res,
        this.status.HTTP_INTERNAL_SERVER_ERROR,
        this.exceptions.internalServerErr(req, error)
      );
    }
  }

  async poListExport(req: any, res: any, next: NextFunction) {
    try {
      const id = req?.user?.vendor_id;
      const { startDate, endDate } = req?.query ?? {};
      let limit = req?.query?.limit ? parseInt(req?.query?.limit) : 250000;
      let page = req?.query?.page ? parseInt(req?.query?.page) : 1;
      let searchQuery = req?.query?.search ? req?.query?.search : "";
      let { ...query } = req?.query || {};
      let payload;

      const format = req?.query?.format as "csv" | "xls";
      const mode = req?.query?.mode;

      const email = req?.user?.email;

      if (!req?.query?.entity_id) {
        return await this.errors(
          req,
          res,
          this.status.HTTP_BAD_REQUEST,
          "Invalid Entity Id"
        );
      }

      if (req?.user?.role_id == UserRole.VENDOR) {
        payload = { CoCd: query.entity_id, vendor_id: id };
      } else if (req?.user?.role_id == 3) {
        const vendorIds = await VendorService.getVendorsId(
          req?.user?.emp_id,
          query.entity_id
        );
        payload = { CoCd: query.entity_id, vendor_id: { [Op.in]: vendorIds } };
      } else {
        payload = { CoCd: query.entity_id };
      }

      const result: any = await purchaseOrderService.poList(
        limit,
        page,
        id,
        startDate,
        endDate,
        searchQuery,
        query,
        payload
      );

      if (!result?.status) {
        return await this.success(
          req,
          res,
          this.status.HTTP_OK,
          result?.data,
          "No purchase Order found"
        );
      }

      let items;

      let headers;
      const isArabic = String(req?.query?.isArabic).toLowerCase() === "true";
      if (req?.user?.role_id == UserRole.VENDOR) {
        items = (result?.data?.results ?? []).map((item: any) => ({
          po_number: item?.PONo,
          po_date: new Date(item?.PO_date).toISOString().split("T")[0],
          ref_number: item?.OurRef,
          value: item?.POValue,
          currency: item?.PO_currency,
          createdBy: item.created_person?.Name,
          status: item?.POStatus,
        }));

        headers = isArabic
          ? [
            { header: "رقم أمر الشراء", key: "po_number" },
            { header: "تاريخ أمر الشراء", key: "po_date" },
            { header: "الرقم المرجعي", key: "ref_number" },
            { header: "القيمة", key: "value" },
            { header: "العملة", key: "currency" },
            { header: "أنشئ بواسطة", key: "createdBy" },
            { header: "الحالة", key: "status" },
          ]
          : [
            { header: "PO number", key: "po_number" },
            { header: "Date", key: "po_date" },
            { header: "Reference Number", key: "ref_number" },
            { header: "Value", key: "value" },
            { header: "Currency", key: "currency" },
            { header: "Created By", key: "createdBy" },
            { header: "Status", key: "status" },
          ];
      } else {
        items = (result?.data?.results ?? []).map((item: any) => ({
          po_number: item?.PONo,
          vendor_name: item.vendor?.Vendor_Name_EN || "",
          vendor_id: item?.Vendor_SAP_Code,
          po_date: new Date(item?.PO_date).toISOString().split("T")[0],
          ref_number: item?.OurRef,
          value: item?.POValue,
          currency: item?.PO_currency,
          createdBy: item.created_person?.Name,
          status: item?.POStatus || "",
        }));

        headers = isArabic
          ? [
            { header: "رقم أمر الشراء", key: "po_number" },
            { header: "اسم المورد", key: "vendor_name" },
            { header: "كود المورد", key: "vendor_id" },
            { header: "تاريخ أمر الشراء", key: "po_date" },
            { header: "الرقم المرجعي", key: "ref_number" },
            { header: "القيمة", key: "value" },
            { header: "العملة", key: "currency" },
            { header: "أنشئ بواسطة", key: "createdBy" },
            { header: "الحالة", key: "status" },
          ]
          : [
            { header: "PO number", key: "po_number" },
            { header: "Vendor Name", key: "vendor_name" },
            { header: "Vendor Code", key: "vendor_id" },
            { header: "Date", key: "po_date" },
            { header: "Reference Number", key: "ref_number" },
            { header: "Value", key: "value" },
            { header: "Currency", key: "currency" },
            { header: "Created By", key: "createdBy" },
            { header: "Status", key: "status" },
          ];
      }

      if (mode === "report") {
        if (!["csv", "xls"].includes(format)) {
          throw new APIError(
            "Invalid format. Only 'csv' and 'xls' are supported.",
            StatusCodeEnum.HTTP_BAD_REQUEST
          );
        }

        await exportFile(format, items, headers, res, `purchaseOrders`);
        return;
      }

      const fields: string[] = headers.map((h) => h.key);
      await constructMail.CSVEmailV4(
        items,
        email,
        fields,
        headers,
        "PO Details",
        "Please find the attached file which contains the PO details available",
        req?.user?.name,
        "PurchaseOrderReport.csv"
      );

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        result?.data?.results,
        "PO details exported and emailed successfully"
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async goodsReceivedList(req: any, res: any) {
    try {
      const id = req?.query?.PONo;
      const { startDate, endDate } = req?.query ?? {};
      let limit = req?.query?.limit ? parseInt(req?.query?.limit) : 10;
      let page = req?.query?.page ? parseInt(req?.query?.page) : 1;
      let searchQuery = req?.query?.search ? req?.query?.search : "";
      let { ...query } = req?.query || {};

      const result: any = await purchaseOrderService.goodsReceivedList(
        limit,
        page,
        id,
        startDate,
        endDate,
        searchQuery,
        query
      );

      if (!result?.status) {
        return await this.success(
          req,
          res,
          this.status.HTTP_OK,
          result?.data,
          "No purchase Order found"
        );
      }
      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        result?.data,
        "Purchase Order Fetched successfully"
      );
    } catch (error) {
      logger.error("Error:", error);
      return await this.errors(
        req,
        res,
        this.status.HTTP_INTERNAL_SERVER_ERROR,
        this.exceptions.internalServerErr(req, error)
      );
    }
  }

  async grDropdown(req: any, res: any) {
    try {
      const id = req?.query?.PONo;

      const result: any = await purchaseOrderService.grDropdown(id);

      if (!result?.status) {
        return await this.success(
          req,
          res,
          this.status.HTTP_OK,
          result?.data,
          "No purchase Order found"
        );
      }
      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        result?.data,
        "Purchase Order Fetched successfully"
      );
    } catch (error) {
      logger.error("Error:", error);
      return await this.errors(
        req,
        res,
        this.status.HTTP_INTERNAL_SERVER_ERROR,
        this.exceptions.internalServerErr(req, error)
      );
    }
  }

  async poDropdown(req: any, res: any) {
    try {
      const id = req?.query?.vendor_id;
      const entityId = req?.query?.entity_id;

      const result: any = await purchaseOrderService.poDropdown(
        id,
        entityId
      );

      if (!result?.status) {
        return await this.success(
          req,
          res,
          this.status.HTTP_OK,
          result?.data,
          "No purchase Order found"
        );
      }
      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        result?.data,
        "Purchase Order Fetched successfully"
      );
    } catch (error) {
      logger.error("Error:", error);
      return await this.errors(
        req,
        res,
        this.status.HTTP_INTERNAL_SERVER_ERROR,
        this.exceptions.internalServerErr(req, error)
      );
    }
  }

  async goodsReceivedListExport(req: any, res: any, next: NextFunction) {
    try {
      const id = req?.query?.PONo;
      const { startDate, endDate } = req?.query ?? {};
      let limit = req?.query?.limit ? parseInt(req?.query?.limit) : 10000;
      let page = req?.query?.page ? parseInt(req?.query?.page) : 1;
      let searchQuery = req?.query?.search ? req?.query?.search : "";
      let { ...query } = req?.query || {};

      const format = req?.query?.format as "csv" | "xls";
      const mode = req?.query?.mode;
      const email = req?.user?.email;

      const links: any = await userService.socialLinks(query.entity_id);

      const result = await purchaseOrderService.goodsReceivedList(
        limit,
        page,
        id,
        startDate,
        endDate,
        searchQuery,
        query
      );

      const items = (result?.data?.results ?? []).map((item: any) => ({
        GR_number: item?.GR_number,
        GR_item_number: item?.GR_Ln_No,
        po_no: item?.PONo,
        po_item_no: item?.POLnNo,
        material_code: item.po_detail?.Material_Code || "",
        description: item.po_detail?.Material_Description || "",
        uom: item?.Unit_of_measure,
        gr_quantity: item?.GR_quantity,
        gr_value: item?.GR_value ? Number(item?.GR_value).toFixed(2) : "0.00",
      }));
      const isArabic = String(req?.query?.isArabic).toLowerCase() === "true";
      let headers;
      if (isArabic) {
        headers = [
          { header: "رقم عنصر أمر الشراء", key: "po_item_no" },
          { header: "رقم الإيصال", key: "GR_number" },
          { header: "رقم عنصر الاستلام", key: "GR_item_number" },
          { header: "رمز المادة", key: "material_code" },
          { header: "وصف المادة", key: "description" },
          { header: "وحدة القياس (UOM)", key: "uom" },
          { header: "كمية استلام البضائع (GR)", key: "gr_quantity" },
          { header: "قيمة استلام البضائع", key: "gr_value" },
        ];
      } else {
        headers = [
          { header: "PO item no", key: "po_item_no" },
          { header: "GR Number", key: "GR_number" },
          { header: "GR item number", key: "GR_item_number" },
          { header: "Material code", key: "material_code" },
          { header: "Material Description", key: "description" },
          { header: "UOM", key: "uom" },
          { header: "GR Quantity", key: "gr_quantity" },
          { header: "GR value", key: "gr_value" },
        ];
      }

      if (mode === "report") {
        if (!["csv", "xls"].includes(format)) {
          throw new APIError(
            "Invalid format. Only 'csv' and 'xls' are supported.",
            StatusCodeEnum.HTTP_BAD_REQUEST
          );
        }

        await exportFile(format, items, headers, res, `GRdetails`);
        return;
      }

      const fields: string[] = headers.map((h) => h.key);
      await constructMail.CSVEmail(
        items,
        email,
        fields,
        headers,
        "GR Details",
        "Please find the attached file which contains the GR details available",
        req?.user?.name || "User",
        "GRReport.csv",
        links
      );

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        result?.data?.results,
        "GR details exported and emailed successfully"
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }
}

export default new PurchaseOrderController();
