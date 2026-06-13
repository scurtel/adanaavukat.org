import { getWpConfig, getAuthHeader } from './lib/env.mjs';

async function checkConnection() {
  const { baseUrl, username, appPassword } = getWpConfig();

  if (!username || !appPassword) {
    console.log('SONUÇ: BAŞARISIZ — WordPress kimlik bilgileri .env dosyasında tanımlı değil.');
    process.exit(1);
  }

  const url = `${baseUrl}/wp-json/wp/v2/users/me`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        Authorization: getAuthHeader(username, appPassword),
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log('SONUÇ: BAŞARILI — WordPress REST API bağlantısı kuruldu.');
      console.log(`Kullanıcı ID: ${data.id ?? 'bilinmiyor'}`);
      console.log(`Görünen ad: ${data.name ?? 'bilinmiyor'}`);
      process.exit(0);
    }

    console.log(`SONUÇ: BAŞARISIZ — HTTP ${response.status} ${response.statusText}`);
    if (response.status === 401) {
      console.log(
        'Not: Kimlik bilgilerini kontrol edin. Kullanıcı adı ve Application Password doğru sırada olmalıdır.'
      );
    }
    process.exit(1);
  } catch (error) {
    console.log(`SONUÇ: BAŞARISIZ — ${error.message}`);
    process.exit(1);
  }
}

checkConnection();
