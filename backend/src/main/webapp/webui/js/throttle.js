/*global ijkl*/

ijkl.module('throttle', ['promise', 'es5Array'], function () {
    "use strict";

    var Task = function (queue, promiseBuilder) {
        this.promiseBuilder = promiseBuilder;
        this.outerPromise = null;
        this.outerPromiseResolve = null;
        this.outerPromiseReject = null;
        this.parentQueue = queue;
    };

    Task.prototype.init = function () {
        var instance = this;
        instance.outerPromise = new Promise(function (resolve, reject) {
            instance.outerPromiseResolve = resolve;
            instance.outerPromiseReject = reject;
        });
    };

    Task.prototype.execute = function () {
        // console.log("Executing new task.");
        var instance = this;
        instance.promiseBuilder(function (result) {
            instance.outerPromiseResolve(result);
            instance.parentQueue.finish(instance);
        }, function (reason) {
            instance.outerPromiseReject(reason);
            instance.parentQueue.finish(instance);
        });
    };

    var Queue = function (size) {
        this.size = size;
        this.waiting = [];
        this.running = [];
    };

    Queue.prototype.proceed = function () {
        if (!(this.running.length < this.size && this.waiting.length)) {
            // console.log("Throttle busy!");
            return;
        }
        var task = this.waiting.shift();
        this.running.push(task);
        setTimeout(function () {
            task.execute();
        }, 0);
    };

    Queue.prototype.finish = function (task) {
        // console.log("Task finished!");
        this.running = this.running.filter(function (taskInQueue) { return taskInQueue !== task; });
        this.proceed();
    };

    Queue.prototype.add = function (promiseBuilder) {
        var task = new Task(this, promiseBuilder);
        task.init();
        this.waiting.push(task);
        this.proceed();
        return task.outerPromise;
    };

    return Queue;
});