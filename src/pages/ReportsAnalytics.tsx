import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, Package, Warehouse, TrendingUp, FileText, Filter } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import * as XLSX from 'xlsx';

interface DashboardStats {
  totalItems: number;
  totalWarehouses: number;
  lotsOccupied: number;
  lotsEmpty: number;
  inboundToday: number;
  outboundToday: number;
}

interface StockByWarehouse {
  warehouse: string;
  quantity: number;
}

interface MovementData {
  date: string;
  inbound: number;
  outbound: number;
}

interface CeisaDoc {
  id: string;
  document_type: string;
  document_number: string;
  status: string;
  created_at: string;
}

interface StockReport {
  warehouse: string;
  category: string;
  item_name: string;
  sku: string;
  batch_code: string;
  quantity: number;
  lot_code: string;
  rack_code: string;
}

export default function ReportsAnalytics() {
  const { toast } = useToast();
  
  const [stats, setStats] = useState<DashboardStats>({
    totalItems: 0,
    totalWarehouses: 0,
    lotsOccupied: 0,
    lotsEmpty: 0,
    inboundToday: 0,
    outboundToday: 0
  });
  
  const [stockByWarehouse, setStockByWarehouse] = useState<StockByWarehouse[]>([]);
  const [movementData, setMovementData] = useState<MovementData[]>([]);
  const [ceisaDocs, setCeisaDocs] = useState<CeisaDoc[]>([]);
  const [stockReport, setStockReport] = useState<StockReport[]>([]);
  
  // Filters
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBatch, setSelectedBatch] = useState<string>('all');

  useEffect(() => {
    fetchDashboardData();
    fetchWarehouses();
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchStockReport();
  }, [selectedWarehouse, selectedCategory, selectedBatch]);

  const fetchWarehouses = async () => {
    const { data } = await supabase.from('warehouses').select('*').order('name');
    if (data) setWarehouses(data);
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('name');
    if (data) setCategories(data);
  };

  const fetchDashboardData = async () => {
    // Total items
    const { count: itemCount } = await supabase
      .from('items')
      .select('*', { count: 'exact', head: true });

    // Total warehouses
    const { count: warehouseCount } = await supabase
      .from('warehouses')
      .select('*', { count: 'exact', head: true });

    // Lots occupied vs empty
    const { data: lots } = await supabase.from('lots').select('current_load, capacity');
    const occupied = lots?.filter(l => l.current_load > 0).length || 0;
    const empty = lots?.filter(l => l.current_load === 0).length || 0;

    // Inbound/Outbound today
    const today = new Date().toISOString().split('T')[0];
    const { data: inboundToday } = await supabase
      .from('stock_movements')
      .select('quantity')
      .eq('movement_type', 'INBOUND')
      .gte('created_at', today);
    
    const { data: outboundToday } = await supabase
      .from('stock_movements')
      .select('quantity')
      .eq('movement_type', 'OUTBOUND')
      .gte('created_at', today);

    const inboundSum = inboundToday?.reduce((sum, m) => sum + m.quantity, 0) || 0;
    const outboundSum = outboundToday?.reduce((sum, m) => sum + m.quantity, 0) || 0;

    setStats({
      totalItems: itemCount || 0,
      totalWarehouses: warehouseCount || 0,
      lotsOccupied: occupied,
      lotsEmpty: empty,
      inboundToday: inboundSum,
      outboundToday: outboundSum
    });

    // Stock by warehouse
    const { data: batches } = await supabase
      .from('item_batches')
      .select('quantity, lot:lots(warehouse:warehouses(name))');
    
    const warehouseMap = new Map<string, number>();
    batches?.forEach((batch: any) => {
      const warehouseName = batch.lot?.warehouse?.name || 'Unknown';
      warehouseMap.set(warehouseName, (warehouseMap.get(warehouseName) || 0) + batch.quantity);
    });

    const stockData = Array.from(warehouseMap.entries()).map(([warehouse, quantity]) => ({
      warehouse,
      quantity
    }));
    setStockByWarehouse(stockData);

    // Movement data (last 7 days)
    const movements: MovementData[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const { data: inbound } = await supabase
        .from('stock_movements')
        .select('quantity')
        .eq('movement_type', 'INBOUND')
        .gte('created_at', dateStr)
        .lt('created_at', new Date(date.getTime() + 86400000).toISOString().split('T')[0]);
      
      const { data: outbound } = await supabase
        .from('stock_movements')
        .select('quantity')
        .eq('movement_type', 'OUTBOUND')
        .gte('created_at', dateStr)
        .lt('created_at', new Date(date.getTime() + 86400000).toISOString().split('T')[0]);

      movements.push({
        date: date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
        inbound: inbound?.reduce((sum, m) => sum + m.quantity, 0) || 0,
        outbound: outbound?.reduce((sum, m) => sum + m.quantity, 0) || 0
      });
    }
    setMovementData(movements);

    // CEISA docs
    const { data: docs } = await supabase
      .from('customs_docs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (docs) setCeisaDocs(docs);
  };

  const fetchStockReport = async () => {
    let query = supabase
      .from('item_batches')
      .select(`
        quantity,
        batch_code,
        item:items(name, sku, category:categories(name)),
        lot:lots(code, rack:racks(code), warehouse:warehouses(name))
      `)
      .eq('status', 'active')
      .gt('quantity', 0);

    const { data } = await query;

    if (data) {
      let filtered = data.map((batch: any) => ({
        warehouse: batch.lot?.warehouse?.name || '-',
        category: batch.item?.category?.name || '-',
        item_name: batch.item?.name || '-',
        sku: batch.item?.sku || '-',
        batch_code: batch.batch_code,
        quantity: batch.quantity,
        lot_code: batch.lot?.code || '-',
        rack_code: batch.lot?.rack?.code || '-'
      }));

      // Apply filters
      if (selectedWarehouse !== 'all') {
        filtered = filtered.filter(r => r.warehouse === selectedWarehouse);
      }
      if (selectedCategory !== 'all') {
        filtered = filtered.filter(r => r.category === selectedCategory);
      }
      if (selectedBatch !== 'all') {
        filtered = filtered.filter(r => r.batch_code === selectedBatch);
      }

      setStockReport(filtered);
    }
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(stockReport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stock Report');
    XLSX.writeFile(wb, `stock_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast({ title: 'Berhasil', description: 'Laporan berhasil diunduh sebagai Excel' });
  };

  const exportToCSV = () => {
    const ws = XLSX.utils.json_to_sheet(stockReport);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    toast({ title: 'Berhasil', description: 'Laporan berhasil diunduh sebagai CSV' });
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const getStatusBadge = (status: string) => {
    const statusConfig: any = {
      draft: { 
        label: 'DRAFT', 
        className: 'bg-gray-100 text-gray-700 border-gray-300 font-semibold'
      },
      sent: { 
        label: 'SENT', 
        className: 'bg-blue-100 text-blue-700 border-blue-400 font-semibold'
      },
      accepted: { 
        label: 'ACCEPTED', 
        className: 'bg-green-100 text-green-700 border-green-400 font-semibold'
      },
      rejected: { 
        label: 'REJECTED', 
        className: 'bg-red-100 text-red-700 border-red-400 font-semibold'
      },
      failed: { 
        label: 'FAILED', 
        className: 'bg-red-100 text-red-700 border-red-400 font-semibold'
      }
    };
    const c = statusConfig[status] || statusConfig.draft;
    return <Badge className={c.className} variant="outline">{c.label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Laporan & Dashboard</h1>
          <p className="text-gray-600 mt-1">Analisis dan visualisasi data warehouse</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Barang</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-600" />
                <p className="text-2xl font-bold">{stats.totalItems}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Gudang</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Warehouse className="h-4 w-4 text-green-600" />
                <p className="text-2xl font-bold">{stats.totalWarehouses}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Lot Terisi</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{stats.lotsOccupied}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Lot Kosong</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-400">{stats.lotsEmpty}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Inbound Hari Ini</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <p className="text-2xl font-bold">{stats.inboundToday}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Outbound Hari Ini</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />
                <p className="text-2xl font-bold">{stats.outboundToday}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="reports">Laporan Stok</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Stok per Gudang</CardTitle>
                  <CardDescription>Total quantity barang di setiap gudang</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stockByWarehouse}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="warehouse" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="quantity" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Lot Status</CardTitle>
                  <CardDescription>Perbandingan lot terisi vs kosong</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Terisi', value: stats.lotsOccupied },
                          { name: 'Kosong', value: stats.lotsEmpty }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        <Cell fill="#10b981" />
                        <Cell fill="#e5e7eb" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Grafik Inbound/Outbound (7 Hari Terakhir)</CardTitle>
                <CardDescription>Pergerakan barang masuk dan keluar harian</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={movementData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="inbound" stroke="#10b981" strokeWidth={2} name="Inbound" />
                    <Line type="monotone" dataKey="outbound" stroke="#ef4444" strokeWidth={2} name="Outbound" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* CEISA Docs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Dokumen CEISA Terakhir
                </CardTitle>
                <CardDescription>10 dokumen terakhir yang dikirim ke Bea Cukai</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipe</TableHead>
                      <TableHead>Nomor Dokumen</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ceisaDocs.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <Badge variant="outline">{doc.document_type}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{doc.document_number}</TableCell>
                        <TableCell>{new Date(doc.created_at).toLocaleDateString('id-ID')}</TableCell>
                        <TableCell>{getStatusBadge(doc.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Laporan Stok Detail</CardTitle>
                    <CardDescription>Filter dan unduh laporan stok</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={exportToExcel} variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Excel
                    </Button>
                    <Button onClick={exportToCSV} variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      CSV
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Gudang</label>
                    <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Gudang</SelectItem>
                        {warehouses.map((w) => (
                          <SelectItem key={w.id} value={w.name}>{w.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Kategori</label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Kategori</SelectItem>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Batch</label>
                    <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Batch</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Report Table */}
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Gudang</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead>Barang</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Batch</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Lot</TableHead>
                        <TableHead>Rack</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stockReport.map((row, index) => (
                        <TableRow key={index}>
                          <TableCell>{row.warehouse}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{row.category}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{row.item_name}</TableCell>
                          <TableCell className="font-mono text-sm">{row.sku}</TableCell>
                          <TableCell className="text-sm">{row.batch_code}</TableCell>
                          <TableCell className="font-semibold">{row.quantity}</TableCell>
                          <TableCell className="text-sm">{row.lot_code}</TableCell>
                          <TableCell className="text-sm">{row.rack_code}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="mt-4 text-sm text-gray-600">
                  Total: {stockReport.length} records | Total Qty: {stockReport.reduce((sum, r) => sum + r.quantity, 0)}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}