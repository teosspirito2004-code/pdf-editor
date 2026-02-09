
export interface FileItem {
  id: string;
  file: File;
  name: string;
  totalPages: number;
}

export interface SelectedPage {
  fileId: string;
  fileName: string;
  pageIndex: number; // 0-based
  matchedKeywords?: string[];
  isManual?: boolean;
}

export interface ExtractionResult {
  pages: SelectedPage[];
  mergedPdfUrl: string | null;
  summary?: string;
}
