export const pdfHeaderStyles = {
  headerContainer: {
    flexDirection: 'row',
    border: '1px solid #e5e5e5',
    borderRadius: 10,
    backgroundColor: '#fff',
    padding: 10,
    marginBottom: 12,
  },
  column: {
    flex: 1,
    flexDirection: 'row',
    paddingRight: 10,
    borderRight: '1px solid #e5e5e5',
    marginRight: 20,
  },
  lastColumn: {
    flex: 1,
    flexDirection: 'row',
    paddingRight: 0,
    marginRight: 0,
  },
  labelContainer: {
    flexDirection: 'column',
  },
  valueContainer: {
    flexDirection: 'column',
    marginLeft: 10,
  },
  labelText: {
    fontSize: 11,
    fontWeight: 500,
    color: '#344054',
    marginBottom: 4,
  },
  valueText: {
    fontSize: 11,
    fontWeight: 600,
    color: '#303030',
    marginBottom: 4,
  },
  // RTL Styles
  rtlContainer: {
    flexDirection: 'row-reverse',
  },
  rtlColumn: {
    flexDirection: 'row-reverse',
    paddingRight: 10,
    paddingLeft: 0,
    marginRight: 20,
    marginLeft: 0,
    borderRight: '1px solid #e5e5e5',
    borderLeft: 'none',
  },
  rtlLastColumn: {
    flexDirection: 'row-reverse',
    paddingRight: 0,
    paddingLeft: 0,
    marginRight: 0,
    marginLeft: 0,
    borderRight: 'none',
    borderLeft: 'none',
  },
  rtlValueContainer: {
    flexDirection: 'column',
    marginLeft: 30,
    marginRight: 0,
  },
  rtlLabelContainer: {
    flexDirection: 'column',
    marginLeft: 30,
    marginRight: 0,
  },
  rtlText: {
    textAlign: 'right',
    direction: 'rtl',
  },
};
