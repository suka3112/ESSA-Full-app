-- =====================================================================
-- EAPA validation matrix seed
-- Source: 8. Data Point x Doc Matrix.pdf (V2 grid and Document Completeness).
-- Cells were read from the spreadsheet that the PDF prints.
-- Run after 033_VALIDATION_RULE.sql, on schema cfg.
-- Re-runnable: every insert is skipped when the natural key already exists.
--
-- Stored only where the matrix has a value.
-- Not stored, because the matrix leaves them open:
--   Mandatory / Optional, Exception Owner, tolerance mode when both
--   percent and amount are set, Route queue name, extraction keys,
--   LD formula (Annexure I #5), Faktur Pajak age (V-005).
-- FX 1% on row 1.27 is stored as a placeholder parameter.
-- Logical rows other than 1.31 and 1.33 point at an inactive prompt
-- whose text says the matrix supplied no prompt.
-- Calculation and Authenticity use handler_key unmapped.
-- Rules stay DRAFT and inactive.
-- Document Completeness R is UNRESOLVED, and only on bundle documents.
-- Comparison source, when Invoice is marked, is the Invoice cell.
-- Otherwise it is the first Exact mark, then the first mark.
-- Data type is taken from the data-point name. The Data Type column is empty.
-- =====================================================================

SET search_path = cfg, public;
BEGIN;

-- Categories. Common is not a category; those rules apply to all.
INSERT INTO "VAL_INVOICE_CATEGORY" (category_code, category_name, matrix_ref, is_po_based)
SELECT 'MATERIAL', 'Material', '2', TRUE
WHERE NOT EXISTS (SELECT 1 FROM "VAL_INVOICE_CATEGORY" WHERE category_code = 'MATERIAL');
INSERT INTO "VAL_INVOICE_CATEGORY" (category_code, category_name, matrix_ref, is_po_based)
SELECT 'MANPOWER_OUTSOURCING', 'Manpower Outsourcing', '3', TRUE
WHERE NOT EXISTS (SELECT 1 FROM "VAL_INVOICE_CATEGORY" WHERE category_code = 'MANPOWER_OUTSOURCING');
INSERT INTO "VAL_INVOICE_CATEGORY" (category_code, category_name, matrix_ref, is_po_based)
SELECT 'CATERING', 'Catering', '4', TRUE
WHERE NOT EXISTS (SELECT 1 FROM "VAL_INVOICE_CATEGORY" WHERE category_code = 'CATERING');
INSERT INTO "VAL_INVOICE_CATEGORY" (category_code, category_name, matrix_ref, is_po_based)
SELECT 'HOUSEKEEPING', 'Housekeeping', '5', TRUE
WHERE NOT EXISTS (SELECT 1 FROM "VAL_INVOICE_CATEGORY" WHERE category_code = 'HOUSEKEEPING');
INSERT INTO "VAL_INVOICE_CATEGORY" (category_code, category_name, matrix_ref, is_po_based)
SELECT 'RENTAL_EQUIPMENT', 'Rental Equipment', '6', TRUE
WHERE NOT EXISTS (SELECT 1 FROM "VAL_INVOICE_CATEGORY" WHERE category_code = 'RENTAL_EQUIPMENT');
INSERT INTO "VAL_INVOICE_CATEGORY" (category_code, category_name, matrix_ref, is_po_based)
SELECT 'CIVIL_WORKS_CONSTRUCTION', 'Civil Works (Construction)', '7', TRUE
WHERE NOT EXISTS (SELECT 1 FROM "VAL_INVOICE_CATEGORY" WHERE category_code = 'CIVIL_WORKS_CONSTRUCTION');
INSERT INTO "VAL_INVOICE_CATEGORY" (category_code, category_name, matrix_ref, is_po_based)
SELECT 'PIB', 'PIB', '8', TRUE
WHERE NOT EXISTS (SELECT 1 FROM "VAL_INVOICE_CATEGORY" WHERE category_code = 'PIB');
INSERT INTO "VAL_INVOICE_CATEGORY" (category_code, category_name, matrix_ref, is_po_based)
SELECT 'TRAVEL_NON_PO', 'Travel - Non PO', '9', FALSE
WHERE NOT EXISTS (SELECT 1 FROM "VAL_INVOICE_CATEGORY" WHERE category_code = 'TRAVEL_NON_PO');
INSERT INTO "VAL_INVOICE_CATEGORY" (category_code, category_name, matrix_ref, is_po_based)
SELECT 'HOTEL_NON_PO', 'Hotel - Non PO', '10', FALSE
WHERE NOT EXISTS (SELECT 1 FROM "VAL_INVOICE_CATEGORY" WHERE category_code = 'HOTEL_NON_PO');
INSERT INTO "VAL_INVOICE_CATEGORY" (category_code, category_name, matrix_ref, is_po_based)
SELECT 'IMPORT_LOGISTICS', 'Import Logistics', '11', TRUE
WHERE NOT EXISTS (SELECT 1 FROM "VAL_INVOICE_CATEGORY" WHERE category_code = 'IMPORT_LOGISTICS');
INSERT INTO "VAL_INVOICE_CATEGORY" (category_code, category_name, matrix_ref, is_po_based)
SELECT 'DOMESTIC_LOGISTIC', 'Domestic Logistic', '12', TRUE
WHERE NOT EXISTS (SELECT 1 FROM "VAL_INVOICE_CATEGORY" WHERE category_code = 'DOMESTIC_LOGISTIC');
INSERT INTO "VAL_INVOICE_CATEGORY" (category_code, category_name, matrix_ref, is_po_based)
SELECT 'CONSULTANTS_TIME_BASED', 'Consultants (Time Based)', '13', TRUE
WHERE NOT EXISTS (SELECT 1 FROM "VAL_INVOICE_CATEGORY" WHERE category_code = 'CONSULTANTS_TIME_BASED');
INSERT INTO "VAL_INVOICE_CATEGORY" (category_code, category_name, matrix_ref, is_po_based)
SELECT 'CONSULTANTS_MILESTONE', 'Consultants (Milestone)', '14', TRUE
WHERE NOT EXISTS (SELECT 1 FROM "VAL_INVOICE_CATEGORY" WHERE category_code = 'CONSULTANTS_MILESTONE');
INSERT INTO "VAL_INVOICE_CATEGORY" (category_code, category_name, matrix_ref, is_po_based)
SELECT 'MEDICAL_SERVICES', 'Medical Services', '15', TRUE
WHERE NOT EXISTS (SELECT 1 FROM "VAL_INVOICE_CATEGORY" WHERE category_code = 'MEDICAL_SERVICES');
INSERT INTO "VAL_INVOICE_CATEGORY" (category_code, category_name, matrix_ref, is_po_based)
SELECT 'SURVEILLANCE_AND_INSPECTION', 'Surveillance and Inspection', '16', TRUE
WHERE NOT EXISTS (SELECT 1 FROM "VAL_INVOICE_CATEGORY" WHERE category_code = 'SURVEILLANCE_AND_INSPECTION');
INSERT INTO "VAL_INVOICE_CATEGORY" (category_code, category_name, matrix_ref, is_po_based)
SELECT 'TELECOM_AND_INTERNET_SERVICES', 'Telecom and Internet Services', '17', TRUE
WHERE NOT EXISTS (SELECT 1 FROM "VAL_INVOICE_CATEGORY" WHERE category_code = 'TELECOM_AND_INTERNET_SERVICES');
INSERT INTO "VAL_INVOICE_CATEGORY" (category_code, category_name, matrix_ref, is_po_based)
SELECT 'CSR_EXTERNAL_RELATION', 'CSR / External Relation', '18', TRUE
WHERE NOT EXISTS (SELECT 1 FROM "VAL_INVOICE_CATEGORY" WHERE category_code = 'CSR_EXTERNAL_RELATION');
INSERT INTO "VAL_INVOICE_CATEGORY" (category_code, category_name, matrix_ref, is_po_based)
SELECT 'CORPORATE_CREDIT_CARD', 'Corporate Credit Card', '19', TRUE
WHERE NOT EXISTS (SELECT 1 FROM "VAL_INVOICE_CATEGORY" WHERE category_code = 'CORPORATE_CREDIT_CARD');
INSERT INTO "VAL_INVOICE_CATEGORY" (category_code, category_name, matrix_ref, is_po_based)
SELECT 'MISC_BUSINESS_EXPENSES', 'Misc. Business Expenses', '20', TRUE
WHERE NOT EXISTS (SELECT 1 FROM "VAL_INVOICE_CATEGORY" WHERE category_code = 'MISC_BUSINESS_EXPENSES');
INSERT INTO "VAL_INVOICE_CATEGORY" (category_code, category_name, matrix_ref, is_po_based)
SELECT 'EVENTS_AND_CELEBRATIONS', 'Events and Celebrations', '21', TRUE
WHERE NOT EXISTS (SELECT 1 FROM "VAL_INVOICE_CATEGORY" WHERE category_code = 'EVENTS_AND_CELEBRATIONS');
INSERT INTO "VAL_INVOICE_CATEGORY" (category_code, category_name, matrix_ref, is_po_based)
SELECT 'EMPLOYEE_SETTLEMENTS', 'Employee Settlements', '22', TRUE
WHERE NOT EXISTS (SELECT 1 FROM "VAL_INVOICE_CATEGORY" WHERE category_code = 'EMPLOYEE_SETTLEMENTS');

-- Documents inside the uploaded bundle.
INSERT INTO "BUNDLE_DOCUMENT_TYPE" (document_code, document_name, channel, supplied_by, matrix_column_ref)
SELECT 'INVOICE', 'Invoice', 'VENDOR_BUNDLE', 'Vendor - Invoice document', 'F'
WHERE NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_TYPE" WHERE document_code = 'INVOICE');
INSERT INTO "BUNDLE_DOCUMENT_TYPE" (document_code, document_name, channel, supplied_by, matrix_column_ref)
SELECT 'FAKTUR_PAJAK', 'Faktur Pajak', 'VENDOR_BUNDLE', 'Vendor', 'I'
WHERE NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_TYPE" WHERE document_code = 'FAKTUR_PAJAK');
INSERT INTO "BUNDLE_DOCUMENT_TYPE" (document_code, document_name, channel, supplied_by, matrix_column_ref)
SELECT 'DELIVERY_NOTE', 'Delivery Note', 'VENDOR_BUNDLE', 'Vendor', 'M'
WHERE NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_TYPE" WHERE document_code = 'DELIVERY_NOTE');
INSERT INTO "BUNDLE_DOCUMENT_TYPE" (document_code, document_name, channel, supplied_by, matrix_column_ref)
SELECT 'PACKING_LIST', 'Packing List', 'VENDOR_BUNDLE', 'Vendor', 'N'
WHERE NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_TYPE" WHERE document_code = 'PACKING_LIST');
INSERT INTO "BUNDLE_DOCUMENT_TYPE" (document_code, document_name, channel, supplied_by, matrix_column_ref)
SELECT 'AIRWAY_BILL', 'Airway Bill', 'VENDOR_BUNDLE', 'Vendor', 'O'
WHERE NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_TYPE" WHERE document_code = 'AIRWAY_BILL');
INSERT INTO "BUNDLE_DOCUMENT_TYPE" (document_code, document_name, channel, supplied_by, matrix_column_ref)
SELECT 'SHIPPING_BILL', 'Shipping Bill', 'VENDOR_BUNDLE', 'Vendor', 'P'
WHERE NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_TYPE" WHERE document_code = 'SHIPPING_BILL');
INSERT INTO "BUNDLE_DOCUMENT_TYPE" (document_code, document_name, channel, supplied_by, matrix_column_ref)
SELECT 'BANK_GUARANTEE_BOND_WARRANTY_LETTER', 'Bank Guarantee/Bond/Warranty Letter', 'VENDOR_BUNDLE', 'Vendor', 'Q'
WHERE NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_TYPE" WHERE document_code = 'BANK_GUARANTEE_BOND_WARRANTY_LETTER');
INSERT INTO "BUNDLE_DOCUMENT_TYPE" (document_code, document_name, channel, supplied_by, matrix_column_ref)
SELECT 'QUALITY_CERTIFICATE', 'Quality Certificate', 'VENDOR_BUNDLE', 'Vendor', 'R'
WHERE NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_TYPE" WHERE document_code = 'QUALITY_CERTIFICATE');
INSERT INTO "BUNDLE_DOCUMENT_TYPE" (document_code, document_name, channel, supplied_by, matrix_column_ref)
SELECT 'FACTORY_ACCEPTANCE_TEST_FAT', 'Factory Acceptance Test (FAT)', 'VENDOR_BUNDLE', 'Vendor', 'S'
WHERE NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_TYPE" WHERE document_code = 'FACTORY_ACCEPTANCE_TEST_FAT');
INSERT INTO "BUNDLE_DOCUMENT_TYPE" (document_code, document_name, channel, supplied_by, matrix_column_ref)
SELECT 'CONTRACT_ENGAGEMENT_LETTER', 'Contract / Engagement Letter', 'USER_UPLOAD', 'User', 'T'
WHERE NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_TYPE" WHERE document_code = 'CONTRACT_ENGAGEMENT_LETTER');
INSERT INTO "BUNDLE_DOCUMENT_TYPE" (document_code, document_name, channel, supplied_by, matrix_column_ref)
SELECT 'WORK_PROGRESS_CERTIFICATE_BAST', 'Work Progress Certificate / BAST', 'VENDOR_BUNDLE', 'Vendor', 'U'
WHERE NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_TYPE" WHERE document_code = 'WORK_PROGRESS_CERTIFICATE_BAST');
INSERT INTO "BUNDLE_DOCUMENT_TYPE" (document_code, document_name, channel, supplied_by, matrix_column_ref)
SELECT 'TIMESHEET', 'Timesheet', 'VENDOR_BUNDLE', 'Vendor', 'V'
WHERE NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_TYPE" WHERE document_code = 'TIMESHEET');
INSERT INTO "BUNDLE_DOCUMENT_TYPE" (document_code, document_name, channel, supplied_by, matrix_column_ref)
SELECT 'MANPOWER_SUMMARY', 'Manpower Summary', 'VENDOR_BUNDLE', 'Vendor', 'W'
WHERE NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_TYPE" WHERE document_code = 'MANPOWER_SUMMARY');
INSERT INTO "BUNDLE_DOCUMENT_TYPE" (document_code, document_name, channel, supplied_by, matrix_column_ref)
SELECT 'OVERTIME_APPROVAL', 'Overtime approval', 'VENDOR_BUNDLE', 'Vendor', 'Y'
WHERE NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_TYPE" WHERE document_code = 'OVERTIME_APPROVAL');
INSERT INTO "BUNDLE_DOCUMENT_TYPE" (document_code, document_name, channel, supplied_by, matrix_column_ref)
SELECT 'MEAL_ATTENDANCE_AT_CANTEEN_ALL_MEAL_TYPES', 'Meal Attendance at Canteen (all meal types)', 'VENDOR_BUNDLE', 'Vendor', 'Z'
WHERE NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_TYPE" WHERE document_code = 'MEAL_ATTENDANCE_AT_CANTEEN_ALL_MEAL_TYPES');
INSERT INTO "BUNDLE_DOCUMENT_TYPE" (document_code, document_name, channel, supplied_by, matrix_column_ref)
SELECT 'RECAPITULATION_BACK_CHARGE_SNACKS_SPECIAL_LUNCH_DI', 'Recapitulation Back charge (snacks, special lunch & dinner)', 'VENDOR_BUNDLE', 'Vendor', 'AA'
WHERE NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_TYPE" WHERE document_code = 'RECAPITULATION_BACK_CHARGE_SNACKS_SPECIAL_LUNCH_DI');
INSERT INTO "BUNDLE_DOCUMENT_TYPE" (document_code, document_name, channel, supplied_by, matrix_column_ref)
SELECT 'OTHER_REIMBURSEMENT_CATERING', 'Other Reimbursement Catering', 'VENDOR_BUNDLE', 'Vendor', 'AC'
WHERE NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_TYPE" WHERE document_code = 'OTHER_REIMBURSEMENT_CATERING');
INSERT INTO "BUNDLE_DOCUMENT_TYPE" (document_code, document_name, channel, supplied_by, matrix_column_ref)
SELECT 'COST_PER_ACCOMMODATION_REPORT', 'Cost per accommodation report', 'VENDOR_BUNDLE', 'Vendor', 'AD'
WHERE NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_TYPE" WHERE document_code = 'COST_PER_ACCOMMODATION_REPORT');
INSERT INTO "BUNDLE_DOCUMENT_TYPE" (document_code, document_name, channel, supplied_by, matrix_column_ref)
SELECT 'MEASUREMENTS_BILL_OF_QUANTITY', 'Measurements/Bill of Quantity', 'VENDOR_BUNDLE', 'Vendor', 'AE'
WHERE NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_TYPE" WHERE document_code = 'MEASUREMENTS_BILL_OF_QUANTITY');
INSERT INTO "BUNDLE_DOCUMENT_TYPE" (document_code, document_name, channel, supplied_by, matrix_column_ref)
SELECT 'INSPECTION_REPORT_CERTIFICATE_INCL_QUANTITY_CERTIF', 'Inspection report / certificate (incl. quantity certification)', 'VENDOR_BUNDLE', 'Vendor', 'AF'
WHERE NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_TYPE" WHERE document_code = 'INSPECTION_REPORT_CERTIFICATE_INCL_QUANTITY_CERTIF');
INSERT INTO "BUNDLE_DOCUMENT_TYPE" (document_code, document_name, channel, supplied_by, matrix_column_ref)
SELECT 'PHOTO_EVIDENCE', 'Photo Evidence', 'VENDOR_BUNDLE', 'Vendor', 'AG'
WHERE NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_TYPE" WHERE document_code = 'PHOTO_EVIDENCE');
INSERT INTO "BUNDLE_DOCUMENT_TYPE" (document_code, document_name, channel, supplied_by, matrix_column_ref)
SELECT 'TEST_REPORT', 'Test Report', 'VENDOR_BUNDLE', 'Vendor', 'AH'
WHERE NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_TYPE" WHERE document_code = 'TEST_REPORT');
INSERT INTO "BUNDLE_DOCUMENT_TYPE" (document_code, document_name, channel, supplied_by, matrix_column_ref)
SELECT 'SIUJK_PERMIT', 'SIUJK - Permit', 'VENDOR_BUNDLE', 'Vendor', 'AI'
WHERE NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_TYPE" WHERE document_code = 'SIUJK_PERMIT');
INSERT INTO "BUNDLE_DOCUMENT_TYPE" (document_code, document_name, channel, supplied_by, matrix_column_ref)
SELECT 'BILLING_SUMMARY', 'Billing Summary', 'VENDOR_BUNDLE', 'Vendor', 'AJ'
WHERE NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_TYPE" WHERE document_code = 'BILLING_SUMMARY');
INSERT INTO "BUNDLE_DOCUMENT_TYPE" (document_code, document_name, channel, supplied_by, matrix_column_ref)
SELECT 'GUARANTEE_LETTER', 'Guarantee Letter', 'VENDOR_BUNDLE', 'Vendor', 'AL'
WHERE NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_TYPE" WHERE document_code = 'GUARANTEE_LETTER');
INSERT INTO "BUNDLE_DOCUMENT_TYPE" (document_code, document_name, channel, supplied_by, matrix_column_ref)
SELECT 'ROOM_RESERVATION_FORM', 'Room Reservation Form', 'VENDOR_BUNDLE', 'Vendor', 'AM'
WHERE NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_TYPE" WHERE document_code = 'ROOM_RESERVATION_FORM');
INSERT INTO "BUNDLE_DOCUMENT_TYPE" (document_code, document_name, channel, supplied_by, matrix_column_ref)
SELECT 'PO_FOR_MATERIAL_BEING_IMPORTED', 'PO for material being imported', 'USER_UPLOAD', 'User', 'AN'
WHERE NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_TYPE" WHERE document_code = 'PO_FOR_MATERIAL_BEING_IMPORTED');
INSERT INTO "BUNDLE_DOCUMENT_TYPE" (document_code, document_name, channel, supplied_by, matrix_column_ref)
SELECT 'PEMBERITAHUAN_IMPOR_BARANG_PIB', 'Pemberitahuan Impor Barang (PIB)', 'USER_UPLOAD', 'User', 'AO'
WHERE NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_TYPE" WHERE document_code = 'PEMBERITAHUAN_IMPOR_BARANG_PIB');
INSERT INTO "BUNDLE_DOCUMENT_TYPE" (document_code, document_name, channel, supplied_by, matrix_column_ref)
SELECT 'SURAT_PERSETUJUAN_PENGELUARAN_BARANG_SPPB', 'Surat Persetujuan Pengeluaran Barang (SPPB)', 'USER_UPLOAD', 'User', 'AP'
WHERE NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_TYPE" WHERE document_code = 'SURAT_PERSETUJUAN_PENGELUARAN_BARANG_SPPB');
INSERT INTO "BUNDLE_DOCUMENT_TYPE" (document_code, document_name, channel, supplied_by, matrix_column_ref)
SELECT 'DELIVERY_ORDER_SURAT_JALAN', 'Delivery Order / Surat Jalan', 'VENDOR_BUNDLE', 'Vendor', 'AQ'
WHERE NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_TYPE" WHERE document_code = 'DELIVERY_ORDER_SURAT_JALAN');
INSERT INTO "BUNDLE_DOCUMENT_TYPE" (document_code, document_name, channel, supplied_by, matrix_column_ref)
SELECT 'MATERIAL_LISTS', 'Material Lists', 'VENDOR_BUNDLE', 'Vendor', 'AR'
WHERE NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_TYPE" WHERE document_code = 'MATERIAL_LISTS');
INSERT INTO "BUNDLE_DOCUMENT_TYPE" (document_code, document_name, channel, supplied_by, matrix_column_ref)
SELECT 'DELIVERABLE_AS_PER_CONTRACT', 'Deliverable as per Contract', 'VENDOR_BUNDLE', 'Vendor', 'AS'
WHERE NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_TYPE" WHERE document_code = 'DELIVERABLE_AS_PER_CONTRACT');
INSERT INTO "BUNDLE_DOCUMENT_TYPE" (document_code, document_name, channel, supplied_by, matrix_column_ref)
SELECT 'CERTIFICATION_AND_PROOF_OF_COMPLETION_OF_MILESTONE', 'Certification and proof of completion of milestones', 'VENDOR_BUNDLE', 'Vendor', 'AT'
WHERE NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_TYPE" WHERE document_code = 'CERTIFICATION_AND_PROOF_OF_COMPLETION_OF_MILESTONE');
INSERT INTO "BUNDLE_DOCUMENT_TYPE" (document_code, document_name, channel, supplied_by, matrix_column_ref)
SELECT 'SLA_CONFIRMATION_REPORT', 'SLA confirmation report', 'VENDOR_BUNDLE', 'Vendor', 'AU'
WHERE NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_TYPE" WHERE document_code = 'SLA_CONFIRMATION_REPORT');
INSERT INTO "BUNDLE_DOCUMENT_TYPE" (document_code, document_name, channel, supplied_by, matrix_column_ref)
SELECT 'BILLING_STATEMENTS', 'Billing Statements', 'VENDOR_BUNDLE', 'Vendor', 'AV'
WHERE NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_TYPE" WHERE document_code = 'BILLING_STATEMENTS');
INSERT INTO "BUNDLE_DOCUMENT_TYPE" (document_code, document_name, channel, supplied_by, matrix_column_ref)
SELECT 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA', 'Approved Settlement form as per DOA', 'USER_UPLOAD', 'User', 'AW'
WHERE NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_TYPE" WHERE document_code = 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA');
INSERT INTO "BUNDLE_DOCUMENT_TYPE" (document_code, document_name, channel, supplied_by, matrix_column_ref)
SELECT 'BANK_TRANSFER_PROOF_CASH_ADVANCE_RECON', 'Bank transfer proof / cash advance recon.', 'USER_UPLOAD', 'User', 'AX'
WHERE NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_TYPE" WHERE document_code = 'BANK_TRANSFER_PROOF_CASH_ADVANCE_RECON');
INSERT INTO "BUNDLE_DOCUMENT_TYPE" (document_code, document_name, channel, supplied_by, matrix_column_ref)
SELECT 'REFUND_SLIP_FOR_UNUSED_ADVANCE', 'Refund slip for unused advance', 'USER_UPLOAD', 'User', 'AY'
WHERE NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_TYPE" WHERE document_code = 'REFUND_SLIP_FOR_UNUSED_ADVANCE');
INSERT INTO "BUNDLE_DOCUMENT_TYPE" (document_code, document_name, channel, supplied_by, matrix_column_ref)
SELECT 'GUEST_LIST_IF_APPLICABLE', 'Guest List (if applicable)', 'USER_UPLOAD', 'User', 'AZ'
WHERE NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_TYPE" WHERE document_code = 'GUEST_LIST_IF_APPLICABLE');
INSERT INTO "BUNDLE_DOCUMENT_TYPE" (document_code, document_name, channel, supplied_by, matrix_column_ref)
SELECT 'COPY_OF_AGENDA_OR_MOU', 'Copy of Agenda or MOU', 'USER_UPLOAD', 'User', 'BA'
WHERE NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_TYPE" WHERE document_code = 'COPY_OF_AGENDA_OR_MOU');
INSERT INTO "BUNDLE_DOCUMENT_TYPE" (document_code, document_name, channel, supplied_by, matrix_column_ref)
SELECT 'EXPENSE_REPORT_ADVANCE_SETTLEMENT_FORM', 'Expense Report & Advance Settlement Form', 'USER_UPLOAD', 'User', 'BC'
WHERE NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_TYPE" WHERE document_code = 'EXPENSE_REPORT_ADVANCE_SETTLEMENT_FORM');
INSERT INTO "BUNDLE_DOCUMENT_TYPE" (document_code, document_name, channel, supplied_by, matrix_column_ref)
SELECT 'VALID_INVOICES_RECEIPTS_TAX_DOCUMENTS', 'Valid invoices, receipts & tax documents', 'USER_UPLOAD', 'User', 'BD'
WHERE NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_TYPE" WHERE document_code = 'VALID_INVOICES_RECEIPTS_TAX_DOCUMENTS');
INSERT INTO "BUNDLE_DOCUMENT_TYPE" (document_code, document_name, channel, supplied_by, matrix_column_ref)
SELECT 'BOOKING_CONFIRMATION', 'Booking confirmation', 'USER_UPLOAD', 'User', 'BE'
WHERE NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_TYPE" WHERE document_code = 'BOOKING_CONFIRMATION');
INSERT INTO "BUNDLE_DOCUMENT_TYPE" (document_code, document_name, channel, supplied_by, matrix_column_ref)
SELECT 'MANAGEMENT_OR_FUNCTIONAL_APPROVAL_AS_PER_DOA', 'Management or functional approval (as per DOA)', 'USER_UPLOAD', 'User', 'BF'
WHERE NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_TYPE" WHERE document_code = 'MANAGEMENT_OR_FUNCTIONAL_APPROVAL_AS_PER_DOA');

-- System columns. physical_name is the matrix column, not a confirmed SAP table.
INSERT INTO "REFERENCE_TABLE" (physical_name, display_name, source_kind, connector_key)
SELECT 'matrix_po', 'PO Master [PO]', 'SAP_SYNC', NULL
WHERE NOT EXISTS (SELECT 1 FROM "REFERENCE_TABLE" WHERE physical_name = 'matrix_po');
INSERT INTO "REFERENCE_TABLE" (physical_name, display_name, source_kind, connector_key)
SELECT 'matrix_grn', 'GRIR - Ledger [GRN]', 'SAP_SYNC', NULL
WHERE NOT EXISTS (SELECT 1 FROM "REFERENCE_TABLE" WHERE physical_name = 'matrix_grn');
INSERT INTO "REFERENCE_TABLE" (physical_name, display_name, source_kind, connector_key)
SELECT 'matrix_coretax_validation_djp_portal', 'DJP Coretax - e-Faktur validity check [Coretax validation (DJP portal)]', 'EXTERNAL_API', 'coretax_validation_djp_portal'
WHERE NOT EXISTS (SELECT 1 FROM "REFERENCE_TABLE" WHERE physical_name = 'matrix_coretax_validation_djp_portal');
INSERT INTO "REFERENCE_TABLE" (physical_name, display_name, source_kind, connector_key)
SELECT 'matrix_vendor_master_data', 'SAP - Vendor Master (LFA1 / LFBK), incl. negative-list / block indicator and AP ledger balance [Vendor Master Data]', 'SAP_SYNC', NULL
WHERE NOT EXISTS (SELECT 1 FROM "REFERENCE_TABLE" WHERE physical_name = 'matrix_vendor_master_data');
INSERT INTO "REFERENCE_TABLE" (physical_name, display_name, source_kind, connector_key)
SELECT 'matrix_processed_invoice_history', 'SAP - posted vendor invoices (BKPF / RBKP) & Faktur Pajak register [Processed Invoice History]', 'SAP_SYNC', NULL
WHERE NOT EXISTS (SELECT 1 FROM "REFERENCE_TABLE" WHERE physical_name = 'matrix_processed_invoice_history');
INSERT INTO "REFERENCE_TABLE" (physical_name, display_name, source_kind, connector_key)
SELECT 'matrix_service_entry_sheet', 'GRIR - Ledger [Service Entry Sheet]', 'SAP_SYNC', NULL
WHERE NOT EXISTS (SELECT 1 FROM "REFERENCE_TABLE" WHERE physical_name = 'matrix_service_entry_sheet');
INSERT INTO "REFERENCE_TABLE" (physical_name, display_name, source_kind, connector_key)
SELECT 'matrix_attendence_face_id', 'Biometric Machine - ESSA [Attendence - Face ID]', 'EXTERNAL_API', 'attendence_face_id'
WHERE NOT EXISTS (SELECT 1 FROM "REFERENCE_TABLE" WHERE physical_name = 'matrix_attendence_face_id');
INSERT INTO "REFERENCE_TABLE" (physical_name, display_name, source_kind, connector_key)
SELECT 'matrix_hcis_clearing_account', 'SAP GL [HCIS Clearing Account]', 'SAP_SYNC', NULL
WHERE NOT EXISTS (SELECT 1 FROM "REFERENCE_TABLE" WHERE physical_name = 'matrix_hcis_clearing_account');
INSERT INTO "REFERENCE_TABLE" (physical_name, display_name, source_kind, connector_key)
SELECT 'matrix_internal_order', 'IO Matrix [Internal Order]', 'INTERNAL_REGISTER', NULL
WHERE NOT EXISTS (SELECT 1 FROM "REFERENCE_TABLE" WHERE physical_name = 'matrix_internal_order');

-- Data points, one per matrix row.
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_1_01', 'Vendor name', 'TEXT', NULL, 'Common 1.01'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_1_01');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_1_02', 'Vendor bank account number', 'NUMBER', NULL, 'Common 1.02'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_1_02');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_1_03', 'Invoice date', 'DATE', 'DATE_ISO', 'Common 1.03'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_1_03');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_1_04', 'PO number', 'CODE', NULL, 'Common 1.04'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_1_04');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_1_05', 'Invoice number', 'CODE', NULL, 'Common 1.05'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_1_05');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_1_06', 'Unit rate', 'AMOUNT', NULL, 'Common 1.06'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_1_06');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_1_07', 'Payment terms', 'TEXT', NULL, 'Common 1.07'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_1_07');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_1_08', 'Invoice Amount', 'AMOUNT', NULL, 'Common 1.08'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_1_08');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_1_09', 'Item description', 'TEXT', NULL, 'Common 1.09'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_1_09');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_1_10', 'Quantity', 'NUMBER', NULL, 'Common 1.10'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_1_10');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_1_11', 'ESSA Company Name', 'TEXT', 'COMPANY_NAME', 'Common 1.11'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_1_11');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_1_12', 'Vendor NPWP number', 'CODE', 'NPWP_DIGITS', 'Common 1.12'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_1_12');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_1_13', 'Faktur Pajak value', 'AMOUNT', NULL, 'Common 1.13'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_1_13');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_1_14', 'Faktur Pajak date', 'DATE', 'DATE_ISO', 'Common 1.14'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_1_14');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_1_15', 'Faktur Pajak vendor name', 'TEXT', NULL, 'Common 1.15'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_1_15');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_1_16', 'Faktur Pajak number', 'CODE', NULL, 'Common 1.16'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_1_16');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_1_17', 'Faktur Pajak Bar Code', 'CODE', NULL, 'Common 1.17'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_1_17');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_1_18', 'Negative Vendor List', 'TEXT', NULL, 'Common 1.18'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_1_18');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_1_19', 'Vendor debit balance', 'AMOUNT', NULL, 'Common 1.19'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_1_19');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_1_20', 'Liquidated Clause', 'DATE', 'DATE_ISO', 'Common 1.20'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_1_20');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_1_21', 'Retention Clause', 'TEXT', NULL, 'Common 1.21'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_1_21');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_1_22', 'Advance recovery Clause', 'TEXT', NULL, 'Common 1.22'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_1_22');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_1_23', 'Percentage Completion (BAST & SES)', 'PERCENT', NULL, 'Common 1.23'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_1_23');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_1_24', 'Duplicate invoice check (vendor + invoice no. + amount + date)', 'DATE', 'DATE_ISO', 'Common 1.24'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_1_24');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_1_25', 'Duplicate Faktur Pajak check (FP number)', 'CODE', NULL, 'Common 1.25'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_1_25');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_1_26', 'Currency', 'TEXT', NULL, 'Common 1.26'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_1_26');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_1_27', 'Exchange rate applied', 'NUMBER', NULL, 'Common 1.27'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_1_27');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_1_28', 'PPN rate and DPP (taxable base)', 'PERCENT', NULL, 'Common 1.28'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_1_28');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_1_29', 'WHT type and rate (PPh 21 / 23 / 4(2))', 'PERCENT', NULL, 'Common 1.29'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_1_29');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_1_30', 'Payment baseline date and due date', 'DATE', 'DATE_ISO', 'Common 1.30'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_1_30');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_1_31', 'Date sequence (service period - GRN - invoice - FP)', 'DATE', 'DATE_ISO', 'Common 1.31'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_1_31');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_1_32', 'PO remaining balance (quantity and value)', 'AMOUNT', NULL, 'Common 1.32'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_1_32');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_1_33', 'Vendor bank account changed since last payment', 'NUMBER', NULL, 'Common 1.33'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_1_33');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_2_01', 'Item description', 'TEXT', NULL, 'Material 2.01'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_2_01');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_2_02', 'Airway Bill / Shipping Bill Date', 'DATE', 'DATE_ISO', 'Material 2.02'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_2_02');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_2_03', 'Airway Bill / Shipping Bill Name', 'TEXT', NULL, 'Material 2.03'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_2_03');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_2_04', 'Bank Guarantee / Performance Bond Expiry Date', 'DATE', 'DATE_ISO', 'Material 2.04'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_2_04');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_2_05', 'Bank Guarantee / Performance Bond Amt.', 'AMOUNT', NULL, 'Material 2.05'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_2_05');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_3_01', 'Man-hours Qty.', 'NUMBER', NULL, 'Manpower Outsourcing 3.01'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_3_01');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_3_02', 'Man-hours Unit Rate', 'AMOUNT', NULL, 'Manpower Outsourcing 3.02'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_3_02');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_3_03', 'Overtime Qty.', 'NUMBER', NULL, 'Manpower Outsourcing 3.03'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_3_03');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_3_04', 'Overtime unit rate', 'AMOUNT', NULL, 'Manpower Outsourcing 3.04'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_3_04');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_4_01', 'Daily POB count', 'NUMBER', NULL, 'Catering 4.01'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_4_01');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_4_02', 'Meal Sheet - Attendance', 'TEXT', NULL, 'Catering 4.02'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_4_02');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_4_03', 'Packed Meal Sheet - Attendance', 'TEXT', NULL, 'Catering 4.03'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_4_03');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_4_04', 'Snack back-charge Qty.', 'NUMBER', NULL, 'Catering 4.04'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_4_04');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_4_05', 'Special-meal back-charge Qty.', 'NUMBER', NULL, 'Catering 4.05'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_4_05');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_4_06', 'Special dinners Qty.', 'NUMBER', NULL, 'Catering 4.06'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_4_06');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_4_07', 'Special lunches Qty.', 'NUMBER', NULL, 'Catering 4.07'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_4_07');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_4_08', 'Employee Name', 'TEXT', NULL, 'Catering 4.08'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_4_08');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_4_09', 'Date', 'DATE', 'DATE_ISO', 'Catering 4.09'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_4_09');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_4_10', 'Employee ID', 'CODE', NULL, 'Catering 4.10'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_4_10');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_4_11', 'Indian Cook - Attendance', 'TEXT', NULL, 'Catering 4.11'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_4_11');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_4_12', 'Flight ticket - Employee Name', 'TEXT', NULL, 'Catering 4.12'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_4_12');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_4_13', 'ITAS - Employee Name', 'TEXT', NULL, 'Catering 4.13'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_4_13');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_5_01', 'Number of Rooms', 'NUMBER', NULL, 'Housekeeping 5.01'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_5_01');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_6_01', 'Equipment Hours', 'NUMBER', NULL, 'Rental Equipment 6.01'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_6_01');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_6_02', 'Equipment unit rate', 'AMOUNT', NULL, 'Rental Equipment 6.02'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_6_02');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_6_03', 'Operator Manhours', 'NUMBER', NULL, 'Rental Equipment 6.03'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_6_03');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_7_01', 'Quantity - BOQ', 'NUMBER', NULL, 'Civil Works (Construction) 7.01'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_7_01');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_7_02', 'Completion Proof', 'TEXT', NULL, 'Civil Works (Construction) 7.02'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_7_02');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_7_03', 'SIUJK expiry date', 'DATE', 'DATE_ISO', 'Civil Works (Construction) 7.03'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_7_03');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_7_04', 'SIUJK WHT rate', 'PERCENT', NULL, 'Civil Works (Construction) 7.04'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_7_04');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_8_01', 'ESSA Company Name', 'TEXT', 'COMPANY_NAME', 'PIB 8.01'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_8_01');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_8_02', 'PIB Amount', 'AMOUNT', NULL, 'PIB 8.02'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_8_02');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_8_03', 'Item Description', 'TEXT', NULL, 'PIB 8.03'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_8_03');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_9_01', 'Trip ID', 'CODE', NULL, 'Travel - Non PO 9.01'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_9_01');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_9_02', 'Airline', 'TEXT', NULL, 'Travel - Non PO 9.02'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_9_02');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_9_03', 'Route', 'TEXT', NULL, 'Travel - Non PO 9.03'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_9_03');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_9_04', 'Travel dates', 'DATE', 'DATE_ISO', 'Travel - Non PO 9.04'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_9_04');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_9_05', 'Passenger name', 'TEXT', NULL, 'Travel - Non PO 9.05'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_9_05');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_9_06', 'Travel class', 'TEXT', NULL, 'Travel - Non PO 9.06'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_9_06');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_9_07', 'HCIS Ledger amount', 'AMOUNT', NULL, 'Travel - Non PO 9.07'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_9_07');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_10_01', 'Hotel Trip ID', 'CODE', NULL, 'Hotel - Non PO 10.01'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_10_01');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_10_02', 'Hotel dates', 'DATE', 'DATE_ISO', 'Hotel - Non PO 10.02'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_10_02');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_10_03', 'Guest name', 'TEXT', NULL, 'Hotel - Non PO 10.03'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_10_03');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_10_04', 'HCIS Ledger amount', 'AMOUNT', NULL, 'Hotel - Non PO 10.04'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_10_04');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_11_01', 'Item Description', 'TEXT', NULL, 'Import Logistics 11.01'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_11_01');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_11_02', 'Airway / Shipping Bill - Vendor name', 'TEXT', NULL, 'Import Logistics 11.02'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_11_02');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_11_03', 'Consignee Name', 'TEXT', NULL, 'Import Logistics 11.03'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_11_03');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_11_04', 'PIB', 'TEXT', NULL, 'Import Logistics 11.04'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_11_04');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_11_05', 'Forwarder Name', 'TEXT', NULL, 'Import Logistics 11.05'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_11_05');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_12_01', 'Delivery Date', 'DATE', 'DATE_ISO', 'Domestic Logistic 12.01'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_12_01');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_12_02', 'Delivery confirmation', 'TEXT', NULL, 'Domestic Logistic 12.02'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_12_02');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_12_03', 'Item description', 'TEXT', NULL, 'Domestic Logistic 12.03'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_12_03');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_12_04', 'PO number - Transported Goods', 'CODE', NULL, 'Domestic Logistic 12.04'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_12_04');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_13_01', 'Man-hours / Man-months', 'NUMBER', NULL, 'Consultants (Time Based) 13.01'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_13_01');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_13_02', 'Unit Price', 'AMOUNT', NULL, 'Consultants (Time Based) 13.02'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_13_02');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_13_03', 'Terms & Conditions', 'TEXT', NULL, 'Consultants (Time Based) 13.03'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_13_03');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_13_04', 'Contract deliverables', 'TEXT', NULL, 'Consultants (Time Based) 13.04'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_13_04');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_14_01', 'Terms, Conditions and Milestones', 'TEXT', NULL, 'Consultants (Milestone) 14.01'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_14_01');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_15_01', 'Man-hours / Man-months', 'NUMBER', NULL, 'Medical Services 15.01'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_15_01');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_15_02', 'Unit Price', 'AMOUNT', NULL, 'Medical Services 15.02'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_15_02');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_15_03', 'Equipment Hours / Months', 'NUMBER', NULL, 'Medical Services 15.03'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_15_03');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_15_04', 'Equipment Unit Price', 'AMOUNT', NULL, 'Medical Services 15.04'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_15_04');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_16_01', 'Inspection Report quantity', 'NUMBER', NULL, 'Surveillance and Inspection 16.01'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_16_01');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_16_02', 'SLA confirmation', 'TEXT', NULL, 'Surveillance and Inspection 16.02'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_16_02');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_17_01', 'DOA approval', 'TEXT', NULL, 'Telecom and Internet Services 17.01'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_17_01');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_17_02', 'SLA confirmation', 'TEXT', NULL, 'Telecom and Internet Services 17.02'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_17_02');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_18_01', 'Settlement Amount', 'AMOUNT', NULL, 'CSR / External Relation 18.01'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_18_01');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_18_02', 'Beneficiary Name', 'TEXT', NULL, 'CSR / External Relation 18.02'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_18_02');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_18_03', 'Payment Amount', 'AMOUNT', NULL, 'CSR / External Relation 18.03'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_18_03');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_18_04', 'Guest Name', 'TEXT', NULL, 'CSR / External Relation 18.04'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_18_04');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_18_05', 'WHT Amount (if applicable)', 'AMOUNT', NULL, 'CSR / External Relation 18.05'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_18_05');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_18_06', 'MOU', 'TEXT', NULL, 'CSR / External Relation 18.06'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_18_06');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_19_01', 'Settlement Amount', 'AMOUNT', NULL, 'Corporate Credit Card 19.01'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_19_01');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_19_02', 'Payment Amount', 'AMOUNT', NULL, 'Corporate Credit Card 19.02'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_19_02');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_19_03', 'Card Holder Name', 'TEXT', NULL, 'Corporate Credit Card 19.03'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_19_03');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_19_04', 'Merchant Name', 'TEXT', NULL, 'Corporate Credit Card 19.04'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_19_04');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_19_05', 'Internal Order Number', 'CODE', NULL, 'Corporate Credit Card 19.05'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_19_05');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_19_06', 'WHT Amount (if applicable)', 'AMOUNT', NULL, 'Corporate Credit Card 19.06'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_19_06');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_19_07', 'PO Number (If applicable)', 'CODE', NULL, 'Corporate Credit Card 19.07'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_19_07');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_20_01', 'Settlement Amount', 'AMOUNT', NULL, 'Misc. Business Expenses 20.01'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_20_01');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_20_02', 'Payment Amount', 'AMOUNT', NULL, 'Misc. Business Expenses 20.02'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_20_02');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_20_03', 'Internal Order Number', 'CODE', NULL, 'Misc. Business Expenses 20.03'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_20_03');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_20_04', 'Vendor Name', 'TEXT', NULL, 'Misc. Business Expenses 20.04'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_20_04');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_20_05', 'WHT Amount (if applicable)', 'AMOUNT', NULL, 'Misc. Business Expenses 20.05'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_20_05');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_21_01', 'Settlement Amount', 'AMOUNT', NULL, 'Events and Celebrations 21.01'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_21_01');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_21_02', 'Payment Amount', 'AMOUNT', NULL, 'Events and Celebrations 21.02'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_21_02');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_21_03', 'Internal Order Number', 'CODE', NULL, 'Events and Celebrations 21.03'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_21_03');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_21_04', 'Guest Name', 'TEXT', NULL, 'Events and Celebrations 21.04'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_21_04');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_21_05', 'Vendor Name', 'TEXT', NULL, 'Events and Celebrations 21.05'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_21_05');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_21_06', 'PO Number (If applicable)', 'CODE', NULL, 'Events and Celebrations 21.06'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_21_06');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_21_07', 'WHT Amount (if applicable)', 'AMOUNT', NULL, 'Events and Celebrations 21.07'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_21_07');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_22_01', 'Settlement Amount', 'AMOUNT', NULL, 'Employee Settlements 22.01'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_22_01');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_22_02', 'Payment Amount', 'AMOUNT', NULL, 'Employee Settlements 22.02'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_22_02');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_22_03', 'Vendor Name', 'TEXT', NULL, 'Employee Settlements 22.03'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_22_03');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_22_04', 'Internal Order Number', 'CODE', NULL, 'Employee Settlements 22.04'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_22_04');
INSERT INTO "DATA_POINT" (data_point_code, data_point_name, data_type, normalizer_key, description)
SELECT 'DP_22_05', 'WHT Amount (if applicable)', 'AMOUNT', NULL, 'Employee Settlements 22.05'
WHERE NOT EXISTS (SELECT 1 FROM "DATA_POINT" WHERE data_point_code = 'DP_22_05');

