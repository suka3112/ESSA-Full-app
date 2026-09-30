import { color } from 'services/colors'
import {
  po as PO,
  invoices as Invoices,
  payment as Payment,
  received as Received,
  reconciliation as Reconciliation,
  grow as Grow,
  loss as Loss
} from 'constants/imageConstants'

export const selectOptions = [
  { value: 0, label: 'All' },
  { value: 1, label: 'Active' },
  { value: 2, label: 'Inactive' }
]

export const taxableOptions = [
  { label: '0%', value: '0' },
  { label: '1%', value: '1' },
  { label: '5%', value: '5' },
  { label: '10%', value: '10' },
  { label: '14%', value: '14' },
  { label: '15%', value: '15' },
  { label: 'Out of Scope', value: 'Out of Scope' }
]

export const vendorRole = [
  { label: 'Admin', value: 'Admin' },
  { label: 'User', value: 'User' }
]

export const whtRateOptions = [
  { label: '0%', value: 0 },
  { label: '5%', value: 5 }
]

export const whtApplicableOptions = [
  { label: 'Yes', value: "Yes" },
  { label: 'No', value: "No" }
]

export const industryTypeOptions = [
  { label: 'Public (Gov)', value: 'Public' },
  { label: 'Private (Non-Gov)', value: 'Private' }
]

export const paymentTermsOptions = [
  { label: '90 days', value: 90 },
  { label: 'others', value: 'others' }
]

export const otherPaymentTermsOptions = [
  { label: '7 days', value: 7 },
  { label: '15 days', value: 15 },
  { label: '30 days', value: 30 },
  { label: '45 days', value: 45 },
  { label: '60 days', value: 60 }
]

export const attachmentTypeOptions = [
  { label: 'Invoice', value: 'invoice' },
  { label: 'Delivery Note', value: 'delivery note' },
  { label: 'Shipping Documents', value: 'shipping documents' },
  // { label: 'Receipt', value: 'receipt' },
  { label: 'Others', value: 'others' },
]
export const CreditNoteAttachmentTypeOptions = [
  { label: 'Credit Note', value: 'invoice' },
  { label: 'Delivery Note', value: 'delivery note' },
  { label: 'Shipping Documents', value: 'shipping documents' },
  // { label: 'Receipt', value: 'receipt' },
  { label: 'Others', value: 'others' },
]

export const enquiryAttachmentTypeOptions = [
  { label: 'Invoice', value: 'invoice' },
  { label: 'Bank Data', value: 'bank data' },
  { label: 'Email', value: 'email' },
  // { label: 'Receipt', value: 'receipt' },
  { label: 'Others', value: 'others' },
]

export const statusOptions = [
  { label: 'All', value: 'All' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'in_active' },
]

export const DashboardCards = [
  {
    label: 'Outstanding PO',
    total: '00',
    title: 'Up from yesterday',
    icon: PO,
    subIcon: Grow,
    percentage: '8.5%',
    percentageColor: '#00B69B',
    bgColor: `${color.dataVisualisation.shade2['400']}`,
    totals: ['USD 4.1K', 'AED 4.6K', 'EUR 4.9K']
  },
  {
    label: 'Pending Invoices',
    total: '00',
    title: 'Up from yesterday',
    percentage: '8.5%',
    percentageColor: '#00B69B',
    icon: Invoices,
    subIcon: Grow,
    bgColor: `${color.dataVisualisation.shade1['400']}`,
    totals: ['USD 4.1K', 'AED 4.6K', 'EUR 4.9K']
  },
  {
    label: 'Outstanding Payment',
    total: '00',
    title: 'Up from yesterday',
    icon: Payment,
    subIcon: Loss,
    percentage: '8.5%',
    percentageColor: '#F93C65',
    bgColor: `${color.dataVisualisation.shade3['400']}`,
    totals: ['USD 4.1K', 'AED 4.6K', 'EUR 4.9K']
  },
  {
    label: 'Payable This Month',
    total: '00',
    title: 'Up from yesterday',
    icon: Invoices,
    subIcon: Grow,
    percentage: '8.5%',
    percentageColor: '#00B69B',
    bgColor: `${color.dataVisualisation.shade1['400']}`,
    totals: ['USD 4.1K', 'AED 4.6K', 'EUR 4.9K']
  },
  {
    label: 'Pending Reconciliation',
    total: '00',
    title: 'Up from yesterday',
    icon: Reconciliation,
    subIcon: Loss,
    percentage: '8.5%',
    percentageColor: '#F93C65',
    bgColor: '#ffdad0c2',
    totals: ['USD 4.1K', 'AED 4.6K', 'EUR 4.9K']
  },
  {
    label: 'Pending Tickets',
    total: '00',
    title: 'Up from yesterday',
    icon: Received,
    subIcon: Grow,
    percentage: '8.5%',
    percentageColor: '#00B69B',
    bgColor: '#e1eaed',
    totals: ['USD 4.1K', 'AED 4.6K', 'EUR 4.9K']
  }
]

