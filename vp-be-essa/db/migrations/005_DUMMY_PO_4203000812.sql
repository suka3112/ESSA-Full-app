IF COL_LENGTH('dbo.AP_VALIDATION_RESULT', 'InvoiceHeaderId') IS NOT NULL
BEGIN
  ALTER TABLE dbo.AP_VALIDATION_RESULT ALTER COLUMN InvoiceHeaderId INT NULL;
END;
GO
IF COL_LENGTH('dbo.AP_VALIDATION_RESULT', 'DocumentId') IS NULL
BEGIN
  ALTER TABLE dbo.AP_VALIDATION_RESULT ADD DocumentId BIGINT NULL;
END;
GO
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'IX_AP_VALIDATION_RESULT_DocumentId'
    AND object_id = OBJECT_ID('dbo.AP_VALIDATION_RESULT')
)
BEGIN
  CREATE INDEX IX_AP_VALIDATION_RESULT_DocumentId
    ON dbo.AP_VALIDATION_RESULT (DocumentId);
END;
GO


/* ============================================================
   Seed PO 4203000546 — corrected for NOT NULL constraints
   ============================================================ */
DECLARE @PONo        VARCHAR(10)   = '4203000546';
DECLARE @VendorSAP   VARCHAR(10)   = 'ALE0000001';
DECLARE @VendorName  VARCHAR(70)   = 'PT AMANAH LESTARI ENERGY';
DECLARE @Currency    VARCHAR(5)    = 'IDR';
DECLARE @POValue     DECIMAL(18,3) = 795236000;
DECLARE @PODate      DATE          = '2026-04-25';
DECLARE @CoCd        VARCHAR(4)    = '1000';      -- company code (adjust if needed)
DECLARE @VendorId    INT;

/* 1) Vendor ------------------------------------------------ */
IF NOT EXISTS (SELECT 1 FROM Vendor WHERE Vendor_SAP_Code = @VendorSAP)
BEGIN
    INSERT INTO Vendor
        (Vendor_Name_EN, Vendor_Name_AR, CoCd, Vendor_SAP_Code, City, Country, Region,
         Email, Phone, Payment_Terms, Is_VAT, Wht_Applicable, Is_Active, Is_Deleted, CreatedDt)
    VALUES
        (@VendorName, @VendorName, @CoCd, @VendorSAP, 'Batui', 'IDN', 'ID',
         'amanah.lestari@example.com', '0000000000', '0001', 0, 0, 1, 0, GETDATE());
END

/* capture the vendor's ID for the FK on PO_HEADER */
SELECT @VendorId = ID FROM Vendor WHERE Vendor_SAP_Code = @VendorSAP;

/* 1b) Vendor bank — required for BANK_VENDOR_MASTER validation */
IF @VendorId IS NOT NULL
   AND NOT EXISTS (
       SELECT 1 FROM dbo.VENDOR_BANK
       WHERE Vendor_Id = @VendorId
         AND Is_Deleted = 0
         AND REPLACE(Bank_Account_Number, '-', '') = '1510010173695'
   )
BEGIN
    INSERT INTO dbo.VENDOR_BANK
        (Vendor_Id, Bank_Account_Currency, Bank_Account_Number, Bank_Name, Bank_Country,
         Vendor_SAP_Code, CreatedDt, Is_Deleted)
    VALUES
        (@VendorId, @Currency, '151-00-1017369-5', 'Bank Mandiri', 'IDN',
         @VendorSAP, GETDATE(), 0);
END

IF NOT EXISTS (SELECT 1 FROM PO_HEADER WHERE PONo = @PONo)
BEGIN
    INSERT INTO dbo.PO_HEADER
        (PONo, Vendor_id, PO_date, CoCd, Mode_of_transport, PO_currency, Vendor_SAP_Code,
         Document_date, Purchase_Group, Payment_Terms, Incoterms, Incoterms_Location,
         OurRef, YourRef, Is_Deleted, Is_GR_raised, Is_IR_raised, POValue, GRValue, InvValue,
         Total_PO_Qty, Total_IR_Qty, Total_GR_Qty, POStatus, CreatedDt, CreatedBy,
         ModifiedDt, ModifiedBy, Service_Start_Date, Service_End_Date, Project_Name,
         Delivery_Start_Date, Delivery_End_Date, LD_Applicable, LD_Rate_Per_Week, LD_Max_Percentage)
    VALUES
        (@PONo, @VendorId, '2025-11-28', @CoCd, NULL, @Currency, @VendorSAP,
         '2025-11-28', NULL, '30', NULL, NULL,
         NULL, NULL, 0, 0, 0, @POValue, 0.000, 0.000,
         15.000, 0.000, 0.000, 'OPEN', GETDATE(), 1,
         NULL, NULL, '2025-11-28', '2025-12-31', 'Banggai Ammonia Plant [BAP]',
         '2025-11-28', '2025-12-31', 0, NULL, NULL);
END
ELSE
BEGIN
    UPDATE dbo.PO_HEADER
    SET POValue = @POValue
    WHERE PONo = @PONo AND (POValue IS NULL OR POValue < 100000000);
END
GO

