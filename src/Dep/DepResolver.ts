import Dep from './Dep.js';
import DepNode from './DepNode.js';
import ObjectMaker from './ObjectMaker.js';

class DepResolver {
    private _modList: Dep[];
    private _objectMaker: ObjectMaker;
    private _singletonData: any;

    constructor(modList: Dep[]) {
        this._modList = modList;
        this._objectMaker = new ObjectMaker();

        this._singletonData = {};
    }

    set modList(mlist: Dep[]) {
        this._modList = mlist;
    }

    //any should be symbol but TS doesn't allow to use that in _singletonData indexing
    public resolve(rootName: symbol): any {
        const root = this._createNode(rootName);

        this._resolveTree(root);
        return root.data;
    }

    private _resolveTree(tree: DepNode) {
        const depTrees = this._getDepTrees(tree);
        tree.importChildren(depTrees);

        if (this._treeNoDep(tree) && !this._treeIsAllocated(tree)) {
            this._allocateTree(tree);
        } else {
            let children = this._getChildList(tree);

            for (let c = 0; c < children.length; c++) {
                const currentChild = children[c];
                this._resolveTree(currentChild);

                children = this._getChildList(tree);
            }

            this._allocateTree(tree);
        }
    }

    private _getDepTrees(root: DepNode): DepNode[] {
        const name = this._depNodeName(root);
        const dep = this._getDep(name);
        const nodeList: DepNode[] = [];

        if (dep != null) {
            const dList = this._getDepList(dep);
            for (let c = 0; c < dList.length; c++) {
                const currentDep = dList[c];
                const currentNode = this._createNode(this._depName(currentDep));
                nodeList.push(currentNode);
            }
        }

        return nodeList;
    }

    private _createNode(name: symbol, master: DepNode | null = null): DepNode {
        const dep = this._getDep(name);
        const node = this._newNode(name);

        if (dep != null) {
            this._decorateNode(node, dep, master);
        } else {
            console.error("Can't Find Dependency %s", name);
        }

        return node;
    }

    private _allocateTree(tree: DepNode) {
        if (this._treeIsAllocated(tree)) return;

        const type = this._treeGetType(tree);
        const instances = this._treeGetInstances(tree);
        const dep = this._getDep(tree.name) as Dep;

        let instance = null;
        const anyName: any = dep.name as any; //TS do not allow Symbol to be index

        if (dep.singleton) {
            if (this._singletonData[anyName] != null) {
                instance = this._singletonData[anyName];
            } else {
                instance = this._createInstance(type, instances);
                this._singletonData[anyName] = instance;
            }
        } else {
            instance = this._createInstance(type, instances);
        }

        this._treeSetData(tree, instance);
    }

    //Foreigners

    private _getDep(name: symbol): Dep | null {
        const tempDep = new Dep(null, false);

        return tempDep.findDepByName(name, this._modList);
    }

    private _getDepList(dep: Dep): Dep[] {
        return dep.depList;
    }

    private _newNode(name: symbol): DepNode {
        const node = new DepNode(name);

        return node;
    }

    private _treeSetData(tree: DepNode, data: any) {
        tree.data = data;
    }

    private _treeGetType(tree: DepNode): any {
        return tree.type;
    }

    private _treeGetInstances(tree: DepNode): any {
        return tree.instances;
    }

    private _treeNoDep(tree: DepNode): boolean {
        return tree.isNoDep;
    }

    private _treeIsAllocated(tree: DepNode): boolean {
        return tree.isAllocated;
    }

    private _getChildList(tree: DepNode) {
        return tree.children;
    }

    private _decorateNode(node: DepNode, dep: Dep, master: DepNode | null) {
        node.type = dep.type;

        if (master != null) node.master = master;
    }

    private _depNodeName(node: DepNode): symbol {
        return node.name;
    }

    private _depName(dep: Dep): symbol {
        return dep.name;
    }

    private _createInstance(Type: any, args: any[]): any {
        const instance = this._objectMaker.allocate(Type, args);

        return instance;
    }
}

export default DepResolver;
