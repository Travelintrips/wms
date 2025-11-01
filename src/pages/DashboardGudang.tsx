import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Package, TruckIcon, CheckCircle, DollarSign, RefreshCw, Search, Filter, Warehouse } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface DashboardStats {
  totalAktif: number;
  totalDipindahkan: number;
  totalDiambil: number;
  totalBiayaHariIni: number;
}

interface ChartData {
  lokasi: string;
  rata_hari: number;
}

interface CostChartData {
  lokasi: string;
  total_biaya: number;
}

interface OccupancyData {
  name: string;
  value: number;
  percentage: number;
  [key: string]: string | number;
}

interface SearchResult {
  id: string;
  item_id: string;
  lokasi: string;
  tanggal_masuk: string;
  tanggal_keluar?: string;
  status: string;
  hari_simpan?: number;
  reference_no?: string;
  items?: {
    name: string;
    sku: string;
  };
}

interface Filters {
  lokasi: string;
  status: string;
  tanggalMasukFrom: string;
  tanggalMasukTo: string;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

export default function DashboardGudang() {
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats>({
    totalAktif: 0,
    totalDipindahkan: 0,
    totalDiambil: 0,
    totalBiayaHariIni: 0
  });
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [costChartData, setCostChartData] = useState<CostChartData[]>([]);
  const [occupancyData, setOccupancyData] = useState<OccupancyData[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    lokasi: 'all',
    status: 'all',
    tanggalMasukFrom: '',
    tanggalMasukTo: ''
  });

  useEffect(() => {
    fetchAllData();
    
    // Auto-update setiap 10 menit (600000 ms)
    const interval = setInterval(() => {
      fetchAllData();
    }, 600000);

    return () => clearInterval(interval);
  }, [filters]);

  useEffect(() => {
    if (searchTerm.trim()) {
      handleSearch();
    } else {
      setSearchResults([]);
    }
  }, [searchTerm, filters]);

  const fetchAllData = () => {
    fetchDashboardStats();
    fetchChartData();
    fetchCostChartData();
    fetchOccupancyData();
    setLastUpdate(new Date());
  };

  const fetchOccupancyData = async () => {
    try {
      // Get total capacity from warehouses
      const { data: warehousesData } = await supabase
        .from('warehouses')
        .select('capacity');

      // Parse capacity (assuming format like "10000 m²")
      const totalCapacity = warehousesData?.reduce((sum, w) => {
        const capacityNum = parseInt(w.capacity?.replace(/[^0-9]/g, '') || '0');
        return sum + capacityNum;
      }, 0) || 10000;

      // Get total lots and occupied lots
      const { data: lotsData } = await supabase
        .from('lots')
        .select('capacity, current_load');

      const totalLotCapacity = lotsData?.reduce((sum, lot) => sum + (lot.capacity || 0), 0) || 1000;
      const totalOccupied = lotsData?.reduce((sum, lot) => sum + (lot.current_load || 0), 0) || 0;

      const occupiedPercentage = (totalOccupied / totalLotCapacity) * 100;
      const availablePercentage = 100 - occupiedPercentage;

      setOccupancyData([
        {
          name: 'Terpakai',
          value: totalOccupied,
          percentage: occupiedPercentage
        },
        {
          name: 'Tersedia',
          value: totalLotCapacity - totalOccupied,
          percentage: availablePercentage
        }
      ]);
    } catch (error: any) {
      console.error('Occupancy error:', error);
    }
  };

