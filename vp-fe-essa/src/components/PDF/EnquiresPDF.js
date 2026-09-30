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
  colInquiryType: { width: '20%' },
  colSubject: { width: '20%' },
  colContact: { width: '20%' },
  colDate: { width: '20%' },
  colStatus: { width: '20%' },
};
const styles = pdfStyles(columnWidths);

const EnquiresPDF = ({ data, headerLabels, userType }) => {
  Font.register({
  family: 'Amiri',
  src: AmiriRegular,
});
  const isVendor = userType === VENDOR_USER_TYPE;
  const { t } = useTranslation();
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.table}>
          {/* Header */}
          <View style={styles.tableRowHeader}>
            <Text style={[styles.tableCol, styles.colInquiryType]}>{headerLabels[0]}</Text>
            {!isVendor && (
              <>
                <Text style={[styles.tableCol, styles.colDate]}>{headerLabels[1]}</Text>
                <Text style={[styles.tableCol, styles.colStatus]}>{headerLabels[2]}</Text>
              </>
            )}
            <Text style={[styles.tableCol, styles.colSubject]}>{headerLabels[isVendor ? 1 : 3]}</Text>
            <Text style={[styles.tableCol, styles.colContact]}>{headerLabels[isVendor ? 2 : 4]}</Text>
            <Text style={[styles.tableCol, styles.colDate]}>{headerLabels[isVendor ? 3 : 5]}</Text>
            <Text style={[styles.tableCol, styles.colStatus]}>{headerLabels[isVendor ? 4 : 6]}</Text>
            <Text style={[styles.tableCol, styles.colStatus]}>{headerLabels[isVendor ? 5 : 7]}</Text>
          </View>

          {/* Rows */}
          {data?.map((item, idx) => (
            <View style={[idx % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd, styles.row]} key={idx}>
              <Text style={[styles.tableCol, styles.colInquiryType]}>{item.enquiryType}</Text>
              {!isVendor && (
                <>
                  <Text style={[styles.tableCol, styles.colDate]}>{item?.vendor_name}</Text>
                  <Text style={[styles.tableCol, styles.colStatus]}>{item?.vendor_code}</Text>
                </>
              )}
              <Text style={[styles.tableCol, styles.colInquiryType]}>{item?.enquiryId}</Text>
              <Text style={[styles.tableCol, styles.colSubject]}>{item?.subject}</Text>
              <Text style={[styles.tableCol, styles.colContact]}>{item?.assignedContactPerson}</Text>
              <Text style={[styles.tableCol, styles.colDate]}>{item?.date}</Text>
              <Text style={[styles.tableCol, styles.colStatus]}>{item?.status}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}

export default EnquiresPDF;
