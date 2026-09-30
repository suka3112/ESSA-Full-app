import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  Font
} from '@react-pdf/renderer';

import { pdfStyles } from './pdfStyle';
import { pdfHeaderStyles } from './PDFHeaderStyles';
import dayjs from 'dayjs';
import { VENDOR_USER_TYPE } from 'constants/userType';
import { useTranslation } from 'react-i18next';
import AmiriRegular from "assets/fonts/Amiri-Regular.ttf"
import AmiriBold from "assets/fonts/Amiri-Bold.ttf"

// Column widths
const columnWidths = {
  colItemPO: { width: '6%' },
  colStatus: { width: '5%' },
  colMatCode: { width: '10%' },
  colMatDesc: { width: '15%' },
  colUOM: { width: '5%' },
  colPOQuantity: { width: '10%' },
  colOpenQuantity: { width: '8%' },
  colNetPrice: { width: '8%' },
  colGrQuantity: { width: '9%' },
  colGrVal: { width: '7%' },
  colIrQuantity: { width: '10%' },
  colIrVal: { width: '7%' },
};


const styles = pdfStyles(columnWidths);

const ViewPurchasePDF = ({ data, headerLabels, headerDetails, userType }) => {

  Font.register({
  family: 'Amiri',
  fonts:[
    {src: AmiriRegular, fontWeight:"normal"},
    {src: AmiriBold, fontWeight:"normal"},  
  ]
  
});
  const { t,i18n } = useTranslation(['purchase_order', 'payment_terms_comp'])
  const isArabic = i18n.language === 'ar';

  return (
  <Document>
    <Page size="A4" orientation="landscape" style={styles.page}>

      {/* Header block */}
      <View style={pdfHeaderStyles.headerContainer}>
        {/* Column 1 - Purchase Order Details */}
        <View style={[pdfHeaderStyles.column, isArabic && pdfHeaderStyles.rtlColumn]}>
          {isArabic ? (
            // RTL Layout: Value on left, Label on right
            <>
              <View style={[pdfHeaderStyles.labelContainer, isArabic && pdfHeaderStyles.rtlLabelContainer]}>
                <Text style={[pdfHeaderStyles.labelText, isArabic && pdfHeaderStyles.rtlText]}>{t('poNumber.text')}</Text>
                <Text style={[pdfHeaderStyles.labelText, isArabic && pdfHeaderStyles.rtlText]}>{t('referenceNo')}</Text>
                <Text style={[pdfHeaderStyles.labelText, isArabic && pdfHeaderStyles.rtlText]}>{t('createdPODate.text')}</Text>
                <Text style={[pdfHeaderStyles.labelText, isArabic && pdfHeaderStyles.rtlText]}>{t('poCurrency')}</Text>
                {userType !== VENDOR_USER_TYPE ? (
                  <>
                    <Text style={[pdfHeaderStyles.labelText, isArabic && pdfHeaderStyles.rtlText]}>{t('vendorName')}</Text>
                    <Text style={[pdfHeaderStyles.labelText, isArabic && pdfHeaderStyles.rtlText]}>{t('vendorCode')}</Text>
                  </>
                ) : (
                  <Text style={[pdfHeaderStyles.labelText, isArabic && pdfHeaderStyles.rtlText]}>{t('poValue')}</Text>
                )}
              </View>
              <View style={[pdfHeaderStyles.valueContainer, isArabic && pdfHeaderStyles.rtlValueContainer]}>
                <Text style={[pdfHeaderStyles.valueText, isArabic && pdfHeaderStyles.rtlText]}>{headerDetails?.PONo || '--'}</Text>
                <Text style={[pdfHeaderStyles.valueText, isArabic && pdfHeaderStyles.rtlText]}>{headerDetails?.OurRef || '--'}</Text>
                <Text style={[pdfHeaderStyles.valueText, isArabic && pdfHeaderStyles.rtlText]}>{headerDetails?.PO_date ? dayjs(headerDetails?.PO_date).format('DD/MM/YYYY') : '--'}</Text>
                <Text style={[pdfHeaderStyles.valueText, isArabic && pdfHeaderStyles.rtlText]}>{headerDetails?.PO_currency || '--'}</Text>
                {userType !== VENDOR_USER_TYPE ? (
                  <>
                    <Text style={[pdfHeaderStyles.valueText, isArabic && pdfHeaderStyles.rtlText]}>{headerDetails?.vendor?.Vendor_Name_EN || '--'}</Text>
                    <Text style={[pdfHeaderStyles.valueText, isArabic && pdfHeaderStyles.rtlText]}>{headerDetails?.vendor?.Vendor_SAP_Code || '--'}</Text>
                  </>
                ) : (
                  <Text style={[pdfHeaderStyles.valueText, isArabic && pdfHeaderStyles.rtlText]}>{headerDetails?.POValue ?? '0.00'}</Text>
                )}
              </View>
            </>
          ) : (
            // LTR Layout: Label on left, Value on right
            <>
              <View style={pdfHeaderStyles.labelContainer}>
                <Text style={pdfHeaderStyles.labelText}>{t('poNumber.text')}</Text>
                <Text style={pdfHeaderStyles.labelText}>{t('referenceNo')}</Text>
                <Text style={pdfHeaderStyles.labelText}>{t('createdPODate.text')}</Text>
                <Text style={pdfHeaderStyles.labelText}>{t('poCurrency')}</Text>
                {userType !== VENDOR_USER_TYPE ? (
                  <>
                    <Text style={pdfHeaderStyles.labelText}>{t('vendorName')}</Text>
                    <Text style={pdfHeaderStyles.labelText}>{t('vendorCode')}</Text>
                  </>
                ) : (
                  <Text style={pdfHeaderStyles.labelText}>{t('poValue')}</Text>
                )}
              </View>
              <View style={pdfHeaderStyles.valueContainer}>
                <Text style={pdfHeaderStyles.valueText}>{headerDetails?.PONo || '--'}</Text>
                <Text style={pdfHeaderStyles.valueText}>{headerDetails?.OurRef || '--'}</Text>
                <Text style={pdfHeaderStyles.valueText}>{headerDetails?.PO_date ? dayjs(headerDetails?.PO_date).format('DD/MM/YYYY') : '--'}</Text>
                <Text style={pdfHeaderStyles.valueText}>{headerDetails?.PO_currency || '--'}</Text>
                {userType !== VENDOR_USER_TYPE ? (
                  <>
                    <Text style={pdfHeaderStyles.valueText}>{headerDetails?.vendor?.Vendor_Name_EN || '--'}</Text>
                    <Text style={pdfHeaderStyles.valueText}>{headerDetails?.vendor?.Vendor_SAP_Code || '--'}</Text>
                  </>
                ) : (
                  <Text style={pdfHeaderStyles.valueText}>{headerDetails?.POValue ?? '0.00'}</Text>
                )}
              </View>
            </>
          )}
        </View>

        {/* Column 2 - Delivery and Invoice Details */}
        <View style={[pdfHeaderStyles.column, isArabic && pdfHeaderStyles.rtlColumn]}>
          {isArabic ? (
            // RTL Layout: Value on left, Label on right
            <>
              <View style={[pdfHeaderStyles.labelContainer, isArabic && pdfHeaderStyles.rtlLabelContainer]}>
                {userType !== VENDOR_USER_TYPE && <Text style={[pdfHeaderStyles.labelText, isArabic && pdfHeaderStyles.rtlText]}>{t('poValue')}</Text>}
                <Text style={[pdfHeaderStyles.labelText, isArabic && pdfHeaderStyles.rtlText]}>{t('deliveredValue')}</Text>
                <Text style={[pdfHeaderStyles.labelText, isArabic && pdfHeaderStyles.rtlText]}>{t('deliveredQuantity')}</Text>
                <Text style={[pdfHeaderStyles.labelText, isArabic && pdfHeaderStyles.rtlText]}>{t('invoiceValue')}</Text>
                <Text style={[pdfHeaderStyles.labelText, isArabic && pdfHeaderStyles.rtlText]}>{t('invoiceQuantity')}</Text>
                <Text style={[pdfHeaderStyles.labelText, isArabic && pdfHeaderStyles.rtlText]}>{t('paymentTerms')}</Text>
              </View>
              <View style={[pdfHeaderStyles.valueContainer, isArabic && pdfHeaderStyles.rtlValueContainer]}>
                {userType !== VENDOR_USER_TYPE && <Text style={[pdfHeaderStyles.valueText, isArabic && pdfHeaderStyles.rtlText]}>{headerDetails?.POValue ?? '0.00'}</Text>}
                <Text style={[pdfHeaderStyles.valueText, isArabic && pdfHeaderStyles.rtlText]}>{headerDetails?.GRValue ?? '0.00'}</Text>
                <Text style={[pdfHeaderStyles.valueText, isArabic && pdfHeaderStyles.rtlText]}>{headerDetails?.Total_GR_Qty ?? '0'}</Text>
                <Text style={[pdfHeaderStyles.valueText, isArabic && pdfHeaderStyles.rtlText]}>{headerDetails?.InvValue ?? '0.00'}</Text>
                <Text style={[pdfHeaderStyles.valueText, isArabic && pdfHeaderStyles.rtlText]}>{headerDetails?.Total_IR_Qty ?? '0'}</Text>
                <Text style={[pdfHeaderStyles.valueText, isArabic && pdfHeaderStyles.rtlText]}>{headerDetails?.Payment_Terms ?? '--'}</Text>
              </View>
            </>
          ) : (
            // LTR Layout: Label on left, Value on right
            <>
              <View style={pdfHeaderStyles.labelContainer}>
                {userType !== VENDOR_USER_TYPE && <Text style={pdfHeaderStyles.labelText}>{t('poValue')}</Text>}
                <Text style={pdfHeaderStyles.labelText}>{t('deliveredValue')}</Text>
                <Text style={pdfHeaderStyles.labelText}>{t('deliveredQuantity')}</Text>
                <Text style={pdfHeaderStyles.labelText}>{t('invoiceValue')}</Text>
                <Text style={pdfHeaderStyles.labelText}>{t('invoiceQuantity')}</Text>
                <Text style={pdfHeaderStyles.labelText}>{t('paymentTerms')}</Text>
              </View>
              <View style={pdfHeaderStyles.valueContainer}>
                {userType !== VENDOR_USER_TYPE && <Text style={pdfHeaderStyles.valueText}>{headerDetails?.POValue ?? '0.00'}</Text>}
                <Text style={pdfHeaderStyles.valueText}>{headerDetails?.GRValue ?? '0.00'}</Text>
                <Text style={pdfHeaderStyles.valueText}>{headerDetails?.Total_GR_Qty ?? '0'}</Text>
                <Text style={pdfHeaderStyles.valueText}>{headerDetails?.InvValue ?? '0.00'}</Text>
                <Text style={pdfHeaderStyles.valueText}>{headerDetails?.Total_IR_Qty ?? '0'}</Text>
                <Text style={pdfHeaderStyles.valueText}>{headerDetails?.Payment_Terms ?? '--'}</Text>
              </View>
            </>
          )}
        </View>

        {/* Column 3 - Shipping and Originator Details */}
        <View style={[pdfHeaderStyles.lastColumn, isArabic && pdfHeaderStyles.rtlLastColumn]}>
          {isArabic ? (
            // RTL Layout: Value on left, Label on right
            <>
              <View style={[pdfHeaderStyles.labelContainer, isArabic && pdfHeaderStyles.rtlLabelContainer]}>
                <Text style={[pdfHeaderStyles.labelText, isArabic && pdfHeaderStyles.rtlText]}>{t('payment_terms_comp:incoterms.text')}</Text>
                <Text style={[pdfHeaderStyles.labelText, isArabic && pdfHeaderStyles.rtlText]}>{t('payment_terms_comp:incotermsLocation.text')}</Text>
                <Text style={[pdfHeaderStyles.labelText, isArabic && pdfHeaderStyles.rtlText]}>{t('modeOfTransport')}</Text>
                <Text style={[pdfHeaderStyles.labelText, isArabic && pdfHeaderStyles.rtlText]}>{t('createdPerson')}</Text>
              </View>
              <View style={[pdfHeaderStyles.valueContainer, isArabic && pdfHeaderStyles.rtlValueContainer]}>
                <Text style={[pdfHeaderStyles.valueText, isArabic && pdfHeaderStyles.rtlText]}>{headerDetails?.Incoterms || '--'}</Text>
                <Text style={[pdfHeaderStyles.valueText, isArabic && pdfHeaderStyles.rtlText]}>{headerDetails?.Incoterms_Location || '--'}</Text>
                <Text style={[pdfHeaderStyles.valueText, isArabic && pdfHeaderStyles.rtlText]}>{headerDetails?.Mode_of_transport || '--'}</Text>
                <Text style={[pdfHeaderStyles.valueText, isArabic && pdfHeaderStyles.rtlText]}>{headerDetails?.created_person?.Name || '--'}</Text>
              </View>
            </>
          ) : (
            // LTR Layout: Label on left, Value on right
            <>
              <View style={pdfHeaderStyles.labelContainer}>
                <Text style={pdfHeaderStyles.labelText}>{t('payment_terms_comp:incoterms.text')}</Text>
                <Text style={pdfHeaderStyles.labelText}>{t('payment_terms_comp:incotermsLocation.text')}</Text>
                <Text style={pdfHeaderStyles.labelText}>{t('modeOfTransport')}</Text>
                <Text style={pdfHeaderStyles.labelText}>{t('createdPerson')}</Text>
              </View>
              <View style={pdfHeaderStyles.valueContainer}>
                <Text style={pdfHeaderStyles.valueText}>{headerDetails?.Incoterms || '--'}</Text>
                <Text style={pdfHeaderStyles.valueText}>{headerDetails?.Incoterms_Location || '--'}</Text>
                <Text style={pdfHeaderStyles.valueText}>{headerDetails?.Mode_of_transport || '--'}</Text>
                <Text style={pdfHeaderStyles.valueText}>{headerDetails?.created_person?.Name || '--'}</Text>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Table */}
      <View style={styles.table}>
        {/* Header */}
        <View style={styles.tableRowHeader}>
          <Text style={[styles.tableCol, styles.colItemPO]}>{headerLabels[0]}</Text>
          <Text style={[styles.tableCol, styles.colStatus]}>{headerLabels[1]}</Text>
          <Text style={[styles.tableCol, styles.colMatCode]}>{headerLabels[2]}</Text>
          <Text style={[styles.tableCol, styles.colMatDesc]}>{headerLabels[3]}</Text>
          <Text style={[styles.tableCol, styles.colUOM]}>{headerLabels[4]}</Text>
          <Text style={[styles.tableCol, styles.colPOQuantity]}>{headerLabels[5]}</Text>
          <Text style={[styles.tableCol, styles.colOpenQuantity]}>{headerLabels[6]}</Text>
          <Text style={[styles.tableCol, styles.colNetPrice]}>{headerLabels[7]}</Text>
          <Text style={[styles.tableCol, styles.colGrQuantity]}>{headerLabels[8]}</Text>
          <Text style={[styles.tableCol, styles.colGrVal]}>{headerLabels[9]}</Text>
          <Text style={[styles.tableCol, styles.colIrQuantity]}>{headerLabels[10]}</Text>
          <Text style={[styles.tableCol, styles.colIrVal]}>{headerLabels[11]}</Text>
        </View>

        {/* Rows */}
        {data.map((item, idx) => (
          <View
            key={idx}
            style={[
              idx % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd,
              styles.row
            ]}
          >
            <Text style={[styles.tableCol, styles.colItemPO]}>{item.id}</Text>
            <Text style={[styles.tableCol, styles.colStatus]}>{item.Material_status}</Text>
            <Text style={[styles.tableCol, styles.colMatCode]}>{item.material_code}</Text>
            <Text style={[styles.tableCol, styles.colMatDesc]}>{item.material_description}</Text>
            <Text style={[styles.tableCol, styles.colUOM]}>{item.unit_of_measure}</Text>
            <Text style={[styles.tableCol, styles.colPOQuantity]}>{item.poQuantity}</Text>
            <Text style={[styles.tableCol, styles.colOpenQuantity]}>{item.poQuantity}</Text>
            <Text style={[styles.tableCol, styles.colNetPrice]}>{item.net_price}</Text>
            <Text style={[styles.tableCol, styles.colGrQuantity]}>{item.gr_quantity}</Text>
            <Text style={[styles.tableCol, styles.colGrVal]}>{item.gr_value}</Text>
            <Text style={[styles.tableCol, styles.colIrQuantity]}>{item.ir_quantity}</Text>
            <Text style={[styles.tableCol, styles.colIrVal]}>{item.ir_value}</Text>
          </View>
        ))}
      </View>
    </Page>
  </Document>
  );
};

export default ViewPurchasePDF;