export const TableData = [
  {
    date: '02',
    month: 'Nov',
    name: 'Non PO based Invoice is Approved.',
    subname: 'Invoice No. 123456'
  },
  {
    date: '03',
    month: 'Nov',
    name: 'Payment Processed Successfully.',
    subname: 'Transaction ID: 987654'
  },
  { date: '04', month: 'Nov', name: 'PO Created Successfully.', subname: 'PO No. 543210' },
  { date: '05', month: 'Nov', name: 'Shipment Dispatched.', subname: 'AWB No. 112233' },
  { date: '06', month: 'Nov', name: 'Goods Received at Warehouse.', subname: 'GRN No. 778899' },
  { date: '07', month: 'Nov', name: 'Invoice Payment Initiated.', subname: 'Invoice No. 998877' },
  { date: '08', month: 'Nov', name: 'Credit Note Issued.', subname: 'Credit Note No. 665544' },
  { date: '09', month: 'Nov', name: 'Invoice Under Review.', subname: 'Invoice No. 334455' },
  { date: '10', month: 'Nov', name: 'Payment Due Reminder Sent.', subname: 'Reminder ID: 556677' },
  { date: '11', month: 'Nov', name: 'Purchase Request Approved.', subname: 'Request ID: 112244' },
  {
    date: '12',
    month: 'Nov',
    name: 'Vendor Registration Completed.',
    subname: 'Vendor ID: 998822'
  },
  { date: '13', month: 'Nov', name: 'Contract Signed.', subname: 'Contract No. 887766' },
  { date: '14', month: 'Nov', name: 'Expense Report Submitted.', subname: 'Report ID: 223344' },
  { date: '15', month: 'Nov', name: 'Refund Processed.', subname: 'Refund No. 554433' },
  { date: '16', month: 'Nov', name: 'Inventory Updated.', subname: 'Stock ID: 667788' },
  { date: '17', month: 'Nov', name: 'Delivery Completed.', subname: 'Order No. 776655' },
  { date: '13', month: 'Nov', name: 'Contract Signed.', subname: 'Contract No. 887766' },
  { date: '14', month: 'Nov', name: 'Expense Report Submitted.', subname: 'Report ID: 223344' },
  { date: '15', month: 'Nov', name: 'Refund Processed.', subname: 'Refund No. 554433' },
  { date: '16', month: 'Nov', name: 'Inventory Updated.', subname: 'Stock ID: 667788' },
  { date: '17', month: 'Nov', name: 'Delivery Completed.', subname: 'Order No. 776655' },
  { date: '13', month: 'Nov', name: 'Contract Signed.', subname: 'Contract No. 887766' },
  { date: '14', month: 'Nov', name: 'Expense Report Submitted.', subname: 'Report ID: 223344' },
  { date: '15', month: 'Nov', name: 'Refund Processed.', subname: 'Refund No. 554433' },
  { date: '16', month: 'Nov', name: 'Inventory Updated.', subname: 'Stock ID: 667788' },
  { date: '17', month: 'Nov', name: 'Delivery Completed.', subname: 'Order No. 776655' },
  { date: '13', month: 'Nov', name: 'Contract Signed.', subname: 'Contract No. 887766' },
  { date: '14', month: 'Nov', name: 'Expense Report Submitted.', subname: 'Report ID: 223344' },
  { date: '15', month: 'Nov', name: 'Refund Processed.', subname: 'Refund No. 554433' },
  { date: '16', month: 'Nov', name: 'Inventory Updated.', subname: 'Stock ID: 667788' },
  { date: '17', month: 'Nov', name: 'Delivery Completed.', subname: 'Order No. 776655' },
  { date: '18', month: 'Nov', name: 'New Supplier Onboarded.', subname: 'Supplier ID: 889977' },
  { date: '19', month: 'Nov', name: 'Customer Feedback Received.', subname: 'Feedback ID: 665544' },
  { date: '20', month: 'Nov', name: 'Meeting Scheduled.', subname: 'Meeting ID: 778899' },
  { date: '13', month: 'Nov', name: 'Contract Signed.', subname: 'Contract No. 887766' },
  { date: '14', month: 'Nov', name: 'Expense Report Submitted.', subname: 'Report ID: 223344' },
  { date: '15', month: 'Nov', name: 'Refund Processed.', subname: 'Refund No. 554433' },
  { date: '16', month: 'Nov', name: 'Inventory Updated.', subname: 'Stock ID: 667788' },
  { date: '17', month: 'Nov', name: 'Delivery Completed.', subname: 'Order No. 776655' },
  { date: '13', month: 'Nov', name: 'Contract Signed.', subname: 'Contract No. 887766' },
  { date: '14', month: 'Nov', name: 'Expense Report Submitted.', subname: 'Report ID: 223344' },
  { date: '15', month: 'Nov', name: 'Refund Processed.', subname: 'Refund No. 554433' },
  { date: '16', month: 'Nov', name: 'Inventory Updated.', subname: 'Stock ID: 667788' },
  { date: '17', month: 'Nov', name: 'Delivery Completed.', subname: 'Order No. 776655' },
  { date: '13', month: 'Nov', name: 'Contract Signed.', subname: 'Contract No. 887766' },
  { date: '14', month: 'Nov', name: 'Expense Report Submitted.', subname: 'Report ID: 223344' },
  { date: '15', month: 'Nov', name: 'Refund Processed.', subname: 'Refund No. 554433' },
  { date: '16', month: 'Nov', name: 'Inventory Updated.', subname: 'Stock ID: 667788' },
  { date: '17', month: 'Nov', name: 'Delivery Completed.', subname: 'Order No. 776655' },
  { date: '18', month: 'Nov', name: 'New Supplier Onboarded.', subname: 'Supplier ID: 889977' },
  { date: '19', month: 'Nov', name: 'Customer Feedback Received.', subname: 'Feedback ID: 665544' },
  { date: '20', month: 'Nov', name: 'Meeting Scheduled.', subname: 'Meeting ID: 778899' },
  {
    date: '21',
    month: 'Nov',
    name: 'Annual Maintenance Completed.',
    subname: 'Maintenance ID: 223355'
  },
  {
    date: '22',
    month: 'Nov',
    name: 'Project Milestone Achieved.',
    subname: 'Milestone ID: 334455'
  },
  { date: '23', month: 'Nov', name: 'Budget Approved.', subname: 'Budget ID: 556677' },
  { date: '24', month: 'Nov', name: 'Training Session Conducted.', subname: 'Session ID: 889900' },
  { date: '25', month: 'Nov', name: 'Audit Completed Successfully.', subname: 'Audit No. 112233' },
  { date: '23', month: 'Nov', name: 'Budget Approved.', subname: 'Budget ID: 556677' },
  { date: '24', month: 'Nov', name: 'Training Session Conducted.', subname: 'Session ID: 889900' },
  { date: '25', month: 'Nov', name: 'Audit Completed Successfully.', subname: 'Audit No. 112233' },
  { date: '26', month: 'Nov', name: 'System Upgrade Completed.', subname: 'Upgrade ID: 998877' }
]

