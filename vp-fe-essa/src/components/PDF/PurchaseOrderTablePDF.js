import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  Font
} from '@react-pdf/renderer';

import {pdfStyles} from './pdfStyle'
import { Landscape } from '@mui/icons-material';
import { VENDOR_USER_TYPE } from 'constants/userType';
import AmiriRegular from "assets/fonts/Amiri-Regular.ttf"
// Styles

const PurchaseOrderTablePDF = ({data, headerLabels, userType}) => {
  Font.register({
  family: 'Amiri',
  src: AmiriRegular,
});
  const isVendor = userType === VENDOR_USER_TYPE;

  const columnWidths = isVendor
    ? {
        colPO: { width: '15%' },
        colDate: { width: '9%' },
        colRef: { width: '18%' },
        colValue: { width: '10%' },
        colCurrency: { width: '12%' },
        colCreator: { width: '25%' },
        colStatus: {width: '11%' }
      }
    : {
        colPO: { width: '12%' },
        colVendorName: { width: '15%' },
        colVendorCode: { width: '11%' },
        colDate: { width: '9%' },
        colRef: { width: '13%' },
        colValue: { width: '10%' },
        colCurrency: { width: '9%' },
        colCreator: { width: '12%' },
        colStatus: {width: '9%' }
      };



  const styles = pdfStyles(columnWidths);

  return(
  <Document>
    <Page size="A4" orientation="landscape" style={styles.page}>
      <View style={styles.table}>
        {/* Header */}
        <View style={styles.tableRowHeader}>
          <Text style={[styles.tableCol, styles.colPO]}>{headerLabels[0]}</Text>
          {!isVendor && (
              <>
                <Text style={[styles.tableCol, styles.colVendorName]}>{headerLabels[1]}</Text>
                <Text style={[styles.tableCol, styles.colVendorCode]}>{headerLabels[2]}</Text>
              </>
            )}

          <Text style={[styles.tableCol, styles.colDate]}>{headerLabels[isVendor ? 1 : 3]}</Text>
          <Text style={[styles.tableCol, styles.colRef]}>{headerLabels[isVendor ? 2 : 4]}</Text>
          <Text style={[styles.tableCol, styles.colValue]}>{headerLabels[isVendor ? 3 : 5]}</Text>
          <Text style={[styles.tableCol, styles.colCurrency]}>{headerLabels[isVendor ? 4 : 6]}</Text>
          <Text style={[styles.tableCol, styles.colCreator]}>{headerLabels[isVendor ? 5 : 7]}</Text>
           <Text style={[styles.tableCol, styles.colStatus]}>{headerLabels[isVendor ? 6 : 8]}</Text>
        </View>

        {/* Rows */}
        {data?.map((item, idx) => (
          <View style={[idx % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd,styles.row]} key={idx}>
            <Text style={[styles.tableCol, styles.colPO]}>{item?.PONo}</Text>
            {!isVendor && (
                <>
                  <Text style={[styles.tableCol, styles.colVendorName]}>{item?.vendor_name}</Text>
                  <Text style={[styles.tableCol, styles.colVendorCode]}>{item?.vendor_code}</Text>
                </>
            )}
            <Text style={[styles.tableCol, styles.colDate]}>{item?.po_date}</Text>
            <Text style={[styles.tableCol, styles.colRef]}>{item?.reference_number}</Text>
            <Text style={[styles.tableCol, styles.colValue]}>{item?.po_value}</Text>
            <Text style={[styles.tableCol, styles.colCurrency]}>{item?.po_currency}</Text>
            <Text style={[styles.tableCol, styles.colCreator]}>{item?.created_person_id}</Text>
             <Text style={[styles.tableCol, styles.colStatus]}>{item?.status}</Text>
          </View>
        ))}
      </View>
    </Page>
  </Document>
  )
};

export default PurchaseOrderTablePDF;
