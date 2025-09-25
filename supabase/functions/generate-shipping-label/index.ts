import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { shipment_id, label_size, barcode_data, shipment_details } = await req.json();

    console.log('Generating shipping label for shipment:', shipment_id);

    // Generate HTML content for the shipping label
    const htmlContent = generateLabelHTML(shipment_details, barcode_data, label_size);

    // Convert HTML to PDF using a simple PDF generation approach
    // For a production system, you'd want to use a proper PDF library
    const labelPath = `labels/${shipment_id}_${Date.now()}.pdf`;

    // Store the label (in a real implementation, you'd use a PDF generation library)
    // For now, we'll return a placeholder response
    const pdfBuffer = await generatePDFBuffer(htmlContent);

    // Upload to Supabase Storage
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { error: uploadError } = await supabase.storage
      .from('shipping-labels')
      .upload(labelPath, pdfBuffer, {
        contentType: 'application/pdf'
      });

    if (uploadError) {
      throw uploadError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        label_path: labelPath,
        message: 'Shipping label generated successfully'
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error generating shipping label:', error);
    return new Response(
      JSON.stringify({ 
        error: (error as Error).message || 'Failed to generate shipping label' 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});

function generateLabelHTML(shipmentDetails: any, barcodeData: string, labelSize: string): string {
  const { orders, branches, shipping_address } = shipmentDetails;

  const fromAddress = `${branches.name}\n${branches.address}\n${branches.city}, ${branches.state} - ${branches.pincode}\nPhone: ${branches.phone}`;
  
  const toAddress = `${shipping_address.name}\n${shipping_address.address}\n${shipping_address.city}, ${shipping_address.state} - ${shipping_address.pincode}\nPhone: ${shipping_address.phone}`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Shipping Label</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
          background: white;
        }
        .label-container {
          width: 100%;
          max-width: ${labelSize === 'A4' ? '210mm' : labelSize === 'A5' ? '148mm' : '105mm'};
          border: 2px solid #000;
          padding: 15px;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #000;
          padding-bottom: 10px;
          margin-bottom: 15px;
        }
        .address-section {
          display: flex;
          justify-content: space-between;
          margin-bottom: 15px;
        }
        .address-box {
          width: 48%;
          border: 1px solid #ccc;
          padding: 10px;
          min-height: 80px;
        }
        .address-title {
          font-weight: bold;
          text-decoration: underline;
          margin-bottom: 5px;
        }
        .shipment-info {
          border-top: 1px solid #000;
          padding-top: 10px;
          margin-top: 15px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
        }
        .barcode {
          text-align: center;
          margin: 15px 0;
          font-family: monospace;
          font-size: 14px;
          letter-spacing: 2px;
          border: 1px solid #000;
          padding: 10px;
        }
        @media print {
          body { margin: 0; }
        }
      </style>
    </head>
    <body>
      <div class="label-container">
        <div class="header">
          <h2>SHIPPING LABEL</h2>
          <div>AWB: ${shipmentDetails.awb_number || 'N/A'} | Order: ${orders.order_no}</div>
        </div>
        
        <div class="address-section">
          <div class="address-box">
            <div class="address-title">FROM:</div>
            <div style="white-space: pre-line;">${fromAddress}</div>
          </div>
          <div class="address-box">
            <div class="address-title">TO:</div>
            <div style="white-space: pre-line;">${toAddress}</div>
          </div>
        </div>
        
        <div class="barcode">
          <div>||||| ${barcodeData} |||||</div>
        </div>
        
        <div class="shipment-info">
          <div class="info-row">
            <span><strong>Weight:</strong> ${shipmentDetails.weight_kg || 'N/A'} kg</span>
            <span><strong>COD:</strong> ₹${shipmentDetails.cod_amount || 0}</span>
          </div>
          <div class="info-row">
            <span><strong>Courier:</strong> ${shipmentDetails.courier_provider?.toUpperCase()}</span>
            <span><strong>Type:</strong> ${shipmentDetails.delivery_type}</span>
          </div>
          <div class="info-row">
            <span><strong>Order Value:</strong> ₹${orders.total_amount}</span>
            <span><strong>Date:</strong> ${new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

async function generatePDFBuffer(htmlContent: string): Promise<Uint8Array> {
  // This is a simplified implementation
  // In production, you'd use a proper PDF generation library like Puppeteer or jsPDF
  
  // For now, we'll return a simple text-based representation
  // You can integrate with libraries like:
  // - Puppeteer for HTML to PDF conversion
  // - jsPDF for programmatic PDF creation
  // - PDFKit for advanced PDF features
  
  const pdfContent = `PDF PLACEHOLDER - SHIPPING LABEL\n\n${htmlContent.replace(/<[^>]*>/g, '')}`;
  return new TextEncoder().encode(pdfContent);
}