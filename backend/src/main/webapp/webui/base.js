// iota javascript kmxz-library

"use strict";

var ijkl = (function() {

    var Module = function(factory, featureRequirements) {
        this.factory = factory;
        this.featureRequirements = featureRequirements;
        this.instance = null;
    };

    Module.prototype.getInstance = function() {
        var req, i;
        if (!this.instance) {
            for (i = 0; i < this.featureRequirements.length; i++) {
                req = this.featureRequirements[i];
                if (req in features) {
                    features[req].test();
                } else {
                    window.alert("Feature " + req + " is never defined.");
                }
            }
            this.instance = this.factory();
        }
        return this.instance;
    };

    var modules = {};

    var Feature = function(name, detector) {
        this.detector = detector;
        this.tested = false;
        this.support = false;
        this.name = name;
    };

    Feature.prototype.test = function() {
        if (this.tested) { return this.support; }
        this.support = this.detector();
        this.tested = true;
        if (!this.support) {
            window.alert("Feature [" + this.name + "] is not supported by your browser. Some things will break up.");
        }
    };

    // Available browser feature detections
    var features = {
        'xhr2': new Feature('XMLHttpRequest 2', function() { // https://gist.github.com/paulirish/1431660#file_xhr2.js
            var progEv = !!(window.ProgressEvent);
            var fdata = !!(window.FormData);
            var wCreds = window.XMLHttpRequest && "withCredentials" in new XMLHttpRequest;
            return progEv && fdata && wCreds;
        }),
        'promise': new Feature('Promise', function() {
            return !!(window.Promise);
        }),
        'classList': new Feature('classList', function() {
            return ('classList' in document.documentElement);
        }),
        'es5Array': new Feature('ECMAScript 5 array features', function () {
            return !!(Array.prototype && Array.prototype.every && Array.prototype.filter && Array.prototype.forEach && Array.prototype.indexOf && Array.prototype.lastIndexOf && Array.prototype.map && Array.prototype.some && Array.prototype.reduce && Array.prototype.reduceRight && Array.isArray);
        }),
        'dragEvents': new Feature('drag and drop events', function() {
            var div = document.createElement('div');
            return ('draggable' in div) || ('ondragstart' in div && 'ondrop' in div);
        }),
        'querySelector': new Feature('queryselector', function() {
            return ('querySelector' in document) && ('querySelectorAll' in document);
        }),
        'dataset': new Feature('data-* attributes', function() {
            var n = document.createElement('div');
            n.setAttribute('data-a-b', 'c');
            return !!(n.dataset && n.dataset.aB === 'c');
        }),
        'matches': new Feature("matchesSelector", function() {
            var div = document.createElement('div');
            return ('matches' in div);
        })
    };

    // For debug mode only, ugly
    var debugLoadAll = function(firstModule, callback) {
        var loadedScripts = {};

        var checkIfProceed = function() {};

        var loadScript = function(name) {
            var js = document.createElement('script');
            js.src = 'js/'+ name + '.js';
            js.onerror = function() {
                window.alert('Attempting to find ' + name + '.js failed.');
            };
            js.onload = function() {
                console.log("Script " + name + " loaded successfully.")
                loadedScripts[name].loaded = true;
                checkIfProceed();
            };
            document.getElementsByTagName('head')[0].appendChild(js);
        };

        var debugLoad = function(enterance, loadStack) {
            if (loadStack.indexOf(enterance) >= 0) {
                alert("Circular dependency detected: " + loadStack.join(' -> ') + ' -> ' + enterance);
                return;
            }
            if (!(enterance in loadedScripts)) {
                var request = new XMLHttpRequest();
                request.open('get', 'js/' + enterance + '.js', false); // let's use synchronized request for simplicity
                request.send(null);
                loadedScripts[enterance] = { loaded: false, text: request.responseText };
                loadScript(enterance);
            }
            var subModules = loadedScripts[enterance].text.match(/ijkl\('[a-z]+'\)/g);
            if (!subModules) { // no submodules: might be null
                return;
            }
            var i;
            for (i = 0; i < subModules.length; i++) {
                debugLoad(subModules[i].match(/ijkl\('([a-z]+)'\)/)[1], loadStack.concat([enterance]));
            }
        };

        var checkAllLoaded = function() {
            var i;
            for (i in loadedScripts) {
                if (loadedScripts.hasOwnProperty(i)) {
                    if (!loadedScripts[i].loaded) {
                        return false;
                    }
                }
            }
            callback();
            return true;
        };

        debugLoad(firstModule, []);
        if (!checkAllLoaded()) {
            checkIfProceed = checkAllLoaded;
        }
    };

    // Requiring a module
    var require = function(name) {
        if (name in modules) {
            return modules[name].getInstance();
        } else {
            window.alert("Module " + name + " is never defined.");
        }
    };

    // Debug mode load
    require.load = function(name) {
        debugLoadAll(name, function() {
            require(name)();
        })
    };

    // Defining a module
    require.module = function(name, featureRequirements, factory) {
        modules[name] = new Module(factory, featureRequirements);
    };

    return require;

})();
