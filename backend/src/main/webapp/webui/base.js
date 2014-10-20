// iota javascript library by kmxz

var ijkl = (function() {

    var Module = function(factory, featureRequirements) {
        this.factory = factory;
        this.featureRequirements = featureRequirements;
        this.instance = null;
    };

    Module.prototype.getInstance = function() {
        var req;
        if (!this.instance) {
            for (i = 0; i < this.featureRequirements.length; i++) {
                req = this.featureRequirements[i];
                if (req in features) {
                    features[req].test();
                } else {
                    alert("Feature " + req + " is never defined.");
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
        if (!this.support) {
            alert("Feature [" + this.name + "] is not supported by your browser. Some things will break up.");
        }
    };

    // Available browser feature detections
    var features = {
        xhr2: new Feature('XMLHttpRequest 2', function() { // https://gist.github.com/paulirish/1431660#file_xhr2.js
            var progEv = !!(window.ProgressEvent);
            var fdata = !!(window.FormData);
            var wCreds = window.XMLHttpRequest && "withCredentials" in new XMLHttpRequest;
            return progEv && fdata && wCreds;
        }),
        promise: new Feature('Promise', function() {
            return !!(window.Promise);
        }),
        classList: new Feature('classList', function() {
            return ('classList' in document.documentElement);
        }),
        es5Array: new Feature('ECMAScript 5 array features', function () {
            return !!(Array.prototype && Array.prototype.every && Array.prototype.filter && Array.prototype.forEach && Array.prototype.indexOf && Array.prototype.lastIndexOf && Array.prototype.map && Array.prototype.some && Array.prototype.reduce && Array.prototype.reduceRight && Array.isArray);
        }),
        dragEvents: new Feature('drag and drop events', function() {
            var div = document.createElement('div');
            return ('draggable' in div) || ('ondragstart' in div && 'ondrop' in div);
        }),
        querySelector: new Feature('queryselector', function() {
            return ('querySelector' in document) && ('querySelectorAll' in document);
        })
    };

    // Requiring a module
    var require = function(name) {
        if (name in modules) {
            return modules[name].getInstance();
        } else {
            alert("Module " + name + " is never defined.");
        }
    };

    // Defining a module
    require.module = function(name, featureRequirements, factory) {
        modules[name] = new Module(factory, featureRequirements);
    };

    return require;

})();
