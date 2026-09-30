/* ============================================================
   Seed PO 4203000472 — Manpower Cleaning for Production
   Source: 251216 520-PT.ALE-PAU-12-2025 Invoice PO4203000472.pdf
   Vendor: PT AMANAH LESTARI ENERGY
   ============================================================ */
DECLARE @PONo        VARCHAR(10)   = '4203000472';
DECLARE @VendorSAP   VARCHAR(10)   = '30000956';
DECLARE @VendorName  VARCHAR(70)   = 'PT AMANAH LESTARI ENERGY';
DECLARE @Currency    VARCHAR(5)    = 'IDR';
DECLARE @POValue     DECIMAL(18,3) = 401380000;
DECLARE @CoCd        VARCHAR(4)    = '1000';
DECLARE @VendorId    INT;

/* 1) Vendor ------------------------------------------------ */
IF NOT EXISTS (SELECT 1 FROM Vendor WHERE Vendor_SAP_Code = @VendorSAP)
BEGIN
    IF EXISTS (SELECT 1 FROM Vendor WHERE Vendor_SAP_Code = 'ALE0000001')
    BEGIN
        SELECT @VendorId = ID FROM Vendor WHERE Vendor_SAP_Code = 'ALE0000001';
    END
    ELSE
    BEGIN
        INSERT INTO Vendor
            (Vendor_Name_EN, Vendor_Name_AR, CoCd, Vendor_SAP_Code, City, Country, Region,
             Email, Phone, Payment_Terms, Is_VAT, Wht_Applicable, Is_Active, Is_Deleted, CreatedDt)
        VALUES
            (@VendorName, @VendorName, @CoCd, @VendorSAP, 'Kintom', 'IDN', 'ID',
             'amanahlestarienergy@gmail.com', '6282293762226', '0001', 0, 0, 1, 0, GETDATE());

        SELECT @VendorId = ID FROM Vendor WHERE Vendor_SAP_Code = @VendorSAP;
    END
END
ELSE
BEGIN
    SELECT @VendorId = ID FROM Vendor WHERE Vendor_SAP_Code = @VendorSAP;
END

/* 1b) Vendor bank — reuse Amanah bank if present */
IF @VendorId IS NOT NULL
   AND NOT EXISTS (
       SELECT 1 FROM dbo.VENDOR_BANK
       WHERE Vendor_Id = @VendorId
         AND Is_Deleted = 0
   )
   AND EXISTS (
       SELECT 1 FROM dbo.VENDOR_BANK vb
       INNER JOIN Vendor v ON v.ID = vb.Vendor_Id
       WHERE v.Vendor_SAP_Code = 'ALE0000001'
         AND vb.Is_Deleted = 0
   )
BEGIN
    INSERT INTO dbo.VENDOR_BANK
        (Vendor_Id, Bank_Account_Currency, Bank_Account_Number, Bank_Name, Bank_Country,
         Vendor_SAP_Code, CreatedDt, Is_Deleted)
    SELECT
        @VendorId, vb.Bank_Account_Currency, vb.Bank_Account_Number, vb.Bank_Name, vb.Bank_Country,
        @VendorSAP, GETDATE(), 0
    FROM dbo.VENDOR_BANK vb
    INNER JOIN Vendor v ON v.ID = vb.Vendor_Id
    WHERE v.Vendor_SAP_Code = 'ALE0000001'
      AND vb.Is_Deleted = 0;
END

/* 2) PO Header --------------------------------------------- */
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
        (@PONo, @VendorId, '2025-05-28', @CoCd, NULL, @Currency, @VendorSAP,
         '2025-05-28', NULL, '30', NULL, NULL,
         '1213000311', NULL, 0, 0, 0, @POValue, 0.000, 0.000,
         56.000, 0.000, 0.000, 'OPEN', GETDATE(), 1,
         NULL, NULL, '2025-05-13', '2026-05-12', 'Banggai Ammonia Plant [BAP]',
         '2025-05-13', '2026-05-12', 0, NULL, NULL);
END
ELSE
BEGIN
    UPDATE dbo.PO_HEADER
    SET POValue = @POValue,
        Vendor_id = @VendorId,
        Vendor_SAP_Code = @VendorSAP,
        Service_Start_Date = '2025-05-13',
        Service_End_Date = '2026-05-12',
        Project_Name = 'Banggai Ammonia Plant [BAP]',
        Delivery_Start_Date = '2025-05-13',
        Delivery_End_Date = '2026-05-12'
    WHERE PONo = @PONo;
END

/* 3) PO Detail --------------------------------------------- */
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
    ('4203000472', '1', '4120000211',
     'MPWR_SVC-PL_DIR,OP CHEM,NRM-HRS',
     48.000, 'MMN', 8137500.000, 390600000.000,
     NULL, NULL, NULL, NULL, NULL, NULL,
     '2026-05-12', NULL, NULL,
     0, GETDATE(), 1,
     NULL, NULL, '2025-05-13', '2026-05-12',
     'MPWR_SVC-PL_DIR,OP (CHEM HNDLG),NRM-HRS MANPOWER_SERVICE-PLANT_DIRECT,OPERATOR CHEMICAL HANDLING,NORMAL HOURS — Manpower Cleaning for Production (4 persons for 12 months)'),

    ('4203000472', '2.1', 'PPE',
     'PPE',
     4.000, 'PRS', 1495000.000, 5980000.000,
     NULL, NULL, NULL, NULL, NULL, NULL,
     '2026-05-12', NULL, NULL,
     0, GETDATE(), 1,
     NULL, NULL, '2025-05-13', '2026-05-12',
     'PPE (Uniform, helmet, Safety Shoes, Safety Glass)'),

    ('4203000472', '2.2', 'MCU',
     'MCU',
     4.000, 'PRS', 1200000.000, 4800000.000,
     NULL, NULL, NULL, NULL, NULL, NULL,
     '2026-05-12', NULL, NULL,
     0, GETDATE(), 1,
     NULL, NULL, '2025-05-13', '2026-05-12',
     'Annual Medical Check Up');
END
GO

SELECT
    SUM(NetAmount) AS TotalPOAmount,
    SUM(Qty) AS TotalQty
FROM PO_DETAIL
WHERE PONo = '4203000472';
