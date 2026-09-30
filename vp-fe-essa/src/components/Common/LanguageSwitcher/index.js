import { useState, useEffect } from "react";
import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import { styled } from "@mui/system";
import i18n from '../../../i18n'

// Styled component to fix border radius issues in RTL mode
const StyledToggleButtonGroup = styled(ToggleButtonGroup)(({ theme, language }) => ({
  height: 'fit-content',
  borderRadius: 4,
  "& .MuiToggleButton-root": {
    border: "1px solid var(--brand-primary-color, $primary-color)", // same as MUI primary main
    color: "var(--brand-primary-color, $primary-color)",
    backgroundColor: "transparent",
    padding: "4px 12px",
    fontWeight: 500,
    transition: "all 0.2s ease-in-out",
    fontSize: "12px",
    textTransform: "none",
    borderRadius: "999px !important",
    marginRight: "4px",

    "&.Mui-selected": {
      backgroundColor: "var(--brand-primary-color, $primary-color)",
      color: "#fff",
      "&:hover": {
        backgroundColor: "#016aa1", // darker blue on hover
      },
    },

    "&:hover": {
      backgroundColor: "#017EBD14",
    }
  },
  "& .MuiToggleButton-root:first-of-type": {
    borderTopLeftRadius: language === "ar" ? 0 : 4,
    borderBottomLeftRadius: language === "ar" ? 0 : 4,
    borderTopRightRadius: language === "ar" ? 4 : 0,
    borderBottomRightRadius: language === "ar" ? 4 : 0,
  },
  "& .MuiToggleButton-root:last-of-type": {
    borderTopRightRadius: language === "ar" ? 0 : 4,
    borderBottomRightRadius: language === "ar" ? 0 : 4,
    borderTopLeftRadius: language === "ar" ? 4 : 0,
    borderBottomLeftRadius: language === "ar" ? 4 : 0,
  },
}));

const LanguageSwitcher = () => {
  const [language, setLanguage] = useState(() => localStorage.getItem('appLanguage') || 'en');

  useEffect(() => {
    document.dir = language === "ar" ? "rtl" : "ltr"; // Set text direction
    i18n.changeLanguage(language);
    document.documentElement.lang = language;
    localStorage.setItem('appLanguage', language);
  }, [language]);

  const handleChange = (_, newLang) => {
    if (newLang) {
      setLanguage(newLang);
    }
  };

  return (
    <StyledToggleButtonGroup
      value={language}
      exclusive
      onChange={handleChange}
      language={language}
      size="small"
    >
      <ToggleButton size="small" value="en"> English</ToggleButton>
      <ToggleButton style={{padding:'3px 16px',fontSize:13,marginLeft:2}} size="small" value="ar"> عربي</ToggleButton>
    </StyledToggleButtonGroup>
  );
};

export default LanguageSwitcher;
