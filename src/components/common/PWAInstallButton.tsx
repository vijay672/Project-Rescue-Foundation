import React, { useState, useEffect } from 'react';
import { Download, CheckCircle, Share, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    // Detect standalone mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    // Detect iOS
    const ua = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    } else if (isIOS) {
      setShowIOSModal(true);
    }
  };

  if (isInstalled) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-[#247A58] font-medium px-2 py-1 bg-[#247A58]/10 rounded-md">
        <CheckCircle className="w-3.5 h-3.5" />
        <span>PWA Installed</span>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={handleInstallClick}
        aria-label="Install Field App as PWA"
        className={`flex items-center gap-1.5 font-medium transition-colors ${
          compact
            ? 'p-2 text-[#17252B] hover:text-[#176B68] rounded-md hover:bg-black/5'
            : 'px-3 py-1.5 text-xs text-white bg-[#176B68] hover:bg-[#208783] rounded-md shadow-xs'
        }`}
      >
        <Download className="w-3.5 h-3.5" />
        <span className="whitespace-nowrap">Install App</span>
      </button>

      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl border border-[#E4E9E7]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E4E9E7]">
              <h3 className="text-sm font-semibold text-[#17252B]">Install on iPhone / iPad</h3>
              <button
                onClick={() => setShowIOSModal(false)}
                className="text-[#64737A] hover:text-[#17252B] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="py-4 text-xs text-[#64737A] space-y-3">
              <p className="flex items-center gap-2">
                <Share className="w-4 h-4 text-[#176B68] shrink-0" />
                <span>1. Tap the <strong>Share</strong> button in your Safari navigation bar.</span>
              </p>
              <p>2. Scroll down and tap <strong>Add to Home Screen</strong>.</p>
              <p>3. Tap <strong>Add</strong> in the top right corner to launch offline.</p>
            </div>
            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2 text-xs font-semibold text-[#17252B] bg-[#F7F8F6] border border-[#E4E9E7] rounded-lg hover:bg-[#E4E9E7] transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
};
