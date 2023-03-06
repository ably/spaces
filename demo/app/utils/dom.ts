const queryDataId = (node, id) => (node as HTMLElement).querySelector(`[data-id="${id}"]`);

const createFragment = (id) => document.querySelector<HTMLTemplateElement>(id).content.cloneNode(true);

export { queryDataId, createFragment };
