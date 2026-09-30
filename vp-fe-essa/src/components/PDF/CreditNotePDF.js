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
import { VENDOR_USER_TYPE } from 'constants/userType';
// Styles
const columnWidths = {
  colCreditNo: { width: '20%' },
  colDate: { width: '20%' },
  colCurrency: { width: '20%' },
  colVal: { width: '20%' },
  colStatus: { width: '20%' },
};
const styles = pdfStyles(columnWidths);


const CreditNotePDF = ({ data, headerLabels, userType }) => {
  Font.register({
  family: 'Amiri',
  src: AmiriRegular,
});

  const { t } = useTranslation();
  const isVendor = userType === VENDOR_USER_TYPE;
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.table}>
          {/* Header */}
          <View style={styles.tableRowHeader}>
            <Text style={[styles.tableCol, styles.colCreditNo]}>{headerLabels[0]}</Text>
            {!isVendor && (
              <>
                <Text style={[styles.tableCol, styles.colDate]}>{headerLabels[1]}</Text>
                <Text style={[styles.tableCol, styles.colCurrency]}>{headerLabels[2]}</Text>
              </>
            )}
            <Text style={[styles.tableCol, styles.colDate]}>{headerLabels[isVendor ? 1 : 3]}</Text>
            <Text style={[styles.tableCol, styles.colCurrency]}>{headerLabels[isVendor ? 2 : 4]}</Text>
            <Text style={[styles.tableCol, styles.colVal]}>{headerLabels[isVendor ? 3 : 5]}</Text>
            <Text style={[styles.tableCol, styles.colStatus]}>{headerLabels[isVendor ? 4 : 6]}</Text>
          </View>

          {/* Rows */}
          {data.map((item, idx) => (
            <View style={[idx % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd, styles.row]} key={idx}>
              <Text style={[styles.tableCol, styles.colCreditNo]}>{item.creditNoteNo}</Text>
              {!isVendor && (
                <>
                  <Text style={[styles.tableCol, styles.colDate]}>{item.vendor_name}</Text>
                  <Text style={[styles.tableCol, styles.colCurrency]}>{item.vendor_code}</Text>
                </>
              )}
              <Text style={[styles.tableCol, styles.colDate]}>{item.date}</Text>
              <Text style={[styles.tableCol, styles.colCurrency]}>{item.currency}</Text>
              <Text style={[styles.tableCol, styles.colVal]}>{item.value}</Text>
              <Text style={[styles.tableCol, styles.colStatus]}>{item.status}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}

export default CreditNotePDF;