-- X / o on bundle documents.
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.01', 'EXACT', 'Vendor name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_1_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.01', 'EXACT', 'Vendor name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'FAKTUR_PAJAK' AND p.data_point_code = 'DP_1_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.01', 'PARTIAL', 'Vendor name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'DELIVERY_NOTE' AND p.data_point_code = 'DP_1_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.01', 'PARTIAL', 'Vendor name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'PACKING_LIST' AND p.data_point_code = 'DP_1_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.01', 'PARTIAL', 'Vendor name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'AIRWAY_BILL' AND p.data_point_code = 'DP_1_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.01', 'PARTIAL', 'Vendor name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'SHIPPING_BILL' AND p.data_point_code = 'DP_1_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.01', 'PARTIAL', 'Vendor name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'BANK_GUARANTEE_BOND_WARRANTY_LETTER' AND p.data_point_code = 'DP_1_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.01', 'PARTIAL', 'Vendor name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'QUALITY_CERTIFICATE' AND p.data_point_code = 'DP_1_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.01', 'PARTIAL', 'Vendor name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'FACTORY_ACCEPTANCE_TEST_FAT' AND p.data_point_code = 'DP_1_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.01', 'PARTIAL', 'Vendor name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'CONTRACT_ENGAGEMENT_LETTER' AND p.data_point_code = 'DP_1_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.01', 'PARTIAL', 'Vendor name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'WORK_PROGRESS_CERTIFICATE_BAST' AND p.data_point_code = 'DP_1_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.01', 'PARTIAL', 'Vendor name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'TIMESHEET' AND p.data_point_code = 'DP_1_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.01', 'PARTIAL', 'Vendor name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'MANPOWER_SUMMARY' AND p.data_point_code = 'DP_1_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.01', 'PARTIAL', 'Vendor name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'OVERTIME_APPROVAL' AND p.data_point_code = 'DP_1_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.01', 'PARTIAL', 'Vendor name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'MEASUREMENTS_BILL_OF_QUANTITY' AND p.data_point_code = 'DP_1_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.01', 'PARTIAL', 'Vendor name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INSPECTION_REPORT_CERTIFICATE_INCL_QUANTITY_CERTIF' AND p.data_point_code = 'DP_1_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.01', 'PARTIAL', 'Vendor name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'TEST_REPORT' AND p.data_point_code = 'DP_1_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.01', 'PARTIAL', 'Vendor name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'SIUJK_PERMIT' AND p.data_point_code = 'DP_1_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.01', 'PARTIAL', 'Vendor name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'BILLING_SUMMARY' AND p.data_point_code = 'DP_1_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.01', 'PARTIAL', 'Vendor name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'GUARANTEE_LETTER' AND p.data_point_code = 'DP_1_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.01', 'PARTIAL', 'Vendor name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'ROOM_RESERVATION_FORM' AND p.data_point_code = 'DP_1_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.01', 'PARTIAL', 'Vendor name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'SURAT_PERSETUJUAN_PENGELUARAN_BARANG_SPPB' AND p.data_point_code = 'DP_1_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.01', 'PARTIAL', 'Vendor name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'DELIVERY_ORDER_SURAT_JALAN' AND p.data_point_code = 'DP_1_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.01', 'PARTIAL', 'Vendor name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'CERTIFICATION_AND_PROOF_OF_COMPLETION_OF_MILESTONE' AND p.data_point_code = 'DP_1_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.01', 'PARTIAL', 'Vendor name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'BILLING_STATEMENTS' AND p.data_point_code = 'DP_1_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.02', 'EXACT', 'Vendor bank account number'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_1_02'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.02');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.03', 'EXACT', 'Invoice date'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_1_03'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.03');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.03', 'EXACT', 'Invoice date'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'FAKTUR_PAJAK' AND p.data_point_code = 'DP_1_03'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.03');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.04', 'EXACT', 'PO number'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_1_04'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.04');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.04', 'PARTIAL', 'PO number'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'DELIVERY_NOTE' AND p.data_point_code = 'DP_1_04'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.04');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.04', 'PARTIAL', 'PO number'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'PACKING_LIST' AND p.data_point_code = 'DP_1_04'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.04');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.04', 'EXACT', 'PO number'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'CONTRACT_ENGAGEMENT_LETTER' AND p.data_point_code = 'DP_1_04'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.04');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.04', 'PARTIAL', 'PO number'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'WORK_PROGRESS_CERTIFICATE_BAST' AND p.data_point_code = 'DP_1_04'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.04');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.04', 'PARTIAL', 'PO number'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'TIMESHEET' AND p.data_point_code = 'DP_1_04'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.04');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.04', 'PARTIAL', 'PO number'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'MANPOWER_SUMMARY' AND p.data_point_code = 'DP_1_04'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.04');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.04', 'PARTIAL', 'PO number'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'OVERTIME_APPROVAL' AND p.data_point_code = 'DP_1_04'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.04');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.04', 'PARTIAL', 'PO number'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'MEASUREMENTS_BILL_OF_QUANTITY' AND p.data_point_code = 'DP_1_04'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.04');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.04', 'PARTIAL', 'PO number'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INSPECTION_REPORT_CERTIFICATE_INCL_QUANTITY_CERTIF' AND p.data_point_code = 'DP_1_04'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.04');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.04', 'PARTIAL', 'PO number'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'DELIVERY_ORDER_SURAT_JALAN' AND p.data_point_code = 'DP_1_04'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.04');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.04', 'PARTIAL', 'PO number'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'MATERIAL_LISTS' AND p.data_point_code = 'DP_1_04'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.04');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.04', 'PARTIAL', 'PO number'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'DELIVERABLE_AS_PER_CONTRACT' AND p.data_point_code = 'DP_1_04'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.04');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.04', 'PARTIAL', 'PO number'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'CERTIFICATION_AND_PROOF_OF_COMPLETION_OF_MILESTONE' AND p.data_point_code = 'DP_1_04'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.04');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.05', 'EXACT', 'Invoice number'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_1_05'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.05');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.05', 'EXACT', 'Invoice number'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'FAKTUR_PAJAK' AND p.data_point_code = 'DP_1_05'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.05');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.06', 'EXACT', 'Unit rate'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_1_06'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.06');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.06', 'EXACT', 'Unit rate'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'CONTRACT_ENGAGEMENT_LETTER' AND p.data_point_code = 'DP_1_06'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.06');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.06', 'EXACT', 'Unit rate'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'MANPOWER_SUMMARY' AND p.data_point_code = 'DP_1_06'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.06');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.07', 'EXACT', 'Payment terms'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_1_07'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.07');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.07', 'EXACT', 'Payment terms'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'CONTRACT_ENGAGEMENT_LETTER' AND p.data_point_code = 'DP_1_07'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.07');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.08', 'EXACT', 'Invoice Amount'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_1_08'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.08');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.08', 'EXACT', 'Invoice Amount'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'FAKTUR_PAJAK' AND p.data_point_code = 'DP_1_08'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.08');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.08', 'EXACT', 'Invoice Amount'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'BILLING_SUMMARY' AND p.data_point_code = 'DP_1_08'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.08');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.08', 'EXACT', 'Invoice Amount'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'BILLING_STATEMENTS' AND p.data_point_code = 'DP_1_08'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.08');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.09', 'EXACT', 'Item description'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_1_09'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.09');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.09', 'EXACT', 'Item description'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'FAKTUR_PAJAK' AND p.data_point_code = 'DP_1_09'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.09');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.09', 'PARTIAL', 'Item description'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'DELIVERY_NOTE' AND p.data_point_code = 'DP_1_09'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.09');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.09', 'PARTIAL', 'Item description'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'PACKING_LIST' AND p.data_point_code = 'DP_1_09'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.09');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.09', 'PARTIAL', 'Item description'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'MEASUREMENTS_BILL_OF_QUANTITY' AND p.data_point_code = 'DP_1_09'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.09');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.09', 'PARTIAL', 'Item description'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'DELIVERY_ORDER_SURAT_JALAN' AND p.data_point_code = 'DP_1_09'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.09');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.09', 'PARTIAL', 'Item description'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'MATERIAL_LISTS' AND p.data_point_code = 'DP_1_09'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.09');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.10', 'EXACT', 'Quantity'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_1_10'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.10');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.10', 'PARTIAL', 'Quantity'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'DELIVERY_NOTE' AND p.data_point_code = 'DP_1_10'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.10');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.10', 'PARTIAL', 'Quantity'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'PACKING_LIST' AND p.data_point_code = 'DP_1_10'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.10');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.10', 'PARTIAL', 'Quantity'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'MANPOWER_SUMMARY' AND p.data_point_code = 'DP_1_10'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.10');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.10', 'EXACT', 'Quantity'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'MEASUREMENTS_BILL_OF_QUANTITY' AND p.data_point_code = 'DP_1_10'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.10');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.10', 'PARTIAL', 'Quantity'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'DELIVERY_ORDER_SURAT_JALAN' AND p.data_point_code = 'DP_1_10'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.10');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.10', 'PARTIAL', 'Quantity'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'MATERIAL_LISTS' AND p.data_point_code = 'DP_1_10'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.10');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.11', 'EXACT', 'ESSA Company Name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_1_11'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.11');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.11', 'EXACT', 'ESSA Company Name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'FAKTUR_PAJAK' AND p.data_point_code = 'DP_1_11'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.11');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.11', 'PARTIAL', 'ESSA Company Name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'AIRWAY_BILL' AND p.data_point_code = 'DP_1_11'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.11');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.11', 'PARTIAL', 'ESSA Company Name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'SHIPPING_BILL' AND p.data_point_code = 'DP_1_11'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.11');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.11', 'PARTIAL', 'ESSA Company Name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'BANK_GUARANTEE_BOND_WARRANTY_LETTER' AND p.data_point_code = 'DP_1_11'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.11');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.11', 'PARTIAL', 'ESSA Company Name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'QUALITY_CERTIFICATE' AND p.data_point_code = 'DP_1_11'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.11');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.11', 'PARTIAL', 'ESSA Company Name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'CONTRACT_ENGAGEMENT_LETTER' AND p.data_point_code = 'DP_1_11'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.11');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.11', 'PARTIAL', 'ESSA Company Name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'WORK_PROGRESS_CERTIFICATE_BAST' AND p.data_point_code = 'DP_1_11'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.11');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.11', 'PARTIAL', 'ESSA Company Name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INSPECTION_REPORT_CERTIFICATE_INCL_QUANTITY_CERTIF' AND p.data_point_code = 'DP_1_11'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.11');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.11', 'PARTIAL', 'ESSA Company Name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'GUARANTEE_LETTER' AND p.data_point_code = 'DP_1_11'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.11');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.11', 'PARTIAL', 'ESSA Company Name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'CERTIFICATION_AND_PROOF_OF_COMPLETION_OF_MILESTONE' AND p.data_point_code = 'DP_1_11'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.11');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.12', 'EXACT', 'Vendor NPWP number'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_1_12'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.12');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.12', 'EXACT', 'Vendor NPWP number'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'FAKTUR_PAJAK' AND p.data_point_code = 'DP_1_12'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.12');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.13', 'EXACT', 'Faktur Pajak value'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_1_13'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.13');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.13', 'EXACT', 'Faktur Pajak value'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'FAKTUR_PAJAK' AND p.data_point_code = 'DP_1_13'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.13');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.14', 'EXACT', 'Faktur Pajak date'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_1_14'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.14');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.14', 'EXACT', 'Faktur Pajak date'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'FAKTUR_PAJAK' AND p.data_point_code = 'DP_1_14'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.14');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.15', 'EXACT', 'Faktur Pajak vendor name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_1_15'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.15');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.15', 'EXACT', 'Faktur Pajak vendor name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'FAKTUR_PAJAK' AND p.data_point_code = 'DP_1_15'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.15');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.16', 'EXACT', 'Faktur Pajak number'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'FAKTUR_PAJAK' AND p.data_point_code = 'DP_1_16'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.16');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.17', 'EXACT', 'Faktur Pajak Bar Code'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'FAKTUR_PAJAK' AND p.data_point_code = 'DP_1_17'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.17');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.18', 'EXACT', 'Negative Vendor List'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_1_18'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.18');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.20', 'EXACT', 'Liquidated Clause'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'CONTRACT_ENGAGEMENT_LETTER' AND p.data_point_code = 'DP_1_20'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.20');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.21', 'EXACT', 'Retention Clause'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'CONTRACT_ENGAGEMENT_LETTER' AND p.data_point_code = 'DP_1_21'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.21');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.22', 'EXACT', 'Advance recovery Clause'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'CONTRACT_ENGAGEMENT_LETTER' AND p.data_point_code = 'DP_1_22'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.22');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.23', 'EXACT', 'Percentage Completion (BAST & SES)'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_1_23'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.23');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.23', 'EXACT', 'Percentage Completion (BAST & SES)'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'WORK_PROGRESS_CERTIFICATE_BAST' AND p.data_point_code = 'DP_1_23'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.23');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.23', 'EXACT', 'Percentage Completion (BAST & SES)'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'DELIVERABLE_AS_PER_CONTRACT' AND p.data_point_code = 'DP_1_23'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.23');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.23', 'EXACT', 'Percentage Completion (BAST & SES)'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'CERTIFICATION_AND_PROOF_OF_COMPLETION_OF_MILESTONE' AND p.data_point_code = 'DP_1_23'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.23');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.23', 'EXACT', 'Percentage Completion (BAST & SES)'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'MANAGEMENT_OR_FUNCTIONAL_APPROVAL_AS_PER_DOA' AND p.data_point_code = 'DP_1_23'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.23');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.24', 'EXACT', 'Duplicate invoice check (vendor + invoice no. + amount + date)'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_1_24'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.24');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.25', 'EXACT', 'Duplicate Faktur Pajak check (FP number)'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'FAKTUR_PAJAK' AND p.data_point_code = 'DP_1_25'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.25');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.26', 'EXACT', 'Currency'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_1_26'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.26');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.26', 'EXACT', 'Currency'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'FAKTUR_PAJAK' AND p.data_point_code = 'DP_1_26'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.26');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.27', 'EXACT', 'Exchange rate applied'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_1_27'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.27');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.27', 'EXACT', 'Exchange rate applied'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'FAKTUR_PAJAK' AND p.data_point_code = 'DP_1_27'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.27');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.28', 'EXACT', 'PPN rate and DPP (taxable base)'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_1_28'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.28');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.28', 'EXACT', 'PPN rate and DPP (taxable base)'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'FAKTUR_PAJAK' AND p.data_point_code = 'DP_1_28'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.28');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.29', 'EXACT', 'WHT type and rate (PPh 21 / 23 / 4(2))'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_1_29'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.29');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.29', 'EXACT', 'WHT type and rate (PPh 21 / 23 / 4(2))'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'CONTRACT_ENGAGEMENT_LETTER' AND p.data_point_code = 'DP_1_29'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.29');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.30', 'EXACT', 'Payment baseline date and due date'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_1_30'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.30');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.31', 'EXACT', 'Date sequence (service period - GRN - invoice - FP)'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_1_31'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.31');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.31', 'EXACT', 'Date sequence (service period - GRN - invoice - FP)'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'FAKTUR_PAJAK' AND p.data_point_code = 'DP_1_31'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.31');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '1.32', 'EXACT', 'PO remaining balance (quantity and value)'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_1_32'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '1.32');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '2.01', 'EXACT', 'Item description'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_2_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '2.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '2.01', 'EXACT', 'Item description'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'DELIVERY_NOTE' AND p.data_point_code = 'DP_2_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '2.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '2.01', 'EXACT', 'Item description'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'PACKING_LIST' AND p.data_point_code = 'DP_2_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '2.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '2.02', 'EXACT', 'Airway Bill / Shipping Bill Date'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'AIRWAY_BILL' AND p.data_point_code = 'DP_2_02'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '2.02');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '2.02', 'EXACT', 'Airway Bill / Shipping Bill Date'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'SHIPPING_BILL' AND p.data_point_code = 'DP_2_02'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '2.02');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '2.03', 'EXACT', 'Airway Bill / Shipping Bill Name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_2_03'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '2.03');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '2.03', 'EXACT', 'Airway Bill / Shipping Bill Name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'AIRWAY_BILL' AND p.data_point_code = 'DP_2_03'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '2.03');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '2.03', 'EXACT', 'Airway Bill / Shipping Bill Name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'SHIPPING_BILL' AND p.data_point_code = 'DP_2_03'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '2.03');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '2.04', 'EXACT', 'Bank Guarantee / Performance Bond Expiry Date'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'BANK_GUARANTEE_BOND_WARRANTY_LETTER' AND p.data_point_code = 'DP_2_04'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '2.04');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '2.04', 'EXACT', 'Bank Guarantee / Performance Bond Expiry Date'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'CONTRACT_ENGAGEMENT_LETTER' AND p.data_point_code = 'DP_2_04'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '2.04');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '2.05', 'EXACT', 'Bank Guarantee / Performance Bond Amt.'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'BANK_GUARANTEE_BOND_WARRANTY_LETTER' AND p.data_point_code = 'DP_2_05'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '2.05');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '2.05', 'EXACT', 'Bank Guarantee / Performance Bond Amt.'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'CONTRACT_ENGAGEMENT_LETTER' AND p.data_point_code = 'DP_2_05'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '2.05');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '3.01', 'EXACT', 'Man-hours Qty.'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_3_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '3.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '3.01', 'EXACT', 'Man-hours Qty.'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'WORK_PROGRESS_CERTIFICATE_BAST' AND p.data_point_code = 'DP_3_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '3.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '3.01', 'EXACT', 'Man-hours Qty.'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'TIMESHEET' AND p.data_point_code = 'DP_3_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '3.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '3.01', 'EXACT', 'Man-hours Qty.'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'MANPOWER_SUMMARY' AND p.data_point_code = 'DP_3_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '3.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '3.02', 'EXACT', 'Man-hours Unit Rate'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_3_02'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '3.02');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '3.02', 'EXACT', 'Man-hours Unit Rate'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'CONTRACT_ENGAGEMENT_LETTER' AND p.data_point_code = 'DP_3_02'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '3.02');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '3.02', 'EXACT', 'Man-hours Unit Rate'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'MANPOWER_SUMMARY' AND p.data_point_code = 'DP_3_02'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '3.02');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '3.03', 'EXACT', 'Overtime Qty.'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_3_03'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '3.03');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '3.03', 'EXACT', 'Overtime Qty.'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'WORK_PROGRESS_CERTIFICATE_BAST' AND p.data_point_code = 'DP_3_03'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '3.03');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '3.03', 'EXACT', 'Overtime Qty.'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'TIMESHEET' AND p.data_point_code = 'DP_3_03'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '3.03');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '3.03', 'EXACT', 'Overtime Qty.'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'MANPOWER_SUMMARY' AND p.data_point_code = 'DP_3_03'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '3.03');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '3.03', 'EXACT', 'Overtime Qty.'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'OVERTIME_APPROVAL' AND p.data_point_code = 'DP_3_03'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '3.03');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '3.04', 'EXACT', 'Overtime unit rate'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_3_04'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '3.04');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '3.04', 'EXACT', 'Overtime unit rate'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'CONTRACT_ENGAGEMENT_LETTER' AND p.data_point_code = 'DP_3_04'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '3.04');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '3.04', 'EXACT', 'Overtime unit rate'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'MANPOWER_SUMMARY' AND p.data_point_code = 'DP_3_04'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '3.04');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '3.04', 'EXACT', 'Overtime unit rate'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'OVERTIME_APPROVAL' AND p.data_point_code = 'DP_3_04'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '3.04');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '4.01', 'EXACT', 'Daily POB count'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_4_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '4.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '4.01', 'EXACT', 'Daily POB count'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'MEAL_ATTENDANCE_AT_CANTEEN_ALL_MEAL_TYPES' AND p.data_point_code = 'DP_4_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '4.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '4.02', 'EXACT', 'Meal Sheet - Attendance'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_4_02'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '4.02');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '4.02', 'EXACT', 'Meal Sheet - Attendance'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'MEAL_ATTENDANCE_AT_CANTEEN_ALL_MEAL_TYPES' AND p.data_point_code = 'DP_4_02'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '4.02');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '4.03', 'EXACT', 'Packed Meal Sheet - Attendance'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_4_03'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '4.03');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '4.03', 'EXACT', 'Packed Meal Sheet - Attendance'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'MEAL_ATTENDANCE_AT_CANTEEN_ALL_MEAL_TYPES' AND p.data_point_code = 'DP_4_03'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '4.03');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '4.04', 'EXACT', 'Snack back-charge Qty.'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_4_04'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '4.04');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '4.04', 'EXACT', 'Snack back-charge Qty.'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'RECAPITULATION_BACK_CHARGE_SNACKS_SPECIAL_LUNCH_DI' AND p.data_point_code = 'DP_4_04'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '4.04');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '4.05', 'EXACT', 'Special-meal back-charge Qty.'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_4_05'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '4.05');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '4.05', 'EXACT', 'Special-meal back-charge Qty.'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'RECAPITULATION_BACK_CHARGE_SNACKS_SPECIAL_LUNCH_DI' AND p.data_point_code = 'DP_4_05'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '4.05');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '4.06', 'EXACT', 'Special dinners Qty.'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_4_06'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '4.06');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '4.06', 'EXACT', 'Special dinners Qty.'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'RECAPITULATION_BACK_CHARGE_SNACKS_SPECIAL_LUNCH_DI' AND p.data_point_code = 'DP_4_06'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '4.06');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '4.07', 'EXACT', 'Special lunches Qty.'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_4_07'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '4.07');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '4.07', 'EXACT', 'Special lunches Qty.'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'RECAPITULATION_BACK_CHARGE_SNACKS_SPECIAL_LUNCH_DI' AND p.data_point_code = 'DP_4_07'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '4.07');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '4.08', 'EXACT', 'Employee Name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'MEAL_ATTENDANCE_AT_CANTEEN_ALL_MEAL_TYPES' AND p.data_point_code = 'DP_4_08'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '4.08');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '4.09', 'EXACT', 'Date'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'MEAL_ATTENDANCE_AT_CANTEEN_ALL_MEAL_TYPES' AND p.data_point_code = 'DP_4_09'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '4.09');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '4.11', 'EXACT', 'Indian Cook - Attendance'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_4_11'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '4.11');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '4.11', 'EXACT', 'Indian Cook - Attendance'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'TIMESHEET' AND p.data_point_code = 'DP_4_11'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '4.11');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '4.12', 'EXACT', 'Flight ticket - Employee Name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_4_12'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '4.12');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '4.12', 'EXACT', 'Flight ticket - Employee Name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'OTHER_REIMBURSEMENT_CATERING' AND p.data_point_code = 'DP_4_12'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '4.12');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '4.13', 'EXACT', 'ITAS - Employee Name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_4_13'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '4.13');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '4.13', 'EXACT', 'ITAS - Employee Name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'OTHER_REIMBURSEMENT_CATERING' AND p.data_point_code = 'DP_4_13'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '4.13');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '5.01', 'EXACT', 'Number of Rooms'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_5_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '5.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '5.01', 'EXACT', 'Number of Rooms'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'COST_PER_ACCOMMODATION_REPORT' AND p.data_point_code = 'DP_5_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '5.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '6.01', 'EXACT', 'Equipment Hours'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_6_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '6.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '6.01', 'EXACT', 'Equipment Hours'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'TIMESHEET' AND p.data_point_code = 'DP_6_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '6.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '6.02', 'EXACT', 'Equipment unit rate'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_6_02'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '6.02');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '6.02', 'EXACT', 'Equipment unit rate'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'CONTRACT_ENGAGEMENT_LETTER' AND p.data_point_code = 'DP_6_02'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '6.02');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '6.03', 'EXACT', 'Operator Manhours'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_6_03'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '6.03');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '6.03', 'EXACT', 'Operator Manhours'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'TIMESHEET' AND p.data_point_code = 'DP_6_03'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '6.03');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '6.03', 'EXACT', 'Operator Manhours'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'MANPOWER_SUMMARY' AND p.data_point_code = 'DP_6_03'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '6.03');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '7.01', 'EXACT', 'Quantity - BOQ'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_7_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '7.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '7.01', 'EXACT', 'Quantity - BOQ'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'MEASUREMENTS_BILL_OF_QUANTITY' AND p.data_point_code = 'DP_7_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '7.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '7.01', 'EXACT', 'Quantity - BOQ'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INSPECTION_REPORT_CERTIFICATE_INCL_QUANTITY_CERTIF' AND p.data_point_code = 'DP_7_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '7.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '7.02', 'EXACT', 'Completion Proof'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'PHOTO_EVIDENCE' AND p.data_point_code = 'DP_7_02'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '7.02');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '7.03', 'EXACT', 'SIUJK expiry date'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_7_03'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '7.03');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '7.03', 'EXACT', 'SIUJK expiry date'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'SIUJK_PERMIT' AND p.data_point_code = 'DP_7_03'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '7.03');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '7.04', 'EXACT', 'SIUJK WHT rate'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_7_04'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '7.04');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '7.04', 'EXACT', 'SIUJK WHT rate'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'SIUJK_PERMIT' AND p.data_point_code = 'DP_7_04'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '7.04');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '8.01', 'EXACT', 'ESSA Company Name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_8_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '8.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '8.01', 'EXACT', 'ESSA Company Name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'AIRWAY_BILL' AND p.data_point_code = 'DP_8_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '8.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '8.01', 'EXACT', 'ESSA Company Name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'SHIPPING_BILL' AND p.data_point_code = 'DP_8_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '8.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '8.01', 'EXACT', 'ESSA Company Name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'PEMBERITAHUAN_IMPOR_BARANG_PIB' AND p.data_point_code = 'DP_8_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '8.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '8.02', 'EXACT', 'PIB Amount'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'PO_FOR_MATERIAL_BEING_IMPORTED' AND p.data_point_code = 'DP_8_02'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '8.02');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '8.02', 'EXACT', 'PIB Amount'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'PEMBERITAHUAN_IMPOR_BARANG_PIB' AND p.data_point_code = 'DP_8_02'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '8.02');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '8.02', 'EXACT', 'PIB Amount'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA' AND p.data_point_code = 'DP_8_02'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '8.02');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '8.03', 'EXACT', 'Item Description'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'PACKING_LIST' AND p.data_point_code = 'DP_8_03'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '8.03');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '8.03', 'EXACT', 'Item Description'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'AIRWAY_BILL' AND p.data_point_code = 'DP_8_03'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '8.03');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '8.03', 'EXACT', 'Item Description'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'SHIPPING_BILL' AND p.data_point_code = 'DP_8_03'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '8.03');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '8.03', 'EXACT', 'Item Description'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'PO_FOR_MATERIAL_BEING_IMPORTED' AND p.data_point_code = 'DP_8_03'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '8.03');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '8.03', 'EXACT', 'Item Description'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'PEMBERITAHUAN_IMPOR_BARANG_PIB' AND p.data_point_code = 'DP_8_03'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '8.03');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '9.01', 'EXACT', 'Trip ID'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_9_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '9.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '9.01', 'EXACT', 'Trip ID'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'BILLING_SUMMARY' AND p.data_point_code = 'DP_9_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '9.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '9.01', 'EXACT', 'Trip ID'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'BOOKING_CONFIRMATION' AND p.data_point_code = 'DP_9_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '9.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '9.02', 'EXACT', 'Airline'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_9_02'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '9.02');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '9.02', 'EXACT', 'Airline'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'BILLING_SUMMARY' AND p.data_point_code = 'DP_9_02'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '9.02');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '9.02', 'EXACT', 'Airline'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'BOOKING_CONFIRMATION' AND p.data_point_code = 'DP_9_02'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '9.02');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '9.03', 'EXACT', 'Route'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_9_03'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '9.03');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '9.03', 'EXACT', 'Route'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'BILLING_SUMMARY' AND p.data_point_code = 'DP_9_03'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '9.03');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '9.03', 'EXACT', 'Route'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'BOOKING_CONFIRMATION' AND p.data_point_code = 'DP_9_03'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '9.03');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '9.04', 'EXACT', 'Travel dates'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_9_04'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '9.04');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '9.04', 'EXACT', 'Travel dates'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'BILLING_SUMMARY' AND p.data_point_code = 'DP_9_04'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '9.04');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '9.04', 'EXACT', 'Travel dates'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'BOOKING_CONFIRMATION' AND p.data_point_code = 'DP_9_04'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '9.04');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '9.05', 'EXACT', 'Passenger name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_9_05'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '9.05');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '9.05', 'EXACT', 'Passenger name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'BILLING_SUMMARY' AND p.data_point_code = 'DP_9_05'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '9.05');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '9.05', 'EXACT', 'Passenger name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'BOOKING_CONFIRMATION' AND p.data_point_code = 'DP_9_05'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '9.05');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '9.06', 'EXACT', 'Travel class'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_9_06'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '9.06');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '9.06', 'EXACT', 'Travel class'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'BILLING_SUMMARY' AND p.data_point_code = 'DP_9_06'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '9.06');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '9.06', 'EXACT', 'Travel class'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'BOOKING_CONFIRMATION' AND p.data_point_code = 'DP_9_06'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '9.06');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '9.07', 'EXACT', 'HCIS Ledger amount'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_9_07'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '9.07');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '9.07', 'EXACT', 'HCIS Ledger amount'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'BILLING_SUMMARY' AND p.data_point_code = 'DP_9_07'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '9.07');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '10.01', 'EXACT', 'Hotel Trip ID'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_10_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '10.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '10.01', 'EXACT', 'Hotel Trip ID'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'BILLING_SUMMARY' AND p.data_point_code = 'DP_10_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '10.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '10.01', 'EXACT', 'Hotel Trip ID'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'GUARANTEE_LETTER' AND p.data_point_code = 'DP_10_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '10.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '10.01', 'EXACT', 'Hotel Trip ID'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'ROOM_RESERVATION_FORM' AND p.data_point_code = 'DP_10_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '10.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '10.01', 'EXACT', 'Hotel Trip ID'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'BOOKING_CONFIRMATION' AND p.data_point_code = 'DP_10_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '10.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '10.02', 'EXACT', 'Hotel dates'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_10_02'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '10.02');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '10.02', 'EXACT', 'Hotel dates'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'BILLING_SUMMARY' AND p.data_point_code = 'DP_10_02'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '10.02');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '10.02', 'EXACT', 'Hotel dates'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'GUARANTEE_LETTER' AND p.data_point_code = 'DP_10_02'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '10.02');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '10.02', 'EXACT', 'Hotel dates'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'ROOM_RESERVATION_FORM' AND p.data_point_code = 'DP_10_02'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '10.02');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '10.02', 'EXACT', 'Hotel dates'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'BOOKING_CONFIRMATION' AND p.data_point_code = 'DP_10_02'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '10.02');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '10.03', 'EXACT', 'Guest name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_10_03'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '10.03');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '10.03', 'EXACT', 'Guest name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'BILLING_SUMMARY' AND p.data_point_code = 'DP_10_03'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '10.03');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '10.03', 'EXACT', 'Guest name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'GUARANTEE_LETTER' AND p.data_point_code = 'DP_10_03'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '10.03');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '10.03', 'EXACT', 'Guest name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'ROOM_RESERVATION_FORM' AND p.data_point_code = 'DP_10_03'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '10.03');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '10.03', 'EXACT', 'Guest name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'BOOKING_CONFIRMATION' AND p.data_point_code = 'DP_10_03'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '10.03');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '10.04', 'EXACT', 'HCIS Ledger amount'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_10_04'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '10.04');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '10.04', 'EXACT', 'HCIS Ledger amount'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'BILLING_SUMMARY' AND p.data_point_code = 'DP_10_04'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '10.04');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '10.04', 'EXACT', 'HCIS Ledger amount'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'GUARANTEE_LETTER' AND p.data_point_code = 'DP_10_04'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '10.04');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '11.01', 'EXACT', 'Item Description'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'PACKING_LIST' AND p.data_point_code = 'DP_11_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '11.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '11.01', 'EXACT', 'Item Description'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'PO_FOR_MATERIAL_BEING_IMPORTED' AND p.data_point_code = 'DP_11_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '11.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '11.01', 'EXACT', 'Item Description'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'SURAT_PERSETUJUAN_PENGELUARAN_BARANG_SPPB' AND p.data_point_code = 'DP_11_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '11.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '11.02', 'EXACT', 'Airway / Shipping Bill - Vendor name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'PACKING_LIST' AND p.data_point_code = 'DP_11_02'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '11.02');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '11.02', 'EXACT', 'Airway / Shipping Bill - Vendor name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'AIRWAY_BILL' AND p.data_point_code = 'DP_11_02'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '11.02');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '11.02', 'EXACT', 'Airway / Shipping Bill - Vendor name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'SHIPPING_BILL' AND p.data_point_code = 'DP_11_02'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '11.02');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '11.02', 'EXACT', 'Airway / Shipping Bill - Vendor name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'PO_FOR_MATERIAL_BEING_IMPORTED' AND p.data_point_code = 'DP_11_02'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '11.02');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '11.02', 'EXACT', 'Airway / Shipping Bill - Vendor name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'SURAT_PERSETUJUAN_PENGELUARAN_BARANG_SPPB' AND p.data_point_code = 'DP_11_02'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '11.02');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '11.03', 'EXACT', 'Consignee Name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'PACKING_LIST' AND p.data_point_code = 'DP_11_03'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '11.03');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '11.03', 'EXACT', 'Consignee Name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'AIRWAY_BILL' AND p.data_point_code = 'DP_11_03'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '11.03');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '11.03', 'EXACT', 'Consignee Name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'SHIPPING_BILL' AND p.data_point_code = 'DP_11_03'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '11.03');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '11.03', 'EXACT', 'Consignee Name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'PO_FOR_MATERIAL_BEING_IMPORTED' AND p.data_point_code = 'DP_11_03'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '11.03');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '11.03', 'EXACT', 'Consignee Name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'PEMBERITAHUAN_IMPOR_BARANG_PIB' AND p.data_point_code = 'DP_11_03'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '11.03');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '11.03', 'EXACT', 'Consignee Name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'SURAT_PERSETUJUAN_PENGELUARAN_BARANG_SPPB' AND p.data_point_code = 'DP_11_03'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '11.03');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '11.04', 'EXACT', 'PIB'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'PO_FOR_MATERIAL_BEING_IMPORTED' AND p.data_point_code = 'DP_11_04'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '11.04');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '11.04', 'EXACT', 'PIB'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'PEMBERITAHUAN_IMPOR_BARANG_PIB' AND p.data_point_code = 'DP_11_04'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '11.04');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '11.04', 'EXACT', 'PIB'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'SURAT_PERSETUJUAN_PENGELUARAN_BARANG_SPPB' AND p.data_point_code = 'DP_11_04'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '11.04');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '11.05', 'EXACT', 'Forwarder Name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_11_05'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '11.05');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '11.05', 'EXACT', 'Forwarder Name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'SURAT_PERSETUJUAN_PENGELUARAN_BARANG_SPPB' AND p.data_point_code = 'DP_11_05'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '11.05');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '12.01', 'EXACT', 'Delivery Date'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_12_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '12.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '12.01', 'EXACT', 'Delivery Date'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'DELIVERY_ORDER_SURAT_JALAN' AND p.data_point_code = 'DP_12_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '12.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '12.02', 'EXACT', 'Delivery confirmation'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'PHOTO_EVIDENCE' AND p.data_point_code = 'DP_12_02'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '12.02');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '12.02', 'EXACT', 'Delivery confirmation'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'DELIVERY_ORDER_SURAT_JALAN' AND p.data_point_code = 'DP_12_02'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '12.02');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '12.02', 'EXACT', 'Delivery confirmation'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'MATERIAL_LISTS' AND p.data_point_code = 'DP_12_02'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '12.02');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '12.03', 'EXACT', 'Item description'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'DELIVERY_ORDER_SURAT_JALAN' AND p.data_point_code = 'DP_12_03'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '12.03');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '12.03', 'EXACT', 'Item description'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'MATERIAL_LISTS' AND p.data_point_code = 'DP_12_03'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '12.03');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '12.04', 'EXACT', 'PO number - Transported Goods'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'DELIVERY_ORDER_SURAT_JALAN' AND p.data_point_code = 'DP_12_04'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '12.04');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '12.04', 'EXACT', 'PO number - Transported Goods'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'MATERIAL_LISTS' AND p.data_point_code = 'DP_12_04'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '12.04');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '13.01', 'EXACT', 'Man-hours / Man-months'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_13_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '13.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '13.01', 'EXACT', 'Man-hours / Man-months'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'CONTRACT_ENGAGEMENT_LETTER' AND p.data_point_code = 'DP_13_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '13.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '13.01', 'EXACT', 'Man-hours / Man-months'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'TIMESHEET' AND p.data_point_code = 'DP_13_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '13.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '13.02', 'EXACT', 'Unit Price'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_13_02'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '13.02');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '13.02', 'EXACT', 'Unit Price'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'CONTRACT_ENGAGEMENT_LETTER' AND p.data_point_code = 'DP_13_02'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '13.02');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '13.03', 'EXACT', 'Terms & Conditions'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'CONTRACT_ENGAGEMENT_LETTER' AND p.data_point_code = 'DP_13_03'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '13.03');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '13.04', 'EXACT', 'Contract deliverables'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'CONTRACT_ENGAGEMENT_LETTER' AND p.data_point_code = 'DP_13_04'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '13.04');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '13.04', 'EXACT', 'Contract deliverables'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'DELIVERABLE_AS_PER_CONTRACT' AND p.data_point_code = 'DP_13_04'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '13.04');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '14.01', 'EXACT', 'Terms, Conditions and Milestones'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_14_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '14.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '14.01', 'EXACT', 'Terms, Conditions and Milestones'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'CONTRACT_ENGAGEMENT_LETTER' AND p.data_point_code = 'DP_14_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '14.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '14.01', 'EXACT', 'Terms, Conditions and Milestones'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'DELIVERABLE_AS_PER_CONTRACT' AND p.data_point_code = 'DP_14_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '14.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '14.01', 'EXACT', 'Terms, Conditions and Milestones'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'CERTIFICATION_AND_PROOF_OF_COMPLETION_OF_MILESTONE' AND p.data_point_code = 'DP_14_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '14.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '15.01', 'EXACT', 'Man-hours / Man-months'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_15_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '15.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '15.01', 'EXACT', 'Man-hours / Man-months'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'CONTRACT_ENGAGEMENT_LETTER' AND p.data_point_code = 'DP_15_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '15.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '15.01', 'EXACT', 'Man-hours / Man-months'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'TIMESHEET' AND p.data_point_code = 'DP_15_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '15.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '15.02', 'EXACT', 'Unit Price'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_15_02'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '15.02');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '15.02', 'EXACT', 'Unit Price'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'CONTRACT_ENGAGEMENT_LETTER' AND p.data_point_code = 'DP_15_02'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '15.02');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '15.03', 'EXACT', 'Equipment Hours / Months'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_15_03'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '15.03');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '15.03', 'EXACT', 'Equipment Hours / Months'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'CONTRACT_ENGAGEMENT_LETTER' AND p.data_point_code = 'DP_15_03'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '15.03');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '15.03', 'EXACT', 'Equipment Hours / Months'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'TIMESHEET' AND p.data_point_code = 'DP_15_03'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '15.03');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '15.04', 'EXACT', 'Equipment Unit Price'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_15_04'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '15.04');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '15.04', 'EXACT', 'Equipment Unit Price'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'CONTRACT_ENGAGEMENT_LETTER' AND p.data_point_code = 'DP_15_04'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '15.04');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '16.01', 'EXACT', 'Inspection Report quantity'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INVOICE' AND p.data_point_code = 'DP_16_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '16.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '16.01', 'EXACT', 'Inspection Report quantity'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'INSPECTION_REPORT_CERTIFICATE_INCL_QUANTITY_CERTIF' AND p.data_point_code = 'DP_16_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '16.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '16.02', 'EXACT', 'SLA confirmation'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'SLA_CONFIRMATION_REPORT' AND p.data_point_code = 'DP_16_02'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '16.02');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '17.01', 'EXACT', 'DOA approval'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'BILLING_STATEMENTS' AND p.data_point_code = 'DP_17_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '17.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '17.01', 'EXACT', 'DOA approval'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'MANAGEMENT_OR_FUNCTIONAL_APPROVAL_AS_PER_DOA' AND p.data_point_code = 'DP_17_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '17.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '17.02', 'EXACT', 'SLA confirmation'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'CONTRACT_ENGAGEMENT_LETTER' AND p.data_point_code = 'DP_17_02'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '17.02');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '17.02', 'EXACT', 'SLA confirmation'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'SLA_CONFIRMATION_REPORT' AND p.data_point_code = 'DP_17_02'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '17.02');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '18.01', 'EXACT', 'Settlement Amount'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA' AND p.data_point_code = 'DP_18_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '18.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '18.01', 'EXACT', 'Settlement Amount'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'BANK_TRANSFER_PROOF_CASH_ADVANCE_RECON' AND p.data_point_code = 'DP_18_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '18.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '18.01', 'EXACT', 'Settlement Amount'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'REFUND_SLIP_FOR_UNUSED_ADVANCE' AND p.data_point_code = 'DP_18_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '18.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '18.01', 'EXACT', 'Settlement Amount'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'VALID_INVOICES_RECEIPTS_TAX_DOCUMENTS' AND p.data_point_code = 'DP_18_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '18.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '18.02', 'EXACT', 'Beneficiary Name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA' AND p.data_point_code = 'DP_18_02'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '18.02');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '18.02', 'EXACT', 'Beneficiary Name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'BANK_TRANSFER_PROOF_CASH_ADVANCE_RECON' AND p.data_point_code = 'DP_18_02'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '18.02');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '18.02', 'EXACT', 'Beneficiary Name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'COPY_OF_AGENDA_OR_MOU' AND p.data_point_code = 'DP_18_02'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '18.02');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '18.03', 'EXACT', 'Payment Amount'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA' AND p.data_point_code = 'DP_18_03'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '18.03');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '18.03', 'EXACT', 'Payment Amount'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'BANK_TRANSFER_PROOF_CASH_ADVANCE_RECON' AND p.data_point_code = 'DP_18_03'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '18.03');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '18.03', 'EXACT', 'Payment Amount'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'VALID_INVOICES_RECEIPTS_TAX_DOCUMENTS' AND p.data_point_code = 'DP_18_03'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '18.03');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '18.04', 'EXACT', 'Guest Name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'PHOTO_EVIDENCE' AND p.data_point_code = 'DP_18_04'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '18.04');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '18.04', 'EXACT', 'Guest Name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA' AND p.data_point_code = 'DP_18_04'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '18.04');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '18.04', 'EXACT', 'Guest Name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'GUEST_LIST_IF_APPLICABLE' AND p.data_point_code = 'DP_18_04'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '18.04');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '18.05', 'EXACT', 'WHT Amount (if applicable)'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA' AND p.data_point_code = 'DP_18_05'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '18.05');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '18.05', 'EXACT', 'WHT Amount (if applicable)'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'VALID_INVOICES_RECEIPTS_TAX_DOCUMENTS' AND p.data_point_code = 'DP_18_05'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '18.05');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '18.06', 'EXACT', 'MOU'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'PHOTO_EVIDENCE' AND p.data_point_code = 'DP_18_06'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '18.06');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '18.06', 'EXACT', 'MOU'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'COPY_OF_AGENDA_OR_MOU' AND p.data_point_code = 'DP_18_06'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '18.06');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '19.01', 'EXACT', 'Settlement Amount'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA' AND p.data_point_code = 'DP_19_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '19.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '19.01', 'EXACT', 'Settlement Amount'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'EXPENSE_REPORT_ADVANCE_SETTLEMENT_FORM' AND p.data_point_code = 'DP_19_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '19.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '19.01', 'EXACT', 'Settlement Amount'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'VALID_INVOICES_RECEIPTS_TAX_DOCUMENTS' AND p.data_point_code = 'DP_19_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '19.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '19.02', 'EXACT', 'Payment Amount'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA' AND p.data_point_code = 'DP_19_02'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '19.02');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '19.02', 'EXACT', 'Payment Amount'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'EXPENSE_REPORT_ADVANCE_SETTLEMENT_FORM' AND p.data_point_code = 'DP_19_02'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '19.02');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '19.02', 'EXACT', 'Payment Amount'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'VALID_INVOICES_RECEIPTS_TAX_DOCUMENTS' AND p.data_point_code = 'DP_19_02'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '19.02');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '19.03', 'EXACT', 'Card Holder Name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'EXPENSE_REPORT_ADVANCE_SETTLEMENT_FORM' AND p.data_point_code = 'DP_19_03'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '19.03');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '19.04', 'EXACT', 'Merchant Name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'EXPENSE_REPORT_ADVANCE_SETTLEMENT_FORM' AND p.data_point_code = 'DP_19_04'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '19.04');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '19.04', 'EXACT', 'Merchant Name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'VALID_INVOICES_RECEIPTS_TAX_DOCUMENTS' AND p.data_point_code = 'DP_19_04'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '19.04');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '19.05', 'EXACT', 'Internal Order Number'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA' AND p.data_point_code = 'DP_19_05'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '19.05');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '19.06', 'EXACT', 'WHT Amount (if applicable)'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA' AND p.data_point_code = 'DP_19_06'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '19.06');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '19.06', 'EXACT', 'WHT Amount (if applicable)'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'VALID_INVOICES_RECEIPTS_TAX_DOCUMENTS' AND p.data_point_code = 'DP_19_06'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '19.06');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '19.07', 'EXACT', 'PO Number (If applicable)'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'EXPENSE_REPORT_ADVANCE_SETTLEMENT_FORM' AND p.data_point_code = 'DP_19_07'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '19.07');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '20.01', 'EXACT', 'Settlement Amount'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA' AND p.data_point_code = 'DP_20_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '20.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '20.01', 'EXACT', 'Settlement Amount'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'VALID_INVOICES_RECEIPTS_TAX_DOCUMENTS' AND p.data_point_code = 'DP_20_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '20.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '20.02', 'EXACT', 'Payment Amount'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA' AND p.data_point_code = 'DP_20_02'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '20.02');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '20.02', 'EXACT', 'Payment Amount'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'VALID_INVOICES_RECEIPTS_TAX_DOCUMENTS' AND p.data_point_code = 'DP_20_02'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '20.02');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '20.03', 'EXACT', 'Internal Order Number'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA' AND p.data_point_code = 'DP_20_03'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '20.03');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '20.04', 'EXACT', 'Vendor Name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA' AND p.data_point_code = 'DP_20_04'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '20.04');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '20.04', 'EXACT', 'Vendor Name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'VALID_INVOICES_RECEIPTS_TAX_DOCUMENTS' AND p.data_point_code = 'DP_20_04'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '20.04');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '20.05', 'EXACT', 'WHT Amount (if applicable)'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA' AND p.data_point_code = 'DP_20_05'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '20.05');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '20.05', 'EXACT', 'WHT Amount (if applicable)'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'VALID_INVOICES_RECEIPTS_TAX_DOCUMENTS' AND p.data_point_code = 'DP_20_05'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '20.05');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '21.01', 'EXACT', 'Settlement Amount'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA' AND p.data_point_code = 'DP_21_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '21.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '21.01', 'EXACT', 'Settlement Amount'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'VALID_INVOICES_RECEIPTS_TAX_DOCUMENTS' AND p.data_point_code = 'DP_21_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '21.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '21.02', 'EXACT', 'Payment Amount'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA' AND p.data_point_code = 'DP_21_02'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '21.02');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '21.02', 'EXACT', 'Payment Amount'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'VALID_INVOICES_RECEIPTS_TAX_DOCUMENTS' AND p.data_point_code = 'DP_21_02'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '21.02');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '21.03', 'EXACT', 'Internal Order Number'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA' AND p.data_point_code = 'DP_21_03'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '21.03');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '21.04', 'EXACT', 'Guest Name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA' AND p.data_point_code = 'DP_21_04'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '21.04');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '21.04', 'EXACT', 'Guest Name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'GUEST_LIST_IF_APPLICABLE' AND p.data_point_code = 'DP_21_04'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '21.04');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '21.05', 'EXACT', 'Vendor Name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA' AND p.data_point_code = 'DP_21_05'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '21.05');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '21.05', 'EXACT', 'Vendor Name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'VALID_INVOICES_RECEIPTS_TAX_DOCUMENTS' AND p.data_point_code = 'DP_21_05'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '21.05');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '21.06', 'EXACT', 'PO Number (If applicable)'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA' AND p.data_point_code = 'DP_21_06'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '21.06');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '21.07', 'EXACT', 'WHT Amount (if applicable)'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA' AND p.data_point_code = 'DP_21_07'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '21.07');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '21.07', 'EXACT', 'WHT Amount (if applicable)'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'VALID_INVOICES_RECEIPTS_TAX_DOCUMENTS' AND p.data_point_code = 'DP_21_07'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '21.07');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '22.01', 'EXACT', 'Settlement Amount'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA' AND p.data_point_code = 'DP_22_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '22.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '22.01', 'EXACT', 'Settlement Amount'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'EXPENSE_REPORT_ADVANCE_SETTLEMENT_FORM' AND p.data_point_code = 'DP_22_01'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '22.01');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '22.02', 'EXACT', 'Payment Amount'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA' AND p.data_point_code = 'DP_22_02'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '22.02');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '22.02', 'EXACT', 'Payment Amount'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'EXPENSE_REPORT_ADVANCE_SETTLEMENT_FORM' AND p.data_point_code = 'DP_22_02'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '22.02');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '22.02', 'EXACT', 'Payment Amount'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'VALID_INVOICES_RECEIPTS_TAX_DOCUMENTS' AND p.data_point_code = 'DP_22_02'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '22.02');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '22.03', 'EXACT', 'Vendor Name'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'VALID_INVOICES_RECEIPTS_TAX_DOCUMENTS' AND p.data_point_code = 'DP_22_03'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '22.03');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '22.04', 'EXACT', 'Internal Order Number'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA' AND p.data_point_code = 'DP_22_04'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '22.04');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '22.04', 'EXACT', 'Internal Order Number'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'EXPENSE_REPORT_ADVANCE_SETTLEMENT_FORM' AND p.data_point_code = 'DP_22_04'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '22.04');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '22.05', 'EXACT', 'WHT Amount (if applicable)'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA' AND p.data_point_code = 'DP_22_05'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '22.05');
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label)
SELECT d.bundle_document_type_id, p.data_point_id, '22.05', 'EXACT', 'WHT Amount (if applicable)'
FROM "BUNDLE_DOCUMENT_TYPE" d, "DATA_POINT" p
WHERE d.document_code = 'VALID_INVOICES_RECEIPTS_TAX_DOCUMENTS' AND p.data_point_code = 'DP_22_05'
  AND NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f WHERE f.bundle_document_type_id = d.bundle_document_type_id AND f.data_point_id = p.data_point_id AND f.matrix_ref = '22.05');

