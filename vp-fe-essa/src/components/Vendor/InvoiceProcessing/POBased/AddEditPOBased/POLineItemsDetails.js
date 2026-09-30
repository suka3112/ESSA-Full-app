import { getPOLineItemDetails } from 'api/PurchaseOrder'
import TableLayout from 'components/Common/TableComponent/TableLayout';
import dayjs from 'dayjs';
import useTableFeatures from 'hooks/useTableFeatures';
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next';
import styles from './AddEditPOBased.module.scss';
import History from "assets/images/clock.svg"
const POLineItemsDetails = ({ id, poNo }) => {
    const { t } = useTranslation(['po_based_invoices', 'non_po_based_invoices', 'purchase_order'])
    const [tableData, setTableData] = useState([])
    const {
        page,
        rowsPerPage,
        search,
        order, orderBy,
        setPageMeta,
        setLoader,
        // handleSearchValue,
        tableProps,
    } = useTableFeatures();

    useEffect(() => {
        getLineItemDetails()
    }, [page, rowsPerPage, search, order, orderBy, id, poNo])
    const getLineItemDetails = () => {
        setLoader(true);
        const query = {
            POLnNo: id,
            page: page,
            limit: rowsPerPage,
            sort: order,
            sort_column: orderBy,
            PONo: poNo
        }

        getPOLineItemDetails(query).then((res) => {
            setTableData(res?.data?.data?.results)
            setPageMeta(res?.data?.data?.pageMeta);
        }).catch((err) => { console.log(err) }).finally(() => {
            setLoader(false);
        })
    }
    const headers = [
        { key: 'materialCode', label: t('materialCode.text'), sortable: true, sortKey: 'Material_Code' },
        { key: 'materialDescription', label: t('materialDescription.text'), sortable: true, sortKey: 'Material_Description' },
        { key: 'quantity', label: t('purchase_order:quantity'), sortable: true, sortKey: 'Qty' },
        { key: 'plant', label: t('purchase_order:plant'), sortable: true, sortKey: 'Plant' },
        { key: 'scheduledDate', label: t('purchase_order:scheduledDate'), sortable: true, sortKey: 'Scheduled_date' },
    ]
    const formattedData = tableData?.map((x) => ({
        materialCode: x?.po_detail?.Material_Code,
        materialDescription: x?.po_detail?.Material_Description,
        quantity: x?.Qty,
        plant: x?.po_detail?.Plant,
        scheduledDate: x?.Scheduled_date ? dayjs(x?.Scheduled_date).format("DD/MM/YYYY") : ""
    })) || [];

    return (
        <div className='pt-5'>
            <div className={styles.subHeader}>
                <div style={{ display: 'flex', marginBottom: '20px' }}>
                    <img src={History} alt="History" />
                    <label className='headingLabelStyle mx-1'>{`${t('purchase_order:historyPOQuantity')} - ${id}`}</label>
                </div></div>
            <TableLayout tableHeaders={headers} tableData={formattedData} {...tableProps} className="po-line-items-details-table"/>
        </div>
    )
}

export default POLineItemsDetails