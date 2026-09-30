-- Scenario 1: Manpower Service - PT Amanah Lestari Energy (PoC seed data)
-- Source: POC Sample Data folder (PO_ALE.pdf, SES Amanah Lestari.pdf)

IF OBJECT_ID(N'dbo.AP_SES_HEADER', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.AP_SES_HEADER (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    SESNo NVARCHAR(20) NOT NULL,
    PONo NVARCHAR(20) NOT NULL,
    PRNo NVARCHAR(20) NULL,
    VendorName NVARCHAR(200) NOT NULL,
    ServiceStartDate DATE NULL,
    ServiceEndDate DATE NULL,
    TotalSESValueIDR DECIMAL(18,2) NULL,
    RemainingPOBalance DECIMAL(18,2) NULL,
    SESDescription NVARCHAR(500) NULL,
    TransactionDate DATE NULL,
    CreatedDt DATETIME DEFAULT GETDATE()
  );
END;

IF OBJECT_ID(N'dbo.AP_SES_DETAIL', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.AP_SES_DETAIL (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    SESNo NVARCHAR(20) NOT NULL,
    POLnNo INT NOT NULL,
    ItemCode NVARCHAR(30) NULL,
    Description NVARCHAR(500) NULL,
    AcceptedQty DECIMAL(18,3) NULL,
    LineValue DECIMAL(18,2) NULL,
    PerformancePeriodFrom DATE NULL,
    PerformancePeriodTo DATE NULL
  );
END;

-- Seed SES header (skip if already present)
IF NOT EXISTS (SELECT 1 FROM dbo.AP_SES_HEADER WHERE SESNo = '8000003065')
BEGIN
  INSERT INTO dbo.AP_SES_HEADER (
    SESNo, PONo, PRNo, VendorName, ServiceStartDate, ServiceEndDate,
    TotalSESValueIDR, RemainingPOBalance, SESDescription, TransactionDate
  ) VALUES (
    '8000003065', '4203000546', '1213000365', 'PT AMANAH LESTARI ENERGY',
    '2025-06-01', '2026-05-31',
    55029500, 205802000,
    'MPS Piping Fabrication March-April 2026', '2026-04-25'
  );
END;

-- Seed SES lines
IF NOT EXISTS (SELECT 1 FROM dbo.AP_SES_DETAIL WHERE SESNo = '8000003065')
BEGIN
  INSERT INTO dbo.AP_SES_DETAIL (SESNo, POLnNo, ItemCode, Description, AcceptedQty, LineValue, PerformancePeriodFrom, PerformancePeriodTo) VALUES
  ('8000003065', 30, '4120000056', 'MPWR_SVC-PL_DIR,WLDR,OT-HRS', 83.500, 5010000, '2026-03-07', '2026-04-06'),
  ('8000003065', 40, '4120000057', 'MPWR_SVC-PL_DIR,FITTER,OT-HRS', 97, 3880000, '2026-03-07', '2026-04-06'),
  ('8000003065', 50, NULL, 'Welder', 366.500, 21990000, '2026-03-07', '2026-04-06'),
  ('8000003065', 60, NULL, 'Stationary, Postage, Transportation', 1, 1130000, '2026-03-07', '2026-04-06'),
  ('8000003065', 90, NULL, 'Overhead & Profit', 1, 4456500, '2026-03-07', '2026-04-06'),
  ('8000003065', 110, NULL, 'Fitter', 392, 15680000, '2026-03-07', '2026-04-06'),
  ('8000003065', 140, NULL, 'Overhead & Profit', 1, 2883000, '2026-03-07', '2026-04-06');
END;

-- Add columns to PO_HEADER table
ALTER TABLE dbo.PO_HEADER ADD
 Service_Start_Date DATETIME NULL,
 Service_End_Date DATETIME NULL,
 Project_Name NVARCHAR(200) NULL,
 Delivery_Start_Date DATETIME NULL,
 Delivery_End_Date DATETIME NULL,
 LD_Applicable BIT NULL,
 LD_Rate_Per_Week DECIMAL(5,2) NULL,
 LD_Max_Percentage DECIMAL(5,2) NULL;
GO

-- Add columns to PO_DETAIL table
ALTER TABLE dbo.PO_DETAIL ADD
 Line_Start_Date DATETIME NULL,
 Line_End_Date DATETIME NULL,
 Additional_Text NVARCHAR(MAX) NULL;
GO

-- Create AP_SES_HEADER table
CREATE TABLE dbo.AP_SES_HEADER (
 SESHeaderId BIGINT IDENTITY(1,1) PRIMARY KEY,
 SESNo VARCHAR(50) NOT NULL,
 PONo VARCHAR(50) NOT NULL,
 PRNo VARCHAR(50) NULL,
 TransactionDate DATETIME NULL,
 ServiceStartDate DATETIME NULL,
 ServiceEndDate DATETIME NULL,
 SESDescription NVARCHAR(500) NULL,
 VendorName NVARCHAR(250) NULL,
 PRDiscipline NVARCHAR(150) NULL,
 Site NVARCHAR(250) NULL,
 POValue DECIMAL(18,2) NULL,
 TotalSESValueIDR DECIMAL(18,2) NULL,
 TotalSESValueUSD DECIMAL(18,2) NULL,
 RemainingPOBalance DECIMAL(18,2) NULL,
 PreparedBy NVARCHAR(150) NULL,
 ApprovedBy NVARCHAR(150) NULL,
 ReleaseDate DATETIME NULL,
 ApprovalRemarks NVARCHAR(500) NULL,
 CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
 CreatedBy VARCHAR(100) NULL,
 UpdatedAt DATETIME NULL,
 UpdatedBy VARCHAR(100) NULL
);
GO

-- Create AP_SES_DETAIL table
CREATE TABLE dbo.AP_SES_DETAIL (
 SESDetailId BIGINT IDENTITY(1,1) PRIMARY KEY,
 SESNo VARCHAR(50) NOT NULL,
 PONo VARCHAR(50) NULL,
 POLnNo VARCHAR(10) NULL,
 ItemCode VARCHAR(100) NULL,
 Description NVARCHAR(500) NULL,
 Unit VARCHAR(20) NULL,
 POQty DECIMAL(18,3) NULL,
 AcceptedQty DECIMAL(18,3) NULL,
 LineValue DECIMAL(18,2) NULL,
 CumulativeQty DECIMAL(18,3) NULL,
 PerformancePeriodFrom DATETIME NULL,
 PerformancePeriodTo DATETIME NULL,
 Remarks NVARCHAR(500) NULL,
 CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
 CreatedBy VARCHAR(100) NULL
);
GO

-- Create indexes
CREATE UNIQUE INDEX IX_AP_SES_HEADER_SESNo ON dbo.AP_SES_HEADER (SESNo);
CREATE INDEX IX_AP_SES_HEADER_PONo ON dbo.AP_SES_HEADER (PONo);
CREATE INDEX IX_AP_SES_DETAIL_SESNo ON dbo.AP_SES_DETAIL (SESNo);
CREATE INDEX IX_AP_SES_DETAIL_PONoLine ON dbo.AP_SES_DETAIL (PONo, POLnNo);
GO

-- Insert data into AP_SES_HEADER table
INSERT INTO dbo.AP_SES_HEADER
(SESNo, PONo, PRNo, TransactionDate, ServiceStartDate, ServiceEndDate, SESDescription,
 VendorName, PRDiscipline, Site, POValue, TotalSESValueIDR, TotalSESValueUSD,
 RemainingPOBalance, PreparedBy, ApprovedBy, ReleaseDate, ApprovalRemarks)
VALUES
('8000003065', '4203000546', '1213000365', '2026-04-25', '2025-06-01', '2026-05-31',
 'MPS Piping Fabrication March-April 2026', 'PT AMANAH LESTARI ENERGY', 'BAP Mechanical',
 'Banggai Ammonia Plant [BAP]', 795236000, 55029500, 0, 205802000,
 'ACHMAD FIRDAUS', 'RUHIYAT RUHIYAT', '2026-04-25 09:48:03', 'Electronically approved');
GO

-- Insert data into AP_SES_DETAIL table
INSERT INTO dbo.AP_SES_DETAIL
(SESNo, PONo, POLnNo, ItemCode, Description, Unit, POQty, AcceptedQty, LineValue,
 CumulativeQty, PerformancePeriodFrom, PerformancePeriodTo)
VALUES
('8000003065','4203000546','30','4120000056','MPWR_SVC-PL_DIR,WLDR,OT-HRS','MH',1200,83.500,5010000,783.050,'2026-03-07','2026-04-06'),
('8000003065','4203000546','40','4120000057','MPWR_SVC-PL_DIR,FITTER,OT-HRS','MH',1200,97.000,3880000,828.650,'2026-03-07','2026-04-06'),
('8000003065','4203000546','50','Welder','Welder','MH',5616,366.500,21990000,3995.100,'2026-03-07','2026-04-06'),
('8000003065','4203000546','60',NULL,'Stationary, Postage, Transportation','MON',12,1.000,1130000,10.000,'2026-03-07','2026-04-06'),
('8000003065','4203000546','90',NULL,'Overhead & Profit','MON',12,1.000,4456500,10.000,'2026-03-07','2026-04-06'),
('8000003065','4203000546','110',NULL,'Fitter','MH',5616,392.000,15680000,4422.600,'2026-03-07','2026-04-06'),
('8000003065','4203000546','140',NULL,'Overhead & Profit','MON',12,1.000,2883000,10.000,'2026-03-07','2026-04-06');
GO

-- Create AP_DOCUMENT table
CREATE TABLE dbo.AP_DOCUMENT (
 DocumentId BIGINT IDENTITY(1,1) PRIMARY KEY,
 InvoiceHeaderId INT NULL,
 DocumentType VARCHAR(50) NOT NULL, -- INVOICE, TAX_INVOICE, PO, SES, WPC, TIMESHEET, ATTENDANCE, OTHER
 OriginalFileName NVARCHAR(255) NULL,
 StoredFilePath NVARCHAR(500) NULL,
 MimeType VARCHAR(100) NULL,
 FileSizeBytes BIGINT NULL,
 ExtractionStatus VARCHAR(50) NULL, -- UPLOADED, PROCESSING, EXTRACTED, FAILED
 OverallConfidence DECIMAL(5,2) NULL,
 UploadedBy INT NULL,
 UploadedAt DATETIME NOT NULL DEFAULT GETDATE()
);
GO

-- Create AP_DOCUMENT_EXTRACTION table
CREATE TABLE dbo.AP_DOCUMENT_EXTRACTION (
 ExtractionId BIGINT IDENTITY(1,1) PRIMARY KEY,
 DocumentId BIGINT NOT NULL,
 InvoiceHeaderId INT NULL,
 FieldName VARCHAR(100) NOT NULL,
 FieldValue NVARCHAR(MAX) NULL,
 NormalizedValue NVARCHAR(MAX) NULL,
 Confidence DECIMAL(5,2) NULL,
 PageNo INT NULL,
 SourceText NVARCHAR(MAX) NULL,
 CreatedAt DATETIME NOT NULL DEFAULT GETDATE()
);
GO

-- Create indexes
CREATE INDEX IX_AP_DOCUMENT_InvoiceHeaderId ON dbo.AP_DOCUMENT (InvoiceHeaderId);
CREATE INDEX IX_AP_DOCUMENT_EXTRACTION_DocumentId ON dbo.AP_DOCUMENT_EXTRACTION (DocumentId);
CREATE INDEX IX_AP_DOCUMENT_EXTRACTION_InvoiceField ON dbo.AP_DOCUMENT_EXTRACTION (InvoiceHeaderId, FieldName);
GO

-- Create AP_VALIDATION_RESULT table
CREATE TABLE dbo.AP_VALIDATION_RESULT (
 ValidationId BIGINT IDENTITY(1,1) PRIMARY KEY,
 InvoiceHeaderId INT NOT NULL,
 RuleCode VARCHAR(100) NOT NULL,
 RuleName NVARCHAR(200) NOT NULL,
 Severity VARCHAR(20) NOT NULL, -- PASS, WARNING, FAIL, BLOCKED
 ExpectedValue NVARCHAR(MAX) NULL,
 ActualValue NVARCHAR(MAX) NULL,
 VarianceValue DECIMAL(18,3) NULL,
 Message NVARCHAR(1000) NULL,
 SourceTable VARCHAR(100) NULL,
 SourceRecordId VARCHAR(100) NULL,
 CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
 CreatedBy INT NULL
);
GO

-- Create indexes
CREATE INDEX IX_AP_VALIDATION_RESULT_InvoiceHeaderId ON dbo.AP_VALIDATION_RESULT (InvoiceHeaderId);
CREATE INDEX IX_AP_VALIDATION_RESULT_Severity ON dbo.AP_VALIDATION_RESULT (Severity);
GO

-- Create AP_APPROVAL_MATRIX table
CREATE TABLE dbo.AP_APPROVAL_MATRIX (
 ApprovalMatrixId BIGINT IDENTITY(1,1) PRIMARY KEY,
 WorkflowType VARCHAR(50) NOT NULL, -- NON_PO, PO_SERVICE, LD_REVIEW
 MinAmount DECIMAL(18,2) NOT NULL,
 MaxAmount DECIMAL(18,2) NULL,
 SequenceNo INT NOT NULL,
 RoleCode VARCHAR(50) NOT NULL, -- HOS, HOD, HOF, STH, GFD
 RoleDescription NVARCHAR(200) NULL,
 IsActive BIT NOT NULL DEFAULT 1,
 CreatedAt DATETIME NOT NULL DEFAULT GETDATE()
);
GO

-- Insert data into AP_APPROVAL_MATRIX table
INSERT INTO dbo.AP_APPROVAL_MATRIX
(WorkflowType, MinAmount, MaxAmount, SequenceNo, RoleCode, RoleDescription)
VALUES
('NON_PO',0,2000000,1,'HOS','Head of Section (Lead)'),
('NON_PO',2000000.01,5000000,1,'HOS','Head of Section (Lead)'),
('NON_PO',2000000.01,5000000,2,'HOD','Head of Department (Manager)'),
('NON_PO',5000000.01,15000000,1,'HOD','Head of Department (Manager)'),
('NON_PO',5000000.01,15000000,2,'HOF','Head of Function (Head)'),
('NON_PO',15000000.01,50000000,1,'HOD','Head of Department (Manager)'),
('NON_PO',15000000.01,50000000,2,'HOF','Head of Function (Head)'),
('NON_PO',15000000.01,50000000,3,'STH','Operations and Site Head'),
('NON_PO',50000000.01,100000000,1,'HOD','Head of Department (Manager)'),
('NON_PO',50000000.01,100000000,2,'HOF','Head of Function (Head)'),
('NON_PO',50000000.01,100000000,3,'STH','Operations and Site Head'),
('NON_PO',50000000.01,100000000,4,'GFD','Group Functional Director'),
('NON_PO',100000000.01,NULL,1,'HOD','Head of Department (Manager)'),
('NON_PO',100000000.01,NULL,2,'HOF','Head of Function (Head)'),
('NON_PO',100000000.01,NULL,3,'STH','Operations and Site Head'),
('NON_PO',100000000.01,NULL,4,'GFD','Group Functional Director');
GO


Query Examples
-- 1. Find invoice with PO, vendor and SES summary
SELECT ih.ID, ih.InvNo, ih.InvDt, ih.InvAmt, ih.Tax_amount,
 vm.vendor_name, ph.PONo, ph.POValue,
 sh.SESNo, sh.TotalSESValueIDR, sh.RemainingPOBalance
FROM dbo.INVOICE_HEADER ih
LEFT JOIN dbo.VENDOR_MASTER vm ON vm.vendor_id = ih.Vendor_id
LEFT JOIN dbo.PO_HEADER ph ON ph.PONo = ih.PONo
LEFT JOIN dbo.AP_SES_HEADER sh ON sh.PONo = ih.PONo
WHERE ih.ID = @InvoiceHeaderId;
GO
-- 2. Compare invoice line amount against SES line amount
SELECT id.Invoice_Header_Id, id.PONo, id.POLnNo,
 id.Material_Description AS InvoiceDescription,
 id.NetAmount AS InvoiceLineAmount,
 sd.Description AS SESDescription,
 sd.LineValue AS SESLineAmount,
 (ISNULL(id.NetAmount,0) - ISNULL(sd.LineValue,0)) AS Variance
FROM dbo.INVOICE_DETAIL id
LEFT JOIN dbo.AP_SES_DETAIL sd
 ON sd.PONo = id.PONo
 AND sd.POLnNo = id.POLnNo
WHERE id.Invoice_Header_Id = @InvoiceHeaderId;
GO
-- 3. Get approval matrix for a non-PO invoice amount
SELECT SequenceNo, RoleCode, RoleDescription
FROM dbo.AP_APPROVAL_MATRIX
WHERE WorkflowType = 'NON_PO'
 AND @Amount >= MinAmount
 AND (@Amount <= MaxAmount OR MaxAmount IS NULL)
 AND IsActive = 1
ORDER BY SequenceNo;
GO
-- 4. Validation dashboard by severity
SELECT Severity, COUNT(*) AS RuleCount
FROM dbo.AP_VALIDATION_RESULT
WHERE InvoiceHeaderId = @InvoiceHeaderId
GROUP BY Severity;
GO

