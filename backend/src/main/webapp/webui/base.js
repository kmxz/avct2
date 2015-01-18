// iota javascript kmxz-library

var ijkl = (function () {
    "use strict";

    var LoadingManager = function () {
        this.scripts = [];
        this.registeredCallback = null;
    };

    LoadingManager.prototype.isAllLoaded = function () {
        var i;
        for (i = 0; i < this.scripts.length; i++) {
            if (!this.scripts[i].loaded) {
                return false;
            }
        }
        return true;
    };

    LoadingManager.prototype.add = function (callback) {
        var instance = this;
        var closure = {loaded: false};
        this.scripts.push(closure);
        callback(function () {
            closure.loaded = true;
            if (instance.registeredCallback) {
                if (instance.isAllLoaded()) {
                    instance.registeredCallback();
                }
            }
        });
    };

    LoadingManager.prototype.then = function (callback) {
        if (this.isAllLoaded()) {
            console.log("Cool! All scripts are loaded.");
            callback();
        } else {
            console.log("Wait for some scripts to be loaded.");
            this.registeredCallback = callback;
        }
    };

    var polyfillManager = new LoadingManager();

    var Feature = function (name, detector, opt_polyfill) {
        this.detector = detector;
        this.tested = false;
        this.support = false;
        this.polyfill = opt_polyfill;
        this.name = name;
    };

    Feature.prototype.test = function () {
        if (this.tested) {
            return this.support;
        }
        this.support = this.detector();
        this.tested = true;
        if (!this.support) {
            if (this.polyfill) {
                console.warn("Feature [" + this.name + "] is not supported by your browser. A polyfill will be employed.");
                this.loadPolyfill();
            } else {
                window.alert("Feature [" + this.name + "] is not supported by your browser. Some things will break up.");
            }
        }
    };

    Feature.prototype.loadPolyfill = function () {
        var instance = this;
        polyfillManager.add(function (resolve) {
            var js = document.createElement('script');
            js.src = instance.polyfill;
            js.onerror = function () {
                window.alert("Loading polyfill for feature [" + instance.name + "] failed. Some things will break up.");
            };
            js.onload = function () {
                console.log("Polyfill " + instance.polyfill + " for [" + instance.name + "] loaded successfully.");
                resolve();
            };
            document.getElementsByTagName('head')[0].appendChild(js);
        });
    };

    // Available browser feature detections
    var features = {
        'xhr2': new Feature('XMLHttpRequest 2', function () { // https://gist.github.com/paulirish/1431660#file_xhr2.js
            var progEv = !!(window.ProgressEvent);
            var fdata = !!(window.FormData);
            var wCreds = window.XMLHttpRequest && "withCredentials" in new XMLHttpRequest;
            return progEv && fdata && wCreds;
        }),
        'promise': new Feature('Promise', function () {
            return !!(window.Promise);
        }),
        'classList': new Feature('classList', function () {
            return ('classList' in document.documentElement);
        }),
        'es5Array': new Feature('ECMAScript 5 array features', function () {
            return !!(Array.prototype && Array.prototype.every && Array.prototype.filter && Array.prototype.forEach && Array.prototype.indexOf && Array.prototype.lastIndexOf && Array.prototype.map && Array.prototype.some && Array.prototype.reduce && Array.prototype.reduceRight && Array.isArray);
        }),
        'dragEvents': new Feature('drag and drop events', function () {
            var div = document.createElement('div');
            return ('draggable' in div) || ('ondragstart' in div && 'ondrop' in div);
        }),
        'querySelector': new Feature('queryselector', function () {
            return ('querySelector' in document) && ('querySelectorAll' in document);
        }),
        'dataset': new Feature('data-* attributes', function () {
            var n = document.createElement('div');
            n.setAttribute('data-a-b', 'c');
            return !!(n.dataset && n.dataset.aB === 'c');
        }),
        'matches': new Feature("matchesSelector", function () {
            var div = document.createElement('div');
            return ('matches' in div);
        }),
        'bloburls': new Feature('window.URL', function () {
            return ('URL' in window && 'createObjectURL' in URL);
        }),
        'toBlob': new Feature('<canvas> toBlob', function () {
            var canvas = document.createElement('canvas');
            return ('toBlob' in canvas);
        }, 'http://rawgit.com/eligrey/canvas-toBlob.js/master/canvas-toBlob.js'),
        'mouseEnterLeave': new Feature('mouseenter and mouseleave events', function () {
            var div = document.createElement('div');
            return ('onmouseenter' in div && 'onmouseleave' in div);
        })
    };

    var Module = function (factory, featureRequirements) {
        this.factory = factory;
        this.instance = null;
        var req, i;
        for (i = 0; i < featureRequirements.length; i++) {
            req = featureRequirements[i];
            if (features.hasOwnProperty(req)) {
                features[req].test();
            } else {
                window.alert("Feature " + req + " is never defined.");
            }
        }
    };

    Module.prototype.getInstance = function () {
        if (!this.instance) {
            this.instance = this.factory();
        }
        return this.instance;
    };

    var modules = {};

    var moduleManager = new LoadingManager();

    var loadScript = function (name) {
        moduleManager.add(function (resolve) {
            var js = document.createElement('script');
            js.src = 'js/' + name + '.js';
            js.onerror = function () {
                window.alert('Attempting to find ' + name + '.js failed.');
            };
            js.onload = function () {
                console.log("Script " + name + " loaded successfully.");
                resolve();
            };
            document.getElementsByTagName('head')[0].appendChild(js);
        });
    };

    var productionLoad = function (scriptList) {
        var i;
        for (i = 0; i < scriptList.length; i++) {
            loadScript(scriptList[i]);
        }
    };

    // Requiring a module
    var require = function (name) {
        if (modules.hasOwnProperty(name)) {
            return modules[name].getInstance();
        }
        window.alert("Module " + name + " is never defined.");
    };

    require.load = function (name, moduleList) {
        productionLoad(moduleList);
        moduleManager.then(function () {
            polyfillManager.then(function () {
                require(name)();
            });
        });
    };

    // Defining a module
    require.module = function (name, featureRequirements, factory) {
        modules[name] = new Module(factory, featureRequirements);
    };

    return require;

}());
