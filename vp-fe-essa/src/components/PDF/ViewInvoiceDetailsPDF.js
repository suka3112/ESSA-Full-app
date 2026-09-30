import React from 'react';
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
    colLineNo: { width: '11%' },
  colVendorInvoiceNo: { width: '10%' },
  // colPONo: { width: '12%' },
  // colPOItemNo: { width: '10%' },
  colMatCode: { width: '21%' },
  colMatDesc: { width: '30%' },
  // colUOM: { width: '4%' },
  // colPOQuantity: { width: '9%' },
  colIrQuantity: { width: '15%' }, 
  colAmount: { width: '13%' }, 
  // colTaxAmount: { width: '10%' }, 
}; 
const styles = pdfStyles(columnWidths);

const ViewInvoiceDetailsPDF = ({data, headerLabels}) => {
  Font.register({
  family: 'Amiri',
  src: AmiriRegular,
});
return(
  <Document>
    <Page size="A4" orientation="landscape" style={styles.page}>
      <View style={styles.table}>
        {/* Header */}
        <View style={styles.tableRowHeader}>
          <Text style={[styles.tableCol, styles.colLineNo]}>{headerLabels[0]}</Text>
          <Text style={[styles.tableCol, styles.colVendorInvoiceNo]}>{headerLabels[1]}</Text>
          {/* <Text style={[styles.tableCol, styles.colPONo]}>{headerLabels[2]}</Text> */}
          {/* <Text style={[styles.tableCol, styles.colPOItemNo]}>{headerLabels[3]}</Text> */}
          <Text style={[styles.tableCol, styles.colMatCode]}>{headerLabels[2]}</Text>
          <Text style={[styles.tableCol, styles.colMatDesc]}>{headerLabels[3]}</Text>
          {/* <Text style={[styles.tableCol, styles.colUOM]}>{headerLabels[6]}</Text> */}
          {/* <Text style={[styles.tableCol, styles.colPOQuantity]}>{headerLabels[7]}</Text> */}
          <Text style={[styles.tableCol, styles.colIrQuantity]}>{headerLabels[4]}</Text>
          <Text style={[styles.tableCol, styles.colAmount]}>{headerLabels[5]}</Text>
          {/* <Text style={[styles.tableCol, styles.colTaxAmount]}>{headerLabels[10]}</Text> */}
        </View>

        {/* Rows */}
        {data.map((item, idx) => (
          <View style={[idx % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd,styles.row]} key={idx}>
             <Text style={[styles.tableCol, styles.colLineNo]}>{item.line_item_no}</Text>
            <Text style={[styles.tableCol, styles.colVendorInvoiceNo]}>{item.vendor_invoice_no}</Text>
            {/* <Text style={[styles.tableCol, styles.colPONo]}>{item.po_no}</Text> */}
            {/* <Text style={[styles.tableCol, styles.colPOItemNo]}>{item.po_item_no}</Text> */}
            <Text style={[styles.tableCol, styles.colMatCode]}>{item.material_code}</Text>
            <Text style={[styles.tableCol, styles.colMatDesc]}>{item.material_description}</Text>
            {/* <Text style={[styles.tableCol, styles.colUOM]}>{item.uom}</Text> */}
            {/* <Text style={[styles.tableCol, styles.colPOQuantity]}>{item.po_quantity}</Text> */}
            <Text style={[styles.tableCol, styles.colIrQuantity]}>{item.ir_quantity}</Text>
            <Text style={[styles.tableCol, styles.colAmount]}>{item.amount}</Text>
            {/* <Text style={[styles.tableCol, styles.colTaxAmount]}>{item.tax_amount}</Text> */}
          </View>
        ))}
      </View>
    </Page>
  </Document>
);
}

export default ViewInvoiceDetailsPDF;
