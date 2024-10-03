import { Dictionary } from "./DataStructures";

export class TreeNodeMember 
{
    id: number;
    text: string;
    icon?: string;
    selected: boolean;
    display?: boolean;
    isParent: boolean;
    parent: TreeNodeMember | undefined;
    children: TreeNodeMember[];
    depth: number;
    data: Dictionary<any>;

    constructor(id: number, text: string, selected: boolean, display: boolean, isParent: boolean, depth: number,
        children: TreeNodeMember[], icon?: string, parent?: TreeNodeMember, data?: Dictionary<any>)
    {
        this.id = id;
        this.text = text;
        this.selected = selected;
        this.display = display;
        this.isParent = isParent;
        this.children = children;
        this.icon = icon;
        this.parent = parent;
        this.depth = depth;
        this.data = data ?? {};
    }
}

export class TreeNodeListManager
{
    private currentId: number;

    private nodesByID: { [key: number]: TreeNodeMember }
    private roots: TreeNodeMember[];

    constructor()
    {
        this.currentId = 0;
        this.nodesByID = {};
        this.roots = [];
    }

    addRoot(text: string, selected: boolean, display: boolean, icon?: string)
    {
        const id = this.currentId++;
        const root = new TreeNodeMember(id, text, selected, display, true, 0, [], icon);

        this.roots.push(root);
        this.nodesByID[id] = root;

        return id;
    }

    addChild(parentID: number, text: string, selected: boolean, display: boolean, isParent: boolean, icon?: string,
        data?: Dictionary<any>)
    {
        const id = this.currentId++;

        const parent = this.nodesByID[parentID];
        const child = new TreeNodeMember(id, text, selected, display, isParent, parent.depth + 1, [], icon, parent, data);

        parent.children.push(child);
        this.nodesByID[id] = child;

        return id;
    }

    findNode(predicate: (node: TreeNodeMember) => boolean): TreeNodeMember | undefined
    {
        const nodes = Object.values(this.nodesByID);
        for (let i = 0; i < nodes.length; i++)
        {
            if (predicate(nodes[i]))
            {
                return nodes[i]
            }
        }
    }

    updateNode(predicate: (node: TreeNodeMember) => boolean, updater: (node: TreeNodeMember) => void)
    {
        const nodes = Object.values(this.nodesByID);
        for (let i = 0; i < nodes.length; i++)
        {
            if (predicate(nodes[i]))
            {
                const currentID = nodes[i].id;
                updater(nodes[i]);

                nodes[i].id = this.currentId++;
                delete this.nodesByID[currentID];

                this.nodesByID[nodes[i].id] = nodes[i]
            }
        }
    }

    getNode(id: number): TreeNodeMember
    {
        return this.nodesByID[id];
    }

    replaceNode(id: number, node: TreeNodeMember)
    {
        this.nodesByID[id] = node;
    }

    deleteNode(id: number)
    {
        const node = this.nodesByID[id];
        const index = node.parent?.children.findIndex(n => n.id == id) ?? -1;
        if (index >= 0)
        {
            node.parent!.children.splice(index, 1);
        }

        delete this.nodesByID[id];
    }

    buildList(): TreeNodeMember[]
    {
        const nodeList: TreeNodeMember[] = [];

        addNodes(this.roots);
        return nodeList;

        function addNodes(nodes: TreeNodeMember[])
        {
            nodes.forEach(n => 
            {
                nodeList.push(n);
                if (n.children)
                {
                    addNodes(n.children);
                }
            });
        }
    }
}