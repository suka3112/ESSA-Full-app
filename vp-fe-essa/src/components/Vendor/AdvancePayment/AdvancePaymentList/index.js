import React, { useEffect, useState } from "react";
import helpIcon from "../../../../assets/icons/helpIcon.svg";
import styles from "./AdvancePayment.module.scss";
import { NormalButton } from "components/Common/NormalButton";
import addIcon from "../../../../assets/icons/addIconWhite.svg";
import emailReport from "../../../../assets/icons/emailReport.svg";
import download from "../../../../assets/icons/downloadIcon2.svg";
import { TableHeaderDropdown } from "components/Common/TableComponent/TableComponent.style";
import { useNavigate } from "react-router-dom";
import EmailReportComp from "components/Vendor/EmailReport";
import DownloadReportComp from "components/Vendor/DownloadReportModal";
import DateRangePicker from "components/Common/DateRangePicker1";
import SearchInput from "components/Common/SearchInput";
import { UtilIcon, UtilIconFaq } from "../../../Common/UtilIcon";
import { connect } from "react-redux";
import {
  VENDOR_USER_TYPE,
  ADMIN_USER_TYPE,
  FINANCE_USER_TYPE,
  BUSINESS_USER_TYPE,
  VENDOR_PORTAL,
} from "constants/userType";
import { ADVANCE_PAYMENT, FAQS } from "constants/url";
import { TableSelectBox } from "components/Common/TableComponent/TableSelectBox";
import { useTranslation } from "react-i18next";
import {
  advancePaymentDelete,
  downloadAdvancePaymentCSV,
  fetchStatusDropdown,
  getAdvancePayment,
  sendAdvancePaymentCSV,
} from "../../../../api/AdvancePayment";
import { setAdvancePaymentList } from "../../../../redux/actions/advancePaymentAction";
import { showToast } from "../../../../redux/actions/toastActions";
import dayjs from "dayjs";
import { downloadHelper } from "../../../../services/utilities";
import { toast } from "react-toastify";
import SuccessPopup from "components/Common/SuccessPopup";
import AdvancePaymentListPDF from "components/PDF/AdvancePaymentListPDF";
import { getEntityId } from "../../../../services/utilities";
import useTableFeatures from "hooks/useTableFeatures";
import TableLayout from "components/Common/TableComponent/TableLayout";
import { HeaderBar } from "components/Common/HeaderBar";
import { TooltipWrapper } from "components/Common/TooltipWrapper";
import { LeftPageContainer } from "pages/vendor/dashboard/dashboard.styles";
import moment from "moment";
import CustomModal from "components/Common/Modal";
import { deleteDraftInvoice } from "api/POBased";

