import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { CeisaRequest, CeisaResponse } from './types.ts';

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

    const { id_dokumen, payload }: CeisaRequest = await req.json();

    if (!id_dokumen || !payload) {
      throw new Error('id_dokumen and payload are required');
    }

    await supabaseClient.from('logs').insert({
      id_dokumen,
      action: 'ceisa_send_request',
      request_payload: payload,
      status: 'pending'
    });

    const ceisaEndpoint = Deno.env.get('CEISA_API_ENDPOINT') || 'https://api-ceisa40.customs.go.id/v1/documents';
    const ceisaToken = Deno.env.get('CEISA_API_TOKEN') || '';

    const ceisaResponse = await fetch(ceisaEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ceisaToken}`,
      },
      body: JSON.stringify(payload),
    });

    const ceisaData = await ceisaResponse.json();
    const isSuccess = ceisaResponse.ok;

    await supabaseClient
      .from('customs_docs')
      .update({
        status: isSuccess ? 'sent' : 'failed',
        ceisa_response: ceisaData,
        updated_at: new Date().toISOString()
      })
      .eq('id_dokumen', id_dokumen);

    await supabaseClient.from('logs').insert({
      id_dokumen,
      action: 'ceisa_send_response',
      response_data: ceisaData,
      status: isSuccess ? 'success' : 'failed',
      error_message: isSuccess ? null : ceisaData.message || 'Unknown error'
    });

    const result: CeisaResponse = {
      success: isSuccess,
      message: isSuccess ? 'Document sent to CEISA successfully' : 'Failed to send document to CEISA',
      data: ceisaData
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: isSuccess ? 200 : 400,
    });

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