-- Reference fields and X / o on system columns.
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_1_01', 'Vendor name', p.data_point_id, NULL, 'TEXT'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_1_01'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_01');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '1.01', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_1_01' AND f.column_name = 'dp_1_01'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '1.01');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_1_01', 'Vendor name', p.data_point_id, NULL, 'TEXT'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_vendor_master_data' AND p.data_point_code = 'DP_1_01'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_01');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '1.01', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_vendor_master_data' AND p.data_point_code = 'DP_1_01' AND f.column_name = 'dp_1_01'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '1.01');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_1_02', 'Vendor bank account number', p.data_point_id, NULL, 'NUMBER'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_vendor_master_data' AND p.data_point_code = 'DP_1_02'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_02');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '1.02', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_vendor_master_data' AND p.data_point_code = 'DP_1_02' AND f.column_name = 'dp_1_02'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '1.02');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_1_04', 'PO number', p.data_point_id, NULL, 'CODE'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_1_04'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_04');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '1.04', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_1_04' AND f.column_name = 'dp_1_04'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '1.04');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_1_04', 'PO number', p.data_point_id, NULL, 'CODE'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_grn' AND p.data_point_code = 'DP_1_04'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_04');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '1.04', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_grn' AND p.data_point_code = 'DP_1_04' AND f.column_name = 'dp_1_04'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '1.04');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_1_06', 'Unit rate', p.data_point_id, NULL, 'AMOUNT'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_1_06'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_06');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '1.06', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_1_06' AND f.column_name = 'dp_1_06'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '1.06');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_1_07', 'Payment terms', p.data_point_id, NULL, 'TEXT'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_1_07'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_07');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '1.07', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_1_07' AND f.column_name = 'dp_1_07'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '1.07');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_1_08', 'Invoice Amount', p.data_point_id, NULL, 'AMOUNT'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_1_08'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_08');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '1.08', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_1_08' AND f.column_name = 'dp_1_08'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '1.08');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_1_08', 'Invoice Amount', p.data_point_id, NULL, 'AMOUNT'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_vendor_master_data' AND p.data_point_code = 'DP_1_08'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_08');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '1.08', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_vendor_master_data' AND p.data_point_code = 'DP_1_08' AND f.column_name = 'dp_1_08'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '1.08');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_1_08', 'Invoice Amount', p.data_point_id, NULL, 'AMOUNT'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_hcis_clearing_account' AND p.data_point_code = 'DP_1_08'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_08');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '1.08', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_hcis_clearing_account' AND p.data_point_code = 'DP_1_08' AND f.column_name = 'dp_1_08'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '1.08');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_1_09', 'Item description', p.data_point_id, NULL, 'TEXT'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_1_09'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_09');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '1.09', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_1_09' AND f.column_name = 'dp_1_09'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '1.09');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_1_09', 'Item description', p.data_point_id, NULL, 'TEXT'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_grn' AND p.data_point_code = 'DP_1_09'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_09');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '1.09', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_grn' AND p.data_point_code = 'DP_1_09' AND f.column_name = 'dp_1_09'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '1.09');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_1_10', 'Quantity', p.data_point_id, NULL, 'NUMBER'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_1_10'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_10');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '1.10', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_1_10' AND f.column_name = 'dp_1_10'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '1.10');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_1_10', 'Quantity', p.data_point_id, NULL, 'NUMBER'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_grn' AND p.data_point_code = 'DP_1_10'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_10');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '1.10', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_grn' AND p.data_point_code = 'DP_1_10' AND f.column_name = 'dp_1_10'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '1.10');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_1_10', 'Quantity', p.data_point_id, NULL, 'NUMBER'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_service_entry_sheet' AND p.data_point_code = 'DP_1_10'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_10');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '1.10', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_service_entry_sheet' AND p.data_point_code = 'DP_1_10' AND f.column_name = 'dp_1_10'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '1.10');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_1_10', 'Quantity', p.data_point_id, NULL, 'NUMBER'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_attendence_face_id' AND p.data_point_code = 'DP_1_10'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_10');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '1.10', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_attendence_face_id' AND p.data_point_code = 'DP_1_10' AND f.column_name = 'dp_1_10'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '1.10');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_1_11', 'ESSA Company Name', p.data_point_id, NULL, 'TEXT'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_1_11'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_11');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '1.11', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_1_11' AND f.column_name = 'dp_1_11'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '1.11');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_1_12', 'Vendor NPWP number', p.data_point_id, NULL, 'CODE'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_coretax_validation_djp_portal' AND p.data_point_code = 'DP_1_12'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_12');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '1.12', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_coretax_validation_djp_portal' AND p.data_point_code = 'DP_1_12' AND f.column_name = 'dp_1_12'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '1.12');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_1_12', 'Vendor NPWP number', p.data_point_id, NULL, 'CODE'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_vendor_master_data' AND p.data_point_code = 'DP_1_12'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_12');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '1.12', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_vendor_master_data' AND p.data_point_code = 'DP_1_12' AND f.column_name = 'dp_1_12'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '1.12');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_1_13', 'Faktur Pajak value', p.data_point_id, NULL, 'AMOUNT'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_coretax_validation_djp_portal' AND p.data_point_code = 'DP_1_13'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_13');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '1.13', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_coretax_validation_djp_portal' AND p.data_point_code = 'DP_1_13' AND f.column_name = 'dp_1_13'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '1.13');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_1_14', 'Faktur Pajak date', p.data_point_id, NULL, 'DATE'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_coretax_validation_djp_portal' AND p.data_point_code = 'DP_1_14'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_14');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '1.14', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_coretax_validation_djp_portal' AND p.data_point_code = 'DP_1_14' AND f.column_name = 'dp_1_14'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '1.14');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_1_15', 'Faktur Pajak vendor name', p.data_point_id, NULL, 'TEXT'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_coretax_validation_djp_portal' AND p.data_point_code = 'DP_1_15'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_15');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '1.15', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_coretax_validation_djp_portal' AND p.data_point_code = 'DP_1_15' AND f.column_name = 'dp_1_15'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '1.15');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_1_15', 'Faktur Pajak vendor name', p.data_point_id, NULL, 'TEXT'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_vendor_master_data' AND p.data_point_code = 'DP_1_15'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_15');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '1.15', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_vendor_master_data' AND p.data_point_code = 'DP_1_15' AND f.column_name = 'dp_1_15'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '1.15');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_1_16', 'Faktur Pajak number', p.data_point_id, NULL, 'CODE'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_coretax_validation_djp_portal' AND p.data_point_code = 'DP_1_16'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_16');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '1.16', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_coretax_validation_djp_portal' AND p.data_point_code = 'DP_1_16' AND f.column_name = 'dp_1_16'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '1.16');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_1_16', 'Faktur Pajak number', p.data_point_id, NULL, 'CODE'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_processed_invoice_history' AND p.data_point_code = 'DP_1_16'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_16');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '1.16', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_processed_invoice_history' AND p.data_point_code = 'DP_1_16' AND f.column_name = 'dp_1_16'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '1.16');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_1_17', 'Faktur Pajak Bar Code', p.data_point_id, 'Coretax e-Faktur QR / bar code check', 'CODE'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_coretax_validation_djp_portal' AND p.data_point_code = 'DP_1_17'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_17');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '1.17', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_coretax_validation_djp_portal' AND p.data_point_code = 'DP_1_17' AND f.column_name = 'dp_1_17'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '1.17');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_1_18', 'Negative Vendor List', p.data_point_id, 'Vendor master - block / negative-list indicator', 'TEXT'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_vendor_master_data' AND p.data_point_code = 'DP_1_18'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_18');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '1.18', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_vendor_master_data' AND p.data_point_code = 'DP_1_18' AND f.column_name = 'dp_1_18'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '1.18');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_1_19', 'Vendor debit balance', p.data_point_id, 'Vendor ledger balance (FBL1N)', 'AMOUNT'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_vendor_master_data' AND p.data_point_code = 'DP_1_19'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_19');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '1.19', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_vendor_master_data' AND p.data_point_code = 'DP_1_19' AND f.column_name = 'dp_1_19'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '1.19');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_1_20', 'Liquidated Clause', p.data_point_id, 'PO condition - Liquidated damages', 'DATE'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_1_20'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_20');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '1.20', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_1_20' AND f.column_name = 'dp_1_20'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '1.20');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_1_21', 'Retention Clause', p.data_point_id, 'PO condition - Retention', 'TEXT'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_1_21'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_21');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '1.21', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_1_21' AND f.column_name = 'dp_1_21'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '1.21');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_1_22', 'Advance recovery Clause', p.data_point_id, 'PO condition - Advance recovery', 'TEXT'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_1_22'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_22');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '1.22', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_1_22' AND f.column_name = 'dp_1_22'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '1.22');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_1_23', 'Percentage Completion (BAST & SES)', p.data_point_id, NULL, 'PERCENT'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_1_23'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_23');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '1.23', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_1_23' AND f.column_name = 'dp_1_23'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '1.23');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_1_23', 'Percentage Completion (BAST & SES)', p.data_point_id, NULL, 'PERCENT'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_service_entry_sheet' AND p.data_point_code = 'DP_1_23'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_23');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '1.23', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_service_entry_sheet' AND p.data_point_code = 'DP_1_23' AND f.column_name = 'dp_1_23'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '1.23');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_1_24', 'Duplicate invoice check (vendor + invoice no. + amount + date)', p.data_point_id, NULL, 'DATE'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_processed_invoice_history' AND p.data_point_code = 'DP_1_24'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_24');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '1.24', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_processed_invoice_history' AND p.data_point_code = 'DP_1_24' AND f.column_name = 'dp_1_24'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '1.24');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_1_25', 'Duplicate Faktur Pajak check (FP number)', p.data_point_id, NULL, 'CODE'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_processed_invoice_history' AND p.data_point_code = 'DP_1_25'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_25');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '1.25', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_processed_invoice_history' AND p.data_point_code = 'DP_1_25' AND f.column_name = 'dp_1_25'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '1.25');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_1_26', 'Currency', p.data_point_id, NULL, 'TEXT'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_1_26'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_26');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '1.26', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_1_26' AND f.column_name = 'dp_1_26'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '1.26');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_1_28', 'PPN rate and DPP (taxable base)', p.data_point_id, 'PPN rate table (prevailing rate)', 'PERCENT'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_coretax_validation_djp_portal' AND p.data_point_code = 'DP_1_28'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_28');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '1.28', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_coretax_validation_djp_portal' AND p.data_point_code = 'DP_1_28' AND f.column_name = 'dp_1_28'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '1.28');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_1_29', 'WHT type and rate (PPh 21 / 23 / 4(2))', p.data_point_id, 'Vendor withholding tax code + SKB validity', 'PERCENT'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_vendor_master_data' AND p.data_point_code = 'DP_1_29'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_29');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '1.29', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_vendor_master_data' AND p.data_point_code = 'DP_1_29' AND f.column_name = 'dp_1_29'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '1.29');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_1_30', 'Payment baseline date and due date', p.data_point_id, NULL, 'DATE'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_1_30'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_30');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '1.30', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_1_30' AND f.column_name = 'dp_1_30'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '1.30');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_1_30', 'Payment baseline date and due date', p.data_point_id, NULL, 'DATE'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_grn' AND p.data_point_code = 'DP_1_30'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_30');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '1.30', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_grn' AND p.data_point_code = 'DP_1_30' AND f.column_name = 'dp_1_30'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '1.30');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_1_31', 'Date sequence (service period - GRN - invoice - FP)', p.data_point_id, NULL, 'DATE'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_grn' AND p.data_point_code = 'DP_1_31'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_31');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '1.31', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_grn' AND p.data_point_code = 'DP_1_31' AND f.column_name = 'dp_1_31'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '1.31');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_1_32', 'PO remaining balance (quantity and value)', p.data_point_id, NULL, 'AMOUNT'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_1_32'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_32');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '1.32', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_1_32' AND f.column_name = 'dp_1_32'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '1.32');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_1_32', 'PO remaining balance (quantity and value)', p.data_point_id, NULL, 'AMOUNT'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_grn' AND p.data_point_code = 'DP_1_32'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_32');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '1.32', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_grn' AND p.data_point_code = 'DP_1_32' AND f.column_name = 'dp_1_32'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '1.32');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_1_33', 'Vendor bank account changed since last payment', p.data_point_id, NULL, 'NUMBER'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_vendor_master_data' AND p.data_point_code = 'DP_1_33'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_33');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '1.33', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_vendor_master_data' AND p.data_point_code = 'DP_1_33' AND f.column_name = 'dp_1_33'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '1.33');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_1_33', 'Vendor bank account changed since last payment', p.data_point_id, NULL, 'NUMBER'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_processed_invoice_history' AND p.data_point_code = 'DP_1_33'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_33');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '1.33', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_processed_invoice_history' AND p.data_point_code = 'DP_1_33' AND f.column_name = 'dp_1_33'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '1.33');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_2_01', 'Item description', p.data_point_id, NULL, 'TEXT'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_2_01'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_2_01');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '2.01', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_2_01' AND f.column_name = 'dp_2_01'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '2.01');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_2_01', 'Item description', p.data_point_id, NULL, 'TEXT'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_grn' AND p.data_point_code = 'DP_2_01'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_2_01');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '2.01', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_grn' AND p.data_point_code = 'DP_2_01' AND f.column_name = 'dp_2_01'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '2.01');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_2_03', 'Airway Bill / Shipping Bill Name', p.data_point_id, NULL, 'TEXT'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_2_03'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_2_03');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '2.03', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_2_03' AND f.column_name = 'dp_2_03'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '2.03');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_2_04', 'Bank Guarantee / Performance Bond Expiry Date', p.data_point_id, NULL, 'DATE'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_2_04'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_2_04');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '2.04', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_2_04' AND f.column_name = 'dp_2_04'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '2.04');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_2_05', 'Bank Guarantee / Performance Bond Amt.', p.data_point_id, NULL, 'AMOUNT'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_2_05'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_2_05');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '2.05', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_2_05' AND f.column_name = 'dp_2_05'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '2.05');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_3_01', 'Man-hours Qty.', p.data_point_id, NULL, 'NUMBER'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_3_01'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_3_01');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '3.01', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_3_01' AND f.column_name = 'dp_3_01'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '3.01');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_3_02', 'Man-hours Unit Rate', p.data_point_id, NULL, 'AMOUNT'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_3_02'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_3_02');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '3.02', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_3_02' AND f.column_name = 'dp_3_02'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '3.02');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_3_03', 'Overtime Qty.', p.data_point_id, NULL, 'NUMBER'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_3_03'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_3_03');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '3.03', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_3_03' AND f.column_name = 'dp_3_03'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '3.03');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_3_04', 'Overtime unit rate', p.data_point_id, NULL, 'AMOUNT'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_3_04'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_3_04');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '3.04', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_3_04' AND f.column_name = 'dp_3_04'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '3.04');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_4_01', 'Daily POB count', p.data_point_id, NULL, 'NUMBER'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_attendence_face_id' AND p.data_point_code = 'DP_4_01'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_4_01');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '4.01', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_attendence_face_id' AND p.data_point_code = 'DP_4_01' AND f.column_name = 'dp_4_01'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '4.01');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_4_05', 'Special-meal back-charge Qty.', p.data_point_id, NULL, 'NUMBER'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_attendence_face_id' AND p.data_point_code = 'DP_4_05'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_4_05');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '4.05', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_attendence_face_id' AND p.data_point_code = 'DP_4_05' AND f.column_name = 'dp_4_05'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '4.05');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_4_06', 'Special dinners Qty.', p.data_point_id, NULL, 'NUMBER'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_attendence_face_id' AND p.data_point_code = 'DP_4_06'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_4_06');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '4.06', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_attendence_face_id' AND p.data_point_code = 'DP_4_06' AND f.column_name = 'dp_4_06'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '4.06');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_4_07', 'Special lunches Qty.', p.data_point_id, NULL, 'NUMBER'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_attendence_face_id' AND p.data_point_code = 'DP_4_07'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_4_07');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '4.07', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_attendence_face_id' AND p.data_point_code = 'DP_4_07' AND f.column_name = 'dp_4_07'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '4.07');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_4_08', 'Employee Name', p.data_point_id, NULL, 'TEXT'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_attendence_face_id' AND p.data_point_code = 'DP_4_08'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_4_08');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '4.08', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_attendence_face_id' AND p.data_point_code = 'DP_4_08' AND f.column_name = 'dp_4_08'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '4.08');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_4_09', 'Date', p.data_point_id, NULL, 'DATE'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_attendence_face_id' AND p.data_point_code = 'DP_4_09'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_4_09');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '4.09', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_attendence_face_id' AND p.data_point_code = 'DP_4_09' AND f.column_name = 'dp_4_09'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '4.09');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_4_10', 'Employee ID', p.data_point_id, NULL, 'CODE'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_attendence_face_id' AND p.data_point_code = 'DP_4_10'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_4_10');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '4.10', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_attendence_face_id' AND p.data_point_code = 'DP_4_10' AND f.column_name = 'dp_4_10'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '4.10');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_6_02', 'Equipment unit rate', p.data_point_id, NULL, 'AMOUNT'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_6_02'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_6_02');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '6.02', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_6_02' AND f.column_name = 'dp_6_02'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '6.02');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_7_01', 'Quantity - BOQ', p.data_point_id, NULL, 'NUMBER'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_7_01'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_7_01');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '7.01', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_7_01' AND f.column_name = 'dp_7_01'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '7.01');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_9_01', 'Trip ID', p.data_point_id, NULL, 'CODE'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_hcis_clearing_account' AND p.data_point_code = 'DP_9_01'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_9_01');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '9.01', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_hcis_clearing_account' AND p.data_point_code = 'DP_9_01' AND f.column_name = 'dp_9_01'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '9.01');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_9_07', 'HCIS Ledger amount', p.data_point_id, NULL, 'AMOUNT'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_hcis_clearing_account' AND p.data_point_code = 'DP_9_07'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_9_07');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '9.07', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_hcis_clearing_account' AND p.data_point_code = 'DP_9_07' AND f.column_name = 'dp_9_07'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '9.07');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_10_01', 'Hotel Trip ID', p.data_point_id, NULL, 'CODE'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_hcis_clearing_account' AND p.data_point_code = 'DP_10_01'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_10_01');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '10.01', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_hcis_clearing_account' AND p.data_point_code = 'DP_10_01' AND f.column_name = 'dp_10_01'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '10.01');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_10_04', 'HCIS Ledger amount', p.data_point_id, NULL, 'AMOUNT'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_hcis_clearing_account' AND p.data_point_code = 'DP_10_04'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_10_04');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '10.04', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_hcis_clearing_account' AND p.data_point_code = 'DP_10_04' AND f.column_name = 'dp_10_04'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '10.04');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_11_02', 'Airway / Shipping Bill - Vendor name', p.data_point_id, NULL, 'TEXT'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_vendor_master_data' AND p.data_point_code = 'DP_11_02'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_11_02');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '11.02', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_vendor_master_data' AND p.data_point_code = 'DP_11_02' AND f.column_name = 'dp_11_02'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '11.02');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_12_04', 'PO number - Transported Goods', p.data_point_id, NULL, 'CODE'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_12_04'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_12_04');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '12.04', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_12_04' AND f.column_name = 'dp_12_04'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '12.04');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_13_01', 'Man-hours / Man-months', p.data_point_id, NULL, 'NUMBER'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_13_01'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_13_01');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '13.01', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_13_01' AND f.column_name = 'dp_13_01'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '13.01');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_13_02', 'Unit Price', p.data_point_id, NULL, 'AMOUNT'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_13_02'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_13_02');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '13.02', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_13_02' AND f.column_name = 'dp_13_02'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '13.02');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_13_03', 'Terms & Conditions', p.data_point_id, NULL, 'TEXT'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_13_03'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_13_03');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '13.03', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_13_03' AND f.column_name = 'dp_13_03'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '13.03');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_13_04', 'Contract deliverables', p.data_point_id, NULL, 'TEXT'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_13_04'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_13_04');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '13.04', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_13_04' AND f.column_name = 'dp_13_04'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '13.04');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_14_01', 'Terms, Conditions and Milestones', p.data_point_id, NULL, 'TEXT'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_14_01'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_14_01');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '14.01', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_14_01' AND f.column_name = 'dp_14_01'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '14.01');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_15_01', 'Man-hours / Man-months', p.data_point_id, NULL, 'NUMBER'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_15_01'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_15_01');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '15.01', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_15_01' AND f.column_name = 'dp_15_01'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '15.01');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_15_02', 'Unit Price', p.data_point_id, NULL, 'AMOUNT'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_15_02'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_15_02');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '15.02', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_15_02' AND f.column_name = 'dp_15_02'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '15.02');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_15_03', 'Equipment Hours / Months', p.data_point_id, NULL, 'NUMBER'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_15_03'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_15_03');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '15.03', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_15_03' AND f.column_name = 'dp_15_03'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '15.03');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_15_04', 'Equipment Unit Price', p.data_point_id, NULL, 'AMOUNT'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_15_04'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_15_04');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '15.04', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_15_04' AND f.column_name = 'dp_15_04'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '15.04');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_16_02', 'SLA confirmation', p.data_point_id, NULL, 'TEXT'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_16_02'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_16_02');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '16.02', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_16_02' AND f.column_name = 'dp_16_02'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '16.02');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_19_05', 'Internal Order Number', p.data_point_id, NULL, 'CODE'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_internal_order' AND p.data_point_code = 'DP_19_05'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_19_05');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '19.05', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_internal_order' AND p.data_point_code = 'DP_19_05' AND f.column_name = 'dp_19_05'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '19.05');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_19_07', 'PO Number (If applicable)', p.data_point_id, NULL, 'CODE'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_19_07'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_19_07');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '19.07', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_19_07' AND f.column_name = 'dp_19_07'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '19.07');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_20_03', 'Internal Order Number', p.data_point_id, NULL, 'CODE'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_internal_order' AND p.data_point_code = 'DP_20_03'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_20_03');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '20.03', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_internal_order' AND p.data_point_code = 'DP_20_03' AND f.column_name = 'dp_20_03'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '20.03');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_20_04', 'Vendor Name', p.data_point_id, NULL, 'TEXT'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_vendor_master_data' AND p.data_point_code = 'DP_20_04'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_20_04');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '20.04', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_vendor_master_data' AND p.data_point_code = 'DP_20_04' AND f.column_name = 'dp_20_04'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '20.04');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_21_03', 'Internal Order Number', p.data_point_id, NULL, 'CODE'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_internal_order' AND p.data_point_code = 'DP_21_03'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_21_03');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '21.03', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_internal_order' AND p.data_point_code = 'DP_21_03' AND f.column_name = 'dp_21_03'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '21.03');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_21_05', 'Vendor Name', p.data_point_id, NULL, 'TEXT'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_vendor_master_data' AND p.data_point_code = 'DP_21_05'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_21_05');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '21.05', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_vendor_master_data' AND p.data_point_code = 'DP_21_05' AND f.column_name = 'dp_21_05'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '21.05');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_21_06', 'PO Number (If applicable)', p.data_point_id, NULL, 'CODE'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_21_06'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_21_06');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '21.06', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_po' AND p.data_point_code = 'DP_21_06' AND f.column_name = 'dp_21_06'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '21.06');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_22_03', 'Vendor Name', p.data_point_id, NULL, 'TEXT'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_vendor_master_data' AND p.data_point_code = 'DP_22_03'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_22_03');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '22.03', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_vendor_master_data' AND p.data_point_code = 'DP_22_03' AND f.column_name = 'dp_22_03'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '22.03');
INSERT INTO "REFERENCE_FIELD" (reference_table_id, column_name, display_name, data_point_id, sap_source_field, data_type)
SELECT t.reference_table_id, 'dp_22_04', 'Internal Order Number', p.data_point_id, NULL, 'CODE'
FROM "REFERENCE_TABLE" t, "DATA_POINT" p
WHERE t.physical_name = 'matrix_internal_order' AND p.data_point_code = 'DP_22_04'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_FIELD" f WHERE f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_22_04');
INSERT INTO "REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
SELECT f.reference_field_id, p.data_point_id, '22.04', 'EXACT'
FROM "REFERENCE_FIELD" f
JOIN "REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
JOIN "DATA_POINT" p ON p.data_point_id = f.data_point_id
WHERE t.physical_name = 'matrix_internal_order' AND p.data_point_code = 'DP_22_04' AND f.column_name = 'dp_22_04'
  AND NOT EXISTS (SELECT 1 FROM "REFERENCE_DATA_POINT_MARK" k WHERE k.reference_field_id = f.reference_field_id AND k.matrix_ref = '22.04');

