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
  colInvoiceNo: { width: '15%' },
  colDate: { width: '17%' },
  colCurrency: { width: '10%' },
  colInvoiceVal: { width: '20%' },
  colInvoiceDueDate: { width: '17%' },
  colStatus: { width: '20%' },
};
const styles = pdfStyles(columnWidths);
Font.register({
  family: 'Amiri',
  src: AmiriRegular,
});

const PendingInvoiceTablePDF = ({ data, headerLabels, pending = false }) => {
  const { t } = useTranslation();
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.table}>
          {/* Header */}
          <View style={styles.tableRowHeader}>
            <Text style={[styles.tableCol, styles.colInvoiceNo]}>{headerLabels[0]}</Text>
            <Text style={[styles.tableCol, styles.colInvoiceNo]}>{headerLabels[1]}</Text>
            <Text style={[styles.tableCol, styles.colDate]}>{headerLabels[2]}</Text>
            <Text style={[styles.tableCol, styles.colCurrency]}>{headerLabels[3]}</Text>
            <Text style={[styles.tableCol, styles.colInvoiceVal]}>{headerLabels[4]}</Text>
            <Text style={[styles.tableCol, styles.colInvoiceDueDate]}>{headerLabels[5]}</Text>
            <Text style={[styles.tableCol, styles.colStatus]}>{headerLabels[6]}</Text>
            {/* <Text style={[styles.tableCol, styles.colStatus]}>{headerLabels[6]}</Text> */}
          </View>

          {/* Rows */}
          {data.map((item, idx) => (
            <View style={[idx % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd, styles.row]} key={idx}>
              <Text style={[styles.tableCol, styles.colInvoiceNo]}>{item.typeOfInvoice}</Text>
              <Text style={[styles.tableCol, styles.colInvoiceNo]}>{item.invoiceNo}</Text>
              <Text style={[styles.tableCol, styles.colDate]}>{item.date}</Text>
              <Text style={[styles.tableCol, styles.colCurrency]}>{item.currency}</Text>
              <Text style={[styles.tableCol, styles.colInvoiceVal]}>{item.invoiceValue}</Text>
              <Text style={[styles.tableCol, styles.colInvoiceDueDate]}>{item.invoiceDueDate}</Text>
              <Text style={[styles.tableCol, styles.colStatus]}>{item.status}</Text>
              {/* <Text style={[styles.tableCol, styles.colStatus]}>{item.status}</Text> */}
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}

export default PendingInvoiceTablePDF;
