// pdfUtils.js
import { jsPDF } from 'jspdf';

/**
 * Creates a standardized PDF with logo, title, configurable header fields,
 * and a callback to render body content. Works with async content.
 *
 * @param {string} title                 Main report title (e.g., "Warranty Evaluation")
 * @param {string} partNumber            Legacy param kept for backward-compat (unused if headerFields provided)
 * @param {string} poNumber              Legacy param kept for backward-compat (unused if headerFields provided)
 * @param {(doc: jsPDF, startY: number, helpers?: object) => (void|Promise<void>)} addContentCallback
 * @param {object} [options]
 * @param {string|HTMLImageElement} [options.logoUrl]    Imported path, HTTPS/dataURL, or <img>
 * @param {string} [options.companyName='PDI']           Company label in the subtitle
 * @param {Array<{label:string,value:any}>} [options.headerFields]
 * @param {boolean} [options.save=true]                  If true, saves to file; otherwise returns the jsPDF instance
 */
export const generatePdfReport = async (
  title,
  partNumber,
  poNumber,
  addContentCallback,
  options = {}
) => {
  const {
    logoUrl,
    companyName = 'PDI',
    headerFields = [
      { label: 'Part Number', value: partNumber },
      { label: 'PO Number', value: poNumber },
    ],
    save = true,
  } = options;

  // --- Units & page geometry ---
  // jsPDF defaults to 'mm'; 1 inch = 25.4 mm. Margin = 0.5" = 12.7 mm
  const INCH = 25.4;
  const pageMargin = 0.5 * INCH; // 12.7 mm

  const doc = new jsPDF(); // mm / portrait / A4 by default
  const pageWidth = doc.getPageWidth();
  const pageHeight = doc.getPageHeight();
  const contentWidth = pageWidth - 2 * pageMargin;

  // --- Brand palette ---
  const BRAND = {
    navy: { r: 35, g: 59, b: 108 },   // #233B6C
    light: { r: 255, g: 255, b: 255 },// #FFFFFF
    accent: { r: 192, g: 192, b: 192 } // #C0C0C0
  };

  // -------- Helpers --------
  // Load a logo from <img> or URL/dataURL (CORS-safe for dataURL/local assets)
  const loadLogo = (srcOrImg) =>
    new Promise((resolve) => {
      if (!srcOrImg) return resolve(null);

      if (typeof window !== 'undefined' && srcOrImg instanceof Image) {
        return resolve(srcOrImg);
      }
      if (typeof srcOrImg === 'string') {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = srcOrImg;
        return;
      }
      resolve(null);
    });

  // Fit rectangle (w,h) inside (wMax,hMax) preserving aspect ratio
  function fitWithin(wMax, hMax, imgW, imgH) {
    const r = imgW / imgH;
    let w = wMax;
    let h = wMax / r;
    if (h > hMax) {
      h = hMax;
      w = hMax * r;
    }
    return { w, h };
  }

  // Draw a horizontal rule across the printable width at y
  function hr(y) {
    doc.setDrawColor(BRAND.accent.r, BRAND.accent.g, BRAND.accent.b); // #C0C0C0
    doc.setLineWidth(0.2); // ~0.2mm hairline
    doc.line(pageMargin, y, pageWidth - pageMargin, y);
  } 

  // Page break if not enough remaining room; returns true if broke page
  function ensureSpace(needed) {
    // Leave a small footer buffer inside the margin
    const bottomLimit = pageHeight - pageMargin;
    if (currentY + needed > bottomLimit) {
      doc.addPage();
      currentY = pageMargin;
      return true;
    }
    return false;
  }

  // Section API: ensures title stays with content and adds "(Cont'd)" on spill
  /**
   * @param {string} sectionTitle
   * @param {(api: {x:number,y:number,width:number, text:(t:string,x?:number,y?:number,opts?:any)=>void, line:()=>void, ensure:(mm:number)=>void}) => void|Promise<void>} render
   */
  async function addSection(sectionTitle, render) {
    const titleLineH = 6;          // compact title line-height
    const afterTitleGap = 4;      // gap after title before content
    const bottomSpacer = 6;        // small space + rule after content

    // Ensure we have space for at least the title + underline and a little content
    ensureSpace(titleLineH + afterTitleGap + 6);

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(BRAND.navy.r, BRAND.navy.g, BRAND.navy.b);
    // CHANGE: Added underline flag
    doc.text(sectionTitle, pageMargin, currentY, { flags: { underline: true } });
    currentY += titleLineH + afterTitleGap; // CHANGE: Simplified Y advance

    // Content renderer API
    const api = {
      x: pageMargin,
      y: currentY,
      width: contentWidth,
      text: (t, x, y, opts) => {
        const tx = x ?? api.x;
        const ty = y ?? api.y;
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        doc.text(String(t ?? ''), tx, ty, opts);
        // advance approximate line height if caller didn't move y
        if (y == null) api.y += 5;
      },
      line: () => {
        hr(api.y);
        api.y += 4;
      },
      ensure: (mm) => {
        // Page break with "(Cont'd)" header if needed mid-section
        if (api.y + mm > pageHeight - pageMargin) {
          doc.addPage();
          api.y = pageMargin;

          // Continuation title
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(12);
          doc.setTextColor(BRAND.navy.r, BRAND.navy.g, BRAND.navy.b);
          // CHANGE: Added underline flag
          doc.text(`${sectionTitle} (Cont'd)`, pageMargin, api.y, { flags: { underline: true } });
          api.y += titleLineH + afterTitleGap; // CHANGE: Simplified Y advance
          // CHANGE: Removed 'hr' call
        }
      }
    };

    // Let caller draw the body; they can call api.ensure(...) before big blocks
    await render(api);

    // Close section with a thin separator and a tight spacer
    // This is the only 'hr' call left, for the end of the section
    hr(api.y);
    currentY = api.y + bottomSpacer;
  }
    

  // Expose helpers to the content callback (entirely optional to use)
  const helpers = {
    colors: BRAND,
    margin: pageMargin,
    pageWidth,
    pageHeight,
    contentWidth,
    hr,
    ensureSpace,
    addSection
  };

  // ------- HEADER -------
  let currentY = pageMargin;

  try {
    // --- 1) Header: Logo + Titles ---
    try {
      const logoEl = await loadLogo(logoUrl);
      if (logoEl) {
        // Larger target box ~60x22.5mm (up from 40x15) per request #2
        const fit = fitWithin(60, 22.5, logoEl.naturalWidth || 600, logoEl.naturalHeight || 225);
        doc.addImage(logoEl, 'PNG', pageMargin, currentY, fit.w, fit.h);
      } else {
        // Fallback placeholder
        doc.setFillColor(230, 230, 230);
        doc.rect(pageMargin, currentY, 60, 22.5, 'F');
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(10);
        doc.text('LOGO', pageMargin + 22, currentY + 13);
      }
    } catch (e) {
      // On any error, draw placeholder
      doc.setFillColor(230, 230, 230);
      doc.rect(pageMargin, currentY, 60, 22.5, 'F');
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(10);
      doc.text('LOGO', pageMargin + 22, currentY + 13);
    }

    // Title + subtitle (right-aligned), with brand colors
    doc.setTextColor(BRAND.navy.r, BRAND.navy.g, BRAND.navy.b);
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(title, pageWidth - pageMargin, currentY + 8, { align: 'right' });

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(90, 90, 90);
    doc.text(`${companyName} Inspection Report`, pageWidth - pageMargin, currentY + 16, { align: 'right' });

    // Header block spacing (tightened)
    currentY += 28;

    // --- 2) Header Fields (2 columns), tighter vertical rhythm + accent rules ---
    hr(currentY);                      // top rule
    currentY += 6;

    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);

    const cols = 2;
    const rows = Math.ceil(headerFields.length / cols) || 1;
    const rowH = 7;                    // compact rows

    for (let r = 0; r < rows; r++) {
      const leftIdx = r;
      const rightIdx = r + rows;

      if (headerFields[leftIdx]) {
        const f = headerFields[leftIdx];
        doc.setFont(undefined, 'bold');
        doc.text(`${f.label}:`, pageMargin, currentY + r * rowH);
        doc.setFont(undefined, 'normal');
        doc.text(String(f.value ?? 'N/A'), pageMargin + 40, currentY + r * rowH);
      }

      if (headerFields[rightIdx]) {
        const f = headerFields[rightIdx];
        const x = pageMargin + contentWidth / 2;
        doc.setFont(undefined, 'bold');
        doc.text(`${f.label}:`, x, currentY + r * rowH);
        doc.setFont(undefined, 'normal');
        doc.text(String(f.value ?? 'N/A'), x + 40, currentY + r * rowH);
      }
    }

    currentY += rows * rowH;

    // Divider below header fields (accent) with tighter spacing
    hr(currentY);
    currentY += 8;

    // --- 3) Body: delegate to caller (supports async) ---
    if (typeof addContentCallback === 'function') {
      // Backwards compatible: if user ignores helpers, nothing breaks
      await addContentCallback(doc, currentY, helpers);
    } else {
      doc.setTextColor(0, 0, 0);
      doc.text('No content provided.', pageMargin, currentY);
    }

    // --- 4) Footer: page numbers & timestamp (inside margins) ---
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth - pageMargin,
        pageHeight - pageMargin,
        { align: 'right' }
      );
    }

    // --- 5) Save or return ---
    if (save) {
      // Pull values from headerFields (case-insensitive)
      const getVal = (labelRegex) => {
        const f = headerFields.find(h => new RegExp(labelRegex, 'i').test(h.label || ''));
        return f?.value ?? '';
      };
      const sanitize = (s) =>
        String(s || '')
          .replace(/[\\/:*?"<>|]/g, '') // remove illegal filename chars
          .trim()
          .replace(/\s+/g, '_');

      const claim = sanitize(getVal('Claim'));
      const customer = sanitize(getVal('Customer'));
      const fileName = `Warranty_${claim || 'NA'}_${customer || 'NA'}.pdf`;
      doc.save(fileName);
    } else {
      return doc;
    }
  } catch (err) {
    console.error('Failed to generate PDF:', err);
    // eslint-disable-next-line no-alert
    alert('Error generating PDF. See console for details.');
  }
};