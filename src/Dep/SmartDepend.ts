import Dep from './Dep.js';
import DepResolver from './DepResolver.js';

class SmartDepend {
    private _modList: Dep[];

    constructor() {
        this._modList = [];
    }

    public addModule(type: any, single: boolean): symbol {
        const modDep = this._createDep(type, single);

        this._modList.push(modDep);

        return modDep.name;
    }

    public addDependency(parent: symbol, dependency: symbol) {
        const parentDep = this._getDep(parent);
        const dependencyDep = this._getDep(dependency);

        if (parentDep != null && dependencyDep != null) {
            parentDep.depList.push(dependencyDep);
        } else {
            console.warn('Either %s or %s modules not found!', parent, dependency);
        }
    }

    public resolve(target: symbol): any {
        return this._resolveDepends(target);
    }

    private _createDep(type: any, single: boolean): Dep {
        const d = new Dep(type, single);

        return d;
    }

    private _resolveDepends(target: symbol): any {
        const resolver = new DepResolver(this._modList);

        return resolver.resolve(target);
    }

    //Foreign
    private _getDep(name: symbol): Dep | null {
        const tempDep = new Dep(null, false);

        return tempDep.findDepByName(name, this._modList);
    }
}

export default SmartDepend;
