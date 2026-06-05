export const mockCoupons = [
  {
    id: "1",
    title: "Şampiyonlar Ligi Özel Kombine",
    description: "Real Madrid ve Bayern Münih maçları için karşılıklı gol var garantisi.",
    matchTime: "2026-06-10T21:45:00",
    expiresAt: "2026-06-10T21:45:00",
    isPremium: true,
  },
  {
    id: "2",
    title: "Günün Bankosu",
    description: "Fenerbahçe - Galatasaray derbisinde ilk yarı 0.5 üst.",
    matchTime: "2026-06-08T19:00:00",
    expiresAt: "2026-06-08T19:00:00",
    isPremium: false,
  },
  {
    id: "3",
    title: "Sürpriz Kupon",
    description: "Premier Lig'de haftanın sürpriz beraberlikleri.",
    matchTime: "2026-06-12T16:00:00",
    expiresAt: "2026-06-12T16:00:00",
    isPremium: true,
  }
];

export const mockStats = {
  totalUsers: 1450,
  premiumUsers: 342,
  activeCoupons: 12
};