-- Inactive prompt. The matrix says Logical and gives no prompt text.
INSERT INTO "PROMPT_TEMPLATE" (template_key, template_version, rule_type, prompt_text, is_active)
SELECT 'matrix.logical.unspecified', 1, 'LOGICAL_AI', 'The Data Point x Doc Matrix types this comparison as Logical and does not provide prompt text.', FALSE
WHERE NOT EXISTS (SELECT 1 FROM "PROMPT_TEMPLATE" WHERE template_key = 'matrix.logical.unspecified' AND template_version = 1);

INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT TRUE, 'MX-1-01', 'Vendor name', '1.01', NULL, NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-1-01');
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.01'
WHERE r.rule_code = 'MX-1-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'EAPA_DB', 'tgt_2', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_01'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_po'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_01'
WHERE r.rule_code = 'MX-1-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_3', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'FAKTUR_PAJAK'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.01'
WHERE r.rule_code = 'MX-1-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 4, 'TARGET', 'EAPA_DB', 'tgt_4', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_01'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_vendor_master_data'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_01'
WHERE r.rule_code = 'MX-1-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_4' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 5, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_5', f.bundle_document_field_id, 'FUZZY'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'DELIVERY_NOTE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.01'
WHERE r.rule_code = 'MX-1-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_5' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 6, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_6', f.bundle_document_field_id, 'FUZZY'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'PACKING_LIST'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.01'
WHERE r.rule_code = 'MX-1-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_6' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 7, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_7', f.bundle_document_field_id, 'FUZZY'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'AIRWAY_BILL'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.01'
WHERE r.rule_code = 'MX-1-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_7' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 8, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_8', f.bundle_document_field_id, 'FUZZY'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'SHIPPING_BILL'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.01'
WHERE r.rule_code = 'MX-1-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_8' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 9, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_9', f.bundle_document_field_id, 'FUZZY'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'BANK_GUARANTEE_BOND_WARRANTY_LETTER'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.01'
WHERE r.rule_code = 'MX-1-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_9' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 10, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_10', f.bundle_document_field_id, 'FUZZY'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'QUALITY_CERTIFICATE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.01'
WHERE r.rule_code = 'MX-1-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_10' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 11, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_11', f.bundle_document_field_id, 'FUZZY'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'FACTORY_ACCEPTANCE_TEST_FAT'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.01'
WHERE r.rule_code = 'MX-1-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_11' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 12, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_12', f.bundle_document_field_id, 'FUZZY'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'CONTRACT_ENGAGEMENT_LETTER'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.01'
WHERE r.rule_code = 'MX-1-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_12' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 13, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_13', f.bundle_document_field_id, 'FUZZY'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'WORK_PROGRESS_CERTIFICATE_BAST'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.01'
WHERE r.rule_code = 'MX-1-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_13' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 14, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_14', f.bundle_document_field_id, 'FUZZY'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'TIMESHEET'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.01'
WHERE r.rule_code = 'MX-1-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_14' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 15, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_15', f.bundle_document_field_id, 'FUZZY'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'MANPOWER_SUMMARY'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.01'
WHERE r.rule_code = 'MX-1-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_15' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 16, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_16', f.bundle_document_field_id, 'FUZZY'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'OVERTIME_APPROVAL'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.01'
WHERE r.rule_code = 'MX-1-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_16' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 17, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_17', f.bundle_document_field_id, 'FUZZY'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'MEASUREMENTS_BILL_OF_QUANTITY'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.01'
WHERE r.rule_code = 'MX-1-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_17' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 18, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_18', f.bundle_document_field_id, 'FUZZY'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INSPECTION_REPORT_CERTIFICATE_INCL_QUANTITY_CERTIF'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.01'
WHERE r.rule_code = 'MX-1-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_18' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 19, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_19', f.bundle_document_field_id, 'FUZZY'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'TEST_REPORT'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.01'
WHERE r.rule_code = 'MX-1-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_19' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 20, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_20', f.bundle_document_field_id, 'FUZZY'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'SIUJK_PERMIT'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.01'
WHERE r.rule_code = 'MX-1-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_20' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 21, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_21', f.bundle_document_field_id, 'FUZZY'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'BILLING_SUMMARY'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.01'
WHERE r.rule_code = 'MX-1-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_21' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 22, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_22', f.bundle_document_field_id, 'FUZZY'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'GUARANTEE_LETTER'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.01'
WHERE r.rule_code = 'MX-1-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_22' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 23, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_23', f.bundle_document_field_id, 'FUZZY'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'ROOM_RESERVATION_FORM'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.01'
WHERE r.rule_code = 'MX-1-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_23' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 24, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_24', f.bundle_document_field_id, 'FUZZY'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'SURAT_PERSETUJUAN_PENGELUARAN_BARANG_SPPB'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.01'
WHERE r.rule_code = 'MX-1-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_24' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 25, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_25', f.bundle_document_field_id, 'FUZZY'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'DELIVERY_ORDER_SURAT_JALAN'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.01'
WHERE r.rule_code = 'MX-1-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_25' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 26, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_26', f.bundle_document_field_id, 'FUZZY'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'CERTIFICATION_AND_PROOF_OF_COMPLETION_OF_MILESTONE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.01'
WHERE r.rule_code = 'MX-1-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_26' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 27, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_27', f.bundle_document_field_id, 'FUZZY'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'BILLING_STATEMENTS'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.01'
WHERE r.rule_code = 'MX-1-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_27' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT TRUE, 'MX-1-02', 'Vendor bank account number', '1.02', NULL, NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-1-02');
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_02'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.02'
WHERE r.rule_code = 'MX-1-02'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'EAPA_DB', 'tgt_2', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_02'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_vendor_master_data'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_02'
WHERE r.rule_code = 'MX-1-02'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT TRUE, 'MX-1-03', 'Invoice date', '1.03', NULL, NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-1-03');
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_03'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.03'
WHERE r.rule_code = 'MX-1-03'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_03'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'FAKTUR_PAJAK'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.03'
WHERE r.rule_code = 'MX-1-03'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT TRUE, 'MX-1-04', 'PO number', '1.04', NULL, NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-1-04');
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_04'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.04'
WHERE r.rule_code = 'MX-1-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'EAPA_DB', 'tgt_2', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_04'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_po'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_04'
WHERE r.rule_code = 'MX-1-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'EAPA_DB', 'tgt_3', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_04'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_grn'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_04'
WHERE r.rule_code = 'MX-1-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 4, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_4', f.bundle_document_field_id, 'FUZZY'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_04'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'DELIVERY_NOTE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.04'
WHERE r.rule_code = 'MX-1-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_4' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 5, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_5', f.bundle_document_field_id, 'FUZZY'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_04'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'PACKING_LIST'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.04'
WHERE r.rule_code = 'MX-1-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_5' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 6, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_6', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_04'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'CONTRACT_ENGAGEMENT_LETTER'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.04'
WHERE r.rule_code = 'MX-1-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_6' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 7, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_7', f.bundle_document_field_id, 'FUZZY'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_04'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'WORK_PROGRESS_CERTIFICATE_BAST'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.04'
WHERE r.rule_code = 'MX-1-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_7' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 8, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_8', f.bundle_document_field_id, 'FUZZY'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_04'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'TIMESHEET'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.04'
WHERE r.rule_code = 'MX-1-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_8' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 9, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_9', f.bundle_document_field_id, 'FUZZY'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_04'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'MANPOWER_SUMMARY'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.04'
WHERE r.rule_code = 'MX-1-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_9' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 10, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_10', f.bundle_document_field_id, 'FUZZY'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_04'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'OVERTIME_APPROVAL'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.04'
WHERE r.rule_code = 'MX-1-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_10' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 11, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_11', f.bundle_document_field_id, 'FUZZY'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_04'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'MEASUREMENTS_BILL_OF_QUANTITY'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.04'
WHERE r.rule_code = 'MX-1-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_11' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 12, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_12', f.bundle_document_field_id, 'FUZZY'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_04'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INSPECTION_REPORT_CERTIFICATE_INCL_QUANTITY_CERTIF'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.04'
WHERE r.rule_code = 'MX-1-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_12' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 13, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_13', f.bundle_document_field_id, 'FUZZY'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_04'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'DELIVERY_ORDER_SURAT_JALAN'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.04'
WHERE r.rule_code = 'MX-1-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_13' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 14, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_14', f.bundle_document_field_id, 'FUZZY'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_04'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'MATERIAL_LISTS'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.04'
WHERE r.rule_code = 'MX-1-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_14' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 15, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_15', f.bundle_document_field_id, 'FUZZY'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_04'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'DELIVERABLE_AS_PER_CONTRACT'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.04'
WHERE r.rule_code = 'MX-1-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_15' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 16, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_16', f.bundle_document_field_id, 'FUZZY'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_04'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'CERTIFICATION_AND_PROOF_OF_COMPLETION_OF_MILESTONE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.04'
WHERE r.rule_code = 'MX-1-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_16' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT TRUE, 'MX-1-05', 'Invoice number', '1.05', NULL, NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-1-05');
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_05'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.05'
WHERE r.rule_code = 'MX-1-05'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_05'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'FAKTUR_PAJAK'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.05'
WHERE r.rule_code = 'MX-1-05'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT TRUE, 'MX-1-06', 'Unit rate', '1.06', NULL, NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-1-06');
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_06'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.06'
WHERE r.rule_code = 'MX-1-06'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'EAPA_DB', 'tgt_2', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_06'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_po'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_06'
WHERE r.rule_code = 'MX-1-06'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_3', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_06'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'CONTRACT_ENGAGEMENT_LETTER'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.06'
WHERE r.rule_code = 'MX-1-06'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 4, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_4', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_06'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'MANPOWER_SUMMARY'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.06'
WHERE r.rule_code = 'MX-1-06'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_4' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT TRUE, 'MX-1-07', 'Payment terms', '1.07', NULL, NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-1-07');
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_07'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.07'
WHERE r.rule_code = 'MX-1-07'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'EAPA_DB', 'tgt_2', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_07'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_po'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_07'
WHERE r.rule_code = 'MX-1-07'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_3', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_07'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'CONTRACT_ENGAGEMENT_LETTER'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.07'
WHERE r.rule_code = 'MX-1-07'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT TRUE, 'MX-1-08', 'Invoice Amount', '1.08', NULL, 'Source system field: Vendor ledger - open items / balance (BSIK, FBL1N)', 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-1-08');
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_08'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.08'
WHERE r.rule_code = 'MX-1-08'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'EAPA_DB', 'tgt_2', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_08'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_po'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_08'
WHERE r.rule_code = 'MX-1-08'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_3', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_08'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'FAKTUR_PAJAK'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.08'
WHERE r.rule_code = 'MX-1-08'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 4, 'TARGET', 'EAPA_DB', 'tgt_4', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_08'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_vendor_master_data'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_08'
WHERE r.rule_code = 'MX-1-08'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_4' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 5, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_5', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_08'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'BILLING_SUMMARY'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.08'
WHERE r.rule_code = 'MX-1-08'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_5' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 6, 'TARGET', 'EAPA_DB', 'tgt_6', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_08'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_hcis_clearing_account'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_08'
WHERE r.rule_code = 'MX-1-08'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_6' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 7, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_7', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_08'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'BILLING_STATEMENTS'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.08'
WHERE r.rule_code = 'MX-1-08'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_7' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT TRUE, 'MX-1-09', 'Item description', '1.09', 'ITEM-DESC', NULL, 'HEADER', 'LOGICAL_AI', 'EQUALS', NULL, (SELECT prompt_template_id FROM "PROMPT_TEMPLATE" WHERE template_key = 'matrix.logical.unspecified' AND template_version = 1), NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-1-09');
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_09'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.09'
WHERE r.rule_code = 'MX-1-09'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'EAPA_DB', 'tgt_2', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_09'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_po'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_09'
WHERE r.rule_code = 'MX-1-09'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'EAPA_DB', 'tgt_3', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_09'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_grn'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_09'
WHERE r.rule_code = 'MX-1-09'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 4, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_4', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_09'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'FAKTUR_PAJAK'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.09'
WHERE r.rule_code = 'MX-1-09'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_4' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 5, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_5', f.bundle_document_field_id, 'FUZZY'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_09'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'DELIVERY_NOTE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.09'
WHERE r.rule_code = 'MX-1-09'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_5' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 6, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_6', f.bundle_document_field_id, 'FUZZY'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_09'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'PACKING_LIST'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.09'
WHERE r.rule_code = 'MX-1-09'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_6' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 7, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_7', f.bundle_document_field_id, 'FUZZY'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_09'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'MEASUREMENTS_BILL_OF_QUANTITY'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.09'
WHERE r.rule_code = 'MX-1-09'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_7' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 8, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_8', f.bundle_document_field_id, 'FUZZY'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_09'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'DELIVERY_ORDER_SURAT_JALAN'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.09'
WHERE r.rule_code = 'MX-1-09'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_8' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 9, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_9', f.bundle_document_field_id, 'FUZZY'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_09'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'MATERIAL_LISTS'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.09'
WHERE r.rule_code = 'MX-1-09'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_9' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT TRUE, 'MX-1-10', 'Quantity', '1.10', NULL, NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-1-10');
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_10'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.10'
WHERE r.rule_code = 'MX-1-10'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'EAPA_DB', 'tgt_2', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_10'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_po'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_10'
WHERE r.rule_code = 'MX-1-10'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'EAPA_DB', 'tgt_3', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_10'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_grn'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_10'
WHERE r.rule_code = 'MX-1-10'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 4, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_4', f.bundle_document_field_id, 'FUZZY'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_10'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'DELIVERY_NOTE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.10'
WHERE r.rule_code = 'MX-1-10'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_4' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 5, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_5', f.bundle_document_field_id, 'FUZZY'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_10'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'PACKING_LIST'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.10'
WHERE r.rule_code = 'MX-1-10'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_5' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 6, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_6', f.bundle_document_field_id, 'FUZZY'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_10'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'MANPOWER_SUMMARY'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.10'
WHERE r.rule_code = 'MX-1-10'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_6' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 7, 'TARGET', 'EAPA_DB', 'tgt_7', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_10'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_service_entry_sheet'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_10'
WHERE r.rule_code = 'MX-1-10'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_7' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 8, 'TARGET', 'EXTERNAL_SERVICE', 'tgt_8', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_10'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_attendence_face_id'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_10'
WHERE r.rule_code = 'MX-1-10'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_8' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 9, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_9', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_10'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'MEASUREMENTS_BILL_OF_QUANTITY'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.10'
WHERE r.rule_code = 'MX-1-10'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_9' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 10, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_10', f.bundle_document_field_id, 'FUZZY'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_10'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'DELIVERY_ORDER_SURAT_JALAN'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.10'
WHERE r.rule_code = 'MX-1-10'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_10' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 11, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_11', f.bundle_document_field_id, 'FUZZY'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_10'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'MATERIAL_LISTS'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.10'
WHERE r.rule_code = 'MX-1-10'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_11' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT TRUE, 'MX-1-11', 'ESSA Company Name', '1.11', NULL, NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-1-11');
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_11'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.11'
WHERE r.rule_code = 'MX-1-11'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'EAPA_DB', 'tgt_2', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_11'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_po'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_11'
WHERE r.rule_code = 'MX-1-11'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_3', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_11'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'FAKTUR_PAJAK'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.11'
WHERE r.rule_code = 'MX-1-11'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 4, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_4', f.bundle_document_field_id, 'FUZZY'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_11'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'AIRWAY_BILL'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.11'
WHERE r.rule_code = 'MX-1-11'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_4' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 5, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_5', f.bundle_document_field_id, 'FUZZY'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_11'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'SHIPPING_BILL'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.11'
WHERE r.rule_code = 'MX-1-11'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_5' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 6, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_6', f.bundle_document_field_id, 'FUZZY'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_11'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'BANK_GUARANTEE_BOND_WARRANTY_LETTER'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.11'
WHERE r.rule_code = 'MX-1-11'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_6' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 7, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_7', f.bundle_document_field_id, 'FUZZY'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_11'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'QUALITY_CERTIFICATE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.11'
WHERE r.rule_code = 'MX-1-11'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_7' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 8, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_8', f.bundle_document_field_id, 'FUZZY'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_11'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'CONTRACT_ENGAGEMENT_LETTER'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.11'
WHERE r.rule_code = 'MX-1-11'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_8' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 9, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_9', f.bundle_document_field_id, 'FUZZY'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_11'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'WORK_PROGRESS_CERTIFICATE_BAST'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.11'
WHERE r.rule_code = 'MX-1-11'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_9' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 10, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_10', f.bundle_document_field_id, 'FUZZY'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_11'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INSPECTION_REPORT_CERTIFICATE_INCL_QUANTITY_CERTIF'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.11'
WHERE r.rule_code = 'MX-1-11'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_10' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 11, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_11', f.bundle_document_field_id, 'FUZZY'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_11'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'GUARANTEE_LETTER'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.11'
WHERE r.rule_code = 'MX-1-11'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_11' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 12, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_12', f.bundle_document_field_id, 'FUZZY'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_11'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'CERTIFICATION_AND_PROOF_OF_COMPLETION_OF_MILESTONE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.11'
WHERE r.rule_code = 'MX-1-11'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_12' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT TRUE, 'MX-1-12', 'Vendor NPWP number', '1.12', NULL, NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-1-12');
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_12'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.12'
WHERE r.rule_code = 'MX-1-12'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_12'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'FAKTUR_PAJAK'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.12'
WHERE r.rule_code = 'MX-1-12'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'EXTERNAL_SERVICE', 'tgt_3', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_12'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_coretax_validation_djp_portal'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_12'
WHERE r.rule_code = 'MX-1-12'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 4, 'TARGET', 'EAPA_DB', 'tgt_4', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_12'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_vendor_master_data'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_12'
WHERE r.rule_code = 'MX-1-12'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_4' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT TRUE, 'MX-1-13', 'Faktur Pajak value', '1.13', NULL, NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-1-13');
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_13'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.13'
WHERE r.rule_code = 'MX-1-13'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_13'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'FAKTUR_PAJAK'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.13'
WHERE r.rule_code = 'MX-1-13'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'EXTERNAL_SERVICE', 'tgt_3', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_13'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_coretax_validation_djp_portal'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_13'
WHERE r.rule_code = 'MX-1-13'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT TRUE, 'MX-1-14', 'Faktur Pajak date', '1.14', NULL, NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-1-14');
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_14'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.14'
WHERE r.rule_code = 'MX-1-14'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_14'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'FAKTUR_PAJAK'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.14'
WHERE r.rule_code = 'MX-1-14'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'EXTERNAL_SERVICE', 'tgt_3', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_14'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_coretax_validation_djp_portal'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_14'
WHERE r.rule_code = 'MX-1-14'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT TRUE, 'MX-1-15', 'Faktur Pajak vendor name', '1.15', NULL, NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-1-15');
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_15'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.15'
WHERE r.rule_code = 'MX-1-15'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_15'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'FAKTUR_PAJAK'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.15'
WHERE r.rule_code = 'MX-1-15'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'EXTERNAL_SERVICE', 'tgt_3', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_15'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_coretax_validation_djp_portal'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_15'
WHERE r.rule_code = 'MX-1-15'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 4, 'TARGET', 'EAPA_DB', 'tgt_4', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_15'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_vendor_master_data'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_15'
WHERE r.rule_code = 'MX-1-15'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_4' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT TRUE, 'MX-1-16', 'Faktur Pajak number', '1.16', NULL, 'Source system field: Coretax e-Faktur validity API Match key: FP number + NPWP + period Action on failure: Block', 'HEADER', 'UNIQUENESS', 'EQUALS', NULL, NULL, NULL, NULL, NULL, TRUE, TRUE, 'HARD_FAIL', 'BLOCK', 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-1-16');
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_16'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'FAKTUR_PAJAK'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.16'
WHERE r.rule_code = 'MX-1-16'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'EXTERNAL_SERVICE', 'tgt_2', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_16'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_coretax_validation_djp_portal'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_16'
WHERE r.rule_code = 'MX-1-16'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'EAPA_DB', 'tgt_3', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_16'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_processed_invoice_history'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_16'
WHERE r.rule_code = 'MX-1-16'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT TRUE, 'MX-1-17', 'Faktur Pajak Bar Code', '1.17', NULL, 'Source system field: Coretax e-Faktur QR / bar code check Match key: QR payload vs FP face values Action on failure: Block handler_key unmapped: the matrix names the type and does not give an executable formula or handler.', 'AUTHENTICITY', 'AUTHENTICITY', 'EQUALS', 'unmapped', NULL, NULL, NULL, NULL, TRUE, TRUE, 'HARD_FAIL', 'BLOCK', 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-1-17');
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_17'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'FAKTUR_PAJAK'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.17'
WHERE r.rule_code = 'MX-1-17'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'EXTERNAL_SERVICE', 'tgt_2', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_17'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_coretax_validation_djp_portal'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_17'
WHERE r.rule_code = 'MX-1-17'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT TRUE, 'MX-1-18', 'Negative Vendor List', '1.18', NULL, 'Source system field: Vendor master - block / negative-list indicator', 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-1-18');
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_18'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.18'
WHERE r.rule_code = 'MX-1-18'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'EAPA_DB', 'tgt_2', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_18'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_vendor_master_data'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_18'
WHERE r.rule_code = 'MX-1-18'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT TRUE, 'MX-1-20', 'Liquidated Clause', '1.20', NULL, 'Source system field: PO condition - Liquidated damages Match key: LD rate & cap per PO / contract clause handler_key unmapped: the matrix names the type and does not give an executable formula or handler.', 'HEADER', 'CALCULATION', 'EQUALS', 'unmapped', NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-1-20');
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'EAPA_DB', 'src', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_20'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_po'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_20'
WHERE r.rule_code = 'MX-1-20'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_20'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'CONTRACT_ENGAGEMENT_LETTER'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.20'
WHERE r.rule_code = 'MX-1-20'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT TRUE, 'MX-1-21', 'Retention Clause', '1.21', NULL, 'Source system field: PO condition - Retention Match key: Retention % per PO / contract clause handler_key unmapped: the matrix names the type and does not give an executable formula or handler.', 'HEADER', 'CALCULATION', 'EQUALS', 'unmapped', NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-1-21');
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'EAPA_DB', 'src', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_21'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_po'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_21'
WHERE r.rule_code = 'MX-1-21'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_21'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'CONTRACT_ENGAGEMENT_LETTER'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.21'
WHERE r.rule_code = 'MX-1-21'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT TRUE, 'MX-1-22', 'Advance recovery Clause', '1.22', NULL, 'Source system field: PO condition - Advance recovery Match key: Advance recovery schedule per PO / contract clause handler_key unmapped: the matrix names the type and does not give an executable formula or handler.', 'HEADER', 'CALCULATION', 'EQUALS', 'unmapped', NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-1-22');
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'EAPA_DB', 'src', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_22'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_po'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_22'
WHERE r.rule_code = 'MX-1-22'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_22'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'CONTRACT_ENGAGEMENT_LETTER'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.22'
WHERE r.rule_code = 'MX-1-22'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT TRUE, 'MX-1-23', 'Percentage Completion (BAST & SES)', '1.23', NULL, 'Action on failure: Route (queue name is not in the matrix)', 'HEADER', 'TOLERANCE', 'WITHIN_TOLERANCE', NULL, NULL, 5, 200000, 'IDR', FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-1-23');
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_23'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.23'
WHERE r.rule_code = 'MX-1-23'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'EAPA_DB', 'tgt_2', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_23'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_po'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_23'
WHERE r.rule_code = 'MX-1-23'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_3', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_23'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'WORK_PROGRESS_CERTIFICATE_BAST'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.23'
WHERE r.rule_code = 'MX-1-23'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 4, 'TARGET', 'EAPA_DB', 'tgt_4', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_23'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_service_entry_sheet'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_23'
WHERE r.rule_code = 'MX-1-23'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_4' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 5, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_5', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_23'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'DELIVERABLE_AS_PER_CONTRACT'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.23'
WHERE r.rule_code = 'MX-1-23'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_5' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 6, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_6', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_23'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'CERTIFICATION_AND_PROOF_OF_COMPLETION_OF_MILESTONE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.23'
WHERE r.rule_code = 'MX-1-23'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_6' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 7, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_7', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_23'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'MANAGEMENT_OR_FUNCTIONAL_APPROVAL_AS_PER_DOA'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.23'
WHERE r.rule_code = 'MX-1-23'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_7' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT TRUE, 'MX-1-24', 'Duplicate invoice check (vendor + invoice no. + amount + date)', '1.24', NULL, NULL, 'HEADER', 'UNIQUENESS', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-1-24');
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_24'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.24'
WHERE r.rule_code = 'MX-1-24'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'EAPA_DB', 'tgt_2', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_24'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_processed_invoice_history'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_24'
WHERE r.rule_code = 'MX-1-24'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT TRUE, 'MX-1-25', 'Duplicate Faktur Pajak check (FP number)', '1.25', NULL, NULL, 'HEADER', 'UNIQUENESS', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-1-25');
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_25'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'FAKTUR_PAJAK'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.25'
WHERE r.rule_code = 'MX-1-25'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'EAPA_DB', 'tgt_2', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_25'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_processed_invoice_history'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_25'
WHERE r.rule_code = 'MX-1-25'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT TRUE, 'MX-1-26', 'Currency', '1.26', NULL, NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-1-26');
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_26'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.26'
WHERE r.rule_code = 'MX-1-26'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'EAPA_DB', 'tgt_2', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_26'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_po'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_26'
WHERE r.rule_code = 'MX-1-26'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_3', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_26'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'FAKTUR_PAJAK'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.26'
WHERE r.rule_code = 'MX-1-26'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT TRUE, 'MX-1-27', 'Exchange rate applied', '1.27', NULL, 'Source system field: BI middle rate / DJP tax rate for posting date Match key: Invoice currency + posting date', 'HEADER', 'TOLERANCE', 'WITHIN_TOLERANCE', NULL, NULL, 1, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-1-27');
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_27'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.27'
WHERE r.rule_code = 'MX-1-27'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_27'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'FAKTUR_PAJAK'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.27'
WHERE r.rule_code = 'MX-1-27'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT TRUE, 'MX-1-28', 'PPN rate and DPP (taxable base)', '1.28', NULL, 'Source system field: PPN rate table (prevailing rate) Match key: DPP x rate vs FP value Action on failure: Block handler_key unmapped: the matrix names the type and does not give an executable formula or handler.', 'HEADER', 'CALCULATION', 'EQUALS', 'unmapped', NULL, NULL, NULL, NULL, TRUE, TRUE, 'HARD_FAIL', 'BLOCK', 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-1-28');
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_28'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.28'
WHERE r.rule_code = 'MX-1-28'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_28'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'FAKTUR_PAJAK'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.28'
WHERE r.rule_code = 'MX-1-28'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'EXTERNAL_SERVICE', 'tgt_3', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_28'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_coretax_validation_djp_portal'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_28'
WHERE r.rule_code = 'MX-1-28'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT TRUE, 'MX-1-29', 'WHT type and rate (PPh 21 / 23 / 4(2))', '1.29', NULL, 'Source system field: Vendor withholding tax code + SKB validity Match key: Vendor + PPh article Action on failure: Block', 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, TRUE, TRUE, 'HARD_FAIL', 'BLOCK', 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-1-29');
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_29'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.29'
WHERE r.rule_code = 'MX-1-29'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'EAPA_DB', 'tgt_2', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_29'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_vendor_master_data'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_29'
WHERE r.rule_code = 'MX-1-29'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_3', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_29'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'CONTRACT_ENGAGEMENT_LETTER'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.29'
WHERE r.rule_code = 'MX-1-29'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT TRUE, 'MX-1-30', 'Payment baseline date and due date', '1.30', NULL, 'Source system field: Payment terms baseline (invoice / FP / GRN date) Match key: Terms + baseline date handler_key unmapped: the matrix names the type and does not give an executable formula or handler.', 'HEADER', 'CALCULATION', 'EQUALS', 'unmapped', NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-1-30');
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_30'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.30'
WHERE r.rule_code = 'MX-1-30'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'EAPA_DB', 'tgt_2', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_30'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_po'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_30'
WHERE r.rule_code = 'MX-1-30'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'EAPA_DB', 'tgt_3', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_30'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_grn'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_30'
WHERE r.rule_code = 'MX-1-30'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT TRUE, 'MX-1-31', 'Date sequence (service period - GRN - invoice - FP)', '1.31', NULL, NULL, 'HEADER', 'LOGICAL', 'ASCENDING', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-1-31');
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_31'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.31'
WHERE r.rule_code = 'MX-1-31'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'EAPA_DB', 'tgt_2', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_31'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_grn'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_31'
WHERE r.rule_code = 'MX-1-31'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_3', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_31'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'FAKTUR_PAJAK'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.31'
WHERE r.rule_code = 'MX-1-31'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT TRUE, 'MX-1-32', 'PO remaining balance (quantity and value)', '1.32', NULL, 'handler_key unmapped: the matrix names the type and does not give an executable formula or handler.', 'HEADER', 'CALCULATION', 'EQUALS', 'unmapped', NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-1-32');
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_32'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '1.32'
WHERE r.rule_code = 'MX-1-32'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'EAPA_DB', 'tgt_2', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_32'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_po'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_32'
WHERE r.rule_code = 'MX-1-32'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'EAPA_DB', 'tgt_3', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_32'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_grn'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_32'
WHERE r.rule_code = 'MX-1-32'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT TRUE, 'MX-1-33', 'Vendor bank account changed since last payment', '1.33', NULL, 'Source system field: Last paid bank account (LFBK + payment history) Match key: Vendor + bank account number Action on failure: Block', 'HEADER', 'LOGICAL', 'NOT_EQUALS', NULL, NULL, NULL, NULL, NULL, TRUE, TRUE, 'HARD_FAIL', 'BLOCK', 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-1-33');
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'EAPA_DB', 'src', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_33'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_vendor_master_data'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_33'
WHERE r.rule_code = 'MX-1-33'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'EAPA_DB', 'tgt_2', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_1_33'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_processed_invoice_history'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_1_33'
WHERE r.rule_code = 'MX-1-33'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-2-01', 'Item description', '2.01', 'ITEM-DESC', NULL, 'HEADER', 'LOGICAL_AI', 'EQUALS', NULL, (SELECT prompt_template_id FROM "PROMPT_TEMPLATE" WHERE template_key = 'matrix.logical.unspecified' AND template_version = 1), NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-2-01');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-2-01' AND c.category_code = 'MATERIAL'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_2_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '2.01'
WHERE r.rule_code = 'MX-2-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'EAPA_DB', 'tgt_2', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_2_01'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_po'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_2_01'
WHERE r.rule_code = 'MX-2-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'EAPA_DB', 'tgt_3', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_2_01'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_grn'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_2_01'
WHERE r.rule_code = 'MX-2-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 4, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_4', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_2_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'DELIVERY_NOTE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '2.01'
WHERE r.rule_code = 'MX-2-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_4' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 5, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_5', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_2_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'PACKING_LIST'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '2.01'
WHERE r.rule_code = 'MX-2-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_5' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-2-02', 'Airway Bill / Shipping Bill Date', '2.02', NULL, NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-2-02');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-2-02' AND c.category_code = 'MATERIAL'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_2_02'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'AIRWAY_BILL'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '2.02'
WHERE r.rule_code = 'MX-2-02'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_2_02'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'SHIPPING_BILL'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '2.02'
WHERE r.rule_code = 'MX-2-02'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-2-03', 'Airway Bill / Shipping Bill Name', '2.03', NULL, NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-2-03');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-2-03' AND c.category_code = 'MATERIAL'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_2_03'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '2.03'
WHERE r.rule_code = 'MX-2-03'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'EAPA_DB', 'tgt_2', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_2_03'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_po'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_2_03'
WHERE r.rule_code = 'MX-2-03'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_3', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_2_03'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'AIRWAY_BILL'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '2.03'
WHERE r.rule_code = 'MX-2-03'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 4, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_4', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_2_03'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'SHIPPING_BILL'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '2.03'
WHERE r.rule_code = 'MX-2-03'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_4' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-2-04', 'Bank Guarantee / Performance Bond Expiry Date', '2.04', NULL, NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-2-04');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-2-04' AND c.category_code = 'MATERIAL'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'EAPA_DB', 'src', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_2_04'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_po'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_2_04'
WHERE r.rule_code = 'MX-2-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_2_04'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'BANK_GUARANTEE_BOND_WARRANTY_LETTER'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '2.04'
WHERE r.rule_code = 'MX-2-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_3', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_2_04'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'CONTRACT_ENGAGEMENT_LETTER'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '2.04'
WHERE r.rule_code = 'MX-2-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-2-05', 'Bank Guarantee / Performance Bond Amt.', '2.05', NULL, NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-2-05');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-2-05' AND c.category_code = 'MATERIAL'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'EAPA_DB', 'src', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_2_05'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_po'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_2_05'
WHERE r.rule_code = 'MX-2-05'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_2_05'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'BANK_GUARANTEE_BOND_WARRANTY_LETTER'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '2.05'
WHERE r.rule_code = 'MX-2-05'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_3', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_2_05'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'CONTRACT_ENGAGEMENT_LETTER'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '2.05'
WHERE r.rule_code = 'MX-2-05'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-3-01', 'Man-hours Qty.', '3.01', NULL, NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-3-01');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-3-01' AND c.category_code = 'MANPOWER_OUTSOURCING'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_3_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '3.01'
WHERE r.rule_code = 'MX-3-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'EAPA_DB', 'tgt_2', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_3_01'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_po'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_3_01'
WHERE r.rule_code = 'MX-3-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_3', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_3_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'WORK_PROGRESS_CERTIFICATE_BAST'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '3.01'
WHERE r.rule_code = 'MX-3-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 4, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_4', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_3_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'TIMESHEET'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '3.01'
WHERE r.rule_code = 'MX-3-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_4' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 5, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_5', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_3_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'MANPOWER_SUMMARY'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '3.01'
WHERE r.rule_code = 'MX-3-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_5' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-3-02', 'Man-hours Unit Rate', '3.02', NULL, NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-3-02');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-3-02' AND c.category_code = 'MANPOWER_OUTSOURCING'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_3_02'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '3.02'
WHERE r.rule_code = 'MX-3-02'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'EAPA_DB', 'tgt_2', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_3_02'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_po'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_3_02'
WHERE r.rule_code = 'MX-3-02'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_3', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_3_02'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'CONTRACT_ENGAGEMENT_LETTER'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '3.02'
WHERE r.rule_code = 'MX-3-02'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 4, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_4', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_3_02'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'MANPOWER_SUMMARY'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '3.02'
WHERE r.rule_code = 'MX-3-02'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_4' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-3-03', 'Overtime Qty.', '3.03', NULL, NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-3-03');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-3-03' AND c.category_code = 'MANPOWER_OUTSOURCING'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_3_03'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '3.03'
WHERE r.rule_code = 'MX-3-03'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'EAPA_DB', 'tgt_2', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_3_03'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_po'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_3_03'
WHERE r.rule_code = 'MX-3-03'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_3', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_3_03'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'WORK_PROGRESS_CERTIFICATE_BAST'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '3.03'
WHERE r.rule_code = 'MX-3-03'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 4, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_4', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_3_03'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'TIMESHEET'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '3.03'
WHERE r.rule_code = 'MX-3-03'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_4' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 5, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_5', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_3_03'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'MANPOWER_SUMMARY'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '3.03'
WHERE r.rule_code = 'MX-3-03'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_5' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 6, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_6', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_3_03'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'OVERTIME_APPROVAL'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '3.03'
WHERE r.rule_code = 'MX-3-03'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_6' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-3-04', 'Overtime unit rate', '3.04', NULL, NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-3-04');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-3-04' AND c.category_code = 'MANPOWER_OUTSOURCING'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_3_04'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '3.04'
WHERE r.rule_code = 'MX-3-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'EAPA_DB', 'tgt_2', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_3_04'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_po'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_3_04'
WHERE r.rule_code = 'MX-3-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_3', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_3_04'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'CONTRACT_ENGAGEMENT_LETTER'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '3.04'
WHERE r.rule_code = 'MX-3-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 4, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_4', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_3_04'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'MANPOWER_SUMMARY'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '3.04'
WHERE r.rule_code = 'MX-3-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_4' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 5, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_5', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_3_04'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'OVERTIME_APPROVAL'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '3.04'
WHERE r.rule_code = 'MX-3-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_5' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-4-01', 'Daily POB count', '4.01', NULL, NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-4-01');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-4-01' AND c.category_code = 'CATERING'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_4_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '4.01'
WHERE r.rule_code = 'MX-4-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_4_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'MEAL_ATTENDANCE_AT_CANTEEN_ALL_MEAL_TYPES'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '4.01'
WHERE r.rule_code = 'MX-4-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'EXTERNAL_SERVICE', 'tgt_3', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_4_01'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_attendence_face_id'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_4_01'
WHERE r.rule_code = 'MX-4-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-4-02', 'Meal Sheet - Attendance', '4.02', NULL, NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-4-02');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-4-02' AND c.category_code = 'CATERING'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_4_02'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '4.02'
WHERE r.rule_code = 'MX-4-02'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_4_02'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'MEAL_ATTENDANCE_AT_CANTEEN_ALL_MEAL_TYPES'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '4.02'
WHERE r.rule_code = 'MX-4-02'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-4-03', 'Packed Meal Sheet - Attendance', '4.03', NULL, NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-4-03');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-4-03' AND c.category_code = 'CATERING'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_4_03'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '4.03'
WHERE r.rule_code = 'MX-4-03'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_4_03'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'MEAL_ATTENDANCE_AT_CANTEEN_ALL_MEAL_TYPES'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '4.03'
WHERE r.rule_code = 'MX-4-03'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-4-04', 'Snack back-charge Qty.', '4.04', NULL, NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-4-04');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-4-04' AND c.category_code = 'CATERING'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_4_04'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '4.04'
WHERE r.rule_code = 'MX-4-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_4_04'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'RECAPITULATION_BACK_CHARGE_SNACKS_SPECIAL_LUNCH_DI'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '4.04'
WHERE r.rule_code = 'MX-4-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-4-05', 'Special-meal back-charge Qty.', '4.05', NULL, NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-4-05');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-4-05' AND c.category_code = 'CATERING'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_4_05'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '4.05'
WHERE r.rule_code = 'MX-4-05'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_4_05'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'RECAPITULATION_BACK_CHARGE_SNACKS_SPECIAL_LUNCH_DI'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '4.05'
WHERE r.rule_code = 'MX-4-05'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'EXTERNAL_SERVICE', 'tgt_3', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_4_05'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_attendence_face_id'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_4_05'
WHERE r.rule_code = 'MX-4-05'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-4-06', 'Special dinners Qty.', '4.06', NULL, NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-4-06');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-4-06' AND c.category_code = 'CATERING'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_4_06'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '4.06'
WHERE r.rule_code = 'MX-4-06'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_4_06'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'RECAPITULATION_BACK_CHARGE_SNACKS_SPECIAL_LUNCH_DI'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '4.06'
WHERE r.rule_code = 'MX-4-06'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'EXTERNAL_SERVICE', 'tgt_3', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_4_06'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_attendence_face_id'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_4_06'
WHERE r.rule_code = 'MX-4-06'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-4-07', 'Special lunches Qty.', '4.07', NULL, NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-4-07');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-4-07' AND c.category_code = 'CATERING'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_4_07'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '4.07'
WHERE r.rule_code = 'MX-4-07'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_4_07'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'RECAPITULATION_BACK_CHARGE_SNACKS_SPECIAL_LUNCH_DI'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '4.07'
WHERE r.rule_code = 'MX-4-07'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'EXTERNAL_SERVICE', 'tgt_3', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_4_07'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_attendence_face_id'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_4_07'
WHERE r.rule_code = 'MX-4-07'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-4-08', 'Employee Name', '4.08', NULL, NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-4-08');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-4-08' AND c.category_code = 'CATERING'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_4_08'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'MEAL_ATTENDANCE_AT_CANTEEN_ALL_MEAL_TYPES'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '4.08'
WHERE r.rule_code = 'MX-4-08'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'EXTERNAL_SERVICE', 'tgt_2', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_4_08'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_attendence_face_id'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_4_08'
WHERE r.rule_code = 'MX-4-08'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-4-09', 'Date', '4.09', NULL, NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-4-09');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-4-09' AND c.category_code = 'CATERING'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_4_09'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'MEAL_ATTENDANCE_AT_CANTEEN_ALL_MEAL_TYPES'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '4.09'
WHERE r.rule_code = 'MX-4-09'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'EXTERNAL_SERVICE', 'tgt_2', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_4_09'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_attendence_face_id'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_4_09'
WHERE r.rule_code = 'MX-4-09'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-4-11', 'Indian Cook - Attendance', '4.11', NULL, NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-4-11');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-4-11' AND c.category_code = 'CATERING'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_4_11'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '4.11'
WHERE r.rule_code = 'MX-4-11'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_4_11'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'TIMESHEET'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '4.11'
WHERE r.rule_code = 'MX-4-11'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-4-12', 'Flight ticket - Employee Name', '4.12', NULL, NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-4-12');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-4-12' AND c.category_code = 'CATERING'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_4_12'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '4.12'
WHERE r.rule_code = 'MX-4-12'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_4_12'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'OTHER_REIMBURSEMENT_CATERING'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '4.12'
WHERE r.rule_code = 'MX-4-12'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-4-13', 'ITAS - Employee Name', '4.13', NULL, NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-4-13');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-4-13' AND c.category_code = 'CATERING'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_4_13'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '4.13'
WHERE r.rule_code = 'MX-4-13'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_4_13'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'OTHER_REIMBURSEMENT_CATERING'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '4.13'
WHERE r.rule_code = 'MX-4-13'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-5-01', 'Number of Rooms', '5.01', NULL, 'handler_key unmapped: the matrix names the type and does not give an executable formula or handler.', 'HEADER', 'CALCULATION', 'EQUALS', 'unmapped', NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-5-01');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-5-01' AND c.category_code = 'HOUSEKEEPING'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_5_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '5.01'
WHERE r.rule_code = 'MX-5-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_5_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'COST_PER_ACCOMMODATION_REPORT'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '5.01'
WHERE r.rule_code = 'MX-5-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-6-01', 'Equipment Hours', '6.01', NULL, NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-6-01');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-6-01' AND c.category_code = 'RENTAL_EQUIPMENT'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_6_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '6.01'
WHERE r.rule_code = 'MX-6-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_6_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'TIMESHEET'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '6.01'
WHERE r.rule_code = 'MX-6-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-6-02', 'Equipment unit rate', '6.02', NULL, NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-6-02');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-6-02' AND c.category_code = 'RENTAL_EQUIPMENT'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_6_02'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '6.02'
WHERE r.rule_code = 'MX-6-02'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'EAPA_DB', 'tgt_2', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_6_02'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_po'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_6_02'
WHERE r.rule_code = 'MX-6-02'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_3', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_6_02'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'CONTRACT_ENGAGEMENT_LETTER'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '6.02'
WHERE r.rule_code = 'MX-6-02'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-6-03', 'Operator Manhours', '6.03', NULL, NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-6-03');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-6-03' AND c.category_code = 'RENTAL_EQUIPMENT'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_6_03'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '6.03'
WHERE r.rule_code = 'MX-6-03'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_6_03'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'TIMESHEET'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '6.03'
WHERE r.rule_code = 'MX-6-03'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_3', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_6_03'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'MANPOWER_SUMMARY'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '6.03'
WHERE r.rule_code = 'MX-6-03'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-7-01', 'Quantity - BOQ', '7.01', NULL, 'Action on failure: Route (queue name is not in the matrix)', 'HEADER', 'TOLERANCE', 'WITHIN_TOLERANCE', NULL, NULL, 5, 200000, 'IDR', FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-7-01');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-7-01' AND c.category_code = 'CIVIL_WORKS_CONSTRUCTION'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_7_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '7.01'
WHERE r.rule_code = 'MX-7-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'EAPA_DB', 'tgt_2', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_7_01'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_po'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_7_01'
WHERE r.rule_code = 'MX-7-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_3', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_7_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'MEASUREMENTS_BILL_OF_QUANTITY'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '7.01'
WHERE r.rule_code = 'MX-7-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 4, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_4', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_7_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INSPECTION_REPORT_CERTIFICATE_INCL_QUANTITY_CERTIF'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '7.01'
WHERE r.rule_code = 'MX-7-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_4' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-7-02', 'Completion Proof', '7.02', NULL, 'handler_key unmapped: the matrix names the type and does not give an executable formula or handler.', 'AUTHENTICITY', 'AUTHENTICITY', 'EQUALS', 'unmapped', NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-7-02');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-7-02' AND c.category_code = 'CIVIL_WORKS_CONSTRUCTION'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_7_02'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'PHOTO_EVIDENCE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '7.02'
WHERE r.rule_code = 'MX-7-02'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-7-03', 'SIUJK expiry date', '7.03', NULL, NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-7-03');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-7-03' AND c.category_code = 'CIVIL_WORKS_CONSTRUCTION'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_7_03'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '7.03'
WHERE r.rule_code = 'MX-7-03'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_7_03'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'SIUJK_PERMIT'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '7.03'
WHERE r.rule_code = 'MX-7-03'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-7-04', 'SIUJK WHT rate', '7.04', NULL, NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-7-04');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-7-04' AND c.category_code = 'CIVIL_WORKS_CONSTRUCTION'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_7_04'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '7.04'
WHERE r.rule_code = 'MX-7-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_7_04'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'SIUJK_PERMIT'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '7.04'
WHERE r.rule_code = 'MX-7-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-8-01', 'ESSA Company Name', '8.01', NULL, NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-8-01');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-8-01' AND c.category_code = 'PIB'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_8_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '8.01'
WHERE r.rule_code = 'MX-8-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_8_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'AIRWAY_BILL'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '8.01'
WHERE r.rule_code = 'MX-8-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_3', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_8_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'SHIPPING_BILL'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '8.01'
WHERE r.rule_code = 'MX-8-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 4, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_4', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_8_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'PEMBERITAHUAN_IMPOR_BARANG_PIB'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '8.01'
WHERE r.rule_code = 'MX-8-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_4' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-8-02', 'PIB Amount', '8.02', NULL, 'handler_key unmapped: the matrix names the type and does not give an executable formula or handler.', 'HEADER', 'CALCULATION', 'EQUALS', 'unmapped', NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-8-02');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-8-02' AND c.category_code = 'PIB'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_8_02'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'PO_FOR_MATERIAL_BEING_IMPORTED'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '8.02'
WHERE r.rule_code = 'MX-8-02'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_8_02'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'PEMBERITAHUAN_IMPOR_BARANG_PIB'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '8.02'
WHERE r.rule_code = 'MX-8-02'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_3', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_8_02'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '8.02'
WHERE r.rule_code = 'MX-8-02'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-8-03', 'Item Description', '8.03', 'ITEM-DESC', NULL, 'HEADER', 'LOGICAL_AI', 'EQUALS', NULL, (SELECT prompt_template_id FROM "PROMPT_TEMPLATE" WHERE template_key = 'matrix.logical.unspecified' AND template_version = 1), NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-8-03');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-8-03' AND c.category_code = 'PIB'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_8_03'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'PACKING_LIST'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '8.03'
WHERE r.rule_code = 'MX-8-03'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_8_03'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'AIRWAY_BILL'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '8.03'
WHERE r.rule_code = 'MX-8-03'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_3', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_8_03'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'SHIPPING_BILL'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '8.03'
WHERE r.rule_code = 'MX-8-03'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 4, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_4', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_8_03'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'PO_FOR_MATERIAL_BEING_IMPORTED'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '8.03'
WHERE r.rule_code = 'MX-8-03'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_4' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 5, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_5', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_8_03'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'PEMBERITAHUAN_IMPOR_BARANG_PIB'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '8.03'
WHERE r.rule_code = 'MX-8-03'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_5' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-9-01', 'Trip ID', '9.01', NULL, NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-9-01');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-9-01' AND c.category_code = 'TRAVEL_NON_PO'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_9_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '9.01'
WHERE r.rule_code = 'MX-9-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_9_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'BILLING_SUMMARY'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '9.01'
WHERE r.rule_code = 'MX-9-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'EAPA_DB', 'tgt_3', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_9_01'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_hcis_clearing_account'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_9_01'
WHERE r.rule_code = 'MX-9-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 4, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_4', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_9_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'BOOKING_CONFIRMATION'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '9.01'
WHERE r.rule_code = 'MX-9-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_4' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-9-02', 'Airline', '9.02', NULL, NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-9-02');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-9-02' AND c.category_code = 'TRAVEL_NON_PO'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_9_02'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '9.02'
WHERE r.rule_code = 'MX-9-02'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_9_02'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'BILLING_SUMMARY'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '9.02'
WHERE r.rule_code = 'MX-9-02'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_3', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_9_02'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'BOOKING_CONFIRMATION'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '9.02'
WHERE r.rule_code = 'MX-9-02'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-9-03', 'Route', '9.03', NULL, NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-9-03');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-9-03' AND c.category_code = 'TRAVEL_NON_PO'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_9_03'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '9.03'
WHERE r.rule_code = 'MX-9-03'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_9_03'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'BILLING_SUMMARY'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '9.03'
WHERE r.rule_code = 'MX-9-03'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_3', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_9_03'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'BOOKING_CONFIRMATION'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '9.03'
WHERE r.rule_code = 'MX-9-03'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-9-04', 'Travel dates', '9.04', NULL, NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-9-04');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-9-04' AND c.category_code = 'TRAVEL_NON_PO'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_9_04'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '9.04'
WHERE r.rule_code = 'MX-9-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_9_04'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'BILLING_SUMMARY'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '9.04'
WHERE r.rule_code = 'MX-9-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_3', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_9_04'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'BOOKING_CONFIRMATION'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '9.04'
WHERE r.rule_code = 'MX-9-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-9-05', 'Passenger name', '9.05', NULL, NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-9-05');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-9-05' AND c.category_code = 'TRAVEL_NON_PO'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_9_05'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '9.05'
WHERE r.rule_code = 'MX-9-05'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_9_05'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'BILLING_SUMMARY'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '9.05'
WHERE r.rule_code = 'MX-9-05'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_3', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_9_05'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'BOOKING_CONFIRMATION'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '9.05'
WHERE r.rule_code = 'MX-9-05'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-9-06', 'Travel class', '9.06', NULL, NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-9-06');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-9-06' AND c.category_code = 'TRAVEL_NON_PO'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_9_06'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '9.06'
WHERE r.rule_code = 'MX-9-06'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_9_06'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'BILLING_SUMMARY'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '9.06'
WHERE r.rule_code = 'MX-9-06'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_3', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_9_06'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'BOOKING_CONFIRMATION'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '9.06'
WHERE r.rule_code = 'MX-9-06'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-9-07', 'HCIS Ledger amount', '9.07', 'HCIS-LEDGER', NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-9-07');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-9-07' AND c.category_code = 'TRAVEL_NON_PO'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_9_07'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '9.07'
WHERE r.rule_code = 'MX-9-07'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_9_07'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'BILLING_SUMMARY'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '9.07'
WHERE r.rule_code = 'MX-9-07'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'EAPA_DB', 'tgt_3', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_9_07'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_hcis_clearing_account'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_9_07'
WHERE r.rule_code = 'MX-9-07'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-10-01', 'Hotel Trip ID', '10.01', NULL, NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-10-01');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-10-01' AND c.category_code = 'HOTEL_NON_PO'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_10_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '10.01'
WHERE r.rule_code = 'MX-10-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_10_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'BILLING_SUMMARY'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '10.01'
WHERE r.rule_code = 'MX-10-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'EAPA_DB', 'tgt_3', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_10_01'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_hcis_clearing_account'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_10_01'
WHERE r.rule_code = 'MX-10-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 4, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_4', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_10_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'GUARANTEE_LETTER'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '10.01'
WHERE r.rule_code = 'MX-10-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_4' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 5, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_5', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_10_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'ROOM_RESERVATION_FORM'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '10.01'
WHERE r.rule_code = 'MX-10-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_5' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 6, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_6', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_10_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'BOOKING_CONFIRMATION'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '10.01'
WHERE r.rule_code = 'MX-10-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_6' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-10-02', 'Hotel dates', '10.02', NULL, NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-10-02');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-10-02' AND c.category_code = 'HOTEL_NON_PO'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_10_02'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '10.02'
WHERE r.rule_code = 'MX-10-02'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_10_02'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'BILLING_SUMMARY'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '10.02'
WHERE r.rule_code = 'MX-10-02'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_3', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_10_02'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'GUARANTEE_LETTER'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '10.02'
WHERE r.rule_code = 'MX-10-02'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 4, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_4', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_10_02'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'ROOM_RESERVATION_FORM'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '10.02'
WHERE r.rule_code = 'MX-10-02'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_4' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 5, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_5', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_10_02'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'BOOKING_CONFIRMATION'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '10.02'
WHERE r.rule_code = 'MX-10-02'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_5' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-10-03', 'Guest name', '10.03', NULL, 'handler_key unmapped: the matrix names the type and does not give an executable formula or handler.', 'AUTHENTICITY', 'AUTHENTICITY', 'EQUALS', 'unmapped', NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-10-03');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-10-03' AND c.category_code = 'HOTEL_NON_PO'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_10_03'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '10.03'
WHERE r.rule_code = 'MX-10-03'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_10_03'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'BILLING_SUMMARY'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '10.03'
WHERE r.rule_code = 'MX-10-03'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_3', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_10_03'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'GUARANTEE_LETTER'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '10.03'
WHERE r.rule_code = 'MX-10-03'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 4, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_4', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_10_03'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'ROOM_RESERVATION_FORM'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '10.03'
WHERE r.rule_code = 'MX-10-03'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_4' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 5, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_5', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_10_03'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'BOOKING_CONFIRMATION'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '10.03'
WHERE r.rule_code = 'MX-10-03'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_5' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-10-04', 'HCIS Ledger amount', '10.04', 'HCIS-LEDGER', NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-10-04');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-10-04' AND c.category_code = 'HOTEL_NON_PO'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_10_04'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '10.04'
WHERE r.rule_code = 'MX-10-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_10_04'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'BILLING_SUMMARY'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '10.04'
WHERE r.rule_code = 'MX-10-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'EAPA_DB', 'tgt_3', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_10_04'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_hcis_clearing_account'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_10_04'
WHERE r.rule_code = 'MX-10-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 4, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_4', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_10_04'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'GUARANTEE_LETTER'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '10.04'
WHERE r.rule_code = 'MX-10-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_4' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-11-01', 'Item Description', '11.01', 'ITEM-DESC', NULL, 'HEADER', 'LOGICAL_AI', 'EQUALS', NULL, (SELECT prompt_template_id FROM "PROMPT_TEMPLATE" WHERE template_key = 'matrix.logical.unspecified' AND template_version = 1), NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-11-01');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-11-01' AND c.category_code = 'IMPORT_LOGISTICS'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_11_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'PACKING_LIST'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '11.01'
WHERE r.rule_code = 'MX-11-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_11_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'PO_FOR_MATERIAL_BEING_IMPORTED'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '11.01'
WHERE r.rule_code = 'MX-11-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_3', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_11_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'SURAT_PERSETUJUAN_PENGELUARAN_BARANG_SPPB'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '11.01'
WHERE r.rule_code = 'MX-11-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-11-02', 'Airway / Shipping Bill - Vendor name', '11.02', NULL, 'handler_key unmapped: the matrix names the type and does not give an executable formula or handler.', 'AUTHENTICITY', 'AUTHENTICITY', 'EQUALS', 'unmapped', NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-11-02');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-11-02' AND c.category_code = 'IMPORT_LOGISTICS'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'EAPA_DB', 'src', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_11_02'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_vendor_master_data'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_11_02'
WHERE r.rule_code = 'MX-11-02'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_11_02'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'PACKING_LIST'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '11.02'
WHERE r.rule_code = 'MX-11-02'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_3', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_11_02'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'AIRWAY_BILL'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '11.02'
WHERE r.rule_code = 'MX-11-02'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 4, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_4', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_11_02'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'SHIPPING_BILL'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '11.02'
WHERE r.rule_code = 'MX-11-02'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_4' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 5, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_5', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_11_02'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'PO_FOR_MATERIAL_BEING_IMPORTED'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '11.02'
WHERE r.rule_code = 'MX-11-02'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_5' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 6, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_6', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_11_02'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'SURAT_PERSETUJUAN_PENGELUARAN_BARANG_SPPB'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '11.02'
WHERE r.rule_code = 'MX-11-02'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_6' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-11-03', 'Consignee Name', '11.03', NULL, NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-11-03');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-11-03' AND c.category_code = 'IMPORT_LOGISTICS'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_11_03'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'PACKING_LIST'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '11.03'
WHERE r.rule_code = 'MX-11-03'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_11_03'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'AIRWAY_BILL'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '11.03'
WHERE r.rule_code = 'MX-11-03'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_3', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_11_03'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'SHIPPING_BILL'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '11.03'
WHERE r.rule_code = 'MX-11-03'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 4, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_4', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_11_03'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'PO_FOR_MATERIAL_BEING_IMPORTED'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '11.03'
WHERE r.rule_code = 'MX-11-03'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_4' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 5, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_5', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_11_03'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'PEMBERITAHUAN_IMPOR_BARANG_PIB'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '11.03'
WHERE r.rule_code = 'MX-11-03'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_5' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 6, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_6', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_11_03'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'SURAT_PERSETUJUAN_PENGELUARAN_BARANG_SPPB'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '11.03'
WHERE r.rule_code = 'MX-11-03'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_6' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-11-04', 'PIB', '11.04', NULL, 'handler_key unmapped: the matrix names the type and does not give an executable formula or handler.', 'HEADER', 'CALCULATION', 'EQUALS', 'unmapped', NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-11-04');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-11-04' AND c.category_code = 'IMPORT_LOGISTICS'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_11_04'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'PO_FOR_MATERIAL_BEING_IMPORTED'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '11.04'
WHERE r.rule_code = 'MX-11-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_11_04'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'PEMBERITAHUAN_IMPOR_BARANG_PIB'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '11.04'
WHERE r.rule_code = 'MX-11-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_3', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_11_04'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'SURAT_PERSETUJUAN_PENGELUARAN_BARANG_SPPB'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '11.04'
WHERE r.rule_code = 'MX-11-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-11-05', 'Forwarder Name', '11.05', NULL, NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-11-05');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-11-05' AND c.category_code = 'IMPORT_LOGISTICS'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_11_05'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '11.05'
WHERE r.rule_code = 'MX-11-05'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_11_05'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'SURAT_PERSETUJUAN_PENGELUARAN_BARANG_SPPB'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '11.05'
WHERE r.rule_code = 'MX-11-05'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-12-01', 'Delivery Date', '12.01', NULL, NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-12-01');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-12-01' AND c.category_code = 'DOMESTIC_LOGISTIC'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_12_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '12.01'
WHERE r.rule_code = 'MX-12-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_12_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'DELIVERY_ORDER_SURAT_JALAN'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '12.01'
WHERE r.rule_code = 'MX-12-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-12-02', 'Delivery confirmation', '12.02', NULL, 'handler_key unmapped: the matrix names the type and does not give an executable formula or handler.', 'AUTHENTICITY', 'AUTHENTICITY', 'EQUALS', 'unmapped', NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-12-02');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-12-02' AND c.category_code = 'DOMESTIC_LOGISTIC'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_12_02'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'PHOTO_EVIDENCE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '12.02'
WHERE r.rule_code = 'MX-12-02'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_12_02'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'DELIVERY_ORDER_SURAT_JALAN'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '12.02'
WHERE r.rule_code = 'MX-12-02'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_3', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_12_02'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'MATERIAL_LISTS'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '12.02'
WHERE r.rule_code = 'MX-12-02'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-12-03', 'Item description', '12.03', 'ITEM-DESC', NULL, 'HEADER', 'LOGICAL_AI', 'EQUALS', NULL, (SELECT prompt_template_id FROM "PROMPT_TEMPLATE" WHERE template_key = 'matrix.logical.unspecified' AND template_version = 1), NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-12-03');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-12-03' AND c.category_code = 'DOMESTIC_LOGISTIC'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_12_03'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'DELIVERY_ORDER_SURAT_JALAN'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '12.03'
WHERE r.rule_code = 'MX-12-03'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_12_03'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'MATERIAL_LISTS'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '12.03'
WHERE r.rule_code = 'MX-12-03'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-12-04', 'PO number - Transported Goods', '12.04', NULL, NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-12-04');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-12-04' AND c.category_code = 'DOMESTIC_LOGISTIC'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'EAPA_DB', 'src', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_12_04'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_po'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_12_04'
WHERE r.rule_code = 'MX-12-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_12_04'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'DELIVERY_ORDER_SURAT_JALAN'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '12.04'
WHERE r.rule_code = 'MX-12-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_3', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_12_04'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'MATERIAL_LISTS'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '12.04'
WHERE r.rule_code = 'MX-12-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-13-01', 'Man-hours / Man-months', '13.01', 'TB-HOURS', NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-13-01');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-13-01' AND c.category_code = 'CONSULTANTS_TIME_BASED'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_13_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '13.01'
WHERE r.rule_code = 'MX-13-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'EAPA_DB', 'tgt_2', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_13_01'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_po'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_13_01'
WHERE r.rule_code = 'MX-13-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_3', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_13_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'CONTRACT_ENGAGEMENT_LETTER'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '13.01'
WHERE r.rule_code = 'MX-13-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 4, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_4', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_13_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'TIMESHEET'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '13.01'
WHERE r.rule_code = 'MX-13-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_4' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-13-02', 'Unit Price', '13.02', 'TB-RATE', NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-13-02');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-13-02' AND c.category_code = 'CONSULTANTS_TIME_BASED'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_13_02'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '13.02'
WHERE r.rule_code = 'MX-13-02'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'EAPA_DB', 'tgt_2', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_13_02'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_po'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_13_02'
WHERE r.rule_code = 'MX-13-02'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_3', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_13_02'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'CONTRACT_ENGAGEMENT_LETTER'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '13.02'
WHERE r.rule_code = 'MX-13-02'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-13-03', 'Terms & Conditions', '13.03', NULL, NULL, 'HEADER', 'LOGICAL_AI', 'EQUALS', NULL, (SELECT prompt_template_id FROM "PROMPT_TEMPLATE" WHERE template_key = 'matrix.logical.unspecified' AND template_version = 1), NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-13-03');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-13-03' AND c.category_code = 'CONSULTANTS_TIME_BASED'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'EAPA_DB', 'src', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_13_03'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_po'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_13_03'
WHERE r.rule_code = 'MX-13-03'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_13_03'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'CONTRACT_ENGAGEMENT_LETTER'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '13.03'
WHERE r.rule_code = 'MX-13-03'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-13-04', 'Contract deliverables', '13.04', NULL, NULL, 'HEADER', 'LOGICAL_AI', 'EQUALS', NULL, (SELECT prompt_template_id FROM "PROMPT_TEMPLATE" WHERE template_key = 'matrix.logical.unspecified' AND template_version = 1), NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-13-04');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-13-04' AND c.category_code = 'CONSULTANTS_TIME_BASED'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'EAPA_DB', 'src', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_13_04'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_po'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_13_04'
WHERE r.rule_code = 'MX-13-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_13_04'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'CONTRACT_ENGAGEMENT_LETTER'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '13.04'
WHERE r.rule_code = 'MX-13-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_3', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_13_04'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'DELIVERABLE_AS_PER_CONTRACT'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '13.04'
WHERE r.rule_code = 'MX-13-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-14-01', 'Terms, Conditions and Milestones', '14.01', NULL, NULL, 'HEADER', 'LOGICAL_AI', 'EQUALS', NULL, (SELECT prompt_template_id FROM "PROMPT_TEMPLATE" WHERE template_key = 'matrix.logical.unspecified' AND template_version = 1), NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-14-01');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-14-01' AND c.category_code = 'CONSULTANTS_MILESTONE'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_14_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '14.01'
WHERE r.rule_code = 'MX-14-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'EAPA_DB', 'tgt_2', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_14_01'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_po'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_14_01'
WHERE r.rule_code = 'MX-14-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_3', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_14_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'CONTRACT_ENGAGEMENT_LETTER'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '14.01'
WHERE r.rule_code = 'MX-14-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 4, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_4', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_14_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'DELIVERABLE_AS_PER_CONTRACT'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '14.01'
WHERE r.rule_code = 'MX-14-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_4' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 5, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_5', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_14_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'CERTIFICATION_AND_PROOF_OF_COMPLETION_OF_MILESTONE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '14.01'
WHERE r.rule_code = 'MX-14-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_5' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-15-01', 'Man-hours / Man-months', '15.01', 'TB-HOURS', NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-15-01');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-15-01' AND c.category_code = 'MEDICAL_SERVICES'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_15_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '15.01'
WHERE r.rule_code = 'MX-15-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'EAPA_DB', 'tgt_2', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_15_01'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_po'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_15_01'
WHERE r.rule_code = 'MX-15-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_3', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_15_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'CONTRACT_ENGAGEMENT_LETTER'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '15.01'
WHERE r.rule_code = 'MX-15-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 4, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_4', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_15_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'TIMESHEET'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '15.01'
WHERE r.rule_code = 'MX-15-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_4' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-15-02', 'Unit Price', '15.02', 'TB-RATE', NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-15-02');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-15-02' AND c.category_code = 'MEDICAL_SERVICES'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_15_02'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '15.02'
WHERE r.rule_code = 'MX-15-02'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'EAPA_DB', 'tgt_2', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_15_02'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_po'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_15_02'
WHERE r.rule_code = 'MX-15-02'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_3', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_15_02'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'CONTRACT_ENGAGEMENT_LETTER'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '15.02'
WHERE r.rule_code = 'MX-15-02'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-15-03', 'Equipment Hours / Months', '15.03', NULL, NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-15-03');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-15-03' AND c.category_code = 'MEDICAL_SERVICES'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_15_03'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '15.03'
WHERE r.rule_code = 'MX-15-03'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'EAPA_DB', 'tgt_2', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_15_03'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_po'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_15_03'
WHERE r.rule_code = 'MX-15-03'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_3', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_15_03'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'CONTRACT_ENGAGEMENT_LETTER'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '15.03'
WHERE r.rule_code = 'MX-15-03'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 4, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_4', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_15_03'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'TIMESHEET'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '15.03'
WHERE r.rule_code = 'MX-15-03'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_4' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-15-04', 'Equipment Unit Price', '15.04', NULL, NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-15-04');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-15-04' AND c.category_code = 'MEDICAL_SERVICES'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_15_04'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '15.04'
WHERE r.rule_code = 'MX-15-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'EAPA_DB', 'tgt_2', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_15_04'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_po'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_15_04'
WHERE r.rule_code = 'MX-15-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_3', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_15_04'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'CONTRACT_ENGAGEMENT_LETTER'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '15.04'
WHERE r.rule_code = 'MX-15-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-16-01', 'Inspection Report quantity', '16.01', NULL, NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-16-01');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-16-01' AND c.category_code = 'SURVEILLANCE_AND_INSPECTION'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_16_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INVOICE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '16.01'
WHERE r.rule_code = 'MX-16-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_16_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'INSPECTION_REPORT_CERTIFICATE_INCL_QUANTITY_CERTIF'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '16.01'
WHERE r.rule_code = 'MX-16-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-16-02', 'SLA confirmation', '16.02', 'SLA-CONF', NULL, 'HEADER', 'LOGICAL_AI', 'EQUALS', NULL, (SELECT prompt_template_id FROM "PROMPT_TEMPLATE" WHERE template_key = 'matrix.logical.unspecified' AND template_version = 1), NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-16-02');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-16-02' AND c.category_code = 'SURVEILLANCE_AND_INSPECTION'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'EAPA_DB', 'src', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_16_02'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_po'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_16_02'
WHERE r.rule_code = 'MX-16-02'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_16_02'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'SLA_CONFIRMATION_REPORT'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '16.02'
WHERE r.rule_code = 'MX-16-02'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-17-01', 'DOA approval', '17.01', NULL, 'handler_key unmapped: the matrix names the type and does not give an executable formula or handler.', 'AUTHENTICITY', 'AUTHENTICITY', 'EQUALS', 'unmapped', NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-17-01');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-17-01' AND c.category_code = 'TELECOM_AND_INTERNET_SERVICES'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_17_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'BILLING_STATEMENTS'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '17.01'
WHERE r.rule_code = 'MX-17-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_17_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'MANAGEMENT_OR_FUNCTIONAL_APPROVAL_AS_PER_DOA'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '17.01'
WHERE r.rule_code = 'MX-17-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-17-02', 'SLA confirmation', '17.02', 'SLA-CONF', NULL, 'HEADER', 'LOGICAL_AI', 'EQUALS', NULL, (SELECT prompt_template_id FROM "PROMPT_TEMPLATE" WHERE template_key = 'matrix.logical.unspecified' AND template_version = 1), NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-17-02');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-17-02' AND c.category_code = 'TELECOM_AND_INTERNET_SERVICES'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_17_02'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'CONTRACT_ENGAGEMENT_LETTER'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '17.02'
WHERE r.rule_code = 'MX-17-02'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_17_02'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'SLA_CONFIRMATION_REPORT'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '17.02'
WHERE r.rule_code = 'MX-17-02'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-18-01', 'Settlement Amount', '18.01', 'NPO-SETTLE', 'handler_key unmapped: the matrix names the type and does not give an executable formula or handler.', 'HEADER', 'CALCULATION', 'EQUALS', 'unmapped', NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-18-01');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-18-01' AND c.category_code = 'CSR_EXTERNAL_RELATION'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_18_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '18.01'
WHERE r.rule_code = 'MX-18-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_18_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'BANK_TRANSFER_PROOF_CASH_ADVANCE_RECON'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '18.01'
WHERE r.rule_code = 'MX-18-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_3', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_18_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'REFUND_SLIP_FOR_UNUSED_ADVANCE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '18.01'
WHERE r.rule_code = 'MX-18-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 4, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_4', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_18_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'VALID_INVOICES_RECEIPTS_TAX_DOCUMENTS'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '18.01'
WHERE r.rule_code = 'MX-18-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_4' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-18-02', 'Beneficiary Name', '18.02', NULL, NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-18-02');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-18-02' AND c.category_code = 'CSR_EXTERNAL_RELATION'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_18_02'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '18.02'
WHERE r.rule_code = 'MX-18-02'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_18_02'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'BANK_TRANSFER_PROOF_CASH_ADVANCE_RECON'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '18.02'
WHERE r.rule_code = 'MX-18-02'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_3', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_18_02'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'COPY_OF_AGENDA_OR_MOU'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '18.02'
WHERE r.rule_code = 'MX-18-02'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-18-03', 'Payment Amount', '18.03', 'NPO-PAY', NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-18-03');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-18-03' AND c.category_code = 'CSR_EXTERNAL_RELATION'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_18_03'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '18.03'
WHERE r.rule_code = 'MX-18-03'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_18_03'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'BANK_TRANSFER_PROOF_CASH_ADVANCE_RECON'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '18.03'
WHERE r.rule_code = 'MX-18-03'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_3', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_18_03'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'VALID_INVOICES_RECEIPTS_TAX_DOCUMENTS'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '18.03'
WHERE r.rule_code = 'MX-18-03'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-18-04', 'Guest Name', '18.04', 'NPO-GUEST', 'handler_key unmapped: the matrix names the type and does not give an executable formula or handler.', 'AUTHENTICITY', 'AUTHENTICITY', 'EQUALS', 'unmapped', NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-18-04');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-18-04' AND c.category_code = 'CSR_EXTERNAL_RELATION'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_18_04'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'PHOTO_EVIDENCE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '18.04'
WHERE r.rule_code = 'MX-18-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_18_04'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '18.04'
WHERE r.rule_code = 'MX-18-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_3', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_18_04'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'GUEST_LIST_IF_APPLICABLE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '18.04'
WHERE r.rule_code = 'MX-18-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-18-05', 'WHT Amount (if applicable)', '18.05', 'NPO-WHT', NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-18-05');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-18-05' AND c.category_code = 'CSR_EXTERNAL_RELATION'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_18_05'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '18.05'
WHERE r.rule_code = 'MX-18-05'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_18_05'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'VALID_INVOICES_RECEIPTS_TAX_DOCUMENTS'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '18.05'
WHERE r.rule_code = 'MX-18-05'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-18-06', 'MOU', '18.06', NULL, 'handler_key unmapped: the matrix names the type and does not give an executable formula or handler.', 'AUTHENTICITY', 'AUTHENTICITY', 'EQUALS', 'unmapped', NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-18-06');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-18-06' AND c.category_code = 'CSR_EXTERNAL_RELATION'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_18_06'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'PHOTO_EVIDENCE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '18.06'
WHERE r.rule_code = 'MX-18-06'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_18_06'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'COPY_OF_AGENDA_OR_MOU'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '18.06'
WHERE r.rule_code = 'MX-18-06'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-19-01', 'Settlement Amount', '19.01', 'NPO-SETTLE', 'handler_key unmapped: the matrix names the type and does not give an executable formula or handler.', 'HEADER', 'CALCULATION', 'EQUALS', 'unmapped', NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-19-01');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-19-01' AND c.category_code = 'CORPORATE_CREDIT_CARD'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_19_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '19.01'
WHERE r.rule_code = 'MX-19-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_19_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'EXPENSE_REPORT_ADVANCE_SETTLEMENT_FORM'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '19.01'
WHERE r.rule_code = 'MX-19-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_3', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_19_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'VALID_INVOICES_RECEIPTS_TAX_DOCUMENTS'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '19.01'
WHERE r.rule_code = 'MX-19-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-19-02', 'Payment Amount', '19.02', 'NPO-PAY', NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-19-02');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-19-02' AND c.category_code = 'CORPORATE_CREDIT_CARD'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_19_02'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '19.02'
WHERE r.rule_code = 'MX-19-02'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_19_02'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'EXPENSE_REPORT_ADVANCE_SETTLEMENT_FORM'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '19.02'
WHERE r.rule_code = 'MX-19-02'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_3', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_19_02'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'VALID_INVOICES_RECEIPTS_TAX_DOCUMENTS'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '19.02'
WHERE r.rule_code = 'MX-19-02'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-19-04', 'Merchant Name', '19.04', NULL, NULL, 'HEADER', 'LOGICAL_AI', 'EQUALS', NULL, (SELECT prompt_template_id FROM "PROMPT_TEMPLATE" WHERE template_key = 'matrix.logical.unspecified' AND template_version = 1), NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-19-04');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-19-04' AND c.category_code = 'CORPORATE_CREDIT_CARD'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_19_04'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'EXPENSE_REPORT_ADVANCE_SETTLEMENT_FORM'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '19.04'
WHERE r.rule_code = 'MX-19-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_19_04'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'VALID_INVOICES_RECEIPTS_TAX_DOCUMENTS'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '19.04'
WHERE r.rule_code = 'MX-19-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-19-05', 'Internal Order Number', '19.05', 'NPO-IO', NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-19-05');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-19-05' AND c.category_code = 'CORPORATE_CREDIT_CARD'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_19_05'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '19.05'
WHERE r.rule_code = 'MX-19-05'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'EAPA_DB', 'tgt_2', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_19_05'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_internal_order'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_19_05'
WHERE r.rule_code = 'MX-19-05'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-19-06', 'WHT Amount (if applicable)', '19.06', 'NPO-WHT', NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-19-06');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-19-06' AND c.category_code = 'CORPORATE_CREDIT_CARD'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_19_06'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '19.06'
WHERE r.rule_code = 'MX-19-06'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_19_06'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'VALID_INVOICES_RECEIPTS_TAX_DOCUMENTS'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '19.06'
WHERE r.rule_code = 'MX-19-06'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-19-07', 'PO Number (If applicable)', '19.07', 'NPO-PO', NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-19-07');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-19-07' AND c.category_code = 'CORPORATE_CREDIT_CARD'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'EAPA_DB', 'src', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_19_07'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_po'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_19_07'
WHERE r.rule_code = 'MX-19-07'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_19_07'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'EXPENSE_REPORT_ADVANCE_SETTLEMENT_FORM'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '19.07'
WHERE r.rule_code = 'MX-19-07'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-20-01', 'Settlement Amount', '20.01', 'NPO-SETTLE', 'handler_key unmapped: the matrix names the type and does not give an executable formula or handler.', 'HEADER', 'CALCULATION', 'EQUALS', 'unmapped', NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-20-01');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-20-01' AND c.category_code = 'MISC_BUSINESS_EXPENSES'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_20_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '20.01'
WHERE r.rule_code = 'MX-20-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_20_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'VALID_INVOICES_RECEIPTS_TAX_DOCUMENTS'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '20.01'
WHERE r.rule_code = 'MX-20-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-20-02', 'Payment Amount', '20.02', 'NPO-PAY', NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-20-02');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-20-02' AND c.category_code = 'MISC_BUSINESS_EXPENSES'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_20_02'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '20.02'
WHERE r.rule_code = 'MX-20-02'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_20_02'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'VALID_INVOICES_RECEIPTS_TAX_DOCUMENTS'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '20.02'
WHERE r.rule_code = 'MX-20-02'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-20-03', 'Internal Order Number', '20.03', 'NPO-IO', NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-20-03');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-20-03' AND c.category_code = 'MISC_BUSINESS_EXPENSES'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_20_03'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '20.03'
WHERE r.rule_code = 'MX-20-03'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'EAPA_DB', 'tgt_2', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_20_03'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_internal_order'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_20_03'
WHERE r.rule_code = 'MX-20-03'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-20-04', 'Vendor Name', '20.04', 'NPO-VENDOR', NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-20-04');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-20-04' AND c.category_code = 'MISC_BUSINESS_EXPENSES'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'EAPA_DB', 'src', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_20_04'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_vendor_master_data'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_20_04'
WHERE r.rule_code = 'MX-20-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_20_04'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '20.04'
WHERE r.rule_code = 'MX-20-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_3', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_20_04'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'VALID_INVOICES_RECEIPTS_TAX_DOCUMENTS'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '20.04'
WHERE r.rule_code = 'MX-20-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-20-05', 'WHT Amount (if applicable)', '20.05', 'NPO-WHT', NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-20-05');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-20-05' AND c.category_code = 'MISC_BUSINESS_EXPENSES'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_20_05'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '20.05'
WHERE r.rule_code = 'MX-20-05'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_20_05'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'VALID_INVOICES_RECEIPTS_TAX_DOCUMENTS'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '20.05'
WHERE r.rule_code = 'MX-20-05'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-21-01', 'Settlement Amount', '21.01', 'NPO-SETTLE', 'handler_key unmapped: the matrix names the type and does not give an executable formula or handler.', 'HEADER', 'CALCULATION', 'EQUALS', 'unmapped', NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-21-01');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-21-01' AND c.category_code = 'EVENTS_AND_CELEBRATIONS'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_21_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '21.01'
WHERE r.rule_code = 'MX-21-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_21_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'VALID_INVOICES_RECEIPTS_TAX_DOCUMENTS'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '21.01'
WHERE r.rule_code = 'MX-21-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-21-02', 'Payment Amount', '21.02', 'NPO-PAY', NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-21-02');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-21-02' AND c.category_code = 'EVENTS_AND_CELEBRATIONS'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_21_02'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '21.02'
WHERE r.rule_code = 'MX-21-02'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_21_02'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'VALID_INVOICES_RECEIPTS_TAX_DOCUMENTS'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '21.02'
WHERE r.rule_code = 'MX-21-02'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-21-03', 'Internal Order Number', '21.03', 'NPO-IO', NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-21-03');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-21-03' AND c.category_code = 'EVENTS_AND_CELEBRATIONS'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_21_03'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '21.03'
WHERE r.rule_code = 'MX-21-03'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'EAPA_DB', 'tgt_2', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_21_03'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_internal_order'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_21_03'
WHERE r.rule_code = 'MX-21-03'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-21-04', 'Guest Name', '21.04', 'NPO-GUEST', 'handler_key unmapped: the matrix names the type and does not give an executable formula or handler.', 'AUTHENTICITY', 'AUTHENTICITY', 'EQUALS', 'unmapped', NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-21-04');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-21-04' AND c.category_code = 'EVENTS_AND_CELEBRATIONS'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_21_04'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '21.04'
WHERE r.rule_code = 'MX-21-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_21_04'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'GUEST_LIST_IF_APPLICABLE'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '21.04'
WHERE r.rule_code = 'MX-21-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-21-05', 'Vendor Name', '21.05', 'NPO-VENDOR', NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-21-05');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-21-05' AND c.category_code = 'EVENTS_AND_CELEBRATIONS'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'EAPA_DB', 'src', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_21_05'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_vendor_master_data'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_21_05'
WHERE r.rule_code = 'MX-21-05'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_21_05'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '21.05'
WHERE r.rule_code = 'MX-21-05'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_3', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_21_05'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'VALID_INVOICES_RECEIPTS_TAX_DOCUMENTS'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '21.05'
WHERE r.rule_code = 'MX-21-05'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-21-06', 'PO Number (If applicable)', '21.06', 'NPO-PO', NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-21-06');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-21-06' AND c.category_code = 'EVENTS_AND_CELEBRATIONS'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'EAPA_DB', 'src', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_21_06'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_po'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_21_06'
WHERE r.rule_code = 'MX-21-06'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_21_06'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '21.06'
WHERE r.rule_code = 'MX-21-06'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-21-07', 'WHT Amount (if applicable)', '21.07', 'NPO-WHT', NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-21-07');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-21-07' AND c.category_code = 'EVENTS_AND_CELEBRATIONS'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_21_07'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '21.07'
WHERE r.rule_code = 'MX-21-07'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_21_07'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'VALID_INVOICES_RECEIPTS_TAX_DOCUMENTS'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '21.07'
WHERE r.rule_code = 'MX-21-07'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-22-01', 'Settlement Amount', '22.01', 'NPO-SETTLE', 'handler_key unmapped: the matrix names the type and does not give an executable formula or handler.', 'HEADER', 'CALCULATION', 'EQUALS', 'unmapped', NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-22-01');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-22-01' AND c.category_code = 'EMPLOYEE_SETTLEMENTS'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_22_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '22.01'
WHERE r.rule_code = 'MX-22-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_22_01'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'EXPENSE_REPORT_ADVANCE_SETTLEMENT_FORM'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '22.01'
WHERE r.rule_code = 'MX-22-01'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-22-02', 'Payment Amount', '22.02', 'NPO-PAY', NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-22-02');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-22-02' AND c.category_code = 'EMPLOYEE_SETTLEMENTS'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_22_02'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '22.02'
WHERE r.rule_code = 'MX-22-02'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_22_02'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'EXPENSE_REPORT_ADVANCE_SETTLEMENT_FORM'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '22.02'
WHERE r.rule_code = 'MX-22-02'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_3', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_22_02'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'VALID_INVOICES_RECEIPTS_TAX_DOCUMENTS'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '22.02'
WHERE r.rule_code = 'MX-22-02'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-22-03', 'Vendor Name', '22.03', 'NPO-VENDOR', NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-22-03');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-22-03' AND c.category_code = 'EMPLOYEE_SETTLEMENTS'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'EAPA_DB', 'src', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_22_03'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_vendor_master_data'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_22_03'
WHERE r.rule_code = 'MX-22-03'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_22_03'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'VALID_INVOICES_RECEIPTS_TAX_DOCUMENTS'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '22.03'
WHERE r.rule_code = 'MX-22-03'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-22-04', 'Internal Order Number', '22.04', 'NPO-IO', NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-22-04');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-22-04' AND c.category_code = 'EMPLOYEE_SETTLEMENTS'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_22_04'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '22.04'
WHERE r.rule_code = 'MX-22-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, reference_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'EAPA_DB', 'tgt_2', f.reference_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_22_04'
JOIN "REFERENCE_TABLE" t ON t.physical_name = 'matrix_internal_order'
JOIN "REFERENCE_FIELD" f ON f.reference_table_id = t.reference_table_id AND f.column_name = 'dp_22_04'
WHERE r.rule_code = 'MX-22-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 3, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_3', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_22_04'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'EXPENSE_REPORT_ADVANCE_SETTLEMENT_FORM'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '22.04'
WHERE r.rule_code = 'MX-22-04'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_3' AND o.invoice_category_id IS NULL);
INSERT INTO "VALIDATION_RULE" (
  applies_to_all_categories, rule_code, rule_name, matrix_ref, rule_template_code, description,
  rule_stage, rule_type, comparator, handler_key, prompt_template_id,
  tolerance_pct, tolerance_amount, tolerance_currency,
  on_fail_block, on_fail_raise_exception, severity, failure_action,
  spec_status, is_active, created_by)
