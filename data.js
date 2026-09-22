// Club catalogue data. Add new clubs to CLUBS (the creator panel exports entries in this exact format).
window.YOUTHS_DATA = (function () {
const CATS = [
  { id: 'eng',   ru: 'Инженерия и робототехника', kz: 'Инженерия және робототехника', en: 'Engineering & robotics' },
  { id: 'stem',  ru: 'Наука и STEM',              kz: 'Ғылым және STEM',              en: 'Science & STEM' },
  { id: 'lang',  ru: 'Языки и ораторство',        kz: 'Тілдер және шешендік',          en: 'Languages & speaking' },
  { id: 'sport', ru: 'Спорт и бег',               kz: 'Спорт және жүгіру',            en: 'Sports & running' },
  { id: 'art',   ru: 'Искусство',                 kz: 'Өнер',                         en: 'Arts' },
  { id: 'vol',   ru: 'Волонтёрство',              kz: 'Еріктілер',                    en: 'Volunteering' },
  { id: 'biz',   ru: 'Бизнес',                    kz: 'Бизнес',                       en: 'Business' },
  { id: 'comm',  ru: 'Сообщества',                kz: 'Қоғамдастықтар',               en: 'Communities' },
  { id: 'bball', ru: 'Баскетбол',                  kz: 'Баскетбол',                    en: 'Basketball' },
  { id: 'fball', ru: 'Футбол',                     kz: 'Футбол',                       en: 'Football' },
  { id: 'vball', ru: 'Волейбол',                   kz: 'Волейбол',                     en: 'Volleyball' },
  { id: 'mun',   ru: 'MUN и модели ООН',           kz: 'MUN және БҰҰ моделі',          en: 'MUN' }
];

const CAT_HINTS = {
  eng:   'робот робототехника arduino ардуино лего lego дрон паяль электроник инженер 3d принтер robot engineering',
  stem:  'физика математик химия биолог олимпиад stem наука астроном телескоп космос science',
  lang:  'английск казахск язык ielts дебат ораторск speaking speech spelling полиглот language',
  sport: 'бег кросс марафон плавани борьб дзюдо бокс тренаж фитнес лыж коньк running sport',
  art:   'рисован живопис акварел керамик танц музык гитар фото театр вокал дизайн art',
  vol:   'волонт помощ приют благотвор экологи субботник эко charity volunteer',
  biz:   'стартап бизнес предприним финанс инвест маркетинг проект питч startup business',
  comm:  'настолк игр сообществ клуб общени друз кино аниме квиз board games community',
  bball: 'баскетбол стритбол basketball кольц дриблинг nba 3x3 баскет',
  fball: 'футбол мини-футбол мяч ворот football soccer футзал',
  vball: 'волейбол пляжн подач volleyball сетк волей',
  mun:   'mun модель оон дипломат делегат резолюц комитет debate committee un model мун'
};

const CLUBS = [
];
  return { CATS: CATS, CAT_HINTS: CAT_HINTS, CLUBS: CLUBS };
})();
