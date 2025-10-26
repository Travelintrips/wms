import { supabase } from './supabase';

interface CeisaReportData {
  documentType: 'BC23' | 'BC40';
  transactionType: 'INBOUND' | 'OUTBOUND';
  transactionId: string;
  items: Array<{
    sku: string;
    name: string;
    quantity: number;
    unit: string;
  }>;
  referenceNumber: string;
  notes?: string;
}

export async function sendToCeisa(data: CeisaReportData) {
  try {
    // Create customs document
    const docNumber = `${data.documentType}-${Date.now()}`;
    
    const { data: customsDoc, error: docError } = await supabase
      .from('customs_docs')
      .insert([{
        document_type: data.documentType,
        document_number: docNumber,
        status: 'draft',
        payload: {
          transaction_type: data.transactionType,
          transaction_id: data.transactionId,
          items: data.items,
          reference_number: data.referenceNumber,
          notes: data.notes,
          timestamp: new Date().toISOString()
        }
      }])
      .select()
      .single();

    if (docError) throw docError;

    // Call CEISA adapter edge function
    const { data: ceisaResponse, error: ceisaError } = await supabase.functions.invoke(
      'supabase-functions-ceisa_adapter',
      {
        body: {
          id_dokumen: customsDoc.id_dokumen,
          payload: customsDoc.payload
        }
      }
    );

    if (ceisaError) {
      // Update status to failed
      await supabase
        .from('customs_docs')
        .update({ status: 'failed' })
        .eq('id_dokumen', customsDoc.id_dokumen);
      
      throw ceisaError;
    }

    return {
      success: true,
      docId: customsDoc.id,
      docNumber: docNumber,
      ceisaResponse
    };

  } catch (error) {
    console.error('CEISA send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function reportInboundToCeisa(receiptId: string) {
  // Fetch receipt with items
  const { data: receipt } = await supabase
    .from('inbound_receipts')
    .select('*, items:inbound_receipt_items(*, item:items(*))')
    .eq('id', receiptId)
    .single();

  if (!receipt) throw new Error('Receipt not found');

  const items = receipt.items.map((item: any) => ({
    sku: item.item.sku,
    name: item.item.name,
    quantity: item.quantity,
    unit: item.item.unit
  }));

  const result = await sendToCeisa({
    documentType: 'BC23',
    transactionType: 'INBOUND',
    transactionId: receiptId,
    items,
    referenceNumber: receipt.receipt_number,
    notes: receipt.notes
  });

  if (result.success) {
    // Update receipt with CEISA status
    await supabase
      .from('inbound_receipts')
      .update({
        ceisa_status: 'sent',
        ceisa_doc_id: result.docId
      })
      .eq('id', receiptId);
  }

  return result;
}

export async function reportOutboundToCeisa(orderId: string) {
  // Fetch order with items
  const { data: order } = await supabase
    .from('picking_orders')
    .select('*, items:picking_order_items(*, item:items(*))')
    .eq('id', orderId)
    .single();

  if (!order) throw new Error('Order not found');

  const items = order.items.map((item: any) => ({
    sku: item.item.sku,
    name: item.item.name,
    quantity: item.quantity,
    unit: item.item.unit
  }));

  const result = await sendToCeisa({
    documentType: 'BC40',
    transactionType: 'OUTBOUND',
    transactionId: orderId,
    items,
    referenceNumber: order.order_number,
    notes: order.notes
  });

  if (result.success) {
    // Update order with CEISA status
    await supabase
      .from('picking_orders')
      .update({
        ceisa_status: 'sent',
        ceisa_doc_id: result.docId
      })
      .eq('id', orderId);
  }

  return result;
}
