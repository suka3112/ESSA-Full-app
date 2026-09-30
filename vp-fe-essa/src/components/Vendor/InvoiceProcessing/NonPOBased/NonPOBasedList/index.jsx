import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import styles from "./NonPOBased.module.scss";
import emailReport from "../../../../../assets/icons/emailReport.svg";
import download from "../../../../../assets/icons/downloadIcon2.svg";
import invoiceIcon from "../../../../../assets/icons/invoiceIcon.svg";
import helpIcon from "../../../../../assets/icons/helpIcon.svg";
import TableComponent from "components/Common/TableComponent";
import { TableHeaderDropdown } from "components/Common/TableComponent/TableComponent.style";
import EmailReportComp from "components/Vendor/EmailReport";
import DownloadReportComp from "components/Vendor/DownloadReportModal";
import DateRangePicker from "components/Common/DateRangePicker1";
import SearchInput from "components/Common/SearchInput";
import { LeftPageContainer } from "pages/vendor/dashboard/dashboard.styles";
import { TableSelectBox } from "components/Common/TableComponent/TableSelectBox";
import { HeaderBar } from "components/Common/HeaderBar";
import { NormalButton } from "components/Common/NormalButton";
import { UtilIcon, UtilIconFaq } from "../../../../Common/UtilIcon";
import { connect } from "react-redux";
import {
  ADMIN_USER_TYPE,
  VENDOR_PORTAL,
  VENDOR_USER_TYPE,
} from "constants/userType";
import { FAQS, INVOICE_NON_PO_BASED } from "constants/url";
import { useTranslation } from "react-i18next";
import { downloadNonPoListCSV, listNonPOInvoices } from "api/NonPOBased";
import SuccessPopup from "components/Common/SuccessPopup";
import { fetchCurrencies } from "api/UserRegister";
import { getCRPersons } from "api/MyProfile";
import dayjs from "dayjs";
import { generateCsv, getEntityId } from "services/utilities";
import { downloadPOGoodsReceiptListCSV } from "api/PurchaseOrder";
import TableLayout from "components/Common/TableComponent/TableLayout";
import useTableFeatures from "hooks/useTableFeatures";
import NonPOBasedPDF from "components/PDF/NonPOBasedPDF";
import { PDFDownloadLink, PDFViewer } from "@react-pdf/renderer";
import { toast } from "react-toastify";
import { TooltipWrapper } from "components/Common/TooltipWrapper";
import { deleteDraftInvoice } from "api/POBased";
import CustomModal from "components/Common/Modal";
import { showToast } from "redux/actions/toastActions";

