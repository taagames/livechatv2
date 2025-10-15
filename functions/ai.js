/**
 * Cloudflare Pages Function - Secure Hugging Face API Proxy
 * This function securely proxies requests to Hugging Face API
 * without exposing the API key to clients
 */

export async function onRequestPost({ request, env }) {
  try {
    // Parse the incoming request body
    const body = await request.json();

    // Make the request to Hugging Face API with the secure API key from environment
    const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.HF_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    // Parse and return the response
    const data = await response.json();
    
    return new Response(JSON.stringify(data), { 
      status: response.status,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*", // Adjust for your domain in production
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      } 
    });
  } catch (error) {
    console.error("Error in Hugging Face proxy function:", error);
    return new Response(
      JSON.stringify({ error: "Internal Server Error", message: error.message }), 
      { 
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  }
}

// Handle CORS preflight requests
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