SELECT FALSE, 'MX-22-05', 'WHT Amount (if applicable)', '22.05', 'NPO-WHT', NULL, 'HEADER', 'EXACT', 'EQUALS', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 'ERROR', NULL, 'DRAFT', FALSE, 'matrix-seed'
WHERE NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE" WHERE rule_code = 'MX-22-05');
INSERT INTO "VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
SELECT r.validation_rule_id, c.invoice_category_id, 'INCLUDE'
FROM "VALIDATION_RULE" r, "VAL_INVOICE_CATEGORY" c
WHERE r.rule_code = 'MX-22-05' AND c.category_code = 'EMPLOYEE_SETTLEMENTS'
  AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x WHERE x.validation_rule_id = r.validation_rule_id AND x.invoice_category_id = c.invoice_category_id);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 1, 'SOURCE', 'BUNDLE_DOCUMENT', 'src', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_22_05'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '22.05'
WHERE r.rule_code = 'MX-22-05'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'src' AND o.invoice_category_id IS NULL);
INSERT INTO "RULE_OPERAND" (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, match_method)
SELECT r.validation_rule_id, 2, 'TARGET', 'BUNDLE_DOCUMENT', 'tgt_2', f.bundle_document_field_id, 'EXACT'
FROM "VALIDATION_RULE" r
JOIN "DATA_POINT" p ON p.data_point_code = 'DP_22_05'
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = 'VALID_INVOICES_RECEIPTS_TAX_DOCUMENTS'
JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.data_point_id = p.data_point_id AND f.bundle_document_type_id = d.bundle_document_type_id AND f.matrix_ref = '22.05'
WHERE r.rule_code = 'MX-22-05'
  AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o WHERE o.validation_rule_id = r.validation_rule_id AND o.operand_alias = 'tgt_2' AND o.invoice_category_id IS NULL);

