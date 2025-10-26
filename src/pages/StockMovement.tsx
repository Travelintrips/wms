import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowDownCircle, ArrowUpCircle, Package, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

interface Item {
  id: string;
  sku: string;
  name: string;
  category: string;
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

interface Batch {
  id: string;
  batch_code: string;
  item_id: string;
  lot_id: string;
  quantity: number;
  expiry_date: string;
  manufacture_date: string;
  status: string;
  created_at: string;
  item?: Item;
  lot?: Lot;
}

export default function StockMovement() {
  const { toast } = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  
  // Form states for stock in
  const [inItemId, setInItemId] = useState('');
  const [inLotId, setInLotId] = useState('');
  const [inQuantity, setInQuantity] = useState('');
  const [inBatchCode, setInBatchCode] = useState('');
  const [inExpiryDate, setInExpiryDate] = useState('');
  const [inMfgDate, setInMfgDate] = useState('');
  
  // Form states for stock out
  const [outBatchId, setOutBatchId] = useState('');
  const [outQuantity, setOutQuantity] = useState('');

  useEffect(() => {
    fetchItems();
    fetchLots();
    fetchBatches();
  }, []);

  const fetchItems = async () => {
    const { data, error } = await supabase.from('items').select('*').order('name');
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setItems(data || []);
    }
  };

