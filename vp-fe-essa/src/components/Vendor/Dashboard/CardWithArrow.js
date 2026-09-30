import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  useMediaQuery,
} from "@mui/material";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import {
  submitInvoice,
  uploadSOA,
  request,
  enquiry,
} from "constants/imageConstants";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ADVANCE_PAYMENT, ENQUIRIES, INVOICE_PO_BASED } from "constants/url";
import { useSelector } from "react-redux";
import SOA from "../SOA";
import { VENDOR_PORTAL } from "constants/userType";
import SVGIcon from "../../Common/SVGIcon";

const CardWithArrow = () => {
  const isMediumScreen = useMediaQuery("(max-width: 1279px)");
  const isSmallScreen = useMediaQuery("(max-width: 919px)");
  const { t } = useTranslation("dashboard");
  const navigate = useNavigate();
  const userType = useSelector((state) => state?.userInfo?.userType);

  const cardData = [
    {
      img: "submitInvoice",
      text: t("submitNewInvoice"),
      route: `/${userType}${INVOICE_PO_BASED}?source=dashboard`,
    },
    {
      img: "enquiry",
      text: t("uploadSOA"),
      route: `/${userType}/soa`,
    },
    {
      img: "uploadSOA",
      text: t("raiseAnEnquiry"),
      route: `/${userType}${ENQUIRIES}?source=dashboard`,
    },
    {
      img: "request",
      text: t("requestAdvancePayment"),
      route: `/${userType}${ADVANCE_PAYMENT}`,
    },
  ];

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
        {t("quickLinks")}
      </Typography>

      <Grid container spacing={3} alignItems="center" justifyContent="center">
        {cardData.map((item, index) => (
          <Grid
            item
            xs={12}
            sm={isSmallScreen ? 12 : isMediumScreen ? 6 : 3}
            key={index}
          >
            <Card
              onClick={() => navigate(item.route)}
              sx={{
                minWidth: "267px",
                maxHeight: "64px",
                textAlign: "start",
                borderRadius: 5,
                backgroundColor: "white",
                transition: "background-color 0.3s ease-in-out",
                boxShadow: "6px 6px 55px rgba(0, 0, 0, 0.05)",
                "&:hover": { backgroundColor: "#f0f0f0", cursor: "pointer" },
                display: "flex",
                alignItems: "center",
                border: "1px solid rgb(152, 162, 179)",
              }}
            >
              <CardContent sx={{ width: "100%", marginTop: "5px" }}>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography
                    sx={{
                      display: "flex",
                      fontSize: "1rem",
                      fontWeight: "600",
                      alignItems: "center",
                      color: "#2C2C2C",
                    }}
                  >
                    <SVGIcon className="me-1" name={item.img} width={35} height={34} alt={item.text} />
                    {item.text}
                  </Typography>
                  <ArrowForwardIosIcon
                    className="rtl:rotate-180"
                    sx={{ height: "24.5px", width: "23px" }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </>
  );
};

export default CardWithArrow;
