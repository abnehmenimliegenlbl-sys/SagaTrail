// Löscht die vom User am 28.07.2026 bestätigten 9 Test-Konten in Prod
// via POST /api/admin/user-delete (Endpunkt live ab dem nächsten Publish).
// Aufruf: node scripts/delete_test_users.cjs
const IDS = [
  "user_3GGy0Wno4Tt3tuvTGHQ41HRu5OB", // AiL
  "user_3GJTzfSdWjcmJKxpGjhZvErbaxB", // Ail
  "user_3GIepan6ZJoTx4MvDXRo9HfgkCA", // IPTV
  "user_3GuymMB1yaJy4fXX5MQfUQEkYIz", // XS
  "user_3Fzcsf30QrF4VKTweDmDGX3AZLU", // Rolf 1
  "user_3GkzSfs6IJQVxS1hwxKiSDkSNKx", // Rolf 2
  "user_3GnvFWE5SEvrde2i9oNccwmDp3P", // Rolf 3
  "user_3GibndTYlSWiwlEgrHi9PzHFtcR", // Rolo
  "user_3GdbFt7FAn4BheggZIJzVJGeuKJ", // test
  "user_3GdZekIg3rVAnPYkKKBbywoszZK", // SagaTrail (NICHT info@sagatrail.ch = user_3H8OR0…)
];
(async () => {
  for (const userId of IDS) {
    const res = await fetch("https://api.sagatrail.ch/api/admin/user-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": process.env.ADMIN_TOKEN },
      body: JSON.stringify({ userId }),
    });
    console.log(userId, res.status, (await res.text()).slice(0, 120));
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
