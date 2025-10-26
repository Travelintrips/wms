import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Package, ArrowRightLeft, FileText, Calendar, Weight, Box } from 'lucide-react';

interface Item {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  length_cm?: number;
  width_cm?: number;
  height_cm?: number;
  actual_weight_kg?: number;
  volume_m3?: number;
}

interface StockMovement {
  id: string;
  item_id: string;
  lokasi: string;
  lokasi_asal?: string;
  tanggal_masuk: string;
  tanggal_keluar?: string;
  status: string;
  berat_kg?: number;
  volume_m3?: number;
  hari_simpan?: number;
  hari_di_lini1?: number;
  document_reference?: string;
  notes?: string;
  items?: Item;
}

export default function WarehouseLineManagement() {
  const { toast } = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [filteredMovements, setFilteredMovements] = useState<StockMovement[]>([]);
  const [selectedLine, setSelectedLine] = useState<'all' | 'Lini 1' | 'Lini 2'>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    item_id: '',
    lokasi_asal: 'Lini 1',
    lokasi: 'Lini 2',
    tanggal_masuk: new Date().toISOString().split('T')[0],
    berat_kg: '',
    volume_m3: '',
    hari_di_lini1: '',
    document_reference: '',
    notes: ''
  });

  useEffect(() => {
    fetchItems();
    fetchStockMovements();
  }, []);

  useEffect(() => {
    filterMovements();
  }, [stockMovements, selectedLine, selectedStatus]);

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('name');
    
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setItems(data || []);
    }
  };

  const fetchStockMovements = async () => {
    const { data, error } = await supabase
      .from('stock_movements')
      .select(`
        *,
        items (
          id,
          sku,
          name,
          category,
          unit,
          length_cm,
          width_cm,
          height_cm,
          actual_weight_kg,
          volume_m3
        )
      `)
      .not('lokasi', 'is', null)
      .order('tanggal_masuk', { ascending: false });
    
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      // Calculate hari_simpan
      const movementsWithDays = (data || []).map(m => ({
        ...m,
        hari_simpan: m.tanggal_masuk 
          ? Math.floor((new Date().getTime() - new Date(m.tanggal_masuk).getTime()) / (1000 * 60 * 60 * 24))
          : 0
      }));
      setStockMovements(movementsWithDays);
    }
  };

  const filterMovements = () => {
    let filtered = stockMovements;
    
    if (selectedLine !== 'all') {
      filtered = filtered.filter(m => m.lokasi === selectedLine);
    }
    
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(m => m.status === selectedStatus);
    }
    
    setFilteredMovements(filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.item_id || !formData.lokasi) {
      toast({ title: 'Error', description: 'Item dan lokasi wajib diisi', variant: 'destructive' });
      return;
    }

    const { error } = await supabase
      .from('stock_movements')
      .insert([{
        item_id: formData.item_id,
        lokasi: formData.lokasi,
        lokasi_asal: formData.lokasi_asal,
        tanggal_masuk: formData.tanggal_masuk,
        status: 'Aktif',
        berat_kg: formData.berat_kg ? parseFloat(formData.berat_kg) : null,
        volume_m3: formData.volume_m3 ? parseFloat(formData.volume_m3) : null,
        hari_di_lini1: formData.hari_di_lini1 ? parseInt(formData.hari_di_lini1) : null,
        document_reference: formData.document_reference || null,
        notes: formData.notes || null,
        movement_type: 'transfer',
        quantity: 1
      }]);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }

    // Log activity
    await supabase.from('activity_logs').insert([{
      entity_table: 'stock_movements',
      record_id: formData.item_id,
      action_type: 'INSERT',
      new_data: formData,
      changed_by: 'system'
    }]);

    toast({ title: 'Berhasil', description: 'Barang berhasil dipindahkan ke Lini 2' });
    setIsDialogOpen(false);
    setFormData({
      item_id: '',
      lokasi_asal: 'Lini 1',
      lokasi: 'Lini 2',
      tanggal_masuk: new Date().toISOString().split('T')[0],
      berat_kg: '',
      volume_m3: '',
      hari_di_lini1: '',
      document_reference: '',
      notes: ''
    });
    fetchStockMovements();
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const movement = stockMovements.find(m => m.id === id);
    
    const updateData: any = { status: newStatus };
    
    if (newStatus === 'Dipindahkan' || newStatus === 'Diambil') {
      updateData.tanggal_keluar = new Date().toISOString().split('T')[0];
    }

    const { error } = await supabase
      .from('stock_movements')
      .update(updateData)
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }

    // Log activity
    await supabase.from('activity_logs').insert([{
      entity_table: 'stock_movements',
      record_id: id,
      action_type: 'UPDATE',
      old_data: movement,
      new_data: { ...movement, ...updateData },
      changed_by: 'system'
    }]);

    toast({ title: 'Berhasil', description: `Status diubah menjadi ${newStatus}` });
    fetchStockMovements();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Aktif':
        return <Badge className="bg-green-500">Aktif</Badge>;
      case 'Dipindahkan':
        return <Badge className="bg-blue-500">Dipindahkan</Badge>;
      case 'Diambil':
        return <Badge className="bg-gray-500">Diambil</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const stats = {
    lini1Aktif: stockMovements.filter(m => m.lokasi === 'Lini 1' && m.status === 'Aktif').length,
    lini2Aktif: stockMovements.filter(m => m.lokasi === 'Lini 2' && m.status === 'Aktif').length,
    totalBerat: stockMovements
      .filter(m => m.status === 'Aktif')
      .reduce((sum, m) => sum + (m.berat_kg || 0), 0),
    totalVolume: stockMovements
      .filter(m => m.status === 'Aktif')
      .reduce((sum, m) => sum + (m.volume_m3 || 0), 0)
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Manajemen Barang Gudang</h1>
            <p className="text-gray-600 mt-1">Kelola barang di Lini 1 & Lini 2</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Tambah Barang
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Tambah Barang ke Gudang</DialogTitle>
                <DialogDescription>Input barang baru ke Lini 1 atau Lini 2</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Item *</Label>
                    <Select value={formData.item_id} onValueChange={(v) => setFormData({...formData, item_id: v})}>
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
                    <Label>Asal Barang *</Label>
                    <Select value={formData.lokasi_asal} onValueChange={(v) => setFormData({...formData, lokasi_asal: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Lini 1">Lini 1</SelectItem>
                        <SelectItem value="Lini 2">Lini 2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Pindah ke Lokasi *</Label>
                    <Select value={formData.lokasi} onValueChange={(v) => setFormData({...formData, lokasi: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Lini 1">Lini 1</SelectItem>
                        <SelectItem value="Lini 2">Lini 2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Lama Hari di Lini 1</Label>
                    <Input
                      type="number"
                      value={formData.hari_di_lini1}
                      onChange={(e) => setFormData({...formData, hari_di_lini1: e.target.value})}
                      placeholder="Jumlah hari"
                    />
                  </div>
                  <div>
                    <Label>Tanggal Masuk *</Label>
                    <Input
                      type="date"
                      value={formData.tanggal_masuk}
                      onChange={(e) => setFormData({...formData, tanggal_masuk: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Berat (kg)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.berat_kg}
                      onChange={(e) => setFormData({...formData, berat_kg: e.target.value})}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label>Volume (m³)</Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={formData.volume_m3}
                      onChange={(e) => setFormData({...formData, volume_m3: e.target.value})}
                      placeholder="0.000"
                    />
                  </div>
                  <div>
                    <Label>No. Dokumen</Label>
                    <Input
                      value={formData.document_reference}
                      onChange={(e) => setFormData({...formData, document_reference: e.target.value})}
                      placeholder="PO/DO/Invoice"
                    />
                  </div>
                </div>
                <div>
                  <Label>Catatan</Label>
                  <Input
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Catatan tambahan"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Batal
                  </Button>
                  <Button type="submit">Simpan</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Lini 1 Aktif</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.lini1Aktif}</div>
              <p className="text-xs text-gray-500">barang</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Lini 2 Aktif</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.lini2Aktif}</div>
              <p className="text-xs text-gray-500">barang</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Berat</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalBerat.toFixed(2)}</div>
              <p className="text-xs text-gray-500">kg</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Volume</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalVolume.toFixed(3)}</div>
              <p className="text-xs text-gray-500">m³</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filter Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label>Lokasi</Label>
                <Select value={selectedLine} onValueChange={(v: any) => setSelectedLine(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Lokasi</SelectItem>
                    <SelectItem value="Lini 1">Lini 1</SelectItem>
                    <SelectItem value="Lini 2">Lini 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label>Status</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="Aktif">Aktif</SelectItem>
                    <SelectItem value="Dipindahkan">Dipindahkan</SelectItem>
                    <SelectItem value="Diambil">Diambil</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card>
          <CardHeader>
            <CardTitle>Daftar Barang ({filteredMovements.length})</CardTitle>
            <CardDescription>Data barang di gudang Lini 1 & Lini 2</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Nama Barang</TableHead>
                  <TableHead>Asal</TableHead>
                  <TableHead>Lokasi</TableHead>
                  <TableHead>Tgl Masuk</TableHead>
                  <TableHead>Tgl Keluar</TableHead>
                  <TableHead>Hari Simpan</TableHead>
                  <TableHead>Hari di Lini 1</TableHead>
                  <TableHead>Berat (kg)</TableHead>
                  <TableHead>Volume (m³)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMovements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8 text-gray-500">
                      <Package className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      Belum ada data barang
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMovements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell className="font-mono">{movement.items?.sku}</TableCell>
                      <TableCell>{movement.items?.name}</TableCell>
                      <TableCell>
                        {movement.lokasi_asal ? (
                          <Badge variant="outline">{movement.lokasi_asal}</Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={movement.lokasi === 'Lini 1' ? 'default' : 'secondary'}>
                          {movement.lokasi}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {movement.tanggal_masuk ? new Date(movement.tanggal_masuk).toLocaleDateString('id-ID') : '-'}
                      </TableCell>
                      <TableCell>
                        {movement.tanggal_keluar ? new Date(movement.tanggal_keluar).toLocaleDateString('id-ID') : '-'}
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">{movement.hari_simpan || 0}</span> hari
                      </TableCell>
                      <TableCell>
                        {movement.hari_di_lini1 ? (
                          <span className="font-semibold text-blue-600">{movement.hari_di_lini1} hari</span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>{movement.berat_kg?.toFixed(2) || '-'}</TableCell>
                      <TableCell>{movement.volume_m3?.toFixed(3) || '-'}</TableCell>
                      <TableCell>{getStatusBadge(movement.status)}</TableCell>
                      <TableCell>
                        {movement.status === 'Aktif' && (
                          <Select onValueChange={(v) => handleStatusChange(movement.id, v)}>
                            <SelectTrigger className="w-32">
                              <SelectValue placeholder="Ubah status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Dipindahkan">Pindahkan</SelectItem>
                              <SelectItem value="Diambil">Ambil</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}