function XtrfViewImporter(viewAddress, accessToken) {
  var self = this;

  // store input for UI
  var documentProperties = PropertiesService.getDocumentProperties();
  documentProperties.setProperty(VIEW_ADDRESS, viewAddress);
  documentProperties.setProperty(ACCESS_TOKEN, accessToken);

  /**
   * Retrieve view and insert data in table
   */
  self.pasteXtrfViewIntoCell = function(sheet, row, column) {
    var result = self.getView();

    // store current formatting    
    var currentFormatting = [];
    for (var i = 0; i < result[0].length; ++i) {
      var headerCell = sheet.getRange(row, column + i);
      currentFormatting.push(headerCell.getValue() ? headerCell.getNumberFormat() : '@');
    }
    
    // paste values into cells
    sheet.getRange(row, column, result.length, result[0].length).setValues(result);
    
    // apply formatting
    for (var i = 0; i < result[0].length; ++i) {
      sheet.getRange(row, column + i, result.length, 1).setNumberFormat(currentFormatting[i]);
    }
    
    // bold header
    sheet.getRange(row, column, 1, result[0].length).setFontWeight("bold");
  };

  /**
   * Retrieve view and return as array of arrays (does not modify document)
   */
  self.getView = function() {
    var url = transformAddressUrlToApiCallUrl(viewAddress);
    var result = [];
    var response = fetchBrowsePage(url);

    processHeader(result, response);

    while (true) {
      var nextPageUrl = processPage(result, response);
      if (!nextPageUrl)
        break;
      response = fetchBrowsePage(nextPageUrl)
    }

    return result;
  }

  /**
   * Transform raw browse url to url to API
   */
  function transformAddressUrlToApiCallUrl(url) {
    var params = extractParameters(url);
    var requestUrl = params.url + "/api/browser?viewId=" + params.viewId + transformFilterExpression(params.filters);
    return requestUrl;
  }

  /**
   * Parses url and extracts: base url, view id, and filter properties
   */
  function extractParameters(rawUrl) {
    var parsedUrl = urlJs.parse(rawUrl);
    var api_url = parsedUrl.scheme + '://' + parsedUrl.host + (parsedUrl.port ? (':' + parsedUrl.port) : '');
    var params = urlJs.get(parsedUrl.query);

    var viewId = params.viewId;
    var filters = params.filters;

    if (!viewId) {
      throw INVALID_URL_ERROR;
    }

    return {
      'url': api_url,
      'viewId': viewId,
      'filters': filters
    };
  }

  /**
   * We have two different filters notations: one used in view address (visible to user), second used in api (not visible to user)
   * First have form:  &filters=propertyA:valueA;propertyB:valueB;propertyC:valueC
   * Second have form: &q.propertyA=valueA&q.propertyB=valueB&q.propertyC=valueC
   * aditionaly characters: ':', ';' and '?' are escaped
   */
  function transformFilterExpression(original) {
    function decode(x) {
      return decodeURI(x).replace(/\\3a/g, ':').replace(/\\3b/g, ';').replace(/\\3f/g, '?');
    };

    if (!original) {
      return '';
    }

    var properties = original.split(';');
    var get = [];
    for (i = 0; i < properties.length; ++i) {
      var keyValue = properties[i].split(':');
      var key = keyValue[0];
      var value = keyValue[1];
      get['q.' + decode(key)] = decode(value);
    }
    return '&' + urlJs.buildget(get);
  }

  /**
   * Extract header from response
   */
  function processHeader(results, response) {
    var header = [];
    for (var columnId in response.header.columns) {
      if (response.header.columns.hasOwnProperty(columnId)) {
        var headName = response.header.columns[columnId].header;
        header.push(headName);
      }
    }
    results.push(header);
  }

  /**
   * Process single page, returns link to next page (if any)
   */
  function processPage(results, response) {
    for (var rowId in response.rows) {
      if (response.rows.hasOwnProperty(rowId)) {
        var row = response.rows[rowId].columns;
        results.push(processRow(row));
      }
    }

    return response.header.pagination.links.nextPage;
  }

  /**
   * Fetch page (using API), handle possible connection errors
   */
  function fetchBrowsePage(url) {
    var response = UrlFetchApp.fetch(url, {
      'method': 'get',
      'headers': {
        'X-AUTH-ACCESS-TOKEN': accessToken
      },
      'Accept': 'application/json',
      'muteHttpExceptions': true
    });

    var statusCode = response.getResponseCode();
    var content = response.getContentText();

    if (statusCode == 200) {
      return JSON.parse(response.getContentText());
    } else if (statusCode == 404) {
      throw 'Invalid address (404)';
    } else if (statusCode == 0) {
      throw 'Invalid arguments';
    } else {
      var errorObject = JSON.parse(response.getContentText());
      if (errorObject.errorMessage) {
        throw errorObject.errorMessage;
      }
      throw JSON.stringify(errorObject);
    }
  }

  /**
   * Adds apostrophe at the begining of value to protect it from being interpreted by Spreedsheet as number, date, etc.
   */
  function processRow(row) {
    return row.map(function(column) {
      return "'" + String(column)
    });
  }

  return self;
}