export const enquiryTableData = {
  headers: [
    { key: 'enquiryID', label: 'Enquiry ID' },
    { key: 'vendorName', label: 'Vendor Name' },
    { key: 'vendorCode', label: 'Vendor Code' },
    { key: 'enquiryType', label: 'Enquiry Type' },
    { key: 'assignedContactPerson', label: 'Assigned Contact Person' },
    { key: 'submissionDate', label: 'Submission Date' },
    { key: 'status', label: 'Enquiry Status' }
  ],
  data: [
    {
      enquiryID: '12/32451',
      vendorName: 'Kellie Toy',
      vendorCode: '123/1234',
      enquiryType: 'General',
      assignedContactPerson: 'Mamie Lesch',
      submissionDate: '18/07/2024',
      status: 'Resolved'
    },
    {
      enquiryID: '12/32451',
      vendorName: 'Kellie Toy',
      vendorCode: '123/1234',
      enquiryType: 'General',
      assignedContactPerson: 'Mamie Lesch',
      submissionDate: '18/07/2024',
      status: 'Submitted'
    },
    {
      enquiryID: '12/32451',
      vendorName: 'Kellie Toy',
      vendorCode: '123/1234',
      enquiryType: 'General',
      assignedContactPerson: 'Mamie Lesch',
      submissionDate: '18/07/2024',
      status: 'Under Review'
    },
    {
      enquiryID: '12/32451',
      vendorName: 'Kellie Toy',
      vendorCode: '123/1234',
      enquiryType: 'General',
      assignedContactPerson: 'Mamie Lesch',
      submissionDate: '18/07/2024',
      status: 'Resolved'
    },
    {
      enquiryID: '12/32451',
      vendorName: 'Kellie Toy',
      vendorCode: '123/1234',
      enquiryType: 'General',
      assignedContactPerson: 'Mamie Lesch',
      submissionDate: '18/07/2024',
      status: 'Resolved'
    },
    {
      enquiryID: '12/32451',
      vendorName: 'Kellie Toy',
      vendorCode: '123/1234',
      enquiryType: 'General',
      assignedContactPerson: 'Mamie Lesch',
      submissionDate: '18/07/2024',
      status: 'Resolved'
    },
    {
      enquiryID: '12/32451',
      vendorName: 'Kellie Toy',
      vendorCode: '123/1234',
      enquiryType: 'General',
      assignedContactPerson: 'Mamie Lesch',
      submissionDate: '18/07/2024',
      status: 'Resolved'
    },
    {
      enquiryID: '12/32451',
      vendorName: 'Kellie Toy',
      vendorCode: '123/1234',
      enquiryType: 'General',
      assignedContactPerson: 'Mamie Lesch',
      submissionDate: '18/07/2024',
      status: 'Resolved'
    },
    {
      enquiryID: '12/32451',
      vendorName: 'Kellie Toy',
      vendorCode: '123/1234',
      enquiryType: 'General',
      assignedContactPerson: 'Mamie Lesch',
      submissionDate: '18/07/2024',
      status: 'Resolved'
    },
    {
      enquiryID: '12/32451',
      vendorName: 'Kellie Toy',
      vendorCode: '123/1234',
      enquiryType: 'General',
      assignedContactPerson: 'Mamie Lesch',
      submissionDate: '18/07/2024',
      status: 'Resolved'
    },
    {
      enquiryID: '12/32451',
      vendorName: 'Kellie Toy',
      vendorCode: '123/1234',
      enquiryType: 'General',
      assignedContactPerson: 'Mamie Lesch',
      submissionDate: '18/07/2024',
      status: 'Resolved'
    },
    {
      enquiryID: '12/32451',
      vendorName: 'Kellie Toy',
      vendorCode: '123/1234',
      enquiryType: 'General',
      assignedContactPerson: 'Mamie Lesch',
      submissionDate: '18/07/2024',
      status: 'Resolved'
    },
    {
      enquiryID: '12/32451',
      vendorName: 'Kellie Toy',
      vendorCode: '123/1234',
      enquiryType: 'General',
      assignedContactPerson: 'Mamie Lesch',
      submissionDate: '18/07/2024',
      status: 'Resolved'
    },
    {
      enquiryID: '12/32451',
      vendorName: 'Kellie Toy',
      vendorCode: '123/1234',
      enquiryType: 'General',
      assignedContactPerson: 'Mamie Lesch',
      submissionDate: '18/07/2024',
      status: 'Resolved'
    }
  ]
}

