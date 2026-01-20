import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export const generateWarrantyPdf = async (claimData) => {
    console.log("Generating PDF for claim:", claimData);
    const reportElement = document.createElement('div');
    // --- Styling for the hidden element ---
    reportElement.style.position = 'absolute';
    reportElement.style.left = '-9999px';
    reportElement.style.width = '210mm';
    reportElement.style.padding = '15mm';
    reportElement.style.backgroundColor = 'white';
    reportElement.style.fontFamily = 'Arial, sans-serif';
    reportElement.style.fontSize = '12px';

    // --- Destructure data for easier access ---
    const { formData, incomingInspection, technicalEvaluation, conclusion } = claimData;

    // --- Build the HTML for the report ---
    let html = `
        <h1 style="font-size: 24px; color: #102647; border-bottom: 2px solid #102647; padding-bottom: 10px; margin-bottom: 20px;">Warranty Evaluation Report</h1>
        
        <h2 style="font-size: 18px; background-color: #f3f4f6; padding: 8px; border-radius: 4px;">Basic Information</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px;">
            <tr><td style="padding: 5px; font-weight: bold; width: 150px;">Customer Name:</td><td style="padding: 5px;">${formData.customerName || ''}</td></tr>
            <tr><td style="padding: 5px; font-weight: bold;">RGA / RO #:</td><td style="padding: 5px;">${formData.rgaNumber || ''}</td></tr>
            <tr><td style="padding: 5px; font-weight: bold;">Part Number:</td><td style="padding: 5px;">${formData.partNumber || ''}</td></tr>
            <tr><td style="padding: 5px; font-weight: bold;">Serial Number:</td><td style="padding: 5px;">${formData.serialNumber || ''}</td></tr>
            <tr><td style="padding: 5px; font-weight: bold;">Date of Failure:</td><td style="padding: 5px;">${formData.failureDate || ''}</td></tr>
            <tr><td style="padding: 5px; font-weight: bold;">Engine/Serial #:</td><td style="padding: 5px;">${formData.engineSerial || ''}</td></tr>
        </table>
        <div style="border: 1px solid #e5e7eb; padding: 10px; margin-bottom: 20px; border-radius: 4px;"><strong>Warranty Complaint:</strong> ${formData.warrantyComplaint || 'N/A'}</div>

        <h2 style="font-size: 18px; background-color: #f3f4f6; padding: 8px; border-radius: 4px;">Inspection</h2>
        ${incomingInspection.map(item => `
            <div style="border: 1px solid #e5e7eb; padding: 10px; margin-bottom: 10px; border-radius: 4px; page-break-inside: avoid;">
                <p><strong>Component:</strong> ${item.component || 'N/A'}</p>
                <p><strong>Notes:</strong> ${item.notes || 'N/A'}</p>
                ${item.imageUrl ? `<img src="${item.imageUrl}" style="max-width: 200px; margin-top: 5px; border-radius: 4px;" crossorigin="anonymous" />` : ''}
            </div>
        `).join('')}

        <h2 style="font-size: 18px; background-color: #f3f4f6; padding: 8px; border-radius: 4px; margin-top: 20px;">Evaluation</h2>
        ${technicalEvaluation.map(item => `
            <div style="border: 1px solid #e5e7eb; padding: 10px; margin-bottom: 10px; border-radius: 4px; page-break-inside: avoid;">
                <p><strong>Component:</strong> ${item.component || 'N/A'}</p>
                <p><strong>Comments/Findings:</strong> ${item.comments || 'N/A'}</p>
                ${item.imageUrl ? `<img src="${item.imageUrl}" style="max-width: 200px; margin-top: 5px; border-radius: 4px;" crossorigin="anonymous" />` : ''}
            </div>
        `).join('')}
        
        <h2 style="font-size: 18px; background-color: #f3f4f6; padding: 8px; border-radius: 4px; margin-top: 20px;">Conclusion</h2>
        <div style="border: 1px solid #e5e7eb; padding: 10px; border-radius: 4px;">
            <p><strong>Failure Mode:</strong> ${conclusion.failureMode || 'N/A'}</p>
            <p><strong>Failure Mode Analysis:</strong> ${conclusion.failureModeAnalysis || 'N/A'}</p>
            <p><strong>Corrective Actions:</strong> ${conclusion.correctiveActions || 'N/A'}</p>
            <p><strong>Final Status:</strong> <strong style="color: ${conclusion.status === 'Accepted' ? 'green' : 'red'};">${conclusion.status}</strong></p>
        </div>
    `;
    
    // The rest of the PDF generation logic remains the same
    reportElement.innerHTML = html;
    document.body.appendChild(reportElement);
    const images = Array.from(reportElement.getElementsByTagName('img'));
    await Promise.all(images.map(img => new Promise((resolve) => {
        if (img.complete) return resolve();
        img.onload = img.onerror = resolve;
    })));
    const canvas = await html2canvas(reportElement, { scale: 2, useCORS: true });
    document.body.removeChild(reportElement);
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const ratio = canvas.width / pdfWidth;
    const imgHeight = canvas.height / ratio;
    let heightLeft = imgHeight;
    let position = 0;
    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
    heightLeft -= pdfHeight;
    while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;
    }
    pdf.save(`Warranty-Report-${formData.rgaNumber || formData.customerName}.pdf`);
};