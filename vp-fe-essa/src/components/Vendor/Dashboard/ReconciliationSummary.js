import React, { useRef, useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Sector } from 'recharts';
import { useTranslation } from 'react-i18next';
import { connect } from 'react-redux';

const ReconciliationSummary = ({ dashboardData }) => {
  const { t, i18n } = useTranslation(['dashboard','soa']);
  const isArabic = i18n.language === 'ar';

  const pieSeries = dashboardData?.pieChart?.series || [];
  // const pieSeries = [45,35,20];
  const pieLabels = [t('soa:reconciled'), t('soa:mismatched'), t('soa:pendingForReconciliation')];

  const colorPalette = ['#00B62A', '#EB2E2E', 'var(--brand-primary-color, $primary-color)'];

  const rawData = pieLabels.map((label, index) => ({
    name: t(label?.trim()),
    value: Number(pieSeries[index] ?? 0),
    color: colorPalette[index % colorPalette.length],
  }));

  const reconciliationData = rawData.filter((item) => item.value > 0);
  const hasData = reconciliationData.length > 0;

  const CARD_HEIGHT = 330;
  const CARD_PADDING = 20;
  const CHART_AREA_HEIGHT = 200;

  const chartRef = useRef(null);
  const [chartSize, setChartSize] = useState({ width: 0, height: 0 });
  const [activeIndex, setActiveIndex] = useState(null); // ✅ Added

  useEffect(() => {
    if (!chartRef.current) return;
    const el = chartRef.current;
    const resizeObserver = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      setChartSize({ width: rect.width, height: rect.height });
    });
    resizeObserver.observe(el);
    const rect = el.getBoundingClientRect();
    setChartSize({ width: rect.width, height: rect.height });
    return () => resizeObserver.disconnect();
  }, [chartRef]);

  const maxPossibleRadius = Math.floor(Math.min(chartSize.width, chartSize.height) / 2) || 0;
  const outerRadius = Math.max(30, Math.min(90, maxPossibleRadius - 12));
  const innerRadius = Math.floor(outerRadius * 0.55);
  const totalValue = reconciliationData.reduce((s, v) => s + v.value, 0);

  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const { name, value } = payload[0].payload;
      const percent = totalValue ? ((value / totalValue) * 100).toFixed(2) : "0.00";     
      return (
        <div
          style={{
            background: 'white',
            border: '1px solid #ccc',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '14px',
            color: '#333',
          }}
        >
          <div style={{ fontWeight: 600 }}>{`${name} (${percent}%)`}</div>
        </div>
      );
    }
    return null;
  };

  // ✅ Custom active shape (transparent overlay)
  const renderActiveShape = (props) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        fillOpacity={0.75} // transparent overlay
      />
    );
  };

  return (
    <>
      <Typography
        variant="h5"
        color="#333"
        fontWeight="600"
        paddingBottom="5px"
        marginTop="17px"
        fontSize="1.4rem"
      >
        {t('reconciliationSummary')}
      </Typography>

      <Box
        sx={{
          backgroundColor: 'white',
          borderRadius: '10px',
          padding: `${CARD_PADDING}px`,
          boxShadow: '6px 6px 55px rgba(0, 0, 0, 0.05)',
          width: '100%',
          height: `${CARD_HEIGHT}px`,
          border: '1px solid rgb(152, 162, 179)',
          boxSizing: 'border-box',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent:"space-between"
        }}
      >
        {hasData ? (
          <>
            <Box
              ref={chartRef}
               onMouseDown={(e) => {
                e.preventDefault();
              }}
              sx={{
                height: `${CHART_AREA_HEIGHT}px`,
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 1,
                boxSizing: 'border-box',
                '& .recharts-wrapper:focus': { outline: 'none' },
                '& .recharts-responsive-container:focus': { outline: 'none' },
                '& .recharts-surface:focus': { outline: 'none' },
                '& svg:focus': { outline: 'none' }
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={reconciliationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={innerRadius}
                    outerRadius={outerRadius}
                    dataKey="value"
                    label={false}
                    labelLine={false}
                    activeIndex={activeIndex}
                    activeShape={renderActiveShape}
                    onMouseEnter={(_, index) => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(null)}
                  >
                    {reconciliationData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={<CustomPieTooltip />}
                    // cursor={{ fill: 'rgba(0,0,0,0.1)', rx: 5 }}
                    // trigger="hover"
                  />
                </PieChart>
              </ResponsiveContainer>
            </Box>

            {/* Legend */}
            <Box
              sx={{
                // display: 'flex',
                // flexWrap: 'wrap',
                // justifyContent: 'center',
                // gap: 2,
                mt: 1,
              }}
            >
              {reconciliationData.map((item, idx) => (
                <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="14" height="14">
                    <circle cx="7" cy="7" r="7" fill={item.color} />
                  </svg>
                  <Typography sx={{ fontSize: '14px', fontWeight: 500, color: '#333' }}>
                    
                    {`${item.name} (${item?.value ? item?.value : "--"}%)`}
                  </Typography>
                </Box>
              ))}
            </Box>
          </>
        ) : (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography sx={{ color: '#333', fontSize: '1rem', fontWeight: 500 }}>
              {t('noReconciliationData') || 'No Reconciliation Summary available'}
            </Typography>
          </Box>
        )}
      </Box>
    </>
  );
};

const mapStateToProps = (state) => ({
  dashboardData: state.dashboard.dashboardData,
});

export default connect(mapStateToProps)(ReconciliationSummary);
