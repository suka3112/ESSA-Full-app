import { Box, Typography, Grid, Grid2 } from '@mui/material'
import { VENDOR_PORTAL, VENDOR_USER_TYPE } from 'constants/userType'
import { useMemo, useState } from 'react'
import { connect } from 'react-redux'
import styled, { css } from 'styled-components'
import {
  grow as Grow,
  invoices as Invoices,
  loss as Loss,
  payment as Payment,
  po as PO,
  received as Received,
  reconciliation as Reconciliation
} from '../../../constants/imageConstants'
import { color } from '../../../services/colors'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

// STYLES
const CardsGrid = styled.div`
  display: grid;
  gap: 20px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-template-rows: repeat(2, auto);

  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-rows: auto;
  }
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const GridWrapper = styled(Grid2)`
  display: flex;
`

const TitleCard = styled(Box)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 4px;
`

const CardName = styled(Typography).attrs({ variant: 'h4' })`
  font-size: 29px;
  font-weight: bold;
  color: black;
`

const CardLabel = styled(Typography).attrs({ variant: '' })`
  font-size: 1.125rem;
  font-weight: 600;
  color: #202224;
  opacity: 70%;
`

const CardStatus = styled(Box)`
  font-size: 1.125rem;
  font-weight: 600;
  color: #606060;
`

const BoxWrapper = styled(Box)`
  position: relative;
  width: 100%;
  height: 140px;
  border-radius: 14px;
  border: 1px solid rgb(152, 162, 179);
  gap: 10px;
  padding: 15px 20px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background-color: white;
  box-shadow: 6px 6px 54px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease-in-out;

  ${({ $bgColor }) =>
    $bgColor &&
    css`
      background: ${$bgColor};
      p {
        span {
          padding-left: 4px;
        }
      }
    `};

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0px 8px 20px rgba(0, 0, 0, 0.15), 0px 4px 8px rgba(0, 0, 0, 0.1);
  }
`

const DashboardIcon = styled('img')`
  width: 4.063rem;
  height: 4.063rem;
  position: absolute;
  top: 10px;
  transition: transform 0.2s;
  margin-top: 10px;
   border: 1px solid rgb(152, 162, 179);
  //  box-shadow: 0px 2px 12px rgba(0, 0, 0, 0.15), 0px 4px 8px rgba(0, 0, 0, 0.1);
    ${({ $bgColor }) =>
    $bgColor &&
    css`
      border:1px solid ${$bgColor};
    `};
  
  border-radius:50%;

  [dir='rtl'] & {
    left: 10px;
  }

  [dir='ltr'] & {
    right: 20px;
  }

  ${({ $isHovered }) => {
    if ($isHovered) {
      return css`
        scale: 120%;
        [dir='rtl'] & {
          transform: translateX(20%) translateY(20%);
        }
        [dir='ltr'] & {
          transform: translateX(-20%) translateY(20%);
        }
      `
    }
  }}
`

const MarketStatus = styled(Box)`
  display: flex;
  align-items: center;
  gap: 8px;
`

const PercentageValue = styled(Typography)`
  font-size: 1.125rem !important;
  font-weight: 600;
  ${({ $iconColor }) =>
    $iconColor &&
    css`
      color: ${$iconColor};
    `};
`

