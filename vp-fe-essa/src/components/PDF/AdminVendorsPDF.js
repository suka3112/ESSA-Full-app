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
  colName: { width: '20%' },
  colCode: { width: '20%' },
  colCountry: { width: '20%' },
  colEmail: { width: '20%' },
  colStatus: { width: '20%' }
};
const styles = pdfStyles(columnWidths);

const AdminVendorsPDF = ({ data, headerLabels }) => {

  Font.register({
  family: 'Amiri',
  src: AmiriRegular,
});

  const { t } = useTranslation();
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.table}>
          {/* Header */}
          <View style={styles.tableRowHeader}>
            <Text style={[styles.tableCol, styles.colName]}>{headerLabels[0]}</Text>
            <Text style={[styles.tableCol, styles.colCode]}>{headerLabels[1]}</Text>
            <Text style={[styles.tableCol, styles.colCountry]}>{headerLabels[2]}</Text>
            <Text style={[styles.tableCol, styles.colEmail]}>{headerLabels[3]}</Text>
            <Text style={[styles.tableCol, styles.colStatus]}>{headerLabels[4]}</Text>
          </View>

          {/* Rows */}
          {data.map((item, idx) => (
            <View style={[idx % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd, styles.row]} key={idx}>
              <Text style={[styles.tableCol, styles.colName]}>{item.sNo}</Text>
              <Text style={[styles.tableCol, styles.colCode]}>{item.name}</Text>
              <Text style={[styles.tableCol, styles.colCountry]}>{item.email}</Text>
              <Text style={[styles.tableCol, styles.colRole]}>{item.role}</Text>
              <Text style={[styles.tableCol, styles.colStatus]}>{item.status}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}

export default AdminVendorsPDF;
