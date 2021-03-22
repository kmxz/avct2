class QueuedTask<T> {
    public readonly promise: Promise<T>;
    private res?: (result: T) => void;
    private rej?: (error: any) => void;

    constructor(public readonly runner: () => Promise<T>, private readonly queue: Throttle) {
        this.promise = new Promise((res, rej) => {
            this.res = res;
            this.rej = rej;
        });
    }

    execute(): void {
        this.runner().finally(() => this.queue.finish(this)).then(this.res, this.rej);
    }
}

export default class Throttle {
    private waiting: QueuedTask<any>[] = [];
    private running: Set<QueuedTask<any>> = new Set();

    constructor(public readonly size: number) {}

    proceed(): void {
        if ((this.running.size >= this.size) || !this.waiting.length) {
            return;
        }
        const task = this.waiting.shift();
        this.running.add(task!);
        task!.execute(); // TODO: delay with setTimeout(0) is removed. Is this okay?
    }

    add<T>(runner: () => Promise<T>): Promise<T> {
        const task = new QueuedTask(runner, this);
        this.waiting.push(task);
        this.proceed();
        return task.promise;
    }

    finish(task: QueuedTask<any>): void {
        this.running.delete(task);
        this.proceed();
    }
}