import React from 'react';
import { useTranslation } from 'react-i18next'
import {
  Document,
  Page,
  Text,
  View,
  Font
} from '@react-pdf/renderer';
import AmiriRegular from "assets/fonts/Amiri-Regular.ttf"

import { pdfStyles } from './pdfStyle'
// Styles
const columnWidths = {
  colSNo: { width: '10%' },
  colMonth: { width: '15%' },
  colYear: { width: '11%' },
  colTotalAmt: { width: '15%' },
  colInvoiceCreated: { width: '13%' },
  colInvoicePending: { width: '13%' },
  colInvoiceApproved: { width: '13%' },
  colInvoiceRejected: { width: '10%' },
};
const styles = pdfStyles(columnWidths);

const LogisticsListPDF = ({ data, headerLabels }) => {
  Font.register({
  family: 'Amiri',
  src: AmiriRegular,
});
  const { t } = useTranslation();
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.table}>
          {/* Header */}
          <View style={styles.tableRowHeader}>
            <Text style={[styles.tableCol, styles.colSNo]}>{headerLabels[0]}</Text>
            <Text style={[styles.tableCol, styles.colMonth]}>{headerLabels[1]}</Text>
            <Text style={[styles.tableCol, styles.colYear]}>{headerLabels[2]}</Text>
            <Text style={[styles.tableCol, styles.colTotalAmt]}>{headerLabels[3]}</Text>
            <Text style={[styles.tableCol, styles.colInvoiceCreated]}>{headerLabels[4]}</Text>
            <Text style={[styles.tableCol, styles.colInvoicePending]}>{headerLabels[5]}</Text>
            <Text style={[styles.tableCol, styles.colInvoiceApproved]}>{headerLabels[6]}</Text>
            <Text style={[styles.tableCol, styles.colInvoiceRejected]}>{headerLabels[7]}</Text>
          </View>

          {/* Rows */}
          {data.map((item, idx) => (
            <View style={[idx % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd, styles.row]} key={idx}>
              <Text style={[styles.tableCol, styles.colSNo]}>{item.sNo}</Text>
              <Text style={[styles.tableCol, styles.colMonth]}>{item.month}</Text>
              <Text style={[styles.tableCol, styles.colYear]}>{item.year}</Text>
              <Text style={[styles.tableCol, styles.colTotalAmt]}>{item.totalAmount}</Text>
              <Text style={[styles.tableCol, styles.colInvoiceCreated]}>{item.invoiceCreated}</Text>
              <Text style={[styles.tableCol, styles.colInvoicePending]}>{item.invoicePending}</Text>
              <Text style={[styles.tableCol, styles.colInvoiceApproved]}>{item.invoiceApproved}</Text>
              <Text style={[styles.tableCol, styles.colInvoiceRejected]}>{item.invoiceRejected}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}

export default LogisticsListPDF;