const NonPOBasedComp = ({ userInfo: { userType }, showToast }) => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation([
    "non_po_based_report",
    "po_based_report",
    "advance_payment",
    "po_based_invoices",
    "soa",
    "popup",
    "purchase_order",
    "logistics_invoice",
    "sidebar",
    "toast",
    "extension",
    "dashboard"
  ]);

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

  const [emailReportState, setEmailReportState] = useState(false);
  const [emailSuccessPopup, setEmailSuccessPopup] = useState(false);

  const [downloadReport, setDownloadReport] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [error, setError] = useState(null);
  const [currencyOptions, setCurrencyOptions] = useState([]);
  const [crPersonsOptions, setCrPersonsOptions] = useState([]);
  const [emailDateRange, setEmailDateRange] = useState([null, null]);
  const [downloadDateRange, setDownloadDateRange] = useState([null, null]);
  const [nonPODownloadList, setNonPODownloadList] = useState([]);
  const [selectedRows, setSelectedRows] = useState([])
  const [confirmDeletePopup, setConfirmDeletePopup] = useState(false)
  const [isDeleteLoading, setIsDeleteLoading] = useState(false)

  const [filters, setFilters] = useState({
    startDate: null,
    endDate: null,
    currency: "All",
    status: "",
    created_by: "",
    sortColumn: "",
    sort: "",
  });
  const isArabic = i18n.language === 'ar'
  const [filterDateRange, setFilterDateRange] = useState([null, null]);
  const isDataEmpty = invoices.length === 0;

  useEffect(() => {
    setCurrencyOptions((prev) =>
      prev.map((opt) => ({
        ...opt,
        label: opt.value === "All" ? t("vendors:all") : opt.label,
      }))
    );
  }, [i18n.language]);

  useEffect(() => {
    getPDFData();
  }, [filters, page, search, rowsPerPage, order, orderBy]);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchData = async () => {
      setLoader(true);
      setError(null);

      try {
        const [currenciesRes, crPersonsRes] = await Promise.all([
          fetchCurrencies(),
          getCRPersons({ entity_id: getEntityId() }),
        ]);

        const currencyList = Array.isArray(currenciesRes.data.data)
          ? currenciesRes.data.data
          : [];

        const formattedCurrencies = [
          { label: t("vendors:all"), value: "All" },
          ...currencyList
            .sort((a, b) => a.name.localeCompare(b.name)) // Sort alphabetically by name
            .map((item) => ({
              label: `${item?.name} (${item?.code})`,
              value: item.code,
            })),
        ];
        const crPersonsOptions = [
          { label: "All", value: "" },
          ...(crPersonsRes?.data?.data?.map((person) => ({
            label: person.Name,
            value: person.Employee_Code,
          })) || []),
        ];

        setCurrencyOptions(formattedCurrencies);
        setCrPersonsOptions(crPersonsOptions);

        const query = {
          entity_id: getEntityId(),
          category: 2,
          search: search.trim(),
          page: page,
          limit: rowsPerPage,
          sort: order,
          sort_column: orderBy,
        };

        if (filters.startDate) query.startDate = filters.startDate;
        if (filters.endDate) query.endDate = filters.endDate;
        if (filters.currency && filters.currency !== "All")
          query.currency = filters.currency;
        if (filters.status && filters.status !== "All")
          query.status = filters.status;

        const res = await listNonPOInvoices(query, { signal });
        const invoiceData = res?.data?.data?.results || res?.data || [];
        setInvoices(invoiceData);
        setPageMeta(res?.data?.data?.pageMeta);
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Error fetching data:", err);
        }
      } finally {
        setLoader(false);
      }
    };

    fetchData();

    return () => controller.abort();
  }, [filters, page, search, rowsPerPage, order, orderBy]);

  const getPDFData = () => {
    const query = {
      entity_id: getEntityId(),
      category: 2,
      search: search.trim(),
      page: 1,
      limit: 1000,
      sort: order,
      sort_column: orderBy,
    };

    if (filters.startDate) query.startDate = filters.startDate;
    if (filters.endDate) query.endDate = filters.endDate;
    if (filters.currency && filters.currency !== "All")
      query.currency = filters.currency;
    if (filters.status && filters.status !== "All")
      query.status = filters.status;

    listNonPOInvoices(query)
      .then((res) => {
        setNonPODownloadList(res?.data?.data?.results || []);
        setPageMeta(res?.data?.data?.pageMeta);
      })
      .catch((err) => {
        console.error("Error fetching PO invoices:", err);
      });
  };

  const statusOptions = [
    { label: t("vendors:all"), value: "" },
    { label: t("vendors:draft"), value: 7 },
    { label: t("vendors:submittedForReview"), value: 1 },
    { label: t("vendors:underReview"), value: 2 },
    { label: t("extension:approved"), value: 4 },
    { label: t("extension:rejected"), value: 5 },
    { label: t("dashboard:paid"), value: 6 },
  ];
  const handleFilterChange = (newFilter) => {
    const key = Object.keys(newFilter)[0];
    let value = newFilter[key];

    // Special handling for sort
    if (key === "sort_column" && value) {
      const [column, direction = "ASC"] = value.split(" ");
      setFilters((prev) => ({
        ...prev,
        sort_column: column,
        sort: direction.toUpperCase(),
      }));
    } else if (key === "status") {
      setFilters((prev) => ({
        ...prev,
        status: value === "All" ? "" : value,
      }));
    }
    // Special handling for date range
    else if (key === "date_range" && value) {
      setFilters((prev) => ({
        ...prev,
        startDate: value[0]?.format("YYYY-MM-DD"),
        endDate:
          value[1]?.format("YYYY-MM-DD") || value[0]?.format("YYYY-MM-DD"),
      }));
      setFilterDateRange(value);
    } else if (key === "date_range_download" && value) {
      setFilters((prev) => ({
        ...prev,
        startDate: value[0]?.format("YYYY-MM-DD"),
        endDate:
          value[1]?.format("YYYY-MM-DD") || value[0]?.format("YYYY-MM-DD"),
      }));
      setDownloadDateRange(value);
    }
    // Handle currency filter
    else if (key === "currency") {
      setFilters((prev) => ({
        ...prev,
        currency: value === "All" ? "" : value,
      }));
    }
    // Handle created_by filter
    else if (key === "created_by") {
      setFilters((prev) => ({
        ...prev,
        created_by: value === "All" ? "" : value,
      }));
    }
    // Default case for search and other filters
    else {
      setFilters((prev) => ({
        ...prev,
        [key]: value,
      }));
    }
  };

  // Other handlers
  const handleCreateInvoice = useCallback(() => {
    navigate(`/${userType}${INVOICE_NON_PO_BASED}/invoice`);
  }, [navigate]);

  const handleBulkDelete = () => {
    // Logic for bulk delete
    const updatedId = formattedData
      .filter(row => selectedRows.includes(row.invoiceNo))
      .map(row => row.id);

    let body = {
      invoiceIds: updatedId,
    }
    setIsDeleteLoading(true);

    deleteDraftInvoice(body).then((res) => {
      showToast(t('toast:successTitle'), t('po_based_report:bulkDeleteSuccessfully'), 'success')
      setIsDeleteLoading(false);
      setConfirmDeletePopup(false);
      getPDFData()
      setSelectedRows([])
    })
      .catch((err) => {
        console.error(err)
        toast.error(err?.response?.data?.message)
      })
  }

  const handleEmailReport = useCallback(() => {
    setEmailReportState(true);
  }, []);

  const handleSendEmail = () => {
    // if (!emailDateRange[0] || !emailDateRange[1]) {
    //   toast.error(t("toast:selectDateRangeBeforeSending"));
    //   return;
    // }

    const query = {
      startDate: emailDateRange[0]
        ? emailDateRange[0].format("YYYY-MM-DD")
        : null,
      endDate: emailDateRange[1]
        ? emailDateRange[1].format("YYYY-MM-DD")
        : null,
      category: 2,
      entity_id: getEntityId(),
      isArabic: isArabic ? true : false,
      search: search.trim(),

    };

    if (filters.startDate) query.startDate = filters.startDate;
    if (filters.endDate) query.endDate = filters.endDate;
    if (filters.currency && filters.currency !== "All")
      query.currency = filters.currency;
    if (filters.status && filters.status !== "All")
      query.status = filters.status;

    downloadNonPoListCSV(query)
      .then(() => {
        setEmailReportState(false);
        setEmailSuccessPopup(true);
      })
      .catch(console.error);
  };

  const handleDownload = useCallback(() => {
    setDownloadReport(true);
  }, []);

  const handleCloseDownload = useCallback(() => {
    setDownloadReport(false);
  }, []);

  const handleDownloadSubmit = () => {
    const query = {
      entity_id: getEntityId(),
      mode: "report",
      startDate: downloadDateRange[0]
        ? downloadDateRange[0]?.format("YYYY-MM-DD")
        : null,
      endDate: downloadDateRange[1]
        ? downloadDateRange[1]?.format("YYYY-MM-DD")
        : null,
      format: "csv",
      category: 2,
      search: search.trim(),
      isArabic: isArabic ? true : false,

    };
    if (filters.startDate) query.startDate = filters.startDate;
    if (filters.endDate) query.endDate = filters.endDate;
    if (filters.currency && filters.currency !== "All")
      query.currency = filters.currency;
    if (filters.status && filters.status !== "All")
      query.status = filters.status;
    generateCsv(
      `${process.env.REACT_APP_DEFAULT_API_BASE_URL}/invoice/invoiceList/export`,
      "NonPOList.csv",
      query
    ).then(() => {
      handleCloseDownload();
    });
  };

  const handleRedirect = (data) => {
    const { id } = data;
    navigate(
      `/${userType}/invoice-processing/non-po-based-invoice/view?no=${id}`
    );
  };

  // Table configuration
  const headers = [
    {
      key: "invoiceNo",
      label: t("vendorInvoiceNumber.text"),
      sortable: true,
      sortKey: "InvNo",
    },
    ...(userType === VENDOR_USER_TYPE
      ? []
      : [
        {
          key: "vendor_name",
          label: t("advance_payment:vendorName"),
          sortable: true,
          sortKey: "Vendor_Name_EN",
        },
        {
          key: "vendor_code",
          label: t("advance_payment:vendorCode"),
          sortable: true,
          sortKey: "Vendor_SAP_Code",
        },
      ]),
    ...(userType === VENDOR_USER_TYPE
      ? [
        {
          key: "date",
          label: t("invoiceDate.text"),
          sortable: true,
          sortKey: "InvDt",
        },
      ]
      : [
        {
          key: "submittedDate",
          label: t("submittedDate.text"),
          sortable: true,
          sortKey: "Submitted_Date",
        },
      ]),
    {
      key: "currency",
      label: t("currency.text"),
      sortable: true,
      sortKey: "InvCurr",
    },
    {
      key: "invoiceValue",
      label: t("invoiceValue.text"),
      sortable: true,
      sortKey: "InvAmt",
    },
    {
      key: "invoiceDueDate",
      label: t("invoiceDueDate.text"),
      sortable: true,
      sortKey: "Invoice_Due_Date",
    },
    {
      key: "status",
      label: t("invoiceStatus.text"),
      sortable: true,
      sortKey: "Invoice_Status_Id",
    },
  ];
  const headerLabels = headers.map((h) => h.label);

  const formattedData = invoices.map((item) => ({
    invoiceNo: item?.InvNo || "",
    disableCheckbox: userType === VENDOR_USER_TYPE && item?.status?.Status_classification === "Draft" ? false : true,
    date: item?.InvDt ? moment(item?.InvDt).format("DD/MM/YYYY") : "",
    submittedDate: item?.Submitted_Date
      ? moment(item?.Submitted_Date).format("DD/MM/YYYY")
      : "",
    currency: item?.InvCurr || "",
    invoiceValue: isNaN(item?.InvAmt)
      ? ""
      : Number(item.InvAmt).toLocaleString("en-US", {
        minimumFractionDigits: 2,
      }),
    invoiceDueDate: item?.Invoice_Due_Date
      ? moment(item?.Invoice_Due_Date).format("DD/MM/YYYY")
      : "",
    status: item?.status?.Status_classification || "",
    id: item?.ID,
    Invoice_Status_Id: item?.status?.Status_classification,
    vendor_code: item?.vendorDetails?.Vendor_SAP_Code,
    vendor_name: item?.vendorDetails?.Vendor_Name_EN,
  }));

  const pdfTableData = nonPODownloadList.map((item) => ({
    invoiceNo: item?.InvNo,
    date: item?.InvDt ? moment(item?.InvDt).format("DD/MM/YYYY") : "",
    currency: item?.InvCurr,
    invoiceValue: item?.InvAmt || "",
    invoiceDueDate: item?.Invoice_Due_Date
      ? moment(item?.Invoice_Due_Date).format("DD/MM/YYYY")
      : "",
    status: item?.status?.Status_classification || "",
    id: item?.ID,
    Invoice_Status_Id: item?.status?.Status_classification,
    vendor_code: item?.vendorDetails?.Vendor_SAP_Code,
    vendor_name: item?.vendorDetails?.Vendor_Name_EN,
  }));

  if (error) {
    return <LeftPageContainer>{error}</LeftPageContainer>;
  }

  return (
    <LeftPageContainer>
      {emailSuccessPopup && (
        <SuccessPopup
          open={emailSuccessPopup}
          successMsg={t("popup:emailReportSuccess")}
          onClose={() => setEmailSuccessPopup(false)}
        />
      )}
      <div className={styles.poContainer}>
        <HeaderBar
          title={t("logistics_invoice:invoiceProcessingNonPoBased")}
          slug={`${t("sidebar:home")} / ${t("sidebar:invoiceProcessing")} / ${t(
            "sidebar:nonPoBased"
          )}`}
        >
          {(userType === VENDOR_USER_TYPE) && (selectedRows?.length > 0) && (
            <NormalButton
              label={t('po_based_report:delete')}
              rejectBtn
              customClass="px-3"
              // leftIcon={invoiceIcon}
              onClick={() => setConfirmDeletePopup(true)}
            />)}

          {(userType === VENDOR_USER_TYPE || userType === ADMIN_USER_TYPE) && (
            <NormalButton
              label={t("purchase_order:createInvoice")}
              isPrimary
              customClass="px-2"
              leftIcon={invoiceIcon}
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
              style={{ marginLeft: 0 }}
              name="help"
              onClick={() => navigate(`/${userType}${FAQS}?id=3`)}
            />
          </TooltipWrapper>
        </HeaderBar>
      </div>

      <div className="bg-white table-border overflow-hidden rounded-lg">
        <div className={styles.tableHeaderContainer}>
          <SearchInput
            placeholder={
              userType === VENDOR_USER_TYPE
                ? t("advance_payment:searchForInvoiceNo")
                : t("po_based_invoices:searchInvoiceVendorNo")
            }
            onChange={(value) => handleSearchValue(value)}
          />
          <div className="d-flex gap-4 items-center">
            <TableHeaderDropdown className="flex items-center">
              <label className="dateLabel">{t("soa:dueDate.text")}</label>
              <DateRangePicker
                value={filterDateRange}
                setValue={(dates) => {
                  handleFilterChange({ date_range: dates });
                }}
                type="range"
                pickerHeight="45px"
              />
            </TableHeaderDropdown>

            <TableSelectBox
              label={t("currency.text")}
              onFilterChange={handleFilterChange}
              value={filters.currency}
              options={currencyOptions}
              isCurrency
              paramName="currency"
              placeholder={t("vendors:all")}
            />

            <TableSelectBox
              label={t("po_based_invoices:status")}
              options={statusOptions}
              paramName="status"
              onFilterChange={handleFilterChange}
              value={filters.status}
              isCurrency
            />
          </div>
        </div>
        <TableLayout
          className="non-po-based-listing-table"
          selectedRows={selectedRows}
          tableHeaders={headers}
          tableData={formattedData}
          {...tableProps}
          handleRedirectUrl={handleRedirect}
          checkboxRequired={userType === VENDOR_USER_TYPE}
          onSelectionChange={(rows) => setSelectedRows(rows)}
        />
      </div>

      <EmailReportComp
        value={emailDateRange}
        setValue={setEmailDateRange}
        open={emailReportState}
        onClose={() => setEmailReportState(false)}
        onSend={handleSendEmail}
        disable={true}
      />
      <DownloadReportComp
        value={downloadDateRange}
        hideDatePicker
        setValue={(dates) => {
          handleFilterChange({ date_range_download: dates });
        }}
        open={downloadReport}
        onClose={handleCloseDownload}
        NewTableComp={
          <TableLayout
            tableHeaders={headers}
            tableData={formattedData}
            {...tableProps}
          />
        }
        pdfComponent={
          <NonPOBasedPDF data={pdfTableData} headerLabels={headerLabels} userType={userType} />
        }
        title={t("nonPOPDFTitle")}
        onClickSubmit={handleDownloadSubmit}
      />

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
  );
};

const mapStateToProps = (state) => ({
  userInfo: state.userInfo,
});
const mapDispatchToProps = { showToast }

export default connect(mapStateToProps, mapDispatchToProps)(NonPOBasedComp);