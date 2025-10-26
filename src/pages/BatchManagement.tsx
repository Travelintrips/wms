import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Plus, Package, ArrowRightLeft, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

interface ItemBatch {
  id: string;
  batch_code: string;
  item_id: string;
  lot_id: string;
  expiry_date: string;
  manufacture_date: string;
  quantity: number;
  status: string;
  items: {
    name: string;
    sku: string;
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
}

interface Relocation {
  id: string;
  batch_id: string;
  quantity: number;
  reason: string;
  relocated_at: string;
  item_batches: {
    batch_code: string;
  };
  from_lot: {
    code: string;
  };
  to_lot: {
    code: string;
  };
}

export default function BatchManagement() {
  const [batches, setBatches] = useState<ItemBatch[]>([]);
  const [relocations, setRelocations] = useState<Relocation[]>([]);
  const [items, setItems] = useState([]);
  const [lots, setLots] = useState([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isRelocateDialogOpen, setIsRelocateDialogOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<ItemBatch | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [batchForm, setBatchForm] = useState({
    batch_code: '',
    item_id: '',
    lot_id: '',
    expiry_date: '',
    manufacture_date: '',
    quantity: '',
    status: 'active'
  });

  const [relocateForm, setRelocateForm] = useState({
    to_lot_id: '',
    quantity: '',
    reason: ''
  });

  useEffect(() => {
    fetchBatches();
    fetchRelocations();
    fetchItems();
    fetchLots();
  }, []);

  const fetchBatches = async () => {
    const { data, error } = await supabase
      .from('item_batches')
      .select(`
        *,
        items(name, sku),
        lots(code, racks(code, zones(name)))
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Error',
        description: 'Gagal memuat data batch',
        variant: 'destructive'
      });
    } else {
      setBatches(data || []);
    }
  };

  const fetchRelocations = async () => {
    const { data, error } = await supabase
      .from('batch_relocations')
      .select(`
        *,
        item_batches(batch_code),
        from_lot:from_lot_id(code),
        to_lot:to_lot_id(code)
      `)
      .order('relocated_at', { ascending: false })
      .limit(20);

    if (error) {
      toast({
        title: 'Error',
        description: 'Gagal memuat data relokasi',
        variant: 'destructive'
      });
    } else {
      setRelocations(data || []);
    }
  };

  const fetchItems = async () => {
    const { data } = await supabase.from('items').select('*').order('name');
    if (data) setItems(data);
  };

  const fetchLots = async () => {
    const { data } = await supabase
      .from('lots')
      .select('*, racks(code, zones(name))')
      .order('code');
    if (data) setLots(data);
  };

  const handleAddBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from('item_batches').insert({
      batch_code: batchForm.batch_code,
      item_id: batchForm.item_id,
      lot_id: batchForm.lot_id,
      expiry_date: batchForm.expiry_date,
      manufacture_date: batchForm.manufacture_date,
      quantity: parseInt(batchForm.quantity),
      status: batchForm.status
    });

    if (error) {
      toast({
        title: 'Error',
        description: 'Gagal menambahkan batch',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Sukses',
        description: 'Batch berhasil ditambahkan'
      });
      setIsAddDialogOpen(false);
      setBatchForm({
        batch_code: '',
        item_id: '',
        lot_id: '',
        expiry_date: '',
        manufacture_date: '',
        quantity: '',
        status: 'active'
      });
      fetchBatches();
    }

    setLoading(false);
  };

  const handleRelocate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch) return;

    setLoading(true);

    const quantity = parseInt(relocateForm.quantity);

    const { error: relocateError } = await supabase.from('batch_relocations').insert({
      batch_id: selectedBatch.id,
      from_lot_id: selectedBatch.lot_id,
      to_lot_id: relocateForm.to_lot_id,
      quantity,
      reason: relocateForm.reason,
      relocated_by: 'System User'
    });

    if (relocateError) {
      toast({
        title: 'Error',
        description: 'Gagal melakukan relokasi',
        variant: 'destructive'
      });
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase
      .from('item_batches')
      .update({
        lot_id: relocateForm.to_lot_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', selectedBatch.id);

    if (updateError) {
      toast({
        title: 'Error',
        description: 'Gagal memperbarui lokasi batch',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Sukses',
        description: 'Batch berhasil dipindahkan'
      });
      setIsRelocateDialogOpen(false);
      setRelocateForm({ to_lot_id: '', quantity: '', reason: '' });
      setSelectedBatch(null);
      fetchBatches();
      fetchRelocations();
    }

    setLoading(false);
  };

  const openRelocateDialog = (batch: ItemBatch) => {
    setSelectedBatch(batch);
    setRelocateForm({ to_lot_id: '', quantity: batch.quantity.toString(), reason: '' });
    setIsRelocateDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const config = {
      active: { label: 'Aktif', className: 'bg-green-100 text-green-800' },
      expired: { label: 'Kadaluarsa', className: 'bg-red-100 text-red-800' },
      quarantine: { label: 'Karantina', className: 'bg-yellow-100 text-yellow-800' }
    };
    const statusConfig = config[status as keyof typeof config] || config.active;
    return <Badge className={statusConfig.className}>{statusConfig.label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Batch Management</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <Tabs defaultValue="batches">
            <TabsList className="grid w-full grid-cols-2 bg-white shadow-sm">
              <TabsTrigger value="batches">
                <Package className="h-4 w-4 mr-2" />
                Daftar Batch
              </TabsTrigger>
              <TabsTrigger value="relocations">
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Riwayat Relokasi
              </TabsTrigger>
            </TabsList>

            <TabsContent value="batches">
              <Card className="shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-white border-b">
                  <div className="flex items-center justify-between">
                    <CardTitle>Daftar Batch Barang</CardTitle>
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Tambah Batch
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Tambah Batch Baru</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleAddBatch} className="space-y-4">
                          <div>
                            <Label htmlFor="batch_code">Kode Batch</Label>
                            <Input
                              id="batch_code"
                              value={batchForm.batch_code}
                              onChange={(e) => setBatchForm({ ...batchForm, batch_code: e.target.value })}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="item_id">Barang</Label>
                            <Select value={batchForm.item_id} onValueChange={(v) => setBatchForm({ ...batchForm, item_id: v })}>
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih barang" />
                              </SelectTrigger>
                              <SelectContent>
                                {items.map((item: any) => (
                                  <SelectItem key={item.id} value={item.id}>
                                    {item.name} ({item.sku})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="lot_id">Lokasi Lot</Label>
                            <Select value={batchForm.lot_id} onValueChange={(v) => setBatchForm({ ...batchForm, lot_id: v })}>
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih lot" />
                              </SelectTrigger>
                              <SelectContent>
                                {lots.map((lot: any) => (
                                  <SelectItem key={lot.id} value={lot.id}>
                                    {lot.racks?.zones?.name} - {lot.racks?.code} - {lot.code}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="quantity">Jumlah</Label>
                            <Input
                              id="quantity"
                              type="number"
                              value={batchForm.quantity}
                              onChange={(e) => setBatchForm({ ...batchForm, quantity: e.target.value })}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="manufacture_date">Tanggal Produksi</Label>
                            <Input
                              id="manufacture_date"
                              type="date"
                              value={batchForm.manufacture_date}
                              onChange={(e) => setBatchForm({ ...batchForm, manufacture_date: e.target.value })}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="expiry_date">Tanggal Kadaluarsa</Label>
                            <Input
                              id="expiry_date"
                              type="date"
                              value={batchForm.expiry_date}
                              onChange={(e) => setBatchForm({ ...batchForm, expiry_date: e.target.value })}
                              required
                            />
                          </div>
                          <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'Menyimpan...' : 'Simpan Batch'}
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold">Kode Batch</TableHead>
                        <TableHead className="font-semibold">Barang</TableHead>
                        <TableHead className="font-semibold">Lokasi</TableHead>
                        <TableHead className="font-semibold">Jumlah</TableHead>
                        <TableHead className="font-semibold">Tanggal Produksi</TableHead>
                        <TableHead className="font-semibold">Kadaluarsa</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="text-right font-semibold">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {batches.map((batch) => (
                        <TableRow key={batch.id} className="hover:bg-blue-50/50">
                          <TableCell className="font-mono text-sm">{batch.batch_code}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{batch.items?.name}</div>
                              <div className="text-xs text-gray-600">{batch.items?.sku}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {batch.lots?.racks?.zones?.name} - {batch.lots?.racks?.code} - {batch.lots?.code}
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold">{batch.quantity}</TableCell>
                          <TableCell>{new Date(batch.manufacture_date).toLocaleDateString('id-ID')}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              {new Date(batch.expiry_date).toLocaleDateString('id-ID')}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(batch.status)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openRelocateDialog(batch)}
                            >
                              <ArrowRightLeft className="h-4 w-4 mr-2" />
                              Pindahkan
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="relocations">
              <Card className="shadow-lg">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-white border-b">
                  <CardTitle>Riwayat Relokasi Batch</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold">Tanggal</TableHead>
                        <TableHead className="font-semibold">Kode Batch</TableHead>
                        <TableHead className="font-semibold">Dari Lot</TableHead>
                        <TableHead className="font-semibold">Ke Lot</TableHead>
                        <TableHead className="font-semibold">Jumlah</TableHead>
                        <TableHead className="font-semibold">Alasan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {relocations.map((relocation) => (
                        <TableRow key={relocation.id} className="hover:bg-purple-50/50">
                          <TableCell>{new Date(relocation.relocated_at).toLocaleString('id-ID')}</TableCell>
                          <TableCell className="font-mono text-sm">{relocation.item_batches?.batch_code}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{relocation.from_lot?.code}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-green-50">{relocation.to_lot?.code}</Badge>
                          </TableCell>
                          <TableCell className="font-semibold">{relocation.quantity}</TableCell>
                          <TableCell className="text-sm text-gray-600">{relocation.reason}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Dialog open={isRelocateDialogOpen} onOpenChange={setIsRelocateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Relokasi Batch</DialogTitle>
          </DialogHeader>
          {selectedBatch && (
            <form onSubmit={handleRelocate} className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm font-semibold">Batch: {selectedBatch.batch_code}</div>
                <div className="text-sm text-gray-600">Barang: {selectedBatch.items?.name}</div>
                <div className="text-sm text-gray-600">
                  Lokasi Saat Ini: {selectedBatch.lots?.racks?.zones?.name} - {selectedBatch.lots?.racks?.code} - {selectedBatch.lots?.code}
                </div>
              </div>
              <div>
                <Label htmlFor="to_lot_id">Pindah Ke Lot</Label>
                <Select value={relocateForm.to_lot_id} onValueChange={(v) => setRelocateForm({ ...relocateForm, to_lot_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih lot tujuan" />
                  </SelectTrigger>
                  <SelectContent>
                    {lots.filter((lot: any) => lot.id !== selectedBatch.lot_id).map((lot: any) => (
                      <SelectItem key={lot.id} value={lot.id}>
                        {lot.racks?.zones?.name} - {lot.racks?.code} - {lot.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="quantity">Jumlah</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={relocateForm.quantity}
                  onChange={(e) => setRelocateForm({ ...relocateForm, quantity: e.target.value })}
                  max={selectedBatch.quantity}
                  required
                />
              </div>
              <div>
                <Label htmlFor="reason">Alasan Relokasi</Label>
                <Input
                  id="reason"
                  value={relocateForm.reason}
                  onChange={(e) => setRelocateForm({ ...relocateForm, reason: e.target.value })}
                  placeholder="Contoh: Optimasi ruang, rotasi stok"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Memproses...' : 'Pindahkan Batch'}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
