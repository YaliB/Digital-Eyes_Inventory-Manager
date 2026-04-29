import { useState, useCallback } from 'react';

export interface UseImageUploadState {
  preview: string | null;
  file: File | null;
  isLoading: boolean;
  error: string | null;
}

export const useImageUpload = () => {
  const [state, setState] = useState<UseImageUploadState>({
    preview: null,
    file: null,
    isLoading: false,
    error: null,
  });

  const handleImageCapture = useCallback((file: File) => {
    // Validate file
    if (!file.type.startsWith('image/')) {
      setState(prev => ({
        ...prev,
        error: 'Please select a valid image file',
      }));
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setState(prev => ({
        ...prev,
        error: 'Image size should be less than 10MB',
      }));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setState({
        file,
        preview: e.target?.result as string,
        isLoading: false,
        error: null,
      });
    };
    reader.readAsDataURL(file);
  }, []);

  const reset = useCallback(() => {
    setState({
      preview: null,
      file: null,
      isLoading: false,
      error: null,
    });
  }, []);

  const setLoading = useCallback((isLoading: boolean) => {
    setState(prev => ({ ...prev, isLoading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  return {
    ...state,
    handleImageCapture,
    reset,
    setLoading,
    setError,
  };
};
