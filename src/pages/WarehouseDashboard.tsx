import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Trash2, Warehouse, Grid3x3, Package, Layers } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

interface Warehouse {
  id: string;
  name: string;
  location: string;
  capacity: string;
}

interface Zone {
  id: string;
  warehouse_id: string;
  name: string;
  description: string;
  warehouse?: { name: string };
}

interface Rack {
  id: string;
  zone_id: string;
  code: string;
  description: string;
  zone?: { name: string; warehouse?: { name: string } };
}

interface Lot {
  id: string;
  rack_id: string;
  code: string;
  capacity: number;
  current_load: number;
  rack?: { code: string; zone?: { name: string } };
}

export default function WarehouseDashboard() {
  const { toast } = useToast();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [racks, setRacks] = useState<Rack[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  
  const [warehouseDialog, setWarehouseDialog] = useState(false);
  const [zoneDialog, setZoneDialog] = useState(false);
  const [rackDialog, setRackDialog] = useState(false);
  const [lotDialog, setLotDialog] = useState(false);
  
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [editingRack, setEditingRack] = useState<Rack | null>(null);
  const [editingLot, setEditingLot] = useState<Lot | null>(null);

  useEffect(() => {
    fetchWarehouses();
    fetchZones();
    fetchRacks();
    fetchLots();
  }, []);

  const fetchWarehouses = async () => {
    const { data, error } = await supabase.from('warehouses').select('*').order('created_at', { ascending: false });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setWarehouses(data || []);
    }
  };

  const fetchZones = async () => {
    const { data, error } = await supabase.from('zones').select('*, warehouse:warehouses(name)').order('created_at', { ascending: false });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setZones(data || []);
    }
  };

  const fetchRacks = async () => {
    const { data, error } = await supabase.from('racks').select('*, zone:zones(name, warehouse:warehouses(name))').order('created_at', { ascending: false });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setRacks(data || []);
    }
  };

  const fetchLots = async () => {
    const { data, error } = await supabase.from('lots').select('*, rack:racks(code, zone:zones(name))').order('created_at', { ascending: false });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setLots(data || []);
    }
  };

  const handleSaveWarehouse = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      location: formData.get('location') as string,
      capacity: formData.get('capacity') as string,
    };

    if (editingWarehouse) {
      const { error } = await supabase.from('warehouses').update(data).eq('id', editingWarehouse.id);
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Berhasil', description: 'Gudang berhasil diupdate' });
        fetchWarehouses();
        setWarehouseDialog(false);
        setEditingWarehouse(null);
      }
    } else {
      const { error } = await supabase.from('warehouses').insert([data]);
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Berhasil', description: 'Gudang berhasil ditambahkan' });
        fetchWarehouses();
        setWarehouseDialog(false);
      }
    }
  };

  const handleDeleteWarehouse = async (id: string) => {
    if (confirm('Yakin ingin menghapus gudang ini?')) {
      const { error } = await supabase.from('warehouses').delete().eq('id', id);
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Berhasil', description: 'Gudang berhasil dihapus' });
        fetchWarehouses();
      }
    }
  };

  const handleSaveZone = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      warehouse_id: formData.get('warehouse_id') as string,
      name: formData.get('name') as string,
      description: formData.get('description') as string,
    };

    if (editingZone) {
      const { error } = await supabase.from('zones').update(data).eq('id', editingZone.id);
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Berhasil', description: 'Zona berhasil diupdate' });
        fetchZones();
        setZoneDialog(false);
        setEditingZone(null);
      }
    } else {
      const { error } = await supabase.from('zones').insert([data]);
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Berhasil', description: 'Zona berhasil ditambahkan' });
        fetchZones();
        setZoneDialog(false);
      }
    }
  };

  const handleDeleteZone = async (id: string) => {
    if (confirm('Yakin ingin menghapus zona ini?')) {
      const { error } = await supabase.from('zones').delete().eq('id', id);
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Berhasil', description: 'Zona berhasil dihapus' });
        fetchZones();
      }
    }
  };

  const handleSaveRack = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      zone_id: formData.get('zone_id') as string,
      code: formData.get('code') as string,
      description: formData.get('description') as string,
    };

    if (editingRack) {
      const { error } = await supabase.from('racks').update(data).eq('id', editingRack.id);
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Berhasil', description: 'Rak berhasil diupdate' });
        fetchRacks();
        setRackDialog(false);
        setEditingRack(null);
      }
    } else {
      const { error } = await supabase.from('racks').insert([data]);
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Berhasil', description: 'Rak berhasil ditambahkan' });
        fetchRacks();
        setRackDialog(false);
      }
    }
  };

  const handleDeleteRack = async (id: string) => {
    if (confirm('Yakin ingin menghapus rak ini?')) {
      const { error } = await supabase.from('racks').delete().eq('id', id);
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Berhasil', description: 'Rak berhasil dihapus' });
        fetchRacks();
      }
    }
  };

  const handleSaveLot = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      rack_id: formData.get('rack_id') as string,
      code: formData.get('code') as string,
      capacity: parseInt(formData.get('capacity') as string),
      current_load: parseInt(formData.get('current_load') as string),
    };

    if (editingLot) {
      const { error } = await supabase.from('lots').update(data).eq('id', editingLot.id);
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Berhasil', description: 'Lot berhasil diupdate' });
        fetchLots();
        setLotDialog(false);
        setEditingLot(null);
      }
    } else {
      const { error } = await supabase.from('lots').insert([data]);
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Berhasil', description: 'Lot berhasil ditambahkan' });
        fetchLots();
        setLotDialog(false);
      }
    }
  };

  const handleDeleteLot = async (id: string) => {
    if (confirm('Yakin ingin menghapus lot ini?')) {
      const { error } = await supabase.from('lots').delete().eq('id', id);
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Berhasil', description: 'Lot berhasil dihapus' });
        fetchLots();
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Manajemen Gudang</h1>
          <p className="text-gray-600 mt-1">Kelola gudang, zona, rak, dan lot</p>
        </div>

        <Tabs defaultValue="warehouses" className="space-y-4">
          <TabsList>
            <TabsTrigger value="warehouses">
              <Warehouse className="h-4 w-4 mr-2" />
              Gudang
            </TabsTrigger>
            <TabsTrigger value="zones">
              <Grid3x3 className="h-4 w-4 mr-2" />
              Zona
            </TabsTrigger>
            <TabsTrigger value="racks">
              <Package className="h-4 w-4 mr-2" />
              Rak
            </TabsTrigger>
            <TabsTrigger value="lots">
              <Layers className="h-4 w-4 mr-2" />
              Lot
            </TabsTrigger>
          </TabsList>

          {/* WAREHOUSES TAB */}
          <TabsContent value="warehouses">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Daftar Gudang</CardTitle>
                    <CardDescription>Kelola data gudang</CardDescription>
                  </div>
                  <Dialog open={warehouseDialog} onOpenChange={setWarehouseDialog}>
                    <DialogTrigger asChild>
                      <Button onClick={() => setEditingWarehouse(null)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Tambah Gudang
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <form onSubmit={handleSaveWarehouse}>
                        <DialogHeader>
                          <DialogTitle>{editingWarehouse ? 'Edit Gudang' : 'Tambah Gudang'}</DialogTitle>
                          <DialogDescription>Isi data gudang</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div>
                            <Label htmlFor="name">Nama Gudang</Label>
                            <Input id="name" name="name" defaultValue={editingWarehouse?.name} required />
                          </div>
                          <div>
                            <Label htmlFor="location">Lokasi</Label>
                            <Input id="location" name="location" defaultValue={editingWarehouse?.location} required />
                          </div>
                          <div>
                            <Label htmlFor="capacity">Kapasitas</Label>
                            <Input id="capacity" name="capacity" defaultValue={editingWarehouse?.capacity} placeholder="e.g. 10000 m²" />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="submit">Simpan</Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama</TableHead>
                      <TableHead>Lokasi</TableHead>
                      <TableHead>Kapasitas</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {warehouses.map((warehouse) => (
                      <TableRow key={warehouse.id}>
                        <TableCell className="font-medium">{warehouse.name}</TableCell>
                        <TableCell>{warehouse.location}</TableCell>
                        <TableCell>{warehouse.capacity}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingWarehouse(warehouse);
                              setWarehouseDialog(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteWarehouse(warehouse.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ZONES TAB */}
          <TabsContent value="zones">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Daftar Zona</CardTitle>
                    <CardDescription>Kelola zona di gudang</CardDescription>
                  </div>
                  <Dialog open={zoneDialog} onOpenChange={setZoneDialog}>
                    <DialogTrigger asChild>
                      <Button onClick={() => setEditingZone(null)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Tambah Zona
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <form onSubmit={handleSaveZone}>
                        <DialogHeader>
                          <DialogTitle>{editingZone ? 'Edit Zona' : 'Tambah Zona'}</DialogTitle>
                          <DialogDescription>Isi data zona</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div>
                            <Label htmlFor="warehouse_id">Gudang</Label>
                            <Select name="warehouse_id" defaultValue={editingZone?.warehouse_id} required>
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih gudang" />
                              </SelectTrigger>
                              <SelectContent>
                                {warehouses.map((w) => (
                                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="name">Nama Zona</Label>
                            <Input id="name" name="name" defaultValue={editingZone?.name} required />
                          </div>
                          <div>
                            <Label htmlFor="description">Deskripsi</Label>
                            <Input id="description" name="description" defaultValue={editingZone?.description} />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="submit">Simpan</Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama Zona</TableHead>
                      <TableHead>Gudang</TableHead>
                      <TableHead>Deskripsi</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {zones.map((zone) => (
                      <TableRow key={zone.id}>
                        <TableCell className="font-medium">{zone.name}</TableCell>
                        <TableCell>{zone.warehouse?.name}</TableCell>
                        <TableCell>{zone.description}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingZone(zone);
                              setZoneDialog(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteZone(zone.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* RACKS TAB */}
          <TabsContent value="racks">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Daftar Rak</CardTitle>
                    <CardDescription>Kelola rak di zona</CardDescription>
                  </div>
                  <Dialog open={rackDialog} onOpenChange={setRackDialog}>
                    <DialogTrigger asChild>
                      <Button onClick={() => setEditingRack(null)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Tambah Rak
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <form onSubmit={handleSaveRack}>
                        <DialogHeader>
                          <DialogTitle>{editingRack ? 'Edit Rak' : 'Tambah Rak'}</DialogTitle>
                          <DialogDescription>Isi data rak</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div>
                            <Label htmlFor="zone_id">Zona</Label>
                            <Select name="zone_id" defaultValue={editingRack?.zone_id} required>
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih zona" />
                              </SelectTrigger>
                              <SelectContent>
                                {zones.map((z) => (
                                  <SelectItem key={z.id} value={z.id}>{z.name} - {z.warehouse?.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="code">Kode Rak</Label>
                            <Input id="code" name="code" defaultValue={editingRack?.code} placeholder="e.g. R01" required />
                          </div>
                          <div>
                            <Label htmlFor="description">Deskripsi</Label>
                            <Input id="description" name="description" defaultValue={editingRack?.description} />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="submit">Simpan</Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kode Rak</TableHead>
                      <TableHead>Zona</TableHead>
                      <TableHead>Gudang</TableHead>
                      <TableHead>Deskripsi</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {racks.map((rack) => (
                      <TableRow key={rack.id}>
                        <TableCell className="font-medium">{rack.code}</TableCell>
                        <TableCell>{rack.zone?.name}</TableCell>
                        <TableCell>{rack.zone?.warehouse?.name}</TableCell>
                        <TableCell>{rack.description}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingRack(rack);
                              setRackDialog(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteRack(rack.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* LOTS TAB */}
          <TabsContent value="lots">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Daftar Lot</CardTitle>
                    <CardDescription>Kelola lot di rak</CardDescription>
                  </div>
                  <Dialog open={lotDialog} onOpenChange={setLotDialog}>
                    <DialogTrigger asChild>
                      <Button onClick={() => setEditingLot(null)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Tambah Lot
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <form onSubmit={handleSaveLot}>
                        <DialogHeader>
                          <DialogTitle>{editingLot ? 'Edit Lot' : 'Tambah Lot'}</DialogTitle>
                          <DialogDescription>Isi data lot</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div>
                            <Label htmlFor="rack_id">Rak</Label>
                            <Select name="rack_id" defaultValue={editingLot?.rack_id} required>
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih rak" />
                              </SelectTrigger>
                              <SelectContent>
                                {racks.map((r) => (
                                  <SelectItem key={r.id} value={r.id}>{r.code} - {r.zone?.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="code">Kode Lot</Label>
                            <Input id="code" name="code" defaultValue={editingLot?.code} placeholder="e.g. L01" required />
                          </div>
                          <div>
                            <Label htmlFor="capacity">Kapasitas</Label>
                            <Input id="capacity" name="capacity" type="number" defaultValue={editingLot?.capacity || 100} required />
                          </div>
                          <div>
                            <Label htmlFor="current_load">Beban Saat Ini</Label>
                            <Input id="current_load" name="current_load" type="number" defaultValue={editingLot?.current_load || 0} required />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="submit">Simpan</Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kode Lot</TableHead>
                      <TableHead>Rak</TableHead>
                      <TableHead>Zona</TableHead>
                      <TableHead>Kapasitas</TableHead>
                      <TableHead>Beban</TableHead>
                      <TableHead>Utilisasi</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lots.map((lot) => {
                      const utilization = (lot.current_load / lot.capacity) * 100;
                      return (
                        <TableRow key={lot.id}>
                          <TableCell className="font-medium">{lot.code}</TableCell>
                          <TableCell>{lot.rack?.code}</TableCell>
                          <TableCell>{lot.rack?.zone?.name}</TableCell>
                          <TableCell>{lot.capacity}</TableCell>
                          <TableCell>{lot.current_load}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${
                                    utilization >= 90 ? 'bg-red-500' :
                                    utilization >= 70 ? 'bg-yellow-500' :
                                    'bg-green-500'
                                  }`}
                                  style={{ width: `${utilization}%` }}
                                />
                              </div>
                              <span className="text-sm">{utilization.toFixed(0)}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingLot(lot);
                                setLotDialog(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteLot(lot.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
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