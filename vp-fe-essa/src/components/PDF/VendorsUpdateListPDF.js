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

import {pdfStyles} from './pdfStyle'
// Styles
const columnWidths = {
  colVendorName: { width: '20%' },
  colVendorCode: { width: '20%' },
  colCountry: { width: '20%' },
  colEmail: { width: '20%' },
  colStatus: { width: '20%' },
};
const styles = pdfStyles(columnWidths);

const VendorsUpdateListPDF = ({data, headerLabels}) => {
  Font.register({
  family: 'Amiri',
  src: AmiriRegular,
});
const { t } =useTranslation();
return(
  <Document>
    <Page size="A4"  style={styles.page}>
      <View style={styles.table}>
        {/* Header */}
        <View style={styles.tableRowHeader}>
          <Text style={[styles.tableCol, styles.colVendorName]}>{headerLabels[0]}</Text>
          <Text style={[styles.tableCol, styles.colVendorCode]}>{headerLabels[1]}</Text>
          <Text style={[styles.tableCol, styles.colCountry]}>{headerLabels[2]}</Text>
          <Text style={[styles.tableCol, styles.colEmail]}>{headerLabels[3]}</Text>
          <Text style={[styles.tableCol, styles.colStatus]}>{headerLabels[4]}</Text>
        </View>

        {/* Rows */}
        {data.map((item, idx) => (
          <View style={[idx % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd,styles.row]} key={idx}>
            <Text style={[styles.tableCol, styles.colVendorName]}>{item.vendorName}</Text>
            <Text style={[styles.tableCol, styles.colVendorCode]}>{item.vendorCode}</Text>
            <Text style={[styles.tableCol, styles.colCountry]}>{item.country}</Text>
            <Text style={[styles.tableCol, styles.colEmail]}>{item.email}</Text>
            <Text style={[styles.tableCol, styles.colStatus]}>{item.status}</Text>
          </View>
        ))}
      </View>
    </Page>
  </Document>
);
}

export default VendorsUpdateListPDF;
