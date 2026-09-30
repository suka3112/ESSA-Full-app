import React from 'react';
import ThemedSVG from '../ThemedSVG';
import PropTypes from 'prop-types';

// Import all SVG icons as React components
// Using ReactComponent import syntax (CRA 5+ supports this)
import { ReactComponent as DashboardIcon } from '../../../assets/icons/dashboard.svg';
import { ReactComponent as MyProfileIcon } from '../../../assets/icons/myProfile.svg';
import { ReactComponent as SOAIcon } from '../../../assets/icons/SOA.svg';
import { ReactComponent as POIcon } from '../../../assets/icons/poIcon.svg';
import { ReactComponent as InvoiceIcon } from '../../../assets/icons/invoice.svg';
import { ReactComponent as InquiresIcon } from '../../../assets/icons/inquires.svg';
import { ReactComponent as VendorsIcon } from '../../../assets/icons/vendorsIcon.svg';
import { ReactComponent as PaymentIcon } from '../../../assets/icons/payment.svg';
import { ReactComponent as FAQIcon } from '../../../assets/icons/faqIcon.svg';
import { ReactComponent as ChevronDownIcon } from '../../../assets/icons/chevronDown.svg';
import { ReactComponent as UserManagementIcon } from '../../../assets/icons/userManagementIcon.svg';
import { ReactComponent as UploadedImgIcon } from '../../../assets/icons/uploadedImg2.svg';
import { ReactComponent as PdfIcon } from '../../../assets/icons/pdf-svgrepo-com.svg';
import { ReactComponent as TooltipIcon } from '../../../assets/icons/tooltip.svg';
import { ReactComponent as UploadIcon } from '../../../assets/icons/uploadIcon.svg';
import { ReactComponent as UploadIconWhite } from '../../../assets/icons/uploadIconWhite.svg';
import { ReactComponent as XlsIcon } from '../../../assets/icons/xlsIcon.svg';
import { ReactComponent as EnquiryIcon } from '../../../assets/images/dashboard/enquiry.svg';
import { ReactComponent as UploadSOAIcon } from '../../../assets/images/dashboard/uploadSOA.svg';
import { ReactComponent as SubmitInvoiceIcon } from '../../../assets/images/dashboard/submitInvoice.svg';
import { ReactComponent as RequestIcon } from '../../../assets/images/dashboard/request.svg';
import { ReactComponent as DownloadIcon } from '../../../assets/icons/downloadIcon.svg';
import { ReactComponent as SendMessageIcon } from '../../../assets/icons/sendMessageIcon.svg';
import { ReactComponent as EmailReportIcon } from '../../../assets/icons/emailReport.svg';
import { ReactComponent as EditIcon } from '../../../assets/icons/editIcon.svg';
import { ReactComponent as BellIcon } from '../../../assets/icons/bellIcon.svg';
import { ReactComponent as BackIconWhite } from '../../../assets/icons/backIconWhite.svg';
import { ReactComponent as NotificationIcon } from '../../../assets/icons/notificationIcon.svg';
import { ReactComponent as NameIcon } from '../../../assets/icons/nameIcon.svg';
import { ReactComponent as MailIcon } from '../../../assets/icons/mailIcon.svg';
import { ReactComponent as HistoryIcon } from '../../../assets/icons/historyIcon.svg';
import { ReactComponent as DownloadIcon2 } from '../../../assets/icons/downloadIcon2.svg';
import { ReactComponent as HelpIcon } from '../../../assets/icons/helpIcon.svg';
import { ReactComponent as EditIconOutlined } from '../../../assets/icons/editIconOutlined.svg';
import { ReactComponent as WhiteEditIcon } from '../../../assets/icons/whiteEdit.svg';
import { ReactComponent as DeptIcon } from '../../../assets/icons/deptIcon.svg';
import { ReactComponent as SettingsFilledIcon } from '../../../assets/icons/settingsFilled.svg';
import { ReactComponent as CardAddIcon } from '../../../assets/icons/card-add.svg';
import { ReactComponent as BackArrowIcon } from '../../../assets/icons/backArrow.svg';
import { ReactComponent as EntityIcon } from '../../../assets/icons/entityIcon.svg';
import { ReactComponent as FCBookIcon } from '../../../assets/images/LayoutFooterIcons/fcBookIcon.svg';
import { ReactComponent as InstaIcon } from '../../../assets/images/LayoutFooterIcons/instaIcon.svg';
import { ReactComponent as UTubeIcon } from '../../../assets/images/LayoutFooterIcons/uTubeIcon.svg';
import { ReactComponent as TwitterIcon } from '../../../assets/images/LayoutFooterIcons/twitterIcon.svg';
import { ReactComponent as LinkedInIcon } from '../../../assets/images/LayoutFooterIcons/linkedInIcon.svg';
import { ReactComponent as AddIcon } from '../../../assets/images/email-add-icon.svg';
/**
 * Icon registry mapping icon names to their React components #017EBD
 */
