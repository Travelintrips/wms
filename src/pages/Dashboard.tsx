import { useState, useEffect, Navigate } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Warehouse, Package, TruckIcon, FileText, Plus, Edit, Trash2, Map, Layers, PackageCheck, ClipboardList, Scan, BarChart3, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import BarcodeScanner from '@/components/BarcodeScanner';

export default function Dashboard() {
  const [warehouses, setWarehouses] = useState([
    { id: '1', name: 'Gudang Utama', location: 'Jakarta', capacity: '10000 m²' },
    { id: '2', name: 'Gudang Cabang', location: 'Surabaya', capacity: '5000 m²' }
  ]);

  const [products, setProducts] = useState([
    { id: '1', sku: 'SKU-001', name: 'Produk A', category: 'Elektronik', stock: 150 },
    { id: '2', sku: 'SKU-002', name: 'Produk B', category: 'Furniture', stock: 100 }
  ]);

  const [stockMovements, setStockMovements] = useState([
    { id: '1', type: 'Masuk', product: 'Produk A', quantity: 50, date: '2024-01-15', warehouse: 'Gudang Utama' },
    { id: '2', type: 'Keluar', product: 'Produk B', quantity: 25, date: '2024-01-20', warehouse: 'Gudang Cabang' }
  ]);

  const [customsDocs, setCustomsDocs] = useState([]);

  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    fetchCustomsDocs();
  }, []);

  const fetchCustomsDocs = async () => {
    const { data } = await supabase
      .from('customs_docs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (data) setCustomsDocs(data);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: 'DRAFT', className: 'bg-gray-100 text-gray-800 border-gray-300 font-semibold' },
      sent: { label: 'SENT', className: 'bg-blue-100 text-blue-800 border-blue-300 font-semibold' },
      accepted: { label: 'ACCEPTED', className: 'bg-green-100 text-green-800 border-green-300 font-semibold' },
      rejected: { label: 'REJECTED', className: 'bg-red-100 text-red-800 border-red-300 font-semibold' },
      failed: { label: 'FAILED', className: 'bg-red-100 text-red-800 border-red-300 font-semibold' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge className={config.className} variant="outline">{config.label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white shadow-md border-b">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-end">
            <Button 
              variant="default" 
              size="sm"
              onClick={() => setShowScanner(true)}
              className="bg-gradient-to-r from-blue-600 to-blue-700"
            >
              <Scan className="h-4 w-4 mr-2" />
              Scanner
            </Button>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <Tabs defaultValue="gudang" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5 bg-white shadow-sm">
              <TabsTrigger value="gudang" className="data-[state=active]:bg-blue-50">
                <Warehouse className="h-4 w-4 mr-2" />
                Gudang
              </TabsTrigger>
              <TabsTrigger value="supplier" className="data-[state=active]:bg-indigo-50">
                <Users className="h-4 w-4 mr-2" />
                Supplier
              </TabsTrigger>
              <TabsTrigger value="barang" className="data-[state=active]:bg-green-50">
                <Package className="h-4 w-4 mr-2" />
                Barang
              </TabsTrigger>
              <TabsTrigger value="stok" className="data-[state=active]:bg-orange-50">
                <TruckIcon className="h-4 w-4 mr-2" />
                Stok
              </TabsTrigger>
              <TabsTrigger value="beacukai" className="data-[state=active]:bg-purple-50">
                <FileText className="h-4 w-4 mr-2" />
                Bea Cukai
              </TabsTrigger>
            </TabsList>

            <TabsContent value="gudang">
              <Card className="shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-white border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">Data Gudang</CardTitle>
                      <CardDescription>Kelola informasi gudang dan lokasi</CardDescription>
                    </div>
                    <Link to="/warehouses">
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Tambah Gudang
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold">Nama Gudang</TableHead>
                        <TableHead className="font-semibold">Lokasi</TableHead>
                        <TableHead className="font-semibold">Kapasitas</TableHead>
                        <TableHead className="text-right font-semibold">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {warehouses.map((warehouse) => (
                        <TableRow key={warehouse.id} className="hover:bg-blue-50/50">
                          <TableCell className="font-medium">{warehouse.name}</TableCell>
                          <TableCell>{warehouse.location}</TableCell>
                          <TableCell>{warehouse.capacity}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
                    <p className="text-sm text-gray-600">Menampilkan {warehouses.length} gudang</p>
                    <div className="flex gap-2">
                      <Button variant="default" size="sm" disabled className="bg-gradient-to-r from-blue-600 to-blue-700">Previous</Button>
                      <Button variant="default" size="sm" disabled className="bg-gradient-to-r from-blue-600 to-blue-700">Next</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="supplier">
              <Card className="shadow-lg">
                <CardHeader className="bg-gradient-to-r from-indigo-50 to-white border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">Data Supplier</CardTitle>
                      <CardDescription>Kelola informasi supplier dan vendor</CardDescription>
                    </div>
                    <Link to="/suppliers">
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Kelola Supplier
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="text-center py-12">
                    <Users className="h-16 w-16 mx-auto text-indigo-300 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Manajemen Supplier</h3>
                    <p className="text-gray-500 mb-6">Klik tombol "Kelola Supplier" untuk menambah, edit, atau melihat data supplier</p>
                    <Link to="/suppliers">
                      <Button>
                        <Users className="h-4 w-4 mr-2" />
                        Buka Halaman Supplier
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="barang">
              <Card className="shadow-lg">
                <CardHeader className="bg-gradient-to-r from-green-50 to-white border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">Data Barang</CardTitle>
                      <CardDescription>Kelola katalog produk dan inventori</CardDescription>
                    </div>
                    <Link to="/inventory">
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Tambah Barang
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold">SKU</TableHead>
                        <TableHead className="font-semibold">Nama Barang</TableHead>
                        <TableHead className="font-semibold">Kategori</TableHead>
                        <TableHead className="font-semibold">Stok Total</TableHead>
                        <TableHead className="text-right font-semibold">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => (
                        <TableRow key={product.id} className="hover:bg-green-50/50">
                          <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{product.category}</Badge>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold">{product.stock}</span> pcs
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
                    <p className="text-sm text-gray-600">Menampilkan {products.length} barang</p>
                    <div className="flex gap-2">
                      <Button variant="default" size="sm" disabled className="bg-gradient-to-r from-blue-600 to-blue-700">Previous</Button>
                      <Button variant="default" size="sm" disabled className="bg-gradient-to-r from-blue-600 to-blue-700">Next</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="stok">
              <Card className="shadow-lg">
                <CardHeader className="bg-gradient-to-r from-orange-50 to-white border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">Pergerakan Stok</CardTitle>
                      <CardDescription>Riwayat stok masuk dan keluar</CardDescription>
                    </div>
                    <Link to="/stock-movement">
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Catat Pergerakan
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold">Tanggal</TableHead>
                        <TableHead className="font-semibold">Tipe</TableHead>
                        <TableHead className="font-semibold">Barang</TableHead>
                        <TableHead className="font-semibold">Jumlah</TableHead>
                        <TableHead className="font-semibold">Gudang</TableHead>
                        <TableHead className="text-right font-semibold">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stockMovements.map((movement) => (
                        <TableRow key={movement.id} className="hover:bg-orange-50/50">
                          <TableCell>{movement.date}</TableCell>
                          <TableCell>
                            <Badge className={movement.type === 'Masuk' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                              {movement.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{movement.product}</TableCell>
                          <TableCell className="font-semibold">{movement.quantity} pcs</TableCell>
                          <TableCell>{movement.warehouse}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
                    <p className="text-sm text-gray-600">Menampilkan {stockMovements.length} pergerakan</p>
                    <div className="flex gap-2">
                      <Button variant="default" size="sm" disabled className="bg-gradient-to-r from-blue-600 to-blue-700">Previous</Button>
                      <Button variant="default" size="sm" disabled className="bg-gradient-to-r from-blue-600 to-blue-700">Next</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="beacukai">
              <Card className="shadow-lg">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-white border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">Dokumen Bea Cukai</CardTitle>
                      <CardDescription>Status pengiriman dokumen CEISA 4.0</CardDescription>
                    </div>
                    <Link to="/customs">
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Buat Dokumen
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold">Tipe Dokumen</TableHead>
                        <TableHead className="font-semibold">Nomor Dokumen</TableHead>
                        <TableHead className="font-semibold">Tanggal</TableHead>
                        <TableHead className="font-semibold">Status CEISA</TableHead>
                        <TableHead className="text-right font-semibold">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customsDocs.length > 0 ? (
                        customsDocs.map((doc: any) => (
                          <TableRow key={doc.id} className="hover:bg-purple-50/50">
                            <TableCell>
                              <div className="flex items-center">
                                <FileText className="h-4 w-4 mr-2 text-purple-600" />
                                <span className="font-medium">{doc.document_type}</span>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-sm">{doc.document_number}</TableCell>
                            <TableCell>{new Date(doc.created_at).toLocaleDateString('id-ID')}</TableCell>
                            <TableCell>{getStatusBadge(doc.status)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                            Belum ada dokumen bea cukai. Klik "Buat Dokumen" untuk memulai.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
                    <p className="text-sm text-gray-600">Menampilkan {customsDocs.length} dokumen</p>
                    <div className="flex gap-2">
                      <Button variant="default" size="sm" disabled className="bg-gradient-to-r from-blue-600 to-blue-700">Previous</Button>
                      <Button variant="default" size="sm" disabled className="bg-gradient-to-r from-blue-600 to-blue-700">Next</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg mt-6">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-white border-b">
                  <CardTitle className="text-lg">Legenda Status CEISA</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border">
                      <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                      <div>
                        <p className="font-semibold text-sm">Draft</p>
                        <p className="text-xs text-gray-600">Belum dikirim</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <div>
                        <p className="font-semibold text-sm">Dikirim</p>
                        <p className="text-xs text-gray-600">Dalam proses</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <div>
                        <p className="font-semibold text-sm">Diterima</p>
                        <p className="text-xs text-gray-600">Berhasil</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div>
                        <p className="font-semibold text-sm">Ditolak</p>
                        <p className="text-xs text-gray-600">Gagal</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <BarcodeScanner 
        open={showScanner} 
        onClose={() => setShowScanner(false)}
      />
    </div>
  );
}