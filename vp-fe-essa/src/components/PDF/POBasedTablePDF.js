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
  colInvoiceNo: { width: '20%' },
  colDate: { width: '20%' },
  colCurrency: { width: '10%' },
  colInvoiceVal: { width: '20%' },
  colInvoiceDueDate: { width: '20%' },
  colStatus: { width: '10%' },
};
const styles = pdfStyles(columnWidths);

const POBasedTablePDF = ({ data, headerLabels, pending = false }) => {
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
            <Text style={[styles.tableCol, styles.colInvoiceNo]}>{headerLabels[0]}</Text>
            <Text style={[styles.tableCol, styles.colDate]}>{headerLabels[1]}</Text>
            <Text style={[styles.tableCol, styles.colCurrency]}>{headerLabels[2]}</Text>
            <Text style={[styles.tableCol, styles.colInvoiceVal]}>{headerLabels[3]}</Text>
            <Text style={[styles.tableCol, styles.colInvoiceDueDate]}>{headerLabels[4]}</Text>
            <Text style={[styles.tableCol, styles.colStatus]}>{headerLabels[5]}</Text>
          </View>

          {/* Rows */}
          {data.map((item, idx) => (
            <View style={[idx % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd, styles.row]} key={idx}>
              <Text style={[styles.tableCol, styles.colInvoiceNo]}>{item.invoiceNo}</Text>
              <Text style={[styles.tableCol, styles.colDate]}>{item.date}</Text>
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
}

export default POBasedTablePDF;
