// Catalogue data. Add new communities to CLUBS (the creator panel exports entries in this exact format).
window.YOUTHS_DATA = (function () {
const CATS = [
  { id: 'eng',   ru: 'Инженерия и робототехника', kz: 'Инженерия және робототехника', en: 'Engineering & robotics' },
  { id: 'stem',  ru: 'Наука и STEM',              kz: 'Ғылым және STEM',              en: 'Science & STEM' },
  { id: 'lang',  ru: 'Языки и ораторство',        kz: 'Тілдер және шешендік',          en: 'Languages & speaking' },
  { id: 'sport', ru: 'Спорт',                     kz: 'Спорт',                        en: 'Sports' },
  { id: 'art',   ru: 'Искусство',                 kz: 'Өнер',                         en: 'Arts' },
  { id: 'vol',   ru: 'Волонтёрство',              kz: 'Еріктілер',                    en: 'Volunteering' },
  { id: 'biz',   ru: 'Бизнес',                    kz: 'Бизнес',                       en: 'Business' },
  { id: 'comm',  ru: 'Общение и настолки',        kz: 'Әңгіме және үстел ойындары',    en: 'Hangouts & board games' },
  { id: 'mun',   ru: 'MUN',                       kz: 'MUN',                          en: 'MUN' }
];

const CAT_HINTS = {
  eng:   'робот робототехника arduino ардуино лего lego дрон паяль электроник инженер 3d принтер robot engineering',
  stem:  'физика математик химия биолог олимпиад stem наука астроном телескоп космос science',
  lang:  'английск казахск язык ielts дебат ораторск speaking speech spelling полиглот language',
  sport: 'спорт бег кросс марафон плавани борьб дзюдо бокс тренаж фитнес лыж коньк running sport баскетбол стритбол basketball кольц дриблинг nba 3x3 футбол мини-футбол мяч ворот football soccer футзал волейбол пляжн подач volleyball сетк волей',
  art:   'рисован живопис акварел керамик танц музык гитар фото театр вокал дизайн art',
  vol:   'волонт помощ приют благотвор экологи субботник эко charity volunteer',
  biz:   'стартап бизнес предприним финанс инвест маркетинг проект питч startup business',
  comm:  'настолк игр сообществ общени друз кино аниме квиз board games community',
  mun:   'mun модель оон дипломат делегат резолюц комитет debate committee un model мун'
};

const CLUBS = [{
  "id": "umulb7kyy",
  "cat": "vol",
  "slug": "tumar-global",
  "verified": true,
  "beginner": true,
  "featured": false,
  "checked": "2026-09-28",
  "name": {
    "ru": "Tumar.global",
    "kz": "Tumar.global",
    "en": "Tumar.global"
  },
  "tag": {
    "ru": "Являемся волонтерами на больших проектах",
    "kz": "Являемся волонтерами на больших проектах",
    "en": "Являемся волонтерами на больших проектах"
  },
  "about": {
    "ru": "Являемся волонтерами на матчах Жеңіс \n500+ Волонтеров",
    "kz": "Являемся волонтерами на матчах Жеңіс \n500+ Волонтеров",
    "en": "Являемся волонтерами на матчах Жеңіс \n500+ Волонтеров"
  },
  "age": "14+",
  "cost": {
    "ru": "Бесплатно",
    "kz": "Бесплатно",
    "en": "Бесплатно"
  },
  "sched": {
    "ru": "Проекты будут в WhatsApp",
    "kz": "Проекты будут в WhatsApp",
    "en": "Проекты будут в WhatsApp"
  },
  "addr": {
    "ru": "—",
    "kz": "—",
    "en": "—"
  },
  "langs": {
    "ru": "Русский, Казахский, Английский",
    "kz": "Русский, Казахский, Английский",
    "en": "Русский, Казахский, Английский"
  },
  "tel": "‪+7 775 767 0042‬",
  "ig": "Tumar.global",
  "tg": "",
  "photo": "photos/tumar-global.jpg",
  "lat": 51.10831,
  "lng": 71.40298,
  "kw": "Волонтерство друзья Tumar"
}
];
  return { CATS: CATS, CAT_HINTS: CAT_HINTS, CLUBS: CLUBS };
})();
