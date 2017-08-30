var SIDEBAR_TITLE  = 'XTRF Smart Views';
var MENU_NAME      = 'XTRF';
var MENU_ITEM_NAME = 'Import data';
var VIEW_ADDRESS   = 'VIEW_ADDRESS';
var ACCESS_TOKEN   = 'ACCESS_TOKEN';
var REPORT_ADDRESS   = 'REPORT_ADDRESS';

var INVALID_URL_ERROR = 'The View URL address is not valid - missing viewID';


function onOpen(e) {
  SpreadsheetApp.getUi()
  .createAddonMenu()
  .addItem(MENU_ITEM_NAME, 'showImportViewSidebar')
  .addToUi();
}

function onInstall(e) {
  onOpen(e);
}

function showImportViewSidebar() {
  var ui = HtmlService.createTemplateFromFile('Sidebar')
  .evaluate()
  .setTitle(SIDEBAR_TITLE);
  SpreadsheetApp.getUi().showSidebar(ui);
}

// -------------------------------------------------------------------------------

/**
* Returns last user input
*/
function getLastInput() {
  var documentProperties = PropertiesService.getDocumentProperties();
  return {
    'viewAddress': documentProperties.getProperty(VIEW_ADDRESS) || '',
    'accessToken': documentProperties.getProperty(ACCESS_TOKEN) || '',
    'reportAddressUrl' :  documentProperties.getProperty(REPORT_ADDRESS) || ''
  };
}


/**
* For UI. Creates new importer, and pastes result into cells
*/
function importXtrfViewIntoActiveCell(viewAddress, accessToken) {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getActiveSheet();
  var cell = sheet.getActiveCell();
  importXtrfView(viewAddress, accessToken, cell.getRow(), cell.getColumn(), sheet);
  
  function importXtrfView(viewAddress, accessToken, row, column, sheet) {    
    new XtrfViewImporter(viewAddress, accessToken).pasteXtrfViewIntoCell(sheet,row, column);
  }
  
}

