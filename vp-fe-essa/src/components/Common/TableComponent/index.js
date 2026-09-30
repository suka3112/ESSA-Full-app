import React, { useRef, useState } from "react";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  Pagination,
  Box,
  MenuItem,
  Select,
  FormControl,
  PaginationItem,
} from "@mui/material";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ArrowDropUpIcon from "@mui/icons-material/ArrowDropUp";
import {
  TCCheckBox,
  TCHeadCheckBox,
  TCPaper,
} from "./TableComponent.mui.style";
import {
  ActionTags,
  AnchorItem,
  DataLabel,
  DataLabelTotal,
  DataValue,
  StatusTags,
  TotalData,
} from "./TableComponent.style";
import { useLocation, useNavigate } from "react-router-dom";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForward";
import { useTranslation } from "react-i18next";
import { editIcon } from "constants/imageConstants";
import { deleteIcon } from "constants/imageConstants";
import NoData from "assets/images/noDataImg.svg";
import { PageLoader } from "../PageLoader";
import "./TableLayout.scss";

const TableComponent = ({
  width = "100%",
  noSorting = false,
  checkboxRequired = false,
  tableData,
  tableHeaders,
  onSelectionChange,
  redirectUrl,
  handleRedirectUrl = null,
  showPagination = true,
  showTotalData = false,
  totalData = {},
  isLoading = false,
  className,
  selectedRows, // <-- new prop for controlled selection
}) => {
  const { t, i18n } = useTranslation([
    "vendors",
    "purchase_order",
    "myprofile",
    "popup",
    "non_po_based_report",
    "po_based_invoices",
  ]);
  const isArabic = i18n.language === "ar";
  // const headers = tableHeaders
  // const data = tableData

  //const { headers, data } = tableData // Destructure headers and data from defaulttableData
  const [selected, setSelected] = useState(selectedRows || []);
  // Sync internal selected state with selectedRows prop if provided
  React.useEffect(() => {
    if (Array.isArray(selectedRows)) {
      setSelected(selectedRows);
    }
  }, [selectedRows])
  const [orderBy, setOrderBy] = useState(null) // Default sort by the first header key
  const [order, setOrder] = useState('asc') // Default sort order
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(50) // Default rows per page
  const navigate = useNavigate()
  const location = useLocation() // Get the current location

  const handleStaticRedirect = () => {
    navigate(redirectUrl);
  };

  const redirectHandler = (data) => {
    if (handleRedirectUrl) {
      handleRedirectUrl(data);
    } else {
      handleStaticRedirect();
    }
  };

  const handleRedirect = (type, id) => {
    const searchParams = new URLSearchParams(location.search);
    searchParams.set("type", type);
    searchParams.set("id", id);
    navigate(`${location.pathname}?${searchParams?.toString()}`); // Preserve the current path, update params
  };

  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      const newSelected = tableData?.map((row) => row[tableHeaders[0].key]); // Use the first header key as the unique identifier
      setSelected(newSelected);
      onSelectionChange(newSelected);
    } else {
      setSelected([]);
       onSelectionChange([]);
    }
  };

  const handleRowCheckboxClick = (event, id) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else {
      newSelected = selected.filter((item) => item !== id);
    }

    setSelected(newSelected);
    onSelectionChange(newSelected);
  };

  const handleSort = (property) => {
   if (orderBy === property) {
    setOrder(order === 'asc' ? 'desc' : 'asc')
  } else {
    setOrderBy(property)
    setOrder('asc')
  }
  }

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(event.target.value);
    setPage(1); // Reset to the first page when rows per page changes
  };

  const isSelected = (id) => selected.indexOf(id) !== -1;

  // Only sort if orderBy is set
