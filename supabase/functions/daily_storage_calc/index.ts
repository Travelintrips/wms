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

    const { data: activeMovements, error: fetchError } = await supabaseClient
      .from('stock_movements')
      .select('id, lokasi, status')
      .in('status', ['Aktif', 'Dipindahkan']);

    if (fetchError) throw fetchError;

    let successCount = 0;
    let errorCount = 0;
    let totalBiayaHariIni = 0;
    const errors: any[] = [];

    for (const movement of activeMovements || []) {
      try {
        const calcResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/supabase-functions-calc_storage_cost`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_KEY')}`
          },
          body: JSON.stringify({
            stock_movement_id: movement.id
          })
        });

        if (calcResponse.ok) {
          successCount++;
          const result = await calcResponse.json();
          totalBiayaHariIni += result.data?.total_biaya || 0;
        } else {
          errorCount++;
          errors.push({ id: movement.id, error: await calcResponse.text() });
        }
      } catch (error) {
        errorCount++;
        errors.push({ id: movement.id, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    const { count: aktifCount } = await supabaseClient
      .from('stock_movements')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Aktif');

    const { count: dipindahCount } = await supabaseClient
      .from('stock_movements')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Dipindahkan');

    const { count: diambilCount } = await supabaseClient
      .from('stock_movements')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Diambil');

    const today = new Date().toISOString().split('T')[0];
    
    await supabaseClient
      .from('daily_summary')
      .upsert({
        tanggal: today,
        total_aktif: aktifCount || 0,
        total_dipindah: dipindahCount || 0,
        total_diambil: diambilCount || 0,
        total_biaya: totalBiayaHariIni
      }, {
        onConflict: 'tanggal'
      });

    await supabaseClient.from('logs').insert({
      entity_table: 'daily_summary',
      record_id: null,
      action_type: 'DAILY_CALC_BATCH',
      new_data: {
        total_processed: (activeMovements || []).length,
        success_count: successCount,
        error_count: errorCount,
        total_biaya_hari_ini: totalBiayaHariIni,
        errors: errors.length > 0 ? errors : null,
        message: `Daily storage calculation completed at ${new Date().toISOString()}`
      },
      changed_by: 'system_cron'
    });

    if (totalBiayaHariIni > 10000000) {
      await supabaseClient.from('logs').insert({
        entity_table: 'daily_summary',
        record_id: null,
        action_type: 'HIGH_COST_ALERT',
        new_data: {
          total_biaya: totalBiayaHariIni,
          threshold: 10000000,
          message: `⚠️ ALERT: Total biaya harian melebihi Rp 10 juta! Total: Rp ${totalBiayaHariIni.toLocaleString('id-ID')}`,
          tanggal: today
        },
        changed_by: 'system_alert'
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          total_processed: (activeMovements || []).length,
          success_count: successCount,
          error_count: errorCount,
          total_biaya_hari_ini: totalBiayaHariIni,
          alert_sent: totalBiayaHariIni > 10000000,
          errors: errors.length > 0 ? errors : null
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