const ReturnDashboardCards = ({ userType, dashboardData }) => {
  const [hoverIndex, setHoverIndex] = useState(null)
  const { t } = useTranslation('dashboard')
  const navigate = useNavigate()

  const formatValue = (value) => {
    if (value < 9) {
      return `0${value}`
    } else {
      return `${value}`
    }
  }
  const formatTotalAmount = (currency = '', value = 0) => {
  let suffix = '';
  let shortValue = value;

  if (value >= 1_000_000_000) {
    shortValue = value / 1_000_000_000;
    suffix = 'B';
  } else if (value >= 1_000_000) {
    shortValue = value / 1_000_000;
    suffix = 'M';
  } else if (value >= 1_000) {
    shortValue = value / 1_000;
    suffix = 'K';
  }

  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(shortValue);

  const prefix = currency ? `${currency} ` : '';
  return `${prefix}${formatted}${suffix}`;
};


  const getPercentageColor = (percentage) => {
    if (typeof percentage !== 'number') return '#000';
    return percentage < 0 ? '#F93C65' : '#00B69B';
  };
  const getSubIcon = (percentage) => {
    if (typeof percentage !== 'number') return Grow;
    return percentage < 0 ? Loss : Grow;
  };

  const DashboardCards = [
    {
      key: 'outstandingPO',
      label: t('outstandingPO'),
      route: 'purchase-order',
      total: formatValue(dashboardData?.outStandingPO?.outstandCount),
      title: t('upFromYesterday'),
      icon: PO,
      subIcon: getSubIcon(dashboardData?.outStandingPO?.percentage),
      percentage: dashboardData?.outStandingPO?.percentage,
      percentageColor: getPercentageColor(dashboardData?.outStandingPO?.percentage),
      bgColor: `${color.dataVisualisation.shade2['400']}`,
      totals: dashboardData?.outStandingPO?.currency?.map((x) =>
        formatTotalAmount(
          x.PO_currency || x.InvCurr,
          x.POValue || x.InvAmt
        )
      ) || []
    },
    {
      key: 'pendingInvoices',
      label: t('pendingInvoices'),
      route: 'invoice-processing/pending',
      total: formatValue(dashboardData?.pendingInvoice?.outstandCount),
      title: t('upFromYesterday'),
      percentage: dashboardData?.pendingInvoice?.percentage,
      percentageColor: getPercentageColor(dashboardData?.pendingInvoice?.percentage),
      icon: Invoices,
      subIcon: getSubIcon(dashboardData?.pendingInvoice?.percentage),
      bgColor: `${color.dataVisualisation.shade1['400']}`,
      totals:
        dashboardData?.pendingInvoice?.currency?.map((x) =>
          formatTotalAmount(
            x.PO_currency || x.InvCurr,
            x.POValue || x.InvAmt
          )
        ) || []
    },
    {
      key: 'outstandingPayment',
      label: t('outstandingPayment'),
      route: 'outstanding-payment',
      total: formatValue(dashboardData?.outstandingPayment?.outstandCount),
      title: t('upFromYesterday'),
      icon: Payment,
      subIcon: getSubIcon(dashboardData?.outstandingPayment?.percentage),
      percentage: dashboardData?.outstandingPayment?.percentage,
      percentageColor: getPercentageColor(dashboardData?.outstandingPayment?.percentage),
      bgColor: `${color.dataVisualisation.shade3['400']}`,
      totals:
        dashboardData?.outstandingPayment?.currency?.map((x) =>
          formatTotalAmount(
            x.Curr || x.InvCurr,
            x.Amount || x.InvAmt
          )
        ) || []
    },
    {
      key: 'payableThisMonth',
      label: t('payableThisMonth'),
      route: 'payable-this-month',
      total: formatValue(dashboardData?.payableThisMonth?.outstandCount),
      title: t('upFromYesterday'),
      icon: Invoices,
      subIcon: getSubIcon(dashboardData?.payableThisMonth?.percentage),
      percentage: dashboardData?.payableThisMonth?.percentage,
      percentageColor: getPercentageColor(dashboardData?.payableThisMonth?.percentage),
      bgColor: `${color.dataVisualisation.shade1['400']}`,
      totals:
        dashboardData?.payableThisMonth?.currency?.map((x) =>
          formatTotalAmount(
            x.Curr || x.InvCurr,
            x.Amount || x.InvAmt
          )
        ) || []
    },
    {
      key: 'pendingReconciliation',
      label: t('pendingReconciliation'),
      route: 'dashboard/reconciliation',
      total: formatValue(dashboardData?.pendingReconsilation?.outstandCount),
      title: t('upFromYesterday'),
      icon: Reconciliation,
      subIcon: getSubIcon(dashboardData?.pendingReconsilation?.percentage),
      percentage: dashboardData?.pendingReconsilation?.percentage,
      percentageColor: getPercentageColor(dashboardData?.pendingReconsilation?.percentage),
      bgColor: '#ffdad0c2',
      totals:
        dashboardData?.pendingReconsilation?.currency?.map((x) =>
          formatTotalAmount(
            x.Curr || x.InvCurr,
            x.Amount || x.InvAmt
          )
        ) || []
    },
    {
      key: 'pendingTickets',
      label: t('pendingTickets'),
      route: 'enquires',
      total: formatValue(dashboardData?.pendingTicket?.outstandCount || 0),
      title: t('upFromYesterday'),
      icon: Received,
      subIcon: getSubIcon(dashboardData?.pendingTicket?.percentage),
      percentage: dashboardData?.pendingTicket?.percentage,
      percentageColor: getPercentageColor(dashboardData?.pendingTicket?.percentage),
      bgColor: '#e1eaed',
    }
  ]

  const gridSize = 4

  const handleCardClick = (card) => {
    navigate(`/${userType}/${card.route}?source=dashboard&type=${card.key}`)
  }

  return (
    <CardsGrid>
      {DashboardCards?.map((card, index) => {
        const isHovered = hoverIndex === index;
        return (
          <BoxWrapper
            key={card.key ?? index}
            $iconColor={card.iconColor}
            $bgColor={isHovered ? card.bgColor : 'white'}
            onMouseEnter={() => setHoverIndex(index)}
            onMouseLeave={() => setHoverIndex(null)}
            onClick={() => handleCardClick(card)}
            style={{ cursor: 'pointer' }}
            tabIndex={0}
          >
            <TitleCard>
              <Box>
                <CardLabel>{card.label}</CardLabel>
                {isHovered ? (
                  <Typography sx={{ marginTop: 1 }}>
                   {card.label === t('pendingTickets') &&
          dashboardData?.pendingTicket?.data?.map((item, idx) => {
            // translate by key, fallback to original value if missing
            const translated = t(`enquiryType.${item?.Enquiry_Type}`, item?.Enquiry_Type);
            return (
              <Typography
                key={idx}
                variant="h6"
                style={{ fontSize: '1rem', fontWeight: 600, textTransform: 'capitalize' }}
              >
                {translated}: {item?.total}
              </Typography>
            );
          })}
                    {card?.totals?.map((total, i) => (
                      <Typography key={i} variant="h6" style={{ fontSize: '1rem', fontWeight: 600 }}>
                        {total}
                      </Typography>
                    ))}
                    {card?.total == 0 && (
                      <Typography variant="h6" style={{ fontSize: '1rem', fontWeight: 600 }}>
                        {`${t('no')} ${card.label}`}
                      </Typography>
                    )}
                  </Typography>
                ) : (
                  <Typography variant="h4" style={{ fontSize: '1.813rem', fontWeight: 'bold' }}>
                    {card.total}
                  </Typography>
                )}
              </Box>
              <Box>
                <DashboardIcon $isHovered={isHovered} src={card.icon} alt="icon" />
              </Box>
            </TitleCard>
          </BoxWrapper>
        );
      })}
    </CardsGrid>
  );
}

const mapStateToProps = (state) => ({
  dashboardData: state.dashboard.dashboardData
})

export default connect(mapStateToProps)(ReturnDashboardCards)