IF NOT EXISTS (SELECT 1 FROM PO_DETAIL WHERE PONo = @PONo)
BEGIN
    INSERT INTO dbo.PO_DETAIL
(
    PONo,
    POLnNo,
    Material_Code,
    Material_Description,
    Qty,
    Unit_of_measure,
    UnitPrice,
    NetAmount,
    GR_value,
    IR_value,
    Inv_Qty,
    GR_Qty,
    History_Category,
    Movement_Type,
    Delivery_date,
    Plant,
    Material_status,
    Is_Deleted,
    CreatedDt,
    CreatedBy,
    ModifiedDt,
    ModifiedBy,
    Line_Start_Date,
    Line_End_Date,
    Additional_Text
)
VALUES

('4203000546','1.1','TIRE REPLACE','Tire Replace Avanza',
4.000,'EA',1040000.000,4160000.000,
NULL,NULL,NULL,NULL,NULL,NULL,
'2025-12-31',NULL,NULL,
0,'2026-06-10 12:35:10.617',1,
NULL,NULL,'2025-11-28','2025-12-31',
'CM AVANZA DN 1184 CC'),

('4203000546','1.2','SPOORING','Spooring',
1.000,'LOT',200000.000,200000.000,
NULL,NULL,NULL,NULL,NULL,NULL,
'2025-12-31',NULL,NULL,
0,'2026-06-10 12:35:32.770',1,
NULL,NULL,'2025-11-28','2025-12-31',
NULL),

('4203000546','1.3','BALANCING','Balancing',
1.000,'LOT',280000.000,280000.000,
NULL,NULL,NULL,NULL,NULL,NULL,
'2025-12-31',NULL,NULL,
0,'2026-06-10 12:35:50.320',1,
NULL,NULL,'2025-11-28','2025-12-31',
NULL),

('4203000546','2','4260000006','Window Tint Innova',
1.000,'EA',2200000.000,2200000.000,
NULL,NULL,NULL,NULL,NULL,NULL,
'2025-12-31',NULL,NULL,
0,'2026-06-10 12:36:20.927',1,
NULL,NULL,'2025-11-28','2025-12-31',
NULL),

('4203000546','3','4260000005','Window Tint Fortuner',
1.000,'EA',2025000.000,2025000.000,
NULL,NULL,NULL,NULL,NULL,NULL,
'2025-12-31',NULL,NULL,
0,'2026-06-10 12:36:34.437',1,
NULL,NULL,'2025-11-28','2025-12-31',
NULL),

('4203000546','4.1','TIRE REPLACE','Tire Replace Hiace',
2.000,'EA',1280000.000,2560000.000,
NULL,NULL,NULL,NULL,NULL,NULL,
'2025-12-31',NULL,NULL,
0,'2026-06-10 12:36:48.723',1,
NULL,NULL,'2025-11-28','2025-12-31',
'CM HI-ACE DN 1642 CY'),

('4203000546','4.2','SPOORING','Spooring',
1.000,'LOT',200000.000,200000.000,
NULL,NULL,NULL,NULL,NULL,NULL,
'2025-12-31',NULL,NULL,
0,'2026-06-10 12:37:03.010',1,
NULL,NULL,'2025-11-28','2025-12-31',
NULL),

('4203000546','4.3','BALANCING','Balancing',
1.000,'LOT',280000.000,280000.000,
NULL,NULL,NULL,NULL,NULL,NULL,
'2025-12-31',NULL,NULL,
0,'2026-06-10 12:37:19.943',1,
NULL,NULL,'2025-11-28','2025-12-31',
NULL),

('4203000546','5.1','TIRE REPLACE','Tire Replace Innova',
2.000,'EA',930000.000,1860000.000,
NULL,NULL,NULL,NULL,NULL,NULL,
'2025-12-31',NULL,NULL,
0,'2026-06-10 12:37:33.880',1,
NULL,NULL,'2025-11-28','2025-12-31',
'CM INNOVA DN 1335 CE'),

('4203000546','5.2','SPOORING','Spooring',
1.000,'LOT',200000.000,200000.000,
NULL,NULL,NULL,NULL,NULL,NULL,
'2025-12-31',NULL,NULL,
0,'2026-06-10 12:37:45.280',1,
NULL,NULL,'2025-11-28','2025-12-31',
NULL),

('4203000546','5.3','BALANCING','Balancing',
1.000,'LOT',280000.000,280000.000,
NULL,NULL,NULL,NULL,NULL,NULL,
'2025-12-31',NULL,NULL,
0,'2026-06-10 12:38:02.183',1,
NULL,NULL,'2025-11-28','2025-12-31',
NULL),

('4203000546','5.4','TIRE ROTATION','Tire Rotation',
1.000,'LOT',30000.000,30000.000,
NULL,NULL,NULL,NULL,NULL,NULL,
'2025-12-31',NULL,NULL,
0,'2026-06-10 12:38:15.870',1,
NULL,NULL,'2025-11-28','2025-12-31',
NULL);
END
GO

SELECT
    SUM(NetAmount) AS TotalPOAmount,
    SUM(Qty) AS TotalQty
FROM PO_DETAIL
WHERE PONo = '4203000546';

