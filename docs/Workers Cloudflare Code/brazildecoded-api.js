// ============================================================
// Worker: brazildecoded-api
// Endpoint: POST /cadastro
// Função: validar Turnstile e encaminhar cadastro ao Make
//          (passthrough completo do payload do front)
// ============================================================

const ALLOWED_ORIGINS = [
  'https://brazildecoded.com.br',
  'https://www.brazildecoded.com.br',
  'http://localhost:8080',
];

const HOSTNAMES_VALIDOS = [
  'brazildecoded.com.br',
  'www.brazildecoded.com.br',
  'localhost',
];

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResponse(data, status, cors) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...cors,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function isValidEmail(email) {
  return typeof email === 'string'
    && email.length >= 5
    && email.length <= 254
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sanitizeString(val, maxLen) {
  if (typeof val !== 'string') return '';
  return val.trim().slice(0, maxLen);
}

// Sanitização leve do payload do front, mantendo TODAS as chaves originais
function sanitizePayload(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const out = {};
  const limits = {
    name: 100,
    email: 254,
    type: 50,
    source: 100,
    form_token: 100,
    page: 500,
    referrer: 2000,
    user_agent: 1000,
    company: 200,
    consent: 10,
    turnstile_token: 5000,
    form_started_at: 50,
    utm_source: 200,
    utm_medium: 200,
    utm_campaign: 200,
    utm_content: 200,
    utm_term: 200,
  };
  for (const key of Object.keys(raw)) {
    const max = limits[key] || 500;
    const v = raw[key];
    if (typeof v === 'boolean') {
      out[key] = v;
    } else if (typeof v === 'number') {
      out[key] = v;
    } else {
      out[key] = sanitizeString(v, max);
    }
  }
  return out;
}

// ------------------------------------------------------------
// Validação Turnstile
// ------------------------------------------------------------

async function verificarTurnstile(token, ip, secret) {
  const formData = new FormData();
  formData.append('secret', secret);
  formData.append('response', token);
  if (ip) formData.append('remoteip', ip);

  const res = await fetch(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    { method: 'POST', body: formData }
  );

  if (!res.ok) {
    throw new Error(`Turnstile API retornou ${res.status}`);
  }

  return await res.json();
}

// ------------------------------------------------------------
// Envio para o Make
// ------------------------------------------------------------

async function enviarParaMake(payload, webhookUrl) {
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const erro = await res.text().catch(() => '');
    throw new Error(`Make webhook falhou (${res.status}): ${erro}`);
  }

  return res;
}

// ------------------------------------------------------------
// Handler principal
// ------------------------------------------------------------

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin);

    // ----- Preflight CORS -----
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    // ----- Roteamento -----
    const url = new URL(request.url);

    if (url.pathname === '/health' && request.method === 'GET') {
      return jsonResponse({ status: 'ok', service: 'brazildecoded-api' }, 200, cors);
    }

    if (url.pathname !== '/cadastro' || request.method !== 'POST') {
      return jsonResponse({ erro: 'Rota não encontrada' }, 404, cors);
    }

    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      return jsonResponse({ erro: 'Origem não autorizada' }, 403, cors);
    }

    if (!env.TURNSTILE_SECRET || !env.MAKE_WEBHOOK_URL) {
      console.error('Variáveis de ambiente faltando');
      return jsonResponse({ erro: 'Servidor mal configurado' }, 500, cors);
    }

    // ----- Parse do body -----
    let raw;
    try {
      raw = await request.json();
    } catch {
      return jsonResponse({ erro: 'JSON inválido' }, 400, cors);
    }

    // ----- Sanitização preservando chaves originais -----
    const data = sanitizePayload(raw);

    // ----- Validações mínimas -----
    const name = (data.name || '').trim();
    const email = (data.email || '').toLowerCase();
    const token = data.turnstile_token || '';

    if (!name || name.length < 2) {
      return jsonResponse({ erro: 'Nome inválido' }, 400, cors);
    }

    if (!isValidEmail(email)) {
      return jsonResponse({ erro: 'Email inválido' }, 400, cors);
    }

    if (!token) {
      return jsonResponse({ erro: 'Verificação anti-bot ausente' }, 400, cors);
    }

    // ----- Validação Turnstile -----
    const ip = request.headers.get('CF-Connecting-IP') || '';

    let verificacao;
    try {
      verificacao = await verificarTurnstile(token, ip, env.TURNSTILE_SECRET);
    } catch (err) {
      console.error('Erro ao validar Turnstile:', err.message);
      return jsonResponse({ erro: 'Falha temporária. Tente novamente.' }, 502, cors);
    }

    if (!verificacao.success) {
      console.warn('Turnstile rejeitou:', verificacao['error-codes']);
      return jsonResponse({ erro: 'Falha na verificação anti-bot' }, 403, cors);
    }

    if (!HOSTNAMES_VALIDOS.includes(verificacao.hostname)) {
      console.warn('Hostname inesperado:', verificacao.hostname);
      return jsonResponse({ erro: 'Origem inválida' }, 403, cors);
    }

    // ----- Monta payload para o Make: passthrough completo + meta -----
    // Remove turnstile_token do payload (não interessa pro Make)
    const { turnstile_token, ...rest } = data;

    const payload = {
      ...rest,
      email,
      meta: {
        ip,
        country: request.headers.get('CF-IPCountry') || '',
        user_agent: request.headers.get('User-Agent') || '',
        referer: request.headers.get('Referer') || '',
        timestamp: new Date().toISOString(),
        turnstile_hostname: verificacao.hostname,
        turnstile_action: verificacao.action || '',
      },
    };

    // ----- Envia para o Make -----
    try {
      await enviarParaMake(payload, env.MAKE_WEBHOOK_URL);
    } catch (err) {
      console.error('Erro ao enviar para Make:', err.message);
      return jsonResponse(
        { erro: 'Não foi possível processar agora. Tente novamente em instantes.' },
        502,
        cors
      );
    }

    return jsonResponse(
      { sucesso: true, mensagem: 'Cadastro realizado com sucesso!' },
      200,
      cors
    );
  },
};