const iconRegistry = {
  dashboard: DashboardIcon,
  myProfile: MyProfileIcon,
  soa: SOAIcon,
  po: POIcon,
  invoice: InvoiceIcon,
  inquires: InquiresIcon,
  vendors: VendorsIcon,
  payment: PaymentIcon,
  faq: FAQIcon,
  chevronDown: ChevronDownIcon,
  userManagement: UserManagementIcon,
  uploadedImg: UploadedImgIcon,
  pdf: PdfIcon,
  tooltip: TooltipIcon,
  upload: UploadIcon,
  uploadWhite: UploadIconWhite,
  xls: XlsIcon,
  enquiry: EnquiryIcon,
  uploadSOA: UploadSOAIcon,
  submitInvoice: SubmitInvoiceIcon,
  request: RequestIcon,
  download: DownloadIcon,
  sendMessage: SendMessageIcon,
  emailReport: EmailReportIcon,
  edit: EditIcon,
  bell: BellIcon,
  backIconWhite: BackIconWhite,
  notification: NotificationIcon,
  name: NameIcon,
  mail: MailIcon,
  history: HistoryIcon,
  download2: DownloadIcon2,
  help: HelpIcon,
  editOutlined: EditIconOutlined,
  whiteEdit: WhiteEditIcon,
  dept: DeptIcon,
  settings: SettingsFilledIcon,
  cardAdd: CardAddIcon,
  backArrow: BackArrowIcon,
  entity: EntityIcon,
  fcBook: FCBookIcon,
  insta: InstaIcon,
  uTube: UTubeIcon,
  twitter: TwitterIcon,
  linkedIn: LinkedInIcon,
  add: AddIcon,
};

/**
 * SVGIcon Component
 * 
 * Centralized component for rendering themed SVG icons.
 * Automatically applies brand theme colors.
 * 
 * Usage:
 *   <SVGIcon name="dashboard" />
 *   <SVGIcon name="invoice" colorType="secondary" size={24} />
 * 
 * @param {string} name - Icon name from registry
 * @param {string} colorType - Theme color type: 'primary', 'secondary', 'accent'
 * @param {string} fill - Override fill color
 * @param {string} stroke - Override stroke color
 * @param {boolean} useThemeColor - Whether to apply theme color (default: true)
 * @param {string} className - Additional CSS classes
 * @param {object} style - Additional inline styles
 * @param {number|string} size - Icon size (applied to width and height)
 * @param {object} ...props - Other props passed to ThemedSVG
 */
const SVGIcon = ({
  name,
  colorType = 'primary',
  fill,
  stroke,
  useThemeColor = true,
  className = '',
  style = {},
  size,
  width, height,
  ...props
}) => {
  const IconComponent = iconRegistry[name];

  if (!IconComponent) {
    console.warn(`SVGIcon: Icon "${name}" not found in registry. Available icons: ${Object.keys(iconRegistry).join(', ')}`);
    return null;
  }

  // Priority: explicit width/height > size > undefined
  const finalWidth = width !== undefined 
  ? (typeof width === 'number' ? width : parseFloat(width))
  : (size ? (typeof size === 'number' ? size : parseFloat(size)) : undefined);

  const finalHeight = height !== undefined
  ? (typeof height === 'number' ? height : parseFloat(height))
  : (size ? (typeof size === 'number' ? size : parseFloat(size)) : undefined);

  const sizeProps = (finalWidth !== undefined || finalHeight !== undefined)
  ? {
      ...(finalWidth !== undefined && { width: finalWidth }),
      ...(finalHeight !== undefined && { height: finalHeight }),
    }
  : {};

  const sizeStyle = (finalWidth !== undefined || finalHeight !== undefined)
  ? {
      ...(finalWidth !== undefined && { width: typeof finalWidth === 'number' ? `${finalWidth}px` : finalWidth }),
      ...(finalHeight !== undefined && { height: typeof finalHeight === 'number' ? `${finalHeight}px` : finalHeight }),
    }
  : {};

  return (
    <ThemedSVG
      src={IconComponent}
      colorType={colorType}
      fill={fill}
      stroke={stroke}
      useThemeColor={useThemeColor}
      className={className}
      style={{
        ...sizeStyle,
        ...style,
      }}
      {...sizeProps}
      {...props}
    />
  );
};

SVGIcon.propTypes = {
  name: PropTypes.string.isRequired,
  colorType: PropTypes.oneOf(['primary', 'secondary', 'accent']),
  fill: PropTypes.string,
  stroke: PropTypes.string,
  useThemeColor: PropTypes.bool,
  className: PropTypes.string,
  style: PropTypes.object,
  size: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
};

/**
 * Get all available icon names
 * @returns {string[]} Array of available icon names
 */
SVGIcon.getAvailableIcons = () => {
  return Object.keys(iconRegistry);
};

/**
 * Check if an icon exists in the registry
 * @param {string} name - Icon name to check
 * @returns {boolean} True if icon exists
 */
SVGIcon.hasIcon = (name) => {
  return name in iconRegistry;
};

export default SVGIcon;
