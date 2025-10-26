import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Scan, CheckCircle, Truck, FileText, MapPin, Package } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { reportOutboundToCeisa } from '@/lib/ceisa';

interface Customer {
  id: string;
  customer_code: string;
  name: string;
}

interface Item {
  id: string;
  sku: string;
  name: string;
  unit: string;
}

interface Batch {
  id: string;
  batch_code: string;
  lot?: {
    id: string;
    code: string;
    rack?: {
      code: string;
      zone?: { name: string };
    };
  };
}

interface PickingOrderItem {
  id: string;
  item_id: string;
  item?: Item;
  quantity: number;
  picked_quantity: number;
  batch_id?: string;
  batch?: Batch;
  lot_id?: string;
  picking_status: string;
}

interface PickingOrder {
  id: string;
  order_number: string;
  customer_id: string;
  customer?: Customer;
  order_date: string;
  status: string;
  notes: string;
  items?: PickingOrderItem[];
}

export default function PickingOrders() {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [orders, setOrders] = useState<PickingOrder[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showPickingDialog, setShowPickingDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PickingOrder | null>(null);
  const [selectedOrderItem, setSelectedOrderItem] = useState<PickingOrderItem | null>(null);
  
  // Order form
  const [customerId, setCustomerId] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [orderItems, setOrderItems] = useState<{ item_id: string; quantity: number; item?: Item }[]>([]);
  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  
  // Picking form
  const [scanMode, setScanMode] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');

  useEffect(() => {
    fetchCustomers();
    fetchItems();
    fetchOrders();
  }, []);

  const fetchCustomers = async () => {
    const { data } = await supabase.from('customers').select('*').order('name');
    if (data) setCustomers(data);
  };

  const fetchItems = async () => {
    const { data } = await supabase.from('items').select('*').order('name');
    if (data) setItems(data);
  };

  const fetchOrders = async () => {
    const { data } = await supabase
      .from('picking_orders')
      .select('*, customer:customers(*)')
      .order('created_at', { ascending: false });
    
    if (data) {
      const ordersWithItems = await Promise.all(
        data.map(async (order) => {
          const { data: items } = await supabase
            .from('picking_order_items')
            .select('id, order_id, item_id, quantity, picked_quantity, batch_id, lot_id, picking_status, item:items(*), batch:item_batches(id, batch_code, lot:lots(id, code, rack:racks(code, zone:zones(name))))')
            .eq('order_id', order.id);
          return { ...order, items: items || [] };
        })
      );
      setOrders(ordersWithItems);
    }
  };

  const addItemToOrder = () => {
    if (!itemId || !quantity) {
      toast({ title: 'Error', description: 'Harap isi semua field', variant: 'destructive' });
      return;
    }

    const item = items.find(i => i.id === itemId);
    if (!item) return;

    setOrderItems([...orderItems, { item_id: itemId, quantity: parseInt(quantity), item }]);
    setItemId('');
    setQuantity('');
  };

  const saveOrder = async () => {
    if (!customerId || orderItems.length === 0) {
      toast({ title: 'Error', description: 'Harap isi customer dan minimal 1 barang', variant: 'destructive' });
      return;
    }

    const orderNumber = `PICK-${Date.now()}`;
    
    const { data: order, error: orderError } = await supabase
      .from('picking_orders')
      .insert([{
        order_number: orderNumber,
        customer_id: customerId,
        order_date: orderDate,
        status: 'pending',
        notes
      }])
      .select()
      .single();

    if (orderError) {
      toast({ title: 'Error', description: orderError.message, variant: 'destructive' });
      return;
    }

    const itemsToInsert = orderItems.map(item => ({
      order_id: order.id,
      item_id: item.item_id,
      quantity: item.quantity,
      picked_quantity: 0,
      picking_status: 'pending'
    }));

    await supabase.from('picking_order_items').insert(itemsToInsert);

    toast({ title: 'Berhasil', description: `Order ${orderNumber} berhasil dibuat` });
    
    setCustomerId('');
    setOrderDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setOrderItems([]);
    setShowOrderForm(false);
    fetchOrders();
  };

  const openPickingDialog = async (order: PickingOrder, orderItem: PickingOrderItem) => {
    setSelectedOrder(order);
    setSelectedOrderItem(orderItem);
    setScanMode(false);
    setScanInput('');
    setSelectedBatchId('');
    
    // Fetch available batches for this item
    const { data } = await supabase
      .from('item_batches')
      .select('id, batch_code, quantity, lot:lots(id, code, rack:racks(code, zone:zones(name)))')
      .eq('item_id', orderItem.item_id)
      .eq('status', 'active')
      .gt('quantity', 0);
    
    if (data) setBatches(data);
    setShowPickingDialog(true);
  };

  const handleScanInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && scanInput) {
      const batch = batches.find(b => b.batch_code === scanInput || b.lot?.code === scanInput);
      if (batch) {
        setSelectedBatchId(batch.id);
        toast({ 
          title: 'Berhasil', 
          description: `Batch ${batch.batch_code} ditemukan di ${batch.lot?.code} - ${batch.lot?.rack?.code}` 
        });
      } else {
        toast({ title: 'Error', description: 'Batch/Lot tidak ditemukan', variant: 'destructive' });
      }
      setScanInput('');
    }
  };

  const executePicking = async () => {
    if (!selectedOrderItem || !selectedBatchId) {
      toast({ title: 'Error', description: 'Harap pilih batch', variant: 'destructive' });
      return;
    }

    const batch = batches.find(b => b.id === selectedBatchId);
    if (!batch) return;

    // Update picking order item
    await supabase
      .from('picking_order_items')
      .update({ 
        batch_id: selectedBatchId,
        lot_id: batch.lot?.id,
        picked_quantity: selectedOrderItem.quantity,
        picking_status: 'picked',
        picked_at: new Date().toISOString()
      })
      .eq('id', selectedOrderItem.id);

    // Update batch quantity
    await supabase
      .from('item_batches')
      .update({ quantity: batch.quantity - selectedOrderItem.quantity })
      .eq('id', selectedBatchId);

    // Update lot current_load
    if (batch.lot?.id) {
      const { data: currentLot } = await supabase
        .from('lots')
        .select('current_load')
        .eq('id', batch.lot.id)
        .single();
      
      if (currentLot) {
        await supabase
          .from('lots')
          .update({ current_load: currentLot.current_load - selectedOrderItem.quantity })
          .eq('id', batch.lot.id);
      }
    }

    toast({ title: 'Berhasil', description: 'Barang berhasil di-pick' });
    setShowPickingDialog(false);
    fetchOrders();
  };

  const completeOrder = async (order: PickingOrder) => {
    const allPicked = order.items?.every(item => item.picking_status === 'picked');
    
    if (!allPicked) {
      toast({ title: 'Error', description: 'Semua barang harus di-pick terlebih dahulu', variant: 'destructive' });
      return;
    }

    // Update order status
    await supabase
      .from('picking_orders')
      .update({ status: 'ready_to_ship' })
      .eq('id', order.id);

    // Generate manifest
    const manifestNumber = `MNF-${Date.now()}`;
    const { data: manifest } = await supabase
      .from('outbound_manifests')
      .insert([{
        manifest_number: manifestNumber,
        order_id: order.id,
        customer_id: order.customer_id,
        manifest_date: new Date().toISOString().split('T')[0],
        total_items: order.items?.length || 0,
        status: 'ready',
        notes: `Generated from order ${order.order_number}`
      }])
      .select()
      .single();

    // Record stock movements
    if (order.items) {
      for (const item of order.items) {
        await supabase
          .from('stock_movements')
          .insert([{
            movement_type: 'OUTBOUND',
            item_id: item.item_id,
            batch_id: item.batch_id,
            lot_id: item.lot_id,
            quantity: item.quantity,
            reference_number: manifestNumber,
            notes: `Outbound for order ${order.order_number}`,
            ceisa_status: 'pending'
          }]);
      }
    }

    // Auto-report to CEISA
    toast({ title: 'Mengirim ke CEISA...', description: 'Sedang melaporkan ke Bea Cukai' });
    
    const ceisaResult = await reportOutboundToCeisa(order.id);
    
    if (ceisaResult.success) {
      toast({ 
        title: 'Berhasil', 
        description: `Order ${order.order_number} siap dikirim dan dilaporkan ke CEISA (${ceisaResult.docNumber}). Manifest: ${manifestNumber}` 
      });
    } else {
      toast({ 
        title: 'Warning', 
        description: `Order selesai tapi gagal kirim ke CEISA: ${ceisaResult.error}`,
        variant: 'destructive'
      });
    }
    
    fetchOrders();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Picking Orders</h1>
            <p className="text-gray-600 mt-1">Kelola picking dan outbound barang</p>
          </div>
          <Button onClick={() => setShowOrderForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Buat Order Baru
          </Button>
        </div>

        {/* Order Form Dialog */}
        <Dialog open={showOrderForm} onOpenChange={setShowOrderForm}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Buat Picking Order</DialogTitle>
              <DialogDescription>Buat permintaan pengambilan barang</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Customer *</Label>
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.customer_code} - {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tanggal Order *</Label>
                  <Input
                    type="date"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label>Catatan</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Catatan tambahan..."
                />
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Tambah Barang</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <Label>Barang *</Label>
                    <Select value={itemId} onValueChange={setItemId}>
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
                    <Label>Quantity *</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="0"
                      />
                      <Button type="button" onClick={addItemToOrder}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {orderItems.length > 0 && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Daftar Barang ({orderItems.length})</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Barang</TableHead>
                        <TableHead>Qty</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderItems.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.item?.name}</TableCell>
                          <TableCell>{item.quantity} {item.item?.unit}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowOrderForm(false)}>
                Batal
              </Button>
              <Button onClick={saveOrder}>
                Simpan Order
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Picking Dialog */}
        <Dialog open={showPickingDialog} onOpenChange={setShowPickingDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Pick Barang</DialogTitle>
              <DialogDescription>
                Scan barcode untuk mengambil {selectedOrderItem?.item?.name}
              </DialogDescription>
            </DialogHeader>

            {selectedOrderItem && (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-900">Detail:</p>
                  <div className="mt-2 space-y-1 text-sm text-blue-800">
                    <p>Quantity: {selectedOrderItem.quantity} {selectedOrderItem.item?.unit}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant={scanMode ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setScanMode(!scanMode)}
                  >
                    <Scan className="h-4 w-4 mr-2" />
                    {scanMode ? 'Mode Scan Aktif' : 'Aktifkan Scanner'}
                  </Button>
                </div>

                {scanMode ? (
                  <div>
                    <Label>Scan Barcode Batch/Lot</Label>
                    <Input
                      value={scanInput}
                      onChange={(e) => setScanInput(e.target.value)}
                      onKeyDown={handleScanInput}
                      placeholder="Scan barcode..."
                      autoFocus
                    />
                    <p className="text-xs text-gray-500 mt-1">Tekan Enter setelah scan</p>
                  </div>
                ) : (
                  <div>
                    <Label>Pilih Batch *</Label>
                    <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih batch" />
                      </SelectTrigger>
                      <SelectContent>
                        {batches.map((batch) => (
                          <SelectItem key={batch.id} value={batch.id}>
                            {batch.batch_code} - {batch.lot?.code} ({batch.lot?.rack?.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {selectedBatchId && (
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm font-medium text-green-900">Lokasi:</p>
                    <p className="text-sm text-green-800 mt-1">
                      <MapPin className="h-3 w-3 inline mr-1" />
                      {batches.find(b => b.id === selectedBatchId)?.lot?.code} - 
                      {batches.find(b => b.id === selectedBatchId)?.lot?.rack?.code}
                    </p>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPickingDialog(false)}>
                Batal
              </Button>
              <Button onClick={executePicking}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Konfirmasi Pick
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Orders List */}
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{order.order_number}</CardTitle>
                    <CardDescription>
                      {order.customer?.name} • {new Date(order.order_date).toLocaleDateString('id-ID')}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      order.status === 'ready_to_ship' ? 'default' : 
                      order.status === 'pending' ? 'secondary' : 'outline'
                    }>
                      {order.status === 'ready_to_ship' ? 'Ready to Ship' : 
                       order.status === 'pending' ? 'Pending' : order.status}
                    </Badge>
                    {order.status === 'pending' && order.items?.every(i => i.picking_status === 'picked') && (
                      <Button size="sm" onClick={() => completeOrder(order)}>
                        <Truck className="h-4 w-4 mr-2" />
                        Complete Order
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Barang</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Lokasi</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>CEISA</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.items?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.item?.name}</p>
                            <p className="text-sm text-gray-500">{item.item?.sku}</p>
                          </div>
                        </TableCell>
                        <TableCell>{item.quantity} {item.item?.unit}</TableCell>
                        <TableCell>
                          {item.batch?.lot ? (
                            <div className="text-sm">
                              <p className="font-medium">{item.batch.lot.code}</p>
                              <p className="text-gray-500">{item.batch.lot.rack?.code}</p>
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.picking_status === 'picked' ? 'default' : 'secondary'}>
                            {item.picking_status === 'picked' ? 'Picked' : 'Pending'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {order.ceisa_status && (
                            <Badge className={
                              order.ceisa_status === 'sent' ? 'bg-blue-100 text-blue-700 border-blue-400 font-semibold' : 
                              order.ceisa_status === 'failed' ? 'bg-red-100 text-red-700 border-red-400 font-semibold' : 
                              'bg-gray-100 text-gray-700 border-gray-300 font-semibold'
                            } variant="outline">
                              {order.ceisa_status === 'sent' ? '✓ SENT' : 
                               order.ceisa_status === 'failed' ? '✗ FAILED' : 'PENDING'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.picking_status === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => openPickingDialog(order, item)}
                            >
                              <Package className="h-4 w-4 mr-2" />
                              Pick
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}