/**
 * @author Jason Parrott
 *
 * Copyright (C) 2012 Jason Parrott.
 * This code is licensed under the zlib license. See LICENSE for details.
 */


(function(global) {
  var print = global.print,
      args = global.args,
      write = global.write,
      read = global.read,
      util = global.util;

  global.Config = Config;

  function Config() {
    this.raw = {};
    this.properties = {};
    this.resources = {};
    this.targets = {};
    this.workbench = null;
    this.isDry = false;
    this.isQuiet = false;
    this.locals = {};
    this.plugins = {};
    this.outputTracker = new util.OutputTracker();
  }
  Config.prototype = {
    /**
     * Expands a string replacing ${NAME} strings
     * with the corresponding property inside this Config.
     * @param {string} pString The string to expand.
     * @returns {string} The expanded string.
     */
    expand: function(pString) {
      var tProperties = this.properties;

      function replace(pMatch, pPart) {
        return tProperties[pPart];
      }

      return pString.replace(/\$\{(.+?)\}/g, replace);
    },

    /**
     * Prints all targets of this Config to the screen.
     */
    printTargets: function() {
      for (var k in this.targets) {
        print('  ' + k);
      }
    },

    /**
     * Prints all properties of this Config to the screen.
     */
    printProperties: function() {
      for (var k in this.properties) {
        print(k + ': ' + this.properties[k]);
      }
    }
  };

  global.parseConfig = function(pFileName) {
    var tConfig = new Config();

    if (!pFileName) {
      for (var i = 1; i < args.length; i++) {
        var tArg = args[i];

        if (tArg[0] !== '-') break;

        if (tArg === '-f') {
          if (i + 1 >= il) {
            throw new Error('Please provide a file name for the -f flag.');
          }
          pFileName = args[i + 1];

          args.splice(i, 2);
          i--;
        } else if (tArg === '--dry') {
          tConfig.isDry = true;
          args.splice(i, 1);
          i--;
        } else if (tArg === '--quiet') {
          tConfig.isQuiet = true;
          args.splice(i, 1);
          i--;
        }
      }

      if (!pFileName) {
        pFileName = 'build.json';
      }
    }

    var tConfigJSON = tConfig.raw = JSON.parse(read(pFileName));
    var k;

    if (!tConfigJSON) {
      throw new Error('Failed to parse build file. Error in JSON data.');
    }

    if (tConfigJSON.properties !== void 0) {
      for (k in tConfigJSON.properties) {
        tConfig.properties[k] = tConfigJSON.properties[k];
        tConfig.properties[k] = tConfig.expand(tConfig.properties[k]);
      }
    }

    if (tConfigJSON.resources !== void 0) {
      tConfig.resources = tConfigJSON.resources;
    }

    if (tConfigJSON.plugins !== void 0) {
      tConfig.plugins = tConfigJSON.plugins;
    }

    if (tConfigJSON.targets !== void 0) {
      tConfig.targets = tConfigJSON.targets;
      for (k in tConfig.targets) {
        tConfig.targets[k].id = k;
        tConfig.targets[k].regex = new RegExp(k);
      }
    }

    var tLocalConfig = '.jsworkbenchrc';
    var tLocalConfigContents;
    var tLocalConfigData = tConfig.locals;
    var tHome = global.getenv('HOME');

    if (tHome) {
      try {
        tLocalConfigContents = JSON.parse(read(tHome + '/.jsworkbenchrc'));
        for (k in tLocalConfigContents) {
          tLocalConfigData[k] = tLocalConfigContents[k];
        }
      } catch (e) {
        // we don't care.
      }
    }

    if (tConfigJSON.properties.localConfigFile) {
      tLocalConfig = tConfigJSON.properties.localConfigFile;
    }

    try {
      tLocalConfigContents = JSON.parse(read(tLocalConfig));
      for (k in tLocalConfigContents) {
        tLocalConfigData[k] = tLocalConfigContents[k];
      }
    } catch (e) {
      // we don't care.
    }

    fire('parsedConfig', tConfig);

    return tConfig;
  };

  global.on('registerActions', function(pActions) {
    pActions.config = function(pConfig) {
      var tArguments = new Array();
      var i, il, k;
      for (i = 1, il = arguments.length; i < il; i++) {
        tArguments[i - 1] = arguments[i];
      }

      var tAction = tArguments.shift();

      switch (tAction) {
        case 'listtargets':
          pConfig.printTargets();
          break;
        case 'listproperties':
          pConfig.printProperties();
          break;
        default:
          throw new Error('Invalid sub-action for config action.');
      }
    };
  });

}(this));

