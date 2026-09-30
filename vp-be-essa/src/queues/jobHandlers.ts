import slaEngine from "../helpers/slaEngine.service";
import vendorService from "../helpers/vendor.service";
import InvoiceService from "../helpers/invoice.service";

export async function executeSlaTick() {
  await slaEngine.tick();
}

export async function executeVendorSync() {
  const approvedVendor = await vendorService.getApprovedVendorV1();
  await vendorService.UpdateDatasV1(approvedVendor);
  return approvedVendor;
}

export async function executeInvoiceApprovalMail() {
  const result = await InvoiceService.sendApprovalMail();
  await InvoiceService.sendRejectionMail();
  return result;
}
