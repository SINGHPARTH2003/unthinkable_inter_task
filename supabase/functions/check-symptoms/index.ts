import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symptoms } = await req.json();
    
    if (!symptoms || symptoms.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Symptoms cannot be empty" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Analyzing symptoms:", symptoms);

    // Call Lovable AI Gateway with Gemini model
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a medical information assistant. Based on symptoms provided, you will:
1. Suggest 2-4 POSSIBLE medical conditions that could match these symptoms
2. Provide general health recommendations
3. ALWAYS include a clear disclaimer that this is for educational purposes only

CRITICAL: Format your response EXACTLY as valid JSON with this structure:
{
  "probable_conditions": [
    {"name": "Condition Name", "likelihood": "high/medium/low", "description": "Brief description"}
  ],
  "recommendations": "General recommendations and next steps",
  "disclaimer": "Medical disclaimer text"
}

Keep responses professional, empathetic, and educational. Never diagnose definitively.`
          },
          {
            role: "user",
            content: `Analyze these symptoms: ${symptoms}`
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI gateway error:", aiResponse.status, await aiResponse.text());
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Service temporarily unavailable. Please contact support." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;

    if (!aiContent) {
      throw new Error("No content received from AI");
    }

    console.log("AI Response:", aiContent);

    // Parse the AI response - strip markdown code blocks if present
    let parsedResponse;
    try {
      let cleanContent = aiContent.trim();
      // Remove markdown code block syntax if present
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\n/, '').replace(/\n```$/, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\n/, '').replace(/\n```$/, '');
      }
      parsedResponse = JSON.parse(cleanContent);
    } catch (e) {
      console.error("Failed to parse AI response as JSON:", e);
      // Fallback: create structured response from text
      parsedResponse = {
        probable_conditions: [{ name: "Analysis Available", likelihood: "unknown", description: aiContent }],
        recommendations: "Please consult with a healthcare professional for proper evaluation.",
        disclaimer: "This information is for educational purposes only and not a substitute for professional medical advice."
      };
    }

    // Store in database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: dbError } = await supabase
      .from('symptom_checks')
      .insert({
        symptoms: symptoms,
        probable_conditions: parsedResponse.probable_conditions,
        recommendations: parsedResponse.recommendations
      });

    if (dbError) {
      console.error("Database error:", dbError);
      // Don't fail the request if DB insert fails
    }

    return new Response(
      JSON.stringify(parsedResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in check-symptoms function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error occurred" }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
