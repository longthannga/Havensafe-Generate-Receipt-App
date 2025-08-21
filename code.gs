// Web app entry point
function doGet() {
  return HtmlService.createHtmlOutputFromFile('OCRProcessor')
    .setTitle('Donation Receipt Processor')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Process form data and create receipt - Updated to handle both templates
function createReceiptFromForm(formData) {
  const today = Utilities.formatDate(new Date(), 'GMT-7', 'MMMM d, yyyy');
  const formattedDonateDate = formatDateString(formData.donationDate);
  
  let docUrl;
  
  // Determine which template and delivery method to use
  if (formData.donorEmail && formData.donorEmail.trim()) {
    // Use template without address, send to donor
    docUrl = createReceiptWithoutAddress(
      formData.donorName,
      formData.donationAmount,
      formattedDonateDate,
      today,
      formData.donorEmail
    );
  } else if (formData.donorAddress && formData.donorAddress.trim()) {
    // Use template with address, send to organization email
    const formattedAddress = formatAddress(formData.donorAddress);
    docUrl = createReceipt(
      formData.donorName,
      formData.donationAmount,
      formattedDonateDate,
      today,
      formattedAddress,
      formData.recipientEmail || 'shannon@havensafe.org'
    );
  } else {
    throw new Error("Either donor email or donor address must be provided");
  }
  
  // Add to spreadsheet
  addToSpreadsheet(
    formData.donorName,
    formData.donationDate,
    formData.donationAmount,
    formData.recipientEmail || 'shannon@havensafe.org',
    docUrl,
    formData.donorEmail || null  // Add donor email to spreadsheet
  );
  
  return true;
}

// New function: Create receipt without address template
function createReceiptWithoutAddress(name, amount, donateDate, date, donorEmail) {
  try {
    // Validate email format
    if (!donorEmail || !isValidEmail(donorEmail)) {
      throw new Error("Invalid donor email address provided");
    }
    
    // Copy template without address
    const copyName = `DonationReceipt_NoAddr_${name.replace(/\s+/g, '_')}`;
    const copyFile = DriveApp.getFileById(TEMPLATE_WITHOUT_ADDRESS_ID).makeCopy(copyName);
    const docId = copyFile.getId();
    const doc = DocumentApp.openById(docId);
    const body = doc.getBody();
    
    // Replace placeholders (no address placeholders in this template)
    body.replaceText('{{DATE}}', date);
    body.replaceText('{{NAME}}', name);
    body.replaceText('{{AMOUNT}}', amount);
    body.replaceText('{{DONATE_DATE}}', donateDate);
    body.replaceText('{{REP_NAME}}', REP_NAME);
    body.replaceText('{{REP_TITLE}}', REP_TITLE);
    doc.saveAndClose();
    copyFile.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.EDIT);

    // Create PDF
    const pdf = copyFile.getAs('application/pdf');
    const subject = `Your Donation Receipt - Havensafe`;
    const message = `Dear ${name},\n\nThank you for your generous donation to Havensafe! Please find your official donation receipt attached.\n\nBest regards,\n${REP_NAME}\n${REP_TITLE}\nHavensafe`;
    
    // Send email to donor
    MailApp.sendEmail({
      to:          donorEmail,
      subject:     subject,
      body:        message,
      attachments: [pdf]
    });
    
    // Move processed document to folder
    const processedFolder = getOrCreateFolder('Processed Receipts');
    copyFile.moveTo(processedFolder);
    
    return copyFile.getUrl();
  } catch (e) {
    console.error("Error creating receipt without address:", e);
    throw new Error("Receipt creation failed: " + e.message);
  }
}

// Format address consistently
function formatAddress(address) {
  try {
    if (!address) return "";
    
    // Clean up common OCR errors
    let cleanAddress = address
      .replace(/\s+/g, ' ') // Remove extra spaces
      .replace(/\s*,\s*/g, ', ') // Standardize commas
      .replace(/,{2,}/g, ',') // Remove duplicate commas
      .replace(/(\d{5})\D*$/, '$1'); // Clean after ZIP code
    
    // Split into parts and capitalize properly
    const parts = cleanAddress.split(',').map(part => {
      return part.trim()
        .replace(/\b\w/g, c => c.toUpperCase()) // Capitalize first letters
        .replace(/\b(?:Ave|St|Dr|Rd|Blvd|Ln)\b/gi, match => match.toLowerCase()); // Lowercase street types
    });
    
    return parts.join(', ');
  } catch (e) {
    console.error("Address formatting error:", e);
    return address;
  }
}

// Format date string consistently
function formatDateString(dateStr) {
  if (!dateStr) return "";
  
  try {
    // Handle various date formats
    const formats = [
      { regex: /([A-Z][a-z]+ \d{1,2},? \d{4})/, format: 'MMMM d, yyyy' }, // July 25, 2025
      { regex: /(\d{1,2}\/\d{1,2}\/\d{4})/, format: 'MMMM d, yyyy' },    // 07/25/2025
      { regex: /(\d{4}-\d{2}-\d{2})/, format: 'MMMM d, yyyy' }            // 2025-07-25
    ];
    
    for (const format of formats) {
      const match = dateStr.match(format.regex);
      if (match) {
        const dateObj = new Date(match[0]);
        if (!isNaN(dateObj)) {
          return Utilities.formatDate(dateObj, 'GMT-7', format.format);
        }
      }
    }
    
    return dateStr; // Return original if we can't parse
  } catch (e) {
    console.error("Date formatting error:", e);
    return dateStr;
  }
}

