/**
 * .htaccess düzeltmeleri — canonical host + bozuk satır onarımı.
 */

export function buildFixedHtaccess(currentContent) {
  let content = String(currentContent || '');

  // Bozuk bitişik satır: RedirectMatch sonuna yapışmış RewriteRule [G,L]
  content = content.replace(
    /RedirectMatch 410 \^\/\(item\|prizes\|product\|shop\|urun\|store\)\/\.\+\$RewriteRule \^\(\.\*\)\$ - \[G,L\]\s*/g,
    'RedirectMatch 410 ^/(item|prizes|product|shop|urun|store)/.+$\n'
  );

  // Yinelenen RedirectMatch satırı varsa tekilleştir
  const dup410 =
    /RedirectMatch 410 \^\/\(item\|prizes\|product\|shop\|urun\|store\)\/\.\+\$\s*\nRedirectMatch 410 \^\/\(item\|prizes\|product\|shop\|urun\|store\)\/\.\+\$/g;
  content = content.replace(dup410, 'RedirectMatch 410 ^/(item|prizes|product|shop|urun|store)/.+$');

  const canonicalBlock = `# ===============================
# Canonical host redirects (safe SEO round 1)
# www -> apex HTTPS, path + query preserved
# ===============================
<IfModule mod_rewrite.c>
RewriteEngine On
RewriteCond %{HTTP_HOST} ^www\\.adanaavukat\\.org$ [NC]
RewriteRule ^(.*)$ https://adanaavukat.org/$1 [R=301,L,QSA]
</IfModule>

`;

  if (!content.includes('Canonical host redirects (safe SEO round 1)')) {
    content = canonicalBlock + content;
  }

  return content.trimEnd() + '\n';
}
