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
import { Plus, Package, Scan, CheckCircle, FileText, Calendar } from 'lucide-react';
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
  current_load: number;
  current_stock: number;
  racks: {
    name: string;
    zones: {
      name: string;
    };
  };
}

interface ReceiptItem {
  item_id: string;
  quantity: number;
  batch_number?: string;
  manufacture_date?: string;
  expiry_date?: string;
  lot_id?: string;
  items?: Item;
}

interface Supplier {
  id: string;
  supplier_name: string;
  contact_person?: string;
  phone_number?: string;
}

interface StockMovement {
  id: string;
  movement_type: string;
  quantity: number;
  document_reference?: string;
  notes?: string;
  created_at: string;
  items: {
    sku: string;
    name: string;
    unit: string;
  };
  lots: {
    code: string;
    racks: {
      code: string;
      zones: {
        name: string;
      };
    };
  };
  item_batches?: {
    batch_code: string;
  };
}

export default function StockIn() {
  const { toast } = useToast();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [dateFilter, setDateFilter] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });
  
  const [showSupplierManagement, setShowSupplierManagement] = useState(false);
  
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [documentRef, setDocumentRef] = useState('');
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([]);
  
  const [selectedItem, setSelectedItem] = useState('');
  const [quantity, setQuantity] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [manufactureDate, setManufactureDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  
  const [putAwayDialog, setPutAwayDialog] = useState(false);
  const [selectedReceiptItem, setSelectedReceiptItem] = useState<ReceiptItem | null>(null);
  const [putAwayLotId, setPutAwayLotId] = useState('');
  const [scanMode, setScanMode] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [lotSearchQuery, setLotSearchQuery] = useState('');

  useEffect(() => {
    fetchWarehouses();
    fetchItems();
    fetchSuppliers();
    fetchStockMovements();
  }, []);

  useEffect(() => {
    if (selectedWarehouse) {
      fetchLots(selectedWarehouse);
    }
  }, [selectedWarehouse]);

  useEffect(() => {
    const testSuppliers = async () => {
      console.log('🔍 Testing suppliers query...');
      
      // Test 1: Get all suppliers without filter
      const { data: allData, error: allError } = await supabase
        .from('suppliers')
        .select('*');
      
      console.log('All suppliers:', allData);
      console.log('All suppliers count:', allData?.length);
      console.log('All suppliers error:', allError);
      
      // Test 2: Get active suppliers
      const { data: activeData, error: activeError } = await supabase
        .from('suppliers')
        .select('*')
        .eq('status', 'active');
      
      console.log('Active suppliers:', activeData);
      console.log('Active suppliers count:', activeData?.length);
      console.log('Active suppliers error:', activeError);
      
      // Show each supplier details
      if (activeData) {
        activeData.forEach((s, i) => {
          console.log(`Supplier ${i+1}:`, {
            code: s.supplier_code,
            name: s.supplier_name,
            status: s.status
          });
        });
      }
      
      // Test 3: Check table structure
      const { data: structureData } = await supabase
        .from('suppliers')
        .select('*')
        .limit(1);
      
      if (structureData && structureData.length > 0) {
        console.log('Table columns:', Object.keys(structureData[0]));
      }
    };
    
    testSuppliers();
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('status', 'active')
        .order('supplier_name');
      
      console.log('=== SUPPLIERS DEBUG ===');
      console.log('Data:', data);
      console.log('Error:', error);
      console.log('Count:', data?.length);
      
      if (error) {
        toast({
          title: 'Error loading suppliers',
          description: error.message,
          variant: 'destructive'
        });
        return;
      }
      
      if (data) {
        setSuppliers(data);
        console.log('Suppliers set:', data.length);
      }
    } catch (err) {
      console.error('Fetch suppliers exception:', err);
    }
  };

  const generateBatchNumber = async () => {
    const { data, error } = await supabase.rpc('generate_batch_number');
    if (error) {
      console.error('Error generating batch number:', error);
      return null;
    }
    return data;
  };

  const fetchWarehouses = async () => {
    const { data } = await supabase.from('warehouses').select('*').order('name');
    if (data) setWarehouses(data);
  };

  const fetchItems = async () => {
    const { data } = await supabase.from('items').select('*').order('name');
    if (data) setItems(data);
  };

  const fetchLots = async (warehouseId: string) => {
    // First get zones for this warehouse
    const { data: zones } = await supabase
      .from('zones')
      .select('id')
      .eq('warehouse_id', warehouseId);
    
    if (!zones || zones.length === 0) {
      setLots([]);
      return;
    }
    
    const zoneIds = zones.map(z => z.id);
    
    // Then get racks for these zones
    const { data: racks } = await supabase
      .from('racks')
      .select('id')
      .in('zone_id', zoneIds);
    
    if (!racks || racks.length === 0) {
      setLots([]);
      return;
    }
    
    const rackIds = racks.map(r => r.id);
    
    // Finally get lots for these racks with proper column names
    const { data, error } = await supabase
      .from('lots')
      .select(`
        id,
        code,
        capacity,
        current_load,
        current_stock,
        rack_id
      `)
      .in('rack_id', rackIds)
      .order('code');
    
    if (error) {
      console.error('Error fetching lots:', error);
      toast({
        title: 'Error',
        description: 'Gagal memuat data lot',
        variant: 'destructive'
      });
      return;
    }
    
    // Manually join with racks and zones data
    if (data) {
      const lotsWithDetails = await Promise.all(
        data.map(async (lot) => {
          const { data: rack } = await supabase
            .from('racks')
            .select('code, zone_id')
            .eq('id', lot.rack_id)
            .single();
          
          if (rack) {
            const { data: zone } = await supabase
              .from('zones')
              .select('name')
              .eq('id', rack.zone_id)
              .single();
            
            return {
              ...lot,
              racks: {
                name: rack.code,
                zones: {
                  name: zone?.name || ''
                }
              }
            };
          }
          return lot;
        })
      );
      
      console.log('Lots loaded:', lotsWithDetails.length);
      setLots(lotsWithDetails);
    }
  };

  const fetchStockMovements = async () => {
    const { data, error } = await supabase
      .from('stock_movements')
      .select(`
        id,
        movement_type,
        quantity,
        document_reference,
        notes,
        created_at,
        items (
          sku,
          name,
          unit
        ),
        lots (
          code,
          racks (
            code,
            zones (
              name
            )
          )
        ),
        item_batches (
          batch_code
        )
      `)
      .eq('movement_type', 'in')
      .gte('created_at', `${dateFilter.from}T00:00:00`)
      .lte('created_at', `${dateFilter.to}T23:59:59`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching stock movements:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
      return;
    }

    if (data) {
      setStockMovements(data);
    }
  };

  const addItemToReceipt = async () => {
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

    // Auto-generate batch number if not provided
    let finalBatchNumber = batchNumber;
    if (!finalBatchNumber) {
      finalBatchNumber = await generateBatchNumber();
    }

    setReceiptItems([...receiptItems, {
      item_id: selectedItem,
      quantity: parseInt(quantity),
      batch_number: finalBatchNumber || undefined,
      manufacture_date: manufactureDate || undefined,
      expiry_date: expiryDate || undefined,
      items: item
    }]);

    setSelectedItem('');
    setQuantity('');
    setBatchNumber('');
    setManufactureDate('');
    setExpiryDate('');
  };

  const removeItem = (index: number) => {
    setReceiptItems(receiptItems.filter((_, i) => i !== index));
  };

  const openPutAwayDialog = (item: ReceiptItem) => {
    setSelectedReceiptItem(item);
    setPutAwayLotId('');
    setScanMode(false);
    setScanInput('');
    setLotSearchQuery('');
    setPutAwayDialog(true);
  };

  const handleBarcodeScan = (barcode: string) => {
    const lot = lots.find(l => l.code === barcode);
    if (lot) {
      setPutAwayLotId(lot.id);
      setScanMode(false);
      toast({
        title: 'Berhasil',
        description: `Lot ${lot.code} dipilih`
      });
    } else {
      toast({
        title: 'Error',
        description: 'Lot tidak ditemukan',
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

  const processPutAway = async () => {
    if (!selectedReceiptItem || !putAwayLotId) {
      toast({
        title: 'Error',
        description: 'Pilih lokasi penyimpanan',
        variant: 'destructive'
      });
      return;
    }

    const lot = lots.find(l => l.id === putAwayLotId);
    if (!lot) return;

    const currentLoad = lot.current_load || 0;
    if (currentLoad + selectedReceiptItem.quantity > lot.capacity) {
      toast({
        title: 'Error',
        description: 'Kapasitas lot tidak mencukupi',
        variant: 'destructive'
      });
      return;
    }

    // Create batch if batch info provided
    let batchId = null;
    if (selectedReceiptItem.batch_number) {
      const { data: batch, error: batchError } = await supabase
        .from('item_batches')
        .insert({
          batch_code: selectedReceiptItem.batch_number,
          item_id: selectedReceiptItem.item_id,
          lot_id: putAwayLotId,
          manufacture_date: selectedReceiptItem.manufacture_date,
          expiry_date: selectedReceiptItem.expiry_date,
          quantity: selectedReceiptItem.quantity,
          status: 'active'
        })
        .select()
        .single();
      
      if (batchError) {
        console.error('Error creating batch:', batchError);
        toast({
          title: 'Error',
          description: 'Gagal membuat batch: ' + batchError.message,
          variant: 'destructive'
        });
        return;
      }
      
      if (batch) batchId = batch.id;
    }

    // Update or create item_location
    const { data: existingLocation } = await supabase
      .from('item_locations')
      .select('*')
      .eq('item_id', selectedReceiptItem.item_id)
      .eq('lot_id', putAwayLotId)
      .maybeSingle();

    if (existingLocation) {
      const { error: updateError } = await supabase
        .from('item_locations')
        .update({ quantity: existingLocation.quantity + selectedReceiptItem.quantity })
        .eq('id', existingLocation.id);
      
      if (updateError) {
        console.error('Error updating item_location:', updateError);
        toast({
          title: 'Error',
          description: 'Gagal update lokasi: ' + updateError.message,
          variant: 'destructive'
        });
        return;
      }
    } else {
      const { error: insertError } = await supabase
        .from('item_locations')
        .insert({
          item_id: selectedReceiptItem.item_id,
          lot_id: putAwayLotId,
          quantity: selectedReceiptItem.quantity
        });
      
      if (insertError) {
        console.error('Error inserting item_location:', insertError);
        toast({
          title: 'Error',
          description: 'Gagal simpan lokasi: ' + insertError.message,
          variant: 'destructive'
        });
        return;
      }
    }

    // Update lot current_load (not current_stock)
    const { error: lotError } = await supabase
      .from('lots')
      .update({ current_load: currentLoad + selectedReceiptItem.quantity })
      .eq('id', putAwayLotId);
    
    if (lotError) {
      console.error('Error updating lot:', lotError);
      toast({
        title: 'Error',
        description: 'Gagal update lot: ' + lotError.message,
        variant: 'destructive'
      });
      return;
    }

    // Get supplier name if selected
    const supplierName = selectedSupplier 
      ? suppliers.find(s => s.id === selectedSupplier)?.supplier_name 
      : null;

    // Record stock movement
    const { error: movementError } = await supabase
      .from('stock_movements')
      .insert({
        item_id: selectedReceiptItem.item_id,
        lot_id: putAwayLotId,
        batch_id: batchId,
        movement_type: 'in',
        quantity: selectedReceiptItem.quantity,
        document_reference: documentRef || 'Stock In',
        notes: supplierName ? `Dari supplier: ${supplierName}` : undefined
      });
    
    if (movementError) {
      console.error('Error recording stock movement:', movementError);
      toast({
        title: 'Error',
        description: 'Gagal catat pergerakan: ' + movementError.message,
        variant: 'destructive'
      });
      return;
    }

    // Update receipt item with lot_id
    const updatedItems = receiptItems.map(item => 
      item === selectedReceiptItem ? { ...item, lot_id: putAwayLotId } : item
    );
    setReceiptItems(updatedItems);

    toast({
      title: 'Berhasil',
      description: 'Barang berhasil disimpan'
    });

    setPutAwayDialog(false);
    setSelectedReceiptItem(null);
    
    // Refresh stock movements
    fetchStockMovements();
  };

  const completeReceipt = async () => {
    const pendingItems = receiptItems.filter(item => !item.lot_id);
    
    if (pendingItems.length > 0) {
      toast({
        title: 'Error',
        description: 'Masih ada barang yang belum disimpan',
        variant: 'destructive'
      });
      return;
    }

    toast({
      title: 'Berhasil',
      description: 'Penerimaan barang selesai'
    });

    // Reset form
    setSelectedSupplier('');
    setDocumentRef('');
    setReceiptItems([]);
  };

  if (showSupplierManagement) {
    return (
      <div className="p-6 space-y-4 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Manajemen Supplier</h1>
            <p className="text-gray-600">Kelola data supplier</p>
          </div>
          <Button variant="outline" onClick={() => {
            setShowSupplierManagement(false);
            fetchSuppliers();
          }}>
            Kembali ke Stock In
          </Button>
        </div>
        <SupplierManagement />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Barang Masuk (Stock In)</h1>
          <p className="text-gray-600">Penerimaan barang dari supplier atau transfer masuk</p>
        </div>
      </div>

      <Tabs defaultValue="input" className="space-y-4">
        <TabsList>
          <TabsTrigger value="input">
            <Package className="h-4 w-4 mr-2" />
            Input Barang Masuk
          </TabsTrigger>
          <TabsTrigger value="laporan">
            <FileText className="h-4 w-4 mr-2" />
            Laporan & History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="input" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informasi Penerimaan</CardTitle>
              <CardDescription>Masukkan detail penerimaan barang</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Gudang Tujuan *</Label>
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
                  <Label>Supplier *</Label>
                  <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.supplier_name}
                          {s.contact_person && ` - ${s.contact_person}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>No. Dokumen (Opsional)</Label>
                  <Input
                    value={documentRef}
                    onChange={(e) => setDocumentRef(e.target.value)}
                    placeholder="PO/DO/Invoice"
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                <div>
                  <Label>No. Batch (Auto-generate jika kosong)</Label>
                  <Input
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    placeholder="Otomatis: BATCH000001"
                  />
                </div>
                <div>
                  <Label>Tanggal Produksi (Opsional)</Label>
                  <Input
                    type="date"
                    value={manufactureDate}
                    onChange={(e) => setManufactureDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Tanggal Kadaluarsa (Opsional)</Label>
                  <Input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={addItemToReceipt} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah Item
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {receiptItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Daftar Item ({receiptItems.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Nama Item</TableHead>
                      <TableHead>Jumlah</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Kadaluarsa</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receiptItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.items?.sku}</TableCell>
                        <TableCell>{item.items?.name}</TableCell>
                        <TableCell>{item.quantity} {item.items?.unit}</TableCell>
                        <TableCell>{item.batch_number || '-'}</TableCell>
                        <TableCell>{item.expiry_date || '-'}</TableCell>
                        <TableCell>
                          {item.lot_id ? (
                            <span className="text-green-600 flex items-center">
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Tersimpan
                            </span>
                          ) : (
                            <span className="text-orange-600">Belum disimpan</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {!item.lot_id ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => openPutAwayDialog(item)}
                                className="mr-2"
                              >
                                <Package className="h-4 w-4 mr-2" />
                                Simpan
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
                    onClick={completeReceipt}
                    disabled={receiptItems.some(item => !item.lot_id)}
                    size="lg"
                  >
                    Selesaikan Penerimaan
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="laporan" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>History Barang Masuk</CardTitle>
                  <CardDescription>Data tersimpan di tabel: stock_movements (movement_type = 'in')</CardDescription>
                </div>
                <div className="flex gap-2 items-center">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <Input
                    type="date"
                    value={dateFilter.from}
                    onChange={(e) => setDateFilter({ ...dateFilter, from: e.target.value })}
                    className="w-40"
                  />
                  <span className="text-gray-500">s/d</span>
                  <Input
                    type="date"
                    value={dateFilter.to}
                    onChange={(e) => setDateFilter({ ...dateFilter, to: e.target.value })}
                    className="w-40"
                  />
                  <Button onClick={fetchStockMovements} size="sm">
                    Filter
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {stockMovements.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">Belum ada data barang masuk</p>
                  <p className="text-sm text-gray-400 mt-2">Data akan muncul setelah Anda menyelesaikan penerimaan barang</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">📊 Ringkasan</h3>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Total Transaksi</p>
                        <p className="text-2xl font-bold text-blue-900">{stockMovements.length}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Total Item Masuk</p>
                        <p className="text-2xl font-bold text-blue-900">
                          {stockMovements.reduce((sum, m) => sum + m.quantity, 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Periode</p>
                        <p className="text-sm font-semibold text-blue-900">
                          {new Date(dateFilter.from).toLocaleDateString('id-ID')} - {new Date(dateFilter.to).toLocaleDateString('id-ID')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Nama Item</TableHead>
                        <TableHead>Jumlah</TableHead>
                        <TableHead>Batch</TableHead>
                        <TableHead>Lokasi</TableHead>
                        <TableHead>No. Dokumen</TableHead>
                        <TableHead>Catatan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stockMovements.map((movement) => (
                        <TableRow key={movement.id}>
                          <TableCell>
                            {new Date(movement.created_at).toLocaleString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </TableCell>
                          <TableCell className="font-mono">{movement.items?.sku}</TableCell>
                          <TableCell>{movement.items?.name}</TableCell>
                          <TableCell className="font-semibold">
                            +{movement.quantity} {movement.items?.unit}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {movement.item_batches?.batch_code || '-'}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="font-medium">{movement.lots?.code}</div>
                              <div className="text-gray-500 text-xs">
                                {movement.lots?.racks?.zones?.name} / {movement.lots?.racks?.code}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{movement.document_reference || '-'}</TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {movement.notes || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={putAwayDialog} onOpenChange={setPutAwayDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Simpan ke Lokasi</DialogTitle>
            <DialogDescription>
              {selectedReceiptItem?.items?.name} - {selectedReceiptItem?.quantity} {selectedReceiptItem?.items?.unit}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="manual">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual">Pilih Manual</TabsTrigger>
              <TabsTrigger value="scan">Scan Barcode</TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="space-y-4">
              <div>
                <Label>Cari Lokasi</Label>
                <Input
                  placeholder="Ketik untuk mencari lot..."
                  value={lotSearchQuery}
                  onChange={(e) => setLotSearchQuery(e.target.value)}
                  className="mb-2"
                />
              </div>
              <div>
                <Label>Pilih Lokasi</Label>
                <Select value={putAwayLotId} onValueChange={setPutAwayLotId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih lot" />
                  </SelectTrigger>
                  <SelectContent>
                    {lots
                      .filter(lot => 
                        lot.code.toLowerCase().includes(lotSearchQuery.toLowerCase()) ||
                        lot.racks.zones.name.toLowerCase().includes(lotSearchQuery.toLowerCase()) ||
                        lot.racks.name.toLowerCase().includes(lotSearchQuery.toLowerCase())
                      )
                      .map(lot => (
                        <SelectItem key={lot.id} value={lot.id}>
                          {lot.code} - {lot.racks?.zones?.name || ''} / {lot.racks?.name || ''} 
                          ({lot.current_load || 0}/{lot.capacity})
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
                    <Label>Masukkan Kode Lot</Label>
                    <div className="flex gap-2">
                      <Input
                        value={scanInput}
                        onChange={(e) => setScanInput(e.target.value)}
                        placeholder="LOT-001"
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
            <Button variant="outline" onClick={() => setPutAwayDialog(false)}>
              Batal
            </Button>
            <Button onClick={processPutAway} disabled={!putAwayLotId}>
              Simpan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}