export const downloadLogSheetsFromComponents = async (graphicalLogRef, routeData, setDownloading) => {
  if (!graphicalLogRef.current || !routeData || !routeData.logs) return;

  setDownloading(true);
  try {
    // Get canvas data URLs from the GraphicalLog component
    const canvasDataUrls = await graphicalLogRef.current.generatePDF();
    
    if (!canvasDataUrls || canvasDataUrls.length === 0) {
      throw new Error('No log sheets to export');
    }

    // Import jsPDF dynamically
    const { jsPDF } = await import('jspdf');
    
    // Create PDF in landscape mode for better log sheet display
    const pdf = new jsPDF('l', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    // Add each log sheet to the PDF
    for (let index = 0; index < canvasDataUrls.length; index++) {
      const dataUrl = canvasDataUrls[index];
      
      if (index > 0) {
        pdf.addPage();
      }
      
      // Standard canvas dimensions from DOTLogSheet component
      const canvasWidth = 1200;
      const canvasHeight = 800;
      const aspectRatio = canvasWidth / canvasHeight;
      
      // Calculate PDF dimensions to fit page with margins
      let pdfWidth = pageWidth - 10; // 5mm margin on each side
      let pdfHeight = pdfWidth / aspectRatio;
      
      // If height exceeds page, scale by height instead
      if (pdfHeight > pageHeight - 10) {
        pdfHeight = pageHeight - 10; // 5mm margin top/bottom
        pdfWidth = pdfHeight * aspectRatio;
      }
      
      // Center the image on the page
      const xOffset = (pageWidth - pdfWidth) / 2;
      const yOffset = (pageHeight - pdfHeight) / 2;
      
      // Add image to PDF with high quality
      pdf.addImage(dataUrl, 'PNG', xOffset, yOffset, pdfWidth, pdfHeight, `log_sheet_${index + 1}`, 'FAST');
    }

    // Generate filename with current date
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const fileName = `driver_log_sheets_${dateStr}.pdf`;
    
    // Download the PDF
    pdf.save(fileName);
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('Error generating PDF. Please try again.');
  } finally {
    setDownloading(false);
  }
};
