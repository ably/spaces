const queryDataId = (node, id): HTMLElement | undefined => (node as HTMLElement).querySelector(`[data-id="${id}"]`);

const createFragment = (id): HTMLElement =>
  document.querySelector<HTMLTemplateElement>(id).content.cloneNode(true) as HTMLElement;

export { queryDataId, createFragment };