  const fetchLots = async () => {
    const { data, error } = await supabase
      .from('lots')
      .select('*, rack:racks(code, zone:zones(name, warehouse:warehouses(name)))')
      .order('code');
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setLots(data || []);
    }
  };

  const fetchBatches = async () => {
    const { data, error } = await supabase
      .from('item_batches')
      .select('*, item:items(*), lot:lots(*, rack:racks(code, zone:zones(name)))')
      .order('created_at', { ascending: false });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setBatches(data || []);
    }
  };

  const handleStockIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inItemId || !inLotId || !inQuantity || !inBatchCode) {
      toast({ title: 'Error', description: 'Harap isi semua field yang wajib', variant: 'destructive' });
      return;
    }

    const { data: newBatch, error } = await supabase
      .from('item_batches')
      .insert([{
        batch_code: inBatchCode,
        item_id: inItemId,
        lot_id: inLotId,
        quantity: parseInt(inQuantity),
        expiry_date: inExpiryDate || null,
        manufacture_date: inMfgDate || null,
        status: 'active'
      }])
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }

    // Update lot current_load
    const lot = lots.find(l => l.id === inLotId);
    if (lot) {
      const { data: currentLot } = await supabase
        .from('lots')
        .select('current_load')
        .eq('id', inLotId)
        .single();
      
      if (currentLot) {
        const { error: lotError } = await supabase
          .from('lots')
          .update({ current_load: currentLot.current_load + parseInt(inQuantity) })
          .eq('id', inLotId);
        
        if (lotError) {
          console.error('Error updating lot:', lotError);
        }
      }
    }

    toast({ title: 'Berhasil', description: `Stok masuk berhasil dicatat (Batch: ${inBatchCode})` });
    
    // Reset form
    setInItemId('');
    setInLotId('');
    setInQuantity('');
    setInBatchCode('');
    setInExpiryDate('');
    setInMfgDate('');
    
    fetchBatches();
    fetchLots();
  };

  const handleStockOut = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!outBatchId || !outQuantity) {
      toast({ title: 'Error', description: 'Harap pilih batch dan isi quantity', variant: 'destructive' });
      return;
    }

    const batch = batches.find(b => b.id === outBatchId);
    if (!batch) {
      toast({ title: 'Error', description: 'Batch tidak ditemukan', variant: 'destructive' });
      return;
    }

    const qtyOut = parseInt(outQuantity);
    if (qtyOut > batch.quantity) {
      toast({ title: 'Error', description: 'Quantity melebihi stok yang tersedia', variant: 'destructive' });
      return;
    }

    const newQuantity = batch.quantity - qtyOut;
    const newStatus = newQuantity === 0 ? 'depleted' : 'active';

    const { error } = await supabase
      .from('item_batches')
      .update({ 
        quantity: newQuantity,
        status: newStatus
      })
      .eq('id', outBatchId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }

    // Update lot current_load
    if (batch.lot_id) {
      const { data: currentLot } = await supabase
        .from('lots')
        .select('current_load')
        .eq('id', batch.lot_id)
        .single();
      
      if (currentLot) {
        const { error: lotError } = await supabase
          .from('lots')
          .update({ current_load: currentLot.current_load - qtyOut })
          .eq('id', batch.lot_id);
        
        if (lotError) {
          console.error('Error updating lot:', lotError);
        }
      }
    }

    toast({ title: 'Berhasil', description: `Stok keluar berhasil dicatat (${qtyOut} ${batch.item?.unit})` });
    
    // Reset form
    setOutBatchId('');
    setOutQuantity('');
    
    fetchBatches();
    fetchLots();
  };

  const getExpiryStatus = (expiryDate: string) => {
    if (!expiryDate) return null;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) return { label: 'Expired', variant: 'destructive' as const };
    if (daysUntilExpiry <= 30) return { label: `${daysUntilExpiry} hari lagi`, variant: 'destructive' as const };
    if (daysUntilExpiry <= 90) return { label: `${daysUntilExpiry} hari lagi`, variant: 'default' as const };
    return { label: `${daysUntilExpiry} hari lagi`, variant: 'secondary' as const };
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Pergerakan Stok</h1>
          <p className="text-gray-600 mt-1">Kelola stok masuk dan keluar dengan batch tracking</p>
        </div>

        <Tabs defaultValue="stock-in" className="space-y-4">
          <TabsList>
            <TabsTrigger value="stock-in">
              <ArrowDownCircle className="h-4 w-4 mr-2" />
              Stok Masuk
            </TabsTrigger>
            <TabsTrigger value="stock-out">
              <ArrowUpCircle className="h-4 w-4 mr-2" />
              Stok Keluar
            </TabsTrigger>
            <TabsTrigger value="batches">
              <Package className="h-4 w-4 mr-2" />
              Daftar Batch
            </TabsTrigger>
          </TabsList>

          {/* STOCK IN TAB */}
          <TabsContent value="stock-in">
            <Card>
              <CardHeader>
                <CardTitle>Input Stok Masuk</CardTitle>
                <CardDescription>Catat stok masuk dan buat batch baru</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleStockIn} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="in-item">Barang *</Label>
                      <Select value={inItemId} onValueChange={setInItemId} required>
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
                      <Label htmlFor="in-lot">Lokasi (Lot) *</Label>
                      <Select value={inLotId} onValueChange={setInLotId} required>
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

                    <div>
                      <Label htmlFor="in-batch-code">Kode Batch *</Label>
                      <Input
                        id="in-batch-code"
                        value={inBatchCode}
                        onChange={(e) => setInBatchCode(e.target.value)}
                        placeholder="e.g. BATCH-2024-001"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="in-quantity">Quantity *</Label>
                      <Input
                        id="in-quantity"
                        type="number"
                        value={inQuantity}
                        onChange={(e) => setInQuantity(e.target.value)}
                        placeholder="0"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="in-mfg-date">Tanggal Produksi</Label>
                      <Input
                        id="in-mfg-date"
                        type="date"
                        value={inMfgDate}
                        onChange={(e) => setInMfgDate(e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="in-expiry-date">Tanggal Kadaluarsa</Label>
                      <Input
                        id="in-expiry-date"
                        type="date"
                        value={inExpiryDate}
                        onChange={(e) => setInExpiryDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full">
                    <ArrowDownCircle className="h-4 w-4 mr-2" />
                    Catat Stok Masuk
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* STOCK OUT TAB */}
          <TabsContent value="stock-out">
            <Card>
              <CardHeader>
                <CardTitle>Input Stok Keluar</CardTitle>
                <CardDescription>Catat stok keluar dari batch yang ada</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleStockOut} className="space-y-4">
                  <div>
                    <Label htmlFor="out-batch">Pilih Batch *</Label>
                    <Select value={outBatchId} onValueChange={setOutBatchId} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih batch" />
                      </SelectTrigger>
                      <SelectContent>
                        {batches
                          .filter(b => b.status === 'active' && b.quantity > 0)
                          .map((batch) => (
                            <SelectItem key={batch.id} value={batch.id}>
                              {batch.batch_code} - {batch.item?.name} (Stok: {batch.quantity} {batch.item?.unit})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {outBatchId && (
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium text-blue-900">Detail Batch:</p>
                      {(() => {
                        const batch = batches.find(b => b.id === outBatchId);
                        if (!batch) return null;
                        return (
                          <div className="mt-2 space-y-1 text-sm text-blue-800">
                            <p>Barang: {batch.item?.name}</p>
                            <p>Lokasi: {batch.lot?.code} - {batch.lot?.rack?.code}</p>
                            <p>Stok Tersedia: {batch.quantity} {batch.item?.unit}</p>
                            {batch.expiry_date && (
                              <p>Kadaluarsa: {new Date(batch.expiry_date).toLocaleDateString('id-ID')}</p>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  <div>
                    <Label htmlFor="out-quantity">Quantity Keluar *</Label>
                    <Input
                      id="out-quantity"
                      type="number"
                      value={outQuantity}
                      onChange={(e) => setOutQuantity(e.target.value)}
                      placeholder="0"
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full">
                    <ArrowUpCircle className="h-4 w-4 mr-2" />
                    Catat Stok Keluar
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* BATCHES TAB */}
          <TabsContent value="batches">
            <Card>
              <CardHeader>
                <CardTitle>Daftar Batch</CardTitle>
                <CardDescription>Semua batch yang ada di gudang</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kode Batch</TableHead>
                      <TableHead>Barang</TableHead>
                      <TableHead>Lokasi</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Tgl Produksi</TableHead>
                      <TableHead>Kadaluarsa</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batches.map((batch) => {
                      const expiryStatus = batch.expiry_date ? getExpiryStatus(batch.expiry_date) : null;
                      return (
                        <TableRow key={batch.id}>
                          <TableCell className="font-medium">{batch.batch_code}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{batch.item?.name}</p>
                              <p className="text-sm text-gray-500">{batch.item?.sku}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p>{batch.lot?.code} - {batch.lot?.rack?.code}</p>
                              <p className="text-gray-500">{batch.lot?.rack?.zone?.name}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{batch.quantity}</span> {batch.item?.unit}
                          </TableCell>
                          <TableCell>
                            {batch.manufacture_date ? (
                              <div className="flex items-center gap-1 text-sm">
                                <Calendar className="h-3 w-3" />
                                {new Date(batch.manufacture_date).toLocaleDateString('id-ID')}
                              </div>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            {batch.expiry_date ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1 text-sm">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(batch.expiry_date).toLocaleDateString('id-ID')}
                                </div>
                                {expiryStatus && (
                                  <Badge variant={expiryStatus.variant} className="text-xs">
                                    {expiryStatus.label}
                                  </Badge>
                                )}
                              </div>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={batch.status === 'active' ? 'default' : 'secondary'}>
                              {batch.status === 'active' ? 'Aktif' : 'Habis'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}