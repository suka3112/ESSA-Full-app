import React from 'react';
import { useTranslation } from 'react-i18next'
import {
  Document,
  Page,
  Text,
  View,
  Font
} from '@react-pdf/renderer';
import AmiriRegular from 'assets/fonts/Amiri-Regular.ttf'

import { pdfStyles } from './pdfStyle'
import { VENDOR_USER_TYPE } from 'constants/userType';
// Styles


const AdvancePaymentListPDF = ({ data, headerLabels, userType }) => {
  // const { i18n } = useTranslation();
  // const isArabic = i18n.language === 'ar';

  const isVendor = userType === VENDOR_USER_TYPE;

  Font.register({
  family: 'Amiri',
  src: AmiriRegular,
});

  const columnWidths = isVendor
    ? {
      colInvoiceNo: { width: '20%' },
      colType: { width: '10%' },
      colAdvancePaymentVal: { width: '20%' },
      colPerformaInvoiceNumber: { width: '20%' },
      colDate: { width: '10%' },
      colStatus: { width: '20%' },
    }
    : {
      colInvoiceNo: { width: '20%' },
      colVendorName: { width: '10%' },
      colVendorCode: { width: '10%' },
      colType: { width: '10%' },
      colAdvancePaymentVal: { width: '10%' },
      colPerformaInvoiceNumber: { width: '10%' },
      colDate: { width: '10%' },
      colStatus: { width: '20%' },
    };
  const styles = pdfStyles(columnWidths);
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={[styles.page]}>
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
            <Text style={[styles.tableCol, styles.colType]}>{headerLabels[isVendor ? 1 : 3]}</Text>
            <Text style={[styles.tableCol, styles.colAdvancePaymentVal]}>{headerLabels[isVendor ? 2 : 4]}</Text>
            <Text style={[styles.tableCol, styles.colPerformaInvoiceNumber]}>{headerLabels[isVendor ? 3 : 5]}</Text>
            <Text style={[styles.tableCol, styles.colDate]}>{headerLabels[isVendor ? 4 : 6]}</Text>
            <Text style={[styles.tableCol, styles.colStatus]}>{headerLabels[isVendor ? 5 : 7]}</Text>
          </View>

          {/* Rows */}
          {data.map((item, idx) => (
            <View style={[idx % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd, styles.row]} key={idx}>
              <Text style={[styles.tableCol, styles.colInvoiceNo]}>{item.invoiceNo}</Text>
              {!isVendor && (
                <>
                  <Text style={[styles.tableCol, styles.colVendorName]}>{item.vendor_name}</Text>
                  <Text style={[styles.tableCol, styles.colVendorCode]}>{item.vendor_code}</Text>
                </>
              )}
              <Text style={[styles.tableCol, styles.colType]}>{item.invoiceType}</Text>
              <Text style={[styles.tableCol, styles.colAdvancePaymentVal]}>{item.advancePaymentValue}</Text>
              <Text style={[styles.tableCol, styles.colPerformaInvoiceNumber]}>{item.PerformaInvoiceNumber}</Text>
              <Text style={[styles.tableCol, styles.colDate]}>{item.date}</Text>
              <Text style={[styles.tableCol, styles.colStatus]}>{item.status}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}

export default AdvancePaymentListPDF;
