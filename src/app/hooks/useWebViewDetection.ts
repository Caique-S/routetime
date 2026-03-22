'use client';

import { useEffect, useState } from 'react';

export function useWebViewDetection() {
  const [isWebView, setIsWebView] = useState(false);
  
  useEffect(() => {
    // Verificar se está em WebView Android/iOS
    const userAgent = navigator.userAgent.toLowerCase();
    const isAndroidWebView = /wv/.test(userAgent) || /android.*wv/.test(userAgent);
    const isIOSWebView = /applewebkit.*safari/.test(userAgent) && 
                        !/chrome|crios/.test(userAgent) && 
                        /version\/[0-9]*\.[0-9]*/.test(userAgent);
    
    setIsWebView(isAndroidWebView || isIOSWebView);
  }, []);
  
  return isWebView;
}