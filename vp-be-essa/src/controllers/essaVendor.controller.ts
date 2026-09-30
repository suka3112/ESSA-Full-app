import { NextFunction, Request, Response } from "express";
import { BaseController } from "./baseController";
import { sequelize } from "../config/sequelize";
import logger from "../utils/logger";
import fs from "fs";
import path from "path";

// Overlay storage for portal AP controls
const CONTROL_STORE_PATH = path.join(__dirname, "../../data/essa-vendor-controls.json");

function getStoredControls(): Record<string, any> {
  try {
    if (fs.existsSync(CONTROL_STORE_PATH)) {
      return JSON.parse(fs.readFileSync(CONTROL_STORE_PATH, "utf-8"));
    }
  } catch (err) {
    logger.error("Error reading vendor control store:", err);
  }
  return {};
}

function saveStoredControl(code: string, patch: any): any {
  try {
    const dir = path.dirname(CONTROL_STORE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const current = getStoredControls();
    current[code] = {
      ...current[code],
      ...patch,
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(CONTROL_STORE_PATH, JSON.stringify(current, null, 2), "utf-8");
    return current[code];
  } catch (err) {
    logger.error("Error saving vendor control store:", err);
    return patch;
  }
}

class EssaVendorController extends BaseController {
  async list(req: any, res: any, next: NextFunction) {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const pageSize = Math.max(1, Number(req.query.pageSize) || 25);
      const search = String(req.query.search || "").trim().toLowerCase();
      const taxStatus = req.query.taxStatus;
      const controlState = req.query.controlState;
      const sapStatus = req.query.sapStatus;
      const sortBy = req.query.sortBy;
      const sortDir = req.query.sortDir === "desc" ? "desc" : "asc";

      const [vendors]: [any[], any] = await sequelize.query(`
        SELECT 
          v."ID" as id,
          v."Vendor_Name_EN" as name,
          v."Vendor_Name_AR" as "legalNameAr",
          COALESCE(NULLIF(v."Vendor_SAP_Code", ''), CAST(v."ID" AS VARCHAR)) as code,
          v."City" as city,
          v."Country" as country,
          v."Region" as state,
          v."Street_House_No" as address,
          v."VAT_Number" as gstin,
          v."Is_Active" as active,
          v."Payment_Terms" as "paymentTerms",
          v."Email" as email,
          v."Phone" as phone,
          v."Industry_Type" as classification,
          v."CreatedDt" as "lastSyncAt",
          (SELECT count(*) FROM "INVOICE_HEADER" WHERE "Vendor_id" = v."ID" AND "Is_Deleted" = false) as "invoiceCount",
          (SELECT count(*) FROM "INVOICE_HEADER" WHERE "Vendor_id" = v."ID" AND "Is_Deleted" = false AND "Is_Paid" = false) as "openInvoiceCount",
          (SELECT COALESCE(sum(CAST("InvAmt" AS NUMERIC)), 0) FROM "INVOICE_HEADER" WHERE "Vendor_id" = v."ID" AND "Is_Deleted" = false) as "totalBilled"
        FROM "VENDOR" v
        WHERE v."Is_Deleted" = false
      `);

      const controls = getStoredControls();

      let items = vendors.map((v: any) => {
        const ctrl = controls[v.code] || { negativeFlag: false, apEnabled: true };
        const isTaxRegistered = Boolean(v.gstin && v.gstin.trim() !== "");
        const derivedTax = isTaxRegistered ? "PKP" : "Non-PKP";
        const derivedControl = ctrl.negativeFlag
          ? "Negative"
          : ctrl.apEnabled === false
            ? "Disabled"
            : "Enabled";
        const derivedSapStatus = v.active ? "ACTIVE" : "INACTIVE";
        const location = [v.city, v.state || v.country].filter(Boolean).join(", ");

        return {
          id: v.id,
          code: v.code,
          name: v.name || `Vendor #${v.code}`,
          legalName: v.name || `Vendor #${v.code}`,
          location: location || "—",
          gstin: v.gstin || "—",
          classification: v.classification || "General Vendor",
          sapStatus: derivedSapStatus,
          controlState: derivedControl,
          control: ctrl,
          invoiceCount: Number(v.invoiceCount) || 0,
          openInvoiceCount: Number(v.openInvoiceCount) || 0,
          totalBilled: Number(v.totalBilled) || 0,
          taxStatus: derivedTax,
          currency: "AED",
          lastSyncAt: v.lastSyncAt
        };
      });

      // Search filter
      if (search) {
        items = items.filter((v: any) =>
          [v.code, v.name, v.location, v.gstin, v.classification].some(
            (val) => val && String(val).toLowerCase().includes(search)
          )
        );
      }

      // Tax status filter
      if (taxStatus) {
        items = items.filter((v: any) => v.taxStatus === taxStatus);
      }

      // Control state filter
      if (controlState) {
        items = items.filter((v: any) => v.controlState === controlState);
      }

      // SAP status filter
      if (sapStatus) {
        items = items.filter((v: any) => v.sapStatus === sapStatus);
      }

      // Facets
      const uniq = (arr: any[]) => [...new Set(arr.filter(Boolean))].sort();
      const facets = {
        sapStatuses: uniq(vendors.map((v: any) => v.active ? "ACTIVE" : "INACTIVE")),
        controlStates: ["Enabled", "Negative", "Disabled"],
        taxStatuses: ["PKP", "Non-PKP"]
      };

      // Sorting
      if (sortBy) {
        items.sort((a: any, b: any) => {
          let aVal = a[sortBy] ?? "";
          let bVal = b[sortBy] ?? "";
          if (typeof aVal === "number" && typeof bVal === "number") {
            return sortDir === "desc" ? bVal - aVal : aVal - bVal;
          }
          aVal = String(aVal).toLowerCase();
          bVal = String(bVal).toLowerCase();
          return sortDir === "desc" ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
        });
      } else {
        // Default sort by invoiceCount desc then name asc
        items.sort((a: any, b: any) => b.invoiceCount - a.invoiceCount || a.name.localeCompare(b.name));
      }

      const total = items.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const safePage = Math.min(Math.max(1, page), totalPages);
      const offset = (safePage - 1) * pageSize;
      const pagedItems = items.slice(offset, offset + pageSize);

      return this.success(
        req,
        res,
        this.status.HTTP_OK,
        {
          items: pagedItems,
          total,
          page: safePage,
          pageSize,
          totalPages,
          facets
        },
        "Vendors retrieved successfully"
      );
    } catch (error) {
      logger.error("Failed to list ESSA vendors from DB:", error);
      next(error);
    }
  }

  async detail(req: any, res: any, next: NextFunction) {
    try {
      const code = String(req.params.code).trim();
      const [vendors]: [any[], any] = await sequelize.query(`
        SELECT 
          v."ID" as id,
          v."Vendor_Name_EN" as name,
          v."Vendor_Name_AR" as "legalNameAr",
          COALESCE(NULLIF(v."Vendor_SAP_Code", ''), CAST(v."ID" AS VARCHAR)) as code,
          v."City" as city,
          v."Country" as country,
          v."Region" as state,
          v."Street_House_No" as address,
          v."Postal_Code" as "postalCode",
          v."VAT_Number" as gstin,
          v."Is_VAT" as "isVat",
          v."Taxble_Basis" as "taxableBasis",
          v."Wht_Applicable" as "whtApplicable",
          v."Wht_Rate" as "whtRate",
          v."Trade_license_number" as "tradeLicenseNumber",
          v."License_Expiry_Date" as "licenseExpiryDate",
          v."Issuing_Authority" as "issuingAuthority",
          v."National_Id_No" as "nationalIdNo",
          v."National_Id_Expiry_Dt" as "nationalIdExpiryDate",
          v."CoCd" as "companyCode",
          v."Daikin_Contact_Name" as "contactOwner",
          v."Incoterms" as incoterms,
          v."Incoterms_Location" as "incotermsLocation",
          v."Industry_Type" as classification,
          v."Industry_Key" as "industryKey",
          v."Non_PO_Access" as "nonPoAccess",
          v."Is_Active" as active,
          v."Payment_Terms" as "paymentTerms",
          v."Creditnote_Payment_Terms" as "creditNoteTerms",
          v."Email" as email,
          v."Phone" as phone,
          v."Fax" as fax,
          v."CreatedDt" as "lastSyncAt",
          b."Bank_Name" as "bankName",
          b."Bank_Account_Number" as "bankAccountNumber",
          b."IBAN_Number" as "ibanNumber",
          b."Bank_Account_Currency" as "bankCurrency",
          b."Swift_Code" as "swiftCode",
          b."Bank_City" as "bankCity",
          b."Bank_Country" as "bankCountry",
          b."Payment_By" as "paymentMethod"
        FROM "VENDOR" v
        LEFT JOIN "VENDOR_BANK" b ON b."Vendor_Id" = v."ID" AND b."Is_Deleted" = false
        WHERE (v."Vendor_SAP_Code" = :code OR CAST(v."ID" AS VARCHAR) = :code)
          AND v."Is_Deleted" = false
        LIMIT 1;
      `, { replacements: { code } });

      if (!vendors || vendors.length === 0) {
        return res.status(404).json({
          status: 404,
          message: `Vendor not found for code ${code}`,
          data: null
        });
      }

      const v = vendors[0];
      const controls = getStoredControls();
      const control = controls[v.code] || {
        negativeFlag: false,
        apEnabled: true,
        updatedByName: "Surya Nugraha",
        updatedAt: v.lastSyncAt || new Date().toISOString()
      };

      // Mask account number
      const rawAccount = v.ibanNumber || v.bankAccountNumber || "XXXXXX";
      const maskedAccount = rawAccount.length > 4
        ? `${rawAccount.slice(0, 3)}...${rawAccount.slice(-4)}`
        : rawAccount;

      // Purchase orders with true open balance calculation
      const [purchaseOrders]: [any[], any] = await sequelize.query(`
        SELECT 
          "PONo" as "poNumber",
          COALESCE("PO_currency", 'AED') as currency,
          CAST("POValue" AS NUMERIC) as "totalAmount",
          GREATEST(0, CAST(COALESCE("POValue", 0) AS NUMERIC) - CAST(COALESCE("InvValue", 0) AS NUMERIC)) as "openAmount",
          COALESCE("Document_date", "PO_date") as "validTo",
          COALESCE("POStatus", 'Open') as status,
          COALESCE("Mode_of_transport", 'Standard PO') as "poType"
        FROM "PO_HEADER"
        WHERE ("Vendor_id" = :id OR "Vendor_SAP_Code" = :code)
          AND "Is_Deleted" = false
        ORDER BY "PO_date" DESC NULLS LAST
        LIMIT 25;
      `, { replacements: { id: v.id, code: v.code } });

      // Recent invoices
      const [invoices]: [any[], any] = await sequelize.query(`
        SELECT 
          "ID" as id,
          "InvNo" as "invoiceNumber",
          "InvDt" as "invoiceDate",
          CAST("InvAmt" AS NUMERIC) as amount,
          COALESCE("InvCurr", 'AED') as currency,
          CASE WHEN "Is_Paid" = true THEN 'PAID' ELSE 'POSTED' END as lifecycle,
          CASE WHEN "Is_Paid" = true THEN 'Paid' ELSE 'Posted to SAP' END as status,
          COALESCE(NULLIF("Nature_Of_Expense", ''), 'General Expense') as "categoryName",
          "PONo" as "poNumber"
        FROM "INVOICE_HEADER"
        WHERE "Vendor_id" = :id
          AND "Is_Deleted" = false
        ORDER BY "InvDt" DESC NULLS LAST
        LIMIT 25;
      `, { replacements: { id: v.id } });

      const detailData = {
        vendor: {
          id: v.id,
          code: v.code,
          name: v.name || `Vendor #${v.code}`,
          legalName: v.name || `Vendor #${v.code}`,
          legalNameAr: v.legalNameAr || null,
          address: v.address || "—",
          postalCode: v.postalCode || null,
          city: v.city || "Dubai",
          state: v.state || "Dubai",
          country: v.country || "AE",
          gstin: v.gstin || "—",
          isVat: Boolean(v.isVat),
          taxableBasis: v.taxableBasis ? `${v.taxableBasis}%` : "—",
          whtApplicable: Boolean(v.whtApplicable),
          whtRate: v.whtRate ? `${v.whtRate}%` : "—",
          tradeLicenseNumber: v.tradeLicenseNumber || "—",
          licenseExpiryDate: v.licenseExpiryDate || null,
          issuingAuthority: v.issuingAuthority || null,
          nationalIdNo: v.nationalIdNo ? String(v.nationalIdNo).trim() : "—",
          nationalIdExpiryDate: v.nationalIdExpiryDate || null,
          companyCode: v.companyCode || "5900",
          contactOwner: v.contactOwner || "—",
          incoterms: v.incoterms ? `${v.incoterms}${v.incotermsLocation ? ` · ${v.incotermsLocation}` : ""}` : "—",
          classification: v.classification || "General Vendor",
          industryKey: v.industryKey || "—",
          nonPoAccess: Boolean(v.nonPoAccess),
          sapRef: `LFA1/${v.code}`,
          sapStatus: v.active ? "ACTIVE" : "INACTIVE",
          email: v.email || "finance@vendor.com",
          phone: v.phone || "—",
          fax: v.fax || "—",
          paymentTerms: v.paymentTerms || "Net 30",
          creditNoteTerms: v.creditNoteTerms || "—",
          currency: v.bankCurrency || "AED",
          bankName: v.bankName || "Commercial Bank of Dubai",
          bankAccountMasked: maskedAccount,
          swiftCode: v.swiftCode || "—",
          bankCity: v.bankCity || "—",
          bankCountry: v.bankCountry || "—",
          paymentMethod: v.paymentMethod || "Bank Transfer",
          lastSyncAt: v.lastSyncAt || new Date().toISOString()
        },
        control,
        purchaseOrders,
        invoices
      };

      return this.success(
        req,
        res,
        this.status.HTTP_OK,
        detailData,
        "Vendor detail retrieved successfully"
      );
    } catch (error) {
      logger.error("Failed to get ESSA vendor detail:", error);
      next(error);
    }
  }

  async updateControl(req: any, res: any, next: NextFunction) {
    try {
      const code = String(req.params.code).trim();
      const { negativeFlag, apEnabled, reason } = req.body;
      const userName = req.user?.user_name || req.user?.name || "AP Specialist";

      const patch: any = {
        updatedByName: userName,
        updatedAt: new Date().toISOString()
      };
      if (typeof negativeFlag === "boolean") patch.negativeFlag = negativeFlag;
      if (typeof apEnabled === "boolean") patch.apEnabled = apEnabled;
      if (reason) patch.reason = reason;

      const updated = saveStoredControl(code, patch);

      return this.success(
        req,
        res,
        this.status.HTTP_OK,
        updated,
        "Vendor control overlay updated"
      );
    } catch (error) {
      logger.error("Failed to update vendor control:", error);
      next(error);
    }
  }
}

export default new EssaVendorController();
