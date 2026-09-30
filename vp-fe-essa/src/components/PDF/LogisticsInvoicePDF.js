import React from 'react'
import { useTranslation } from 'react-i18next'
import { Document, Page, Text, View,Font } from '@react-pdf/renderer'

import { pdfStyles } from './pdfStyle'
import { ADMIN_USER_TYPE, BUSINESS_USER_TYPE, VENDOR_USER_TYPE } from 'constants/userType'
import AmiriRegular from "assets/fonts/Amiri-Regular.ttf"

// const columnWidths = {
//   colInvoiceNo: { width: '20%' },
//   colVendorName: { width: '20%' },
//   colVendorCode: { width: '20%' },
//   colDate: { width: '10%' },
//   colCurrency: { width: '20%' },
//   colInvoiceVal: { width: '20%' },
//   colStatus: { width: '10%' },
// };

const LogisticsInvoicePDF = ({ data, headerLabels, userType }) => {
  Font.register({
  family: 'Amiri',
  src: AmiriRegular,
});
  const showVendorDetails = userType === VENDOR_USER_TYPE

  const columnWidths = showVendorDetails
    ? {
      colInvoiceNo: { width: '20%' },
      colDate: { width: '20%' },
      colCurrency: { width: '20%' },
      colInvoiceVal: { width: '20%' },
      colStatus: { width: '20%' }
    }
    : {
      colInvoiceNo: { width: '20%' },
      colVendorName: { width: '20%' },
      colVendorCode: { width: '20%' },
      colDate: { width: '10%' },
      colCurrency: { width: '10%' },
      colInvoiceVal: { width: '20%' },
      colStatus: { width: '20%' }
    }
  const styles = pdfStyles(columnWidths)
  const { t } = useTranslation()

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.table}>
          {/* Header */}
          <View style={styles.tableRowHeader}>
            <Text style={[styles.tableCol, styles.colInvoiceNo]}>{headerLabels[0]}</Text>
            {!showVendorDetails && (
              <>
                <Text style={[styles.tableCol, styles.colVendorName]}>{headerLabels[1]}</Text>
                <Text style={[styles.tableCol, styles.colVendorCode]}>{headerLabels[2]}</Text>
              </>
            )}
            <Text style={[styles.tableCol, styles.colDate]}>
              {headerLabels[showVendorDetails ? 1 : 3]}
            </Text>
            <Text style={[styles.tableCol, styles.colCurrency]}>
              {headerLabels[showVendorDetails ? 2 : 4]}
            </Text>
            <Text style={[styles.tableCol, styles.colInvoiceVal]}>
              {headerLabels[showVendorDetails ? 3 : 5]}
            </Text>
            <Text style={[styles.tableCol, styles.colStatus]}>
              {headerLabels[showVendorDetails ? 4 : 6]}
            </Text>
          </View>

          {/* Rows */}
          {data.map((item, idx) => (
            <View
              key={idx}
              style={[idx % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd, styles.row]}>
              <Text style={[styles.tableCol, styles.colInvoiceNo]}>{item.invoice_number}</Text>
              {!showVendorDetails && (
                <>
                  <Text style={[styles.tableCol, styles.colVendorName]}>{item.vendor_name}</Text>
                  <Text style={[styles.tableCol, styles.colVendorCode]}>{item.vendor_code}</Text>
                </>
              )}
              <Text style={[styles.tableCol, styles.colDate]}>{item.invoice_date}</Text>
              <Text style={[styles.tableCol, styles.colCurrency]}>{item.currency}</Text>
              <Text style={[styles.tableCol, styles.colInvoiceVal]}>{item.invoiceValue}</Text>
              <Text style={[styles.tableCol, styles.colStatus]}>{item.status}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  )
}

export default LogisticsInvoicePDF
