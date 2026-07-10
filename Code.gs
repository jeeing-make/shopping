/**
 * 옷 사이즈 관리 앱 백엔드
 * 시트 구성: "옷데이터", "기준값"
 * 배포 방법: 확장프로그램 > Apps Script 에 이 코드 붙여넣기 후
 *   배포 > 새 배포 > 웹 앱으로 배포 (액세스 권한: 나만)
 *   생성된 URL을 index.html의 SCRIPT_URL에 붙여넣기
 */

var SHEET_DATA = '옷데이터';
var SHEET_CRITERIA = '기준값';

var DATA_HEADERS = [
  'id', '날짜', '대분류', '소분류', '제품명',
  '어깨', '어깨만족', '가슴', '가슴만족', '길이', '길이만족', '팔둘레', '팔둘레만족', '슬리브', '슬리브만족',
  '허리', '허리만족', '엉덩이', '엉덩이만족', '밑위', '밑위만족', '기장', '기장만족', '밑단', '밑단만족',
  '메모'
];

var CRITERIA_HEADERS = ['소분류', '항목', '최소', '최적하한', '최적상한', '하드규칙여부', '하드규칙비교', '하드규칙값'];

function getSheet_(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
  }
  return sheet;
}

function sheetToObjects_(sheet) {
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0];
  var rows = values.slice(1);
  return rows
    .filter(function (row) { return row.join('') !== ''; })
    .map(function (row) {
      var obj = {};
      headers.forEach(function (h, i) { obj[h] = row[i]; });
      return obj;
    });
}

function doGet(e) {
  var dataSheet = getSheet_(SHEET_DATA, DATA_HEADERS);
  var criteriaSheet = getSheet_(SHEET_CRITERIA, CRITERIA_HEADERS);
  var payload = {
    clothes: sheetToObjects_(dataSheet),
    criteria: sheetToObjects_(criteriaSheet)
  };
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var body = JSON.parse(e.postData.contents);
  var action = body.action;

  if (action === 'saveClothing') {
    var sheet = getSheet_(SHEET_DATA, DATA_HEADERS);
    var d = body.data;
    var id = 'c_' + new Date().getTime();
    var row = DATA_HEADERS.map(function (h) {
      if (h === 'id') return id;
      if (h === '날짜') return d['날짜'] || new Date().toISOString().slice(0, 10);
      return d[h] !== undefined ? d[h] : '';
    });
    sheet.appendRow(row);
    return jsonOut_({ ok: true, id: id });
  }

  if (action === 'saveCriteria') {
    var csheet = getSheet_(SHEET_CRITERIA, CRITERIA_HEADERS);
    var c = body.data;
    // 같은 소분류+항목이 이미 있으면 갱신, 없으면 추가
    var values = csheet.getDataRange().getValues();
    var foundRow = -1;
    for (var i = 1; i < values.length; i++) {
      if (values[i][0] === c['소분류'] && values[i][1] === c['항목']) {
        foundRow = i + 1;
        break;
      }
    }
    var row = CRITERIA_HEADERS.map(function (h) { return c[h] !== undefined ? c[h] : ''; });
    if (foundRow > 0) {
      csheet.getRange(foundRow, 1, 1, row.length).setValues([row]);
    } else {
      csheet.appendRow(row);
    }
    return jsonOut_({ ok: true });
  }

  return jsonOut_({ ok: false, error: 'unknown action' });
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
