const queryDataId = (node, id) => (node as HTMLElement).querySelector(`[data-id="${id}"]`);
const updateDataId = (node, id, text) => (queryDataId(node, id).innerHTML = text);

const createFragment = (id) => document.querySelector<HTMLTemplateElement>(id).content.cloneNode(true);

export { queryDataId, updateDataId, createFragment };
