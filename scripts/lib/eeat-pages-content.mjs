import { BASE_URL, AUTHOR_DISPLAY_NAME, PROFILE_URL_NEW } from './ceren-authority-config.mjs';

export function buildEeatPageHtml(type) {
  switch (type) {
    case 'editorial':
      return `<!-- wp:html -->
<h1>Editoryal Politika</h1>
<p>Bu politika, ${BASE_URL} üzerinde yayımlanan hukuk içeriklerinin nasıl hazırlandığını, kim tarafından kontrol edildiğini ve hangi kaynakların kullanıldığını açıklar.</p>
<h2>İçeriklerin hazırlanması</h2>
<p>Aile hukuku yazıları bilgilendirme amacıyla hazırlanır. Metinlerde reklam niteliği taşıyan “en iyi avukat”, “garantili sonuç” gibi doğrulanamaz ifadeler kullanılmaz.</p>
<h2>Kim tarafından kontrol edilir?</h2>
<p>Aile hukuku içerikleri ${AUTHOR_DISPLAY_NAME} tarafından hazırlanır veya hukuki açıdan kontrol edilir. Yazar kimliği profil sayfasında yer alır: <a href="${PROFILE_URL_NEW}">${AUTHOR_DISPLAY_NAME}</a>.</p>
<h2>Kaynak seçimi</h2>
<p>Öncelikli kaynaklar: Mevzuat Bilgi Sistemi, Resmî Gazete, TBMM, Adalet Bakanlığı, Anayasa Mahkemesi, Yargıtay ve Türkiye Barolar Birliği yayınlarıdır. Doğrulanmamış mevzuat bilgisi kesin dil ile sunulmaz.</p>
<h2>Güncellemeler</h2>
<p>İçerikler değiştiğinde son güncelleme tarihi güncellenir. Değişmeyen içeriklerde tarih yapay biçimde yenilenmez. Ayrıntılar için <a href="${BASE_URL}/icerik-guncelleme-politikasi/">içerik güncelleme politikası</a> sayfasına bakınız.</p>
<h2>Hata bildirimi</h2>
<p>Yanlış veya eksik bilgi tespit ederseniz <a href="${BASE_URL}/iletisim/">iletişim</a> sayfası üzerinden bildirimde bulunabilirsiniz. Bildirimler incelenir ve gerekli düzeltmeler yapılır.</p>
<!-- /wp:html -->`;
    case 'update-policy':
      return `<!-- wp:html -->
<h1>İçerik Güncelleme Politikası</h1>
<p>Bu sayfa, hukuk içeriklerinin ne zaman ve nasıl güncellendiğini açıklar.</p>
<ul>
<li><strong>İlk yayın tarihi:</strong> İçeriğin ilk yayımlandığı tarih korunur.</li>
<li><strong>Son güncelleme tarihi:</strong> Yalnızca içerikte gerçek bir değişiklik olduğunda güncellenir.</li>
<li><strong>Son hukuk kontrolü tarihi:</strong> Varsa özel alanda tutulur; otomatik olarak her sayfa yüklenişinde değiştirilmez.</li>
<li><strong>Hazırlayan / kontrol eden:</strong> Mümkün olduğunca ${AUTHOR_DISPLAY_NAME} olarak belirtilir.</li>
</ul>
<p>Mevzuat değişiklikleri şüpheli görüldüğünde içerik “manuel hukukçu kontrolü” bekleyen olarak işaretlenir; doğrulanmadan kesin ifade eklenmez.</p>
<!-- /wp:html -->`;
    case 'disclaimer':
      return `<!-- wp:html -->
<h1>Hukuki Bilgilendirme ve Sorumluluk Reddi</h1>
<p>Bu sitedeki yazılar genel bilgilendirme amacıyla hazırlanmıştır. Her dosya kendi koşulları içinde değerlendirilir; sitedeki bilgiler somut olayınıza özel hukuki tavsiye yerine geçmez.</p>
<p>Dava sonucu, başarı oranı veya kesin sonuç garantisi verilmez. Gizli müvekkil bilgileri ve doğrulanamayan başarı iddiaları yayımlanmaz.</p>
<p>Bireysel hukuki destek için bir avukata danışmanız önerilir. İletişim: <a href="${BASE_URL}/iletisim/">iletişim formu</a>.</p>
<!-- /wp:html -->`;
    case 'privacy':
      return `<!-- wp:html -->
<h1>Gizlilik Politikası</h1>
<p>Bu gizlilik politikası, ${BASE_URL} ziyaretçilerinden toplanabilecek sınırlı verilerin nasıl işlendiğine ilişkin genel bilgilendirme sunar.</p>
<h2>Toplanabilecek veriler</h2>
<p>İletişim formu üzerinden ilettiğiniz ad, e-posta ve mesaj içeriği; teknik olarak sunucu ve güvenlik logları; çerezler aracılığıyla elde edilen kullanım verileri.</p>
<h2>Kullanım amacı</h2>
<p>Veriler, taleplerinize yanıt vermek, site güvenliğini sağlamak ve yasal yükümlülükleri yerine getirmek için kullanılır. Veriler, reklam amaçlı üçüncü taraflara satılmaz.</p>
<h2>Haklarınız</h2>
<p>KVKK kapsamındaki haklarınız için <a href="${BASE_URL}/iletisim/">iletişim</a> kanallarından başvurabilirsiniz. Bu metin genel bilgilendirmedir; büro süreçlerinize özel politikalar manuel olarak genişletilebilir.</p>
<!-- /wp:html -->`;
    case 'cookies':
      return `<!-- wp:html -->
<h1>Çerez Politikası</h1>
<p>Bu site, temel işlevsellik ve performans için çerezler kullanabilir. Zorunlu çerezler sitenin çalışması için gerekli olabilir; analitik çerezler kullanılıyorsa tarayıcı ayarlarınızdan yönetilebilir.</p>
<p>Üçüncü taraf gömülü içerikler kendi çerez politikalarına tabi olabilir. Ayrıntılı talep ve talepleriniz için <a href="${BASE_URL}/gizlilik-politikasi/">gizlilik politikası</a> ve <a href="${BASE_URL}/iletisim/">iletişim</a> sayfalarını kullanınız.</p>
<!-- /wp:html -->`;
    default:
      return '';
  }
}
