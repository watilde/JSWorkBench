/**
 * @author Jason Parrott
 *
 * Copyright (C) 2012 Jason Parrott.
 * This code is licensed under the zlib license. See LICENSE for details.
 */


(function(global) {
  var print = global.print,
  system = global.system;

  global.plugins.ClosureCompilerBuilder = ClosureCompilerBuilder;

  var mJarFileCache = null;

  /**
   * @constructor
   * @lends {plugins.Builder}
   */
  function ClosureCompilerBuilder(pConfig) {
    this.output = '';
    this.resources = new Array();
    this.data = {
      strict: true,
      extraArgs: pConfig.properties['closure-compiler-extra-args'] || '',
      compilationLevel: pConfig.properties['closure-compiler-compilation-level'] || 'SIMPLE_OPTIMIZATIONS'
    };
    this.config = pConfig;
  }

  ClosureCompilerBuilder.prototype = new global.plugins.Builder();

  ClosureCompilerBuilder.prototype.setData = function(pData) {
    var tData = this.data;
    if (pData.outputs) {
      this.output = this.config.expand(pData.outputs);
    }
    if (pData.strict !== void 0) tData.strict = pData.strict;
    if (pData.extraArgs !== void 0) tData.extraArgs = pData.extraArgs;
    if (pData.compilationLevel !== void 0) tData.compilationLevel = pData.compilationLevel;
  };

  ClosureCompilerBuilder.prototype.getOutputs = function() {
    return [this.output];
  };

  ClosureCompilerBuilder.prototype.setResources = function(pResources) {
    var tFile;

    this.resources.length = 0;

    for (var i = 0, il = pResources.length; i < il; i++) {
      tFile = pResources[i].file;
      if (stat(tFile) === null) {
        throw Error('Resource for closure-compiler ' + tFile + ' does not exist. Aborting...');
      }
      this.resources[i] = pResources[i].file;
    }

    if (!this.output) {
      if (this.resources.length === 1) {
        this.output = (this.config.properties.binDir || 'bin') + '/' + this.resources[0].replace(/\.js$/, '.min.js');
      } else {
        this.output = this.config.expand('${binDir}/${target}.js');
      }
    }
  };

  ClosureCompilerBuilder.prototype.build = function() {
    if (this.resources.length === 0) {
      return [];
    }

    var tJarFile = this.config.properties['closure-compiler-jar'] ||
      (this.config.properties.vendorDir || 'vendor') + '/google-closure-compiler/compiler.jar';

    if (global.stat(tJarFile) === null) {
      if (mJarFileCache !== null) {
        tJarFile = mJarFileCache;
      } else {
        if (!this.config.isQuiet) print('Downloading Google Closure Compiler...');
        var tOutput = system('curl http://closure-compiler.googlecode.com/files/compiler-latest.zip -o compiler-latest.zip && unzip compiler-latest.zip compiler.jar && rm compiler-latest.zip && mkdir -p $(dirname ' + tJarFile + ') && mv compiler.jar ' + tJarFile);
        if (!this.config.isQuiet) print(tOutput);
        if (global.stat(tJarFile) === null) {
          print('Could not download the closure compiler. Aborting.');
          return false;
        }

        mJarFileCache = global.realpath(tJarFile);
      }
    } else if (mJarFileCache === null) {
      mJarFileCache = global.realpath(tJarFile);
    }

    var tCmdLine = [
      'java -jar',
      tJarFile,
      '--language_in ' + (this.data.strict ? 'ECMASCRIPT5_STRICT' : 'ECMASCRIPT5'),
      '--compilation_level=' + this.data.compilationLevel,
      this.data.extraArgs
    ].join(' ');

    var self = this;

    function execute(pBase, pOutput, pResources) {
      system('mkdir -p $(dirname ' + pOutput + ')');
      var tCmdLineString =
        pBase +
        ' --js_output_file=' +
        pOutput +
        ' ' +
        pResources;

      if (!self.config.isQuiet) print(tCmdLineString);
      var tStdout = system(tCmdLineString);
      if (!self.config.isQuiet) print(tStdout);
    }

    if (global.stat(this.output)) {
      if (!global.util.outputNeedsUpdate(this.output, this.resources)) {
        this.output.skipped = true;
        return [this.output];
      }
    }
    execute(tCmdLine, this.output, this.resources.join(' '));

    return [this.output];
  };

  global.on('queryBuilders', function(pBuilders) {
    pBuilders['closure-compiler'] = ClosureCompilerBuilder;
  });
}(this));
