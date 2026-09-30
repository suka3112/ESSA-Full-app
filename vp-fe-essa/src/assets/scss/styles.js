import {StyleSheet } from '@react-pdf/renderer';
// Create styles for the PDF
export const styles = StyleSheet.create({
    page: {
        padding: 20,
        fontSize: 10,
    },
    section: {
        marginBottom: 10,
        padding: 10,
        // border: '1px solid #e0e0e0',
        borderRadius: 5,
    },
    block: {
        marginBottom: 5,
    },
    incident: {
        marginBottom: 20,
    },
    header: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 5,
        // color:'#0066b3'
        color: '#4caf50', // Green header
    },
    row: {
        display: 'flex',
        flexDirection: 'row',
        // justifyContent: 'space-between',
        marginBottom: 5,
    },
    gradTotal: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 10,
        backgroundColor: '#0066b3',
        color: 'white',
        fontWeight: 'bold'
    },
    label: {
        color: '#828282',
        width: "160px"
    },
    description: {
        fontSize: 12,
        marginBottom: 4,
        color: '#000',
    },
    value: {
        fontWeight: 'heavy',
        color: "#000"
    },
    fileContainer: {
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8, // Space between items
    },
    fileItem: {
        border: '1px solid #ccc',
        borderRadius: 4,
        // padding: 4,
        marginBottom: 8,
        width: 120,
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
    },
    fileImage: {
        width: 110,
        height: 110,
        marginBottom: 4,
    },
    fileText: {
        fontSize: 10,
        textAlign: 'center',
    },
    noData: {
        fontSize: 12,
        color: '#888',
        marginTop: 8,
    },
    headerText: {
        fontSize: 22,
        color: '#4caf50',
        fontWeight: 'heavy'
    },
    logo: {
        width: 120,
        height: 50,
        resizeMode: 'contain'
    },
    table: {
        display: "flex",
        width: "100%",
        borderWidth: 0.5,
        borderColor: "#e0e0e0",
    },
    tableRow: {
        display: "flex",
        flexDirection: "row",
    },
    tableCell: {
        flex: 1,
        borderWidth: 0.5,
        borderColor: "#e0e0e0",
        padding: 5,
        fontSize: 9,
        textAlign: 'center',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap',
        wordWrap: 'break-word',
        overflow: 'hidden', // Hide overflow
    },
    
    tableHeader: {
        fontWeight: "bold",
        backgroundColor: "#0066b3",
        color: "white",
    },
    pageNumber: {
        position: 'absolute',
        fontSize: 10,
        bottom: 20,
        left: 0,
        right: 0,
        textAlign: 'center',
        color: 'grey'
    },
    rvpTableQuesCell: {
        flex: 1,
        borderTopWidth: 0.5,
        borderBottomWidth: 0.5,
        borderColor: "#e0e0e0",
        padding: 6,
        fontSize: 8,
        textAlign: 'left',
    },
    rvpTableCell: {
        flex: 1,
        // borderWidth: 0.5,
        // borderColor: "#e0e0e0",
        padding: 6,
        fontSize: 8,
        textAlign: 'justify',
        // alignItems:'stretch',
        justifyContent:'center'
    },
    rvpTableCellImg: {
        borderWidth: 0.5,
        borderColor: "#e0e0e0",
        padding: 6,
        fontSize: 8,
        textAlign:'center'
    },
    rvpTitle: {
        fontWeight: '600',
        color: '#121212',
        fontSize: 10,
        textTransform:'uppercase'
    },
    rvpImage: {
       height:70,
       width:70,
       objectFit:'contain'
    },
    rvpTableHeader: {
        fontWeight: "bold",
        backgroundColor: "#0066b3",
        color: "white",
        padding:5
    },
    fixtureImgContainer: {
        flex: 1, // Allows the container to expand
        justifyContent: 'center',
        alignItems: 'center',
        padding:1,
        width:'100%',
        borderWidth: 0.5,
        borderColor: "#e0e0e0",
        minHeight:"100px"
      },
      fixtureImage: {
        width: '100%', // Take up the full width of the container
        height: '70px', // Take up the full height of the container
        objectFit: 'contain',
      },
      commentContainer:{
        marginBottom:10
      },
      dateText:{
        fontSize:8,
        fontStyle:'Italic'
      },
    dateFormat: {
        fontSize: 14,
        marginBottom: 4,
        color: '#000',
        fontWeight:'bold'
    },
    mrTableCell: {
        flex: 1,
        borderWidth: 0.5,
        borderColor: "#e0e0e0",
        padding: 7,
        fontSize: 8,
        textAlign: 'center',
        alignItems:'center',
        justifyContent:'center',
    },
    subText: {
        fontSize: 10,
        color: "#666",
    },
    summaryText:{
        fontSize:8,
        fontStyle:'Italic',
        color: "#666",
    },
    poiLabel: {
        color: '#828282',
        margin:'0 5px'
    },
    poiHeaderText: {
        fontSize: 14,
        color: '#4caf50',
        fontWeight: 'heavy',
    },
    poiHeading:{
        color:"white",
        backgroundColor:"#0066b3",
        fontSize:12,
        padding:5
    },
    
    msgFileItem: {
        border: '1px solid #ccc',
        borderRadius: 4,
        // padding: 4,
        marginBottom: 8,
        width: 60,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
    },
    msgFileImage: {
        width: 50,
        height: 50,
        marginBottom: 4,
    },
    fileText: {
        fontSize: 10,
        textAlign: 'center',
    },
});