
import { PDFDocument } from 'pdf-lib';
import { FileItem, SelectedPage } from '../types';

declare const pdfjsLib: any;

/**
 * Searches keywords and returns an initial set of matched pages
 */
export const searchKeywordsInFiles = async (
  files: FileItem[],
  keywords: string[]
): Promise<SelectedPage[]> => {
  const matches: SelectedPage[] = [];

  for (const fileItem of files) {
    const arrayBuffer = await fileItem.file.arrayBuffer();
    const pdfDataCopy = arrayBuffer.slice(0);
    const pdf = await pdfjsLib.getDocument({ data: pdfDataCopy }).promise;

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      
      const foundKeywords = keywords.filter(kw => 
        pageText.toLowerCase().includes(kw.toLowerCase().trim())
      );

      if (foundKeywords.length > 0 && keywords.length > 0) {
        matches.push({
          fileId: fileItem.id,
          fileName: fileItem.name,
          pageIndex: i - 1,
          matchedKeywords: foundKeywords
        });
      }
    }
  }

  return matches;
};

/**
 * Merges a specific set of selected pages into one PDF
 */
export const mergeSelectedPages = async (
  files: FileItem[],
  selectedPages: SelectedPage[]
): Promise<Blob> => {
  const outPdfDoc = await PDFDocument.create();

  // Group by file to minimize loading
  const fileMap = new Map<string, FileItem>();
  files.forEach(f => fileMap.set(f.id, f));

  // Sort by file and then page index to keep it logical
  const sortedSelection = [...selectedPages].sort((a, b) => {
    if (a.fileId !== b.fileId) return a.fileId.localeCompare(b.fileId);
    return a.pageIndex - b.pageIndex;
  });

  // Cache loaded source documents
  const loadedDocs = new Map<string, PDFDocument>();

  for (const selection of sortedSelection) {
    const fileItem = fileMap.get(selection.fileId);
    if (!fileItem) continue;

    if (!loadedDocs.has(selection.fileId)) {
      const buffer = await fileItem.file.arrayBuffer();
      const doc = await PDFDocument.load(buffer);
      loadedDocs.set(selection.fileId, doc);
    }

    const sourceDoc = loadedDocs.get(selection.fileId)!;
    const [copiedPage] = await outPdfDoc.copyPages(sourceDoc, [selection.pageIndex]);
    outPdfDoc.addPage(copiedPage);
  }

  const pdfBytes = await outPdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
};

/**
 * Gets total pages for a file
 */
export const getPdfPageCount = async (file: File): Promise<number> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  return pdf.numPages;
};
