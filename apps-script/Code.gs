/**
 * Приём заявок с сайта Scandi Мебель: строка в Google Таблицу + Telegram.
 *
 * Почему отправка отсюда, а не с сайта: api.telegram.org в РФ недоступен
 * из браузера посетителя, а серверам Google — доступен. Плюс токен лежит
 * в Script Properties и на сайт не попадает.
 *
 * НАСТРОЙКА (владелец, один раз):
 *  1. Project Settings (шестерёнка) → Script Properties:
 *       TELEGRAM_BOT_TOKEN = токен от @BotFather
 *       TELEGRAM_CHAT_IDS  = id через запятую, напр. 111,222
 *  2. Выбрать вверху функцию authorize → ▶ Выполнить → выдать разрешения.
 *     Без этого права UrlFetchApp нет, и Telegram МОЛЧА не отправляется,
 *     хотя скрипт отвечает «ок» — выглядит как успех, но сообщений нет.
 *  3. Deploy → New deployment → Web app → Execute as: Me,
 *     Who has access: Anyone → скопировать URL /exec.
 *
 * ВАЖНО: после любой правки кода — Deploy → Manage deployments → карандаш →
 * Version: New version → Deploy. Иначе /exec продолжит отдавать старый код.
 */

var SHEET_NAME = 'Заявки';

function doPost(e) {
  try {
    // Сайт шлёт тело без Content-Type: application/json — иначе браузер
    // отправит preflight OPTIONS, который Apps Script не обрабатывает.
    var d = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    // Honeypot: поле скрыто от человека и видно только ботам. Заполнено —
    // тихо отвечаем «успех», ничего не записывая и не отправляя.
    if (d.website) return ok();

    var name = String(d.name || '').trim();
    var phone = String(d.phone || '').trim();
    if (!name || !phone) return ok();

    // Сначала уведомление: даже если запись в таблицу упадёт, звонок уйдёт
    notifyTelegram(d);
    appendRow(d);

    return ok();
  } catch (err) {
    console.error('Ошибка обработки заявки', err);
    return ok();
  }
}

// Открыть URL в браузере — быстрая проверка, что веб-приложение живо
function doGet() {
  return ContentService.createTextOutput(
    JSON.stringify({ ok: true, service: 'scandi-lead' })
  ).setMimeType(ContentService.MimeType.JSON);
}

function notifyTelegram(d) {
  // try/catch, чтобы сбой Telegram не мешал записи в таблицу. Но помните:
  // если не выдано разрешение UrlFetchApp, ошибка гасится здесь молча.
  try {
    var props = PropertiesService.getScriptProperties();
    var token = props.getProperty('TELEGRAM_BOT_TOKEN');
    var chats = (props.getProperty('TELEGRAM_CHAT_IDS') || '').split(',');
    if (!token) return;

    var text =
      '🪑 Новая заявка — Scandi Мебель\n\n' +
      '👤 Имя: ' + (d.name || '') + '\n' +
      '📞 Телефон: ' + (d.phone || '') +
      (d.task ? '\n📝 Что нужно: ' + d.task : '') +
      (d.page_url ? '\n🔗 ' + d.page_url : '');

    chats.forEach(function (id) {
      id = id.trim();
      if (!id) return;
      UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
        method: 'post',
        payload: { chat_id: id, text: text },
        muteHttpExceptions: true
      });
    });
  } catch (err) {}
}

function appendRow(d) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);

  // Лист и шапку создаём при первой заявке — готовить руками ничего не нужно
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['Дата', 'Имя', 'Телефон', 'Что нужно', 'Страница', 'Источник']);
    sheet.getRange(1, 1, 1, 6).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  sheet.appendRow([
    new Date(),
    d.name || '',
    "'" + (d.phone || ''),   // апостроф — иначе «+7…» станет формулой или числом
    d.task || '',
    d.page_url || '',
    d.referrer || ''
  ]);
}

/**
 * Выдать разрешения. Выбрать эту функцию вверху и нажать ▶ Выполнить.
 * Активирует право UrlFetchApp — без него Telegram молча не отправляется.
 * Если Script Properties уже заполнены, придёт проверочное сообщение:
 * пришло — значит право выдано и связь с Telegram есть.
 */
function authorize() {
  SpreadsheetApp.getActiveSpreadsheet().getName();
  notifyTelegram({
    name: 'Проверка связи',
    phone: 'настройка формы',
    task: 'Если вы видите это сообщение — Telegram подключён'
  });
}

function ok() {
  return ContentService.createTextOutput('ok');
}
