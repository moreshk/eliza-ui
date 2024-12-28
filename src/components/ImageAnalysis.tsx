/* eslint-disable @next/next/no-img-element */
/* eslint-disable react/jsx-no-comment-textnodes */
'use client';

import { useState } from 'react';
import axios from 'axios';

const ImageAnalysis = () => {
  const [image, setImage] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
      setAnalysis(null);
      setError(null);
    }
  };

  const analyzeImage = async () => {
    if (!image) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('image', image);

    try {
      const response = await axios.post('/api/analyze-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAnalysis(response.data.analysis);
    } catch (err) {
      setError('Failed to analyze image. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <input
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="mb-4"
      />
      {image && (
        <div className="mb-4">
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={URL.createObjectURL(image)}
            alt="Uploaded image"
            className="max-w-full h-auto"
          />
        </div>
      )}
      <button
        onClick={analyzeImage}
        disabled={!image || loading}
        className={`w-full bg-blue-500 text-white p-2 rounded ${
          !image || loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
        }`}
      >
        {loading ? 'Analyzing...' : 'Analyze Image'}
      </button>
      {analysis && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h2 className="font-bold mb-2">Analysis Result:</h2>
          <p>{analysis}</p>
        </div>
      )}
      {error && <div className="mt-4 text-red-500">{error}</div>}
    </div>
  );
};

export default ImageAnalysis; 