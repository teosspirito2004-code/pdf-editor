
import React, { useEffect, useRef } from 'react';

declare const pdfjsLib: any;

interface PageThumbnailProps {
  file: File;
  pageIndex: number;
  scale?: number;
}

export const PageThumbnail: React.FC<PageThumbnailProps> = ({ file, pageIndex, scale = 0.3 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let isMounted = true;

    const render = async () => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        // Slice the buffer to avoid detachment issues during re-renders or multiple loads
        const dataCopy = arrayBuffer.slice(0);
        const pdf = await pdfjsLib.getDocument({ data: dataCopy }).promise;
        const page = await pdf.getPage(pageIndex + 1);
        
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        // Set high density for better quality on high-res displays
        const dpr = window.devicePixelRatio || 1;
        canvas.height = viewport.height * dpr;
        canvas.width = viewport.width * dpr;
        context.scale(dpr, dpr);

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        if (isMounted) {
          await page.render(renderContext).promise;
        }
      } catch (error) {
        console.error("Preview error:", error);
      }
    };

    render();

    return () => {
      isMounted = false;
    };
  }, [file, pageIndex, scale]);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-auto bg-white rounded-lg transition-opacity duration-300"
      style={{ display: 'block' }}
    />
  );
};