-- TODO(matrix): 1.27 shows 1%. The 4 Sep 2026 note says that percent is a placeholder.
INSERT INTO "RULE_PARAMETER" (validation_rule_id, param_key, param_value, is_placeholder)
SELECT r.validation_rule_id, 'FX_TOLERANCE_PCT', '1'::jsonb, TRUE
FROM "VALIDATION_RULE" r
WHERE r.rule_code = 'MX-1-27'
  AND NOT EXISTS (SELECT 1 FROM "RULE_PARAMETER" p WHERE p.validation_rule_id = r.validation_rule_id AND p.param_key = 'FX_TOLERANCE_PCT' AND p.effective_from = DATE '1900-01-01');

-- Document Completeness: R stays UNRESOLVED. Blank means the document is not expected.
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 1
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'MATERIAL' AND d.document_code = 'INVOICE'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 1
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'MANPOWER_OUTSOURCING' AND d.document_code = 'INVOICE'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 1
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'CATERING' AND d.document_code = 'INVOICE'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 1
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'HOUSEKEEPING' AND d.document_code = 'INVOICE'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 1
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'RENTAL_EQUIPMENT' AND d.document_code = 'INVOICE'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 1
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'CIVIL_WORKS_CONSTRUCTION' AND d.document_code = 'INVOICE'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 1
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'PIB' AND d.document_code = 'INVOICE'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 1
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'TRAVEL_NON_PO' AND d.document_code = 'INVOICE'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 1
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'HOTEL_NON_PO' AND d.document_code = 'INVOICE'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 1
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'IMPORT_LOGISTICS' AND d.document_code = 'INVOICE'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 1
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'DOMESTIC_LOGISTIC' AND d.document_code = 'INVOICE'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 1
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'CONSULTANTS_TIME_BASED' AND d.document_code = 'INVOICE'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 1
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'CONSULTANTS_MILESTONE' AND d.document_code = 'INVOICE'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 1
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'MEDICAL_SERVICES' AND d.document_code = 'INVOICE'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 1
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'SURVEILLANCE_AND_INSPECTION' AND d.document_code = 'INVOICE'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 4
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'RENTAL_EQUIPMENT' AND d.document_code = 'FAKTUR_PAJAK'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 4
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'TRAVEL_NON_PO' AND d.document_code = 'FAKTUR_PAJAK'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 4
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'IMPORT_LOGISTICS' AND d.document_code = 'FAKTUR_PAJAK'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 8
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'MATERIAL' AND d.document_code = 'DELIVERY_NOTE'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 9
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'MATERIAL' AND d.document_code = 'PACKING_LIST'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 9
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'PIB' AND d.document_code = 'PACKING_LIST'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 9
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'IMPORT_LOGISTICS' AND d.document_code = 'PACKING_LIST'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 10
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'MATERIAL' AND d.document_code = 'AIRWAY_BILL'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 10
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'PIB' AND d.document_code = 'AIRWAY_BILL'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 10
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'IMPORT_LOGISTICS' AND d.document_code = 'AIRWAY_BILL'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 11
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'MATERIAL' AND d.document_code = 'SHIPPING_BILL'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 11
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'PIB' AND d.document_code = 'SHIPPING_BILL'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 11
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'IMPORT_LOGISTICS' AND d.document_code = 'SHIPPING_BILL'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 12
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'MATERIAL' AND d.document_code = 'BANK_GUARANTEE_BOND_WARRANTY_LETTER'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 15
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'MATERIAL' AND d.document_code = 'CONTRACT_ENGAGEMENT_LETTER'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 15
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'MANPOWER_OUTSOURCING' AND d.document_code = 'CONTRACT_ENGAGEMENT_LETTER'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 15
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'RENTAL_EQUIPMENT' AND d.document_code = 'CONTRACT_ENGAGEMENT_LETTER'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 15
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'CONSULTANTS_TIME_BASED' AND d.document_code = 'CONTRACT_ENGAGEMENT_LETTER'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 15
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'CONSULTANTS_MILESTONE' AND d.document_code = 'CONTRACT_ENGAGEMENT_LETTER'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 15
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'MEDICAL_SERVICES' AND d.document_code = 'CONTRACT_ENGAGEMENT_LETTER'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 15
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'TELECOM_AND_INTERNET_SERVICES' AND d.document_code = 'CONTRACT_ENGAGEMENT_LETTER'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 16
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'MANPOWER_OUTSOURCING' AND d.document_code = 'WORK_PROGRESS_CERTIFICATE_BAST'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 17
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'MANPOWER_OUTSOURCING' AND d.document_code = 'TIMESHEET'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 17
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'CATERING' AND d.document_code = 'TIMESHEET'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 17
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'RENTAL_EQUIPMENT' AND d.document_code = 'TIMESHEET'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 17
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'CONSULTANTS_TIME_BASED' AND d.document_code = 'TIMESHEET'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 17
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'MEDICAL_SERVICES' AND d.document_code = 'TIMESHEET'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 18
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'MANPOWER_OUTSOURCING' AND d.document_code = 'MANPOWER_SUMMARY'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 18
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'RENTAL_EQUIPMENT' AND d.document_code = 'MANPOWER_SUMMARY'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 20
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'MANPOWER_OUTSOURCING' AND d.document_code = 'OVERTIME_APPROVAL'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 21
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'CATERING' AND d.document_code = 'MEAL_ATTENDANCE_AT_CANTEEN_ALL_MEAL_TYPES'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 22
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'CATERING' AND d.document_code = 'RECAPITULATION_BACK_CHARGE_SNACKS_SPECIAL_LUNCH_DI'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 23
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'CATERING' AND d.document_code = 'OTHER_REIMBURSEMENT_CATERING'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 24
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'HOUSEKEEPING' AND d.document_code = 'COST_PER_ACCOMMODATION_REPORT'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 25
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'CIVIL_WORKS_CONSTRUCTION' AND d.document_code = 'MEASUREMENTS_BILL_OF_QUANTITY'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 26
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'CIVIL_WORKS_CONSTRUCTION' AND d.document_code = 'INSPECTION_REPORT_CERTIFICATE_INCL_QUANTITY_CERTIF'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 26
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'SURVEILLANCE_AND_INSPECTION' AND d.document_code = 'INSPECTION_REPORT_CERTIFICATE_INCL_QUANTITY_CERTIF'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 27
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'CIVIL_WORKS_CONSTRUCTION' AND d.document_code = 'PHOTO_EVIDENCE'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 27
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'DOMESTIC_LOGISTIC' AND d.document_code = 'PHOTO_EVIDENCE'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 27
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'CSR_EXTERNAL_RELATION' AND d.document_code = 'PHOTO_EVIDENCE'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 29
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'CIVIL_WORKS_CONSTRUCTION' AND d.document_code = 'SIUJK_PERMIT'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 30
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'TRAVEL_NON_PO' AND d.document_code = 'BILLING_SUMMARY'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 30
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'HOTEL_NON_PO' AND d.document_code = 'BILLING_SUMMARY'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 32
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'HOTEL_NON_PO' AND d.document_code = 'GUARANTEE_LETTER'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 33
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'HOTEL_NON_PO' AND d.document_code = 'ROOM_RESERVATION_FORM'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 34
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'PIB' AND d.document_code = 'PO_FOR_MATERIAL_BEING_IMPORTED'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 34
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'IMPORT_LOGISTICS' AND d.document_code = 'PO_FOR_MATERIAL_BEING_IMPORTED'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 35
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'PIB' AND d.document_code = 'PEMBERITAHUAN_IMPOR_BARANG_PIB'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 35
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'IMPORT_LOGISTICS' AND d.document_code = 'PEMBERITAHUAN_IMPOR_BARANG_PIB'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 36
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'IMPORT_LOGISTICS' AND d.document_code = 'SURAT_PERSETUJUAN_PENGELUARAN_BARANG_SPPB'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 37
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'DOMESTIC_LOGISTIC' AND d.document_code = 'DELIVERY_ORDER_SURAT_JALAN'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 38
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'DOMESTIC_LOGISTIC' AND d.document_code = 'MATERIAL_LISTS'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 39
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'CONSULTANTS_TIME_BASED' AND d.document_code = 'DELIVERABLE_AS_PER_CONTRACT'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 39
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'CONSULTANTS_MILESTONE' AND d.document_code = 'DELIVERABLE_AS_PER_CONTRACT'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 40
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'CONSULTANTS_MILESTONE' AND d.document_code = 'CERTIFICATION_AND_PROOF_OF_COMPLETION_OF_MILESTONE'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 41
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'SURVEILLANCE_AND_INSPECTION' AND d.document_code = 'SLA_CONFIRMATION_REPORT'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 41
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'TELECOM_AND_INTERNET_SERVICES' AND d.document_code = 'SLA_CONFIRMATION_REPORT'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 42
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'TELECOM_AND_INTERNET_SERVICES' AND d.document_code = 'BILLING_STATEMENTS'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 43
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'PIB' AND d.document_code = 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 43
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'CSR_EXTERNAL_RELATION' AND d.document_code = 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 43
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'CORPORATE_CREDIT_CARD' AND d.document_code = 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 43
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'MISC_BUSINESS_EXPENSES' AND d.document_code = 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 43
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'EVENTS_AND_CELEBRATIONS' AND d.document_code = 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 43
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'EMPLOYEE_SETTLEMENTS' AND d.document_code = 'APPROVED_SETTLEMENT_FORM_AS_PER_DOA'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 44
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'CSR_EXTERNAL_RELATION' AND d.document_code = 'BANK_TRANSFER_PROOF_CASH_ADVANCE_RECON'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 45
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'CSR_EXTERNAL_RELATION' AND d.document_code = 'REFUND_SLIP_FOR_UNUSED_ADVANCE'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 46
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'CSR_EXTERNAL_RELATION' AND d.document_code = 'GUEST_LIST_IF_APPLICABLE'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 46
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'EVENTS_AND_CELEBRATIONS' AND d.document_code = 'GUEST_LIST_IF_APPLICABLE'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 47
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'CSR_EXTERNAL_RELATION' AND d.document_code = 'COPY_OF_AGENDA_OR_MOU'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 49
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'CORPORATE_CREDIT_CARD' AND d.document_code = 'EXPENSE_REPORT_ADVANCE_SETTLEMENT_FORM'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 49
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'EMPLOYEE_SETTLEMENTS' AND d.document_code = 'EXPENSE_REPORT_ADVANCE_SETTLEMENT_FORM'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 50
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'CSR_EXTERNAL_RELATION' AND d.document_code = 'VALID_INVOICES_RECEIPTS_TAX_DOCUMENTS'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 50
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'CORPORATE_CREDIT_CARD' AND d.document_code = 'VALID_INVOICES_RECEIPTS_TAX_DOCUMENTS'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 50
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'MISC_BUSINESS_EXPENSES' AND d.document_code = 'VALID_INVOICES_RECEIPTS_TAX_DOCUMENTS'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 50
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'EVENTS_AND_CELEBRATIONS' AND d.document_code = 'VALID_INVOICES_RECEIPTS_TAX_DOCUMENTS'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 50
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'EMPLOYEE_SETTLEMENTS' AND d.document_code = 'VALID_INVOICES_RECEIPTS_TAX_DOCUMENTS'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 51
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'TRAVEL_NON_PO' AND d.document_code = 'BOOKING_CONFIRMATION'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 51
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'HOTEL_NON_PO' AND d.document_code = 'BOOKING_CONFIRMATION'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);
INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', 52
FROM "VAL_INVOICE_CATEGORY" c, "BUNDLE_DOCUMENT_TYPE" d
WHERE c.category_code = 'TELECOM_AND_INTERNET_SERVICES' AND d.document_code = 'MANAGEMENT_OR_FUNCTIONAL_APPROVAL_AS_PER_DOA'
  AND NOT EXISTS (SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b WHERE b.invoice_category_id = c.invoice_category_id AND b.bundle_document_type_id = d.bundle_document_type_id);

COMMIT;
