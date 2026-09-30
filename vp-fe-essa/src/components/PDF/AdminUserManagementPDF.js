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
  colSNo: { width: '25%' },
  colName: { width: '25%' },
  colEmail: { width: '25%' },
  colRole: { width: '25%' },
  // colStatus: { width: '20%' },
};
const styles = pdfStyles(columnWidths);

const AdminUserManagementPDF = ({ data, headerLabels }) => {

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
            <Text style={[styles.tableCol, styles.colSNo]}>{headerLabels[0]?.label}</Text>
            <Text style={[styles.tableCol, styles.colName]}>{headerLabels[1]?.label}</Text>
            <Text style={[styles.tableCol, styles.colEmail]}>{headerLabels[2]?.label}</Text>
            <Text style={[styles.tableCol, styles.colRole]}>{headerLabels[3]?.label}</Text>
            {/* <Text style={[styles.tableCol, styles.colStatus]}>{headerLabels[4]}</Text> */}
          </View>

          {/* Rows */}
          {data.map((item, idx) => (
            <View style={[idx % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd, styles.row]} key={idx}>
              {/* <Text style={[styles.tableCol, styles.colSNo]}>{item?.sNo}</Text> */}
              <Text style={[styles.tableCol, styles.colName]}>{item?.name}</Text>
              <Text style={[styles.tableCol, styles.colEmail]}>{item?.email}</Text>
              <Text style={[styles.tableCol, styles.colRole]}>{item?.role}</Text>
              <Text style={[styles.tableCol, styles.colSNo]}>{item?.status}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}

export default AdminUserManagementPDF;
