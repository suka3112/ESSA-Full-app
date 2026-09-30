import React from 'react';
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
  colGrNo: { width: '10%' },
  colItemNo: { width: '8%' },
  // colPO: { width: '10%' },
  colItemPO: { width: '10%' },
  colMatCode: { width: '17%' },
  colMatDesc: { width: '30%' },
  colUOM: { width: '5%' },
  colQuantity: { width: '10%' },
  colVal: { width: '10%' },
};
const styles = pdfStyles(columnWidths);

const GrDetailsTablePDF = ({ data, headerLabels }) => {
  Font.register({
  family: 'Amiri',
  src: AmiriRegular,
})
return(
  <Document>
    <Page size="A4" orientation="landscape" style={styles.page}>
      <View style={styles.table}>
        {/* Header */}
        <View style={styles.tableRowHeader}>
          <Text style={[styles.tableCol, styles.colGrNo]}>{headerLabels[0]}</Text>
          <Text style={[styles.tableCol, styles.colItemNo]}>{headerLabels[1]}</Text>
          {/* <Text style={[styles.tableCol, styles.colPO]}>{headerLabels[2]}</Text> */}
          <Text style={[styles.tableCol, styles.colItemPO]}>{headerLabels[2]}</Text>
          <Text style={[styles.tableCol, styles.colMatCode]}>{headerLabels[3]}</Text>
          <Text style={[styles.tableCol, styles.colMatDesc]}>{headerLabels[4]}</Text>
          <Text style={[styles.tableCol, styles.colUOM]}>{headerLabels[5]}</Text>
          <Text style={[styles.tableCol, styles.colQuantity]}>{headerLabels[6]}</Text>
          <Text style={[styles.tableCol, styles.colVal]}>{headerLabels[7]}</Text>
        </View>

        {/* Rows */}
        {data.map((item, idx) => (
          <View style={[idx % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd, styles.row]} key={idx}>
            <Text style={[styles.tableCol, styles.colGrNo]}>{item.gr_number}</Text>
            <Text style={[styles.tableCol, styles.colItemNo]}>{item.gr_item_number}</Text>
            {/* <Text style={[styles.tableCol, styles.colPO]}>{item.po_numbers}</Text> */}
            <Text style={[styles.tableCol, styles.colItemPO]}>{item.po_item_number}</Text>
            <Text style={[styles.tableCol, styles.colMatCode]}>{item.material_code}</Text>
            <Text style={[styles.tableCol, styles.colMatDesc]}>{item.material_description}</Text>
            <Text style={[styles.tableCol, styles.colUOM]}>{item.uom}</Text>
            <Text style={[styles.tableCol, styles.colQuantity]}>{item.gr_quantity}</Text>
            <Text style={[styles.tableCol, styles.colVal]}>{item.gr_value}</Text>
          </View>
        ))}
      </View>
    </Page>
  </Document>
);
}

export default GrDetailsTablePDF;
