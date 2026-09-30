import React from 'react'
import { useTranslation } from 'react-i18next'
import { Document, Page, Text, View, Font } from '@react-pdf/renderer'

import { pdfStyles } from './pdfStyle'
import { VENDOR_USER_TYPE } from 'constants/userType'
import AmiriRegular from "assets/fonts/Amiri-Regular.ttf"

const SoaHistoryPDF = ({ data, headerLabels, userType }) => {
  Font.register({
  family: 'Amiri',
  src: AmiriRegular,
});
  const isVendor = userType === VENDOR_USER_TYPE
  // Styles
  const columnWidths = isVendor
    ? {
        colType: { width: '5%' },
        colInvoiceCreditNoteNo: { width: '15%' },
        colCurrency: { width: '10%' },
        colInvoiceCreditNoteDate: { width: '15%' },
        colAmountPerCurrency: { width: '10%' },
        colDueDate: { width: '10%' },
        colStatus: { width: '15%' },
        colReconciliationComments: { width: '20%' }
      }
    : {
        colType: { width: '5%' },
        colInvoiceCreditNoteNo: { width: '15%' },
        colVendorName: { width: '10%' },
        colVendorCode: { width: '10%' },
        colCurrency: { width: '10%' },
        colInvoiceCreditNoteDate: { width: '12%' },
        colAmountPerCurrency: { width: '10%' },
        colDueDate: { width: '10%' },
        colStatus: { width: '12%' },
        colReconciliationComments: { width: '15%' }
      }
  const styles = pdfStyles(columnWidths)
  const { t } = useTranslation()
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.table}>
          {/* Header */}
          <View style={styles.tableRowHeader}>
            <Text style={[styles.tableCol, styles.colType]}>{headerLabels[0]}</Text>
            <Text style={[styles.tableCol, styles.colInvoiceCreditNoteNo]}>{headerLabels[1]}</Text>
            {!isVendor && (
              <>
                <Text style={[styles.tableCol, styles.colVendorName]}>{headerLabels[2]}</Text>
                <Text style={[styles.tableCol, styles.colVendorCode]}>{headerLabels[3]}</Text>
              </>
            )}
            <Text style={[styles.tableCol, styles.colCurrency]}>
              {headerLabels[isVendor ? 2 : 4]}
            </Text>
            <Text style={[styles.tableCol, styles.colInvoiceCreditNoteDate]}>
              {headerLabels[isVendor ? 3 : 5]}
            </Text>
            <Text style={[styles.tableCol, styles.colAmountPerCurrency]}>
              {headerLabels[isVendor ? 4 : 6]}
            </Text>
            <Text style={[styles.tableCol, styles.colDueDate]}>
              {headerLabels[isVendor ? 5 : 7]}
            </Text>
            <Text style={[styles.tableCol, styles.colStatus]}>
              {headerLabels[isVendor ? 6 : 8]}
            </Text>
            <Text style={[styles.tableCol, styles.colReconciliationComments]}>
              {headerLabels[isVendor ? 7 : 9]}
            </Text>
          </View>

          {/* Rows */}
          {data.map((item, idx) => (
            <View
              style={[idx % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd, styles.row]}
              key={idx}>
              <Text style={[styles.tableCol, styles.colType]}>{item.type}</Text>
              <Text style={[styles.tableCol, styles.colInvoiceCreditNoteNo]}>
                {item.invoiceCreditNoteNo}
              </Text>
              {!isVendor && (
                <>
                  <Text style={[styles.tableCol, styles.colVendorName]}>{item.vendorName}</Text>
                  <Text style={[styles.tableCol, styles.colVendorCode]}>{item.vendor_Code}</Text>
                </>
              )}
              <Text style={[styles.tableCol, styles.colCurrency]}>{item.currency}</Text>
              <Text style={[styles.tableCol, styles.colInvoiceCreditNoteDate]}>
                {item.invoiceCreditNoteDate}
              </Text>
              <Text style={[styles.tableCol, styles.colAmountPerCurrency]}>
                {item.amountPerCurrency}
              </Text>
              <Text style={[styles.tableCol, styles.colDueDate]}>{item.dueDate}</Text>
              <Text style={[styles.tableCol, styles.colStatus]}>{item.statusText}</Text>
              <Text style={[styles.tableCol, styles.colReconciliationComments]}>
                {item.reconciliationComments}
              </Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  )
}

export default SoaHistoryPDF
