'use strict';

// Serves only the public Supabase URL + publishable key so the frontend never
// hardcodes project-specific values. These are safe to expose to the browser
// by design — they're meaningless without the RLS policies on the database,
// and carry no write access (writes only happen server-side via /api/ask).
module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.status(200).json({
    url: process.env.SUPABASE_URL,
    publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY,
  });
};
