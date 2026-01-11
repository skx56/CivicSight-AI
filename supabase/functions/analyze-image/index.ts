import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const SYSTEM_PROMPT = `
You are an expert infrastructure auditor. Analyze the provided image of an urban environment.
Identify the primary infrastructure issue (e.g., Pothole, Broken Streetlight, Graffiti, Illegal Dumping, Cracked Sidewalk).
If no issue is found, return "None".
Estimate the severity on a scale of 1-10 (10 being immediate danger).
List the materials likely required for repair.
Estimate the labor hours required for a 2-person crew to fix it.

Return ONLY valid JSON in this format:
{
  "issue_type": "string",
  "severity_score": number,
  "materials_required": ["string", "string"],
  "estimated_labor_hours": number,
  "description": "short description of the defect"
}
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const { image } = await req.json();

    if (!image) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!OPENAI_API_KEY) {
      console.error("Missing OPENAI_API_KEY");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Call OpenAI GPT-4o
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this infrastructure image.",
              },
              {
                type: "image_url",
                image_url: {
                  url: image, // Expecting base64 data url or public URL
                },
              },
            ],
          },
        ],
        max_tokens: 300,
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error("OpenAI API Error: " + data.error.message);
    }

    const content = data.choices[0].message.content;
    
    // Naive JSON clean up if necessary (GPT-4o is usually good, but safety first)
    // Sometimes it wraps in ```json ... ```
    const cleanContent = content.replace(/```json/g, "").replace(/```/g, "").trim();
    
    const analysis = JSON.parse(cleanContent);

    return new Response(JSON.stringify(analysis), {
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });

  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*", 
      },
    });
  }
});
