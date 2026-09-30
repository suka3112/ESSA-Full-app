import { StyleSheet } from '@react-pdf/renderer';

export const pdfStyles = (columnWidths = {}) => {
  return StyleSheet.create({
    page: {
      padding: 20,
      fontSize: 11,
      fontFamily: 'Amiri'
    },
    table: {
      display: 'table',
      width: 'auto',
      borderStyle: 'solid',
      borderWidth: 0.5,
      borderColor: 'grey',
      borderRightWidth: 0,
      borderBottomWidth: 0,
    },
    tableRowHeader: {
      flexDirection: 'row',
      backgroundColor: '#0074b9',
      color: 'white',
      fontWeight: 'bold',
    },
    tableRowEven: {
      flexDirection: 'row',
    },
    tableRowOdd: {
      flexDirection: 'row',
    },
    tableCol: {
      borderStyle: 'solid',
      borderWidth: 0.5,
      borderColor: 'grey',
      borderLeftWidth: 0,
      borderTopWidth: 0,
      padding: 4,
      textAlign: 'center',
    },
    ...columnWidths
  });
};