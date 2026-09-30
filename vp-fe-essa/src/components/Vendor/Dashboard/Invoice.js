import React from 'react'
import { Box, Typography } from '@mui/material'
import { BarChart, Bar, XAxis, YAxis, Legend, ResponsiveContainer, CartesianGrid, Tooltip } from 'recharts'
import { useTranslation } from 'react-i18next'
import { connect } from 'react-redux'

const Invoice = ({ dashboardData }) => {
  const { t, i18n } = useTranslation('dashboard')
  const isArabic = i18n.language === 'ar'
  const chartData = dashboardData?.barChart
  const categories = chartData?.xaxis?.categories || []
  const approved = chartData?.series?.find(item => item.name === 'getApprovedInvoices')?.data || []
  const paid = chartData?.series?.find(item => item.name === 'getPaidInvoices')?.data || []
  const pending = chartData?.series?.find(item => item.name === 'getNotApprovedInvoices')?.data || []
  // stable internal keys (used for data)
  const INTERNAL = {
    APPROVED: 'Approved',
    PENDING: 'Pending',
    PAID: 'Paid'
  }

  // translated labels (used for UI: legend, tooltip, bar name)
  // use fallback to english literal if translation missing
  const approvedLabel = t('approved', { defaultValue: 'Approved' })
  const pendingLabel = t('pending', { defaultValue: 'Pending' })
  const paidLabel = t('paid', { defaultValue: 'Paid' })

  // build invoice data with stable keys
  const invoiceData = categories.map((month, index) => ({
    name: t(month, { defaultValue: month }), // translate month keys; fallback to raw month if not found
    [INTERNAL.APPROVED]: approved[index] ?? 0,
    [INTERNAL.PENDING]: pending[index] ?? 0,
    [INTERNAL.PAID]: paid[index] ?? 0
  }))

  // hasData must check stable keys
  const hasData = invoiceData.some(item =>
    item[INTERNAL.APPROVED] > 0 ||
    item[INTERNAL.PENDING] > 0 ||
    item[INTERNAL.PAID] > 0
  )


  const renderCustomLegend = (props) => {
    const { payload } = props
    return (
      <div style={{ width: '100%', textAlign: isArabic ? 'left' : 'right' }}>
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'inline-flex',
            gap: '15px',
            marginBottom: '15px',
            flexDirection: isArabic ? 'row-reverse' : 'row',
            textAlign: isArabic ? 'left' : 'right'
          }}>
          {payload.map((entry, index) => (
            <li key={`item-${index}`} style={{ display: 'flex', alignItems: 'center' }}>
              <svg
                width="15"
                height="15"
                style={{
                  [isArabic ? 'marginLeft' : 'marginRight']: 5
                }}>
                <circle cx="7.5" cy="7.5" r="7.5" fill={entry.color} />
              </svg>
              <span style={{ color: '#333', fontSize: '15.3px' }}>
                {t(entry.value.toLowerCase())}
              </span>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <>
      <Typography
        variant="h5"
        color="#333"
        fontWeight="600"
        fontSize="1.4rem"
        paddingBottom="5px"
        marginTop="17px">
        {t('invoices')}
      </Typography>

      <Box
        sx={{
          backgroundColor: 'white',
          borderRadius: '10px',
          padding: '16px 0px',
          boxShadow: '6px 6px 55px rgba(0, 0, 0, 0.05)',
          width: 'auto',
          height: 330,
          border: '1px solid rgb(152, 162, 179)',
          direction: isArabic ? 'rtl' : 'ltr'
        }}>
        {hasData ? (
          <ResponsiveContainer width="100%">
            <BarChart data={invoiceData} barSize={10.22} reverseStackOrder={isArabic} style={{right: !isArabic ? '20px' : '', left: isArabic ? '20px' : ''}}>
              <CartesianGrid stroke="#F3F3F5" vertical={false} />
              <Bar dataKey={INTERNAL.APPROVED} name={approvedLabel} fill="#00B62A" radius={30.66} legendType="circle" />
              <Bar dataKey={INTERNAL.PENDING} name={pendingLabel} fill="#FFBB38" radius={30.66} legendType="circle" />
              <Bar dataKey={INTERNAL.PAID} name={paidLabel} fill="#008DE4" radius={30.66} legendType="circle" />
              <XAxis dataKey="name" tick={{ fill: '#333', fontSize: '13.28px', fontWeight: 500 }} textAnchor={isArabic ? 'start' : 'end'} />
              {/* <YAxis 
              tick={{ fill: '#333', fontSize: '13.28px', fontWeight:500 }} 
              orientation={isArabic ? 'right' : 'left'} 
              /> */}
              <YAxis
                orientation={isArabic ? 'right' : 'left'}
                width={80}
                tick={({ x, y, payload }) => (
                  <text
                    x={isArabic ? x + 25 : x - 10}  // shift away from axis
                    y={y + 4}                        // vertical centering
                    fill="#333"
                    fontSize={13.28}
                    fontWeight={500}
                    textAnchor={isArabic ? 'start' : 'end'}
                  >
                    {payload.value}
                  </text>
                )}
              />

              <Legend
                content={renderCustomLegend}
                layout="horizontal"
                verticalAlign="top"
                align="right"
              />
              <Tooltip cursor={{
                fill: 'rgba(0,0,0,0.1)',
                rx: 5, // for rounded corners, optional
              }} trigger="hover" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
            <Typography sx={{ color: '#333', fontSize: '16px', fontWeight: 500 }}>
              {t('noInvoiceAvilable', { defaultValue: 'No Invoices available' })}
            </Typography>
          </Box>
        )}
      </Box>
    </>
  )
}

const mapStateToProps = (state) => ({
  dashboardData: state.dashboard.dashboardData
})

export default connect(mapStateToProps)(Invoice)
