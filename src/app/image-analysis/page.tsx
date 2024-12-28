'use client';

import ImageAnalysis from '@/components/ImageAnalysis';

export default function ImageAnalysisPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center sm:p-24 px-4">
      <h1 className="font-bold text-3xl sm:text-5xl text-center text-balance mb-10">
        Image Analysis with OpenAI Vision
      </h1>
      <ImageAnalysis />
    </main>
  );
} 