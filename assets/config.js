// Конфигурация сайта для карты и расположения (Батуми, Гонио)
window.SITE_CONFIG = {
  // API-ключ Яндекс.Карт (получить в кабинете developer.tech.yandex.ru)
  yandexApiKey: "",

  // Координаты и адрес клубного дома
  building: {
    coords: [41.5762, 41.5705], // Петре Ибери 51, Гонио
    zoom: 15,
    label: "AURUM FORT",
    address: "Петре Ибери 51, Гонио, Батуми"
  },

  // Вкладка «Инфраструктура» — плоский список с таймингами (макет, стр. 19)
  // name/time — русский (по умолчанию); name_ka/time_ka и name_en/time_en —
  // переводы, main.js берёт нужное поле по текущему языку сайта (js/i18n.js).
  poi: [
    {
      name: "Магазин Nikora (24/7)",
      name_ka: "მაღაზია Nikora (24/7)",
      name_en: "Nikora store (24/7)",
      coords: [41.5752, 41.5710],
      time: "5 минут",
      time_ka: "5 წუთი",
      time_en: "5 min"
    },
    {
      name: "Магазин Spar",
      name_ka: "მაღაზია Spar",
      name_en: "Spar store",
      coords: [41.5713, 41.5668],
      time: "5 минут",
      time_ka: "5 წუთი",
      time_en: "5 min"
    },
    {
      name: "ТЦ Metro City Batumi",
      name_ka: "სავაჭრო ცენტრი Metro City Batumi",
      name_en: "Metro City Batumi mall",
      coords: [41.6234, 41.5942],
      time: "25 минут",
      time_ka: "25 წუთი",
      time_en: "25 min"
    },
    {
      name: "Больницы и клиники",
      name_ka: "საავადმყოფოები და კლინიკები",
      name_en: "Hospitals and clinics",
      coords: [41.6442, 41.6210],
      time: "30 минут",
      time_ka: "30 წუთი",
      time_en: "30 min"
    },
    {
      name: "Школа №30",
      name_ka: "სკოლა №30",
      name_en: "School No. 30",
      coords: [41.5620, 41.5720],
      time: "3 минуты",
      time_ka: "3 წუთი",
      time_en: "3 min"
    },
    {
      name: "Аэропорт Батуми",
      name_ka: "ბათუმის აეროპორტი",
      name_en: "Batumi Airport",
      coords: [41.6027, 41.6022],
      time: "15 минут",
      time_ka: "15 წუთი",
      time_en: "15 min"
    },
    {
      name: "Центр Батуми",
      name_ka: "ბათუმის ცენტრი",
      name_en: "Batumi center",
      coords: [41.6370, 41.6160],
      time: "25 минут",
      time_ka: "25 წუთი",
      time_en: "25 min"
    }
  ],

  // Вкладка «Маршруты» — строятся через OSRM (макет, стр. 20)
  routes: [
    {
      name: "Пляж Гонио",
      name_ka: "გონიოს პლაჟი",
      name_en: "Gonio beach",
      coords: [41.5694, 41.5655],
      time: "5 минут на гольф-каре",
      time_ka: "5 წუთი გოლფ-კარით",
      time_en: "5 min by golf cart"
    },
    {
      name: "Крепость Гонио-Апсарос, II век",
      name_ka: "გონიო-აფსაროსის ციხე, II საუკუნე",
      name_en: "Gonio-Apsaros fortress, 2nd century",
      coords: [41.5728, 41.5746],
      time: "7 минут",
      time_ka: "7 წუთი",
      time_en: "7 min"
    },
    {
      name: "Смотровая площадка Крест Гонио (320 м)",
      name_ka: "სანახაობის მოედანი გონიოს ჯვარი (320 მ)",
      name_en: "Gonio Cross viewpoint (320 m)",
      coords: [41.5683, 41.5839],
      time: "15 минут пешком",
      time_ka: "15 წუთი ფეხით",
      time_en: "15 min on foot"
    },
    {
      name: "Турецкая граница (Сарпи)",
      name_ka: "თურქეთის საზღვარი (საფი)",
      name_en: "Turkish border (Sarpi)",
      coords: [41.5215, 41.5540],
      time: "8 минут",
      time_ka: "8 წუთი",
      time_en: "8 min"
    },
    {
      name: "Нац. парк Мтирала, ЮНЕСКО",
      name_ka: "მთირალას ეროვნული პარკი, იუნესკო",
      name_en: "Mtirala National Park, UNESCO",
      coords: [41.6764, 41.8705],
      time: "25 минут",
      time_ka: "25 წუთი",
      time_en: "25 min"
    },
    {
      name: "Нац. парк Мачахела",
      name_ka: "მაჭახელას ეროვნული პარკი",
      name_en: "Machakhela National Park",
      coords: [41.5218, 41.7925],
      time: "40 минут",
      time_ka: "40 წუთი",
      time_en: "40 min"
    }
  ]
};
