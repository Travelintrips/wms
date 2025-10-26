import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Package, Scan, CheckCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BarcodeScanner from '@/components/BarcodeScanner';

interface Item {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
}

interface Warehouse {
  id: string;
  name: string;
}

interface Lot {
  id: string;
  code: string;
  rack_id: string;
  capacity: number;
  current_stock: number;
  racks: {
    name: string;
    zones: {
      name: string;
    };
  };
}

interface Batch {
  id: string;
  batch_number: string;
  quantity: number;
  lot_id: string;
  lots: {
    code: string;
    racks: {
      name: string;
      zones: {
        name: string;
      };
    };
  };
}

interface OrderItem {
  item_id: string;
  quantity: number;
  batch_id?: string;
  lot_id?: string;
  picked?: boolean;
  items?: Item;
  batches?: Batch;
}

export default function StockOut() {
  const { toast } = useToast();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [customer, setCustomer] = useState('');
  const [documentRef, setDocumentRef] = useState('');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  
  const [selectedItem, setSelectedItem] = useState('');
  const [quantity, setQuantity] = useState('');
  
  const [pickDialog, setPickDialog] = useState(false);
  const [selectedOrderItem, setSelectedOrderItem] = useState<OrderItem | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [scanMode, setScanMode] = useState(false);
  const [scanInput, setScanInput] = useState('');

  useEffect(() => {
    fetchWarehouses();
    fetchItems();
  }, []);

  useEffect(() => {
    if (selectedWarehouse && selectedItem) {
      fetchBatches(selectedWarehouse, selectedItem);
    }
  }, [selectedWarehouse, selectedItem]);

  const fetchWarehouses = async () => {
    const { data } = await supabase.from('warehouses').select('*').order('name');
    if (data) setWarehouses(data);
  };

  const fetchItems = async () => {
    const { data } = await supabase.from('items').select('*').order('name');
    if (data) setItems(data);
  };

  const fetchBatches = async (warehouseId: string, itemId: string) => {
    const { data } = await supabase
      .from('batches')
      .select(`
        *,
        lots(
          code,
          racks(
            name,
            zones(
              name,
              warehouse_id
            )
          )
        )
      `)
      .eq('item_id', itemId)
      .eq('lots.racks.zones.warehouse_id', warehouseId)
      .eq('status', 'active')
      .gt('quantity', 0)
      .order('expiry_date');
    
    if (data) setBatches(data);
  };

  const addItemToOrder = () => {
    if (!selectedItem || !quantity) {
      toast({
        title: 'Error',
        description: 'Pilih item dan masukkan jumlah',
        variant: 'destructive'
      });
      return;
    }

    const item = items.find(i => i.id === selectedItem);
    if (!item) return;

    orderItems.push({
      item_id: selectedItem,
      quantity: parseInt(quantity),
      items: item
    });

    setOrderItems([...orderItems]);
    setSelectedItem('');
    setQuantity('');
  };

  const removeItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const openPickDialog = (item: OrderItem) => {
    setSelectedOrderItem(item);
    setSelectedBatchId('');
    setScanMode(false);
    setScanInput('');
    fetchBatches(selectedWarehouse, item.item_id);
    setPickDialog(true);
  };

  const handleBarcodeScan = (barcode: string) => {
    const batch = batches.find(b => b.batch_number === barcode);
    if (batch) {
      setSelectedBatchId(batch.id);
      setScanMode(false);
      toast({
        title: 'Berhasil',
        description: `Batch ${batch.batch_number} dipilih`
      });
    } else {
      toast({
        title: 'Error',
        description: 'Batch tidak ditemukan',
        variant: 'destructive'
      });
    }
  };

  const handleManualScan = () => {
    if (scanInput) {
      handleBarcodeScan(scanInput);
      setScanInput('');
    }
  };

  const processPick = async () => {
    if (!selectedOrderItem || !selectedBatchId) {
      toast({
        title: 'Error',
        description: 'Pilih batch untuk diambil',
        variant: 'destructive'
      });
      return;
    }

    const batch = batches.find(b => b.id === selectedBatchId);
    if (!batch) return;

    if (batch.quantity < selectedOrderItem.quantity) {
      toast({
        title: 'Error',
        description: 'Stok batch tidak mencukupi',
        variant: 'destructive'
      });
      return;
    }

    // Update batch quantity
    await supabase
      .from('batches')
      .update({ quantity: batch.quantity - selectedOrderItem.quantity })
      .eq('id', selectedBatchId);

    // Update item_location
    const { data: itemLocation } = await supabase
      .from('item_locations')
      .select('*')
      .eq('item_id', selectedOrderItem.item_id)
      .eq('lot_id', batch.lot_id)
      .single();

    if (itemLocation) {
      await supabase
        .from('item_locations')
        .update({ quantity: itemLocation.quantity - selectedOrderItem.quantity })
        .eq('id', itemLocation.id);
    }

    // Update lot current_stock
    const { data: lot } = await supabase
      .from('lots')
      .select('current_stock')
      .eq('id', batch.lot_id)
      .single();

    if (lot) {
      await supabase
        .from('lots')
        .update({ current_stock: lot.current_stock - selectedOrderItem.quantity })
        .eq('id', batch.lot_id);
    }

    // Record stock movement
    await supabase.from('stock_movements').insert({
      item_id: selectedOrderItem.item_id,
      lot_id: batch.lot_id,
      batch_id: selectedBatchId,
      movement_type: 'out',
      quantity: selectedOrderItem.quantity,
      document_reference: documentRef || 'Stock Out',
      notes: customer ? `Untuk customer: ${customer}` : undefined
    });

    // Update order item
    const updatedItems = orderItems.map(item => 
      item === selectedOrderItem 
        ? { ...item, batch_id: selectedBatchId, lot_id: batch.lot_id, picked: true, batches: batch } 
        : item
    );
    setOrderItems(updatedItems);

    toast({
      title: 'Berhasil',
      description: 'Barang berhasil diambil'
    });

    setPickDialog(false);
    setSelectedOrderItem(null);
  };

  const completeOrder = async () => {
    const unpickedItems = orderItems.filter(item => !item.picked);
    
    if (unpickedItems.length > 0) {
      toast({
        title: 'Error',
        description: 'Masih ada barang yang belum diambil',
        variant: 'destructive'
      });
      return;
    }

    toast({
      title: 'Berhasil',
      description: 'Pengambilan barang selesai'
    });

    // Reset form
    setCustomer('');
    setDocumentRef('');
    setOrderItems([]);
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div>
        <h1 className="text-3xl font-bold">Barang Keluar (Stock Out)</h1>
        <p className="text-gray-600">Pengambilan barang untuk customer atau transfer keluar</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informasi Pengiriman</CardTitle>
          <CardDescription>Masukkan detail pengiriman barang</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Gudang Asal *</Label>
              <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih gudang" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map(w => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Customer (Opsional)</Label>
              <Input
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="Nama customer"
              />
            </div>
            <div>
              <Label>No. Dokumen (Opsional)</Label>
              <Input
                value={documentRef}
                onChange={(e) => setDocumentRef(e.target.value)}
                placeholder="SO/DO/Invoice"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tambah Item</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Item *</Label>
              <Select value={selectedItem} onValueChange={setSelectedItem}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih item" />
                </SelectTrigger>
                <SelectContent>
                  {items.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.sku} - {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Jumlah *</Label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={addItemToOrder} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Tambah Item
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {orderItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Daftar Item ({orderItems.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Nama Item</TableHead>
                  <TableHead>Jumlah</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Lokasi</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.items?.sku}</TableCell>
                    <TableCell>{item.items?.name}</TableCell>
                    <TableCell>{item.quantity} {item.items?.unit}</TableCell>
                    <TableCell>{item.batches?.batch_number || '-'}</TableCell>
                    <TableCell>
                      {item.batches ? 
                        `${item.batches.lots.racks.zones.name} / ${item.batches.lots.racks.name} / ${item.batches.lots.code}` 
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {item.picked ? (
                        <span className="text-green-600 flex items-center">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Diambil
                        </span>
                      ) : (
                        <span className="text-orange-600">Belum diambil</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {!item.picked ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => openPickDialog(item)}
                            className="mr-2"
                            disabled={!selectedWarehouse}
                          >
                            <Package className="h-4 w-4 mr-2" />
                            Ambil
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => removeItem(index)}
                          >
                            Hapus
                          </Button>
                        </>
                      ) : (
                        <span className="text-sm text-gray-500">Selesai</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4 flex justify-end">
              <Button
                onClick={completeOrder}
                disabled={orderItems.some(item => !item.picked)}
                size="lg"
              >
                Selesaikan Pengiriman
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={pickDialog} onOpenChange={setPickDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ambil dari Batch</DialogTitle>
            <DialogDescription>
              {selectedOrderItem?.items?.name} - {selectedOrderItem?.quantity} {selectedOrderItem?.items?.unit}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="manual">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual">Pilih Manual</TabsTrigger>
              <TabsTrigger value="scan">Scan Barcode</TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="space-y-4">
              <div>
                <Label>Pilih Batch (FEFO - First Expired First Out)</Label>
                <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih batch" />
                  </SelectTrigger>
                  <SelectContent>
                    {batches.map(batch => (
                      <SelectItem key={batch.id} value={batch.id}>
                        {batch.batch_number} - {batch.lots.racks.zones.name} / {batch.lots.racks.name} / {batch.lots.code}
                        (Stok: {batch.quantity})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="scan" className="space-y-4">
              {!scanMode ? (
                <div className="space-y-4">
                  <div>
                    <Label>Masukkan No. Batch</Label>
                    <div className="flex gap-2">
                      <Input
                        value={scanInput}
                        onChange={(e) => setScanInput(e.target.value)}
                        placeholder="BATCH001"
                        onKeyPress={(e) => e.key === 'Enter' && handleManualScan()}
                      />
                      <Button onClick={handleManualScan}>Cari</Button>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-2">atau</p>
                    <Button onClick={() => setScanMode(true)}>
                      <Scan className="h-4 w-4 mr-2" />
                      Scan Barcode
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <BarcodeScanner onScan={handleBarcodeScan} />
                  <Button
                    variant="outline"
                    onClick={() => setScanMode(false)}
                    className="w-full mt-4"
                  >
                    Batal Scan
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setPickDialog(false)}>
              Batal
            </Button>
            <Button onClick={processPick} disabled={!selectedBatchId}>
              Ambil Barang
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
