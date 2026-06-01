export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response("Missing token", { status: 400 });
    }

    const formula = encodeURIComponent(`{Download Token}="${token}"`);
    const airtableUrl = `https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/${env.AIRTABLE_TABLE_NAME}?filterByFormula=${formula}`;

    const response = await fetch(airtableUrl, {
      headers: {
        Authorization: `Bearer ${env.AIRTABLE_TOKEN}`,
      },
    });

    const data = await response.json();

    if (!data.records || data.records.length === 0) {
      return new Response("Invalid token", { status: 403 });
    }

    const record = data.records[0];
    const fields = record.fields;

    // ⏱ Expiração
    const expiresAt = new Date(fields["Download Token Expires At"]);
    const now = new Date();

    if (expiresAt < now) {
      return new Response("Token expired", { status: 403 });
    }

    // 📊 Limite de downloads
    const downloadCount = fields["Download Count"] || 0;

    if (downloadCount >= 3) {
      return new Response("Download limit reached", { status: 429 });
    }

    // 📥 Buscar PDF no R2
    const object = await env.DOWNLOAD_BUCKET.get("starter-kit/Brazil Starter Kit Essential Tips for a Safe & Amazing Trip to Brazil.pdf");

    if (!object) {
      return new Response("File not found", { status: 404 });
    }

    // 🔄 Atualizar Airtable
    await fetch(`https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/${env.AIRTABLE_TABLE_NAME}/${record.id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${env.AIRTABLE_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: {
          "Download Count": downloadCount + 1,
          "Last Download At": new Date().toISOString(),
        },
      }),
    });

    return new Response(object.body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=Brazil-Starter-Kit.pdf",
      },
    });
  },
};