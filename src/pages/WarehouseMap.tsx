import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MapPin, Package, Grid3x3 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';

interface Warehouse {
  id: string;
  name: string;
  location: string;
}

interface Zone {
  id: string;
  name: string;
  warehouse_id: string;
}

interface Rack {
  id: string;
  code: string;
  zone_id: string;
}

interface Lot {
  id: string;
  code: string;
  rack_id: string;
  capacity: number;
  current_load: number;
}

interface ItemLocation {
  id: string;
  lot_id: string;
  quantity: number;
  items: {
    name: string;
    sku: string;
  };
}

export default function WarehouseMap() {
  const [searchParams] = useSearchParams();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [racks, setRacks] = useState<Rack[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [itemLocations, setItemLocations] = useState<ItemLocation[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [selectedZone, setSelectedZone] = useState<string>('');
  const [selectedLot, setSelectedLot] = useState<Lot | null>(null);
  const [showLotDialog, setShowLotDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchWarehouses();
  }, []);

  useEffect(() => {
    if (selectedWarehouse) {
      fetchZones(selectedWarehouse);
    }
  }, [selectedWarehouse]);

  useEffect(() => {
    if (selectedZone) {
      fetchRacksAndLots(selectedZone);
    }
  }, [selectedZone]);

  const fetchWarehouses = async () => {
    const { data, error } = await supabase
      .from('warehouses')
      .select('*')
      .order('name');

    if (error) {
      toast({
        title: 'Error',
        description: 'Gagal memuat data gudang',
        variant: 'destructive'
      });
    } else if (data && data.length > 0) {
      setWarehouses(data);
      setSelectedWarehouse(data[0].id);
    }
  };

  const fetchZones = async (warehouseId: string) => {
    const { data, error } = await supabase
      .from('zones')
      .select(`
        *,
        racks(
          *,
          lots(*)
        )
      `)
      .eq('warehouse_id', warehouseId)
      .order('name');

    if (error) {
      toast({
        title: 'Error',
        description: 'Gagal memuat data zona',
        variant: 'destructive'
      });
    } else if (data && data.length > 0) {
      setZones(data);
      if (data.length > 0) {
        setSelectedZone(data[0].id);
      }
    } else {
      setZones([]);
      setRacks([]);
      setLots([]);
    }
  };

  const fetchRacksAndLots = async (zoneId: string) => {
    const { data: racksData, error: racksError } = await supabase
      .from('racks')
      .select('*')
      .eq('zone_id', zoneId)
      .order('code');

    if (racksError) {
      toast({
        title: 'Error',
        description: 'Gagal memuat data rak',
        variant: 'destructive'
      });
      return;
    }

    setRacks(racksData || []);

    if (racksData && racksData.length > 0) {
      const rackIds = racksData.map(r => r.id);
      const { data: lotsData, error: lotsError } = await supabase
        .from('lots')
        .select('*')
        .in('rack_id', rackIds)
        .order('code');

      if (lotsError) {
        toast({
          title: 'Error',
          description: 'Gagal memuat data lot',
          variant: 'destructive'
        });
      } else {
        setLots(lotsData || []);
      }
    } else {
      setLots([]);
    }
  };

  const fetchItemsInLot = async (lotId: string) => {
    const { data, error } = await supabase
      .from('item_locations')
      .select('*, items(name, sku)')
      .eq('lot_id', lotId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Gagal memuat data barang',
        variant: 'destructive'
      });
    } else {
      setItemLocations(data || []);
    }
  };

  const getLotStatusColor = (lot: any) => {
    if (lot.current_load === 0) {
      return 'bg-gray-200 border-gray-300 text-gray-600'; // Kosong
    } else if (lot.current_load < lot.capacity) {
      return 'bg-yellow-200 border-yellow-400 text-yellow-900'; // Terisi sebagian
    } else {
      return 'bg-red-200 border-red-400 text-red-900'; // Penuh
    }
  };

  const getLotStatusBadge = (lot: any) => {
    if (lot.current_load === 0) {
      return <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-300">Kosong</Badge>;
    } else if (lot.current_load < lot.capacity) {
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-400">Terisi Sebagian</Badge>;
    } else {
      return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-400">Penuh</Badge>;
    }
  };

  const handleLotClick = (lot: Lot) => {
    setSelectedLot(lot);
    fetchItemsInLot(lot.id);
  };

  const getLoadPercentage = (lot: Lot) => {
    return Math.round((lot.current_load / lot.capacity) * 100);
  };

  const getLoadColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-orange-500';
    if (percentage >= 40) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Peta Gudang</h1>
            <p className="text-gray-600 mt-1">Visualisasi layout dan kapasitas gudang</p>
          </div>
          <div className="flex gap-2">
            <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Pilih gudang" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name} - {w.location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Legend */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Legenda Status Lot</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-gray-200 border-2 border-gray-300"></div>
                <span className="text-sm font-medium">Kosong</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-yellow-200 border-2 border-yellow-400"></div>
                <span className="text-sm font-medium">Terisi Sebagian</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-red-200 border-2 border-red-400"></div>
                <span className="text-sm font-medium">Penuh</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Warehouse Map Grid */}
        {selectedWarehouse && (
          <div className="space-y-6">
            {zones.map((zone) => (
              <Card key={zone.id} className="overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-white border-b">
                  <CardTitle className="flex items-center gap-2">
                    <Grid3x3 className="h-5 w-5 text-blue-600" />
                    {zone.name}
                  </CardTitle>
                  <CardDescription>{zone.description}</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  {/* Racks Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {zone.racks?.map((rack: any) => (
                      <Card key={rack.id} className="border-2 hover:shadow-lg transition-shadow">
                        <CardHeader className="pb-3 bg-gradient-to-br from-slate-50 to-white">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base font-semibold text-slate-800">
                              {rack.code}
                            </CardTitle>
                            <Badge variant="outline" className="text-xs">
                              {rack.lots?.length || 0} Lots
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-3">
                          {/* Lots Grid */}
                          <div className="grid grid-cols-2 gap-2">
                            {rack.lots?.map((lot: any) => (
                              <div
                                key={lot.id}
                                className={`p-3 rounded-lg border-2 cursor-pointer hover:scale-105 transition-transform ${getLotStatusColor(lot)}`}
                                onClick={() => {
                                  setSelectedLot(lot);
                                  setShowLotDialog(true);
                                }}
                              >
                                <p className="font-bold text-sm">{lot.code}</p>
                                <p className="text-xs mt-1">
                                  {lot.current_load}/{lot.capacity}
                                </p>
                                <div className="mt-2 w-full bg-white/50 rounded-full h-1.5">
                                  <div
                                    className="bg-current h-1.5 rounded-full transition-all"
                                    style={{
                                      width: `${(lot.current_load / lot.capacity) * 100}%`
                                    }}
                                  ></div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Lot Detail Dialog */}
        <Dialog open={showLotDialog} onOpenChange={setShowLotDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                Detail Lot: {selectedLot?.code}
              </DialogTitle>
            </DialogHeader>

            {selectedLot && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-600 font-medium">Kapasitas</p>
                    <p className="text-2xl font-bold text-blue-900">{selectedLot.capacity}</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-600 font-medium">Terisi</p>
                    <p className="text-2xl font-bold text-green-900">{selectedLot.current_load}</p>
                  </div>
                </div>

                <div className="p-4 rounded-lg border-2" style={{
                  backgroundColor: getLotStatusColor(selectedLot).includes('gray') ? '#f3f4f6' :
                                   getLotStatusColor(selectedLot).includes('yellow') ? '#fef3c7' : '#fee2e2'
                }}>
                  <p className="text-sm font-medium mb-2">Status:</p>
                  {getLotStatusBadge(selectedLot)}
                </div>

                {selectedLot.batches && selectedLot.batches.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Isi Lot ({selectedLot.batches.length} Batch):</h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {selectedLot.batches.map((batch: any) => (
                        <div key={batch.id} className="p-3 border rounded-lg bg-white">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{batch.item?.name}</p>
                              <p className="text-sm text-gray-500">Batch: {batch.batch_code}</p>
                            </div>
                            <Badge variant="outline">{batch.quantity} {batch.item?.unit}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowLotDialog(false)}>
                Tutup
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}