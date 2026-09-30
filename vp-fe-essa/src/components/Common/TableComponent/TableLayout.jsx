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
import { blackEditIcon } from "constants/imageConstants";
import { blackDeleteIcon } from "constants/imageConstants";
import { ChevronsUpDown } from "lucide-react";
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
  ExtraStyledTotalData,
  SOADataLabel,
  SOAStyledTotalData,
  StatusTags,
  TotalData,
} from "./TableComponent.style";
import { useLocation, useNavigate } from "react-router-dom";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForward";
import { useTranslation } from "react-i18next";
import NoData from "assets/images/noDataImg.svg";
import "./TableLayout.scss";
import { PageLoader } from "../PageLoader";

const TableLayout = ({
  width = "100%",
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
  handlePerPage,
  pageMeta = "",
  rowsPerPage,
  handlePage,
  page,
  orderBy,
  setOrderBy,
selectedRows = undefined,
  soaData,
  order,
  setOrder,

  setPage,
  className,
  stickyHeader = false,
}) => {
  const { t,i18n } = useTranslation([
    "vendors",
    "purchase_order",
    "myprofile",
    "non_po_based_report",
    "po_based_invoices",
  ]);
  const isArabic = i18n.language === 'ar'
  const [selected, setSelected] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();
  // count of rows that can be selected (checkbox not disabled)
  const selectableCount = tableData?.filter((row) => !row?.disableCheckbox)?.length ?? 0;

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

  // Sync internal selected when parent passes selectedRows (so parent can clear selection)
  React.useEffect(() => {
    if (!Array.isArray(selectedRows)) return;
    // avoid unnecessary setState
    const same =
      selectedRows.length === selected.length &&
      selectedRows.every((v, i) => v === selected[i]);
    if (!same) {
      setSelected(selectedRows);
    }
  }, [selectedRows]); // eslint-disable-line react-hooks/exhaustive-deps

  // When tableData changes, keep only ids that still exist in data and notify parent if changed
  React.useEffect(() => {
    if (!tableData || selected.length === 0) return;
    const idKey = tableHeaders?.[0]?.key;
    const validIds = new Set(tableData.map((r) => r[idKey]));
    const filtered = selected.filter((id) => validIds.has(id));
    if (filtered.length !== selected.length) {
      setSelected(filtered);
      onSelectionChange && onSelectionChange(filtered);
    }
  }, [tableData]);

  // const handleSelectAllClick = (event) => {
  //   if (event.target.checked) {
  //     const newSelected = tableData?.map((row) => row[tableHeaders[0].key]); // Use the first header key as the unique identifier
  //     setSelected(newSelected);
  //     onSelectionChange(newSelected);
  //   } else {
  //     setSelected([]);
  //     onSelectionChange([]);
  //   }
  // };
// ...existing code...
const handleSelectAllClick = (event) => {
  if (event.target.checked) {
    // Only select rows where disableCheckbox is not true
    const newSelected = tableData
      ?.filter((row) => !row.disableCheckbox)
      .map((row) => row[tableHeaders[0].key]);
    setSelected(newSelected);
    onSelectionChange(newSelected);
  } else {
    setSelected([]);
    onSelectionChange([]);
  }
};
// ...existing code...
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
    const isAsc = orderBy === property && order === "ASC";
    setOrder(isAsc ? "DESC" : "ASC");
    setOrderBy(property);
    setPage(1);
  };

  const isSelected = (id) => selected.indexOf(id) !== -1;
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
        <Table stickyHeader={stickyHeader} sx={{ width: "100%"}} className={`custom-table ${className}`}>
          <TableHead sx={stickyHeader ? undefined : { height: "46px" }}>
            <TableRow>
              {checkboxRequired && (
                <TableCell
                  padding="checkbox"
                  sx={{
                    backgroundColor: "var(--brand-primary-color, var(--brand-primary-color, $primary-color))",
                    color: "white",
                    fontSize: "0.9rem",
                    fontWeight: "bold",
                  }}
                >
                  <TCHeadCheckBox
                    indeterminate={
                      selected.length > 0 && selected.length < selectableCount
                    }
                    checked={selectableCount > 0 && selected.length === selectableCount}
                    onChange={handleSelectAllClick}
                    disabled={selectableCount === 0}
                  />
                </TableCell>
              )}
              {tableHeaders?.map((header) => (
                <TableCell
                  key={header.key}
                  sx={{
                    backgroundColor: "var(--brand-primary-color, var(--brand-primary-color, $primary-color))",
                    color: "white",
                    fontSize: "1rem",
                    fontWeight: "600",
                    textWrap: "nowrap",
                  }}
                >
                  <Box
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      cursor: header?.sortable ? "pointer" : "normal",
                      textTransform: "uppercase",
                    }}
                    onClick={
                      header?.sortable
                        ? () =>
                            handleSort(
                              header.sortKey ? header.sortKey : header.key
                            )
                        : null
                    }
                  >
                    {header.label}
                    {header?.sortable ? (
                      <ChevronsUpDown
                        size={12}
                        strokeWidth={2}
                        style={{
                          flexShrink: 0,
                          color: "currentColor",
                          opacity:
                            orderBy === (header.sortKey || header.key) ? 1 : 0.7,
                        }}
                      />
                    ) : null}
                  </Box>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody sx={{ overflow: "hidden" }}>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={
                    checkboxRequired
                      ? tableHeaders.length + 1
                      : tableHeaders.length
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
                {tableData?.length > 0 && !isLoading ? (
                  tableData?.map((row, index) => {
                    const isItemSelected = isSelected(row[tableHeaders[0].key]); // Use the first header key as the unique identifier
                    const isEvenRow = index % 2 === 0;
                    const isLastRow = index === tableData.length - 1;

                    return (
                      <TableRow
                        key={row[tableHeaders[0].key]}
                        hover
                        role="checkbox"
                        aria-checked={isItemSelected}
                        selected={isItemSelected}
                        sx={{
                          backgroundColor: isEvenRow ? "#F5F7FA" : "#F9FAFB",
                          ...(isLastRow && {
                            borderRadius: "0 0 12px 12px",
                            borderBottom: "none",
                            "& td": {
                              borderBottom: "none",
                            },
                          }),
                        }}
                      >
                        
                        {checkboxRequired && (
                          <TableCell
                            // padding="checkbox"
                            sx={{
                              fontSize: "1rem",
                              // borderBottom: '0.5px solid rgb(152, 162, 179)',
                              fontWeight: "600",
                              borderBottom: "1px solid #b9b9b9",
                              // padding:'8px 16px'
                            }}
                          >
                            {/* <Box
                              sx={{
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",  
                              }}
                            > */}
                              <TCCheckBox
                                checked={isItemSelected}
                                onClick={(event) =>
                                  handleRowCheckboxClick(
                                    event,
                                    row[tableHeaders[0]?.key]
                                  )
                                }
                                disabled={row.disableCheckbox === true}
                              />
                            {/* </Box> */}
                          </TableCell>
                        )}
                        {tableHeaders?.map((header) => (
                          <TableCell
                            key={header.key}
                            sx={{
                              fontSize: "1rem",
                              color: "#030303",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              maxWidth: 300,
                              borderBottom: "1px solid #b9b9b9",
                              padding: "8px 16px",
                              // borderBottom: '0.5px solid rgb(152, 162, 179)',
                              // ...(header.key === "status" && {
                              //   minWidth: "180px",
                              //   padding: "8px 16px",
                              // }),
                              ...(header.key === "vendor_name_SOA" && {
                                minWidth: "180px",
                                padding: "8px 16px",
                              }),
                            }}
                            title={
                              row[header.key] ? String(row[header.key]) : ""
                            }
                          >
                            {header.key === "status" ? (
                              <StatusTags
                                type={`${row[header.key]}`.toLowerCase()}
                              >
                                {row[header.key]}
                              </StatusTags>
                            ) : header.render ? (
                              header.render(row[header.key], row)
                            ) : // header.key === 'action' ? (
                            //   <Box sx={{ display: 'flex', gap: 1 }}>
                            //     <img
                            //       src={blackEditIcon}
                            //       alt="Edit"
                            //       style={{ cursor: 'pointer', width: '20px', height: '20px' }}
                            //       onClick={() => row.action.edit()}
                            //     />
                            //     {/* <img
                            //       src={blackDeleteIcon}
                            //       alt="Delete"
                            //       style={{ cursor: 'pointer', width: '20px', height: '20px' }}
                            //       onClick={row.action.delete}
                            //     /> */}
                            //   </Box>

                            // )
                            header.key === "poNumber" ||
                              header.key === "PONo" ||
                              header.key === "invoiceNo" ||
                              header.key === "creditNoteNo" ||
                              header.key === "poQuantity" ||
                              header.key === "month" ||
                              header.key === "referenceNo" ||
                              header.key === "vendorCode" ||
                              header.key === "invoice_number" ||
                              header.key === "viewChanges" ||
                              header.key === "enquiryId" ||
                              header.key === "InvNo" ? (
                              // ||
                              // header.key === 'invoiceCreditNoteNo'
                              //   <AnchorItem onClick={() => handleRedirect('poNumber', row[header.key])}>
                              //   {row[header.key]}
                              // </AnchorItem>

                              //temporary static redirection for development
                              // <AnchorItem onClick={() => redirectHandler(row)}>
                              //   {row[header.key]}
                              // </AnchorItem>
                              <AnchorItem
                                onClick={() =>
                                  handleRedirectUrl(row, header.key)
                                }
                              >
                                {row[header.key]}
                              </AnchorItem>
                            ) : (
                              row[header.key]
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
                          ? tableHeaders.length + 1
                          : tableHeaders.length
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

        {showTotalData && tableData.length > 0 && (
          <TotalData>
            <div>
              <DataLabel>Net Value (excl tax): </DataLabel>
              <DataValue> 0.00</DataValue>
            </div>
            <div>
              <DataLabel>{t("non_po_based_report:taxValue.text")}: </DataLabel>
              <DataValue> 0.00</DataValue>
            </div>
            <div>
              <DataLabelTotal>Total: </DataLabelTotal>
              <DataValue> 0.00</DataValue>
            </div>
          </TotalData>
        )}
      </div>

      {soaData && (
        <SOAStyledTotalData>
          <div></div>
          <div className="soaData my-1 px-2 p-1 ">
            <SOADataLabel>{t("po_based_invoices:invoiceValue")}:</SOADataLabel>

              {Object.entries(soaData).map(([currency, value], index) => (
                <DataValue
                  key={currency}
                  style={{
                    borderLeft: index !== 0 && !isArabic ? '1.5px solid #0066b3' : 'none',
                    paddingLeft: !isArabic ? '5px' : '0',
                    borderRight: isArabic && index !== 0 ? '1.5px solid #0066b3' : 'none',
                    paddingRight: isArabic ? '7px' : '0',
                  }}
                >
                  {currency}:&nbsp;
                    <span style={{ fontWeight: 600 }}>
                      {Number(value).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                     })}
                    </span>
                </DataValue>
              ))}

            {/* <DataValue>USD: <span style={{ fontWeight: 600 }}>{soaData?.USD ? Number(soaData.USD).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 0}</span> </DataValue> */}
            {/* <DataValue style={{ 
              borderLeft: !isArabic ?'1.5px solid #0066b3' : 'none',
              paddingLeft: !isArabic ? '5px' : '0',
              borderRight: isArabic ? '1.5px solid #0066b3' : 'none',
              paddingRight: isArabic ? '7px' : '0',
            }}
               >
                AED: <span style={{ fontWeight: 600 }}>
                {soaData?.AED ? Number(soaData.AED).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 0}
                </span> 
              </DataValue>
            <DataValue style={{
               borderLeft: !isArabic ?'1.5px solid #0066b3' : 'none',
               paddingLeft: !isArabic ? '5px' : '0',
               borderRight: isArabic ? '1.5px solid #0066b3' : 'none',
               paddingRight: isArabic ? '7px' : '0',
               }}
               >
                EUR: <span style={{ fontWeight: 600, }}>
                  {soaData?.EUR ? Number(soaData.EUR).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 0}
                  </span>
                  </DataValue> */}
          </div>
        </SOAStyledTotalData>
      )}

      {!isLoading && pageMeta && pageMeta.total > 10 && showPagination && (
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
                borderRight: !isArabic ? "1px solid #2D2C2C" : 'none',
                borderLeft: isArabic ? "1px solid #2D2C2C" : 'none',
                fontSize: "15px",
                color: "#2D2C2C",
                fontWeight: 500,
              }}
              className="tableFooter"
            >
              <span style={{ color: "var(--brand-primary-color, #1956DD)", fontWeight: "500" }}>
                {pageMeta?.page}
              </span>{" "}
              {t("of")}
              <span> </span>
              {pageMeta?.pageCount}
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
              <span>{t("displaying")}</span>
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
                  onChange={(e) => handlePerPage(e.target.value)}
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
              <span>{t("perPage")}</span>
            </Box>
          </div>
          <Pagination
            count={pageMeta?.pageCount}
            //count={50}
            page={page}
            onChange={(event, newPage) => {
              handlePage(newPage);
            }}
            color="primary"
            sx={{
              ".MuiPaginationItem-root": {
                color: "#2D2C2C",
                fontWeight: 500,
                fontSize: "16px",
                opacity: "1 !important",
                "&:hover": {
                  backgroundColor: "var(--brand-primary-color-light, #E5EBFF)",
                  color: "var(--brand-primary-color, var(--brand-primary-color, $primary-color))",
                },
              },
              ".MuiPaginationItem-root.Mui-selected": {
                backgroundColor: "var(--brand-primary-color, var(--brand-primary-color, $primary-color))",
                color: "white",
                "&:hover": {
                  backgroundColor: "var(--brand-primary-color, var(--brand-primary-color, $primary-color))",
                  color: "white",
                },
              },
              ".MuiPaginationItem-previousNext":
                pageMeta?.pageCount > 1
                  ? {
                      color: "var(--brand-primary-color, var(--brand-primary-color, $primary-color))",
                      backgroundColor: "var(--brand-primary-color-light, #E5EBFF)",
                      borderRadius: "50%",
                      padding: "5px",
                      "&:hover": {
                        backgroundColor: "var(--brand-primary-color-light, #E5EBFF)",
                        color: "var(--brand-primary-color, var(--brand-primary-color, $primary-color))",
                      },
                    }
                  : {
                      color: "#bcbcbc",
                      backgroundColor: "#E5EBFF",
                      borderRadius: "50%",
                      padding: "5px",
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

export default TableLayout;