// Create receipt from template with address - Updated to accept recipient email
function createReceipt(name, amount, donateDate, date, address, recipientEmail) {
  try {
    // Validate email format
    if (!recipientEmail || !isValidEmail(recipientEmail)) {
      throw new Error("Invalid recipient email address provided");
    }
    
    // Copy template with address
    const copyName = `DonationReceipt_${name.replace(/\s+/g, '_')}`;
    const copyFile = DriveApp.getFileById(TEMPLATE_WITH_ADDRESS_ID).makeCopy(copyName);
    const docId = copyFile.getId();
    const doc = DocumentApp.openById(docId);
    const body = doc.getBody();
    
    // Replace placeholders
    body.replaceText('{{DATE}}', date);
    body.replaceText('{{NAME}}', name);
    body.replaceText('{{AMOUNT}}', amount);
    body.replaceText('{{DONATE_DATE}}', donateDate);
    body.replaceText('{{REP_NAME}}', REP_NAME);
    body.replaceText('{{REP_TITLE}}', REP_TITLE);
    body.replaceText('{{ADDRESS}}', address);
    doc.saveAndClose();
    copyFile.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.EDIT);

    // Create PDF
    const pdf = copyFile.getAs('application/pdf');
    const subject = `${name} Donation Receipt - Havensafe`;
    const message = `Attached is the donation receipt for ${name}.\n\nPlease mail it to:\n${address}\n\nThank you!`;
    
    // Send email to specified recipient (organization)
    MailApp.sendEmail({
      to:          recipientEmail,
      subject:     subject,
      body:        message,
      attachments: [pdf]
    });
    
    // Move processed document to folder
    const processedFolder = getOrCreateFolder('Processed Receipts');
    copyFile.moveTo(processedFolder);
    
    return copyFile.getUrl();
  } catch (e) {
    console.error("Error creating receipt:", e);
    throw new Error("Receipt creation failed: " + e.message);
  }
}

// Email validation function
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Get or create folder for processed receipts
function getOrCreateFolder(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(folderName);
}

// Updated function to write to spreadsheet with donor email
function addToSpreadsheet(donorName, donationDate, amount, recipientEmail, docUrl, donorEmail) {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      console.error(`Sheet "${SHEET_NAME}" not found`);
      return;
    }
    
    // Format dates
    const formattedDonationDate = formatDateForSheet(donationDate);
    const today = new Date();
    const confirmationDate = Utilities.formatDate(today, Session.getTimeZone(), 'M/d/yy');
    
    // Format amount as number
    const numericAmount = parseFloat(amount.replace(/[$,]/g, ''));
    
    // Determine delivery method
    const deliveryMethod = donorEmail ? 'Emailed to Donor' : 'Mailed to Address';
    const sentTo = donorEmail ? donorEmail : 'Physical Mail';
    
    // Create data row
    const data = [
      donorName,                      // A: Donor Name
      formattedDonationDate,          // B: Donation Date
      numericAmount,                  // C: Amount
      donorEmail ? 'Cash' : 'Check',  // D: Payment Type
      '',                             // E: Sent To 
      docUrl,                         // F: Link to Document
      confirmationDate,               // G: Confirmation Date
      recipientEmail,                 // H: Assigned To (organization email)
      'yes',                          // I: Card Written?
      donorEmail ? 'yes' : 'no',      // J: Card Sent? (yes if emailed, no if needs mailing)
      `Processed via Web App - ${deliveryMethod}` // K: Note
    ];

    // Insert new row at position 2
    sheet.insertRowBefore(2);
    sheet.getRange(2, 1, 1, data.length).setValues([data]);
    
    console.log(`Added to spreadsheet: ${donorName}, $${amount}, ${deliveryMethod}`);
    
  } catch (error) {
    console.error('Spreadsheet error:', error);
  }
}

// Helper to format date for spreadsheet
function formatDateForSheet(dateStr) {
  try {
    const dateObj = new Date(dateStr);
    return isNaN(dateObj) ? dateStr : Utilities.formatDate(dateObj, Session.getTimeZone(), 'M/d/yy');
  } catch (e) {
    return dateStr;
  }
}

// Constants - Updated with new template ID
const TEMPLATE_WITH_ADDRESS_ID = 'YOUR TEMPLATE WITH ADDRESS ID'; // Original template
const TEMPLATE_WITHOUT_ADDRESS_ID = 'YOUR TEMPLATE_WITH_ADDRESS_ID'; // New template without address
const REP_NAME = 'YOUR REP_NAME';
const REP_TITLE = 'YOUR REP_TITLE';
const SPREADSHEET_ID = 'YOUR SHEET ID';
const SHEET_NAME = 'YOUR SHEET NAME';