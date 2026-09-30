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
  colField: { width: '20%' },
  colOldValue: { width: '40%' },
  colNewValue: { width: '40%' },
};
const styles = pdfStyles(columnWidths);

const AdminVendorsUpdatesDetailPDF = ({ data, headerLabels }) => {
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
            <Text style={[styles.tableCol, styles.colField]}>{headerLabels[0]}</Text>
            <Text style={[styles.tableCol, styles.colOldValue]}>{headerLabels[1]}</Text>
            <Text style={[styles.tableCol, styles.colCountry]}>{headerLabels[2]}</Text>
          </View>

          {/* Rows */}
          {data.map((item, idx) => (
            <View
              style={[
                idx % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd,
                styles.row,
              ]}
              key={idx}
            >
              <Text style={[styles.tableCol, styles.colField]}>{item.field}</Text>
              <Text style={[styles.tableCol, styles.colOldValue]}>{item.oldValue}</Text>
              <Text style={[styles.tableCol, styles.colNewValue]}>{item.newValue}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
};


export default AdminVendorsUpdatesDetailPDF;
