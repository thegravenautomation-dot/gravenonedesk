import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

export interface ExportOptions {
  filename: string;
  title?: string;
}

// Export component to PDF
export const exportToPDF = async (elementRef: HTMLElement, options: ExportOptions) => {
  try {
    const canvas = await html2canvas(elementRef, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    const imgX = (pdfWidth - imgWidth * ratio) / 2;
    const imgY = 0;

    pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
    pdf.save(`${options.filename}.pdf`);
    
    return true;
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    return false;
  }
};

// Export order payment data to Excel
export const exportOrderPaymentToExcel = (orderData: any, payments: any[], options: ExportOptions) => {
  try {
    const workbook = XLSX.utils.book_new();
    
    // Order Summary Sheet
    const orderSummary = [
      ['Order Payment Summary Report'],
      [''],
      ['Order Details'],
      ['Order No', orderData.order_no],
      ['Customer', orderData.customer_name],
      ['Company', orderData.customer_company || 'N/A'],
      ['Order Date', new Date(orderData.order_date).toLocaleDateString('en-IN')],
      ['Order Amount', `₹${orderData.total_amount.toFixed(2)}`],
      ['Status', orderData.status],
      [''],
      ['Payment Summary'],
      ['Total Paid', `₹${payments.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}`],
      ['Balance Due', `₹${(orderData.total_amount - payments.reduce((sum, p) => sum + p.amount, 0)).toFixed(2)}`],
      [''],
      ['Payment History'],
      ['Date', 'Amount', 'Method', 'Mode', 'Reference', 'Notes']
    ];

    // Add payment entries
    payments.forEach(payment => {
      orderSummary.push([
        new Date(payment.payment_date).toLocaleDateString('en-IN'),
        payment.amount,
        payment.method || 'Cash',
        payment.payment_mode,
        payment.reference || '',
        payment.note || ''
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(orderSummary);
    XLSX.utils.book_append_sheet(workbook, ws, 'Order Payment Summary');
    
    XLSX.writeFile(workbook, `${options.filename}.xlsx`);
    return true;
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    return false;
  }
};

// Export customer ledger data to Excel
export const exportCustomerLedgerToExcel = (customerData: any, ledgerEntries: any[], accountSummary: any, options: ExportOptions) => {
  try {
    const workbook = XLSX.utils.book_new();
    
    // Customer Summary Sheet
    const summary = [
      ['Customer Ledger Report'],
      [''],
      ['Customer Details'],
      ['Name', customerData.name],
      ['Company', customerData.company || 'N/A'],
      ['Email', customerData.email || 'N/A'],
      ['Phone', customerData.phone || 'N/A'],
      ['GSTIN', customerData.gstin || 'N/A'],
      ['Address', customerData.address || 'N/A'],
      [''],
      ['Account Summary'],
      ['Total Orders', accountSummary.total_orders],
      ['Total Payments', accountSummary.total_payments],
      ['Current Balance', accountSummary.current_balance],
      ['Total Due', accountSummary.total_due],
      [''],
      ['Transaction History'],
      ['Date', 'Description', 'Type', 'Debit', 'Credit', 'Balance', 'Mode']
    ];

    // Add ledger entries
    ledgerEntries.forEach(entry => {
      summary.push([
        new Date(entry.transaction_date).toLocaleDateString('en-IN'),
        entry.description,
        entry.transaction_type,
        entry.debit_amount || 0,
        entry.credit_amount || 0,
        entry.balance,
        entry.payment_mode || ''
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(summary);
    XLSX.utils.book_append_sheet(workbook, ws, 'Customer Ledger');
    
    XLSX.writeFile(workbook, `${options.filename}.xlsx`);
    return true;
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    return false;
  }
};