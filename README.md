# HEBBUNA STORE

Toko online hijab HEBBUNA. Dibuat dengan Next.js App Router, React, TypeScript, Tailwind CSS, dan Supabase.

## Menjalankan project

1. Jalankan `npm install`.
2. Salin `.env.example` menjadi `.env.local`, lalu isi URL dan publishable/anon key Supabase yang sama dengan kasir:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
   ```

3. Jalankan `npm run dev` dan buka `http://localhost:3000`.

Perintah lain: `npm run lint`, `npm run build`, dan `npm run start`.

## Struktur utama

- `app/layout.tsx`: metadata, font, dan CSS global.
- `app/page.tsx`: halaman utama toko.
- `src/App.tsx`: katalog, keranjang, checkout, dan sesi pelanggan.
- `src/components/AdminPanel.tsx`: panel pesanan online admin.
- `supabase/migrations`: perubahan skema Supabase.

Kunci `NEXT_PUBLIC_` memang dikirim ke browser; gunakan hanya publishable/anon key. Jangan pernah menaruh service-role key di file environment frontend.
