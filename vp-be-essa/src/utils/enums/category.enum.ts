export enum InvoiceCategory {
  IR = 1,
  CR = 2,
}

export const categoryToDocType: Record<number, string> = {
  [InvoiceCategory.CR]: "CR",
  [InvoiceCategory.IR]: "IR",
};

export enum FileCategories {
  LicenceFile = 1,
  NationalLicenceFile = 2,
  PaymentFile = 9,
  VatFile = 3,
  Invoice = 4,
  AdvancePayments = 5,
  CreditNote = 6,
  vendorProfile = 7,
  Enquires = 8,
  Response = 10,
  NDAFILE = 11,
  BANKFILE = 12,
  LicenceFile_Onboard = 13,
  NationalLicenceFile_Onboard = 14,
  PaymentFile_Onboard = 15,
  VatFile_Onboard = 16,
  NDAFILE_Onboard = 17,
  BANKFILE_Onboard = 18,
}

export enum NotificationCategory {
  Vendor_Onboard = 1,
  Vendor_Profile = 2,
  Vendor_Update = 3,
  PO_Invoice = 4,
  Non_PO_Invoice = 5,
  Logistics_Invoice = 6,
  Credit_Note = 7,
  Advance_Payment = 8,
  SOA = 9,
  Enquiry = 10,
  Vendor_Entity = 11,
  Vendor_Application = 12,
}