  const fetchCostChartData = async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: movementsData, error } = await supabase
        .from('stock_movements')
        .select('id, lokasi, total_biaya')
        .gte('tanggal_masuk', thirtyDaysAgo.toISOString().split('T')[0]);

      if (error) throw error;

      const groupedCosts: { [key: string]: number } = {};
      
      movementsData?.forEach(item => {
        if (!groupedCosts[item.lokasi]) {
          groupedCosts[item.lokasi] = 0;
        }
        groupedCosts[item.lokasi] += item.total_biaya || 0;
      });

      const costResult: CostChartData[] = Object.keys(groupedCosts).map(lokasi => ({
        lokasi,
        total_biaya: groupedCosts[lokasi]
      }));

      setCostChartData(costResult);
    } catch (error: any) {
      console.error('Cost chart error:', error);
    }
  };

  const fetchChartData = async () => {
    try {
      let query = supabase
        .from('stock_movements')
        .select('lokasi, tanggal_masuk')
        .neq('status', 'Diambil');

      if (filters.lokasi !== 'all') {
        query = query.eq('lokasi', filters.lokasi);
      }

      if (filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters.tanggalMasukFrom) {
        query = query.gte('tanggal_masuk', filters.tanggalMasukFrom);
      }

      if (filters.tanggalMasukTo) {
        query = query.lte('tanggal_masuk', filters.tanggalMasukTo);
      }

      const { data, error } = await query;

      if (error) throw error;

      const groupedData: { [key: string]: number[] } = {};
      
      data?.forEach(item => {
        if (!groupedData[item.lokasi]) {
          groupedData[item.lokasi] = [];
        }
        const tanggalMasuk = new Date(item.tanggal_masuk);
        const today = new Date();
        const diffTime = today.getTime() - tanggalMasuk.getTime();
        const hariSimpan = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
        groupedData[item.lokasi].push(hariSimpan);
      });

      const chartResult: ChartData[] = Object.keys(groupedData).map(lokasi => ({
        lokasi,
        rata_hari: groupedData[lokasi].reduce((a, b) => a + b, 0) / groupedData[lokasi].length
      }));

      setChartData(chartResult);
    } catch (error: any) {
      console.error('Chart error:', error);
    }
  };

  const handleSearch = async () => {
    setIsSearching(true);
    try {
      let query = supabase
        .from('stock_movements')
        .select(`
          id,
          item_id,
          lokasi,
          tanggal_masuk,
          tanggal_keluar,
          status,
          reference_no,
          items (name, sku)
        `)
        .or(`reference_no.ilike.%${searchTerm}%,items.name.ilike.%${searchTerm}%`);

      if (filters.lokasi !== 'all') {
        query = query.eq('lokasi', filters.lokasi);
      }

      if (filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters.tanggalMasukFrom) {
        query = query.gte('tanggal_masuk', filters.tanggalMasukFrom);
      }

      if (filters.tanggalMasukTo) {
        query = query.lte('tanggal_masuk', filters.tanggalMasukTo);
      }

      const { data, error } = await query;

      if (error) throw error;

      const resultsWithDays = (data || []).map(m => {
        const tanggalMasuk = new Date(m.tanggal_masuk);
        const today = new Date();
        const diffTime = today.getTime() - tanggalMasuk.getTime();
        const hariSimpan = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
        
        return {
          ...m,
          hari_simpan: hariSimpan,
          items: Array.isArray(m.items) ? m.items[0] : m.items
        };
      });

      setSearchResults(resultsWithDays);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal mencari data',
        variant: 'destructive'
      });
    }
    setIsSearching(false);
  };

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      let aktifQuery = supabase
        .from('stock_movements')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Aktif');

      let dipindahkanQuery = supabase
        .from('stock_movements')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Dipindahkan');

      let diambilQuery = supabase
        .from('stock_movements')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Diambil');

      if (filters.lokasi !== 'all') {
        aktifQuery = aktifQuery.eq('lokasi', filters.lokasi);
        dipindahkanQuery = dipindahkanQuery.eq('lokasi', filters.lokasi);
        diambilQuery = diambilQuery.eq('lokasi', filters.lokasi);
      }

      if (filters.tanggalMasukFrom) {
        aktifQuery = aktifQuery.gte('tanggal_masuk', filters.tanggalMasukFrom);
        dipindahkanQuery = dipindahkanQuery.gte('tanggal_masuk', filters.tanggalMasukFrom);
        diambilQuery = diambilQuery.gte('tanggal_masuk', filters.tanggalMasukFrom);
      }

      if (filters.tanggalMasukTo) {
        aktifQuery = aktifQuery.lte('tanggal_masuk', filters.tanggalMasukTo);
        dipindahkanQuery = dipindahkanQuery.lte('tanggal_masuk', filters.tanggalMasukTo);
        diambilQuery = diambilQuery.lte('tanggal_masuk', filters.tanggalMasukTo);
      }

      const { count: aktifCount } = await aktifQuery;
      const { count: dipindahkanCount } = await dipindahkanQuery;
      const { count: diambilCount } = await diambilQuery;

      const today = new Date().toISOString().split('T')[0];
      const { data: costsData } = await supabase
        .from('storage_costs')
        .select('total_biaya')
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`);

      const totalBiaya = costsData?.reduce((sum, item) => sum + (item.total_biaya || 0), 0) || 0;

      setStats({
        totalAktif: aktifCount || 0,
        totalDipindahkan: dipindahkanCount || 0,
        totalDiambil: diambilCount || 0,
        totalBiayaHariIni: totalBiaya
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal memuat data dashboard',
        variant: 'destructive'
      });
    }
    setLoading(false);
  };

  const resetFilters = () => {
    setFilters({
      lokasi: 'all',
      status: 'all',
      tanggalMasukFrom: '',
      tanggalMasukTo: ''
    });
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

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Dashboard Gudang</h1>
            <p className="text-sm md:text-base text-gray-600 mt-1">
              Statistik dan ringkasan data pergudangan
              <span className="ml-2 text-xs text-gray-500">
                • Update terakhir: {lastUpdate.toLocaleTimeString('id-ID')}
              </span>
            </p>
          </div>
          <Button onClick={fetchAllData} disabled={loading} variant="outline" className="w-full sm:w-auto">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Filter Section */}
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                <CardTitle className="text-lg md:text-xl">Filter Data</CardTitle>
              </div>
              <Button variant="outline" size="sm" onClick={resetFilters} className="w-full sm:w-auto">
                Reset Filter
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm">Lokasi</Label>
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
                <Label className="text-sm">Status</Label>
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
                <Label className="text-sm">Tanggal Masuk Dari</Label>
                <Input 
                  type="date" 
                  value={filters.tanggalMasukFrom}
                  onChange={(e) => setFilters({...filters, tanggalMasukFrom: e.target.value})}
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-sm">Tanggal Masuk Sampai</Label>
                <Input 
                  type="date" 
                  value={filters.tanggalMasukTo}
                  onChange={(e) => setFilters({...filters, tanggalMasukTo: e.target.value})}
                  className="text-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {/* Total Barang Aktif */}
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs md:text-sm font-medium text-green-700">
                  Total Barang Aktif
                </CardTitle>
                <Package className="h-6 w-6 md:h-8 md:w-8 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl md:text-3xl font-bold text-green-900">{stats.totalAktif}</div>
              <p className="text-xs text-green-600 mt-1">Barang tersimpan di gudang</p>
            </CardContent>
          </Card>

          {/* Total Barang Dipindahkan */}
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs md:text-sm font-medium text-blue-700">
                  Total Barang Dipindahkan
                </CardTitle>
                <TruckIcon className="h-6 w-6 md:h-8 md:w-8 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl md:text-3xl font-bold text-blue-900">{stats.totalDipindahkan}</div>
              <p className="text-xs text-blue-600 mt-1">Barang di Lini 2</p>
            </CardContent>
          </Card>

          {/* Total Barang Diambil */}
          <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs md:text-sm font-medium text-gray-700">
                  Total Barang Diambil
                </CardTitle>
                <CheckCircle className="h-6 w-6 md:h-8 md:w-8 text-gray-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl md:text-3xl font-bold text-gray-900">{stats.totalDiambil}</div>
              <p className="text-xs text-gray-600 mt-1">Diambil oleh supplier</p>
            </CardContent>
          </Card>

          {/* Total Biaya Hari Ini */}
          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs md:text-sm font-medium text-yellow-700">
                  Total Biaya Hari Ini
                </CardTitle>
                <DollarSign className="h-6 w-6 md:h-8 md:w-8 text-yellow-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-3xl font-bold text-yellow-900">
                Rp {stats.totalBiayaHariIni.toLocaleString('id-ID')}
              </div>
              <p className="text-xs text-yellow-600 mt-1">Biaya penyimpanan hari ini</p>
            </CardContent>
          </Card>
        </div>

        {/* Occupancy Chart */}
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Warehouse className="h-5 w-5" />
              <CardTitle className="text-lg md:text-xl">Kapasitas Gudang (Occupancy)</CardTitle>
            </div>
            <CardDescription className="text-sm">Persentase kapasitas gudang yang terpakai</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-center justify-center gap-8">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={occupancyData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }: any) => `${name}: ${(percentage as number).toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {occupancyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => value.toLocaleString()} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                {occupancyData.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <div>
                      <p className="font-semibold text-sm">{item.name}</p>
                      <p className="text-xs text-gray-600">
                        {item.value.toLocaleString()} unit ({item.percentage.toFixed(1)}%)
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chart: Lama Penyimpanan */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">Grafik Lama Penyimpanan Rata-Rata per Lini</CardTitle>
            <CardDescription className="text-sm">Rata-rata hari penyimpanan barang di setiap lini</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="lokasi" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value: number) => [`${value.toFixed(1)} hari`, 'Rata-rata']}
                  labelFormatter={(label) => `Lokasi: ${label}`}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar 
                  dataKey="rata_hari" 
                  fill="#3b82f6" 
                  name="Rata-rata Hari Simpan"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Search Section */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">Pencarian Barang</CardTitle>
            <CardDescription className="text-sm">Cari berdasarkan nomor dokumen, referensi, atau nama barang</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="🔍 Cari berdasarkan No Dokumen / No Referensi / Nama Barang"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 text-sm"
              />
            </div>

            {searchTerm && (
              <div className="overflow-x-auto">
                {isSearching ? (
                  <div className="text-center py-8 text-gray-500">
                    <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin text-gray-300" />
                    <p className="text-sm">Mencari...</p>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">❌ Tidak ditemukan data dengan nomor tersebut.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Nama Barang</TableHead>
                        <TableHead className="text-xs">SKU</TableHead>
                        <TableHead className="text-xs">No Referensi</TableHead>
                        <TableHead className="text-xs">Lokasi</TableHead>
                        <TableHead className="text-xs">Tanggal Masuk</TableHead>
                        <TableHead className="text-xs">Lama Simpan</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {searchResults.map((result) => (
                        <TableRow key={result.id}>
                          <TableCell className="font-medium text-xs md:text-sm">{result.items?.name || '-'}</TableCell>
                          <TableCell className="font-mono text-xs">{result.items?.sku || '-'}</TableCell>
                          <TableCell className="font-mono text-xs">{result.reference_no || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={result.lokasi === 'Lini 1' ? 'default' : 'secondary'} className="text-xs">
                              {result.lokasi}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            {result.tanggal_masuk ? new Date(result.tanggal_masuk).toLocaleDateString('id-ID') : '-'}
                          </TableCell>
                          <TableCell className="text-xs">
                            <span className="font-semibold text-blue-600">{result.hari_simpan || 0}</span> hari
                          </TableCell>
                          <TableCell>{getStatusBadge(result.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chart: Total Biaya per Lini */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">Grafik Total Biaya per Lini (30 Hari Terakhir)</CardTitle>
            <CardDescription className="text-sm">Total biaya penyimpanan untuk setiap lini dalam 30 hari terakhir</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={costChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="lokasi" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value: number) => [`Rp ${value.toLocaleString('id-ID')}`, 'Total Biaya']}
                  labelFormatter={(label) => `Lokasi: ${label}`}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar 
                  dataKey="total_biaya" 
                  fill="#10b981" 
                  name="Total Biaya"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}