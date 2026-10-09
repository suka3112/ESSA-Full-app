import { NextFunction } from "express";
import { BaseController } from "./baseController";
import { sequelize } from "../config/sequelize";
import logger from "../utils/logger";

const ESSA_PURCHASE_ORDERS_SQL = `
  WITH invoice_pos AS (
    SELECT
      btrim(i."PoNumber") AS po_no,
      count(*)::int AS invoice_count,
      (array_agg(btrim(i."VendorName") ORDER BY i."InvoiceDate" DESC NULLS LAST)
        FILTER (WHERE NULLIF(btrim(i."VendorName"), '') IS NOT NULL))[1] AS vendor_name,
      (array_agg(
        CASE
          WHEN upper(btrim(coalesce(i."Currency", ''))) IN ('RP', 'IDR')
            OR i."Currency" ILIKE '%rupiah%' THEN 'IDR'
          WHEN upper(coalesce(i."Currency", '')) LIKE '%USD%'
            OR upper(coalesce(i."Currency", '')) LIKE 'US%' THEN 'USD'
          ELSE COALESCE(NULLIF(upper(left(btrim(i."Currency"), 3)), ''), 'IDR')
        END
        ORDER BY i."InvoiceDate" DESC NULLS LAST
      ))[1] AS currency
    FROM "ESSA_INVOICE" i
    WHERE i."IsDeleted" = false
      AND NULLIF(btrim(i."PoNumber"), '') IS NOT NULL
    GROUP BY btrim(i."PoNumber")
  )
  SELECT
    p.po_no AS "PONo",
    h."Vendor_SAP_Code" AS "Vendor_SAP_Code",
    h."Vendor_id" AS "Vendor_id",
    COALESCE(v."Vendor_Name_EN", p.vendor_name) AS "Vendor_Name_EN",
    h."OurRef" AS "OurRef",
    h."POValue" AS "POValue",
    h."InvValue" AS "InvValue",
    COALESCE(NULLIF(btrim(h."PO_currency"), ''), p.currency, 'IDR') AS "PO_currency",
    COALESCE(h."Service_End_Date", h."Delivery_End_Date", h."PO_date") AS "PO_date",
    COALESCE(NULLIF(btrim(h."POStatus"), ''), 'OPEN') AS "POStatus",
    p.invoice_count AS "invoiceCount"
  FROM invoice_pos p
  LEFT JOIN LATERAL (
    SELECT *
    FROM "PO_HEADER" h
    WHERE h."PONo" = p.po_no
      AND h."Is_Deleted" = false
    ORDER BY h."PO_date" DESC NULLS LAST
    LIMIT 1
  ) h ON true
  LEFT JOIN "VENDOR" v ON v."ID" = h."Vendor_id" AND v."Is_Deleted" = false
`;

function poTypeOf(ourRef: unknown): string {
  return String(ourRef || "").toUpperCase().startsWith("SRV") ? "Service PO" : "Standard PO";
}

function compareValues(a: unknown, b: unknown): number {
  const aNum = a == null || a === "" ? null : Number(a);
  const bNum = b == null || b === "" ? null : Number(b);
  if (aNum != null && bNum != null && Number.isFinite(aNum) && Number.isFinite(bNum)) {
    return aNum - bNum;
  }
  return String(a ?? "").localeCompare(String(b ?? ""), undefined, { numeric: true, sensitivity: "base" });
}

class EssaPurchaseOrderController extends BaseController {
  async list(req: any, res: any, next: NextFunction) {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.max(1, Number(req.query.limit) || 25);
      const search = String(req.query.search || "").trim().toLowerCase();
      const status = String(req.query.poStatus || "").trim().toUpperCase();
      const poType = String(req.query.poType || "").trim();
      const openOnly = req.query.openOnly;
      const sortColumn = String(req.query.sort_column || "PONo");
      const sortDir = String(req.query.sort || "ASC").toUpperCase() === "DESC" ? -1 : 1;

      const [rows]: [any[], any] = await sequelize.query(ESSA_PURCHASE_ORDERS_SQL);

      let items = rows.map((row) => {
        const poValue = row.POValue == null || row.POValue === "" ? null : Number(row.POValue);
        const invoiced = Number(row.InvValue) || 0;
        const openAmount = poValue == null ? null : Math.max(0, poValue - invoiced);
        const vendorName = row.Vendor_Name_EN || null;
        return {
          PONo: row.PONo,
          Vendor_id: row.Vendor_id,
          Vendor_SAP_Code: row.Vendor_SAP_Code || null,
          Vendor_Name_EN: vendorName,
          vendor: vendorName ? { Vendor_Name_EN: vendorName } : null,
          OurRef: row.OurRef || null,
          poType: poTypeOf(row.OurRef),
          POValue: poValue,
          InvValue: invoiced,
          openAmount,
          PO_currency: row.PO_currency || "IDR",
          PO_date: row.PO_date,
          POStatus: row.POStatus || "OPEN",
          invoiceCount: Number(row.invoiceCount) || 0,
        };
      });

      if (search) {
        items = items.filter((row) =>
          [row.PONo, row.Vendor_Name_EN, row.Vendor_SAP_Code].some(
            (value) => value && String(value).toLowerCase().includes(search),
          ),
        );
      }
      if (status) {
        items = items.filter((row) => String(row.POStatus).toUpperCase() === status);
      }
      if (poType) {
        items = items.filter((row) => row.poType === poType);
      }
      if (openOnly === "true") {
        items = items.filter((row) => row.openAmount == null || row.openAmount > 0);
      } else if (openOnly === "false") {
        items = items.filter((row) => row.openAmount === 0);
      }

      items.sort((a: any, b: any) => sortDir * compareValues(a[sortColumn], b[sortColumn]));

      const total = items.length;
      const offset = (page - 1) * limit;
      const results = items.slice(offset, offset + limit);

      return this.success(
        req,
        res,
        this.status.HTTP_OK,
        { results, pageMeta: { total, page, limit } },
        "Purchase orders retrieved",
      );
    } catch (error) {
      logger.error("Failed to list ESSA purchase orders:", error);
      next(error);
    }
  }
}

export default new EssaPurchaseOrderController();
