import { BaseController } from "../controllers/baseController";
import { Enquiry } from "../models/enquiry";
import { Op, Sequelize } from "sequelize";
import { sequelize } from "../config/sequelize";
import { UploadFiles } from "../models/uploadFiles";
import pagination from "../utils/pagination";
import { Parser } from "json2csv";
import fs from "fs";
import path from "path";
import constructMail from "../utils/constructMail";
import { User } from "../models/user";
import { Vendor } from "../models/vendor";
import { FileCategories } from "../utils/enums/category.enum";
import { APIError } from "../utils/apiError.utils";
import { StatusCodeEnum } from "../utils/enums/status.enum";
import { convertToSequalizeDate } from "../utils/globalFunction";
import { Status } from "../models/status";
import { Response } from "../models/response";
import { Employee } from "../models/employee";
import userService from "./user.service";
import { UserRole } from "../models/userRole";
import logger from "../utils/logger";

class EnquiryService extends BaseController {
  async createEnquiry(body: any) {
    const transaction = await sequelize.transaction();

    try {
      const newEnquiry = await Enquiry.create(body, { transaction });

      if (body?.Upload_files && body?.Upload_files?.length > 0) {
        const filesData = (body?.Upload_files ?? []).map((fileObj: any) => ({
          Main_Id: newEnquiry?.ID,
          Category_id: FileCategories.Enquires,
          Attachment_type: fileObj?.Attachment_type,
          File_name: fileObj?.originalName,
          Upload_files: fileObj?.Upload_files,
          Is_deleted: false,
        }));

        await UploadFiles.bulkCreate(filesData, { transaction });
      }

      const crPerson = await User.findOne({
        where: { Employee_Id: body?.Assigned_contact_person },
        attributes: ["ID", "Email", "Name"],
      });

      if (!crPerson) {
        throw new APIError(
          `No User found with Employee_Id ${body?.Assigned_contact_person}`,
          400,
        );
      }

      await transaction.commit();

      return { status: true, data: newEnquiry, crPerson };
    } catch (error) {
      logger.error("Error:", error);
      await transaction.rollback();
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async getEnquiries({
    page,
    limit,
    search,
    status,
    assignedPerson,
    startDate,
    endDate,
    sort,
    sort_column,
    vendorId,
    entity_id,
  }: any) {
    try {
      let pageNumber = page ? parseInt(page) : 1;
      let limitNumber = limit ? parseInt(limit) : 1000;
      let offset = (pageNumber - 1) * limitNumber;

      let sortField = sort_column || "CreatedDt";
      let sortDirection = sort || "DESC";

      const order: any = [];

      switch (sortField) {
        case "id":
          order.push(["Enquiry_Code", sortDirection]);
          break;
        case "enquiry_type":
          order.push(["Enquiry_Type", sortDirection]);
          break;
        case "subject":
          order.push(["Subject", sortDirection]);
          break;
        case "enquiry_status":
          order.push(["Enquiry_Status", sortDirection]);
          break;
        case "assigned_contact_person":
          order.push([
            { model: Employee, as: "assignedPerson" },
            "Employee_Name",
            sortDirection,
          ]);
          break;
        case "date":
          order.push(["CreatedDt", sortDirection]);
          break;
        default:
          order.push([sortField, sortDirection]);
          break;
      }

      let searchCondition: any = {};

      if (search) {
        searchCondition = {
          [Op.or]: [
            { Enquiry_Code: { [Op.like]: `%${search}%` } },
            { Subject: { [Op.like]: `%${search}%` } },
            sequelize.where(sequelize.col("user.Vendor_Name_EN"), {
              [Op.like]: `%${search}%`,
            }),
          ],
        };
      }

      const where: any = {
        ...searchCondition,
        Is_Deleted: false,
        CoCd: entity_id,
        ...(vendorId && { Vendor_Id: vendorId }),
      };

      if (status) {
        where.Enquiry_Status = status;
      }

      if (
        assignedPerson !== "" &&
        assignedPerson !== undefined &&
        assignedPerson !== null
      ) {
        const ids = String(assignedPerson)
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id !== "");

        if (ids.length > 0) {
          if (ids.length === 1) {
            where.Assigned_contact_person = Number(ids[0]);
          } else {
            where.Assigned_contact_person = {
              [Op.in]: ids.map((id) => Number(id)),
            };
          }
        }
      }

      if (startDate && endDate) {
        where.Datetime_submitted = {
          [Op.between]: [
            convertToSequalizeDate(startDate),
            convertToSequalizeDate(endDate),
          ],
        };
      } else if (startDate) {
        where.Datetime_submitted = {
          [Op.gte]: convertToSequalizeDate(startDate),
        };
      } else if (endDate) {
        where.Datetime_submitted = {
          [Op.lte]: convertToSequalizeDate(endDate),
        };
      }

      const data = await Enquiry.findAndCountAll({
        where,
        limit: limitNumber,
        offset: offset,
        order: order,
        attributes: {
          exclude: ["ModifiedDt", "Is_Deleted", "Assigned_contact_person"],
        },
        include: [
          {
            model: Employee,
            as: "assignedPerson",
            attributes: ["Employee_Name"],
          },
          {
            model: Vendor,
            as: "user",
            attributes: ["Vendor_SAP_Code", "Vendor_Name_EN", "Vendor_Name_AR"],
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
        ],
      });

      const result = pagination.paginationData(limitNumber, pageNumber, data);

      return {
        status: true,
        data: result,
      };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async getEnquiriesForBusiness({
    page,
    limit,
    search,
    status,
    assignedPerson,
    startDate,
    endDate,
    sort,
    sort_column,
    vendorId,
    entity_id,
    empId,
  }: any) {
    try {
      let pageNumber = page ? parseInt(page) : 1;
      let limitNumber = limit ? parseInt(limit) : 1000;
      let offset = (pageNumber - 1) * limitNumber;

      let sortField = sort_column || "CreatedDt";
      let sortDirection = sort || "DESC";

      const order: any = [];

      switch (sortField) {
        case "id":
          order.push(["Enquiry_Code", sortDirection]);
          break;
        case "enquiry_type":
          order.push(["Enquiry_Type", sortDirection]);
          break;
        case "subject":
          order.push(["Subject", sortDirection]);
          break;
        case "enquiry_status":
          order.push(["Enquiry_Status", sortDirection]);
          break;
        case "assigned_contact_person":
          order.push([
            { model: Employee, as: "assignedPerson" },
            "name",
            sortDirection,
          ]);
          break;
        case "date":
          order.push(["CreatedDt", sortDirection]);
          break;
        default:
          order.push([sortField, sortDirection]);
          break;
      }

      let searchCondition: any = {};

      if (search) {
        searchCondition = {
          [Op.or]: [
            { Enquiry_Code: { [Op.like]: `%${search}%` } },
            { Subject: { [Op.like]: `%${search}%` } },
            sequelize.where(sequelize.col("user.Vendor_Name_EN"), {
              [Op.like]: `%${search}%`,
            }),
          ],
        };
      }

      const where: any = {
        ...searchCondition,
        Is_Deleted: false,
        CoCd: entity_id,
        Assigned_contact_person: empId,
      };

      if (status) {
        where.Enquiry_Status = status;
      }

      if (
        assignedPerson !== "" &&
        assignedPerson !== undefined &&
        assignedPerson !== null
      ) {
        const ids = String(assignedPerson)
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id !== "");

        if (ids.length > 0) {
          if (ids.length === 1) {
            where.Assigned_contact_person = Number(ids[0]);
          } else {
            where.Assigned_contact_person = {
              [Op.in]: ids.map((id) => Number(id)),
            };
          }
        }
      }

      if (startDate && endDate) {
        where.Datetime_submitted = {
          [Op.between]: [
            convertToSequalizeDate(startDate),
            convertToSequalizeDate(endDate),
          ],
        };
      } else if (startDate) {
        where.Datetime_submitted = {
          [Op.gte]: convertToSequalizeDate(startDate),
        };
      } else if (endDate) {
        where.Datetime_submitted = {
          [Op.lte]: convertToSequalizeDate(endDate),
        };
      }

      const data = await Enquiry.findAndCountAll({
        where,
        limit: limitNumber,
        offset: offset,
        order: order,
        attributes: {
          exclude: ["ModifiedDt", "Is_Deleted", "Assigned_contact_person"],
        },
        include: [
          {
            model: Employee,
            as: "assignedPerson",
            attributes: ["Employee_Name"],
          },
          {
            model: Vendor,
            as: "user",
            attributes: ["Vendor_SAP_Code", "Vendor_Name_EN", "Vendor_Name_AR"],
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
        ],
      });

      const result = pagination.paginationData(limitNumber, pageNumber, data);

      return {
        status: true,
        data: result,
      };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async getEnquiriesById(vendorId: number, code: number) {
    try {
      const enquiry = await Enquiry.findOne({
        where: { ID: code },
        attributes: [
          "ID",
          "Enquiry_code",
          "Enquiry_type",
          "Enquiry_status",
          "Subject",
          "Enquiry_description",
          "Assigned_contact_person",
          "Last_updatetime",
          "CreatedDt",
        ],
        include: [
          {
            model: Vendor,
            as: "user",
            attributes: [
              "Vendor_Name_EN",
              "Vendor_Name_AR",
              "ID",
              "Vendor_SAP_Code",
            ],
            required: true,
          },
          {
            model: UploadFiles,
            as: "enquiry_files",
            required: false,
            where: {
              Category_id: FileCategories.Enquires,
              Is_deleted: false,
            },
            attributes: [
              "Main_Id",
              "Category_id",
              "Upload_files",
              "Attachment_type",
              "File_name",
            ],
          },
          {
            model: Response,
            as: "response",
            attributes: ["ID", "Message", "CreatedDt", "CreatedBy"],
            include: [
              {
                model: User,
                as: "createdByUser",
                attributes: ["ID", "name", "email"],
                include: [
                  {
                    model: UserRole,
                    as: "user_role",
                    attributes: ["ID", "Role_Name_EN"],
                  },
                ],
              },
              {
                model: UploadFiles,
                as: "response_file",
                where: {
                  Category_id: FileCategories.Response,
                  Is_deleted: false,
                },
                attributes: ["Upload_files", "Attachment_type"],
                required: false,
              },
            ],
          },
        ],
      });

      if (!enquiry) {
        throw new APIError(
          "Invalid enquiry code",
          StatusCodeEnum.HTTP_NOT_FOUND,
        );
      }
      if (enquiry?.Enquiry_status === 2 || enquiry?.Enquiry_status === 1) {
        delete enquiry?.dataValues?.Last_updatetime;
      }

      return { status: true, data: enquiry };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async getEnquiriesForCSV(startDate: string, endDate: string) {
    try {
      const data = await Enquiry.findAll({
        where: {
          date: {
            [Op.between]: [new Date(startDate), new Date(endDate)],
          },
          Is_deleted: false,
        },
        attributes: ["ID", "Enquiry_type", "date", "Enquiry_status"],
        limit: 1000,
        include: [
          {
            model: Employee,
            as: "assignedPerson",
            attributes: ["Employee_Name"],
          },
        ],
        raw: true,
        nest: true,
      });

      const statusMapping: { [key: number]: string } = {
        1: "Submitted",
        2: "Under Review",
        3: "Resolved",
      };

      const formattedData = (data ?? []).map((item: any) => ({
        ID: item?.id,
        Enquiry_type: item?.enquiry_type,
        Assigned_contact_person: item?.assignedPerson
          ? item?.assignedPerson?.name
          : "",
        date: item?.date,
        Enquiry_status: statusMapping[item?.enquiry_status] || "Unknown",
      }));

      return { status: true, data: formattedData };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: error?.message };
    }
  }

  generateCSV(data: any) {
    const fields = [
      "id",
      "enquiry_type",
      "assigned_contact_person",
      "date",
      "enquiry_status",
    ];
    const json2csvParser = new Parser({ fields });
    return json2csvParser.parse(data);
  }

  async sendEnquiryReport(
    startDate: string,
    endDate: string,
    email: string,
    name: string,
    isArabic: any,
    status: number,
  ) {
    try {
      const whereCondition: any = {
        Is_deleted: false,
      };

      if (startDate && endDate) {
        const start = convertToSequalizeDate(startDate);
        const end = convertToSequalizeDate(endDate);

        if (start > end) {
          return { status: false, data: "startDate cannot be after endDate" };
        }

        whereCondition.Datetime_submitted = { [Op.between]: [start, end] };
      }

      if (status) {
        whereCondition.Enquiry_Status = status;
      }

      const enquiries: any = await Enquiry.findAll({
        where: whereCondition,
        attributes: [
          "Enquiry_type",
          "Enquiry_code",
          "Subject",
          "Datetime_submitted",
          "Enquiry_status",
        ],
        limit: 1000,
        include: [
          {
            model: Employee,
            as: "assignedPerson",
            attributes: ["Employee_Name"],
          },
        ],
      });

      const statusMapping: { [key: number]: string } = {
        1: "Submitted",
        2: "Under Review",
        3: "Resolved",
      };

      const formattedData = (enquiries ?? []).map((item: any) => ({
        enquiry_type: item?.Enquiry_type,
        enquiry_code: item?.Enquiry_code,
        subject: item?.Subject || "",
        assigned_contact_person: item?.assignedPerson
          ? item?.assignedPerson?.Employee_Name
          : "",
        date: item?.Datetime_submitted
          ? item?.Datetime_submitted?.toISOString()?.slice(0, 10)
          : "",
        enquiry_status:
          statusMapping[Number(item?.Enquiry_status)] || "Unknown",
      }));

      const fieldsEn = [
        { label: "Enquiry Type", value: "enquiry_type" },
        { label: "Enquiry ID", value: "enquiry_code" },
        { label: "Subject", value: "subject" },
        { label: "Assigned Contact Person", value: "assigned_contact_person" },
        { label: "Submitted Date", value: "date" },
        { label: "Status", value: "enquiry_status" },
      ];

      const fieldsAr = [
        { label: "نوع الاستفسار", value: "enquiry_type" },
        { label: "رقم الاستفسار", value: "enquiry_code" },
        { label: "الموضوع", value: "subject" },
        { label: "الشخص المسؤول", value: "assigned_contact_person" },
        { label: "تاريخ الإرسال", value: "date" },
        { label: "الحالة", value: "enquiry_status" },
      ];

      const fields = isArabic ? fieldsAr : fieldsEn;

      const json2csvParser = new Parser({ fields });
      const csvData = json2csvParser.parse(formattedData);

      const csvFilePath = path.join(
        __dirname,
        "..",
        "reports",
        `enquiry_report_${Date.now()}.csv`,
      );
      if (!fs.existsSync(path.dirname(csvFilePath))) {
        fs.mkdirSync(path.dirname(csvFilePath), { recursive: true });
      }
      const csvWithBOM = "\uFEFF" + csvData;
      fs.writeFileSync(csvFilePath, csvWithBOM, { encoding: "utf8" });
      const link: any = await userService.socialLinks(enquiries?.[0]?.CoCd);

      await constructMail.sendEnquiryReportEmail({
        email,
        csvContent: csvWithBOM,
        user: name || "User",
        linkedIn: link?.LinkedIn_Link,
        facebook: link?.Facebook_Link,
        instagram: link?.Instagram_Link,
        twitter: link?.Twitter_Link,
        youtube: link?.YouTube_Link,
      });

      fs.unlinkSync(csvFilePath);

      return { status: true, data: "Email sent successfully" };
    } catch (error) {
      logger.error("Error:", error);
      return {
        status: false,
        data: `Error sending enquiry report: ${error?.message}`,
      };
    }
  }

  async getEnquiriesFinance({
    page,
    limit,
    search,
    status,
    assignedPerson,
    startDate,
    endDate,
    sort,
    sort_column,
    entity_id,
  }: any) {
    try {
      let pageNumber = page ? parseInt(page) : 1;
      let limitNumber = limit ? parseInt(limit) : 15;
      let offset = (pageNumber - 1) * limitNumber;

      let sortField = sort_column || "date";
      let sortDirection = sort || "DESC";

      const order: any = [];

      switch (sortField) {
        case "id":
        case "enquiry_type":
        case "subject":
        case "enquiry_status":
        case "date":
          order.push([sortField, sortDirection]);
          break;
        case "assigned_contact_person":
          order.push([
            { model: Employee, as: "assignedPerson" },
            "Employee_Name",
            sortDirection,
          ]);
          break;
        default:
          order.push([sortField, sortDirection]);
          break;
      }

      let searchCondition: any = {};
      if (search) {
        searchCondition = {
          [Op.or]: [
            { id: { [Op.like]: `%${search}%` } },
            { subject: { [Op.like]: `%${search}%` } },
          ],
        };
      }

      const where: any = {
        ...searchCondition,
        is_deleted: false,
        entity_id: parseInt(entity_id),
      };

      if (status) {
        where.enquiry_status = status;
      }

      if (assignedPerson) {
        where["$assignedPerson.name$"] = assignedPerson;
      }

      if (startDate && endDate) {
        where.date = {
          [Op.between]: [new Date(startDate), new Date(endDate)],
        };
      } else if (startDate) {
        where.date = { [Op.gte]: new Date(startDate) };
      } else if (endDate) {
        where.date = { [Op.lte]: new Date(endDate) };
      }

      const data = await Enquiry.findAndCountAll({
        where,
        limit: limitNumber,
        offset,
        order,
        attributes: { exclude: ["updatedAt", "is_deleted"] },
        include: [
          {
            model: Vendor,
            as: "user",
            attributes: ["vendor_name", "id"],
            required: true,
          },
          {
            model: Employee,
            as: "assignedPerson",
            attributes: ["Employee_Name"],
          },
        ],
        raw: true,
        nest: true,
      });

      const statusMapping: { [key: number]: string } = {
        1: "Submitted",
        2: "Under Review",
        3: "Resolved",
      };

      const formattedData = (data?.rows ?? []).map((item: any) => ({
        ...item,
        enquiry_status: statusMapping[item?.enquiry_status] || "Unknown",
        assigned_contact_person: item?.assignedPerson
          ? item?.assignedPerson?.name
          : "",
      }));

      const result = pagination.paginationData(limitNumber, pageNumber, {
        count: data?.count,
        rows: formattedData,
      });

      return { status: true, data: result };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: error?.message };
    }
  }

  async getEnquiriesFinanceForCSV(
    startDate: string,
    endDate: string,
    entity_id: string,
  ) {
    try {
      const start = convertToSequalizeDate(startDate);
      const end = convertToSequalizeDate(endDate);

      if (start > end) {
        return { status: false, data: "startDate cannot be after endDate" };
      }

      const data = await Enquiry.findAll({
        where: {
          Datetime_submitted: { [Op.between]: [start, end] },
          CoCd: parseInt(entity_id),
          Is_deleted: false,
        },
        attributes: [
          "ID",
          "Enquiry_type",
          "Enquiry_status",
          "Datetime_submitted",
        ],
        limit: 1000,
        include: [
          {
            model: Vendor,
            as: "user",
            attributes: [
              ["id", "vendor_code"],
              ["vendor_name", "vendor_name"],
            ],
            required: true,
          },
          {
            model: Employee,
            as: "assignedPerson",
            attributes: [["Employee_Name", "assigned_contact_person"]],
            required: false,
          },
        ],
        raw: true,
      });

      const statusMapping: { [key: number]: string } = {
        1: "Submitted",
        2: "Under Review",
        3: "Resolved",
      };

      const formattedData = (data ?? []).map((item: any) => ({
        id: item?.ID,
        enquiry_type: item?.Enquiry_type,
        assigned_contact_person:
          item?.["assignedPerson.assigned_contact_person"] || "",
        date: item?.Datetime_submitted
          ? new Date(item?.Datetime_submitted).toISOString().split("T")[0]
          : "",
        enquiry_status:
          statusMapping[Number(item?.Enquiry_status)] || "Unknown",
        vendor_code: item?.["user.vendor_code"] || "",
        vendor_name: item?.["user.vendor_name"] || "",
      }));

      return { status: true, data: formattedData };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: error?.message };
    }
  }

  generateFinanceCSV(data: any, isArabic: boolean) {
    const fieldsEn = [
      "id",
      "enquiry_type",
      "assigned_contact_person",
      "date",
      "enquiry_status",
      "vendor_code",
      "vendor_name",
    ];

    const fieldsAra = [
      "معرف الاستفسار",
      "نوع الاستفسار",
      "الشخص المسؤول",
      "تاريخ التقديم",
      "حالة الاستفسار",
      "رمز المورد",
      "اسم المورد",
    ];

    const fields = isArabic ? fieldsAra : fieldsEn;

    const json2csvParser = new Parser({ fields });
    return json2csvParser.parse(data);
  }

  async sendEnquiryFinanceReport(
    startDate: string,
    endDate: string,
    entity_id: string,
    email: string,
    name: string,
    isArabic: any,
  ) {
    try {
      const enquiries: any = await Enquiry.findAll({
        where: {
          date: {
            [Op.between]: [new Date(startDate), new Date(endDate)],
          },
          CoCd: parseInt(entity_id),
          Is_Deleted: false,
        },
        attributes: [
          "ID",
          "Enquiry_type",
          "Assigned_contact_person",
          "Datetime_submitted",
          "Enquiry_status",
        ],
        limit: 1000,
        include: [
          {
            model: Vendor,
            as: "user",
            attributes: [
              ["id", "vendor_code"],
              ["vendor_name", "vendor_name"],
            ],
            required: true,
          },
          {
            model: Employee,
            as: "assignedPerson",
            attributes: [["Employee_Name", "assigned_contact_person"]],
            required: false,
          },
        ],
        raw: true,
      });

      if (!enquiries?.length) {
        return {
          status: false,
          data: "No finance enquiries found for the given date range and entity",
        };
      }

      const statusMapping: { [key: number]: string } = {
        1: "Submitted",
        2: "Under Review",
        3: "Resolved",
      };

      const formattedEnquiries = (enquiries ?? []).map((enquiry: any) => ({
        id: enquiry?.id,
        enquiry_type: enquiry?.enquiry_type,
        assigned_contact_person:
          enquiry?.["assignedPerson.assigned_contact_person"] || "",
        date: enquiry?.Datetime_submitted
          ? new Date(enquiry?.Datetime_submitted).toISOString().split("T")[0]
          : "",
        enquiry_status:
          statusMapping[Number(enquiry?.Enquiry_status)] || "Unknown",
        vendor_code: enquiry?.["user.vendor_code"],
        vendor_name: enquiry?.["user.vendor_name"],
      }));

      const fieldsEn = [
        "id",
        "enquiry_type",
        "assigned_contact_person",
        "date",
        "enquiry_status",
        "vendor_code",
        "vendor_name",
      ];

      const fieldsAra = [
        "معرف الاستفسار",
        "نوع الاستفسار",
        "الشخص المسؤول",
        "تاريخ التقديم",
        "حالة الاستفسار",
        "رمز المورد",
        "اسم المورد",
      ];

      let csvData = "";

      // If Arabic, remap keys to Arabic labels for CSV headers
      if (isArabic) {
        const arabicData = formattedEnquiries.map((item: any) => ({
          [fieldsAra[0]]: item.id,
          [fieldsAra[1]]: item.enquiry_type,
          [fieldsAra[2]]: item.assigned_contact_person,
          [fieldsAra[3]]: item.date,
          [fieldsAra[4]]: item.enquiry_status,
          [fieldsAra[5]]: item.vendor_code,
          [fieldsAra[6]]: item.vendor_name,
        }));

        const json2csvParser = new Parser({ fields: fieldsAra });
        csvData = json2csvParser.parse(arabicData);
      } else {
        const json2csvParser = new Parser({ fields: fieldsEn });
        csvData = json2csvParser.parse(formattedEnquiries);
      }

      const csvFilePath = path.join(
        __dirname,
        "..",
        "reports",
        `finance_enquiry_report_${Date.now()}.csv`,
      );

      if (!fs.existsSync(path.dirname(csvFilePath))) {
        fs.mkdirSync(path.dirname(csvFilePath), { recursive: true });
      }

      fs.writeFileSync(csvFilePath, csvData);

      const link: any = await userService.socialLinks(enquiries?.[0]?.CoCd);

      await constructMail.sendEnquiryReportEmail({
        email,
        csvContent: csvData,
        user: name || "User",
        linkedIn: link?.LinkedIn_Link,
        facebook: link?.Facebook_Link,
        instagram: link?.Instagram_Link,
        twitter: link?.Twitter_Link,
        youtube: link?.YouTube_Link,
      });

      fs.unlinkSync(csvFilePath);

      return {
        status: true,
        data: "Finance enquiry report email sent successfully",
      };
    } catch (error) {
      logger.error("Error:", error);
      return {
        status: false,
        data: `Error sending finance enquiry report: ${error?.message}`,
      };
    }
  }

  async editEnquiry(enquiryId: number, body: any) {
    try {
      const updatedEnquiry = await Enquiry.update(body, {
        where: { ID: enquiryId },
      });

      if (updatedEnquiry?.[0] === 0) {
        throw new APIError(
          "Enquiry not found.",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      return { status: true, data: updatedEnquiry };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async updateEnquiryStatus(enquiryId: number, statusId: number) {
    try {
      let enquiry = await Enquiry.findOne({ where: { ID: enquiryId } });
      if (!enquiry) {
        throw new APIError("Enquiry not found", StatusCodeEnum.HTTP_NOT_FOUND);
      }

      if (statusId === 3) {
        await Enquiry.update(
          {
            Enquiry_status: statusId,
            Last_updatetime: Sequelize.literal("NOW()"),
          },
          { where: { ID: enquiryId } },
        );

        enquiry = await Enquiry.findOne({ where: { ID: enquiryId } });
      } else {
        enquiry.Enquiry_status = statusId;
        await enquiry?.save();
      }

      const vendorUser = await User.findOne({
        where: { Vendor_Id: enquiry?.Vendor_id },
      });

      return {
        status: true,
        message: "Enquiry status updated",
        data: enquiry,
        vendorId: vendorUser || null,
      };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode || 500);
    }
  }

  async updateAssignedPerson(payload: any) {
    const transaction = await sequelize.transaction();
    try {
      const enquiry = await Enquiry.findOne({
        where: { ID: payload?.Enquiry_id, Is_deleted: false },
      });

      if (!enquiry) {
        throw new APIError("Enquiry not found", 404);
      }

      enquiry.Assigned_contact_person = payload?.Assigned_contact_person;

      await enquiry.save({ transaction });
      await transaction.commit();

      return enquiry;
    } catch (error) {
      logger.error("Error:", error);
      await transaction.rollback();
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async getEnquiriesForBusinessDashboard({
    page,
    limit,
    search,
    status,
    assignedPerson,
    startDate,
    endDate,
    sort,
    sort_column,
    vendorId,
    entity_id,
    empId,
  }: any) {
    try {
      let pageNumber = page ? parseInt(page) : 1;
      let limitNumber = limit ? parseInt(limit) : 1000;
      let offset = (pageNumber - 1) * limitNumber;

      let sortField = sort_column || "CreatedDt";
      let sortDirection = sort || "DESC";

      const order: any = [];

      switch (sortField) {
        case "id":
          order.push(["Enquiry_Code", sortDirection]);
          break;
        case "enquiry_type":
          order.push(["Enquiry_Type", sortDirection]);
          break;
        case "subject":
          order.push(["Subject", sortDirection]);
          break;
        case "enquiry_status":
          order.push(["Enquiry_Status", sortDirection]);
          break;
        case "assigned_contact_person":
          order.push([
            { model: Employee, as: "assignedPerson" },
            "name",
            sortDirection,
          ]);
          break;
        case "date":
          order.push(["CreatedDt", sortDirection]);
          break;
        default:
          order.push([sortField, sortDirection]);
          break;
      }

      let searchCondition: any = {};

      if (search) {
        searchCondition = {
          [Op.or]: [
            { Enquiry_Code: { [Op.like]: `%${search}%` } },
            { Subject: { [Op.like]: `%${search}%` } },
            sequelize.where(sequelize.col("user.Vendor_Name_EN"), {
              [Op.like]: `%${search}%`,
            }),
          ],
        };
      }

      const where: any = {
        ...searchCondition,
        Is_Deleted: false,
        CoCd: entity_id,
        Assigned_contact_person: empId,
        Enquiry_Status: { [Op.ne]: 3 },
      };

      if (status) {
        where.Enquiry_Status = status;
      }

      if (startDate && endDate) {
        where.Datetime_submitted = {
          [Op.between]: [
            convertToSequalizeDate(startDate),
            convertToSequalizeDate(endDate),
          ],
        };
      } else if (startDate) {
        where.Datetime_submitted = {
          [Op.gte]: convertToSequalizeDate(startDate),
        };
      } else if (endDate) {
        where.Datetime_submitted = {
          [Op.lte]: convertToSequalizeDate(endDate),
        };
      }

      const data = await Enquiry.findAndCountAll({
        where,
        limit: limitNumber,
        offset: offset,
        order: order,
        attributes: {
          exclude: ["ModifiedDt", "Is_Deleted", "Assigned_contact_person"],
        },
        include: [
          {
            model: Employee,
            as: "assignedPerson",
            attributes: ["Employee_Name"],
          },
          {
            model: Vendor,
            as: "user",
            attributes: ["Vendor_SAP_Code", "Vendor_Name_EN", "Vendor_Name_AR"],
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
        ],
      });

      const result = pagination.paginationData(limitNumber, pageNumber, data);

      return {
        status: true,
        data: result,
      };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async getEnquiriesDashboard({
    page,
    limit,
    search,
    status,
    assignedPerson,
    startDate,
    endDate,
    sort,
    sort_column,
    vendorId,
    entity_id,
  }: any) {
    try {
      let pageNumber = page ? parseInt(page) : 1;
      let limitNumber = limit ? parseInt(limit) : 1000;
      let offset = (pageNumber - 1) * limitNumber;

      let sortField = sort_column || "CreatedDt";
      let sortDirection = sort || "DESC";

      const order: any = [];

      switch (sortField) {
        case "id":
          order.push(["Enquiry_Code", sortDirection]);
          break;
        case "enquiry_type":
          order.push(["Enquiry_Type", sortDirection]);
          break;
        case "subject":
          order.push(["Subject", sortDirection]);
          break;
        case "enquiry_status":
          order.push(["Enquiry_Status", sortDirection]);
          break;
        case "assigned_contact_person":
          order.push([
            { model: Employee, as: "assignedPerson" },
            "Employee_Name",
            sortDirection,
          ]);
          break;
        case "date":
          order.push(["CreatedDt", sortDirection]);
          break;
        default:
          order.push([sortField, sortDirection]);
          break;
      }

      let searchCondition: any = {};

      if (search) {
        searchCondition = {
          [Op.or]: [
            { Enquiry_Code: { [Op.like]: `%${search}%` } },
            { Subject: { [Op.like]: `%${search}%` } },
            sequelize.where(sequelize.col("user.Vendor_Name_EN"), {
              [Op.like]: `%${search}%`,
            }),
          ],
        };
      }

      const where: any = {
        ...searchCondition,
        Is_Deleted: false,
        CoCd: entity_id,
        ...(vendorId && { Vendor_Id: vendorId }),
        Enquiry_Status: { [Op.ne]: 3 },
      };

      if (status) {
        where.Enquiry_Status = status;
      }

      if (
        assignedPerson !== "" &&
        assignedPerson !== undefined &&
        assignedPerson !== null
      ) {
        where.Assigned_contact_person = Number(assignedPerson);
      }

      if (startDate && endDate) {
        where.Datetime_submitted = {
          [Op.between]: [
            convertToSequalizeDate(startDate),
            convertToSequalizeDate(endDate),
          ],
        };
      } else if (startDate) {
        where.Datetime_submitted = {
          [Op.gte]: convertToSequalizeDate(startDate),
        };
      } else if (endDate) {
        where.Datetime_submitted = {
          [Op.lte]: convertToSequalizeDate(endDate),
        };
      }

      const data = await Enquiry.findAndCountAll({
        where,
        limit: limitNumber,
        offset: offset,
        order: order,
        attributes: {
          exclude: ["ModifiedDt", "Is_Deleted", "Assigned_contact_person"],
        },
        include: [
          {
            model: Employee,
            as: "assignedPerson",
            attributes: ["Employee_Name"],
          },
          {
            model: Vendor,
            as: "user",
            attributes: ["Vendor_SAP_Code", "Vendor_Name_EN", "Vendor_Name_AR"],
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
        ],
      });

      const result = pagination.paginationData(limitNumber, pageNumber, data);

      return {
        status: true,
        data: result,
      };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async sendEnquiryReportBusiness(
    startDate: string,
    endDate: string,
    email: string,
    name: string,
    isArabic: any,
    status: number,
    empId: number,
  ) {
    try {
      const whereCondition: any = {
        Is_deleted: false,
        Assigned_contact_person: empId,
      };

      if (startDate && endDate) {
        const start = convertToSequalizeDate(startDate);
        const end = convertToSequalizeDate(endDate);

        if (start > end) {
          return { status: false, data: "startDate cannot be after endDate" };
        }

        whereCondition.Datetime_submitted = { [Op.between]: [start, end] };
      }

      if (status) {
        whereCondition.Enquiry_Status = status;
      }

      const enquiries: any = await Enquiry.findAll({
        where: whereCondition,
        attributes: [
          "Enquiry_type",
          "Enquiry_code",
          "Subject",
          "Datetime_submitted",
          "Enquiry_status",
        ],
        limit: 1000,
        include: [
          {
            model: Employee,
            as: "assignedPerson",
            attributes: ["Employee_Name"],
          },
        ],
      });

      const statusMapping: { [key: number]: string } = {
        1: "Submitted",
        2: "Under Review",
        3: "Resolved",
      };

      const formattedData = (enquiries ?? []).map((item: any) => ({
        enquiry_type: item?.Enquiry_type,
        enquiry_code: item?.Enquiry_code,
        subject: item?.Subject || "",
        assigned_contact_person: item?.assignedPerson
          ? item?.assignedPerson?.Employee_Name
          : "",
        date: item?.Datetime_submitted
          ? item?.Datetime_submitted?.toISOString()?.slice(0, 10)
          : "",
        enquiry_status:
          statusMapping[Number(item?.Enquiry_status)] || "Unknown",
      }));

      const fieldsEn = [
        { label: "Enquiry Type", value: "enquiry_type" },
        { label: "Enquiry ID", value: "enquiry_code" },
        { label: "Subject", value: "subject" },
        { label: "Assigned Contact Person", value: "assigned_contact_person" },
        { label: "Submitted Date", value: "date" },
        { label: "Status", value: "enquiry_status" },
      ];

      const fieldsAr = [
        { label: "نوع الاستفسار", value: "enquiry_type" },
        { label: "رقم الاستفسار", value: "enquiry_code" },
        { label: "الموضوع", value: "subject" },
        { label: "الشخص المسؤول", value: "assigned_contact_person" },
        { label: "تاريخ الإرسال", value: "date" },
        { label: "الحالة", value: "enquiry_status" },
      ];

      const fields = isArabic ? fieldsAr : fieldsEn;

      const json2csvParser = new Parser({ fields });
      const csvData = json2csvParser.parse(formattedData);

      const csvFilePath = path.join(
        __dirname,
        "..",
        "reports",
        `enquiry_report_${Date.now()}.csv`,
      );
      if (!fs.existsSync(path.dirname(csvFilePath))) {
        fs.mkdirSync(path.dirname(csvFilePath), { recursive: true });
      }
      const csvWithBOM = "\uFEFF" + csvData;
      fs.writeFileSync(csvFilePath, csvWithBOM, { encoding: "utf8" });
      const link: any = await userService.socialLinks(enquiries?.[0]?.CoCd);

      await constructMail.sendEnquiryReportEmail({
        email,
        csvContent: csvWithBOM,
        user: name || "User",
        linkedIn: link?.LinkedIn_Link,
        facebook: link?.Facebook_Link,
        instagram: link?.Instagram_Link,
        twitter: link?.Twitter_Link,
        youtube: link?.YouTube_Link,
      });

      fs.unlinkSync(csvFilePath);

      return { status: true, data: "Email sent successfully" };
    } catch (error) {
      logger.error("Error:", error);
      return {
        status: false,
        data: `Error sending enquiry report: ${error?.message}`,
      };
    }
  }
}

export default new EnquiryService();
