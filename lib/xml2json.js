var expat = require('node-xml');
var fs = require('fs');

// This object will hold the final result.
var obj = currentObject = {};
var ancestors = [];

var options = {}; //configuration options

function arrayToObject(array) {
  ret = {};
  array.forEach(function (item) {
    ret[item[0]] = item[1];
  });
  return ret;
}

function startElement(name, attrs) {
    attrs = arrayToObject(attrs);
    if (! (name in currentObject)) {
        currentObject[name] = attrs;
    } else if (! (currentObject[name] instanceof Array)) {
        // Put the existing object in an array.
        var newArray = [currentObject[name]];
        // Add the new object to the array.
        newArray.push(attrs);
        // Point to the new array.
        currentObject[name] = newArray;
    } else {
        // An array already exists, push the attributes on to it.
        currentObject[name].push(attrs);
    }

    // Store the current (old) parent.
    ancestors.push(currentObject);

    // We are now working with this object, so it becomes the current parent.
    if (currentObject[name] instanceof Array) {
        // If it is an array, get the last element of the array.
        currentObject = currentObject[name][currentObject[name].length - 1];
    } else {
        // Otherwise, use the object itself.
        currentObject = currentObject[name];
    }
}

function text(data) {
    data = data.trim();
    if (!data.length) {
        return;
    }
    currentObject['$t'] = (currentObject['$t'] || "") + data;
}

function endElement(name) {
    // This should check to make sure that the name we're ending 
    // matches the name we started on.
    var ancestor = ancestors.pop();
    if (!options.reversible) {
        if ((Object.keys(currentObject).length == 1) && ('$t' in currentObject)) {
            if (ancestor[name] instanceof Array) {
                ancestor[name].push(ancestor[name].pop()['$t']);
            } else {
                ancestor[name] = currentObject['$t'];
            }
        }
    }

    currentObject = ancestor;
}

module.exports = function(xmlBuffer, _options) {
    var done = false;
    var xml = xmlBuffer.toString('utf8');
    var parser = new expat.SaxParser(function (p) {
      p.onStartElementNS(startElement);
      p.onCharacters(text);
      p.onCdata(text);
      p.onEndElementNS(endElement);
      p.onError(function (msg) {
        console.log('-->' + xml + '<--');
        throw new Error('There are errors in your xml file: ' + msg);
      });
    });

    obj = currentObject = {};
    ancestors = [];

    options = {
        object: false,
        reversible: false
    };

    for (var opt in _options) {
        options[opt] = _options[opt];
    }

    parser.parseStringSync(xml);

    if (options.object) {
        return obj;
    }

    return JSON.stringify(obj);
};

