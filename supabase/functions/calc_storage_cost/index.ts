import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_KEY') ?? ''
    );

    const { stock_movement_id } = await req.json();

    if (!stock_movement_id) {
      throw new Error('stock_movement_id is required');
    }

    const { data: movement, error: fetchError } = await supabaseClient
      .from('stock_movements')
      .select('*, items(*)')
      .eq('id', stock_movement_id)
      .single();

    if (fetchError) throw fetchError;

    const tanggalMasuk = new Date(movement.tanggal_masuk);
    const today = new Date();
    const diffTime = today.getTime() - tanggalMasuk.getTime();
    const hariSimpan = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

    const beratKg = movement.berat_kg || movement.items?.actual_weight_kg || 0;
    const volumeM3 = movement.volume_m3 || movement.items?.volume_m3 || 0;

    let tarifPerKg = 0;
    if (movement.lokasi === 'Lini 1') {
      tarifPerKg = 1500;
    } else if (movement.lokasi === 'Lini 2') {
      tarifPerKg = 2500;
    }

    const biayaBerat = beratKg * tarifPerKg * hariSimpan;
    const biayaVolume = volumeM3 * 5000 * hariSimpan;
    const totalBiaya = biayaBerat + biayaVolume;

    const { error: updateError } = await supabaseClient
      .from('stock_movements')
      .update({
        hari_simpan: hariSimpan,
        total_biaya: totalBiaya
      })
      .eq('id', stock_movement_id);

    if (updateError) throw updateError;

    const { error: costError } = await supabaseClient
      .from('storage_costs')
      .insert({
        stock_movement_id: stock_movement_id,
        tanggal_hitung: today.toISOString().split('T')[0],
        hari_simpan: hariSimpan,
        berat_kg: beratKg,
        volume_m3: volumeM3,
        tarif_per_kg: tarifPerKg,
        biaya_berat: biayaBerat,
        biaya_volume: biayaVolume,
        total_biaya: totalBiaya,
        periode_akhir: today.toISOString()
      });

    if (costError) console.error('Cost insert error:', costError);

    await supabaseClient.from('logs').insert({
      entity_table: 'storage_costs',
      record_id: stock_movement_id,
      action_type: 'CALCULATE_COST',
      new_data: {
        hari_simpan: hariSimpan,
        total_biaya: totalBiaya,
        lokasi: movement.lokasi,
        message: `Biaya dihitung: Rp ${totalBiaya.toLocaleString('id-ID')} untuk ${hariSimpan} hari`
      },
      changed_by: 'system'
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          stock_movement_id,
          hari_simpan: hariSimpan,
          total_biaya: totalBiaya,
          lokasi: movement.lokasi
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});