const sortedData = React.useMemo(() => {
  if (!orderBy) return tableData
  return tableData?.slice().sort((a, b) => {
    if (order === 'asc') {
      return a[orderBy] > b[orderBy] ? 1 : -1
    } else {
      return a[orderBy] < b[orderBy] ? 1 : -1;
    }
  })
}, [tableData, orderBy, order])

  const paginatedData = showPagination
    ? sortedData?.slice((page - 1) * rowsPerPage, page * rowsPerPage)
    : sortedData;
  // Drag Table
  const tableRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartX(e.pageX - tableRef.current.offsetLeft);
    setScrollLeft(tableRef.current.scrollLeft);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - tableRef.current.offsetLeft;
    const walk = (x - startX) * 2; // Adjust speed
    tableRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <TCPaper>
      <div
        ref={tableRef}
        // onMouseDown={handleMouseDown}
        // onMouseMove={handleMouseMove}
        // onMouseUp={handleMouseUp}
        // onMouseLeave={handleMouseUp}
        // style={{ width: "100%", overflowX: "hidden", overflowY: "auto" }}
        className="custom-table-wrapper"
      >
        <Table
          className="invoiceTable edit-invoice-table custom-table"
        >
          <TableHead sx={{ height: "46px" }}>
            <TableRow>
              {checkboxRequired && (
                <TableCell
                  padding="checkbox"
                  sx={{
                    backgroundColor: "var(--brand-primary-color, #017EBD)",
                    color: "white",
                    fontSize: "0.9rem",
                    fontWeight: "bold",
                    width: "5%",
                  }}
                >
                  <TCHeadCheckBox
                    indeterminate={
                      selected.length > 0 && selected.length < tableData?.length
                    }
                    checked={selected.length === tableData?.length}
                    onChange={handleSelectAllClick}
                  />
                </TableCell>
              )}
              {tableHeaders?.map((header, index) => (
                <TableCell
                  key={header.key}
                  sx={{
                    backgroundColor: "var(--brand-primary-color, #017EBD)",
                    color: "white",
                    fontSize: "1rem",
                    fontWeight: "600",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      cursor: "pointer",
                    }}
                    onClick={() => (noSorting ? null : handleSort(header.key))}
                  >
                    <span
                      style={{
                        whiteSpace: "nowrap",
                      }}
                    >
                      {header.label}
                    </span>
                    {noSorting ? null : (
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          ml: 1,
                          flexShrink: 0,
                        }}
                      >
                        <ArrowDropUpIcon
                          sx={{
                            color:
                              orderBy === header.key && order === "asc"
                                ? "white"
                                : "var(--brand-primary-color, $primary-color)",
                            height: "1rem",
                            width: "1rem",
                            marginBottom: "-6px",
                          }}
                        />
                        <ArrowDropDownIcon
                          sx={{
                            color:
                              orderBy === header.key && order === "desc"
                                ? "white"
                                : "var(--brand-primary-color, $primary-color)",
                            height: "1rem",
                            width: "1rem",
                            marginBottom: "-3px",
                          }}
                        />
                      </Box>
                    )}
                  </Box>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={
                    checkboxRequired
                      ? tableHeaders?.length + 1
                      : tableHeaders?.length
                  }
                  align="center"
                >
                  <div className="no-data-table-view">
                    <PageLoader />
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              <>
                {paginatedData?.length > 0 && !isLoading ? (
                  paginatedData?.map((row, index) => {
                    const isItemSelected = isSelected(row[tableHeaders[0].key]); // Use the first header key as the unique identifier
                    const isEvenRow = index % 2 === 0;
                    return (
                      <TableRow
                        key={row[tableHeaders[0].key]}
                        hover
                        role="checkbox"
                        aria-checked={isItemSelected}
                        selected={isItemSelected}
                        sx={{
                          backgroundColor: isEvenRow ? "#F5F7FA" : "#F9FAFB",
                        }}
                      >
                        {checkboxRequired && (
                          <TableCell
                            padding="checkbox"
                            sx={{
                              fontSize: "1rem",
                              fontWeight: "600",
                              borderBottom: "1px solid #b9b9b9",
                              width: "5%",
                            }}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                              }}
                            >
                              <TCCheckBox
                                checked={isItemSelected}
                                onClick={(event) =>
                                  handleRowCheckboxClick(
                                    event,
                                    row[tableHeaders[0]?.key]
                                  )
                                }
                              />
                            </Box>
                          </TableCell>
                        )}
                        {tableHeaders?.map((header) => (
                          <TableCell
                            key={header.key}
                            title={row[header.key]}
                            sx={{
                              // fontSize: "0.875rem",
                              color: "#030303",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              maxWidth: "300px",
                              textOverflow: "ellipsis",
                              borderBottom: "1px solid #b9b9b9",
                              // padding: "8px 12px",
                              // width: `${95 / tableHeaders.length}%`,
                              // ...(header.key === "status" && {
                              //   padding: "8px 12px",
                              // }),
                            }}
                          >
                            {header.key === "status" ? (
                              <StatusTags
                                type={`${row[header.key]}`.toLowerCase()}
                              >
                                {row[header.key]}
                              </StatusTags>
                            ) : header.key === "action" ? (
                              <Box
                                sx={{
                                  display: "flex",
                                  gap: 1,
                                  justifyContent: "center",
                                }}
                              >
                                <img
                                  src={editIcon}
                                  alt="Edit"
                                  style={{
                                    cursor: "pointer",
                                    width: "18px",
                                    height: "18px",
                                  }}
                                  onClick={() => row.action.edit()}
                                />
                                <img
                                  src={deleteIcon}
                                  alt="Delete"
                                  style={{
                                    cursor: "pointer",
                                    width: "18px",
                                    height: "18px",
                                  }}
                                  onClick={row.action.delete}
                                />
                              </Box>
                            ) : header.key === "poNumber" ||
                              header.key === "po_number" ||
                              header.key === "invoiceNo" ||
                              header.key === "creditNoteNo" ||
                              header.key === "month" ||
                              header.key === "poQuantity" ||
                              header.key === "invoice_number" ? (
                              <AnchorItem onClick={() => redirectHandler(row)}>
                                <span
                                  style={{
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    display: "block",
                                  }}
                                >
                                  {row[header.key]}
                                </span>
                              </AnchorItem>
                            ) : (
                              <span
                                style={{
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  display: "block",
                                }}
                              >
                                {row[header.key]}
                              </span>
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={
                        checkboxRequired
                          ? tableHeaders?.length + 1
                          : tableHeaders?.length
                      }
                      align="center"
                    >
                      <div className="no-data-table-view">
                        <img src={NoData} alt="nodata" />
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </div>
      {showTotalData && paginatedData.length > 0 && (
        <TotalData>
          <div className="soaData my-1 px-2 p-1 mt-2">
            <div style={{ paddingRight: "5px" }}>
              <DataLabel>{t("netValue")} (excl tax): </DataLabel>
              <DataValue>
                {totalData?.netValue !== undefined &&
                totalData?.netValue !== null &&
                !isNaN(totalData?.netValue)
                  ? Number(totalData.netValue).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : "0.00"}
              </DataValue>
            </div>
            <div
              style={{
                borderLeft: !isArabic ? "1.5px solid #0066b3" : "none",
                paddingLeft: "5px",
                paddingRight: "5px",
                borderRight: isArabic ? "1.5px solid #0066b3" : "none",
              }}
            >
              <DataLabel>{t("non_po_based_report:taxValue.text")}: </DataLabel>
              <DataValue>
                {totalData?.taxValue !== undefined &&
                totalData?.taxValue !== null &&
                !isNaN(totalData?.taxValue)
                  ? Number(totalData.taxValue).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : "0.00"}
              </DataValue>
            </div>
            <div
              style={{
                borderLeft: !isArabic ? "1.5px solid #0066b3" : "none",
                paddingLeft: "5px",
                paddingRight: isArabic ? "7px" : "0px",
                borderRight: isArabic ? "1.5px solid #0066b3" : "none",
              }}
            >
              <DataLabelTotal>{t("total")}: </DataLabelTotal>
              <DataValue>
                {totalData?.total !== undefined &&
                totalData?.total !== null &&
                !isNaN(totalData?.total)
                  ? Number(totalData.total).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : "0.00"}
              </DataValue>
            </div>
          </div>
        </TotalData>
      )}
      {showPagination && paginatedData?.length > 0 && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 20px",
            fontSize: "0.8rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                paddingInlineEnd: "16px",
                borderRight: !isArabic ? "1px solid #2D2C2C" : "none",
                borderLeft: isArabic ? "1px solid #2D2C2C" : "none",
                fontSize: "15px",
                color: "#2D2C2C",
                fontWeight: 500,
              }}
              className="tableFooter"
            >
              <span style={{ color: "var(--brand-primary-color, #1956DD)", fontWeight: "500" }}>
                {page}
              </span>{" "}
              {t('vendors:of')} {Math.ceil(tableData?.length / rowsPerPage)}
            </div>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                paddingInlineStart: "16px",
                color: "#2D2C2C",
                fontSize: "15px",
                fontWeight: 500,
              }}
            >
              <span>{t("popup:displaying")}</span>
              <FormControl variant="outlined" size="small">
                <Select
                  size="small"
                  sx={{
                    color: "#2D2C2C",
                    backgroundColor: "#E5EBFF",
                    border: "none !important",
                    px: "2px",
                    "& fieldset": { border: "none !important" },
                    fontSize: "15px",
                    fontWeight: 400,
                    height: "32px !important",
                    "& .MuiSelect-select": {
                      paddingRight: "25px !important", // Override the default padding
                    },
                  }}
                  value={rowsPerPage}
                  onChange={handleRowsPerPageChange}
                  //        label="Rows per page"
                  label="" // Set it to empty to hide label
                >
                  <MenuItem value={5}>5</MenuItem>
                  <MenuItem value={10}>10</MenuItem>
                  <MenuItem value={25}>25</MenuItem>
                  <MenuItem value={50}>50</MenuItem>
                  <MenuItem value={100}>100</MenuItem>
                </Select>
              </FormControl>
              <span>{t("popup:perPage")}</span>
            </Box>
          </div>
          <Pagination
            count={Math.ceil(tableData?.length / rowsPerPage)}
            //count={50}
            page={page}
            onChange={handlePageChange}
            color="primary"
            sx={{
              ".MuiPaginationItem-root": {
                color: "#2D2C2C",
                fontWeight: 500,
                fontSize: "16px",
                opacity: "1 !important",
                "&:hover": {
                  backgroundColor: "var(--brand-primary-color-light, #E5EBFF)",
                  color: "var(--brand-primary-color, #017EBD)",
                },
              },
              ".MuiPaginationItem-root.Mui-selected": {
                backgroundColor: "var(--brand-primary-color, #017EBD)",
                color: "white",
                "&:hover": {
                  backgroundColor: "var(--brand-primary-color, #017EBD)",
                  color: "white",
                },
              },
              ".MuiPaginationItem-previousNext": {
                color: "var(--brand-primary-color, #017EBD)",
                backgroundColor: "var(--brand-primary-color-light, #E5EBFF)",
                borderRadius: "50%",
                padding: "5px",
                "&:hover": {
                  backgroundColor: "var(--brand-primary-color-light, #E5EBFF)",
                  color: "var(--brand-primary-color, #017EBD)",
                },
              },
              ".MuiPaginationItem-icon": {
                height: "16px",
                width: "16px",
              },
            }}
            renderItem={(item) => (
              <PaginationItem
                components={{
                  previous: ArrowBackIosNewIcon,
                  next: ArrowForwardIosIcon,
                }}
                {...item}
              />
            )}
          />
        </Box>
      )}
    </TCPaper>
  );
};

export default TableComponent;
