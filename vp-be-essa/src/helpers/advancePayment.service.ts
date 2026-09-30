import { BaseController } from "../controllers/baseController";
import { AdvancePayment } from "../models/advancePayment";
import { Op, Sequelize, where, WhereOptions } from "sequelize";
import { sequelize } from "../config/sequelize";
import { UploadFiles } from "../models/uploadFiles";
import pagination from "../utils/pagination";
import { Parser } from "json2csv";
import fs from "fs";
import path from "path";
import constructMail from "../utils/constructMail";
import { User } from "../models/user";
import { InvoiceHeader } from "../models/invoices";
import { Vendor } from "../models/vendor";
import { APIError } from "../utils/apiError.utils";
import { StatusCodeEnum } from "../utils/enums/status.enum";
import { convertToSequalizeDate } from "../utils/globalFunction";
import { AdvancePaymentInvoiceMapping } from "../models/advancePaymentMapping";
import vendorService from "./vendor.service";
import userService from "./user.service";
import {
  FileCategories,
  NotificationCategory,
} from "../utils/enums/category.enum";
import { Status } from "../models/status";
import notificationService from "../helpers/notiticationService";
import { Employee } from "../models/employee";
import { Entity } from "../models/entity";
import logger from "../utils/logger";

const STATUS_MAPPING: any = {
  1: "Submitted for Review",
  2: "Under Review",
  3: "Under Approval",
  4: "Approved",
  5: "Rejected",
  6: "Paid",
  7: "Draft",
};
class AdvancePaymentService extends BaseController {
  async createAdvancePayment(
    body: any,
    userId: string,
    entity_id: any,
    vendorId: number,
  ) {
    const transaction = await sequelize.transaction();
    try {
      const newPayment = await AdvancePayment.create(
        {
          Type_of_invoice: body?.type_of_invoice,
          Value: body?.value,
          Performa_Invoice_Number: body?.Performa_Invoice_Number
            ? body?.Performa_Invoice_Number
            : null,
          submitted_Date: Sequelize.literal("NOW()"),
          Currency: body?.currency,
          Cost_responsible: body?.cost_responsible,
          Vendor_id: vendorId,
          CoCd: entity_id,
          Advance_payment_raised_by: userId,
          CreatedBy: userId,
          Submitted_By: userId,
          Advance_Payment_Status: body?.Advance_Payment_Status,
        },
        { transaction },
      );

      const invoiceData = (body?.invoices ?? []).map((invoice: any) => ({
        Advance_Payment_Id: newPayment?.ID,
        PO_Header_Id: invoice?.inv_number,
        CreatedBy: userId,
      }));

      await AdvancePaymentInvoiceMapping.bulkCreate(invoiceData, {
        transaction,
      });

      if (body?.upload_files && body?.upload_files?.length > 0) {
        for (const fileObj of body?.upload_files) {
          await UploadFiles.findOrCreate({
            where: {
              Main_Id: newPayment?.ID,
              File_name: fileObj?.originalName,
              Category_id: 5,
              Is_deleted: false,
            },
            defaults: {
              Upload_files: fileObj?.upload_files,
              Attachment_type: fileObj?.attachment_type,
              File_name: fileObj?.originalName,
              Main_Id: newPayment?.ID,
              Category_id: 5,
              Is_deleted: false,
            },
            transaction,
          });
        }
      }

      const vendorDetails = await vendorService.getVendorCR(vendorId);

      const cr_person = await userService.getUserService({
        Employee_Id: body?.cost_responsible,
      });

      const getEntity = await Entity.findOne({
        where: { CoCd: entity_id },
        attributes: ["Entity_Name", "ID"],
      });

      const links: any = await userService.socialLinks(newPayment?.CoCd);
      if (body?.Advance_Payment_Status == 1) {
        await constructMail.sendAdvanceSubmissionToVIM({
          email: cr_person?.Email,
          user: cr_person?.Name,
          subject: `New Advance Payment request from ${vendorDetails?.Vendor_Name_EN}`,
          vendorName: vendorDetails?.Vendor_Name_EN,
          entityCode: vendorDetails?.CoCd,
          entityName: getEntity?.Entity_Name,
          vendorCode: vendorDetails?.Vendor_SAP_Code,
          invoiceRef: newPayment?.Advance_payment_code,
          linkedIn: links?.LinkedIn_Link,
          facebook: links?.Facebook_Link,
          instagram: links?.Instagram_Link,
          twitter: links?.Twitter_Link,
          youtube: links?.YouTube_Link,
        });

        await notificationService.createNotification({
          User_Id: cr_person?.ID,
          Vendor_Id: vendorId,
          Entity_Id: entity_id,
          Message: `New Advance Payment Request created with reference number ${newPayment?.Advance_payment_code}`,
          Module_Category_Id: NotificationCategory.Advance_Payment,
          Redirect_Id: newPayment?.ID,
          CreatedBy: userId,
        });
      }

      await transaction.commit();

      return { status: true, data: newPayment };
    } catch (error) {
      logger.error("Error:", error);
      await transaction.rollback();
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async submitAdvancePayment(
    paymentId: number,
    userId: number,
    updatedData: any,
    vendorId: number,
    entity_id: any,
  ) {
    try {
      const updatedPayment = await AdvancePayment.update(
        {
          Type_of_invoice: updatedData?.type_of_invoice,
          Value: updatedData?.value,
          Performa_Invoice_Number: updatedData?.Performa_Invoice_Number,
          Currency: updatedData?.currency,
          Cost_responsible: updatedData?.cost_responsible,
          Advance_Payment_Status: updatedData?.Advance_Payment_Status,
        },
        {
          where: {
            ID: updatedData?.ID, // Advance_payment_raised_by: userId
          },
        },
      );

      if (updatedPayment[0] === 0) {
        throw new APIError(
          "Payment not found or already submitted.",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      if (updatedData?.upload_files && updatedData?.upload_files?.length > 0) {
        for (const fileObj of updatedData?.upload_files) {
          await UploadFiles.findOrCreate({
            where: {
              Main_Id: updatedData?.ID,
              File_name: fileObj?.originalName,
              Upload_files: fileObj?.upload_files,
              Category_id: 5,
              Is_deleted: false,
            },
            defaults: {
              Upload_files: fileObj?.upload_files,
              Attachment_type: fileObj?.attachment_type,
              File_name: fileObj?.originalName,
              Main_Id: updatedData?.ID,
              Category_id: 5,
              Is_deleted: false,
            },
          });
        }
      }

      const vendorDetails = await vendorService.getVendorCR(vendorId);
      const paymentRecord = await AdvancePayment.findOne({
        where: { ID: updatedData?.ID },
      });

      const cr_person = await User.findOne({
        where: { Employee_Id: paymentRecord?.Cost_responsible },
      });

      const getEntity = await Entity.findOne({
        where: { CoCd: entity_id },
        attributes: ["Entity_Name", "ID"],
      });

      const data = await AdvancePayment.findOne({
        where: { ID: paymentId },
      });

      const links: any = await userService.socialLinks(updatedData?.CoCd);
      if (updatedData?.Advance_Payment_Status == 1) {
        await notificationService.createNotification({
          User_Id: cr_person?.ID,
          Vendor_Id: vendorId,
          Entity_Id: paymentRecord?.CoCd,
          Message: `New Advance Payment Request created with reference number ${paymentRecord?.Advance_payment_code}`,
          Module_Category_Id: NotificationCategory.Advance_Payment,
          Redirect_Id: paymentRecord?.ID,
          CreatedBy: userId,
        });
        await constructMail.sendAdvanceSubmissionToVIM({
          email: cr_person?.Email,
          user: cr_person?.Name,
          subject: `New Advance Payment request from ${vendorDetails?.Vendor_Name_EN}`,
          vendorName: vendorDetails?.Vendor_Name_EN,
          entityCode: vendorDetails?.CoCd,
          entityName: getEntity?.Entity_Name,
          vendorCode: vendorDetails?.Vendor_SAP_Code,
          invoiceRef: data?.Advance_payment_code,
          linkedIn: links?.LinkedIn_Link,
          facebook: links?.Facebook_Link,
          instagram: links?.Instagram_Link,
          twitter: links?.Twitter_Link,
          youtube: links?.YouTube_Link,
        });
      }

      return {
        status: true,
        message: "Advance payment submitted successfully.",
      };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async getAdvancePayments({
    page,
    limit,
    search,
    status,
    startDate,
    endDate,
    sort,
    sort_column,
    entity_id,
    userId,
    vendorIds,
  }: any) {
    let pageNumber = page ? parseInt(page) : 1;
    let limitNumber = limit ? parseInt(limit) : 15;
    let offset = (pageNumber - 1) * limitNumber;

    let sortField = sort_column || "CreatedDt";
    let sortDirection = sort || "DESC";

    const order: any = [];

    switch (sortField) {
      case "id":
        order.push(["ID", sortDirection]);
        break;
      case "type_of_invoice":
        order.push(["Type_of_invoice", sortDirection]);
        break;
      case "value":
        order.push(["Value", sortDirection]);
        break;
      case "submitted_date":
        order.push(["Submitted_Date", sortDirection]);
        break;
      case "status":
        order.push(["Advance_Payment_Status", sortDirection]);
        break;
      default:
        order.push([sortField, sortDirection]);
        break;
    }

    let searchCondition = {};

    let where: any = {
      Is_Deleted: false,
      CoCd: entity_id,
      // ...(userId && { Advance_payment_raised_by: userId }),
      [Op.or]: [
        // Case 1: Created by the current user — allow all statuses including 7
        { Advance_payment_raised_by: userId },

        // Case 2: Not status 7 — applies to everyone else
        {
          Advance_Payment_Status: { [Op.ne]: 7 },
        },
      ],
    };

    if (vendorIds?.length) {
      where.Vendor_id = { [Op.in]: vendorIds };
    }

    if (search) {
      where[Op.and] = [
        {
          [Op.or]: [
            { Advance_Payment_Code: { [Op.like]: `%${search}%` } },
            sequelize.where(sequelize.col("vendorInfo.Vendor_Name_EN"), {
              [Op.like]: `%${search}%`,
            }),
            sequelize.where(sequelize.col("vendorInfo.Vendor_SAP_Code"), {
              [Op.like]: `%${search}%`,
            }),
          ],
        },
      ];
    }

    if (status) {
      where.Advance_Payment_Status = Number(status);
    }

    if (startDate && endDate) {
      where.Submitted_Date = {
        [Op.between]: [
          convertToSequalizeDate(startDate),
          convertToSequalizeDate(endDate),
        ],
      };
    } else if (startDate) {
      where.Submitted_Date = { [Op.gte]: convertToSequalizeDate(startDate) };
    } else if (endDate) {
      where.Submitted_Date = { [Op.lte]: convertToSequalizeDate(endDate) };
    }

    try {
      const payments = await AdvancePayment.findAndCountAll({
        where,
        limit: limitNumber,
        offset: offset,
        order: order,
        attributes: { exclude: ["ModifiedDt", "Is_Deleted"] },
        // raw: true,
        include: [
          {
            model: Status,
            as: "status",
            attributes: [
              "ID",
              "Status_classification",
              "Status_description",
              "Status_description_arabic",
            ],
          },
          {
            model: Employee,
            as: "cr_person_data",
            attributes: ["ID", "Employee_Name"],
          },
          {
            model: Vendor,
            as: "vendorInfo",
            attributes: ["Vendor_Name_EN", "ID", "Vendor_SAP_Code"],
          },
        ],
      });

      const result = pagination.paginationData(
        limitNumber,
        pageNumber,
        payments,
      );

      return { status: true, data: result };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async getAdvancePaymentsOfEntity({
    page,
    limit,
    search,
    status,
    startDate,
    endDate,
    sort,
    sort_column,
    entity_id,
  }: any) {
    let pageNumber = page ? parseInt(page) : 1;
    let limitNumber = limit ? parseInt(limit) : 15;
    let offset = (pageNumber - 1) * limitNumber;

    let sortField = sort_column || "submission_date";
    let sortDirection = sort || "DESC";

    const order: any = [];

    switch (sortField) {
      case "id":
        order.push(["id", sortDirection]);
        break;
      case "type_of_invoice":
        order.push(["type_of_invoice", sortDirection]);
        break;
      case "value_of_advance_payment":
        order.push(["value_of_advance_payment", sortDirection]);
        break;
      case "submission_date":
        order.push(["submission_date", sortDirection]);
        break;
      case "status":
        order.push(["status", sortDirection]);
        break;
      default:
        order.push([sortField, sortDirection]);
        break;
    }

    let where: any = {
      is_deleted: false,
      [Op.or]: [
        { "$poInvoiceInfo.entity_id$": 1 },
        { "$nonPoInvoiceInfo.entity_id$": 1 },
      ],
    };

    if (search && !isNaN(search)) {
      where.id = parseInt(search);
    }

    if (status) {
      where.status = status;
    }

    if (startDate && endDate) {
      where.submission_date = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    } else if (startDate) {
      where.submission_date = { [Op.gte]: new Date(startDate) };
    } else if (endDate) {
      where.submission_date = { [Op.lte]: new Date(endDate) };
    }

    try {
      const payments: any = await AdvancePayment.findAndCountAll({
        where: {
          is_deleted: false,
          [Op.or]: [
            { po_based_invoice: { [Op.ne]: null } },
            { non_po_based_invoice: { [Op.ne]: null } },
          ],
        },
        include: [
          {
            model: InvoiceHeader,
            as: "poInvoiceInfo",
            attributes: ["id", "entity_id"],
            where: {
              entity_id: entity_id,
              id: Sequelize.col("AdvancePayment.po_based_invoice"),
            }, // Filtering inside include
            required: false, // Use false to include AdvancePayment even if no matching po-based invoice
          },
          {
            model: InvoiceHeader,
            as: "nonPoInvoiceInfo",
            attributes: ["id", "entity_id"],
            where: {
              entity_id: entity_id,
              id: Sequelize.col("AdvancePayment.non_po_based_invoice"),
            }, // Filtering inside include
            required: false, // Use false to include AdvancePayment even if no matching non-po-based invoice
          },
          {
            model: Vendor,
            as: "vendorInfo",
            attributes: ["vendor_name", "id"],
          },
        ],
        limit: limitNumber,
        offset: offset,
        order: order,
        attributes: { exclude: ["updatedAt", "is_deleted"] },
        raw: true,
      });

      const filteredPayments = payments.rows.filter(
        (payment: { [T: string]: null }) =>
          payment["poInvoiceInfo.entity_id"] !== null ||
          payment["nonPoInvoiceInfo.entity_id"] !== null,
      );

      const result = pagination.paginationData(limitNumber, pageNumber, {
        count: filteredPayments.length,
        rows: filteredPayments,
      });

      return { status: true, data: result };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: error?.message };
    }
  }

  async getInvoice({ page, limit, typeOfInvoice, userId }: any) {
    let pageNumber = parseInt(page) || 1;
    let limitNumber = parseInt(limit) || 15;
    let offset = (pageNumber - 1) * limitNumber;

    let invoiceCategoryFilter = typeOfInvoice;
    try {
      const invoices = await InvoiceHeader.findAndCountAll({
        where: {
          invoice_category_id: invoiceCategoryFilter,
          is_deleted: false,
          ...(userId && { vendor_id: userId }),
        },
        attributes: [
          "id",
          "vendor_invoice_number",
          "invoice_date",
          "currency",
          "invoice_amount",
          "tax_amount",
          "total_amount",
        ],
        order: [["invoice_date", "DESC"]],
        limit: limitNumber,
        offset: offset,
      });

      const result = pagination.paginationData(
        limitNumber,
        pageNumber,
        invoices,
      );

      return { status: true, data: result };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async getAdvancePaymentById(
    userId: string,
    id: number,
    emp_id: any,
    role: any,
  ) {
    try {
      const payments: any = await AdvancePayment.findOne({
        where: {
          ID: id,
        },
        include: [
          {
            model: UploadFiles,
            as: "upload_files",
            required: false,
            where: {
              Category_id: FileCategories.AdvancePayments,
              Is_deleted: false,
            },
          },
          {
            model: Vendor,
            as: "vendorInfo",
            attributes: ["Vendor_Name_EN", "ID", "Vendor_SAP_Code"],
          },
          {
            model: Status,
            as: "status",
            attributes: [
              "ID",
              "Status_classification",
              "Status_description",
              "Status_description_arabic",
            ],
          },
          {
            model: Employee,
            as: "cr_person_data",
            attributes: ["ID", "Employee_Name"],
          },
          {
            model: AdvancePaymentInvoiceMapping,
            as: "advance_po_mappings",
            required: false,
            attributes: ["ID", "Advance_Payment_Id", "PO_Header_Id"],
          },
        ],
      });

      if (!payments) {
        throw new APIError(`payment not found`, StatusCodeEnum.HTTP_NOT_FOUND);
      }

      if (payments?.Advance_Payment_Status == 6) {
        payments?.setDataValue("Payment_Status", "Paid");
      } else {
        payments?.setDataValue("Payment_Status", null);
      }
      let buttons: any = {};
      if (emp_id == payments?.Cost_responsible && role != 1) {
        if (payments?.Advance_Payment_Status == 1) {
          buttons.Approve_Button = true;
          buttons.Reject_Button = true;
          buttons.Final_Approval = false;
        } else if (payments?.Advance_Payment_Status != 1) {
          buttons.Approve_Button = false;
          buttons.Reject_Button = true;
          buttons.Final_Approval = false;
        } else {
          buttons.Approve_Button = false;
          buttons.Reject_Button = true;
          buttons.Final_Approval = false;
        }
      } else {
        buttons.Approve_Button = false;
        buttons.Reject_Button = false;
        buttons.Final_Approval = false;
      }

      if (payments?.Advance_Payment_Status == 5) {
        buttons.Approve_Button = false;
        buttons.Reject_Button = false;
        buttons.Final_Approval = false;
      }

      if (payments?.Advance_Payment_Status == 4) {
        buttons.Approve_Button = false;
        buttons.Reject_Button = false;
        buttons.Final_Approval = false;
      }

      payments.buttons_logic = buttons;

      let results = {
        payments: payments,
        buttons_logic: buttons,
      };
      return { status: true, data: results };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async editAdvancePayment(paymentId: string, userId: string, updateData: any) {
    const transaction = await sequelize.transaction();

    try {
      const payment = await AdvancePayment.findOne({
        where: { ID: paymentId, Advance_payment_raised_by: userId },
        transaction,
      });

      if (!payment) {
        throw new APIError(
          "Advance payment not found or unauthorized",
          StatusCodeEnum.HTTP_NOT_FOUND,
        );
      }

      const data = await payment.update(updateData, { transaction });

      await transaction.commit();
      return { status: true, data: data };
    } catch (error) {
      logger.error("Error:", error);
      await transaction.rollback();
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async getAdvancePaymentsForCSV(
    startDate: string,
    endDate: string,
    entity_id: number,
    limit: number,
    status?: number,
    roleId?: number,
    vendorId?: number,
  ) {
    try {
      const whereCondition: any = {
        Is_Deleted: false,
        CoCd: entity_id,
      };
      if (Number(roleId) === 1 && vendorId) {
        whereCondition.Vendor_id = vendorId;
      }
      if (startDate && endDate) {
        whereCondition.Submitted_Date = {
          [Op.between]: [
            convertToSequalizeDate(startDate),
            convertToSequalizeDate(endDate),
          ],
        };
      }

      if (status) {
        whereCondition.Advance_Payment_Status = status;
      }

      const data = await AdvancePayment.findAll({
        where: whereCondition,
        attributes: [
          "ID",
          "Advance_payment_code",
          "Type_of_invoice",
          "Value",
          "Performa_Invoice_Number",
          "Submitted_Date",
          "Advance_Payment_Status",
        ],
        include: [
          {
            model: Vendor,
            as: "vendorInfo",
            attributes: ["Vendor_Name_EN", "Vendor_SAP_Code"],
          },
        ],
        limit: limit,
      });

      const transformedData = data.map((payment) => {
        const base = {
          id: payment.ID,
          advance_payment_no: payment.Advance_payment_code || "",
          type_of_invoice:
            payment.Type_of_invoice === 1
              ? "PO Based"
              : payment.Type_of_invoice === 2
                ? "Non-PO Based"
                : "Unknown",
          value_of_advance_payment: payment.Value,
          proforma_invoice_no: payment.Performa_Invoice_Number || "",
          submission_date: payment.Submitted_Date
            ? new Date(payment.Submitted_Date).toISOString().split("T")[0]
            : "",
          status: STATUS_MAPPING[payment.Advance_Payment_Status] || "Unknown",
        };

        // only add vendor info if role is 2, 3, or 4
        if ([2, 3, 4].includes(Number(roleId))) {
          return {
            ...base,
            vendor_name: (payment as any).vendorInfo?.Vendor_Name_EN || "",
            vendor_code: (payment as any).vendorInfo?.Vendor_SAP_Code || "",
          };
        }

        return base;
      });

      return { status: true, data: transformedData };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  generateAdvancePaymentsCSV(data: any, isArabic: boolean, roleId?: number) {
    let fields;

    if (isArabic) {
      fields = [
        { label: "رقم الدفعة المقدمة", value: "advance_payment_no" },
        { label: "نوع الفاتورة", value: "type_of_invoice" },
        { label: "تاريخ التقديم", value: "submission_date" },
        { label: "قيمة الدفعة المقدمة", value: "value_of_advance_payment" },
        { label: "رقم الفاتورة المبدئية", value: "proforma_invoice_no" },
        { label: "الحالة", value: "status" },
      ];

      //  Only add vendor info for roles 2,3,4
      if ([2, 3, 4].includes(Number(roleId))) {
        fields.push({ label: "اسم المورد", value: "vendor_name" });
        fields.push({ label: "رمز المورد", value: "vendor_code" });
      }
    } else {
      fields = [
        { label: "Advance Payment Number", value: "advance_payment_no" },
        { label: "Type of Invoice", value: "type_of_invoice" },
        { label: "Submission Date", value: "submission_date" },
        {
          label: "Value of Advance Payment",
          value: "value_of_advance_payment",
        },
        { label: "Proforma Invoice Number", value: "proforma_invoice_no" },
        { label: "Status", value: "status" },
      ];

      //  Only add vendor info for roles 2,3,4
      if ([2, 3, 4].includes(Number(roleId))) {
        fields.push({ label: "Vendor Name", value: "vendor_name" });
        fields.push({ label: "Vendor Code", value: "vendor_code" });
      }
    }

    const json2csvParser = new Parser({ fields });
    return json2csvParser.parse(data);
  }

  async sendAdvancePaymentReport(
    startDate: string,
    endDate: string,
    email: string,
    entity_id: number,
    isArabic: any,
    userId: any,
    status: number,
  ) {
    try {
      const whereCondition: any = {
        Is_Deleted: false,
        CoCd: entity_id,
        [Op.or]: [
          // Case 1: Created by the current user — allow all statuses including 7
          { Advance_payment_raised_by: userId },

          // Case 2: Not status 7 — applies to everyone else
          {
            Advance_Payment_Status: { [Op.ne]: 7 },
          },
        ],
      };

      if (startDate && endDate) {
        whereCondition.Submitted_Date = {
          [Op.between]: [
            convertToSequalizeDate(startDate),
            convertToSequalizeDate(endDate),
          ],
        };
      }

      if (status) {
        whereCondition.Advance_Payment_Status = Number(status);
      }

      const payments = await AdvancePayment.findAll({
        where: whereCondition,
        order: [["CreatedDt", "DESC"]],
        attributes: [
          "Advance_payment_code",
          "Type_of_invoice",
          "Value",
          "Performa_Invoice_Number",
          "Submitted_Date",
          "Advance_Payment_Status",
        ],
      });

      if (!payments.length) {
        throw new APIError(
          "No advance payments found for the given date range",
          StatusCodeEnum.HTTP_NOT_FOUND,
        );
      }

      const transformedInvoices = payments.map((payment) => ({
        advance_payment_no: payment.Advance_payment_code || "",
        type_of_invoice:
          payment.Type_of_invoice === 1
            ? "PO Based"
            : payment.Type_of_invoice === 2
              ? "Non-PO Based"
              : "Unknown",
        submission_date: payment.Submitted_Date
          ? new Date(payment.Submitted_Date).toISOString().split("T")[0]
          : "",
        value_of_advance_payment: payment.Value,
        proforma_invoice_no: payment.Performa_Invoice_Number || "",
        status: STATUS_MAPPING[payment.Advance_Payment_Status] || "Unknown",
      }));

      const fields = isArabic
        ? [
          { label: "رقم الدفعة المقدمة", value: "advance_payment_no" },
          { label: "نوع الفاتورة", value: "type_of_invoice" },
          { label: "تاريخ التقديم", value: "submission_date" },
          { label: "قيمة الدفعة المقدمة", value: "value_of_advance_payment" },
          { label: "رقم الفاتورة المبدئية", value: "proforma_invoice_no" },
          { label: "الحالة", value: "status" },
        ]
        : [
          { label: "Advance Payment Number", value: "advance_payment_no" },
          { label: "Type of Invoice", value: "type_of_invoice" },
          { label: "Submission Date", value: "submission_date" },
          {
            label: "Value of Advance Payment",
            value: "value_of_advance_payment",
          },
          { label: "Proforma Invoice Number", value: "proforma_invoice_no" },
          { label: "Status", value: "status" },
        ];

      const json2csvParser = new Parser({ fields });
      const csvData = json2csvParser.parse(transformedInvoices);

      const csvFilePath = path.join(
        __dirname,
        "..",
        "reports",
        `advance_payment_report_${Date.now()}.csv`,
      );

      if (!fs.existsSync(path.dirname(csvFilePath))) {
        fs.mkdirSync(path.dirname(csvFilePath), { recursive: true });
      }
      const csvWithBOM = "\uFEFF" + csvData;
      fs.writeFileSync(csvFilePath, csvWithBOM, { encoding: "utf8" });

      const user = await User.findOne({ where: { Email: email } });
      const links: any = await userService.socialLinks(payments[0]?.CoCd);
      await constructMail.sendAdvancePaymentReportEmail({
        email,
        csvContent: csvWithBOM,
        user: user?.Name,
        linkedIn: links?.LinkedIn_Link,
        facebook: links?.Facebook_Link,
        instagram: links?.Instagram_Link,
        twitter: links?.Twitter_Link,
        youtube: links?.YouTube_Link,
      });

      fs.unlinkSync(csvFilePath);

      return { status: true, data: "Email sent successfully" };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async sendVendorAdvancePaymentReport(
    startDate: string,
    endDate: string,
    email: string,
    entity_id: number,
    isArabic: any,
    vendorId: number,
    status: number,
  ) {
    try {
      const whereCondition: any = {
        Vendor_id: vendorId,
        Is_Deleted: false,
        CoCd: entity_id,
      };

      if (startDate && endDate) {
        whereCondition.Submitted_Date = {
          [Op.between]: [
            convertToSequalizeDate(startDate),
            convertToSequalizeDate(endDate),
          ],
        };
      }

      if (status) {
        whereCondition.Advance_Payment_Status = Number(status);
      }

      const payments = await AdvancePayment.findAll({
        where: whereCondition,
        order: [["CreatedDt", "DESC"]],
        attributes: [
          "Advance_payment_code",
          "Type_of_invoice",
          "Value",
          "Performa_Invoice_Number",
          "Submitted_Date",
          "Advance_Payment_Status",
        ],
      });

      if (!payments.length) {
        throw new APIError(
          "No advance payments found for the given date range",
          StatusCodeEnum.HTTP_NOT_FOUND,
        );
      }

      const transformedInvoices = payments.map((payment) => ({
        advance_payment_no: payment.Advance_payment_code || "",
        type_of_invoice:
          payment.Type_of_invoice === 1
            ? "PO Based"
            : payment.Type_of_invoice === 2
              ? "Non-PO Based"
              : "Unknown",
        submission_date: payment.Submitted_Date
          ? new Date(payment.Submitted_Date).toISOString().split("T")[0]
          : "",
        value_of_advance_payment: payment.Value,
        proforma_invoice_no: payment.Performa_Invoice_Number || "",
        status: STATUS_MAPPING[payment.Advance_Payment_Status] || "Unknown",
      }));

      const fields = isArabic
        ? [
          { label: "رقم الدفعة المقدمة", value: "advance_payment_no" },
          { label: "نوع الفاتورة", value: "type_of_invoice" },
          { label: "تاريخ التقديم", value: "submission_date" },
          { label: "قيمة الدفعة المقدمة", value: "value_of_advance_payment" },
          { label: "رقم الفاتورة المبدئية", value: "proforma_invoice_no" },
          { label: "الحالة", value: "status" },
        ]
        : [
          { label: "Advance Payment Number", value: "advance_payment_no" },
          { label: "Type of Invoice", value: "type_of_invoice" },
          { label: "Submission Date", value: "submission_date" },
          {
            label: "Value of Advance Payment",
            value: "value_of_advance_payment",
          },
          { label: "Proforma Invoice Number", value: "proforma_invoice_no" },
          { label: "Status", value: "status" },
        ];

      const json2csvParser = new Parser({ fields });
      const csvData = json2csvParser.parse(transformedInvoices);

      const csvFilePath = path.join(
        __dirname,
        "..",
        "reports",
        `advance_payment_report_${Date.now()}.csv`,
      );

      if (!fs.existsSync(path.dirname(csvFilePath))) {
        fs.mkdirSync(path.dirname(csvFilePath), { recursive: true });
      }
      const csvWithBOM = "\uFEFF" + csvData;
      fs.writeFileSync(csvFilePath, csvWithBOM, { encoding: "utf8" });

      const user = await User.findOne({ where: { Email: email } });
      const links: any = await userService.socialLinks(payments[0]?.CoCd);
      await constructMail.sendAdvancePaymentReportEmail({
        email,
        csvContent: csvWithBOM,
        user: user?.Name,
        linkedIn: links?.LinkedIn_Link,
        facebook: links?.Facebook_Link,
        instagram: links?.Instagram_Link,
        twitter: links?.Twitter_Link,
        youtube: links?.YouTube_Link,
      });

      fs.unlinkSync(csvFilePath);

      return { status: true, data: "Email sent successfully" };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async sendBusinessAdvancePaymentReport(
    startDate: string,
    endDate: string,
    email: string,
    entity_id: number,
    isArabic: any,
    vendorIds: any,
    status: number,
  ) {
    try {
      const whereCondition: any = {
        Vendor_id: { [Op.in]: vendorIds },
        Is_Deleted: false,
        CoCd: entity_id,
      };

      if (startDate && endDate) {
        whereCondition.Submitted_Date = {
          [Op.between]: [
            convertToSequalizeDate(startDate),
            convertToSequalizeDate(endDate),
          ],
        };
      }

      if (status) {
        whereCondition.Advance_Payment_Status = Number(status);
      }

      const payments = await AdvancePayment.findAll({
        where: whereCondition,
        order: [["CreatedDt", "DESC"]],
        attributes: [
          "Advance_payment_code",
          "Type_of_invoice",
          "Value",
          "Performa_Invoice_Number",
          "Submitted_Date",
          "Advance_Payment_Status",
        ],
      });

      if (!payments.length) {
        throw new APIError(
          "No advance payments found for the given date range",
          StatusCodeEnum.HTTP_NOT_FOUND,
        );
      }

      const transformedInvoices = payments.map((payment) => ({
        advance_payment_no: payment.Advance_payment_code || "",
        type_of_invoice:
          payment.Type_of_invoice === 1
            ? "PO Based"
            : payment.Type_of_invoice === 2
              ? "Non-PO Based"
              : "Unknown",
        submission_date: payment.Submitted_Date
          ? new Date(payment.Submitted_Date).toISOString().split("T")[0]
          : "",
        value_of_advance_payment: payment.Value,
        proforma_invoice_no: payment.Performa_Invoice_Number || "",
        status: STATUS_MAPPING[payment.Advance_Payment_Status] || "Unknown",
      }));

      const fields = isArabic
        ? [
          { label: "رقم الدفعة المقدمة", value: "advance_payment_no" },
          { label: "نوع الفاتورة", value: "type_of_invoice" },
          { label: "تاريخ التقديم", value: "submission_date" },
          { label: "قيمة الدفعة المقدمة", value: "value_of_advance_payment" },
          { label: "رقم الفاتورة المبدئية", value: "proforma_invoice_no" },
          { label: "الحالة", value: "status" },
        ]
        : [
          { label: "Advance Payment Number", value: "advance_payment_no" },
          { label: "Type of Invoice", value: "type_of_invoice" },
          { label: "Submission Date", value: "submission_date" },
          {
            label: "Value of Advance Payment",
            value: "value_of_advance_payment",
          },
          { label: "Proforma Invoice Number", value: "proforma_invoice_no" },
          { label: "Status", value: "status" },
        ];

      const json2csvParser = new Parser({ fields });
      const csvData = json2csvParser.parse(transformedInvoices);

      const csvFilePath = path.join(
        __dirname,
        "..",
        "reports",
        `advance_payment_report_${Date.now()}.csv`,
      );

      if (!fs.existsSync(path.dirname(csvFilePath))) {
        fs.mkdirSync(path.dirname(csvFilePath), { recursive: true });
      }
      const csvWithBOM = "\uFEFF" + csvData;
      fs.writeFileSync(csvFilePath, csvWithBOM, { encoding: "utf8" });

      const user = await User.findOne({ where: { Email: email } });
      const links: any = await userService.socialLinks(payments[0]?.CoCd);
      await constructMail.sendAdvancePaymentReportEmail({
        email,
        csvContent: csvWithBOM,
        user: user?.Name,
        linkedIn: links?.LinkedIn_Link,
        facebook: links?.Facebook_Link,
        instagram: links?.Instagram_Link,
        twitter: links?.Twitter_Link,
        youtube: links?.YouTube_Link,
      });

      fs.unlinkSync(csvFilePath);

      return { status: true, data: "Email sent successfully" };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async checkDuplicatePerformaNo(performaNo: string) {
    try {
      const existing = await AdvancePayment.findOne({
        where: {
          Performa_Invoice_Number: performaNo,
          Is_Deleted: false,
        },
      });

      return {
        exists: !!existing,
        data: existing || null,
      };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(
        error?.message,
        StatusCodeEnum.HTTP_INTERNAL_SERVER_ERROR,
      );
    }
  }

  async advancePaymentApproval(
    curUserId: number,
    updateId: any,
    isApproved: boolean,
    rejectionReason: string,
    userData: { id: number; vendor_id: number },
  ) {
    const transaction = await sequelize.transaction();
    try {
      const vendorUpdate: any = await AdvancePayment.findOne({
        where: {
          ID: updateId,
        },
        include: {
          model: Employee,
          as: "cr_person_data",
        },
      });

      //if the user is CR person...
      if (vendorUpdate?.Cost_responsible == curUserId) {
        //if user is CR but the application is already approved...

        await AdvancePayment.update(
          {
            Advance_Payment_Status: isApproved ? 3 : 5,
          },
          {
            where: {
              ID: updateId,
            },
          },
        );
      }

      if (!isApproved) {
        const vendorUser = await User.findOne({
          where: { Vendor_Id: vendorUpdate?.Vendor_id },
          attributes: ["ID", "Name", "Email"],
        });
        const links: any = await userService.socialLinks(vendorUpdate?.CoCd);
        await constructMail.sendVendorRejectAdvanceEmail({
          email: vendorUpdate?.vendorInfo?.Email,
          subject: "Your Advance Payment Request Has Been Rejected – Daikin",
          vendorName: vendorUpdate?.vendorInfo?.Vendor_Name_EN,
          refNumber: vendorUpdate?.Advance_payment_code,
          rejectionReason: rejectionReason,
          linkedIn: links?.LinkedIn_Link,
          facebook: links?.Facebook_Link,
          instagram: links?.Instagram_Link,
          twitter: links?.Twitter_Link,
          youtube: links?.YouTube_Link,
        });

        if (vendorUser) {
          await notificationService.createNotification({
            User_Id: vendorUser?.ID,
            Vendor_Id: vendorUpdate?.Vendor_Id,
            Entity_Id: vendorUpdate?.CoCd,
            Message: `Your Advance Payment Request (ID: ${vendorUpdate?.Advance_payment_code}) has been rejected. Reason of rejection: ${rejectionReason}`,
            Module_Category_Id: NotificationCategory.Advance_Payment,
            Redirect_Id: updateId,
            CreatedBy: userData?.id,
          });
        }
      }

      await transaction.commit();
      return {
        status: true,
        data: `Vendor update ${isApproved ? "approved" : "rejected"}`,
      };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async getVendorAdvancePayments({
    page,
    limit,
    search,
    status,
    startDate,
    endDate,
    sort,
    sort_column,
    entity_id,
    userId,
    vendorId,
  }: any) {
    let pageNumber = page ? parseInt(page) : 1;
    let limitNumber = limit ? parseInt(limit) : 15;
    let offset = (pageNumber - 1) * limitNumber;

    let sortField = sort_column || "CreatedDt";
    let sortDirection = sort || "DESC";

    const order: any = [];

    switch (sortField) {
      case "id":
        order.push(["ID", sortDirection]);
        break;
      case "type_of_invoice":
        order.push(["Type_of_invoice", sortDirection]);
        break;
      case "value":
        order.push(["Value", sortDirection]);
        break;
      case "submitted_date":
        order.push(["Submitted_Date", sortDirection]);
        break;
      case "status":
        order.push(["Advance_Payment_Status", sortDirection]);
        break;
      default:
        order.push([sortField, sortDirection]);
        break;
    }

    let searchCondition = {};

    let where: WhereOptions = {
      Is_Deleted: false,
      CoCd: entity_id,
      Vendor_id: vendorId,
      [Op.or]: [
        // All records where status is not 7
        { Advance_Payment_Status: { [Op.ne]: 7 } },
        // Status 7 but only if created by this user
        ...(userId
          ? [
            {
              [Op.and]: [
                { Advance_Payment_Status: 7 },
                { CreatedBy: userId },
              ],
            },
          ]
          : []),
      ],
    };

    if (search) {
      where.Advance_payment_code = { [Op.like]: `%${search}%` };
    }

    if (status) {
      where.Advance_Payment_Status = Number(status);
    }

    if (startDate && endDate) {
      where.Submitted_Date = {
        [Op.between]: [
          convertToSequalizeDate(startDate),
          convertToSequalizeDate(endDate),
        ],
      };
    } else if (startDate) {
      where.Submitted_Date = { [Op.gte]: convertToSequalizeDate(startDate) };
    } else if (endDate) {
      where.Submitted_Date = { [Op.lte]: convertToSequalizeDate(endDate) };
    }

    try {
      const payments = await AdvancePayment.findAndCountAll({
        where,
        limit: limitNumber,
        offset: offset,
        order: order,
        attributes: { exclude: ["ModifiedDt", "Is_Deleted"] },
        include: [
          {
            model: Status,
            as: "status",
            attributes: [
              "ID",
              "Status_classification",
              "Status_description",
              "Status_description_arabic",
            ],
          },
          {
            model: Employee,
            as: "cr_person_data",
            attributes: ["ID", "Employee_Name"],
          },
          {
            model: Vendor,
            as: "vendorInfo",
            attributes: ["Vendor_Name_EN", "ID", "Vendor_SAP_Code"],
          },
        ],
      });

      const result = pagination.paginationData(
        limitNumber,
        pageNumber,
        payments,
      );

      return { status: true, data: result };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async deleteAdvancePayment(advancePaymentIds: number[], userId: number) {
    try {
      const advancePayments = await AdvancePayment.findAll({
        where: {
          ID: { [Op.in]: advancePaymentIds },
          Is_Deleted: false,
        },
      });

      if (advancePayments.length === 0) {
        return {
          status: false,
          message:
            "No valid Advance Payments found or all are already deleted.",
        };
      }

      const nonDrafts = advancePayments.filter(
        (ap) => ap.Advance_Payment_Status !== 7,
      );
      if (nonDrafts.length > 0) {
        return {
          status: false,
          message: `Only draft Advance Payments can be deleted.`,
        };
      }

      await AdvancePayment.update(
        {
          Is_Deleted: true,
          ModifiedBy: userId,
          ModifiedDt: Sequelize.literal("NOW()"),
        },
        {
          where: { ID: { [Op.in]: advancePaymentIds } },
        },
      );

      return {
        status: true,
        message: `${advancePayments.length} Advance Payment(s) deleted successfully.`,
      };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }
}

export default new AdvancePaymentService();
