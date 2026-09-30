import { BaseController } from "./baseController";
import DashboardService from "../helpers/dashboard.service";
import VendorService from "../helpers/vendor.service";
import logger from "../utils/logger";

class DashboardController extends BaseController {
  async getVendorDashboard(req: any, res: any) {
    try {
      const vendorId = req?.user?.vendor_id;
      const vendorCode = req?.query?.vendor_code
        ? req?.query?.vendor_code
        : req?.user?.vendorCode;
      const entityId = req?.query?.entity_id;

      let outStandingPO,
        pendingInvoice,
        outstandingPayment,
        payableThisMonth,
        pendingReconsilation,
        pendingTicket,
        pieChart,
        bargraph;

      const getUser = await DashboardService.getUserForDashboard(
        req?.body,
        vendorId,
        entityId,
      );

      if (req?.user?.role_id == 1) {
        outStandingPO = await DashboardService.getPO(vendorId, entityId);

        pendingInvoice = await DashboardService.pendingInvoice(
          vendorId,
          entityId,
        );

        outstandingPayment = await DashboardService.pendingReconsilation(
          vendorCode,
          entityId,
        );

        payableThisMonth = await DashboardService.payableThisMonth(
          vendorCode,
          entityId,
        );

        pendingReconsilation = await DashboardService.mismatchedSOA(
          vendorCode,
          entityId,
        );

        pendingTicket = await DashboardService.pendingTicket(
          vendorId,
          entityId,
        );

        pieChart = await DashboardService.pieChart(vendorCode, entityId);

        bargraph = await DashboardService.bargraph(vendorId, entityId);
      } else if (req?.user?.role_id == 3) {
        const vendorIds = await VendorService.getVendorsId(
          req?.user?.emp_id,
          entityId,
        );

        outStandingPO = await DashboardService.getPOBusiness(
          vendorIds,
          entityId,
        );

        pendingInvoice = await DashboardService.pendingInvoiceBusiness(
          vendorIds,
          entityId,
        );

        outstandingPayment =
          await DashboardService.pendingReconsilationBusiness(
            vendorIds,
            entityId,
          );

        payableThisMonth = await DashboardService.payableThisMonthBusiness(
          vendorIds,
          entityId,
        );

        pendingReconsilation = await DashboardService.mismatchedSOABusiness(
          vendorIds,
          entityId,
        );

        pendingTicket = await DashboardService.pendingTicketForBusiness(
          vendorId,
          entityId,
          req?.user?.emp_id,
        );

        pieChart = await DashboardService.pieChartBusiness(vendorIds, entityId);

        bargraph = await DashboardService.bargraphBusiness(vendorIds, entityId);
      } else {
        outStandingPO = await DashboardService.getPOforAdmin(
          vendorId,
          entityId,
        );

        pendingInvoice = await DashboardService.pendingInvoiceforAdmin(
          vendorId,
          entityId,
        );

        outstandingPayment =
          await DashboardService.pendingReconsilationforAdmin(
            vendorCode,
            entityId,
          );

        payableThisMonth = await DashboardService.payableThisMonthforAdmin(
          vendorCode,
          entityId,
        );

        pendingReconsilation = await DashboardService.mismatchedSOAforAdmin(
          vendorCode,
          entityId,
        );

        pendingTicket = await DashboardService.pendingTicketforAdmin(
          vendorId,
          entityId,
        );

        pieChart = await DashboardService.pieChartforAdmin(
          vendorCode,
          entityId,
        );

        bargraph = await DashboardService.bargraphforAdmin(vendorId, entityId);
      }

      let dashboardData: any = {
        profile: getUser?.data,
        outStandingPO: {
          outstandCount: outStandingPO?.data?.outstandCount,
          currency: outStandingPO?.data?.currency,
          percentage: 35,
        },
        pendingInvoiceV2: pendingInvoice,
        pendingInvoice: {
          outstandCount: pendingInvoice?.data?.outstandCount,
          currency: pendingInvoice?.data?.currency,
          percentage: 23,
        },
        outstandingPayment: outstandingPayment?.data,
        payableThisMonth: payableThisMonth?.data,
        pendingReconsilation: pendingReconsilation?.data,
        pendingTicket: pendingTicket?.data,
        pieChart: pieChart?.data,
        barChart: bargraph?.data,
      };

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        dashboardData,
        "Enquiry created successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      return await this.errors(
        req,
        res,
        this.status.HTTP_INTERNAL_SERVER_ERROR,
        this.exceptions.internalServerErr(req, error),
      );
    }
  }

  async getnotification(req: any, res: any) {
    try {
      const userId = req?.user?.vendor_id;
      const entityId = req?.query?.entity_id;

      const getUser = await DashboardService.getUser(
        req?.body,
        userId,
        entityId,
      );

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        getUser?.data,
        "Enquiry created successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      return await this.errors(
        req,
        res,
        this.status.HTTP_INTERNAL_SERVER_ERROR,
        this.exceptions.internalServerErr(req, error),
      );
    }
  }
}

export default new DashboardController();
