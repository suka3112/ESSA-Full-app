/*
  Non-PO demo invoices for ESSA AP Team (ap.team@essa.com / Putri Maharani).

  Prefer the TypeScript seed for idempotent runs with dynamic user/vendor IDs:
    npm run seed:nonpo

  This SQL script is a reference / manual SSMS alternative.
  Adjust @CoCd, @PutriUserId, and @PutriEmployeeId before running.
*/
SET NOCOUNT ON;

DECLARE @CoCd             VARCHAR(4)  = '1000';  -- TODO: your entity code
DECLARE @PutriUserId      INT         = NULL;    -- TODO: Users.ID for ap.team@essa.com
DECLARE @PutriEmployeeId  INT         = NULL;    -- TODO: Employee.ID for E001
DECLARE @DemoTag          VARCHAR(20) = 'ESSA_DEMO_NPO';

SELECT @PutriUserId = u.ID,
       @PutriEmployeeId = u.Employee_Id,
       @CoCd = COALESCE(@CoCd, u.CoCd)
FROM dbo.[Users] u
WHERE u.Email = 'ap.team@essa.com';

IF @PutriUserId IS NULL
BEGIN
  RAISERROR('ap.team@essa.com not found — run db/seed-essa-ap-users.ts first.', 16, 1);
  RETURN;
END;

/* ── Vendors (non-PKP travel) ─────────────────────────────────────────── */
MERGE dbo.VENDOR AS t
USING (VALUES
  ('WKA0000001', 'PT Wisata Kawan Abadi',        'finance@wisatakawan.id'),
  ('CCT0000001', 'PT Citilink Corporate Travel', 'billing@citilinkcorp.id'),
  ('NEH0000001', 'PT Nusantara Express Hotel',   'ap@nusantaraexpress.id'),
  ('TKS0000001', 'PT Trans Kaltim Shuttle',      'finance@transkaltim.id')
) AS s (Vendor_SAP_Code, Vendor_Name_EN, Email)
ON t.Vendor_SAP_Code = s.Vendor_SAP_Code
WHEN NOT MATCHED THEN
  INSERT (Vendor_Name_EN, Vendor_Name_AR, CoCd, Vendor_SAP_Code, City, Country, Region,
          Email, Phone, Payment_Terms, Is_VAT, Wht_Applicable, Is_Active, Is_Deleted, CreatedDt, CreatedBy)
  VALUES (s.Vendor_Name_EN, s.Vendor_Name_EN, @CoCd, s.Vendor_SAP_Code, 'Jakarta', 'IDN', 'ID',
          s.Email, '0000000000', '0001', 0, 0, 1, 0, GETDATE(), @PutriUserId);

/* ── Remove prior demo rows ───────────────────────────────────────────── */
DELETE vr
FROM dbo.AP_VALIDATION_RESULT vr
INNER JOIN dbo.INVOICE_HEADER ih ON ih.ID = vr.InvoiceHeaderId
WHERE ih.Remarks LIKE @DemoTag + '|%'
  AND ih.Invoice_Category_id = 2;

DELETE FROM dbo.INVOICE_HEADER
WHERE Remarks LIKE @DemoTag + '|%'
  AND Invoice_Category_id = 2;

/* ── Demo invoices (category 2 = Non-PO) ──────────────────────────────── */
INSERT INTO dbo.INVOICE_HEADER
  (CoCd, Vendor_id, Invoice_Category_id, InvNo, Inv_Type, InvDt, Invoice_Due_Date,
   Document_type, InvCurr, Fiscal_year, Invoice_Status_Id, Payment_Terms,
   InvAmt, Tax_amount, Tax_percentage, Remarks, Inv_id_List, PONo, Is_Deleted, Is_Document, Is_Paid,
   Employee_Code, Nature_Of_Expense, Business_contact, Submitted_By, CreatedBy, ModifiedBy,
   Submitted_Date, Posting_Date, Posted_By, CreatedDt, ModifiedDt)
SELECT
  @CoCd,
  v.ID,
  2,
  x.InvNo,
  'NON_PO',
  x.InvDt,
  x.DueDt,
  'INV',
  'IDR',
  '2026',
  x.StatusId,
  '0001',
  x.Amount,
  0,
  0,
  @DemoTag + '|' + x.InvNo,
  x.DisplayRef,
  NULL,
  0, 1,
  CASE WHEN x.StatusId = 12 THEN 1 ELSE 0 END,
  'E001',
  'TRAVEL',
  @PutriEmployeeId,
  @PutriUserId,
  @PutriUserId,
  @PutriUserId,
  GETDATE(),
  CASE WHEN x.StatusId = 12 THEN GETDATE() ELSE NULL END,
  CASE WHEN x.StatusId = 12 THEN @PutriUserId ELSE NULL END,
  GETDATE(),
  GETDATE()
FROM (VALUES
  ('TD00057726', 'INV/TD/000577/2026', 'CCT0000001', '2026-06-03', '2026-07-03', 4250000, 101, N'Citilink CGK-BPN · Budi Santoso · awaiting park'),
  ('TD00058826', 'INV/TD/000588/2026', 'CCT0000001', '2026-06-07', '2026-07-07', 3680000,   1, N'Citilink CGK-SUB · Diana Putri · parked'),
  ('TD00060226', 'INV/TD/000602/2026', 'NEH0000001', '2026-06-05', '2026-07-05', 1850000,   2, N'Pending supervisor · hotel'),
  ('TD00061526', 'INV/TD/000615/2026', 'TKS0000001', '2026-05-20', '2026-06-19',  780000,  12, N'Posted · shuttle')
) AS x (InvNo, DisplayRef, VendorSAP, InvDt, DueDt, Amount, StatusId, Note)
INNER JOIN dbo.VENDOR v ON v.Vendor_SAP_Code = x.VendorSAP;

PRINT 'Non-PO demo seed complete. Re-run npm run seed:nonpo for validation rows via TypeScript.';
PRINT 'To undo: npm run seed:nonpo:undo  (add -- --remove-vendors to drop unused travel vendors too).';
