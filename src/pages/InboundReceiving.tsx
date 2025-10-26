import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Package, Trash2, MapPin, Scan } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { reportInboundToCeisa } from '@/lib/ceisa';

interface Supplier {
  id: string;
  supplier_code: string;
  name: string;
}

interface Item {
  id: string;
  sku: string;
  name: string;
  unit: string;
}

interface Lot {
  id: string;
  code: string;
  rack?: {
    code: string;
    zone?: {
      name: string;
      warehouse?: { name: string };
    };
  };
}

interface ReceiptItem {
  id?: string;
  item_id: string;
  item?: Item;
  quantity: number;
  batch_code: string;
  manufacture_date: string;
  expiry_date: string;
  lot_id?: string;
  lot?: Lot;
  put_away_status: string;
}

interface InboundReceipt {
  id: string;
  receipt_number: string;
  supplier_id: string;
  supplier?: Supplier;
  receipt_date: string;
  status: string;
  notes: string;
  items?: ReceiptItem[];
  ceisa_status?: string;
}

export default function InboundReceiving() {
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [receipts, setReceipts] = useState<InboundReceipt[]>([]);
  
  const [showReceiptForm, setShowReceiptForm] = useState(false);
  const [showPutAwayDialog, setPutAwayDialog] = useState(false);
  const [selectedReceiptItem, setSelectedReceiptItem] = useState<ReceiptItem | null>(null);
  
  // Receipt form
  const [supplierId, setSupplierId] = useState('');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([]);
  
  // Item form
  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [batchCode, setBatchCode] = useState('');
  const [mfgDate, setMfgDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  
  // Put-away form
  const [putAwayLotId, setPutAwayLotId] = useState('');
  const [scanMode, setScanMode] = useState(false);
  const [scanInput, setScanInput] = useState('');

  useEffect(() => {
    fetchSuppliers();
    fetchItems();
    fetchLots();
    fetchReceipts();
  }, []);

  const fetchSuppliers = async () => {
    const { data, error } = await supabase.from('suppliers').select('*').order('name');
    if (!error) setSuppliers(data || []);
  };

  const fetchItems = async () => {
    const { data, error } = await supabase.from('items').select('*').order('name');
    if (!error) setItems(data || []);
  };

  const fetchLots = async () => {
    const { data, error } = await supabase
      .from('lots')
      .select('*, rack:racks(code, zone:zones(name, warehouse:warehouses(name)))')
      .order('code');
    if (!error) setLots(data || []);
  };

  const fetchReceipts = async () => {
    const { data, error } = await supabase
      .from('inbound_receipts')
      .select('*, supplier:suppliers(*)')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      const receiptsWithItems = await Promise.all(
        data.map(async (receipt) => {
          const { data: items } = await supabase
            .from('inbound_receipt_items')
            .select('id, receipt_id, item_id, quantity, batch_code, manufacture_date, expiry_date, lot_id, put_away_status, item:items(*), lot:lots(*, rack:racks(code, zone:zones(name)))')
            .eq('receipt_id', receipt.id);
          return { ...receipt, items: items || [] };
        })
      );
      setReceipts(receiptsWithItems);
    }
  };

  const addItemToReceipt = () => {
    if (!itemId || !quantity || !batchCode) {
      toast({ title: 'Error', description: 'Harap isi semua field', variant: 'destructive' });
      return;
    }

    const item = items.find(i => i.id === itemId);
    if (!item) return;

    setReceiptItems([...receiptItems, {
      item_id: itemId,
      item,
      quantity: parseInt(quantity),
      batch_code: batchCode,
      manufacture_date: mfgDate,
      expiry_date: expiryDate,
      put_away_status: 'pending'
    }]);

    setItemId('');
    setQuantity('');
    setBatchCode('');
    setMfgDate('');
    setExpiryDate('');
  };

  const removeItemFromReceipt = (index: number) => {
    setReceiptItems(receiptItems.filter((_, i) => i !== index));
  };

  const saveReceipt = async () => {
    if (!supplierId || receiptItems.length === 0) {
      toast({ title: 'Error', description: 'Harap isi supplier dan minimal 1 barang', variant: 'destructive' });
      return;
    }

    const receiptNumber = `RCV-${Date.now()}`;
    
    const { data: receipt, error: receiptError } = await supabase
      .from('inbound_receipts')
      .insert([{
        receipt_number: receiptNumber,
        supplier_id: supplierId,
        receipt_date: receiptDate,
        status: 'received',
        notes
      }])
      .select()
      .single();

    if (receiptError) {
      toast({ title: 'Error', description: receiptError.message, variant: 'destructive' });
      return;
    }

    const itemsToInsert = receiptItems.map(item => ({
      receipt_id: receipt.id,
      item_id: item.item_id,
      quantity: item.quantity,
      batch_code: item.batch_code,
      manufacture_date: item.manufacture_date || null,
      expiry_date: item.expiry_date || null,
      put_away_status: 'pending'
    }));

    const { error: itemsError } = await supabase
      .from('inbound_receipt_items')
      .insert(itemsToInsert);

    if (itemsError) {
      toast({ title: 'Error', description: itemsError.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Berhasil', description: `Receipt ${receiptNumber} berhasil dibuat` });
    
    setSupplierId('');
    setReceiptDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setReceiptItems([]);
    setShowReceiptForm(false);
    fetchReceipts();
  };

  const completeReceipt = async (receipt: InboundReceipt) => {
    const allPutAway = receipt.items?.every(item => item.put_away_status === 'completed');
    
    if (!allPutAway) {
      toast({ title: 'Error', description: 'Semua barang harus di-put away terlebih dahulu', variant: 'destructive' });
      return;
    }

    // Update receipt status
    await supabase
      .from('inbound_receipts')
      .update({ status: 'completed' })
      .eq('id', receipt.id);

    // Auto-report to CEISA
    toast({ title: 'Mengirim ke CEISA...', description: 'Sedang melaporkan ke Bea Cukai' });
    
    const ceisaResult = await reportInboundToCeisa(receipt.id);
    
    if (ceisaResult.success) {
      toast({ 
        title: 'Berhasil', 
        description: `Receipt ${receipt.receipt_number} selesai dan dilaporkan ke CEISA (${ceisaResult.docNumber})` 
      });
    } else {
      toast({ 
        title: 'Warning', 
        description: `Receipt selesai tapi gagal kirim ke CEISA: ${ceisaResult.error}`,
        variant: 'destructive'
      });
    }
    
    fetchReceipts();
  };

  const openPutAwayDialog = (receiptItem: ReceiptItem) => {
    setSelectedReceiptItem(receiptItem);
    setPutAwayLotId('');
    setScanMode(false);
    setScanInput('');
    setPutAwayDialog(true);
  };

  const handleScanInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && scanInput) {
      const lot = lots.find(l => l.code === scanInput);
      if (lot) {
        setPutAwayLotId(lot.id);
        toast({ title: 'Berhasil', description: `Lot ${lot.code} ditemukan` });
      } else {
        toast({ title: 'Error', description: 'Lot tidak ditemukan', variant: 'destructive' });
      }
      setScanInput('');
    }
  };

  const executePutAway = async () => {
    if (!selectedReceiptItem || !putAwayLotId) {
      toast({ title: 'Error', description: 'Harap pilih lokasi', variant: 'destructive' });
      return;
    }

    // Create batch
    const { data: batch, error: batchError } = await supabase
      .from('item_batches')
      .insert([{
        batch_code: selectedReceiptItem.batch_code,
        item_id: selectedReceiptItem.item_id,
        lot_id: putAwayLotId,
        quantity: selectedReceiptItem.quantity,
        manufacture_date: selectedReceiptItem.manufacture_date || null,
        expiry_date: selectedReceiptItem.expiry_date || null,
        status: 'active'
      }])
      .select()
      .single();

    if (batchError) {
      toast({ title: 'Error', description: batchError.message, variant: 'destructive' });
      return;
    }

    // Update receipt item
    const { error: updateError } = await supabase
      .from('inbound_receipt_items')
      .update({ 
        lot_id: putAwayLotId,
        put_away_status: 'completed' 
      })
      .eq('id', selectedReceiptItem.id);

    if (updateError) {
      toast({ title: 'Error', description: updateError.message, variant: 'destructive' });
      return;
    }

    // Update lot current_load
    const { data: currentLot } = await supabase
      .from('lots')
      .select('current_load')
      .eq('id', putAwayLotId)
      .single();
    
    if (currentLot) {
      await supabase
        .from('lots')
        .update({ current_load: currentLot.current_load + selectedReceiptItem.quantity })
        .eq('id', putAwayLotId);
    }

    // Record stock movement
    await supabase
      .from('stock_movements')
      .insert([{
        movement_type: 'INBOUND',
        item_id: selectedReceiptItem.item_id,
        batch_id: batch.id,
        lot_id: putAwayLotId,
        quantity: selectedReceiptItem.quantity,
        reference_number: selectedReceiptItem.batch_code,
        notes: 'Put-away from inbound receipt'
      }]);

    toast({ title: 'Berhasil', description: 'Put-away berhasil dilakukan' });
    setPutAwayDialog(false);
    fetchReceipts();
    fetchLots();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inbound Receiving</h1>
            <p className="text-gray-600 mt-1">Terima barang dari supplier dan lakukan put-away</p>
          </div>
          <Button onClick={() => setShowReceiptForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Buat Receipt Baru
          </Button>
        </div>

        {/* Receipt Form Dialog */}
        <Dialog open={showReceiptForm} onOpenChange={setShowReceiptForm}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Buat Inbound Receipt</DialogTitle>
              <DialogDescription>Catat penerimaan barang dari supplier</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Supplier *</Label>
                  <Select value={supplierId} onValueChange={setSupplierId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.supplier_code} - {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tanggal Terima *</Label>
                  <Input
                    type="date"
                    value={receiptDate}
                    onChange={(e) => setReceiptDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label>Catatan</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Catatan tambahan..."
                />
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Tambah Barang</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Barang *</Label>
                    <Select value={itemId} onValueChange={setItemId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih barang" />
                      </SelectTrigger>
                      <SelectContent>
                        {items.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.sku} - {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Quantity *</Label>
                    <Input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>Kode Batch *</Label>
                    <Input
                      value={batchCode}
                      onChange={(e) => setBatchCode(e.target.value)}
                      placeholder="BATCH-XXX"
                    />
                  </div>
                  <div>
                    <Label>Tgl Produksi</Label>
                    <Input
                      type="date"
                      value={mfgDate}
                      onChange={(e) => setMfgDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Tgl Kadaluarsa</Label>
                    <Input
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button type="button" onClick={addItemToReceipt} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Tambah
                    </Button>
                  </div>
                </div>
              </div>

              {receiptItems.length > 0 && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Daftar Barang ({receiptItems.length})</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Barang</TableHead>
                        <TableHead>Batch</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Kadaluarsa</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {receiptItems.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.item?.name}</TableCell>
                          <TableCell>{item.batch_code}</TableCell>
                          <TableCell>{item.quantity} {item.item?.unit}</TableCell>
                          <TableCell>
                            {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString('id-ID') : '-'}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItemFromReceipt(index)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowReceiptForm(false)}>
                Batal
              </Button>
              <Button onClick={saveReceipt}>
                Simpan Receipt
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Put-Away Dialog */}
        <Dialog open={showPutAwayDialog} onOpenChange={setPutAwayDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Put-Away Barang</DialogTitle>
              <DialogDescription>
                Tentukan lokasi penyimpanan untuk {selectedReceiptItem?.item?.name}
              </DialogDescription>
            </DialogHeader>

            {selectedReceiptItem && (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-900">Detail Barang:</p>
                  <div className="mt-2 space-y-1 text-sm text-blue-800">
                    <p>Batch: {selectedReceiptItem.batch_code}</p>
                    <p>Quantity: {selectedReceiptItem.quantity} {selectedReceiptItem.item?.unit}</p>
                    {selectedReceiptItem.expiry_date && (
                      <p>Kadaluarsa: {new Date(selectedReceiptItem.expiry_date).toLocaleDateString('id-ID')}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant={scanMode ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setScanMode(!scanMode)}
                  >
                    <Scan className="h-4 w-4 mr-2" />
                    {scanMode ? 'Mode Scan Aktif' : 'Aktifkan Scanner'}
                  </Button>
                </div>

                {scanMode ? (
                  <div>
                    <Label>Scan Barcode Lot</Label>
                    <Input
                      value={scanInput}
                      onChange={(e) => setScanInput(e.target.value)}
                      onKeyDown={handleScanInput}
                      placeholder="Scan barcode lot..."
                      autoFocus
                    />
                    <p className="text-xs text-gray-500 mt-1">Tekan Enter setelah scan</p>
                  </div>
                ) : (
                  <div>
                    <Label>Pilih Lokasi (Lot) *</Label>
                    <Select value={putAwayLotId} onValueChange={setPutAwayLotId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih lot" />
                      </SelectTrigger>
                      <SelectContent>
                        {lots.map((lot) => (
                          <SelectItem key={lot.id} value={lot.id}>
                            {lot.code} - {lot.rack?.code} ({lot.rack?.zone?.name})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {putAwayLotId && (
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm font-medium text-green-900">Lokasi Terpilih:</p>
                    <p className="text-sm text-green-800 mt-1">
                      {lots.find(l => l.id === putAwayLotId)?.code} - 
                      {lots.find(l => l.id === putAwayLotId)?.rack?.code}
                    </p>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setPutAwayDialog(false)}>
                Batal
              </Button>
              <Button onClick={executePutAway}>
                <MapPin className="h-4 w-4 mr-2" />
                Simpan Put-Away
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Receipts List */}
        <div className="space-y-4">
          {receipts.map((receipt) => (
            <Card key={receipt.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{receipt.receipt_number}</CardTitle>
                    <CardDescription>
                      {receipt.supplier?.name} • {new Date(receipt.receipt_date).toLocaleDateString('id-ID')}
                    </CardDescription>
                  </div>
                  <Badge variant={receipt.status === 'received' ? 'default' : 'secondary'}>
                    {receipt.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Barang</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Lokasi</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>CEISA</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receipt.items?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.item?.name}</p>
                            <p className="text-sm text-gray-500">{item.item?.sku}</p>
                          </div>
                        </TableCell>
                        <TableCell>{item.quantity} {item.item?.unit}</TableCell>
                        <TableCell>
                          {item.lot ? (
                            <div className="text-sm">
                              <p className="font-medium">{item.lot.code}</p>
                              <p className="text-gray-500">{item.lot.rack?.code}</p>
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.put_away_status === 'completed' ? 'default' : 'secondary'}>
                            {item.put_away_status === 'completed' ? 'Completed' : 'Pending'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {receipt.ceisa_status && (
                            <Badge className={
                              receipt.ceisa_status === 'sent' ? 'bg-blue-100 text-blue-700 border-blue-400 font-semibold' : 
                              receipt.ceisa_status === 'failed' ? 'bg-red-100 text-red-700 border-red-400 font-semibold' : 
                              'bg-gray-100 text-gray-700 border-gray-300 font-semibold'
                            } variant="outline">
                              {receipt.ceisa_status === 'sent' ? '✓ SENT' : 
                               receipt.ceisa_status === 'failed' ? '✗ FAILED' : 'PENDING'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.put_away_status === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => openPutAwayDialog(item)}
                            >
                              <Package className="h-4 w-4 mr-2" />
                              Put-Away
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}