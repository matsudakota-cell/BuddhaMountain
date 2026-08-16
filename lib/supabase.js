'use strict';

const { createClient } = require('@supabase/supabase-js');

let adminClient = null;

function getAdminClient() {
  if (adminClient) return adminClient;

  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY must be set');
  }

  adminClient = createClient(url, secretKey, {
    auth: { persistSession: false },
  });
  return adminClient;
}

module.exports = { getAdminClient };
