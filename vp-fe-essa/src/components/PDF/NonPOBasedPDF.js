import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  Font
} from '@react-pdf/renderer';
import { pdfStyles } from './pdfStyle';
import { VENDOR_USER_TYPE } from 'constants/userType';
import AmiriRegular from "assets/fonts/Amiri-Regular.ttf";

const NonPOBasedPDF = ({ data, headerLabels, userType }) => {
  Font.register({
    family: 'Amiri',
    src: AmiriRegular,
  });

  const isVendor = userType === VENDOR_USER_TYPE;

  // Column widths based on user type
  const columnWidths = isVendor
    ? {
        colInvoiceNo: { width: '20%' },
        colInvoiceDate: { width: '20%' },
        colCurrency: { width: '10%' },
        colInvoiceVal: { width: '15%' },
        colInvoiceDueDate: { width: '20%' },
        colStatus: { width: '15%' },
      }
    : {
        colInvoiceNo: { width: '15%' },
        colVendorName: { width: '20%' },
        colVendorCode: { width: '10%' },
        colInvoiceDate: { width: '15%' },
        colCurrency: { width: '8%' },
        colInvoiceVal: { width: '12%' },
        colInvoiceDueDate: { width: '15%' },
        colStatus: { width: '10%' },
      };

  const styles = pdfStyles(columnWidths);

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.table}>
          {/* Header */}
          <View style={styles.tableRowHeader}>
            <Text style={[styles.tableCol, styles.colInvoiceNo]}>{headerLabels[0]}</Text>
            {!isVendor && (
              <>
                <Text style={[styles.tableCol, styles.colVendorName]}>{headerLabels[1]}</Text>
                <Text style={[styles.tableCol, styles.colVendorCode]}>{headerLabels[2]}</Text>
              </>
            )}
            <Text style={[styles.tableCol, styles.colInvoiceDate]}>{headerLabels[isVendor ? 1 : 3]}</Text>
            <Text style={[styles.tableCol, styles.colCurrency]}>{headerLabels[isVendor ? 2 : 4]}</Text>
            <Text style={[styles.tableCol, styles.colInvoiceVal]}>{headerLabels[isVendor ? 3 : 5]}</Text>
            <Text style={[styles.tableCol, styles.colInvoiceDueDate]}>{headerLabels[isVendor ? 4 : 6]}</Text>
            <Text style={[styles.tableCol, styles.colStatus]}>{headerLabels[isVendor ? 5 : 7]}</Text>
          </View>

          {/* Rows */}
          {data.map((item, idx) => (
            <View
              key={idx}
              style={[
                idx % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd,
                styles.row
              ]}
            >
              <Text style={[styles.tableCol, styles.colInvoiceNo]}>{item.invoiceNo}</Text>
              {!isVendor && (
                <>
                  <Text style={[styles.tableCol, styles.colVendorName]}>{item.vendor_name}</Text>
                  <Text style={[styles.tableCol, styles.colVendorCode]}>{item.vendor_code}</Text>
                </>
              )}
              <Text style={[styles.tableCol, styles.colInvoiceDate]}>{item.date}</Text>
              <Text style={[styles.tableCol, styles.colCurrency]}>{item.currency}</Text>
              <Text style={[styles.tableCol, styles.colInvoiceVal]}>{item.invoiceValue}</Text>
              <Text style={[styles.tableCol, styles.colInvoiceDueDate]}>{item.invoiceDueDate}</Text>
              <Text style={[styles.tableCol, styles.colStatus]}>{item.status}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
};

export default NonPOBasedPDF;
