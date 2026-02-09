
import React, { useState, useRef } from 'react';
import { 
  FileText, 
  Search, 
  Trash2, 
  Download, 
  Layers, 
  AlertCircle,
  Loader2,
  FileSearch,
  PlusCircle,
  MinusCircle,
  Eye,
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { FileItem, SelectedPage } from './types';
import { searchKeywordsInFiles, mergeSelectedPages, getPdfPageCount } from './services/pdfService';
import { PageThumbnail } from './components/PageThumbnail';

export default function App() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [keywordsInput, setKeywordsInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPages, setSelectedPages] = useState<SelectedPage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mergedPdfUrl, setMergedPdfUrl] = useState<string | null>(null);
  const [previewPage, setPreviewPage] = useState<SelectedPage | null>(null);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFilesPromises = Array.from(e.target.files).map(async (f: File) => {
        const totalPages = await getPdfPageCount(f);
        return {
          id: Math.random().toString(36).substring(7),
          file: f,
          name: f.name,
          totalPages
        };
      });
      const newFiles = await Promise.all(newFilesPromises);
      setFiles(prev => [...prev, ...newFiles]);
      setError(null);
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    setSelectedPages(prev => prev.filter(p => p.fileId !== id));
  };

  const deselectAll = () => {
    setSelectedPages([]);
    setMergedPdfUrl(null);
  };

  const scrollSlider = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 400;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleSearch = async () => {
    if (files.length === 0) {
      setError("Carica almeno un file PDF.");
      return;
    }
    const kwList = keywordsInput.split(',').map(k => k.trim()).filter(k => k !== '');
    if (kwList.length === 0) {
      setError("Inserisci almeno una parola chiave.");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setMergedPdfUrl(null);

    try {
      const matches = await searchKeywordsInFiles(files, kwList);
      if (matches.length === 0) {
        setError("Nessuna pagina trovata.");
      } else {
        setSelectedPages(matches);
      }
    } catch (err) {
      setError("Errore durante la ricerca.");
    } finally {
      setIsProcessing(false);
    }
  };

  const togglePageSelection = (fileId: string, fileName: string, pageIndex: number) => {
    setSelectedPages(prev => {
      const exists = prev.find(p => p.fileId === fileId && p.pageIndex === pageIndex);
      if (exists) {
        return prev.filter(p => !(p.fileId === fileId && p.pageIndex === pageIndex));
      } else {
        return [...prev, { fileId, fileName, pageIndex, isManual: true }];
      }
    });
  };

  const addNeighbor = (selection: SelectedPage, offset: number) => {
    const file = files.find(f => f.id === selection.fileId);
    if (!file) return;
    const newIndex = selection.pageIndex + offset;
    if (newIndex >= 0 && newIndex < file.totalPages) {
      togglePageSelection(selection.fileId, selection.fileName, newIndex);
    }
  };

  const generateFinalPdf = async () => {
    if (selectedPages.length === 0) return;
    setIsProcessing(true);
    try {
      const blob = await mergeSelectedPages(files, selectedPages);
      setMergedPdfUrl(URL.createObjectURL(blob));
    } catch (err) {
      setError("Errore nella creazione del PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const sortedSelection = [...selectedPages].sort((a, b) => {
    if (a.fileId !== b.fileId) return a.fileId.localeCompare(b.fileId);
    return a.pageIndex - b.pageIndex;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-12 min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="mb-10 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-indigo-600 text-white rounded-2xl mb-4 shadow-lg">
          <Layers size={32} />
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">PDF Smart Studio</h1>
        <p className="text-slate-500 mt-2 max-w-lg mx-auto italic">Selezione e unione intelligente di pagine PDF</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FileText className="text-indigo-600" size={20} /> 1. Caricamento
            </h2>
            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 transition-all group">
              <FileSearch className="w-6 h-6 mb-1 text-slate-400 group-hover:text-indigo-500" />
              <p className="text-xs font-medium text-slate-500">Seleziona i PDF</p>
              <input type="file" multiple accept="application/pdf" className="hidden" onChange={handleFileChange} />
            </label>
            <div className="mt-4 space-y-2 max-h-48 overflow-y-auto pr-1">
              {files.map(f => (
                <div key={f.id} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs group">
                  <span className="truncate text-slate-700 font-semibold">{f.name}</span>
                  <button onClick={() => removeFile(f.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                    <Trash2 size={14}/>
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Search className="text-indigo-600" size={20} /> 2. Filtro Contenuti
            </h2>
            <textarea
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm min-h-[100px] text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-400"
              placeholder="Inserisci parole chiave separate da virgola (es: contratto, fattura...)"
              value={keywordsInput}
              onChange={(e) => setKeywordsInput(e.target.value)}
            />
            <button
              onClick={handleSearch}
              disabled={isProcessing || files.length === 0}
              className="w-full mt-4 py-3.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:bg-slate-300 shadow-md transition-all flex items-center justify-center gap-2"
            >
              {isProcessing ? <Loader2 className="animate-spin" size={18}/> : <Search size={18}/>}
              Filtra Pagine
            </button>
          </section>

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl flex items-start gap-3 text-sm animate-pulse">
              <AlertCircle className="flex-shrink-0 mt-0.5" size={18} />
              <p className="font-medium">{error}</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-8 space-y-6">
          {selectedPages.length > 0 ? (
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Eye className="text-indigo-600" size={22} /> Anteprima Selezione
                  </h2>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-100">
                    {selectedPages.length} pagine
                  </span>
                  <button 
                    onClick={deselectAll}
                    className="text-xs font-bold text-slate-500 hover:text-red-500 transition-colors flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 size={14}/> Svuota Selezione
                  </button>
                </div>
              </div>

              <div className="relative group">
                {/* Pulsanti di navigazione slider */}
                <button 
                  onClick={() => scrollSlider('left')}
                  className="absolute left-[-20px] top-1/2 -translate-y-1/2 z-10 p-2 bg-white border border-slate-200 rounded-full shadow-lg text-slate-600 hover:text-indigo-600 hover:scale-110 transition-all opacity-0 group-hover:opacity-100 hidden md:flex items-center justify-center"
                >
                  <ChevronLeft size={24} />
                </button>
                <button 
                  onClick={() => scrollSlider('right')}
                  className="absolute right-[-20px] top-1/2 -translate-y-1/2 z-10 p-2 bg-white border border-slate-200 rounded-full shadow-lg text-slate-600 hover:text-indigo-600 hover:scale-110 transition-all opacity-0 group-hover:opacity-100 hidden md:flex items-center justify-center"
                >
                  <ChevronRight size={24} />
                </button>

                <div 
                  ref={scrollContainerRef}
                  className="flex overflow-x-auto gap-5 pb-6 snap-x scroll-smooth no-scrollbar"
                >
                  {sortedSelection.map((p, idx) => {
                    const sourceFile = files.find(f => f.id === p.fileId);
                    return (
                      <div 
                        key={`${p.fileId}-${p.pageIndex}-${idx}`} 
                        className="flex-shrink-0 w-52 snap-start bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-indigo-300 transition-all flex flex-col group/card"
                      >
                        <div className="relative aspect-[3/4] bg-slate-50 p-2 overflow-hidden">
                          {sourceFile && <PageThumbnail file={sourceFile.file} pageIndex={p.pageIndex} />}
                          <div className="absolute inset-0 bg-indigo-900/0 group-hover/card:bg-indigo-900/20 flex items-center justify-center transition-all">
                            <button 
                              onClick={() => setPreviewPage(p)}
                              className="bg-white/90 p-3 rounded-full shadow-xl text-indigo-600 scale-75 opacity-0 group-hover/card:opacity-100 group-hover/card:scale-100 transition-all hover:bg-white"
                            >
                              <Maximize2 size={24} />
                            </button>
                          </div>
                        </div>
                        <div className="p-3 bg-white flex flex-col gap-2">
                          <div className="flex items-start justify-between">
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold text-slate-400 truncate uppercase">{p.fileName}</p>
                              <p className="text-sm font-black text-slate-800">Pagina {p.pageIndex + 1}</p>
                            </div>
                            <button 
                              onClick={() => togglePageSelection(p.fileId, p.fileName, p.pageIndex)}
                              className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                            >
                              <MinusCircle size={18}/>
                            </button>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <button onClick={() => addNeighbor(p, -1)} className="flex-1 p-1.5 bg-slate-50 border border-slate-100 rounded-lg text-slate-500 hover:text-indigo-600 text-[10px] font-bold flex items-center justify-center gap-1">
                              <PlusCircle size={10}/> -1 pag
                            </button>
                            <button onClick={() => addNeighbor(p, 1)} className="flex-1 p-1.5 bg-slate-50 border border-slate-100 rounded-lg text-slate-500 hover:text-indigo-600 text-[10px] font-bold flex items-center justify-center gap-1">
                              <PlusCircle size={10}/> +1 pag
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col md:flex-row gap-4">
                <button
                  onClick={generateFinalPdf}
                  disabled={isProcessing || selectedPages.length === 0}
                  className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700 disabled:bg-slate-300 transition-all flex items-center justify-center gap-3"
                >
                  {isProcessing ? <Loader2 className="animate-spin" size={22}/> : <Layers size={22}/>}
                  {mergedPdfUrl ? "Rigenera Documento" : "Crea PDF Unificato"}
                </button>
                {mergedPdfUrl && (
                  <a href={mergedPdfUrl} download="smart_merged_doc.pdf" className="px-10 py-4 bg-green-600 text-white rounded-2xl font-black shadow-lg hover:bg-green-700 transition-all flex items-center justify-center gap-3">
                    <Download size={22}/> Scarica PDF
                  </a>
                )}
              </div>
            </section>
          ) : (
            <div className="h-full min-h-[500px] flex flex-col items-center justify-center bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-400 p-12 text-center group">
              <div className="p-6 bg-slate-50 rounded-full mb-6">
                <Layers size={64} className="text-slate-200" />
              </div>
              <p className="text-xl font-bold text-slate-500">Nessuna pagina selezionata</p>
              <p className="text-sm text-slate-400 mt-3 max-w-sm leading-relaxed">
                Usa il filtro per estrarre le pagine dai tuoi file e comporre il documento finale.
              </p>
            </div>
          )}
        </div>
      </div>

      {previewPage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-10 animate-in fade-in zoom-in-95 duration-200">
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm" onClick={() => setPreviewPage(null)} />
          <div className="relative bg-white w-full max-w-4xl h-full max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-5 border-b flex items-center justify-between bg-white">
              <div>
                <h3 className="text-lg font-black text-slate-800 truncate max-w-md">{previewPage.fileName}</h3>
                <p className="text-xs font-bold text-indigo-600">Pagina {previewPage.pageIndex + 1}</p>
              </div>
              <button onClick={() => setPreviewPage(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={24} className="text-slate-600" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 md:p-8 bg-slate-100 flex justify-center">
              <div className="w-full max-w-2xl bg-white shadow-2xl h-fit rounded-lg overflow-hidden border border-slate-300">
                {files.find(f => f.id === previewPage.fileId) && (
                  <PageThumbnail 
                    file={files.find(f => f.id === previewPage.fileId)!.file} 
                    pageIndex={previewPage.pageIndex}
                    scale={1.5} 
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
