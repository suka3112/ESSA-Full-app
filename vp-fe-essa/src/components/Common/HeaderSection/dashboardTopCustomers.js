import React from 'react'
import { Box, Button, Typography } from '@mui/material'
import { TableWrapper, StyledRow, StyledCell, ViewButton, BoxWrapper, StyledMsgCell, StyledDate, Month, Title, Invoice, ListBox } from './dashboardTopCustomer.style'
import { markAsRead, readAllNotification } from 'api/MyProfile'
import { useNavigate } from 'react-router'
import { VENDOR_PORTAL, VENDOR_USER_TYPE } from 'constants/userType'
import { useTranslation } from 'react-i18next'
export const DashboardTopCustomers = ({ notification = [], userType, setIsNotificationOpen, getNotifiaction }) => {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation(['dashboard'])

  const readNotification = (id, moduleId, redirectId, vendorId = null) => {
    if (moduleId) {
      setIsNotificationOpen(false)
    }
    const body = {
      ID: id,
      Is_Read: true
    };

    markAsRead(body)
      .then(() => {
        getNotifiaction();
      })
      .catch((err) => {
        console.error('Error marking as read:', err);
      });
    if (!moduleId || !redirectId) return;

    switch (moduleId) {
      case 1: // Vendor_Onbord
        navigate(`/${userType}/vendors/view-vendors-application?id=${redirectId}`);
        break;
      case 2: // Vendor_Profile
        navigate(`/${userType}/vendor-profile/view/${redirectId}`);
        break;
      case 3: // Vendor_Update
        if (userType === VENDOR_USER_TYPE) {
          navigate(`/${userType}/my-profile`);
        } else {
          navigate(`/${userType}/vendors/view-vendors-update?id=${redirectId}`, { state: { vendorProfileID: vendorId } });
        }
        break;
      case 4: // PO_Invoice
        navigate(`/${userType}/invoice-processing/po-based-invoice/view?id=${redirectId}`);
        break;
      case 5: // Non_PO_Invoice
        navigate(`/${userType}/invoice-processing/non-po-based-invoice/view?no=${redirectId}`);
        break;
      case 6: // Logistics_Invoice
        navigate(`/${userType}/invoice-processing/logistics/view?id=${redirectId}`);
        break;
      case 7: // CREDIT_NOTE
        navigate(`/${userType}/invoice-processing/credit-note/${redirectId}`);
        break;
      case 8: // Advance_Payment
        navigate(`/${userType}/advance-payment/${redirectId}`);
        break;
      case 9: // SOA
        navigate(`/${userType}/statement-of-account/view/${redirectId}`);
        break;
      case 10: // Enquiry
        navigate(`/${userType}/enquires/view-enquiry?id=${redirectId}`);
        break;
      case 11: // entity
        if (userType === VENDOR_USER_TYPE) {
          navigate(`/${userType}/my-profile`);
        } else {
          navigate(`/${userType}/vendors/view-vendors-extension?vendorId=${vendorId}&id=${redirectId}`);
        }
        break;
      case 12: // Vendor_Onbord 1 and 12 same
        navigate(`/${userType}/vendors/view-vendors-application?id=${redirectId}`);
        break;
      default:
        console.warn('Unknown module ID:', moduleId);
        break;
    }
  };

  const readAllNotifications = () => {
    readAllNotification()
      .then(() => {
        getNotifiaction();
      })
      .catch((err) => {
        console.error('Error marking all as read:', err);
      });
  }

  return (
    <>
      <BoxWrapper>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography sx={{
            fontSize: '22px',
            fontWeight: 600,
            color: "#333B69"
          }} >{t('notifications')}</Typography>
          {notification?.some(row => !row?.Is_Read) && (
            <Button
              variant="outlined"
              color="primary"
              size="small"
              onClick={() => readAllNotifications()}
              sx={{ textTransform: 'none', fontWeight: 500, ml: 2,fontSize: '1rem' }}
            >
              {t('readall')}
            </Button>
          )}
        </Box>
        <hr className='m-0' />
        <Box sx={{ padding: '0px 10px' }}>
          <TableWrapper>
            {notification?.length > 0 ? (
              notification.map((row, index) => {
                const dateObj = new Date(row?.CreatedDt ? row?.CreatedDt : row?.createdAt);
                const day = dateObj.getUTCDate().toString().padStart(2, '0');
                const month = new Intl.DateTimeFormat('en', { month: 'short', timeZone: 'UTC' }).format(dateObj);

                const textColor = row?.Is_Read ? '#6b6b6bff' : '#030303';
                const fontWeight = row?.Is_Read ? 400 : 500;
                return (
                  <StyledRow key={index}>
                    <ListBox>
                      <StyledCell>
                        <StyledDate>{day}</StyledDate>
                        <Month>{month}</Month>
                      </StyledCell>
                      <StyledMsgCell>
                        <Title style={{ color: textColor, fontWeight: fontWeight }}>{row?.Message || row?.message}</Title>
                        <Invoice style={{ color: textColor, fontWeight: fontWeight }}>{row?.subname}</Invoice>
                      </StyledMsgCell>
                    </ListBox>
                    <Box>
                      {/* <StyledCell> */}
                        <ViewButton variant="text" onClick={() => readNotification(row?.ID, row?.Module_Category_Id, row?.Redirect_Id, row?.Vendor_Id || null)}>{row?.Redirect_Id ? t('view') : t('markasread')}</ViewButton>
                      {/* </StyledCell> */}
                    </Box>
                  </StyledRow>
                );
              })
            ) : (
              <div className="text-center text-gray-500 py-4">No new notifications</div>
            )}

          </TableWrapper>
        </Box>
      </BoxWrapper>
    </>
  )
}
