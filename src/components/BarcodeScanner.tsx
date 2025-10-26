import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, X, Package, MapPin, Grid3x3, Volume2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

interface ScanResult {
  type: 'item' | 'lot' | 'rack';
  data: any;
}

interface BarcodeScannerProps {
  onScanSuccess?: (result: ScanResult) => void;
  onClose?: () => void;
  open?: boolean;
}

export default function BarcodeScanner({ onScanSuccess: onScanSuccessCallback, onClose, open = false }: BarcodeScannerProps) {
  const { toast } = useToast();
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const videoRef = useRef<string>('barcode-scanner-video');

  useEffect(() => {
    if (open && !scanning) {
      startScanner();
    }
    
    return () => {
      stopScanner();
    };
  }, [open]);

  const playSuccessSound = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
    
    // Vibrate if available
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }
  };

  const playErrorSound = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 200;
    oscillator.type = 'sawtooth';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
    
    // Vibrate pattern for error
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
  };

  const handleScanSuccess = async (decodedText: string) => {
    await stopScanner();
    
    // Check if barcode matches item, lot, or rack
    const { data: item } = await supabase
      .from('items')
      .select('*, category:categories(name)')
      .eq('barcode', decodedText)
      .single();

    if (item) {
      playSuccessSound();
      const result: ScanResult = { type: 'item', data: item };
      setScanResult(result);
      setShowResult(true);
      onScanSuccessCallback?.(result);
      return;
    }

    const { data: lot } = await supabase
      .from('lots')
      .select('*, rack:racks(code, zone:zones(name)), warehouse:warehouses(name)')
      .eq('barcode', decodedText)
      .single();

    if (lot) {
      playSuccessSound();
      const result: ScanResult = { type: 'lot', data: lot };
      setScanResult(result);
      setShowResult(true);
      onScanSuccessCallback?.(result);
      return;
    }

    const { data: rack } = await supabase
      .from('racks')
      .select('*, zone:zones(name), warehouse:warehouses(name)')
      .eq('barcode', decodedText)
      .single();

    if (rack) {
      // Fetch lots in this rack
      const { data: lots } = await supabase
        .from('lots')
        .select('*, batches:item_batches(*, item:items(name, sku))')
        .eq('rack_id', rack.id);

      playSuccessSound();
      const result: ScanResult = { type: 'rack', data: { ...rack, lots } };
      setScanResult(result);
      setShowResult(true);
      onScanSuccessCallback?.(result);
      return;
    }

    // No match found
    playErrorSound();
    toast({
      title: 'Barcode Tidak Ditemukan',
      description: `Barcode "${decodedText}" tidak terdaftar`,
      variant: 'destructive',
    });
    
    // Restart scanner
    setTimeout(() => startScanner(), 1000);
  };

  const handleScanError = (error: string) => {
    // Ignore scan errors (happens frequently during scanning)
  };

  const startScanner = async () => {
    try {
      const scanner = new Html5Qrcode(videoRef.current);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        handleScanSuccess,
        handleScanError
      );

      setScanning(true);
    } catch (err) {
      console.error('Scanner error:', err);
      toast({
        title: 'Error',
        description: 'Tidak dapat mengakses kamera',
        variant: 'destructive',
      });
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && scanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
        setScanning(false);
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
  };

  const handleClose = () => {
    stopScanner();
    setShowResult(false);
    setScanResult(null);
    onClose?.();
  };

  const handleScanAgain = () => {
    setShowResult(false);
    setScanResult(null);
    startScanner();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Barcode Scanner
          </DialogTitle>
          <DialogDescription>
            Arahkan kamera ke barcode untuk scan
          </DialogDescription>
        </DialogHeader>

        {!showResult ? (
          <div className="space-y-4">
            <div 
              id={videoRef.current} 
              className="w-full rounded-lg overflow-hidden bg-black"
              style={{ minHeight: '300px' }}
            />
            
            <div className="flex items-center justify-center gap-4">
              <Badge variant="outline" className="flex items-center gap-2">
                <Package className="h-3 w-3" />
                Item
              </Badge>
              <Badge variant="outline" className="flex items-center gap-2">
                <MapPin className="h-3 w-3" />
                Lot
              </Badge>
              <Badge variant="outline" className="flex items-center gap-2">
                <Grid3x3 className="h-3 w-3" />
                Rack
              </Badge>
            </div>

            <Button variant="outline" onClick={handleClose} className="w-full">
              <X className="h-4 w-4 mr-2" />
              Tutup Scanner
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {scanResult?.type === 'item' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-blue-600" />
                    <CardTitle>Data Barang</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-sm text-gray-500">SKU</p>
                    <p className="font-semibold">{scanResult.data.sku}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Nama Barang</p>
                    <p className="font-semibold">{scanResult.data.name}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Kategori</p>
                      <p className="font-medium">{scanResult.data.category?.name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Unit</p>
                      <p className="font-medium">{scanResult.data.unit}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Barcode</p>
                    <p className="font-mono text-sm">{scanResult.data.barcode}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {scanResult?.type === 'lot' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-green-600" />
                    <CardTitle>Lokasi Lot</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-sm text-gray-500">Kode Lot</p>
                    <p className="font-semibold text-lg">{scanResult.data.code}</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm font-medium text-green-900 mb-2">📍 Lokasi di Gudang:</p>
                    <div className="space-y-1">
                      <p className="text-green-800">
                        <span className="font-semibold">Gudang:</span> {scanResult.data.warehouse?.name}
                      </p>
                      <p className="text-green-800">
                        <span className="font-semibold">Zone:</span> {scanResult.data.rack?.zone?.name}
                      </p>
                      <p className="text-green-800">
                        <span className="font-semibold">Rack:</span> {scanResult.data.rack?.code}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Kapasitas</p>
                      <p className="font-medium">{scanResult.data.capacity}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Terisi</p>
                      <p className="font-medium">{scanResult.data.current_load}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {scanResult?.type === 'rack' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Grid3x3 className="h-5 w-5 text-purple-600" />
                    <CardTitle>Isi Rack</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Kode Rack</p>
                    <p className="font-semibold text-lg">{scanResult.data.code}</p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <p className="text-sm text-purple-900">
                      <span className="font-semibold">Zone:</span> {scanResult.data.zone?.name}
                    </p>
                    <p className="text-sm text-purple-900">
                      <span className="font-semibold">Gudang:</span> {scanResult.data.warehouse?.name}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-semibold mb-2">Daftar Lot ({scanResult.data.lots?.length || 0}):</p>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {scanResult.data.lots?.map((lot: any) => (
                        <div key={lot.id} className="p-3 border rounded-lg">
                          <p className="font-medium">{lot.code}</p>
                          <p className="text-sm text-gray-600">
                            Terisi: {lot.current_load} / {lot.capacity}
                          </p>
                          {lot.batches?.length > 0 && (
                            <div className="mt-2 text-xs text-gray-500">
                              {lot.batches.map((batch: any) => (
                                <p key={batch.id}>• {batch.item?.name} ({batch.quantity})</p>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-2">
              <Button onClick={handleScanAgain} className="flex-1">
                <Camera className="h-4 w-4 mr-2" />
                Scan Lagi
              </Button>
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Tutup
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}