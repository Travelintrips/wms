import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { RefreshCw, ArrowRight, Package as PackageIcon, Calculator, Truck, Plus, Download, Filter } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
  tanggal_masuk: string;
  tanggal_keluar?: string;
  tanggal_pindah?: string;
  status: string;
  berat_kg?: number;
  volume_m3?: number;
  hari_simpan?: number;
  total_biaya?: number;
  items?: Item;
}

export default function BarangLini1() {
  const { toast } = useToast();
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [filteredMovements, setFilteredMovements] = useState<StockMovement[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Filter states
  const [filters, setFilters] = useState({
    lokasi: 'all',
    status: 'all',
    tanggalMasukFrom: '',
    tanggalMasukTo: '',
    tanggalKeluarFrom: '',
    tanggalKeluarTo: ''
  });

  // Form states
  const [formData, setFormData] = useState({
    item_id: '',
    berat_kg: '',
    tanggal_masuk: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchStockMovements();
    fetchItems();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [stockMovements, filters]);

  const applyFilters = () => {
    let filtered = [...stockMovements];

    if (filters.lokasi !== 'all') {
      filtered = filtered.filter(m => m.lokasi === filters.lokasi);
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter(m => m.status === filters.status);
    }

    if (filters.tanggalMasukFrom) {
      filtered = filtered.filter(m => m.tanggal_masuk >= filters.tanggalMasukFrom);
    }

    if (filters.tanggalMasukTo) {
      filtered = filtered.filter(m => m.tanggal_masuk <= filters.tanggalMasukTo);
    }

    if (filters.tanggalKeluarFrom) {
      filtered = filtered.filter(m => m.tanggal_keluar && m.tanggal_keluar >= filters.tanggalKeluarFrom);
    }

    if (filters.tanggalKeluarTo) {
      filtered = filtered.filter(m => m.tanggal_keluar && m.tanggal_keluar <= filters.tanggalKeluarTo);
    }

    setFilteredMovements(filtered);
  };

  const resetFilters = () => {
    setFilters({
      lokasi: 'all',
      status: 'all',
      tanggalMasukFrom: '',
      tanggalMasukTo: '',
      tanggalKeluarFrom: '',
      tanggalKeluarTo: ''
    });
  };

  const exportToCSV = () => {
    const headers = ['Nama Barang', 'SKU', 'Tanggal Masuk', 'Tanggal Keluar', 'Lama Simpan (hari)', 'Berat (kg)', 'Volume (m³)', 'Lokasi', 'Status', 'Total Biaya (Rp)'];
    
    const rows = filteredMovements.map(m => [
      m.items?.name || '',
      m.items?.sku || '',
      m.tanggal_masuk ? new Date(m.tanggal_masuk).toLocaleDateString('id-ID') : '',
      m.tanggal_keluar ? new Date(m.tanggal_keluar).toLocaleDateString('id-ID') : '',
      m.hari_simpan || 0,
      m.berat_kg?.toFixed(2) || 0,
      m.volume_m3?.toFixed(3) || 0,
      m.lokasi,
      m.status,
      m.total_biaya || 0
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `laporan-barang-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: 'Berhasil', description: 'Laporan berhasil diexport ke CSV' });
  };

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('name');
    
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else if (data) {
      setItems(data);
    }
  };

  const fetchStockMovements = async () => {
    setLoading(true);
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
      .in('lokasi', ['Lini 1', 'Lini 2'])
      .in('status', ['Aktif', 'Dipindahkan', 'Diambil'])
      .order('tanggal_masuk', { ascending: false });
    
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      const movementsWithDays = (data || []).map(m => {
        const tanggalMasuk = new Date(m.tanggal_masuk);
        const today = new Date();
        const diffTime = today.getTime() - tanggalMasuk.getTime();
        const hariSimpan = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
        
        return {
          ...m,
          hari_simpan: hariSimpan
        };
      });
      setStockMovements(movementsWithDays);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.item_id || !formData.berat_kg) {
      toast({ title: 'Error', description: 'Item dan berat wajib diisi', variant: 'destructive' });
      return;
    }

    setLoading(true);

    try {
      const selectedItem = items.find(i => i.id === formData.item_id);
      const volumeM3 = selectedItem?.volume_m3 || 0;

      // Insert stock movement
      const { data: movement, error: insertError } = await supabase
        .from('stock_movements')
        .insert({
          item_id: formData.item_id,
          lokasi: 'Lini 1',
          tanggal_masuk: formData.tanggal_masuk,
          status: 'Aktif',
          berat_kg: parseFloat(formData.berat_kg),
          volume_m3: volumeM3,
          movement_type: 'in',
          quantity: 1
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Calculate storage cost
      const { error: calcError } = await supabase.functions.invoke('supabase-functions-calc_storage_cost', {
        body: {
          stock_movement_id: movement.id
        }
      });

      if (calcError) {
        console.error('Calc error:', calcError);
      }

      // Log activity
      await supabase.from('activity_logs').insert({
        entity_table: 'stock_movements',
        record_id: movement.id,
        action_type: 'INSERT',
        new_data: {
          item_id: formData.item_id,
          lokasi: 'Lini 1',
          status: 'Aktif',
          message: `Barang ${selectedItem?.name} masuk ke Lini 1`
        },
        changed_by: 'system'
      });

      toast({ title: 'Berhasil', description: 'Barang berhasil ditambahkan ke Lini 1' });
      setIsDialogOpen(false);
      setFormData({
        item_id: '',
        berat_kg: '',
        tanggal_masuk: new Date().toISOString().split('T')[0]
      });
      fetchStockMovements();
    } catch (error: any) {
      toast({ 
        title: 'Error', 
        description: error.message || 'Gagal menambahkan barang', 
        variant: 'destructive' 
      });
    }
    setLoading(false);
  };

  const handleItemChange = (itemId: string) => {
    setFormData({ ...formData, item_id: itemId });
    const selectedItem = items.find(i => i.id === itemId);
    if (selectedItem?.actual_weight_kg) {
      setFormData(prev => ({ ...prev, item_id: itemId, berat_kg: selectedItem.actual_weight_kg?.toString() || '' }));
    }
  };

  const handleHitungUlang = async (movementId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('supabase-functions-calc_storage_cost', {
        body: {
          stock_movement_id: movementId
        }
      });

      if (error) throw error;

      toast({ 
        title: 'Berhasil', 
        description: `Biaya dihitung: Rp ${data.data.total_biaya.toLocaleString('id-ID')}` 
      });
      
      fetchStockMovements();
    } catch (error: any) {
      toast({ 
        title: 'Error', 
        description: error.message || 'Gagal menghitung biaya', 
        variant: 'destructive' 
      });
    }
    setLoading(false);
  };

  const handlePindahLini2 = async (movementId: string, itemName: string) => {
    setLoading(true);
    try {
      const tanggalPindah = new Date().toISOString().split('T')[0];
      
      const { error: updateError } = await supabase
        .from('stock_movements')
        .update({
          lokasi: 'Lini 2',
          status: 'Dipindahkan',
          tanggal_pindah: tanggalPindah
        })
        .eq('id', movementId);

      if (updateError) throw updateError;

      const { error: calcError } = await supabase.functions.invoke('supabase-functions-calc_storage_cost', {
        body: {
          stock_movement_id: movementId
        }
      });

      if (calcError) console.error('Calc error:', calcError);

      await supabase.from('activity_logs').insert({
        entity_table: 'stock_movements',
        record_id: movementId,
        action_type: 'TRANSFER_TO_LINI2',
        new_data: {
          lokasi: 'Lini 2',
          status: 'Dipindahkan',
          tanggal_pindah: tanggalPindah,
          message: `Barang ${itemName} dipindahkan ke Lini 2 pada ${new Date(tanggalPindah).toLocaleDateString('id-ID')}`
        },
        changed_by: 'system'
      });

      toast({ 
        title: '📦 Barang Dipindahkan', 
        description: `${itemName} telah dipindahkan ke Lini 2 pada ${new Date(tanggalPindah).toLocaleDateString('id-ID')}`,
        duration: 5000
      });
      
      fetchStockMovements();
    } catch (error: any) {
      toast({ 
        title: 'Error', 
        description: error.message || 'Gagal memindahkan barang', 
        variant: 'destructive' 
      });
    }
    setLoading(false);
  };

  const handleBarangDiambil = async (movementId: string, itemName: string) => {
    setLoading(true);
    try {
      const tanggalKeluar = new Date().toISOString().split('T')[0];
      
      const { error: updateError } = await supabase
        .from('stock_movements')
        .update({
          status: 'Diambil',
          tanggal_keluar: tanggalKeluar
        })
        .eq('id', movementId);

      if (updateError) throw updateError;

      await supabase.from('activity_logs').insert({
        entity_table: 'stock_movements',
        record_id: movementId,
        action_type: 'PICKED_BY_SUPPLIER',
        new_data: {
          status: 'Diambil',
          tanggal_keluar: tanggalKeluar,
          message: `Barang ${itemName} diambil oleh supplier pada ${new Date(tanggalKeluar).toLocaleDateString('id-ID')}`
        },
        changed_by: 'system'
      });

      toast({ 
        title: '🚚 Barang Diambil Supplier', 
        description: `${itemName} telah diambil oleh supplier pada ${new Date(tanggalKeluar).toLocaleDateString('id-ID')}`,
        duration: 5000
      });
      
      fetchStockMovements();
    } catch (error: any) {
      toast({ 
        title: 'Error', 
        description: error.message || 'Gagal mengupdate status', 
        variant: 'destructive' 
      });
    }
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Aktif':
        return <Badge className="bg-green-500 hover:bg-green-600">Aktif</Badge>;
      case 'Dipindahkan':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Dipindahkan</Badge>;
      case 'Diambil':
        return <Badge className="bg-gray-400 hover:bg-gray-500">Diambil</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const stats = {
    totalBarang: filteredMovements.filter(m => m.status === 'Aktif').length,
    totalBerat: filteredMovements
      .filter(m => m.status === 'Aktif')
      .reduce((sum, m) => sum + (m.berat_kg || 0), 0),
    totalBiaya: filteredMovements
      .filter(m => m.status === 'Aktif')
      .reduce((sum, m) => sum + (m.total_biaya || 0), 0)
  };

  const selectedItemData = items.find(i => i.id === formData.item_id);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Barang di Lini 1</h1>
            <p className="text-gray-600 mt-1">Kelola barang yang tersimpan di Lini 1</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Barang Masuk
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Tambah Barang Masuk</DialogTitle>
                  <DialogDescription>Input barang baru ke Lini 1</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label>Nama Barang *</Label>
                      <Select value={formData.item_id} onValueChange={handleItemChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih barang" />
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
                    
                    {selectedItemData && (
                      <div className="col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-600">SKU:</span>
                            <span className="ml-2 font-mono font-semibold">{selectedItemData.sku}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Volume:</span>
                            <span className="ml-2 font-semibold">{selectedItemData.volume_m3?.toFixed(3) || '0.000'} m³</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <Label>Berat (kg) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.berat_kg}
                        onChange={(e) => setFormData({...formData, berat_kg: e.target.value})}
                        placeholder="0.00"
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
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Batal
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? 'Menyimpan...' : 'Simpan'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            <Button onClick={fetchStockMovements} disabled={loading} variant="outline">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filter Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                <CardTitle>Filter & Export</CardTitle>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  Reset Filter
                </Button>
                <Button variant="default" size="sm" onClick={exportToCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <Label>Lokasi</Label>
                <Select value={filters.lokasi} onValueChange={(v) => setFilters({...filters, lokasi: v})}>
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
              <div>
                <Label>Status</Label>
                <Select value={filters.status} onValueChange={(v) => setFilters({...filters, status: v})}>
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
              <div>
                <Label>Tanggal Masuk Dari</Label>
                <Input 
                  type="date" 
                  value={filters.tanggalMasukFrom}
                  onChange={(e) => setFilters({...filters, tanggalMasukFrom: e.target.value})}
                />
              </div>
              <div>
                <Label>Tanggal Masuk Sampai</Label>
                <Input 
                  type="date" 
                  value={filters.tanggalMasukTo}
                  onChange={(e) => setFilters({...filters, tanggalMasukTo: e.target.value})}
                />
              </div>
              <div>
                <Label>Tanggal Keluar Dari</Label>
                <Input 
                  type="date" 
                  value={filters.tanggalKeluarFrom}
                  onChange={(e) => setFilters({...filters, tanggalKeluarFrom: e.target.value})}
                />
              </div>
              <div>
                <Label>Tanggal Keluar Sampai</Label>
                <Input 
                  type="date" 
                  value={filters.tanggalKeluarTo}
                  onChange={(e) => setFilters({...filters, tanggalKeluarTo: e.target.value})}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Barang Aktif</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalBarang}</div>
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
              <CardTitle className="text-sm font-medium text-gray-600">Total Biaya</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Rp {stats.totalBiaya.toLocaleString('id-ID')}</div>
              <p className="text-xs text-gray-500">biaya simpan</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Daftar Barang ({filteredMovements.length})</CardTitle>
            <CardDescription>Data barang yang tersimpan di gudang</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Barang</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Tanggal Masuk</TableHead>
                  <TableHead>Lama Simpan</TableHead>
                  <TableHead>Berat (kg)</TableHead>
                  <TableHead>Volume (m³)</TableHead>
                  <TableHead>Lokasi</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total Biaya</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMovements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                      <PackageIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      Tidak ada data sesuai filter
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMovements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell className="font-medium">{movement.items?.name}</TableCell>
                      <TableCell className="font-mono text-sm">{movement.items?.sku}</TableCell>
                      <TableCell>
                        {movement.tanggal_masuk ? new Date(movement.tanggal_masuk).toLocaleDateString('id-ID') : '-'}
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-blue-600">{movement.hari_simpan || 0}</span> hari
                      </TableCell>
                      <TableCell>{movement.berat_kg?.toFixed(2) || '-'}</TableCell>
                      <TableCell>{movement.volume_m3?.toFixed(3) || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={movement.lokasi === 'Lini 1' ? 'default' : 'secondary'}>{movement.lokasi}</Badge>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(movement.status)}
                      </TableCell>
                      <TableCell className="font-semibold">
                        Rp {(movement.total_biaya || 0).toLocaleString('id-ID')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleHitungUlang(movement.id)}
                            disabled={loading}
                            title="Hitung Ulang Hari Sewa"
                          >
                            <Calculator className="h-4 w-4" />
                          </Button>
                          
                          {movement.status === 'Aktif' && (
                            <>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={loading}
                                    title="Pindah ke Lini 2"
                                  >
                                    <ArrowRight className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Pindah ke Lini 2?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Barang <strong>{movement.items?.name}</strong> akan dipindahkan ke Lini 2 dengan tarif Rp 2.500/kg.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Batal</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handlePindahLini2(movement.id, movement.items?.name || '')}>
                                      Pindahkan
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}

                          {movement.status !== 'Diambil' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={loading}
                                  title="Barang Diambil Supplier"
                                >
                                  <Truck className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Barang Diambil Supplier?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Barang <strong>{movement.items?.name}</strong> akan ditandai sebagai diambil oleh supplier. Perhitungan biaya akan dihentikan.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Batal</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleBarangDiambil(movement.id, movement.items?.name || '')}>
                                    Konfirmasi
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
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