const AdvancePaymentListComp = ({
  userInfo: { userType },
  setAdvancePaymentList,
  advancePayment,
  showToast,
}) => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation([
    "advance_payment",
    "sidebar",
    "logistics_invoice",
    "popup",
    "non_po_based_report",
    "po_based_report",
    "soa",
    "vendors",
    "toast",
  ]);

  const [emailReportState, setEmailReportState] = useState(false);
  const [downloadReport, setDownloadReport] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState([null, null]);
  const [emailReportDateRange, setEmailReportDateRange] = useState([
    null,
    null,
  ]);
  const [searchInput, setSearchInput] = useState("");
  const [emailSuccessPopup, setEmailSuccessPopup] = useState(false);
  const [statusOptions, setStatusOptions] = useState([]);
  const [selectedRows, setSelectedRows] = useState([])
  const [confirmDeletePopup, setConfirmDeletePopup] = useState(false)
  const [isDeleteLoading, setIsDeleteLoading] = useState(false)

  const [advancePaymentDownloadList, setAdvancePaymentDownloadList] = useState(
    []
  );
  const isArabic = i18n.language === "ar";
  const isDataEmpty = advancePayment?.advancePaymentList?.results?.length === 0;

  const [filters, setFilters] = useState({
    search: "",
    startDate: null,
    endDate: null,
    status: "All",
    sort_column: "",
    sort: "",
  });
  const {
    page,
    rowsPerPage,
    search,
    order,
    orderBy,
    setPageMeta,
    setLoader,
    handleSearchValue,
    tableProps,
  } = useTableFeatures();

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      handleFilterChange({ search: searchInput });
    }, 500);

    return () => clearTimeout(handler);
  }, [searchInput]);

  useEffect(() => {
    fetchAdvancePayments();
    getPDFData();
  }, [filters, page, rowsPerPage, search, order, orderBy]);

  useEffect(() => {
    fetchDropdownData();
  }, [i18n.language]);

  const fetchAdvancePayments = () => {
    setLoader(true);
    const query = {
      entity_id: getEntityId(),
      ...filters,
      search: search.trim(),
      page,
      limit: rowsPerPage,
      sort_column: orderBy,
      sort: order,
    };

    // Clean up empty values
    Object.keys(query).forEach((key) => {
      if (!query[key] || query[key] === "All") delete query[key];
    });

    getAdvancePayment(query)
      .then((res) => {
        setAdvancePaymentList(res?.data?.data || []);
        setPageMeta(res?.data?.data?.pageMeta);
      })
      .catch((err) => {
        console.error("Error fetching PO invoices:", err);
      })
      .finally(() => {
        setLoader(false);
      });
  };

  //Download Full List
  const getPDFData = () => {
    setLoader(true);
    const query = {
      entity_id: getEntityId(),
      ...filters,
      search: search.trim(),
      page: 1,
      limit: 1000,
      sort_column: orderBy,
      sort: order,
    };

    // Clean up empty values
    Object.keys(query).forEach((key) => {
      if (!query[key] || query[key] === "All") delete query[key];
    });

    getAdvancePayment(query)
      .then((res) => {
        setAdvancePaymentDownloadList(res?.data?.data?.results || []);
      })
      .catch((err) => {
        console.error("Error fetching PO invoices:", err);
      })
      .finally(() => {
        setLoader(false);
      });
  };

  const fetchDropdownData = () => {
    const isAdvancePayment = true;
    Promise.all([fetchStatusDropdown({ isAdvancePayment })])
      .then(([statusRes]) => {
        const formattedStatusOptions = [
          { label: t("vendors:all"), value: "All" },
          ...(statusRes?.data?.data?.map((x) => ({
            label: isArabic
              ? x.Status_description_arabic
              : x.Status_classification,
            value: x.Status_code,
          })) || []),
        ];
        setStatusOptions(formattedStatusOptions);
      })
      .catch((err) => console.error("Error fetching dropdown data:", err));
  };

  // Unified filter handler
  const handleFilterChange = (newFilter) => {
    const key = Object.keys(newFilter)[0];
    let value = newFilter[key];

    if (key === "search") {
      setFilters((prev) => ({
        ...prev,
        search: Array.isArray(value) ? value.join(",") : value,
      }));
    } else if (key === "date_range" && value) {
      setFilters((prev) => ({
        ...prev,
        startDate: value[0]?.format("YYYY-MM-DD"),
        endDate:
          value[1]?.format("YYYY-MM-DD") || value[0]?.format("YYYY-MM-DD"),
      }));
      setDateRange(value);
    } else if (key === "status") {
      setFilters((prev) => ({
        ...prev,
        status: value === "All" ? "" : value,
      }));
    } else {
      setFilters((prev) => ({
        ...prev,
        [key]: value,
      }));
    }
  };

  const handleCreateInvoice = () => {
    navigate(`/${userType}${ADVANCE_PAYMENT}/edit/new`);
  };

    const handleBulkDelete = () => {
      // Logic for bulk delete
      const updatedId = tableData
        .filter(row => selectedRows.includes(row.invoiceNo))
        .map(row => row.id);
  
        let body = {
        advancePaymentIds:updatedId,
      }
      setIsDeleteLoading(true);
      
      advancePaymentDelete(body).then((res) => {
        showToast(t('toast:successTitle'), t('po_based_report:bulkDeleteSuccessfully'), 'success')
        setIsDeleteLoading(false);
        setConfirmDeletePopup(false);
        fetchAdvancePayments()
        getPDFData()
        setSelectedRows([])
      })
      .catch((err) => {
        console.error(err)
        setIsDeleteLoading(false);
        setConfirmDeletePopup(false);
        toast.error(err?.response?.data?.message)
      })
    }

  const handleEmailReport = () => {
    setEmailReportState(true);
  };

  const handleClosePopup = () => {
    setEmailReportState(false);
  };

  const handleDownload = () => {
    setDownloadReport(true);
  };

  const handleRedirectClick = () => {
    navigate(`/${userType}${FAQS}?id=5`);
  };

  const downloadCSV = async () => {
    try {
      setLoading(true);
      const query = {
        entity_id: getEntityId(),

        ...filters,
        search: search.trim(),
      };
      // Clean up empty values
      Object.keys(query).forEach((key) => {
        if (!query[key] || query[key] === "All") delete query[key];
      });
      const res = await downloadAdvancePaymentCSV({ ...query, isArabic: isArabic ? true : false });
      downloadHelper(res.data, "advance_payments_export.csv");
      handleCloseDownload();
      //toast.success(t('exportStartedSuccessfully'))
    } catch (error) {
      console.error("Export error:", error);
      toast.error(t("failedToExportAdvancePayments"));
    } finally {
      setLoading(false);
    }
  };

  // const handleSendEmailReport = () => {
  //   const query = {
  //       startDate: emailReportDateRange[0] ? emailReportDateRange[0].format("YYYY-MM-DD") : null,
  //       endDate: emailReportDateRange[1] ? emailReportDateRange[1].format("YYYY-MM-DD") : null,
  //       entity_id: getEntityId(),
  //       //format: 'csv',
  //       isArabic: isArabic ? true : false,
  //       search: search.trim(),
  //       ...filters,
  //   }
  //   sendAdvancePaymentCSV(query)
  //   .then(() => {
  //     handleClosePopup();
  //     setEmailSuccessPopup(true);
  //   })
  //   .catch(console.error);
  //  };

  const handleSendEmailReport = async () => {
    try {
      setLoading(true);
      const query = {
        startDate: emailReportDateRange[0] ? emailReportDateRange[0].format("YYYY-MM-DD") : null,
        endDate: emailReportDateRange[1] ? emailReportDateRange[1].format("YYYY-MM-DD") : null,
        entity_id: getEntityId(),
        //format: 'csv'
        isArabic: isArabic ? true : false,
        search: search.trim(),
        ...filters,
      };
      //if (filters.status && filters.status !== 'All') query.status = filters.status


      Object.keys(query).forEach((key) => {
      if (!query[key] || query[key] === "All") delete query[key];
      });

      await sendAdvancePaymentCSV(query);
      handleClosePopup();
      //toast.success(t('popup:emailReportSuccess'))
      setEmailSuccessPopup(true);
    } catch (error) {
      console.error("Email report error:", error);
      toast.error(t("failedToSendEmailReport"));
    } finally {
      setLoading(false);
    }
  };

  const handleCloseDownload = () => {
    setDownloadReport(false);
  };

  const viewAdvancePayments = (data) => {
    navigate(`/${userType}/advance-payment/${data?.id}`);
  };

  const headers = [
    {
      key: 'invoiceNo',
      label: t('AdvancePaymentNo'),
      sortable: true,
      sortKey: "Advance_payment_code",
    },
    {
      label: t("logistics_invoice:date"),
      sortable: true,
      key: "date",
      sortKey: "Submitted_Date",
    },
    { key: "invoiceType", label: t("invoiceType"), sortable: true },
    ...(userType === VENDOR_USER_TYPE
      ? []
      : [
        {
          key: "vendor_name",
          label: t("vendorName"),
          sortable: true,
          sortKey: "Vendor_Name_EN",
        },
        {
          key: "vendor_code",
          label: t("vendorCode"),
          sortable: true,
          sortKey: "Vendor_SAP_Code",
        },
      ]),
    {
      key: "advancePaymentValue",
      label: t("valueOfAdvancePayment.text"),
      sortable: true,
      sortKey: "Type_of_invoice",
    },
    {
      key: "PerformaInvoiceNumber",
      label: t("ProformaInvoiceNo"),
      sortable: true,
      sortKey: "Value",
    },

    {
      key: "status",
      label: t("logistics_invoice:status.text"),
      sortable: true,
      sortKey: "Advance_Payment_Status",
    },
  ];
  const headerLabels = headers.map((h) => h.label);
  const apiData = advancePayment?.advancePaymentList?.results || [];
  const totalCount = advancePayment?.advancePaymentList?.total || 0;

  const tableData = apiData.map((x) => ({
    invoiceNo: x.Advance_payment_code,
    disableCheckbox: userType === VENDOR_USER_TYPE && x?.status?.Status_classification === "Draft" ? false : true,
    invoiceType: x.Type_of_invoice === 1 ? "PO Based" : "Non-PO Based",
    vendor_code: x?.vendorInfo?.Vendor_SAP_Code,
    vendor_name: x?.vendorInfo?.Vendor_Name_EN,
    advancePaymentValue: isNaN(x?.Value)
      ? "0.00"
      : Number(x.Value).toLocaleString("en-US", { minimumFractionDigits: 2 }),

    PerformaInvoiceNumber: x.Performa_Invoice_Number || "--",
    date: x?.Submitted_Date ? dayjs(x.Submitted_Date).format("DD/MM/YYYY") : "--",
    status: x?.status?.Status_classification || "Status Not Defined",
    id: x.ID, // For navigation
  }));

  //PDF DATA
  const PDFData = advancePaymentDownloadList || [];
  const pdfTableData = PDFData?.map((x) => ({
    invoiceNo: x?.Advance_payment_code,
    vendor_code: x?.vendorInfo?.Vendor_SAP_Code,
    vendor_name: x?.vendorInfo?.Vendor_Name_EN,
    invoiceType: x.Type_of_invoice === 1 ? "PO Based" : "Non-PO Based",
    advancePaymentValue: isNaN(x?.Value)
      ? "0.00"
      : Number(x.Value).toLocaleString("en-US", { minimumFractionDigits: 2 }),

    PerformaInvoiceNumber: x.Performa_Invoice_Number || "--",
    date: x?.Submitted_Date ? dayjs(x.Submitted_Date).format("DD/MM/YYYY") : "--",
    status: x?.status?.Status_classification || "Status Not Defined",
    id: x.ID, // For navigation
  }));

  return (
    <>
      <LeftPageContainer>
        {emailSuccessPopup && (
          <SuccessPopup
            open={emailSuccessPopup}
            successMsg={t("popup:emailReportSuccess")}
            onClose={() => setEmailSuccessPopup(false)}
          />
        )}
        <div className="min-h-screen">
          <div className={styles.poContainer}>
            <HeaderBar
              title={t("sidebar:advancePayment")}
              slug={`${t("sidebar:home")} / ${t("sidebar:advancePayment")}`}
            >
                          {(userType === VENDOR_USER_TYPE) &&(selectedRows?.length>0) && (
                        <NormalButton
                                label={t('po_based_report:delete')}
                                rejectBtn
                                customClass="px-3"
                                // leftIcon={invoiceIcon}
                                onClick={()=>setConfirmDeletePopup(true)}
                              />)}
              {userType !== BUSINESS_USER_TYPE &&
                userType !== FINANCE_USER_TYPE && (
                  <NormalButton
                    label={t("createAdvancePaymentRequest")}
                    isPrimary
                    customClass="px-3 mr-3"
                    leftIcon={addIcon}
                    onClick={handleCreateInvoice}
                  />
                )}
              <div style={{ display: "flex", marginRight: "0" }}>
                <TooltipWrapper
                  tooltipMessage={t("non_po_based_report:emailReport.text")}
                >
                  <UtilIconFaq name="emailReport" onClick={!isDataEmpty ? handleEmailReport : undefined} className={isDataEmpty ? styles.disabledIcon : ''} />
                </TooltipWrapper>
                <TooltipWrapper
                  tooltipMessage={t("non_po_based_report:downloadReport.text")}
                >
                  <UtilIconFaq name="download2" onClick={!isDataEmpty ? handleDownload : undefined} className={isDataEmpty ? styles.disabledIcon : ''} />
                </TooltipWrapper>
              </div>

              <TooltipWrapper tooltipMessage={t("soa:help")}>
                <UtilIconFaq
                  style={{ marginLeft: "0" }}
                  name="help"
                  onClick={handleRedirectClick}
                  title="Help"
                />
              </TooltipWrapper>
            </HeaderBar>
          </div>
          {/* Filters */}
          <div className="bg-white table-border overflow-hidden rounded-lg">
            <div className={styles.tableHeaderContainer}>
              <SearchInput
                placeholder={
                  userType === VENDOR_USER_TYPE
                    ? t("searchAdvancePaymentNoforVendor")
                    : t("searchAdvancePaymentNo")
                }
                onChange={(value) => handleSearchValue(value)}
              />
              <div className="d-flex gap-4 items-center">
                <TableHeaderDropdown className="flex items-center">
                  <label className="dateLabel">{t("selectDate")}</label>
                  <DateRangePicker
                    value={dateRange}
                    setValue={(dates) =>
                      handleFilterChange({ date_range: dates })
                    }
                    type="range"
                    pickerHeight="45px"
                  />
                </TableHeaderDropdown>

                <TableSelectBox
                  label={t("status")}
                  options={statusOptions}
                  onFilterChange={handleFilterChange}
                  value={filters.status}
                  isCurrency
                  paramName="status"
                  placeholder={t('vendors:all')}
                />
              </div>
            </div>
            <TableLayout
              handleRedirectUrl={viewAdvancePayments}
              selectedRows={selectedRows}
              tableData={tableData}
              tableHeaders={headers}
              checkboxRequired={userType === VENDOR_USER_TYPE}
              onSelectionChange={(rows) => setSelectedRows(rows)}
              {...tableProps}
              className="advance-payment-table"
            />
          </div>

          <EmailReportComp
            value={emailReportDateRange}
            setValue={setEmailReportDateRange}
            open={emailReportState}
            onClose={handleClosePopup}
            onSend={handleSendEmailReport}
            disable={true}
          />

          <DownloadReportComp
            value={dateRange}
            hideDatePicker
            setValue={setDateRange}
            open={downloadReport}
            onClose={handleCloseDownload}
            title={t("advancePaymentPDFTitle")}
            //advancedPayment
            onClickSubmit={downloadCSV}
            pdfComponent={
              <AdvancePaymentListPDF
                data={pdfTableData}
                headerLabels={headerLabels}
                userType={userType}
              />
            }
            NewTableComp={
              <TableLayout
                handleRedirectUrl={viewAdvancePayments}
                tableData={tableData}
                tableHeaders={headers}
                {...tableProps}
              />
            }
          //advancePaymentContent={<ViewAdvancePaymentComp showInvoice />}
          />
        </div>

        <CustomModal
                    open={confirmDeletePopup}
                    onClose={() => setConfirmDeletePopup(false)}
                    modalStyles={{ width: 400 }}
                    closeIcon
                    header={t('popup:confirmSubmission')}
                    //title={'Confirm Submission'}
                    description={t('po_based_report:confirmDeleteMessage')}
                  >
                    {/* <p className="modalTxt">{t('popup:confirmChangeEntity')}</p> */}
                    <div className="d-flex justify-content-space-between mb-2">
                      <NormalButton
                        label={t('otp:cancel')}
                        outlineBtn
                        customClass="confimationBtns me-3"
                        onClick={() => setConfirmDeletePopup(false)}
                      />
                      <NormalButton
                        label={t('otp:confirm')}
                        isPrimaryModal
                        isLoading={isDeleteLoading}
                        disabled={isDeleteLoading}
                        customClass="confimationBtns "
                        onClick={handleBulkDelete}
                      />
                    </div>
                  </CustomModal>
      </LeftPageContainer>
    </>
  );
};

const mapStateToProps = (state) => ({
  userInfo: state.userInfo,
  advancePayment: state.advancePayment,
});

const mapDispatchToProps = { setAdvancePaymentList, showToast };

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AdvancePaymentListComp);