export const countryCodes = [
  // Asia
  { code: '971', label: 'AE +971' }, // UAE

  { code: '91', label: 'IN +91' }, // India
  { code: '65', label: 'SG +65' }, // Singapore
  { code: '966', label: 'SA +966' }, // Saudi Arabia
  { code: '974', label: 'QA +974' }, // Qatar
  { code: '973', label: 'BH +973' }, // Bahrain
  { code: '968', label: 'OM +968' }, // Oman
  { code: '962', label: 'JO +962' }, // Jordan
  { code: '963', label: 'SY +963' }, // Syria
  { code: '964', label: 'IQ +964' }, // Iraq
  { code: '961', label: 'LB +961' }, // Lebanon
  { code: '970', label: 'PS +970' }, // Palestine
  { code: '972', label: 'IL +972' }, // Israel
  { code: '975', label: 'BT +975' }, // Bhutan
  { code: '976', label: 'MN +976' }, // Mongolia
  { code: '977', label: 'NP +977' }, // Nepal

  { code: '86', label: 'CN +86' }, // China
  { code: '81', label: 'JP +81' }, // Japan

  // Europe
  { code: '44', label: 'GB +44' }, // United Kingdom
  { code: '33', label: 'FR +33' }, // France
  { code: '49', label: 'DE +49' }, // Germany
  { code: '39', label: 'IT +39' }, // Italy
  { code: '34', label: 'ES +34' }, // Spain
  { code: '31', label: 'NL +31' }, // Netherlands
  { code: '41', label: 'CH +41' }, // Switzerland
  { code: '47', label: 'NO +47' }, // Norway
  { code: '46', label: 'SE +46' }, // Sweden
  { code: '43', label: 'AT +43' }, // Austria
  { code: '48', label: 'PL +48' }, // Poland
  { code: '420', label: 'CZ +420' }, // Czech Republic
  { code: '351', label: 'PT +351' }, // Portugal
  { code: '32', label: 'BE +32' }, // Belgium

  // Africa
  { code: '20', label: 'EG +20' }, // Egypt
  { code: '249', label: 'SD +249' }, // Sudan
  { code: '213', label: 'DZ +213' }, // Algeria
  { code: '212', label: 'MA +212' }, // Morocco
  { code: '216', label: 'TN +216' }, // Tunisia
  { code: '222', label: 'MR +222' }, // Mauritania
  { code: '234', label: 'NG +234' }, // Nigeria
  { code: '27', label: 'ZA +27' }, // South Africa
  { code: '251', label: 'ET +251' }, // Ethiopia
  { code: '256', label: 'UG +256' }, // Uganda
  { code: '254', label: 'KE +254' }, // Kenya
  { code: '250', label: 'RW +250' }, // Rwanda
  { code: '263', label: 'ZW +263' }, // Zimbabwe

  // Americas
  { code: '1', label: 'US +1' }, // USA
  { code: '1', label: 'CA +1' }, // Canada
  { code: '52', label: 'MX +52' }, // Mexico
  { code: '55', label: 'BR +55' }, // Brazil
  { code: '54', label: 'AR +54' }, // Argentina

  // Oceania
  { code: '61', label: 'AU +61' }, // Australia
  { code: '64', label: 'NZ +64' }, // New Zealand
    // { code: '', label: '' }, // UAE
];

