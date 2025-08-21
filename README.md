
# 📄 Donation Receipt Processor
> This project was created during my volunteer internship at [Havensafe](https://havensafe.org)

A web-based tool to **process donation receipts** using **OCR (Tesseract.js)** or **manual entry**, built for nonprofits and organizations. It allows you to extract donor details from scanned letters, review and edit them, and generate/send donation receipts by email or prepare them for mailing.

---

## 🚀 Features

* **Two modes of input**:

  * 📄 **Scan Document**: Upload a scanned JPG/PNG donation letter and extract donor details using OCR.
  * ✍️ **Manual Entry**: Enter donor details directly.

* **Supported Formats**:

  * Fidelity Charitable (with "send it to the following address")
  * DAFgiving360 (with "Acknowledgment" and "Address" sections)
  * Generic donation letters with donor name, amount, date, and address

* **Smart OCR Parsing**: Automatically extracts donor name, amount, date, and address.

* **Contact Delivery Options**:

  * 📧 Email receipt directly to donor
  * 📮 Generate receipt for mailing to donor’s address

* **Polished UI**: Drag-and-drop upload, progress bar, editable fields, and success messages.

---

## 🛠️ Technology Stack

* **Frontend**: HTML, CSS, JavaScript
* **OCR**: [Tesseract.js](https://tesseract.projectnaptha.com/)
* **Backend**: Google Apps Script (`code.gs`) for generating and sending receipts

---

## 📂 Project Structure

```
├── OCRProcessor.html   # Frontend interface (scan + manual entry UI)
├── code.gs             # Google Apps Script backend (receipt generation, email integration)
└── README.md           # Documentation
```

---

## ⚡ Setup & Usage

### 1. Deploy as a Google Apps Script Web App

1. Open Google Drive → New → More → Google Apps Script
2. Create a new project and upload `code.gs`
3. Add `OCRProcessor.html` as an HTML file in the project
4. Deploy as a **Web App** (with appropriate permissions for sending emails)

### 2. Using the App

* Open the deployed URL
* Choose **Scan Document** or **Manual Entry**
* Enter or extract donor info
* Select delivery method (email or mail)
* Click **Generate & Send Receipt**

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you’d like to change.

---

## 📜 License

MIT License – feel free to use and adapt.

---
